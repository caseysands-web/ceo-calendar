import MeetingForm from './MeetingForm';

export default function EditMeetingDialog({ meeting, onSave, onCancel }) {
  function handleSave(data) {
    onSave({ ...data, id: meeting.id });
  }

  return (
    <div className="dialog-backdrop" onClick={e => e.target === e.currentTarget && onCancel()}>
      <div className="dialog">
        <div className="dialog-header">
          <h2>Edit Meeting</h2>
          <button className="dialog-close" onClick={onCancel}>✕</button>
        </div>
        <MeetingForm initialData={meeting} onSave={handleSave} onCancel={onCancel} />
      </div>
    </div>
  );
}
