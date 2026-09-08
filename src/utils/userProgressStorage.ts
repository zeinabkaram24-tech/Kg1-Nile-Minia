import { PlanTask, UserTaskProgressItem } from '../types';
import { getOrCreateVisitorId, getStoredVisitorName } from './visitorTracker';

const USER_PROGRESS_PREFIX = 'g2_user_progress_';
const USER_TASKS_PREFIX = 'g2_user_personal_tasks_';

/**
 * Resolves the persistent unique user_id for the current student or visitor.
 * - If student entered their name (e.g. "فريدة فرغلي"), user_id is scoped to that student name.
 * - If guest/visitor, user_id is scoped to their unique visitor device id.
 */
export function resolveCurrentUserId(studentName?: string | null): string {
  const activeName = (studentName || getStoredVisitorName() || '').trim();
  if (activeName && activeName !== 'زائر' && activeName !== 'طالب Grade 2') {
    // Clean and normalize arabic/english name for key safety
    const normalized = activeName.toLowerCase().replace(/\s+/g, '_');
    return `user_${encodeURIComponent(normalized)}`;
  }
  return `guest_${getOrCreateVisitorId()}`;
}

/**
 * Loads the user's personal task progress (completion & notes) from localStorage.
 */
export function getUserProgress(userId: string): Record<string, UserTaskProgressItem> {
  try {
    const raw = localStorage.getItem(`${USER_PROGRESS_PREFIX}${userId}`);
    if (raw) {
      const parsed = JSON.parse(raw);
      if (parsed && typeof parsed === 'object') {
        return parsed;
      }
    }

    // Migration / Fallback: Check existing local tasks for previously completed items
    const fallbackKeys = [
      'g2_school_tasks_v2_2A',
      'g2_school_tasks_v2_2B',
      'g2_school_tasks_v2_2C',
      'g2_school_tasks_v2',
    ];
    const initialMap: Record<string, UserTaskProgressItem> = {};
    let hasFoundAny = false;

    for (const key of fallbackKeys) {
      const legacyRaw = localStorage.getItem(key);
      if (legacyRaw) {
        try {
          const list = JSON.parse(legacyRaw);
          if (Array.isArray(list)) {
            list.forEach((t: any) => {
              if (t.isDone && t.id) {
                initialMap[t.id] = {
                  isDone: true,
                  completedAt: t.completedAt || Date.now(),
                  personalNotes: t.personalNotes || '',
                };
                hasFoundAny = true;
              }
            });
          }
        } catch {
          // Ignore
        }
      }
    }

    if (hasFoundAny) {
      localStorage.setItem(`${USER_PROGRESS_PREFIX}${userId}`, JSON.stringify(initialMap));
      return initialMap;
    }
  } catch (err) {
    console.error('Failed to load user progress from localStorage', err);
  }
  return {};
}

/**
 * Saves task completion status strictly to user's localStorage (User Role).
 */
export function setUserTaskDone(
  userId: string,
  taskId: string,
  isDone: boolean
): Record<string, UserTaskProgressItem> {
  const current = getUserProgress(userId);
  const updated: Record<string, UserTaskProgressItem> = {
    ...current,
    [taskId]: {
      ...current[taskId],
      isDone,
      completedAt: isDone ? Date.now() : undefined,
      updatedAt: Date.now(),
    },
  };

  try {
    localStorage.setItem(`${USER_PROGRESS_PREFIX}${userId}`, JSON.stringify(updated));
  } catch (err) {
    console.error('Failed to save user task progress', err);
  }

  return updated;
}

/**
 * Saves personal student notes strictly to user's localStorage (User Role).
 */
export function setUserTaskPersonalNote(
  userId: string,
  taskId: string,
  personalNotes: string
): Record<string, UserTaskProgressItem> {
  const current = getUserProgress(userId);
  const updated: Record<string, UserTaskProgressItem> = {
    ...current,
    [taskId]: {
      ...current[taskId],
      isDone: current[taskId]?.isDone || false,
      personalNotes: personalNotes.trim(),
      updatedAt: Date.now(),
    },
  };

  try {
    localStorage.setItem(`${USER_PROGRESS_PREFIX}${userId}`, JSON.stringify(updated));
  } catch (err) {
    console.error('Failed to save user personal note', err);
  }

  return updated;
}

/**
 * Loads user's custom personal tasks (User Role only - not shared with others).
 */
export function getUserPersonalTasks(userId: string): PlanTask[] {
  try {
    const raw = localStorage.getItem(`${USER_TASKS_PREFIX}${userId}`);
    if (raw) {
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed)) {
        return parsed;
      }
    }
  } catch (err) {
    console.error('Failed to load user personal tasks', err);
  }
  return [];
}

/**
 * Saves or updates a personal task (User Role - stays on student device only).
 */
export function saveUserPersonalTask(userId: string, task: PlanTask): PlanTask[] {
  const current = getUserPersonalTasks(userId);
  const existingIdx = current.findIndex((t) => t.id === task.id);
  const taggedTask: PlanTask = {
    ...task,
    isPersonalTask: true,
  };

  let updated: PlanTask[];
  if (existingIdx >= 0) {
    updated = [...current];
    updated[existingIdx] = taggedTask;
  } else {
    updated = [taggedTask, ...current];
  }

  try {
    localStorage.setItem(`${USER_TASKS_PREFIX}${userId}`, JSON.stringify(updated));
  } catch (err) {
    console.error('Failed to save user personal tasks', err);
  }

  return updated;
}

/**
 * Deletes a personal task from the user's personal storage.
 */
export function deleteUserPersonalTask(userId: string, taskId: string): PlanTask[] {
  const current = getUserPersonalTasks(userId);
  const updated = current.filter((t) => t.id !== taskId);
  try {
    localStorage.setItem(`${USER_TASKS_PREFIX}${userId}`, JSON.stringify(updated));
  } catch (err) {
    console.error('Failed to delete user personal task', err);
  }
  return updated;
}

/**
 * Merges official global school tasks with the student's personal completion & notes.
 * Keeps official tasks clean from the server while applying user's local state.
 */
export function mergePlanWithUserProgress(
  officialTasks: PlanTask[],
  userId: string
): PlanTask[] {
  const progressMap = getUserProgress(userId);
  const personalTasks = getUserPersonalTasks(userId);

  // Apply personal checkmarks & notes onto official tasks
  const mergedOfficial = officialTasks.map((task) => {
    const userItem = progressMap[task.id];
    if (!userItem) {
      return {
        ...task,
        isDone: false,
        personalNotes: '',
      };
    }
    return {
      ...task,
      isDone: Boolean(userItem.isDone),
      completedAt: userItem.completedAt,
      personalNotes: userItem.personalNotes || '',
    };
  });

  // Combine with student's own personal tasks (if any)
  if (personalTasks.length > 0) {
    const personalMapped = personalTasks.map((pt) => {
      const userItem = progressMap[pt.id];
      return {
        ...pt,
        isDone: userItem ? Boolean(userItem.isDone) : Boolean(pt.isDone),
        completedAt: userItem?.completedAt || pt.completedAt,
        personalNotes: userItem?.personalNotes || pt.personalNotes || '',
      };
    });
    return [...personalMapped, ...mergedOfficial];
  }

  return mergedOfficial;
}
