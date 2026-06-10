import { useState, useReducer } from 'react';
import YearView from './components/YearView';
import MonthView from './components/MonthView';
import MeetingLegend from './components/MeetingLegend';
import SuggestionsInbox from './components/SuggestionsInbox';
import AddMeetingDialog from './components/AddMeetingDialog';
import EditMeetingDialog from './components/EditMeetingDialog';

const DEFAULT_MEETINGS = [
  {
    id: '1', name: 'ELT Weekly', color: '#2563EB', audience: 'Executive',
    time: '09:00', durationMinutes: 90,
    recurrence: { type: 'weekly', dayOfWeek: 2 }
  },
  {
    id: '2', name: 'Board Meeting', color: '#EA580C', audience: 'Board',
    time: '14:00', durationMinutes: 120,
    recurrence: { type: 'monthly', dayOfMonth: 15 }
  },
  {
    id: '3', name: 'All Hands', color: '#16A34A', audience: 'Company-wide',
    time: '10:00', durationMinutes: 60,
    recurrence: { type: 'monthly', dayOfMonth: 1 }
  },
  {
    id: '4', name: 'QBR', color: '#CA8A04', audience: 'Executive',
    time: '09:00', durationMinutes: 240,
    recurrence: { type: 'quarterly', months: [1, 4, 7, 10], dayOfMonth: 28 }
  },
  {
    id: '5', name: 'Staff Meeting', color: '#7C3AED', audience: 'Executive',
    time: '08:30', durationMinutes: 60,
    recurrence: { type: 'weekly', dayOfWeek: 1 }
  },
  {
    id: '6', name: '1:1 Direct Reports', color: '#DB2777', audience: 'Executive',
    time: '10:00', durationMinutes: 30,
    recurrence: { type: 'weekly', dayOfWeek: 3 }
  },
  {
    id: '7', name: 'Finance Review', color: '#0891B2', audience: 'Executive',
    time: '15:00', durationMinutes: 90,
    recurrence: { type: 'monthly', dayOfMonth: 10 }
  },
  {
    id: '8', name: 'Skip-Level Lunches', color: '#65A30D', audience: 'Executive',
    time: '12:00', durationMinutes: 60,
    recurrence: { type: 'monthly', dayOfMonth: 20 }
  },
  {
    id: '9', name: 'Strategy Session', color: '#9333EA', audience: 'Executive',
    time: '09:00', durationMinutes: 240,
    recurrence: { type: 'quarterly', months: [2, 5, 8, 11], dayOfMonth: 5 }
  },
  {
    id: '10', name: 'Town Hall', color: '#DC2626', audience: 'Company-wide',
    time: '16:00', durationMinutes: 60,
    recurrence: { type: 'monthly', dayOfMonth: 25 }
  },
];

function loadMeetings() {
  try {
    const stored = localStorage.getItem('ceo-calendar-meetings');
    if (stored) {
      const parsed = JSON.parse(stored);
      // Merge: keep stored meetings, but add any default meetings not already present
      const storedIds = new Set(parsed.map(m => m.id));
      const missingDefaults = DEFAULT_MEETINGS.filter(m => !storedIds.has(m.id));
      return [...missingDefaults, ...parsed];
    }
  } catch {}
  return DEFAULT_MEETINGS;
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
