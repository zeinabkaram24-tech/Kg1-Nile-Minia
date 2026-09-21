/**
 * Visitor and User Activity Tracking for Admin
 * Tracks daily visitors (from 12:00 AM midnight to 12:00 AM midnight)
 * Separates general visitors from student logins.
 * Automatically resets when the day rolls over at midnight.
 */

export interface VisitorLogEntry {
  id: string;
  timestamp: string; // ISO string
  timeFormatted: string; // e.g. 10:24 AM
  type: 'visitor' | 'student';
  studentName?: string;
  classId?: string;
  details?: string;
}

export interface DailyVisitorStats {
  date: string; // YYYY-MM-DD
  cycleLabel: string;
  totalVisits: number;
  visitorVisits: number;
  studentVisits: number;
  logs: VisitorLogEntry[];
}

const STORAGE_KEY = 'nile_minya_daily_visitors_v2';

function getTodayKey(): string {
  const now = new Date();
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, '0');
  const day = String(now.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

function formatTime(date: Date): string {
  return date.toLocaleTimeString('ar-EG', {
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    hour12: true
  });
}

export function getStoredVisitorStats(): DailyVisitorStats {
  const todayKey = getTodayKey();
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) {
      const parsed: DailyVisitorStats = JSON.parse(raw);
      // If date matches today (from 12:00 AM to 12:00 AM), return current stats
      if (parsed.date === todayKey) {
        return parsed;
      }
    }
  } catch (err) {
    console.error('Failed to parse visitor stats', err);
  }

  // If new day or empty, initialize fresh stats for today (resets at 12:00 AM)
  const freshStats: DailyVisitorStats = {
    date: todayKey,
    cycleLabel: `سجل اليوم من 12:00 ص إلى 12:00 منتصف الليل (${todayKey})`,
    totalVisits: 0,
    visitorVisits: 0,
    studentVisits: 0,
    logs: []
  };
  saveVisitorStats(freshStats);
  return freshStats;
}

export function saveVisitorStats(stats: DailyVisitorStats): void {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(stats));
    // Trigger custom event for real-time reactivity
    window.dispatchEvent(new CustomEvent('nile_minya_visitor_update', { detail: stats }));
  } catch (err) {
    console.error('Failed to save visitor stats', err);
  }
}

export function recordVisitorVisit(type: 'visitor' | 'student', studentName?: string, classId?: string): DailyVisitorStats {
  const current = getStoredVisitorStats();
  const now = new Date();

  // Avoid logging duplicate hits in rapid succession for the same session
  const sessionToken = `nile_visit_${type}_${studentName || 'guest'}_${current.date}`;
  const alreadyLoggedThisSession = sessionStorage.getItem(sessionToken);

  if (alreadyLoggedThisSession && type === 'visitor') {
    return current;
  }

  sessionStorage.setItem(sessionToken, 'true');

  const newEntry: VisitorLogEntry = {
    id: `log-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
    timestamp: now.toISOString(),
    timeFormatted: formatTime(now),
    type,
    studentName: studentName?.trim(),
    classId,
    details: type === 'student' ? `دخول الطالب ${studentName || ''} (Class ${classId || '2A'})` : 'زيارة تصفح من واجهة زائر / ولي أمر'
  };

  const updatedStats: DailyVisitorStats = {
    ...current,
    totalVisits: current.totalVisits + 1,
    visitorVisits: type === 'visitor' ? current.visitorVisits + 1 : current.visitorVisits,
    studentVisits: type === 'student' ? current.studentVisits + 1 : current.studentVisits,
    logs: [newEntry, ...(current.logs || [])].slice(0, 100) // keep last 100 entries for performance
  };

  saveVisitorStats(updatedStats);
  return updatedStats;
}

export function resetDailyVisitorStats(): DailyVisitorStats {
  const todayKey = getTodayKey();
  const freshStats: DailyVisitorStats = {
    date: todayKey,
    cycleLabel: `سجل اليوم من 12:00 ص إلى 12:00 منتصف الليل (${todayKey})`,
    totalVisits: 0,
    visitorVisits: 0,
    studentVisits: 0,
    logs: []
  };
  saveVisitorStats(freshStats);
  return freshStats;
}
