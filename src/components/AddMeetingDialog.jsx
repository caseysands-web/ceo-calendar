import MeetingForm from './MeetingForm';

export default function AddMeetingDialog({ onSave, onCancel }) {
  const initial = {
    name: '',
    color: '#2563EB',
    audience: '',
    time: '09:00',
    durationMinutes: 60,
    recurrence: { type: 'weekly', dayOfWeek: 1 }
  };

  return (
    <div className="dialog-backdrop" onClick={e => e.target === e.currentTarget && onCancel()}>
      <div className="dialog">
        <div className="dialog-header">
          <h2>Add Meeting</h2>
          <button className="dialog-close" onClick={onCancel}>✕</button>
        </div>
        <MeetingForm initialData={initial} onSave={onSave} onCancel={onCancel} />
      </div>
    </div>
  );
}
