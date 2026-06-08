import { FISCAL_YEAR_MONTHS, getDaysInMonth, getFirstDayOfMonth, getMeetingsForDate } from '../utils/calendarUtils';

const MONTH_NAMES = ['January','February','March','April','May','June','July','August','September','October','November','December'];
const DAY_ABBR = ['S','M','T','W','T','F','S'];

export default function YearView({ meetings, onMonthClick }) {
  return (
    <div className="year-view">
      {FISCAL_YEAR_MONTHS.map(({ year, month }) => (
        <MiniMonth
          key={`${year}-${month}`}
          year={year}
          month={month}
          meetings={meetings}
          onClick={() => onMonthClick({ year, month })}
        />
      ))}
    </div>
  );
}

function MiniMonth({ year, month, meetings, onClick }) {
  const daysInMonth = getDaysInMonth(year, month);
  const firstDay = getFirstDayOfMonth(year, month);
  const cells = [];

  // empty cells before first day
  for (let i = 0; i < firstDay; i++) {
    cells.push(null);
  }
  for (let d = 1; d <= daysInMonth; d++) {
    cells.push(d);
  }

  return (
    <div className="mini-month" onClick={onClick} role="button" tabIndex={0}
      onKeyDown={e => e.key === 'Enter' && onClick()}>
      <div className="mini-month-header">
        {MONTH_NAMES[month]} {year}
      </div>
      <div className="mini-month-grid">
        {DAY_ABBR.map((d, i) => (
          <div key={i} className="mini-day-abbr">{d}</div>
        ))}
        {cells.map((day, i) => {
          if (!day) return <div key={`e-${i}`} className="mini-day-cell empty" />;
          const date = new Date(year, month, day);
          const dayMeetings = getMeetingsForDate(meetings, date);
          return (
            <div key={day} className="mini-day-cell">
              <span className="mini-day-num">{day}</span>
              {dayMeetings.length > 0 && (
                <div className="mini-dots">
                  {dayMeetings.slice(0, 3).map(m => (
                    <span key={m.id} className="mini-dot" style={{ background: m.color }} title={m.name} />
                  ))}
                  {dayMeetings.length > 3 && (
                    <span className="mini-dot-overflow">+{dayMeetings.length - 3}</span>
                  )}
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
