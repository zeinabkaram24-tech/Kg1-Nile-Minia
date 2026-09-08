import {
  DEFAULT_STUDENT,
  DEFAULT_SUBJECTS,
  DEFAULT_TASKS,
  DEFAULT_TIMETABLE,
  GRADE_TASKS,
  GRADE_TIMETABLES,
  TASKS_2A,
  TASKS_2B,
  TASKS_2C,
} from '../data/defaultData';
import {
  DayOfWeek,
  GlobalPlanData,
  GradeSection,
  PlanTask,
  StudentProfile,
  Subject,
  Timetable,
  UserRole,
  WeeklyPlanArchiveEntry,
} from '../types';

const STORAGE_KEYS = {
  TASKS: 'g2_school_tasks_v2',
  TIMETABLE: 'g2_school_timetable_v2',
  STUDENT: 'g2_school_student_v2',
  SUBJECTS: 'g2_school_subjects_v2',
  WEEK_TITLE: 'g2_school_week_title_v2',
  FILES: 'g2_school_uploaded_files_v2',
  SECTION: 'g2_school_grade_section_v2',
  ARCHIVE: 'g2_school_weekly_plans_archive_v1',
  ACTIVE_PLAN_ID: 'g2_school_active_plan_id_v1',
  ADMIN_LOGGED_IN: 'g2_school_admin_logged_in',
  USER_ROLE: 'g2_school_user_role_v1',
};

export function loadSavedGradeSection(): GradeSection | null {
  try {
    const saved = localStorage.getItem(STORAGE_KEYS.SECTION);
    if (saved === '2A' || saved === '2B' || saved === '2C') {
      return saved;
    }
  } catch {
    // ignore
  }
  return null;
}

export function saveGradeSection(section: GradeSection): void {
  try {
    localStorage.setItem(STORAGE_KEYS.SECTION, section);
  } catch (e) {
    console.error('Failed to save grade section', e);
  }
}

export function getTodayDayOfWeek(): DayOfWeek {
  const dayIndex = new Date().getDay();
  const dayMap: Record<number, DayOfWeek> = {
    0: 'sunday',
    1: 'monday',
    2: 'tuesday',
    3: 'wednesday',
    4: 'thursday',
    5: 'friday',
    6: 'saturday',
  };
  return dayMap[dayIndex] || 'sunday';
}

export function filterOutArtTasks(tasks: PlanTask[]): PlanTask[] {
  return tasks
    .filter(
      (t) =>
        t.subjectId !== 'arts' &&
        t.subjectId !== 'pe' &&
        !t.title?.toLowerCase().includes('arts') &&
        !t.title?.toLowerCase().includes('pe') &&
        !t.title?.toLowerCase().includes('physical education') &&
        !t.title?.includes('التربية الفنية') &&
        !t.title?.includes('التربية الرياضية') &&
        !t.title?.includes('الرسم') &&
        !t.title?.includes('اللياقة البدنية') &&
        !t.title?.includes('الزي الرياضي')
    )
    .map((t) => ({
      ...t,
      pages: t.pages ? t.pages.replace(/كتاب الأنشطة/g, 'كتاب الدراسات الاجتماعية') : t.pages,
      details: t.details ? t.details.replace(/كتاب الأنشطة/g, 'كتاب الدراسات الاجتماعية') : t.details,
      title: t.title ? t.title.replace(/كتاب الأنشطة/g, 'كتاب الدراسات الاجتماعية') : t.title,
    }));
}

/**
 * Keep tasks uploaded/created in an older plan, but add any newly shipped
 * default tasks that are missing from that plan. This is important because
 * plans are persisted in localStorage and Global Storage across deployments.
 */
export function mergeWithDefaultTasks(tasks: PlanTask[], section: GradeSection): PlanTask[] {
  const defaults = filterOutArtTasks(GRADE_TASKS[section] || []);
  const existingById = new Map(tasks.map((task) => [task.id, task]));
  const defaultIds = new Set(defaults.map((task) => task.id));
  const mergedDefaults = defaults.map((defaultTask) => {
    const existing = existingById.get(defaultTask.id);
    if (!existing) return defaultTask;
    return {
      ...defaultTask,
      ...existing,
      // Backfill newly shipped official data without overwriting the user's
      // completion state or personal note.
      notes: existing.notes?.trim() || defaultTask.notes,
    };
  });
  const extraTasks = tasks.filter((task) => !defaultIds.has(task.id));
  return filterOutArtTasks([...mergedDefaults, ...extraTasks]);
}

export function loadSavedTasks(section: GradeSection = '2A'): PlanTask[] {
  try {
    const key = `${STORAGE_KEYS.TASKS}_${section}`;
    const saved = localStorage.getItem(key);
    if (saved) {
      const parsed: PlanTask[] = JSON.parse(saved);
      return mergeWithDefaultTasks(parsed, section);
    }
  } catch (e) {
    console.error('Failed to load tasks', e);
  }
  const defaults = GRADE_TASKS[section] || DEFAULT_TASKS;
  return filterOutArtTasks(defaults);
}

export function saveTasks(tasks: PlanTask[], section: GradeSection = '2A'): void {
  try {
    const filtered = filterOutArtTasks(tasks);
    const key = `${STORAGE_KEYS.TASKS}_${section}`;
    localStorage.setItem(key, JSON.stringify(filtered));
    // Also save as global fallback
    localStorage.setItem(STORAGE_KEYS.TASKS, JSON.stringify(filtered));
  } catch (e) {
    console.error('Failed to save tasks', e);
  }
}

export function loadSavedTimetable(section: GradeSection = '2A'): Timetable {
  try {
    const key = `${STORAGE_KEYS.TIMETABLE}_${section}`;
    const saved = localStorage.getItem(key);
    if (saved) {
      return JSON.parse(saved);
    }
  } catch (e) {
    console.error('Failed to load timetable', e);
  }
  return GRADE_TIMETABLES[section] || DEFAULT_TIMETABLE;
}

export function saveTimetable(timetable: Timetable, section: GradeSection = '2A'): void {
  try {
    const key = `${STORAGE_KEYS.TIMETABLE}_${section}`;
    localStorage.setItem(key, JSON.stringify(timetable));
  } catch (e) {
    console.error('Failed to save timetable', e);
  }
}

export function loadSavedSubjects(): Subject[] {
  try {
    const saved = localStorage.getItem(STORAGE_KEYS.SUBJECTS);
    if (saved) {
      const subjects: Subject[] = JSON.parse(saved);
      return subjects.filter((subject) => subject.id === 'arabic' || subject.id === 'english');
    }
  } catch (e) {
    console.error('Failed to load subjects', e);
  }
  return DEFAULT_SUBJECTS;
}

export function saveSubjects(subjects: Subject[]): void {
  try {
    const allowedSubjects = subjects.filter((subject) => subject.id === 'arabic' || subject.id === 'english');
    localStorage.setItem(STORAGE_KEYS.SUBJECTS, JSON.stringify(allowedSubjects));
  } catch (e) {
    console.error('Failed to save subjects', e);
  }
}

export function isStudentRemembered(): boolean {
  try {
    const remembered = localStorage.getItem('g2_student_remembered');
    return remembered === 'true';
  } catch {
    return false;
  }
}

export function isUserLoggedIn(): boolean {
  try {
    const isRemembered = localStorage.getItem('g2_student_remembered') === 'true';
    const name = localStorage.getItem('g2_saved_student_name');
    return Boolean(isRemembered && name && name.trim() && name !== 'طالب KG 1' && name !== 'زائر');
  } catch {
    return false;
  }
}

export function getSavedStudentName(): string | null {
  try {
    return localStorage.getItem('g2_saved_student_name');
  } catch {
    return null;
  }
}

export function saveStudentLogin(name: string, section: GradeSection, remember: boolean = true): void {
  try {
    const trimmedName = name.trim();
    if (remember) {
      localStorage.setItem('g2_student_remembered', 'true');
      localStorage.setItem('g2_saved_student_name', trimmedName);
    } else {
      localStorage.removeItem('g2_student_remembered');
      localStorage.removeItem('g2_saved_student_name');
    }

    // Save section
    saveGradeSection(section);

    // Save student profile
    const existing = loadSavedStudent();
    saveStudent({
      ...existing,
      name: trimmedName,
      section: section,
      grade: `Grade ${section}`,
    });
  } catch (e) {
    console.error('Failed to save student login', e);
  }
}

export function clearStudentLogin(): void {
  try {
    localStorage.removeItem('g2_student_remembered');
    localStorage.removeItem('g2_saved_student_name');
    localStorage.removeItem(STORAGE_KEYS.STUDENT);
  } catch (e) {
    console.error('Failed to clear student login', e);
  }
}

export function loadSavedStudent(): StudentProfile {
  try {
    const saved = localStorage.getItem(STORAGE_KEYS.STUDENT);
    const savedName = getSavedStudentName();
    if (saved) {
      const parsed = JSON.parse(saved);
      if (savedName && savedName.trim()) {
        parsed.name = savedName.trim();
      }
      return parsed;
    }
    if (savedName && savedName.trim()) {
      return {
        ...DEFAULT_STUDENT,
        name: savedName.trim(),
      };
    }
  } catch (e) {
    console.error('Failed to load student', e);
  }
  return DEFAULT_STUDENT;
}

export function saveStudent(student: StudentProfile): void {
  try {
    localStorage.setItem(STORAGE_KEYS.STUDENT, JSON.stringify(student));
  } catch (e) {
    console.error('Failed to save student', e);
  }
}

export function loadWeekTitle(): string {
  try {
    const saved = localStorage.getItem(STORAGE_KEYS.WEEK_TITLE);
    if (saved && !saved.includes('الأسبوع الأول') && !saved.includes('Week 2') && !saved.includes('Week 1 Plan')) {
      return saved;
    }
    return 'Block 1 - Week 1';
  } catch {
    return 'Block 1 - Week 1';
  }
}

export function saveWeekTitle(title: string): void {
  try {
    localStorage.setItem(STORAGE_KEYS.WEEK_TITLE, title);
  } catch (e) {
    console.error('Failed to save week title', e);
  }
}

export function loadSavedUploadedFiles(): import('../types').UploadedPlanFile[] {
  try {
    const saved = localStorage.getItem(STORAGE_KEYS.FILES);
    if (saved) {
      return JSON.parse(saved);
    }
  } catch (e) {
    console.error('Failed to load uploaded files', e);
  }
  return [];
}

export function saveUploadedFiles(files: import('../types').UploadedPlanFile[]): void {
  try {
    localStorage.setItem(STORAGE_KEYS.FILES, JSON.stringify(files));
  } catch (e) {
    console.error('Failed to save uploaded files', e);
  }
}

export function resetAllDataToDefault(): void {
  localStorage.removeItem(STORAGE_KEYS.TASKS);
  localStorage.removeItem(STORAGE_KEYS.TIMETABLE);
  localStorage.removeItem(`${STORAGE_KEYS.TIMETABLE}_2A`);
  localStorage.removeItem(`${STORAGE_KEYS.TIMETABLE}_2B`);
  localStorage.removeItem(`${STORAGE_KEYS.TIMETABLE}_2C`);
  localStorage.removeItem(STORAGE_KEYS.STUDENT);
  localStorage.removeItem(STORAGE_KEYS.SUBJECTS);
  localStorage.removeItem(STORAGE_KEYS.WEEK_TITLE);
  localStorage.removeItem(STORAGE_KEYS.FILES);
  localStorage.removeItem(STORAGE_KEYS.SECTION);
  localStorage.removeItem(STORAGE_KEYS.ARCHIVE);
  localStorage.removeItem(STORAGE_KEYS.ACTIVE_PLAN_ID);
}

export type { WeeklyPlanArchiveEntry } from '../types';

// --- ADMIN AUTHENTICATION STATE ---
export function isAdminLoggedIn(): boolean {
  try {
    return localStorage.getItem(STORAGE_KEYS.ADMIN_LOGGED_IN) === 'true';
  } catch {
    return false;
  }
}

export function setAdminLoggedIn(isAdmin: boolean): void {
  try {
    if (isAdmin) {
      localStorage.setItem(STORAGE_KEYS.ADMIN_LOGGED_IN, 'true');
    } else {
      localStorage.removeItem(STORAGE_KEYS.ADMIN_LOGGED_IN);
    }
  } catch (e) {
    console.error('Failed to set admin login state', e);
  }
}

export function clearAdminLogin(): void {
  setAdminLoggedIn(false);
}

export function verifyAdminPassword(input: string): boolean {
  if (!input) return false;
  const clean = input.trim().toLowerCase();
  return (
    clean === '1111' ||
    clean === '1940' ||
    clean === '2026' ||
    clean === 'admin' ||
    clean === 'zeinab' ||
    clean === '1234' ||
    clean === 'zeinabkaram24@gmail.com' ||
    clean === 'zeinabkaram909@gmail.com' ||
    clean === 'faridaferghali2019@gmail.com' ||
    clean === 'faridafarghally2019@gmail.com' ||
    clean.includes('zeinabkaram') ||
    clean.includes('farida')
  );
}

// --- USER ROLE MANAGEMENT (Admin vs Student vs Visitor) ---
export function getUserRole(): UserRole {
  try {
    const saved = localStorage.getItem(STORAGE_KEYS.USER_ROLE) as UserRole;
    if (saved === 'admin' || saved === 'student' || saved === 'visitor') {
      return saved;
    }
  } catch (e) {
    console.error('Failed to get user role', e);
  }
  if (isAdminLoggedIn()) return 'admin';
  return 'visitor';
}

export function saveUserRole(role: UserRole): void {
  try {
    localStorage.setItem(STORAGE_KEYS.USER_ROLE, role);
    if (role === 'admin') {
      setAdminLoggedIn(true);
    } else {
      setAdminLoggedIn(false);
    }
  } catch (e) {
    console.error('Failed to save user role', e);
  }
}

export function clearUserRole(): void {
  try {
    localStorage.removeItem(STORAGE_KEYS.USER_ROLE);
    setAdminLoggedIn(false);
  } catch (e) {
    console.error('Failed to clear user role', e);
  }
}

export function hasStoredUserRole(): boolean {
  try {
    const saved = localStorage.getItem(STORAGE_KEYS.USER_ROLE);
    return saved === 'admin' || saved === 'student' || saved === 'visitor';
  } catch {
    return false;
  }
}

// --- WEEKLY PLANS MEMORY & ARCHIVE (Block & Week) ---

export function getLatestWeeklyPlan(archive: WeeklyPlanArchiveEntry[]): WeeklyPlanArchiveEntry {
  if (!archive || archive.length === 0) {
    return getInitialWeeklyPlansArchive()[0];
  }
  // 1. Check if an entry is explicitly marked isCurrent
  const current = archive.find((p) => p.isCurrent);
  if (current) return current;

  // 2. Otherwise sort by blockNumber desc, weekNumber desc, createdAt desc
  const sorted = [...archive].sort((a, b) => {
    const bBlock = b.blockNumber || 1;
    const aBlock = a.blockNumber || 1;
    if (bBlock !== aBlock) return bBlock - aBlock;

    const bWeek = b.weekNumber || 1;
    const aWeek = a.weekNumber || 1;
    if (bWeek !== aWeek) return bWeek - aWeek;

    return (b.createdAt || 0) - (a.createdAt || 0);
  });
  return sorted[0];
}

export function getInitialWeeklyPlansArchive(): WeeklyPlanArchiveEntry[] {
  const week1Entry: WeeklyPlanArchiveEntry = {
    id: 'b1-w1',
    blockNumber: 1,
    weekNumber: 1,
    title: 'Block 1 - Week 1',
    createdAt: Date.now(),
    startDate: 'الأحد 31 أغسطس',
    endDate: 'الخميس 4 سبتمبر',
    tasksBySection: {
      '2A': filterOutArtTasks(TASKS_2A),
      '2B': filterOutArtTasks(TASKS_2B),
      '2C': filterOutArtTasks(TASKS_2C),
    },
    uploadedFiles: [],
    isCurrent: true,
    notes: 'الخطة التأسيسية للأسبوع الأول - مدارس النيل المصرية الدولية فرع المنيا',
  };

  return [week1Entry];
}

export function loadWeeklyPlansArchive(): WeeklyPlanArchiveEntry[] {
  try {
    const saved = localStorage.getItem(STORAGE_KEYS.ARCHIVE);
    if (saved) {
      const parsed: WeeklyPlanArchiveEntry[] = JSON.parse(saved);
      if (Array.isArray(parsed) && parsed.length > 0) {
        // Filter out any auto-seeded Week 2 that was generated before without user-created custom tasks
        let entries = parsed.filter(
          (e) => !(e.id === 'b1-w2' && (e.notes?.includes('الجمعة الحالي') || e.title?.includes('Week 2') || e.weekNumber === 2))
        );
        if (entries.length === 0) {
          entries = getInitialWeeklyPlansArchive();
        }

        // Ensure Week 1 is marked as current if no other plan is set
        const hasCurrent = entries.some((e) => e.isCurrent);
        if (!hasCurrent && entries.length > 0) {
          entries[0].isCurrent = true;
        }

        // Ensure each entry has tasks filtered and default title set to Block 1 - Week 1
        return entries.map((entry) => ({
          ...entry,
          title:
            entry.id === 'b1-w1' && (!entry.title || entry.title.includes('الأسبوع الأول') || entry.title.includes('Week 1 Plan'))
              ? 'Block 1 - Week 1'
              : entry.title,
          tasksBySection: {
            '2A': mergeWithDefaultTasks(entry.tasksBySection?.['2A'] || [], '2A'),
            '2B': mergeWithDefaultTasks(entry.tasksBySection?.['2B'] || [], '2B'),
            '2C': mergeWithDefaultTasks(entry.tasksBySection?.['2C'] || [], '2C'),
          },
        }));
      }
    }
  } catch (e) {
    console.error('Failed to load weekly plans archive', e);
  }
  const initial = getInitialWeeklyPlansArchive();
  saveWeeklyPlansArchive(initial);
  return initial;
}

export function saveWeeklyPlansArchive(archive: WeeklyPlanArchiveEntry[]): void {
  try {
    localStorage.setItem(STORAGE_KEYS.ARCHIVE, JSON.stringify(archive));
  } catch (e) {
    console.error('Failed to save weekly plans archive', e);
  }
}

export function getActiveWeeklyPlanId(): string {
  try {
    const saved = localStorage.getItem(STORAGE_KEYS.ACTIVE_PLAN_ID);
    if (saved && saved !== 'b1-w2') return saved;
  } catch {
    // ignore
  }
  const archive = loadWeeklyPlansArchive();
  const latest = getLatestWeeklyPlan(archive);
  return latest?.id || 'b1-w1';
}

export function setActiveWeeklyPlanId(id: string): void {
  try {
    localStorage.setItem(STORAGE_KEYS.ACTIVE_PLAN_ID, id);
  } catch (e) {
    console.error('Failed to set active weekly plan id', e);
  }
}

export function getWeeklyPlanById(id: string): WeeklyPlanArchiveEntry | undefined {
  const archive = loadWeeklyPlansArchive();
  return archive.find((w) => w.id === id);
}

export function addOrUpdateWeeklyPlanInArchive(
  newPlan: WeeklyPlanArchiveEntry,
  setAsCurrent = true
): WeeklyPlanArchiveEntry[] {
  const archive = loadWeeklyPlansArchive();
  const existingIdx = archive.findIndex((p) => p.id === newPlan.id);

  let updatedList: WeeklyPlanArchiveEntry[];

  if (setAsCurrent) {
    // Set all other plans isCurrent to false
    const resetCurrent = archive.map((p) => ({ ...p, isCurrent: false }));
    const planWithCurrent = { ...newPlan, isCurrent: true };

    if (existingIdx >= 0) {
      resetCurrent[existingIdx] = planWithCurrent;
      updatedList = resetCurrent;
    } else {
      updatedList = [planWithCurrent, ...resetCurrent];
    }
    setActiveWeeklyPlanId(newPlan.id);
  } else {
    if (existingIdx >= 0) {
      archive[existingIdx] = newPlan;
      updatedList = [...archive];
    } else {
      updatedList = [newPlan, ...archive];
    }
  }

  saveWeeklyPlansArchive(updatedList);
  return updatedList;
}

export function deleteWeeklyPlanFromArchive(planId: string): WeeklyPlanArchiveEntry[] {
  const archive = loadWeeklyPlansArchive();
  // Do not delete if only 1 plan left
  if (archive.length <= 1) return archive;

  const filtered = archive.filter((p) => p.id !== planId);
  // If active was deleted, fallback to the first
  const activeId = getActiveWeeklyPlanId();
  if (activeId === planId && filtered.length > 0) {
    setActiveWeeklyPlanId(filtered[0].id);
    filtered[0].isCurrent = true;
  }

  saveWeeklyPlansArchive(filtered);
  return filtered;
}

// =========================================================================
// GLOBAL STORAGE SYNC (ADMIN ROLE -> SERVER STORAGE)
// =========================================================================

/**
 * Fetches the shared Global Plan from the server (Global Storage).
 * Visible to ALL users and students across all devices.
 */
export async function fetchGlobalPlanFromServer(): Promise<GlobalPlanData | null> {
  try {
    const res = await fetch('/api/plan/global');
    if (res.ok) {
      const data = await res.json();
      if (data.success && data.plan) {
        return data.plan as GlobalPlanData;
      }
    }
  } catch (err) {
    console.warn('Notice: Failed to fetch global plan from server:', err);
  }
  return null;
}

/**
 * Saves the weekly plan to the server's Global Storage (Admin Role with password 1111).
 * Immediately reflects and updates for ALL users across the school.
 */
export async function saveGlobalPlanToServer(
  plan: GlobalPlanData,
  pin: string = '1111'
): Promise<{ success: boolean; error?: string }> {
  try {
    const res = await fetch('/api/plan/global', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        plan,
        pin,
        isAdmin: true,
      }),
    });

    const data = await res.json();
    if (res.ok && data.success) {
      return { success: true };
    }
    return { success: false, error: data.error || 'فشل حفظ الخطة في المسار العام' };
  } catch (err) {
    console.error('Failed to sync global plan to server:', err);
    return { success: false, error: 'تعذر الاتصال بالخادم لحفظ الخطة العامة' };
  }
}
