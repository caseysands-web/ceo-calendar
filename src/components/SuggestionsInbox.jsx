import { useState, useEffect } from 'react';

// ---------------------------------------------------------------
// SuggestionsInbox
// Fetches AI-flagged calendar events from a published Google Sheet
// (via the gviz/tq JSON endpoint) and lets the user approve or
// reject each suggestion.
//
// Props:
//   sheetUrl  — full URL to the Google Sheets gviz/tq endpoint
//               e.g. https://docs.google.com/spreadsheets/d/ID/gviz/tq?tqx=out:json
//               Leave empty or falsy to show the setup placeholder.
//   onApprove — callback(meeting) called when user approves an item.
//               The component maps the sheet row to the app's meeting shape.
// ---------------------------------------------------------------

const FLAG_LABELS = { yes: 'Yes', no: 'No', maybe: 'Maybe' };
const FLAG_CLASS  = { yes: 'suggestions-badge--yes', no: 'suggestions-badge--no', maybe: 'suggestions-badge--maybe' };

// Map a sheet row object to the app's internal meeting shape
function rowToMeeting(row) {
  return {
    id: String(row.id || Date.now()),
    name: row.title || 'Untitled',
    color: '#2563EB',
    audience: 'Executive',
    time: row.time || '09:00',
    durationMinutes: parseDuration(row.duration),
    recurrence: { type: 'custom', startDate: row.startDate, label: row.recurrenceRule || 'From Google Calendar' },
    _fromCalendar: true,
    _location: row.location,
  };
}

function parseDuration(str) {
  if (!str) return 60;
  var m = String(str).match(/(\d+)/);
  return m ? parseInt(m[1], 10) : 60;
}

// Parse a CSV string into an array of row objects keyed by header row
function parseCSV(text) {
  var lines = text.trim().split('\n').map(function(l) { return l.trim(); });
  if (lines.length < 2) return [];
  var headers = splitCSVLine(lines[0]);
  return lines.slice(1).map(function(line) {
    var values = splitCSVLine(line);
    var obj = {};
    headers.forEach(function(h, i) { obj[h] = values[i] || ''; });
    return obj;
  });
}

function splitCSVLine(line) {
  var result = [], current = '', inQuotes = false;
  for (var i = 0; i < line.length; i++) {
    var ch = line[i];
    if (ch === '"') { inQuotes = !inQuotes; }
    else if (ch === ',' && !inQuotes) { result.push(current.trim()); current = ''; }
    else { current += ch; }
  }
  result.push(current.trim());
  return result;
}

// Convert any Google Sheets URL to a publicly accessible CSV URL
function toCsvUrl(url) {
  // Already a proper published CSV URL — use as-is
  if (url.includes('output=csv') || url.includes('format=csv')) return url;
  // pubhtml URL with 2PACX- published ID — convert to CSV
  var pubMatch = url.match(/\/spreadsheets\/d\/e\/(2PACX-[a-zA-Z0-9_-]+)/);
  if (pubMatch) {
    var gidMatch = url.match(/gid=(\d+)/);
    var gid = gidMatch ? gidMatch[1] : '0';
    return 'https://docs.google.com/spreadsheets/d/e/' + pubMatch[1] + '/pub?gid=' + gid + '&single=true&output=csv';
  }
  // Fallback: standard sheet ID
  var match = url.match(/\/spreadsheets\/d\/([a-zA-Z0-9_-]+)/);
  if (!match) return url;
  var gidMatch2 = url.match(/gid=(\d+)/);
  var gid2 = gidMatch2 ? gidMatch2[1] : '0';
  return 'https://docs.google.com/spreadsheets/d/' + match[1] + '/export?format=csv&gid=' + gid2;
}

export default function SuggestionsInbox({ sheetUrl, onApprove }) {
  const [open,       setOpen]       = useState(true);
  const [items,      setItems]      = useState([]);   // { row, dismissed }
  const [loading,    setLoading]    = useState(false);
  const [error,      setError]      = useState(null);

  // Fetch and parse sheet data whenever sheetUrl changes
  useEffect(() => {
    if (!sheetUrl) return;
    setLoading(true);
    setError(null);

    fetch(toCsvUrl(sheetUrl))
      .then(function(res) {
        if (!res.ok) throw new Error('HTTP ' + res.status);
        return res.text();
      })
      .then(function(text) {
        var rows = parseCSV(text);
        // Only surface rows that are still pending and AI-flagged yes/maybe
        var pending = rows.filter(function(r) {
          return r.status === 'pending';
        });
        setItems(pending.map(function(r) { return { row: r, dismissed: false }; }));
        setLoading(false);
      })
      .catch(function(err) {
        setError(err.message);
        setLoading(false);
      });
  }, [sheetUrl]);

  var visibleItems = items.filter(function(it) { return !it.dismissed; });
  var pendingCount = visibleItems.length;

  function handleApprove(index) {
    var item = visibleItems[index];
    if (onApprove) onApprove(rowToMeeting(item.row));
    dismissItem(item);
  }

  function handleApproveAll() {
    visibleItems.forEach(function(item) {
      if (onApprove) onApprove(rowToMeeting(item.row));
    });
    setItems(function(prev) {
      return prev.map(function(it) { return { ...it, dismissed: true }; });
    });
  }

  function handleReject(index) {
    dismissItem(visibleItems[index]);
  }

  function dismissItem(target) {
    setItems(function(prev) {
      return prev.map(function(it) {
        return it === target ? { ...it, dismissed: true } : it;
      });
    });
  }

  // ---- No sheet URL configured — show setup instructions ----
  if (!sheetUrl) {
    return (
      <div className="suggestions">
        <div className="suggestions-header" onClick={() => setOpen(o => !o)}>
          <span className="suggestions-title">Calendar Sync</span>
          <span className="suggestions-chevron">{open ? '▾' : '▸'}</span>
        </div>
        {open && (
          <div className="suggestions-setup">
            <div className="suggestions-setup-icon">📅</div>
            <p className="suggestions-setup-heading">Connect Google Calendar</p>
            <ol className="suggestions-setup-steps">
              <li>Open <strong>Code.gs</strong> in Google Apps Script and set your <code>ANTHROPIC_API_KEY</code> and <code>SHEET_ID</code>.</li>
              <li>Run <code>syncCalendar()</code> once to populate the sheet.</li>
              <li>In the sheet, go to <strong>File → Share → Publish to web</strong> and copy the CSV/JSON link.</li>
              <li>Add it to your <code>.env</code> file as <code>VITE_SHEET_URL=…</code> and restart the dev server.</li>
            </ol>
          </div>
        )}
      </div>
    );
  }

  return (
    <div className="suggestions">
      {/* Header — click to collapse/expand */}
      <div className="suggestions-header" onClick={() => setOpen(o => !o)}>
        <span className="suggestions-title">
          AI Suggestions
          {pendingCount > 0 && (
            <span className="suggestions-count">{pendingCount}</span>
          )}
        </span>
        <div className="suggestions-header-actions">
          {pendingCount > 0 && (
            <button
              className="suggestions-approve-all"
              onClick={e => { e.stopPropagation(); handleApproveAll(); }}
              title="Approve all suggestions"
            >
              Approve All
            </button>
          )}
          <span className="suggestions-chevron">{open ? '▾' : '▸'}</span>
        </div>
      </div>

      {open && (
        <div className="suggestions-body">
          {/* Loading state */}
          {loading && (
            <div className="suggestions-state">
              <span className="suggestions-spinner" aria-label="Loading" /> Loading…
            </div>
          )}

          {/* Error state */}
          {!loading && error && (
            <div className="suggestions-state suggestions-state--error">
              Could not load suggestions: {error}
            </div>
          )}

          {/* Empty state */}
          {!loading && !error && visibleItems.length === 0 && (
            <div className="suggestions-state suggestions-state--empty">
              No pending suggestions. Run <code>syncCalendar()</code> to import events.
            </div>
          )}

          {/* Suggestion list */}
          {!loading && !error && visibleItems.length > 0 && (
            <ul className="suggestions-list">
              {visibleItems.map(function(item, i) {
                var row = item.row;
                return (
                  <li key={row.id || i} className="suggestions-item">
                    <div className="suggestions-item-top">
                      <span className="suggestions-item-name">{row.title}</span>
                      <span className={['suggestions-badge', FLAG_CLASS[row.ai_flag] || 'suggestions-badge--maybe'].join(' ')}>
                        {FLAG_LABELS[row.ai_flag] || row.ai_flag}
                      </span>
                    </div>
                    <div className="suggestions-item-date">
                      {row.startDate}
                      {row.time ? ' · ' + row.time : ''}
                      {row.duration ? ' · ' + row.duration : ''}
                    </div>
                    {row.ai_reason && (
                      <div className="suggestions-item-reason">{row.ai_reason}</div>
                    )}
                    <div className="suggestions-item-actions">
                      <button
                        className="suggestions-btn suggestions-btn--approve"
                        onClick={() => handleApprove(i)}
                        aria-label={'Approve ' + row.title}
                      >
                        Approve
                      </button>
                      <button
                        className="suggestions-btn suggestions-btn--reject"
                        onClick={() => handleReject(i)}
                        aria-label={'Reject ' + row.title}
                      >
                        Reject
                      </button>
                    </div>
                  </li>
                );
              })}
            </ul>
          )}
        </div>
      )}
    </div>
  );
}
