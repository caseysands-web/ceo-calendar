import { useState, useReducer, useEffect } from 'react';
import YearView from './components/YearView';
import MonthView from './components/MonthView';
import MeetingLegend from './components/MeetingLegend';
import SuggestionsInbox from './components/SuggestionsInbox';
import AddMeetingDialog from './components/AddMeetingDialog';
import EditMeetingDialog from './components/EditMeetingDialog';

function loadMeetings() {
  try {
    const stored = localStorage.getItem('ceo-calendar-meetings');
    if (stored) return JSON.parse(stored);
  } catch {}
  return [];
}

function saveMeetings(meetings) {
  try {
    localStorage.setItem('ceo-calendar-meetings', JSON.stringify(meetings));
  } catch {}
}

function meetingsReducer(state, action) {
  let next;
  switch (action.type) {
    case 'ADD':
      next = [...state, action.meeting];
      break;
    case 'UPDATE':
      next = state.map(m => m.id === action.meeting.id ? action.meeting : m);
      break;
    case 'DELETE':
      next = state.filter(m => m.id !== action.id);
      break;
    case 'REMOVE_CANCELLED':
      next = state.filter(m => !action.cancelledIds.has(m.id));
      if (next.length === state.length) return state; // nothing changed
      break;
    default:
      return state;
  }
  saveMeetings(next);
  return next;
}

// Mirror of the toCsvUrl helper in SuggestionsInbox
function toCsvUrl(url) {
  if (url.includes('output=csv') || url.includes('format=csv')) return url;
  var pubMatch = url.match(/\/spreadsheets\/d\/e\/(2PACX-[a-zA-Z0-9_-]+)/);
  if (pubMatch) {
    var gidMatch = url.match(/gid=(\d+)/);
    var gid = gidMatch ? gidMatch[1] : '0';
    return 'https://docs.google.com/spreadsheets/d/e/' + pubMatch[1] + '/pub?gid=' + gid + '&single=true&output=csv';
  }
  var match = url.match(/\/spreadsheets\/d\/([a-zA-Z0-9_-]+)/);
  if (!match) return url;
  var gidMatch2 = url.match(/gid=(\d+)/);
  return 'https://docs.google.com/spreadsheets/d/' + match[1] + '/export?format=csv&gid=' + (gidMatch2 ? gidMatch2[1] : '0');
}

export default function App() {
  const [meetings, dispatch] = useReducer(meetingsReducer, null, loadMeetings);
  const [view, setView] = useState('year');
  const [selectedMonth, setSelectedMonth] = useState(null);
  const [showAdd, setShowAdd] = useState(false);
  const [editingMeeting, setEditingMeeting] = useState(null);
  const [sheetUrl] = useState(import.meta.env.VITE_SHEET_URL || '');

  function handleMonthClick(yearMonth) {
    setSelectedMonth(yearMonth);
    setView('month');
  }

  function handleBackToYear() {
    setView('year');
    setSelectedMonth(null);
  }

  // On load, fetch the sheet and remove any approved Google Calendar
  // meetings whose status is now 'cancelled'
  useEffect(() => {
    if (!sheetUrl) return;
    const csvUrl = toCsvUrl(sheetUrl);
    fetch(csvUrl)
      .then(r => r.text())
      .then(text => {
        const lines = text.trim().split('\n').map(l => l.trim());
        if (lines.length < 2) return;
        const headers = lines[0].split(',').map(h => h.replace(/"/g, '').trim());
        const idIdx     = headers.indexOf('id');
        const statusIdx = headers.indexOf('status');
        if (idIdx === -1 || statusIdx === -1) return;
        const cancelledIds = new Set();
        lines.slice(1).forEach(line => {
          const cols = line.split(',').map(c => c.replace(/"/g, '').trim());
          if (cols[statusIdx] === 'cancelled') cancelledIds.add(cols[idIdx]);
        });
        if (cancelledIds.size > 0) {
          dispatch({ type: 'REMOVE_CANCELLED', cancelledIds });
        }
      })
      .catch(() => {}); // silently ignore fetch errors on load
  }, [sheetUrl]);

  function handleAdd(meeting) {
    // Preserve the Google Calendar event ID so cancellation detection works
    const id = meeting._fromCalendar ? meeting.id : String(Date.now());
    dispatch({ type: 'ADD', meeting: { ...meeting, id } });
    setShowAdd(false);
  }

  function handleEdit(meeting) {
    dispatch({ type: 'UPDATE', meeting });
    setEditingMeeting(null);
  }

  function handleDelete(id) {
    if (window.confirm('Delete this meeting?')) {
      dispatch({ type: 'DELETE', id });
    }
  }

  return (
    <div className="app-container">
      <header className="app-header">
        <div className="app-header-left">
          <h1 className="app-title">CEO Meeting Cadence</h1>
          <span className="app-subtitle">FY2026 &middot; Feb 2026 – Jan 2027</span>
        </div>
        <div className="app-header-right">
          <button className="btn-primary" onClick={() => setShowAdd(true)}>+ Add Meeting</button>
        </div>
      </header>

      <div className="app-body">
        <main className="app-main">
          {view === 'year' ? (
            <YearView meetings={meetings} onMonthClick={handleMonthClick} />
          ) : (
            <MonthView
              meetings={meetings}
              yearMonth={selectedMonth}
              onBack={handleBackToYear}
            />
          )}
        </main>
        <aside className="app-sidebar">
          <MeetingLegend
            meetings={meetings}
            onEdit={setEditingMeeting}
            onDelete={handleDelete}
          />
          <SuggestionsInbox
            sheetUrl={sheetUrl}
            onApprove={handleAdd}
          />
        </aside>
      </div>

      {showAdd && (
        <AddMeetingDialog
          onSave={handleAdd}
          onCancel={() => setShowAdd(false)}
        />
      )}
      {editingMeeting && (
        <EditMeetingDialog
          meeting={editingMeeting}
          onSave={handleEdit}
          onCancel={() => setEditingMeeting(null)}
        />
      )}
    </div>
  );
}
