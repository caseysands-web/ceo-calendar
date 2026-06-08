import { useState } from 'react';
import { getDaysInMonth, getFirstDayOfMonth, getMeetingsForDate, formatTime, formatDuration } from '../utils/calendarUtils';

const MONTH_NAMES = ['January','February','March','April','May','June','July','August','September','October','November','December'];
const DAY_FULL = ['Sunday','Monday','Tuesday','Wednesday','Thursday','Friday','Saturday'];

export default function MonthView({ meetings, yearMonth, onBack }) {
  const { year, month } = yearMonth;
  const [selectedDay, setSelectedDay] = useState(null);
  const [popupPos, setPopupPos] = useState({ x: 0, y: 0 });

  const daysInMonth = getDaysInMonth(year, month);
  const firstDay = getFirstDayOfMonth(year, month);

  const cells = [];
  for (let i = 0; i < firstDay; i++) cells.push(null);
  for (let d = 1; d <= daysInMonth; d++) cells.push(d);
  // pad to full rows
  while (cells.length % 7 !== 0) cells.push(null);

  function handleDayClick(e, day) {
    if (!day) return;
    const date = new Date(year, month, day);
    const dayMeetings = getMeetingsForDate(meetings, date);
    if (dayMeetings.length === 0) { setSelectedDay(null); return; }
    const rect = e.currentTarget.getBoundingClientRect();
    setSelectedDay({ day, meetings: dayMeetings, date });
    setPopupPos({ x: rect.left, y: rect.bottom + 8 });
  }

  function closePopup() { setSelectedDay(null); }

  const weeks = [];
  for (let i = 0; i < cells.length; i += 7) {
    weeks.push(cells.slice(i, i + 7));
  }

  return (
    <div className="month-view" onClick={e => { if (e.target === e.currentTarget) closePopup(); }}>
      <div className="month-view-header">
        <button className="btn-back" onClick={onBack}>← Year View</button>
        <h2 className="month-view-title">{MONTH_NAMES[month]} {year}</h2>
        <div />
      </div>

      <div className="month-grid">
        {DAY_FULL.map((d, i) => (
          <div key={i} className="month-day-header">{d}</div>
        ))}
        {weeks.map((week, wi) =>
          week.map((day, di) => {
            const date = day ? new Date(year, month, day) : null;
            const dayMeetings = date ? getMeetingsForDate(meetings, date) : [];
            const isSelected = selectedDay && selectedDay.day === day;
            return (
              <div
                key={`${wi}-${di}`}
                className={`month-day-cell${!day ? ' empty' : ''}${isSelected ? ' selected' : ''}`}
                onClick={e => handleDayClick(e, day)}
              >
                {day && <span className="month-day-num">{day}</span>}
                {dayMeetings.length > 0 && (
                  <div className="month-dots">
                    {dayMeetings.slice(0, 3).map(m => (
                      <span key={m.id} className="month-dot" style={{ background: m.color }} title={m.name} />
                    ))}
                    {dayMeetings.length > 3 && (
                      <span className="month-dot-overflow">+{dayMeetings.length - 3}</span>
                    )}
                  </div>
                )}
              </div>
            );
          })
        )}
      </div>

      {selectedDay && (
        <>
          <div className="popup-backdrop" onClick={closePopup} />
          <div className="day-popup" style={{ top: Math.min(popupPos.y, window.innerHeight - 300), left: Math.min(popupPos.x, window.innerWidth - 320) }}>
            <div className="day-popup-header">
              <strong>{DAY_FULL[selectedDay.date.getDay()]}, {MONTH_NAMES[month]} {selectedDay.day}</strong>
              <button className="popup-close" onClick={closePopup}>✕</button>
            </div>
            <ul className="day-popup-list">
              {selectedDay.meetings.map(m => (
                <li key={m.id} className="day-popup-item">
                  <span className="day-popup-dot" style={{ background: m.color }} />
                  <div>
                    <div className="day-popup-name">{m.name}</div>
                    <div className="day-popup-meta">{formatTime(m.time)} · {formatDuration(m.durationMinutes)} · {m.audience}</div>
                  </div>
                </li>
              ))}
            </ul>
          </div>
        </>
      )}
    </div>
  );
}
