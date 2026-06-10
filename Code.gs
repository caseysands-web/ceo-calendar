// ============================================================
// CEO Meeting Cadence Calendar — Google Apps Script (Code.gs)
// ============================================================
// SETUP:
//   1. Replace YOUR_ANTHROPIC_API_KEY with your key from console.anthropic.com
//   2. Replace YOUR_SHEET_ID with the ID from your Google Sheet URL
//   3. In Apps Script, set a daily time-based trigger on syncCalendar()
// ============================================================

var ANTHROPIC_API_KEY = 'YOUR_ANTHROPIC_API_KEY';
var SHEET_ID          = 'YOUR_SHEET_ID';
var CALENDAR_NAME     = 'CEO Cadence';
var RANGE_START       = new Date('2026-02-01T00:00:00');
var RANGE_END         = new Date('2027-01-31T23:59:59');
var CLAUDE_MODEL      = 'claude-haiku-3-5-latest';

// Column order in the sheet
var COLUMNS = [
  'id', 'title', 'startDate', 'endDate', 'isRecurring', 'recurrenceRule',
  'recurrenceFreq', 'time', 'duration', 'location', 'ai_flag', 'ai_reason', 'status', 'addedDate'
];

// ============================================================
// syncCalendar()
// Main entry point — meant to run on a daily time trigger.
// Reads events from the "CEO Cadence" calendar, calls Claude
// to assess each one, then writes/updates rows in the sheet.
// ============================================================
function syncCalendar() {
  var sheet = getOrCreateSheet_();
  var existingIds = getExistingIds_(sheet);

  // --- 1. Find the calendar by name ---
  var calendars = CalendarApp.getCalendarsByName(CALENDAR_NAME);
  if (calendars.length === 0) {
    Logger.log('Calendar "' + CALENDAR_NAME + '" not found. Aborting.');
    return;
  }
  var calendar = calendars[0];

  // --- 2. Fetch all events in the date range ---
  var events = calendar.getEvents(RANGE_START, RANGE_END);
  Logger.log('Found ' + events.length + ' events in range.');

  // --- 3. Process each event ---
  for (var i = 0; i < events.length; i++) {
    var event = events[i];
    var eventId = event.getId();

    // Skip events we've already processed
    if (existingIds[eventId]) {
      Logger.log('Skipping already-processed event: ' + event.getTitle());
      continue;
    }

    // Extract event metadata
    var title         = event.getTitle();
    var startDate     = event.getStartTime();
    var endDate       = event.getEndTime();
    var isRecurring   = event.isRecurringEvent();
    var recurrenceRule = isRecurring ? 'recurring' : '';
    var recurrenceFreq = isRecurring ? detectRecurrenceFreq_(event, startDate) : 'once';
    var timeStr       = Utilities.formatDate(startDate, Session.getScriptTimeZone(), 'HH:mm');
    var durationMs    = endDate - startDate;
    var durationMins  = Math.round(durationMs / 60000);
    var location      = event.getLocation() || '';

    // --- 4. Ask Claude whether this looks like a CEO-level cadence meeting ---
    var aiResult = assessWithClaude_(title, startDate, durationMins, isRecurring, location);

    // --- 5. Append a new row to the sheet ---
    var row = [
      eventId,
      title,
      Utilities.formatDate(startDate, Session.getScriptTimeZone(), 'yyyy-MM-dd'),
      Utilities.formatDate(endDate,   Session.getScriptTimeZone(), 'yyyy-MM-dd'),
      isRecurring ? 'TRUE' : 'FALSE',
      recurrenceRule,
      recurrenceFreq,
      timeStr,
      durationMins + ' min',
      location,
      aiResult.flag,    // yes / no / maybe
      aiResult.reason,
      'pending',        // default status; user can change to approved/rejected
      Utilities.formatDate(new Date(), Session.getScriptTimeZone(), 'yyyy-MM-dd')
    ];

    sheet.appendRow(row);
    Logger.log('Added: ' + title + ' → ai_flag=' + aiResult.flag);

    // Small pause to respect Claude API rate limits
    Utilities.sleep(300);
  }

  Logger.log('syncCalendar() complete.');
}

// ============================================================
// assessWithClaude_(title, startDate, durationMins, isRecurring, location)
// Calls the Anthropic API with a concise prompt and returns
// { flag: 'yes'|'no'|'maybe', reason: string }
// ============================================================
function assessWithClaude_(title, startDate, durationMins, isRecurring, location) {
  var dateStr = Utilities.formatDate(startDate, Session.getScriptTimeZone(), 'EEE MMM d yyyy');

  // Concise, practical prompt — keeps token cost low with Haiku
  var userMessage =
    'You assess whether a calendar event belongs on a CEO cadence dashboard.\n' +
    'Respond with exactly one JSON object: {"flag":"yes|no|maybe","reason":"one sentence"}.\n' +
    'Flag "yes" if it looks like a recurring, strategic, executive-level meeting ' +
    '(e.g. board meetings, all-hands, ELT, QBR, town halls, strategy sessions, finance reviews).\n' +
    'Flag "no" for one-offs, personal items, travel blocks, or low-priority operational meetings.\n' +
    'Flag "maybe" if uncertain.\n\n' +
    'Event:\n' +
    '  Title: ' + title + '\n' +
    '  Date: ' + dateStr + '\n' +
    '  Duration: ' + durationMins + ' minutes\n' +
    '  Recurring: ' + (isRecurring ? 'yes' : 'no') + '\n' +
    '  Location: ' + (location || 'none') + '\n';

  var payload = {
    model: CLAUDE_MODEL,
    max_tokens: 120,
    messages: [{ role: 'user', content: userMessage }]
  };

  var options = {
    method: 'post',
    contentType: 'application/json',
    headers: {
      'x-api-key': ANTHROPIC_API_KEY,
      'anthropic-version': '2023-06-01'
    },
    payload: JSON.stringify(payload),
    muteHttpExceptions: true
  };

  try {
    var response = UrlFetchApp.fetch('https://api.anthropic.com/v1/messages', options);
    var code = response.getResponseCode();
    if (code !== 200) {
      Logger.log('Claude API error ' + code + ': ' + response.getContentText());
      return { flag: 'maybe', reason: 'API error ' + code };
    }

    var body = JSON.parse(response.getContentText());
    var text = body.content && body.content[0] && body.content[0].text
      ? body.content[0].text.trim()
      : '';

    // Extract the JSON object from Claude's response (handles stray whitespace/markdown)
    var jsonMatch = text.match(/\{[\s\S]*\}/);
    if (!jsonMatch) {
      return { flag: 'maybe', reason: 'Could not parse Claude response' };
    }
    var parsed = JSON.parse(jsonMatch[0]);
    var flag   = ['yes', 'no', 'maybe'].indexOf(parsed.flag) !== -1 ? parsed.flag : 'maybe';
    var reason = parsed.reason || '';
    return { flag: flag, reason: reason };

  } catch (e) {
    Logger.log('assessWithClaude_ exception: ' + e);
    return { flag: 'maybe', reason: 'Exception: ' + e.message };
  }
}

// ============================================================
// detectRecurrenceFreq_(event, startDate)
// Detects whether a recurring event repeats weekly, biweekly,
// monthly, or quarterly by fetching the next occurrence and
// measuring the gap. Returns a string like:
//   weekly:2        (weekly on Tuesday, 0=Sun)
//   biweekly:2      (every 2 weeks on Tuesday)
//   monthly:15      (monthly on the 15th)
//   quarterly:1,4,7,10:15  (quarterly, on the 15th)
//   once            (fallback / not recurring)
// ============================================================
function detectRecurrenceFreq_(event, startDate) {
  try {
    var cal = CalendarApp.getCalendarsByName(CALENDAR_NAME)[0];
    var searchStart = new Date(startDate.getTime() + 5  * 24 * 60 * 60 * 1000);
    var searchEnd   = new Date(startDate.getTime() + 100 * 24 * 60 * 60 * 1000);
    var candidates  = cal.getEvents(searchStart, searchEnd);
    var title       = event.getTitle();
    var dow         = startDate.getDay();
    var dom         = startDate.getDate();

    for (var i = 0; i < candidates.length; i++) {
      if (candidates[i].getTitle() !== title) continue;
      var diff = Math.round((candidates[i].getStartTime() - startDate) / (24 * 60 * 60 * 1000));
      if (diff >= 6  && diff <= 8)  return 'weekly:'    + dow;
      if (diff >= 13 && diff <= 15) return 'biweekly:'  + dow;
      if (diff >= 25 && diff <= 35) return 'monthly:'   + dom;
      if (diff >= 85 && diff <= 95) {
        var m = startDate.getMonth();
        var months = [m, (m+3)%12, (m+6)%12, (m+9)%12].sort(function(a,b){return a-b;});
        return 'quarterly:' + months.join(',') + ':' + dom;
      }
    }
    // Fallback: assume weekly based on start day
    return 'weekly:' + dow;
  } catch(e) {
    return 'weekly:' + startDate.getDay();
  }
}

// ============================================================
// getEventsAsJSON()
// Returns sheet rows as a JSON string — intended for use as a
// web app endpoint (Deploy > New deployment > Web app).
// ============================================================
function getEventsAsJSON() {
  var sheet = getOrCreateSheet_();
  var data  = sheet.getDataRange().getValues();

  if (data.length <= 1) {
    return ContentService
      .createTextOutput(JSON.stringify([]))
      .setMimeType(ContentService.MimeType.JSON);
  }

  var headers = data[0];
  var rows    = data.slice(1);
  var result  = rows.map(function(row) {
    var obj = {};
    headers.forEach(function(h, i) { obj[h] = row[i]; });
    return obj;
  });

  return ContentService
    .createTextOutput(JSON.stringify(result))
    .setMimeType(ContentService.MimeType.JSON);
}

// Alias so the web app GET handler works automatically
function doGet() {
  return getEventsAsJSON();
}

// ============================================================
// Helpers
// ============================================================

// Returns the "CEO Cadence" sheet, creating it (with headers) if absent.
function getOrCreateSheet_() {
  var ss    = SpreadsheetApp.openById(SHEET_ID);
  var sheet = ss.getSheetByName('CEO Cadence');
  if (!sheet) {
    sheet = ss.insertSheet('CEO Cadence');
    sheet.appendRow(COLUMNS);
    // Freeze the header row
    sheet.setFrozenRows(1);
    // Bold the header
    sheet.getRange(1, 1, 1, COLUMNS.length).setFontWeight('bold');
  }
  return sheet;
}

// Returns a map of { eventId: true } for all rows already in the sheet.
function getExistingIds_(sheet) {
  var data = sheet.getDataRange().getValues();
  var ids  = {};
  // Start at row index 1 to skip the header
  for (var i = 1; i < data.length; i++) {
    var id = data[i][0];
    if (id) ids[id] = true;
  }
  return ids;
}
