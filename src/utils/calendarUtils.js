export const FISCAL_YEAR_START = new Date(2026, 1, 1); // Feb 1 2026
export const FISCAL_YEAR_END = new Date(2027, 0, 31); // Jan 31 2027

export const FISCAL_YEAR_MONTHS = [];
for (let m = 1; m <= 12; m++) {
  const month = m % 12; // 1->1, 2->2,...,11->11, 12->0
  const year = m <= 11 ? 2026 : 2027;
  FISCAL_YEAR_MONTHS.push({ year, month: month === 0 ? 0 : month });
}
// Fix: Feb=1, Mar=2...Dec=11, Jan=0
// months: 1,2,3,4,5,6,7,8,9,10,11,0 with years 2026,2026,...,2026,2027
// Let's redo this clearly:
FISCAL_YEAR_MONTHS.length = 0;
const fyMonths = [1,2,3,4,5,6,7,8,9,10,11,0];
const fyYears  = [2026,2026,2026,2026,2026,2026,2026,2026,2026,2026,2026,2027];
for (let i = 0; i < 12; i++) {
  FISCAL_YEAR_MONTHS.push({ year: fyYears[i], month: fyMonths[i] });
}

export function getDaysInMonth(year, month) {
  return new Date(year, month + 1, 0).getDate();
}

export function getFirstDayOfMonth(year, month) {
  return new Date(year, month, 1).getDay();
}

function isoToDate(iso) {
  const [y, m, d] = iso.split('-').map(Number);
  return new Date(y, m - 1, d);
}

export function getMeetingsForDate(meetings, date) {
  const y = date.getFullYear();
  const m = date.getMonth();
  const d = date.getDate();
  const dow = date.getDay();

  return meetings.filter(meeting => {
    const r = meeting.recurrence;
    if (!r) return false;

    if (r.type === 'weekly') {
      return r.dayOfWeek === dow;
    }
    if (r.type === 'monthly') {
      return r.dayOfMonth === d;
    }
    if (r.type === 'quarterly') {
      return r.months.includes(m) && r.dayOfMonth === d;
    }
    if (r.type === 'once') {
      const od = isoToDate(r.date);
      return od.getFullYear() === y && od.getMonth() === m && od.getDate() === d;
    }
    if (r.type === 'range') {
      const start = isoToDate(r.startDate);
      const end = isoToDate(r.endDate);
      return date >= start && date <= end;
    }
    return false;
  });
}

export function generateMeetingDates(meeting, startDate, endDate) {
  const dates = [];
  const r = meeting.recurrence;
  if (!r) return dates;

  if (r.type === 'once') {
    const d = isoToDate(r.date);
    if (d >= startDate && d <= endDate) dates.push(d);
    return dates;
  }

  if (r.type === 'range') {
    const s = isoToDate(r.startDate);
    const e = isoToDate(r.endDate);
    const cur = new Date(Math.max(s, startDate));
    const stop = new Date(Math.min(e, endDate));
    while (cur <= stop) {
      dates.push(new Date(cur));
      cur.setDate(cur.getDate() + 1);
    }
    return dates;
  }

  const cur = new Date(startDate);
  while (cur <= endDate) {
    const m = cur.getMonth();
    const d = cur.getDate();
    const dow = cur.getDay();

    if (r.type === 'weekly' && r.dayOfWeek === dow) {
      dates.push(new Date(cur));
    } else if (r.type === 'monthly' && r.dayOfMonth === d) {
      dates.push(new Date(cur));
    } else if (r.type === 'quarterly' && r.months.includes(m) && r.dayOfMonth === d) {
      dates.push(new Date(cur));
    }
    cur.setDate(cur.getDate() + 1);
  }
  return dates;
}

const DAY_NAMES = ['Sunday','Monday','Tuesday','Wednesday','Thursday','Friday','Saturday'];
const MONTH_NAMES = ['January','February','March','April','May','June','July','August','September','October','November','December'];
const ordinal = n => {
  const s = ['th','st','nd','rd'];
  const v = n % 100;
  return n + (s[(v-20)%10] || s[v] || s[0]);
};

export function formatRecurrenceLabel(meeting) {
  const r = meeting.recurrence;
  if (!r) return 'No recurrence';
  if (r.type === 'weekly') return `Weekly on ${DAY_NAMES[r.dayOfWeek]}`;
  if (r.type === 'monthly') return `Monthly on the ${ordinal(r.dayOfMonth)}`;
  if (r.type === 'quarterly') {
    const mNames = r.months.map(m => MONTH_NAMES[m].slice(0,3)).join(', ');
    return `Quarterly (${mNames}) on the ${ordinal(r.dayOfMonth)}`;
  }
  if (r.type === 'once') return `Once on ${r.date}`;
  if (r.type === 'range') return `${r.startDate} – ${r.endDate}`;
  return '';
}

export function formatDuration(minutes) {
  if (minutes < 60) return `${minutes} min`;
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  return m ? `${h}h ${m}m` : `${h} hr${h > 1 ? 's' : ''}`;
}

export function formatTime(time) {
  if (!time) return '';
  const [h, m] = time.split(':').map(Number);
  const ampm = h >= 12 ? 'PM' : 'AM';
  const hr = h % 12 || 12;
  return `${hr}:${String(m).padStart(2,'0')} ${ampm}`;
}
