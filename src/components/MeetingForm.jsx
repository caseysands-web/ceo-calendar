import { useState } from 'react';

const DAYS_OF_WEEK = ['Sunday','Monday','Tuesday','Wednesday','Thursday','Friday','Saturday'];
const MONTHS_LIST = ['January','February','March','April','May','June','July','August','September','October','November','December'];

function recurrenceToForm(r) {
  if (!r) return { type: 'weekly', dayOfWeek: 1, dayOfMonth: 1, quarterMonths: [], onceDate: '', rangeStart: '', rangeEnd: '' };
  return {
    type: r.type || 'weekly',
    dayOfWeek: r.dayOfWeek ?? 1,
    dayOfMonth: r.dayOfMonth ?? 1,
    quarterMonths: r.months ? r.months.map(String) : [],
    onceDate: r.date || '',
    rangeStart: r.startDate || '',
    rangeEnd: r.endDate || '',
  };
}

function formToRecurrence(f) {
  switch (f.type) {
    case 'weekly':
      return { type: 'weekly', dayOfWeek: Number(f.dayOfWeek) };
    case 'monthly':
      return { type: 'monthly', dayOfMonth: Number(f.dayOfMonth) };
    case 'quarterly':
      return { type: 'quarterly', months: f.quarterMonths.map(Number), dayOfMonth: Number(f.dayOfMonth) };
    case 'once':
      return { type: 'once', date: f.onceDate };
    case 'range':
      return { type: 'range', startDate: f.rangeStart, endDate: f.rangeEnd };
    default:
      return { type: 'weekly', dayOfWeek: 1 };
  }
}

export default function MeetingForm({ initialData, onSave, onCancel }) {
  const [name, setName] = useState(initialData.name || '');
  const [color, setColor] = useState(initialData.color || '#2563EB');
  const [audience, setAudience] = useState(initialData.audience || '');
  const [time, setTime] = useState(initialData.time || '09:00');
  const [durationValue, setDurationValue] = useState(() => {
    const d = initialData.durationMinutes || 60;
    return d % 60 === 0 ? d / 60 : d;
  });
  const [durationUnit, setDurationUnit] = useState(() => {
    const d = initialData.durationMinutes || 60;
    return d % 60 === 0 ? 'hours' : 'min';
  });
  const [recForm, setRecForm] = useState(() => recurrenceToForm(initialData.recurrence));

  function setRecField(field, value) {
    setRecForm(prev => ({ ...prev, [field]: value }));
  }

  function toggleQuarterMonth(idx) {
    const s = String(idx);
    setRecForm(prev => {
      const qm = prev.quarterMonths.includes(s)
        ? prev.quarterMonths.filter(m => m !== s)
        : [...prev.quarterMonths, s];
      return { ...prev, quarterMonths: qm };
    });
  }

  function handleSubmit(e) {
    e.preventDefault();
    if (!name.trim()) return alert('Name is required');
    const durationMinutes = durationUnit === 'hours' ? Number(durationValue) * 60 : Number(durationValue);
    onSave({
      name: name.trim(),
      color,
      audience,
      time,
      durationMinutes,
      recurrence: formToRecurrence(recForm),
    });
  }

  return (
    <form className="meeting-form" onSubmit={handleSubmit}>
      <div className="form-row">
        <label className="form-label">Meeting Name</label>
        <input
          className="form-input"
          type="text"
          value={name}
          onChange={e => setName(e.target.value)}
          placeholder="e.g. Weekly Sync"
          required
        />
      </div>

      <div className="form-row form-row-2col">
        <div>
          <label className="form-label">Color</label>
          <div className="color-row">
            <input
              type="color"
              value={color}
              onChange={e => setColor(e.target.value)}
              className="color-picker"
            />
            <span className="color-hex">{color}</span>
          </div>
        </div>
        <div>
          <label className="form-label">Audience</label>
          <input
            className="form-input"
            type="text"
            value={audience}
            onChange={e => setAudience(e.target.value)}
            placeholder="e.g. Executive"
          />
        </div>
      </div>

      <div className="form-row form-row-2col">
        <div>
          <label className="form-label">Time</label>
          <input
            className="form-input"
            type="time"
            value={time}
            onChange={e => setTime(e.target.value)}
          />
        </div>
        <div>
          <label className="form-label">Duration</label>
          <div className="duration-row">
            <input
              className="form-input duration-input"
              type="number"
              min="1"
              value={durationValue}
              onChange={e => setDurationValue(e.target.value)}
            />
            <select className="form-select" value={durationUnit} onChange={e => setDurationUnit(e.target.value)}>
              <option value="min">min</option>
              <option value="hours">hours</option>
            </select>
          </div>
        </div>
      </div>

      <div className="form-row">
        <label className="form-label">Recurrence Type</label>
        <select
          className="form-select full-width"
          value={recForm.type}
          onChange={e => setRecField('type', e.target.value)}
        >
          <option value="weekly">Weekly (day of week)</option>
          <option value="monthly">Monthly (day of month)</option>
          <option value="quarterly">Quarterly (specific months)</option>
          <option value="once">One-time (specific date)</option>
          <option value="range">Date Range</option>
        </select>
      </div>

      {recForm.type === 'weekly' && (
        <div className="form-row">
          <label className="form-label">Day of Week</label>
          <select
            className="form-select full-width"
            value={recForm.dayOfWeek}
            onChange={e => setRecField('dayOfWeek', e.target.value)}
          >
            {DAYS_OF_WEEK.map((d, i) => <option key={i} value={i}>{d}</option>)}
          </select>
        </div>
      )}

      {(recForm.type === 'monthly' || recForm.type === 'quarterly') && (
        <div className="form-row">
          <label className="form-label">Day of Month</label>
          <input
            className="form-input"
            type="number"
            min="1"
            max="31"
            value={recForm.dayOfMonth}
            onChange={e => setRecField('dayOfMonth', e.target.value)}
          />
        </div>
      )}

      {recForm.type === 'quarterly' && (
        <div className="form-row">
          <label className="form-label">Months</label>
          <div className="month-checkboxes">
            {MONTHS_LIST.map((m, i) => (
              <label key={i} className="month-check-label">
                <input
                  type="checkbox"
                  checked={recForm.quarterMonths.includes(String(i))}
                  onChange={() => toggleQuarterMonth(i)}
                />
                {m.slice(0, 3)}
              </label>
            ))}
          </div>
        </div>
      )}

      {recForm.type === 'once' && (
        <div className="form-row">
          <label className="form-label">Date</label>
          <input
            className="form-input"
            type="date"
            value={recForm.onceDate}
            onChange={e => setRecField('onceDate', e.target.value)}
          />
        </div>
      )}

      {recForm.type === 'range' && (
        <div className="form-row form-row-2col">
          <div>
            <label className="form-label">Start Date</label>
            <input
              className="form-input"
              type="date"
              value={recForm.rangeStart}
              onChange={e => setRecField('rangeStart', e.target.value)}
            />
          </div>
          <div>
            <label className="form-label">End Date</label>
            <input
              className="form-input"
              type="date"
              value={recForm.rangeEnd}
              onChange={e => setRecField('rangeEnd', e.target.value)}
            />
          </div>
        </div>
      )}

      <div className="form-actions">
        <button type="button" className="btn-secondary" onClick={onCancel}>Cancel</button>
        <button type="submit" className="btn-primary">Save Meeting</button>
      </div>
    </form>
  );
}
