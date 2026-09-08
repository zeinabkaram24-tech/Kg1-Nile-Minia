import { VisitorItem, VisitorStatsSummary } from '../types';

const STORAGE_NAME_KEY = 'g2b_student_name';
const STORAGE_VISITOR_ID_KEY = 'g2b_visitor_id';
const STORAGE_ADMIN_PIN_KEY = 'g2b_admin_pin';

export function getOrCreateVisitorId(): string {
  try {
    let id = localStorage.getItem(STORAGE_VISITOR_ID_KEY);
    if (!id) {
      id = `vis-${Date.now()}-${Math.random().toString(36).substring(2, 8)}`;
      localStorage.setItem(STORAGE_VISITOR_ID_KEY, id);
    }
    return id;
  } catch {
    return `vis-${Date.now()}`;
  }
}

export function getStoredVisitorName(): string | null {
  try {
    return localStorage.getItem(STORAGE_NAME_KEY);
  } catch {
    return null;
  }
}

export function setStoredVisitorName(name: string): void {
  try {
    localStorage.setItem(STORAGE_NAME_KEY, name.trim());
  } catch (e) {
    console.error('Could not save student name to local storage', e);
  }
}

export function getStoredAdminPin(): string | null {
  try {
    return localStorage.getItem(STORAGE_ADMIN_PIN_KEY);
  } catch {
    return null;
  }
}

export function setStoredAdminPin(pin: string): void {
  try {
    localStorage.setItem(STORAGE_ADMIN_PIN_KEY, pin);
  } catch (e) {
    console.error('Could not save admin pin', e);
  }
}

// 1. Fetch live public summary stats
export async function fetchVisitorStats(): Promise<VisitorStatsSummary | null> {
  try {
    const res = await fetch('/api/visitors/stats');
    if (!res.ok) throw new Error(`Stats HTTP error ${res.status}`);
    const data = await res.json();
    return data;
  } catch (error) {
    console.warn('Failed to fetch visitor stats:', error);
    return null;
  }
}

// 2. Register student login by name
export async function registerStudentLogin(
  studentName: string,
  studentGrade = 'Grade 2',
  section?: string
): Promise<{ success: boolean; visitor?: VisitorItem; stats?: VisitorStatsSummary; error?: string }> {
  try {
    const visitorId = getOrCreateVisitorId();
    const res = await fetch('/api/visitors/register', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        studentName: studentName.trim(),
        name: studentName.trim(),
        studentGrade,
        section,
        visitorId,
        userAgent: navigator.userAgent,
        device: `${navigator.platform || 'الجهاز'} (${navigator.language || 'ar'})`,
      }),
    });

    if (!res.ok) {
      const errData = await res.json().catch(() => ({}));
      return { success: false, error: errData.error || 'فشل تسجيل الطالب' };
    }

    const data = await res.json();
    if (data.success && data.visitor) {
      setStoredVisitorName(data.visitor.name);
    }
    return data;
  } catch (error) {
    console.error('Registration failed:', error);
    return { success: false, error: 'تعذر الاتصال بالخادم' };
  }
}

// 2b. Register guest visitor (automatic tracking for visitors who do not log in)
export async function registerGuestVisitor(
  section?: string
): Promise<{ success: boolean; visitor?: VisitorItem; stats?: VisitorStatsSummary }> {
  try {
    const visitorId = getOrCreateVisitorId();
    const res = await fetch('/api/visitors/register', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        isGuest: true,
        visitorId,
        section,
        userAgent: navigator.userAgent,
        device: `${navigator.platform || 'الجهاز'} (${navigator.language || 'ar'})`,
      }),
    });

    if (!res.ok) return { success: false };
    const data = await res.json();
    return data;
  } catch {
    return { success: false };
  }
}

// 3. Ping visitor / student session to keep active count accurate
export async function pingVisitorSession(identifier?: string, section?: string): Promise<void> {
  try {
    const visitorId = getOrCreateVisitorId();
    await fetch('/api/visitors/ping', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        studentName: identifier || undefined,
        visitorId,
        section,
      }),
    });
  } catch {
    // Ignore silent background ping errors
  }
}

// 4. Fetch full report of students and visitors for Admin
export async function fetchAllVisitorsAdmin(
  pin?: string
): Promise<{
  authorized: boolean;
  stats?: VisitorStatsSummary;
  totalUsers?: number;
  totalStudentsNamed?: number;
  totalVisitorsGuest?: number;
  totalVisits?: number;
  visitors: VisitorItem[];
  error?: string;
}> {
  try {
    const activePin = pin || getStoredAdminPin() || '';
    const res = await fetch('/api/visitors/all', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        pin: activePin,
      }),
    });

    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      return {
        authorized: false,
        visitors: [],
        error: err.error || 'غير مصرح لك بعرض هذا التقرير',
      };
    }

    const data = await res.json();
    return data;
  } catch (error) {
    console.error('Fetch all visitors failed:', error);
    return {
      authorized: false,
      visitors: [],
      error: 'تعذر الاتصال بالخادم',
    };
  }
}

// 5. Delete visitor/student record (Admin)
export async function deleteVisitorRecord(
  id: string,
  pin?: string
): Promise<boolean> {
  try {
    const res = await fetch(`/api/visitors/${id}`, {
      method: 'DELETE',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        pin: pin || getStoredAdminPin() || '',
      }),
    });
    return res.ok;
  } catch {
    return false;
  }
}
