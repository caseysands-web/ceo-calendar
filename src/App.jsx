import { useState, useReducer } from 'react';
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
    default:
      return state;
  }
  saveMeetings(next);
  return next;
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

  function handleAdd(meeting) {
    const id = String(Date.now());
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
