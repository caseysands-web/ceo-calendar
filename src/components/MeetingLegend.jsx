import { formatRecurrenceLabel, formatTime, formatDuration } from '../utils/calendarUtils';

export default function MeetingLegend({ meetings, onEdit, onDelete }) {
  return (
    <div className="legend">
      <div className="legend-header">
        <h2 className="legend-title">Meetings</h2>
        <span className="legend-count">{meetings.length}</span>
      </div>
      <ul className="legend-list">
        {meetings.map(m => (
          <li key={m.id} className="legend-item">
            <span className="legend-color" style={{ background: m.color }} />
            <div className="legend-info">
              <div className="legend-name">{m.name}</div>
              <div className="legend-recurrence">{formatRecurrenceLabel(m)}</div>
              <div className="legend-meta">{formatTime(m.time)} · {formatDuration(m.durationMinutes)} · {m.audience}</div>
            </div>
            <div className="legend-actions">
              <button
                className="icon-btn edit-btn"
                title="Edit"
                onClick={() => onEdit(m)}
                aria-label={`Edit ${m.name}`}
              >
                ✏️
              </button>
              <button
                className="icon-btn delete-btn"
                title="Delete"
                onClick={() => onDelete(m.id)}
                aria-label={`Delete ${m.name}`}
              >
                🗑️
              </button>
            </div>
          </li>
        ))}
      </ul>
    </div>
  );
}
