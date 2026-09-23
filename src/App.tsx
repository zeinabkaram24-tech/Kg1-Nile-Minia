import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { ClassId, SchoolDay, ClassworkEntry, HomeworkEntry, UserProfile, TomorrowSpecialNote } from './types';
import { INITIAL_CLASSWORK, INITIAL_HOMEWORK } from './data/defaultWeeklyPlan';
import { SCHOOL_DAYS, SCHOOL_NAME, SCHOOL_BRANCH, NEXT_SCHOOL_DAY } from './data/timetables';
import { Navbar } from './components/Navbar';
import { ClassworkView } from './components/ClassworkView';
import { HomeworkView } from './components/HomeworkView';
import { TomorrowView } from './components/TomorrowView';
import { TimetableGrid } from './components/TimetableGrid';
import { PrintSheet } from './components/PrintSheet';
import { WeeklyPlanModal } from './components/WeeklyPlanModal';
import { StudentAuthModal } from './components/StudentAuthModal';
import { AdminAuthModal } from './components/AdminAuthModal';
import { AdminDashboardModal } from './components/AdminDashboardModal';
import { MaterialsModal } from './components/MaterialsModal';
import { clearAllMaterials } from './utils/materialsStorage';
import { PdfViewerModal } from './components/PdfViewerModal';
import { SupabaseConfigModal } from './components/SupabaseConfigModal';
import { InteractiveEditorModal } from './components/InteractiveEditorModal';
import { notifyTomorrowNotesListeners, saveTomorrowNotes, saveDeletedTomorrowNoteId, removeDeletedPlannerItemId } from './utils/tomorrowNotesStorage';
import { syncTimetablesFromCloud } from './utils/timetableStorage';
import {
  getActiveUserProfile,
  setActiveUserProfile,
  getStudentProgress,
  saveStudentProgress,
  getGuestProgress,
  saveGuestProgress,
  syncStudentProgressFromDb,
} from './utils/studentStorage';
import {
  isSupabaseConfigured,
  supabase,
  fetchAllClasswork,
  upsertClasswork,
  updateClassworkCompletion,
  deleteClasswork,
  bulkInsertClasswork,
  fetchAllHomework,
  upsertHomework,
  updateHomeworkCompletion,
  deleteHomework,
  bulkInsertHomework,
  seedInitialDataIfEmpty,
  forceSyncBaselineToSupabase,
  fetchPlannerSettings,
  savePlannerSetting,
  rowToClasswork,
  rowToHomework,
  ClassworkRow,
  HomeworkRow,
  syncSupabaseConfigWithServer,
  syncLocalDataToServer,
  saveActiveSupabaseConfig,
  getLocalCustomClasswork,
  getLocalCustomHomework,
  saveLocalCustomClasswork,
  saveLocalCustomHomework,
} from './lib/supabase';
import initialData from './data/initialData.json';
import { Sparkles, RotateCcw, Database, Loader2, CheckCircle2, AlertCircle, Shield, Calendar as CalendarIcon } from 'lucide-react';
import { getAutoDetectedToday } from './utils/academicCalendar';

// Real local app storage with fallback for browser environment
const appStorage = {
  getItem: (key: string) => {
    try {
      return typeof window !== 'undefined' ? window.localStorage?.getItem(key) : null;
    } catch {
      return null;
    }
  },
  setItem: (key: string, val: string) => {
    try {
      if (typeof window !== 'undefined') window.localStorage?.setItem(key, val);
    } catch {}
  },
  removeItem: (key: string) => {
    try {
      if (typeof window !== 'undefined') window.localStorage?.removeItem(key);
    } catch {}
  }
};

const STORAGE_KEYS = {
  CLASS: 'nile_planner_current_class_v3',
  DAY: 'nile_planner_selected_day_v3',
  WEEK: 'nile_planner_current_week_v3',
};

function getProfileClasswork(profile: UserProfile | null): ClassworkEntry[] {
  const cached = getLocalCustomClasswork();
  let deletedSet = new Set<string>();
  try {
    const raw = appStorage.getItem('nile_deleted_planner_item_ids_v3');
    if (raw) {
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed)) deletedSet = new Set(parsed);
    }
  } catch {}

  const map = new Map<string, ClassworkEntry>();
  INITIAL_CLASSWORK.forEach((c) => { if (c && c.id) map.set(c.id, c); });
  if (cached && cached.length > 0) {
    cached.forEach((c) => {
      if (c && c.id) {
        const baseline = INITIAL_CLASSWORK.find((b) => b.id === c.id);
        const mergedLinks = (!c.links || c.links.length === 0) && baseline?.links && baseline.links.length > 0
          ? baseline.links
          : c.links;
        map.set(c.id, { ...c, links: mergedLinks });
      }
    });
  }
  const source = Array.from(map.values()).filter((c) => !deletedSet.has(c.id));
  if (profile?.mode === 'student' && profile.studentName) {
    const progress = getStudentProgress(profile.studentName);
    const set = new Set(progress.completedClassworkIds);
    return source.map((c) => ({
      ...c,
      completed: set.has(c.id),
    }));
  }
  const guestProgress = getGuestProgress();
  const guestSet = new Set(guestProgress.completedClassworkIds);
  return source.map((c) => ({
    ...c,
    completed: guestSet.has(c.id),
  }));
}

function getProfileHomework(profile: UserProfile | null): HomeworkEntry[] {
  const cached = getLocalCustomHomework();
  let deletedSet = new Set<string>();
  try {
    const raw = appStorage.getItem('nile_deleted_planner_item_ids_v3');
    if (raw) {
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed)) deletedSet = new Set(parsed);
    }
  } catch {}

  const map = new Map<string, HomeworkEntry>();
  INITIAL_HOMEWORK.forEach((h) => { if (h && h.id) map.set(h.id, h); });
  if (cached && cached.length > 0) {
    cached.forEach((h) => {
      if (h && h.id) {
        const baseline = INITIAL_HOMEWORK.find((b) => b.id === h.id);
        const mergedLinks = (!h.links || h.links.length === 0) && baseline?.links && baseline.links.length > 0
          ? baseline.links
          : h.links;
        map.set(h.id, { ...h, links: mergedLinks });
      }
    });
  }
  const source = Array.from(map.values()).filter((h) => !deletedSet.has(h.id));
  if (profile?.mode === 'student' && profile.studentName) {
    const progress = getStudentProgress(profile.studentName);
    const set = new Set(progress.completedHomeworkIds);
    return source.map((h) => ({
      ...h,
      completed: set.has(h.id),
    }));
  }
  const guestProgress = getGuestProgress();
  const guestSet = new Set(guestProgress.completedHomeworkIds);
  return source.map((h) => ({
    ...h,
    completed: guestSet.has(h.id),
  }));
}

export default function App() {
  // Active User Profile (Guest vs Student)
  const [userProfile, setUserProfile] = useState<UserProfile | null>(() => {
    return getActiveUserProfile();
  });

  const [isAuthModalOpen, setIsAuthModalOpen] = useState<boolean>(() => {
    return getActiveUserProfile() === null;
  });

  // Real-world automatic date detection (e.g. today is 21st, opens directly on Monday 21st, Topic 1, Week 2)
  const autoDetected = useMemo(() => getAutoDetectedToday(), []);

  // Class selection (KG1A, KG1B, KG1C, KG1D, KG1E)
  const [currentClass, setCurrentClass] = useState<ClassId>(() => {
    const profile = getActiveUserProfile();
    if (profile?.classId) return profile.classId;
    const saved = appStorage.getItem(STORAGE_KEYS.CLASS);
    return saved && (saved.startsWith('KG1') || saved.startsWith('G2') || ['A','B','C','D','E','2A','2B','2C','2D','2E'].includes(saved)) ? saved : 'KG1A';
  });

  // Current Topic (1, 2, 3, 4) - Automatically defaults to today's academic topic
  const [currentBlock, setCurrentBlock] = useState<number>(() => {
    return autoDetected.topic;
  });

  // Current Week (1, 2, 3, 4) - Automatically defaults to today's academic week
  const [currentWeek, setCurrentWeek] = useState<number>(() => {
    return autoDetected.week;
  });

  // Selected Day (Sunday, Monday, Tuesday, Wednesday, Thursday) - Automatically defaults to today's real day!
  const [selectedDay, setSelectedDay] = useState<SchoolDay>(() => {
    return autoDetected.day;
  });

  // Active View Tab: 'classwork' | 'homework' | 'tomorrow' | 'timetable'
  const [activeTab, setActiveTab] = useState<'classwork' | 'homework' | 'tomorrow' | 'timetable'>('classwork');

  // Supabase Connection Status
  const [supabaseStatus, setSupabaseStatus] = useState<'connecting' | 'connected' | 'unconfigured' | 'error'>(() => {
    return isSupabaseConfigured ? 'connecting' : 'unconfigured';
  });

  // Classwork state initialized based on user profile
  const [classworkList, setClassworkList] = useState<ClassworkEntry[]>(() => {
    return getProfileClasswork(getActiveUserProfile());
  });

  // Homework state initialized based on user profile
  const [homeworkList, setHomeworkList] = useState<HomeworkEntry[]>(() => {
    return getProfileHomework(getActiveUserProfile());
  });

  // Admin Direct Edit Mode and Interactive Editor States
  const [isAdminEditMode, setIsAdminEditMode] = useState<boolean>(false);
  const [isEditorModalOpen, setIsEditorModalOpen] = useState<boolean>(false);
  const [editorModalMode, setEditorModalMode] = useState<'add' | 'edit'>('add');
  const [editorItemType, setEditorItemType] = useState<'classwork' | 'homework' | 'tomorrow'>('classwork');
  const [selectedEditorItem, setSelectedEditorItem] = useState<any>(null);

  const [toastMsg, setToastMsg] = useState<string | null>(null);
  const [isPlanModalOpen, setIsPlanModalOpen] = useState(false);
  const [isAdminAuthOpen, setIsAdminAuthOpen] = useState(false);
  const [isAdminDashboardOpen, setIsAdminDashboardOpen] = useState(false);
  const [isMaterialsModalOpen, setIsMaterialsModalOpen] = useState(false);
  const [isSupabaseConfigOpen, setIsSupabaseConfigOpen] = useState(false);

  // Listen for Supabase config updates (saving URL / API Key from UI)
  useEffect(() => {
    const handleConfigUpdated = async () => {
      setSupabaseStatus('connecting');
      try {
        const [cwData, hwData] = await Promise.all([
          fetchAllClasswork(),
          fetchAllHomework(),
        ]);
        if (cwData && cwData.length > 0) setClassworkList(cwData);
        if (hwData && hwData.length > 0) setHomeworkList(hwData);
        setSupabaseStatus('connected');
        showToast('تم تحديث اتصال Supabase وقراءة البيانات السحابية بنجاح!');
      } catch (err) {
        console.error('Error reloading data after Supabase config change:', err);
        setSupabaseStatus('error');
      }
    };

    window.addEventListener('supabase_config_updated', handleConfigUpdated);
    return () => {
      window.removeEventListener('supabase_config_updated', handleConfigUpdated);
    };
  }, []);

  useEffect(() => {
    if (isAdminEditMode) {
      showToast('🛠️ تم تفعيل وضع التعديل المباشر! يمكنك الآن إضافة وتعديل وحذف أي عنصر مباشرة من الصفحة.');
    }
  }, [isAdminEditMode]);

  // Persistence & Sync effects for class, week, day
  useEffect(() => {
    appStorage.setItem(STORAGE_KEYS.CLASS, currentClass);
    if (isSupabaseConfigured) {
      savePlannerSetting('current_class', currentClass);
    }
  }, [currentClass]);

  useEffect(() => {
    appStorage.setItem(STORAGE_KEYS.WEEK, String(currentWeek));
    if (isSupabaseConfigured) {
      savePlannerSetting('current_week', String(currentWeek));
    }
  }, [currentWeek]);

  useEffect(() => {
    appStorage.setItem(STORAGE_KEYS.DAY, selectedDay);
    if (isSupabaseConfigured) {
      savePlannerSetting('selected_day', selectedDay);
    }
  }, [selectedDay]);

  const [isSyncing, setIsSyncing] = useState<boolean>(false);

  // Core Data Fetch & Synchronization Function (Mobile, Laptop, Cloud)
  const refreshAllData = useCallback(async (showNotification = false) => {
    try {
      setIsSyncing(true);

      if (isSupabaseConfigured) {
        setSupabaseStatus('connecting');
      }

      // Fetch classwork, homework, and planner settings in parallel
      const [cwData, hwData, settings] = await Promise.all([
        fetchAllClasswork(),
        fetchAllHomework(),
        fetchPlannerSettings(),
        syncTimetablesFromCloud(),
      ]);

      const profile = getActiveUserProfile();
      let progress: any = null;
      if (profile?.mode === 'student' && profile.studentName) {
        if (isSupabaseConfigured) {
          try {
            progress = await syncStudentProgressFromDb(profile.studentName);
          } catch {
            progress = getStudentProgress(profile.studentName);
          }
        } else {
          progress = getStudentProgress(profile.studentName);
        }
      }

      // Apply classwork
      if (cwData && cwData.length > 0) {
        const uniqueCwMap = new Map<string, ClassworkEntry>();
        cwData.forEach((c) => uniqueCwMap.set(c.id, c));
        const dedupedCw = Array.from(uniqueCwMap.values());

        if (profile?.mode === 'student' && profile.studentName) {
          const cwSet = new Set(progress ? progress.completedClassworkIds : []);
          setClassworkList(dedupedCw.map((c) => ({ ...c, completed: cwSet.has(c.id) })));
        } else {
          const guestProgress = getGuestProgress();
          const cwSet = new Set(guestProgress.completedClassworkIds);
          setClassworkList(dedupedCw.map((c) => ({ ...c, completed: cwSet.has(c.id) })));
        }
      }

      // Apply homework
      if (hwData && hwData.length > 0) {
        const uniqueHwMap = new Map<string, HomeworkEntry>();
        hwData.forEach((h) => uniqueHwMap.set(h.id, h));
        const dedupedHw = Array.from(uniqueHwMap.values());

        if (profile?.mode === 'student' && profile.studentName) {
          const hwSet = new Set(progress ? progress.completedHomeworkIds : []);
          setHomeworkList(dedupedHw.map((h) => ({ ...h, completed: hwSet.has(h.id) })));
        } else {
          const guestProgress = getGuestProgress();
          const hwSet = new Set(guestProgress.completedHomeworkIds);
          setHomeworkList(dedupedHw.map((h) => ({ ...h, completed: hwSet.has(h.id) })));
        }
      }

      if (isSupabaseConfigured) {
        setSupabaseStatus('connected');
      }

      if (showNotification) {
        setToastMsg('✨ تم مزامنة وتحديث جميع البيانات بين الأجهزة والسحابة بنجاح!');
        setTimeout(() => setToastMsg(null), 4000);
      }
    } catch (err) {
      console.error('Data synchronization error:', err);
      if (isSupabaseConfigured) setSupabaseStatus('connected');
    } finally {
      setIsSyncing(false);
    }
  }, []);

  // Initial Data Initialization & Realtime Subscriptions & Focus auto-sync
  useEffect(() => {
    let isMounted = true;

    refreshAllData(false);

    // Re-sync whenever window gets focus or tab becomes active
    const handleFocusSync = () => {
      if (document.visibilityState === 'visible') {
        refreshAllData(false);
      }
    };

    window.addEventListener('focus', handleFocusSync);
    document.addEventListener('visibilitychange', handleFocusSync);

    // Auto periodic sync every 10 seconds to catch edits made on mobile or laptop in background
    const syncInterval = setInterval(() => {
      if (document.visibilityState === 'visible') {
        refreshAllData(false);
      }
    }, 10000);

    // Setup Supabase Realtime Channels only if configured
    if (!isSupabaseConfigured) {
      return () => {
        isMounted = false;
        window.removeEventListener('focus', handleFocusSync);
        document.removeEventListener('visibilitychange', handleFocusSync);
        clearInterval(syncInterval);
      };
    }

    const channel = supabase
      .channel('planner-realtime-sync')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'classwork' }, (payload) => {
        if (payload.eventType === 'INSERT') {
          const newCw = rowToClasswork(payload.new as ClassworkRow);
          setClassworkList((prev) => [newCw, ...prev.filter((c) => c.id !== newCw.id)]);
        } else if (payload.eventType === 'UPDATE') {
          const updatedCw = rowToClasswork(payload.new as ClassworkRow);
          setClassworkList((prev) =>
            prev.map((c) => (c.id === updatedCw.id ? { ...c, ...updatedCw, completed: c.completed } : c))
          );
        } else if (payload.eventType === 'DELETE') {
          const oldId = payload.old.id;
          setClassworkList((prev) => prev.filter((c) => c.id !== oldId));
        }
      })
      .on('postgres_changes', { event: '*', schema: 'public', table: 'homework' }, (payload) => {
        if (payload.eventType === 'INSERT') {
          const newHw = rowToHomework(payload.new as HomeworkRow);
          setHomeworkList((prev) => [newHw, ...prev.filter((h) => h.id !== newHw.id)]);
        } else if (payload.eventType === 'UPDATE') {
          const updatedHw = rowToHomework(payload.new as HomeworkRow);
          setHomeworkList((prev) =>
            prev.map((h) => (h.id === updatedHw.id ? { ...h, ...updatedHw, completed: h.completed } : h))
          );
        } else if (payload.eventType === 'DELETE') {
          const oldId = payload.old.id;
          setHomeworkList((prev) => prev.filter((h) => h.id !== oldId));
        }
      })
      .subscribe();

    return () => {
      isMounted = false;
      window.removeEventListener('focus', handleFocusSync);
      document.removeEventListener('visibilitychange', handleFocusSync);
      clearInterval(syncInterval);
      supabase.removeChannel(channel);
    };
  }, [refreshAllData]);

  const showToast = (msg: string) => {
    setToastMsg(msg);
    setTimeout(() => setToastMsg(null), 4500);
  };

  // Handle switching user profile (Student vs Guest)
  const handleSelectProfile = async (newProfile: UserProfile) => {
    setUserProfile(newProfile);
    setActiveUserProfile(newProfile);

    if (newProfile.classId && newProfile.classId !== currentClass) {
      setCurrentClass(newProfile.classId);
    }

    if (newProfile.mode === 'student' && newProfile.studentName) {
      let progress = getStudentProgress(newProfile.studentName);
      if (isSupabaseConfigured) {
        try {
          progress = await syncStudentProgressFromDb(newProfile.studentName);
        } catch (e) {
          console.warn('Could not sync student progress on login:', e);
        }
      }
      const cwSet = new Set(progress.completedClassworkIds);
      const hwSet = new Set(progress.completedHomeworkIds);

      setClassworkList((prev) =>
        prev.map((c) => ({
          ...c,
          completed: cwSet.has(c.id),
        }))
      );
      setHomeworkList((prev) =>
        prev.map((h) => ({
          ...h,
          completed: hwSet.has(h.id),
        }))
      );
      showToast(`مرحباً يا ${newProfile.studentName}! تم تحميل إنجازاتك وواجباتك المحفوظة.`);
    } else {
      // Guest mode: Restore guest progress
      const guestProgress = getGuestProgress();
      const cwSet = new Set(guestProgress.completedClassworkIds);
      const hwSet = new Set(guestProgress.completedHomeworkIds);
      setClassworkList((prev) => prev.map((c) => ({ ...c, completed: cwSet.has(c.id) })));
      setHomeworkList((prev) => prev.map((h) => ({ ...h, completed: hwSet.has(h.id) })));
      showToast('تم التبديل لوضع الزائر (تُحفظ علامات الإنجاز على هذا الجهاز).');
    }
  };

  // Classwork handlers with Supabase CRUD
  const handleToggleClasswork = async (id: string) => {
    const currentItem = classworkList.find((c) => c.id === id);
    const nextCompleted = currentItem ? !currentItem.completed : true;

    // 1. Synchronous state update for immediate UI feedback
    setClassworkList((prev) =>
      prev.map((c) => (c.id === id ? { ...c, completed: nextCompleted } : c))
    );

    // 2. Persist progress in student or guest storage
    if (userProfile?.mode === 'student' && userProfile.studentName) {
      const currentProgress = getStudentProgress(userProfile.studentName);
      const cwSet = new Set(currentProgress.completedClassworkIds);
      if (nextCompleted) {
        cwSet.add(id);
      } else {
        cwSet.delete(id);
      }
      const newCwIds = Array.from(cwSet);
      const hwIds = homeworkList.filter((h) => h.completed).map((h) => h.id);
      saveStudentProgress(userProfile.studentName, newCwIds, hwIds, currentClass);
    } else {
      const guestProgress = getGuestProgress();
      const cwSet = new Set(guestProgress.completedClassworkIds);
      if (nextCompleted) {
        cwSet.add(id);
      } else {
        cwSet.delete(id);
      }
      saveGuestProgress(
        Array.from(cwSet),
        homeworkList.filter((h) => h.completed).map((h) => h.id)
      );
    }

    if (isSupabaseConfigured) {
      try {
        await updateClassworkCompletion(id, nextCompleted);
      } catch (e) {
        console.warn('Could not update classwork completion in Supabase:', e);
      }
    }
  };

  const handleSaveClasswork = async (entry: ClassworkEntry) => {
    try {
      await removeDeletedPlannerItemId(entry.id);
    } catch {}
    setClassworkList((prev) => {
      const idx = prev.findIndex((c) => c.id === entry.id);
      let next: ClassworkEntry[];
      if (idx >= 0) {
        next = [...prev];
        next[idx] = entry;
      } else {
        next = [entry, ...prev];
      }
      if (userProfile?.mode === 'student' && userProfile.studentName) {
        const completedCwIds = next.filter((c) => c.completed).map((c) => c.id);
        const completedHwIds = homeworkList.filter((h) => h.completed).map((h) => h.id);
        saveStudentProgress(userProfile.studentName, completedCwIds, completedHwIds, currentClass);
      }
      return next;
    });

    try {
      await upsertClasswork(entry);
    } catch (e) {
      console.error('Error saving classwork:', e);
    }
    showToast('☁️ تم حفظ الحصة ورفعها إلى السحابة بنجاح!');
  };

  // Homework handlers with Supabase CRUD
  const handleToggleHomework = async (id: string) => {
    const currentItem = homeworkList.find((h) => h.id === id);
    const nextCompleted = currentItem ? !currentItem.completed : true;

    // 1. Synchronous state update for immediate UI feedback
    setHomeworkList((prev) =>
      prev.map((h) => (h.id === id ? { ...h, completed: nextCompleted } : h))
    );

    // 2. Persist progress in student or guest storage
    if (userProfile?.mode === 'student' && userProfile.studentName) {
      const currentProgress = getStudentProgress(userProfile.studentName);
      const hwSet = new Set(currentProgress.completedHomeworkIds);
      if (nextCompleted) {
        hwSet.add(id);
      } else {
        hwSet.delete(id);
      }
      const newHwIds = Array.from(hwSet);
      const cwIds = classworkList.filter((c) => c.completed).map((c) => c.id);
      saveStudentProgress(userProfile.studentName, cwIds, newHwIds, currentClass);
    } else {
      const guestProgress = getGuestProgress();
      const hwSet = new Set(guestProgress.completedHomeworkIds);
      if (nextCompleted) {
        hwSet.add(id);
      } else {
        hwSet.delete(id);
      }
      saveGuestProgress(
        classworkList.filter((c) => c.completed).map((c) => c.id),
        Array.from(hwSet)
      );
    }

    try {
      await updateHomeworkCompletion(id, nextCompleted);
    } catch (e) {
      console.warn('Could not update homework completion:', e);
    }
  };

  const handleAddHomework = async (entry: HomeworkEntry) => {
    try {
      await removeDeletedPlannerItemId(entry.id);
    } catch {}
    setHomeworkList((prev) => {
      const idx = prev.findIndex((h) => h.id === entry.id);
      let next: HomeworkEntry[];
      if (idx >= 0) {
        next = [...prev];
        next[idx] = { ...prev[idx], ...entry };
      } else {
        next = [entry, ...prev];
      }
      if (userProfile?.mode === 'student' && userProfile.studentName) {
        const completedCwIds = classworkList.filter((c) => c.completed).map((c) => c.id);
        const completedHwIds = next.filter((h) => h.completed).map((h) => h.id);
        saveStudentProgress(userProfile.studentName, completedCwIds, completedHwIds, currentClass);
      }
      return next;
    });

    try {
      await upsertHomework(entry);
    } catch (e) {
      console.error('Error adding homework:', e);
    }
    showToast('☁️ تم حفظ الواجب ورفعه إلى السحابة بنجاح!');
  };

  const handleDeleteHomework = async (id: string) => {
    setHomeworkList((prev) => {
      const next = prev.filter((h) => h.id !== id);
      if (userProfile?.mode === 'student' && userProfile.studentName) {
        const currentProgress = getStudentProgress(userProfile.studentName);
        const hwSet = new Set(currentProgress.completedHomeworkIds);
        hwSet.delete(id);
        const cwIds = classworkList.filter((c) => c.completed).map((c) => c.id);
        saveStudentProgress(userProfile.studentName, cwIds, Array.from(hwSet), currentClass);
      } else {
        const guestProgress = getGuestProgress();
        const hwSet = new Set(guestProgress.completedHomeworkIds);
        hwSet.delete(id);
        saveGuestProgress(guestProgress.completedClassworkIds, Array.from(hwSet));
      }
      return next;
    });

    try {
      await deleteHomework(id);
      await fetch('/api/planner-data/delete', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id, type: 'homework' }),
      });
    } catch (e) {
      console.error('Error deleting homework:', e);
    }
    showToast('☁️ تم حذف الواجب وتحديث السحابة بنجاح!');
  };

  const handleApplyWeeklyPlan = async (
    newClasswork: ClassworkEntry[],
    newHomework: HomeworkEntry[],
    mode: 'merge' | 'replace' = 'replace'
  ) => {
    if (mode === 'replace') {
      const cwKeys = new Set(newClasswork.map((c) => `${c.block || 1}-${c.week || 1}-${c.classId}-${c.subject}`));
      const hwKeys = new Set(newHomework.map((h) => `${h.block || 1}-${h.week || 1}-${h.classId}-${h.subject}`));

      setClassworkList((prev) => {
        const updated = [
          ...newClasswork,
          ...prev.filter((c) => !cwKeys.has(`${c.block || 1}-${c.week || 1}-${c.classId}-${c.subject}`)),
        ];
        saveLocalCustomClasswork(updated, 'replace');
        return updated;
      });
      setHomeworkList((prev) => {
        const updated = [
          ...newHomework,
          ...prev.filter((h) => !hwKeys.has(`${h.block || 1}-${h.week || 1}-${h.classId}-${h.subject}`)),
        ];
        saveLocalCustomHomework(updated, 'replace');
        return updated;
      });
    } else {
      setClassworkList((prev) => {
        const updated = [...newClasswork, ...prev];
        saveLocalCustomClasswork(updated, 'merge');
        return updated;
      });
      setHomeworkList((prev) => {
        const updated = [...newHomework, ...prev];
        saveLocalCustomHomework(updated, 'merge');
        return updated;
      });
    }

    if (isSupabaseConfigured) {
      try {
        await Promise.all([
          bulkInsertClasswork(newClasswork, mode),
          bulkInsertHomework(newHomework, mode),
        ]);
      } catch (e) {
        console.error('Error saving weekly plan to Supabase:', e);
      }
    }
    showToast(
      mode === 'replace'
        ? 'تم استبدال الخطة السابقة بالخطة الجديدة وتحديث البيانات بنجاح!'
        : 'تم استيراد الخطة الأسبوعية ودمجها بنجاح!'
    );
  };

  // Reset to sample plan
  const handleResetToDefaults = async () => {
    if (confirm('هل تريد استعادة الخطة الأصلية ومزامنتها مباشرة مع Supabase؟')) {
      setClassworkList(INITIAL_CLASSWORK.map((c) => ({ ...c, completed: false })));
      setHomeworkList(INITIAL_HOMEWORK.map((h) => ({ ...h, completed: false })));

      if (userProfile?.mode === 'student' && userProfile.studentName) {
        saveStudentProgress(userProfile.studentName, [], [], currentClass);
      }

      if (isSupabaseConfigured) {
        try {
          await Promise.all([
            bulkInsertClasswork(INITIAL_CLASSWORK),
            bulkInsertHomework(INITIAL_HOMEWORK),
          ]);
        } catch (e) {
          console.error('Failed to sync default data to Supabase:', e);
        }
      }
      showToast('تمت استعادة الخطة الأولية وتحديث Supabase.');
    }
  };

  const handleDeleteClasswork = async (id: string) => {
    setClassworkList((prev) => prev.filter((c) => c.id !== id));
    try {
      await deleteClasswork(id);
      await fetch('/api/planner-data/delete', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id, type: 'classwork' }),
      });
    } catch (e) {
      console.error('Error deleting classwork:', e);
    }
    showToast('☁️ تم حذف الحصة وتحديث السحابة بنجاح!');
  };

  const handleSaveInteractiveItem = async (type: 'classwork' | 'homework' | 'tomorrow', data: any) => {
    if (data.classId && (data.classId as any) !== 'ALL') {
      setCurrentClass(data.classId as ClassId);
    }
    if (data.block) {
      setCurrentBlock(Number(data.block));
    }
    if (data.week) {
      setCurrentWeek(Number(data.week));
    }

    if (type === 'classwork') {
      setActiveTab('classwork');
      await handleSaveClasswork(data);
    } else if (type === 'homework') {
      setActiveTab('homework');
      await handleAddHomework(data);
    } else if (type === 'tomorrow') {
      setActiveTab('tomorrow');

      const block = data.block || currentBlock;
      const week = data.week || currentWeek;

      const classesToAdd: ClassId[] =
        (data.classId as any) === 'ALL'
          ? ['KG1A', 'KG1B', 'KG1C', 'KG1D', 'KG1E']
          : [data.classId || currentClass];

      const entriesToSave: TomorrowSpecialNote[] = classesToAdd.map((cls) => ({
        ...data,
        id:
          (data.classId as any) === 'ALL'
            ? `${data.id || `tomorrow-note-${Date.now()}`}-${cls}`
            : data.id || `tomorrow-note-${Date.now()}`,
        classId: cls,
        isCustom: true,
      }));

      await saveTomorrowNotes(block, week, entriesToSave, 'merge');

      // If note is a quiz, dictation, test, exam, or evaluation -> automatically add to Homework as urgent item for studying
      const fullText = `${data.note || ''} ${data.arabicNote || ''} ${data.subject || ''} ${data.bagItem || ''}`;
      const isQuizOrDictation =
        data.isQuiz ||
        data.categoryType === 'quiz' ||
        /quiz|test|dictation|إملاء|تسميع|اختبار|امتحان|كويز|تقييم|exam|assessment/i.test(fullText);

      if (isQuizOrDictation) {
        for (const cls of classesToAdd) {
          const hwEntry: HomeworkEntry = {
            id: (data.classId as any) === 'ALL' ? `tn-hw-${data.id || Date.now()}-${cls}` : `tn-hw-${data.id || Date.now()}`,
            classId: cls,
            assignedDay: data.targetDay || selectedDay,
            dueDay: data.targetDay || selectedDay,
            subject: data.subject || 'General',
            task: data.arabicNote || data.note || 'اختبار / إملاء',
            details: data.bagItem ? `مذاكرة للاختبار/الإملاء (المطلوب: ${data.bagItem})` : 'تنبيه مذاكرة وتجهيز للاختبار أو الإملاء',
            completed: false,
            priority: 'urgent',
            block,
            week,
            linkUrl: data.linkUrl || undefined,
          };
          await handleAddHomework(hwEntry);
        }
      }

      notifyTomorrowNotesListeners();
      showToast('☁️ تم حفظ التنبيه ورفعه إلى السحابة بنجاح!');
    }
    setIsEditorModalOpen(false);
  };

  const handleDeleteInteractiveItem = async (type: 'classwork' | 'homework' | 'tomorrow', id: string) => {
    if (type === 'classwork') {
      await handleDeleteClasswork(id);
    } else if (type === 'homework') {
      await handleDeleteHomework(id);
    } else if (type === 'tomorrow') {
      try {
        await saveDeletedTomorrowNoteId(id);

        let linkedHwId: string | null = null;
        if (id.startsWith('linked-hw-due-')) {
          linkedHwId = id.replace('linked-hw-due-', '');
        } else if (id.startsWith('linked-hw-')) {
          linkedHwId = id.replace('linked-hw-', '');
        }
        if (linkedHwId) {
          await saveDeletedTomorrowNoteId(linkedHwId);
        }

        // Only delete from tomorrowNotes persistence, never delete the underlying homework or classwork
        await fetch('/api/planner-data/delete', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ id, ids: linkedHwId ? [id, linkedHwId] : [id], type: 'tomorrowNotes' }),
        }).catch(() => {});
      } catch (e) {
        console.error('Error deleting tomorrow note:', e);
      }

      notifyTomorrowNotesListeners();
      showToast('☁️ تم حذف التنبيه وتحديث السحابة بنجاح!');
    }
  };

  const handleOpenAddModal = (type: 'classwork' | 'homework' | 'tomorrow', prefilledData?: any) => {
    setEditorItemType(type);
    setEditorModalMode('add');
    setSelectedEditorItem(prefilledData || null);
    setIsEditorModalOpen(true);
  };

  const handleOpenEditModal = (type: 'classwork' | 'homework' | 'tomorrow', item: any) => {
    setEditorItemType(type);
    setEditorModalMode('edit');
    setSelectedEditorItem(item);
    setIsEditorModalOpen(true);
  };

  const handlePrint = () => {
    window.print();
  };

  // Calculate pending homework count for current class
  const pendingHomeworkCount = homeworkList.filter(
    (h) => h.classId === currentClass && !h.completed
  ).length;

  return (
    <div className="min-h-screen bg-slate-100/70 text-slate-800 flex flex-col font-sans antialiased selection:bg-indigo-500 selection:text-white">
      {/* Interactive Navigation Bar */}
      <Navbar
        currentClass={currentClass}
        onSelectClass={(c) => {
          setCurrentClass(c);
          appStorage.setItem(STORAGE_KEYS.CLASS, c);
          if (isSupabaseConfigured) {
            savePlannerSetting('current_class', c).catch(() => {});
          }
        }}
        currentBlock={currentBlock}
        onSelectBlock={(b) => {
          setCurrentBlock(b);
          appStorage.setItem('nile_planner_block', String(b));
          if (isSupabaseConfigured) {
            savePlannerSetting('current_block', String(b)).catch(() => {});
          }
          showToast(`تم الانتقال إلى توبيك ${b}`);
        }}
        currentWeek={currentWeek}
        onSelectWeek={(w) => {
          setCurrentWeek(w);
          appStorage.setItem(STORAGE_KEYS.WEEK, String(w));
          if (isSupabaseConfigured) {
            savePlannerSetting('current_week', String(w)).catch(() => {});
          }
          showToast(`تم الانتقال إلى الأسبوع ${w}`);
        }}
        activeTab={activeTab}
        onSelectTab={setActiveTab}
        selectedDay={selectedDay}
        onSelectDay={(d) => {
          setSelectedDay(d);
          if (isSupabaseConfigured) {
            savePlannerSetting('selected_day', d).catch(() => {});
          }
        }}
        onPrint={handlePrint}
        pendingHomeworkCount={pendingHomeworkCount}
        userProfile={userProfile}
        onOpenProfileModal={() => setIsAuthModalOpen(true)}
        onOpenAdminAuth={() => setIsAdminAuthOpen(true)}
        onOpenMaterials={() => setIsMaterialsModalOpen(true)}
        onOpenSupabaseConfig={() => setIsSupabaseConfigOpen(true)}
        supabaseStatus={supabaseStatus}
        onSyncNow={() => refreshAllData(true)}
        isSyncing={isSyncing}
      />

      {/* Main Container */}
      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-6 print:p-0">
        {/* Toast Notification */}
        {toastMsg && (
          <div className="mb-4 p-3.5 bg-emerald-700 text-white text-xs font-semibold rounded-xl shadow-md flex items-center justify-between gap-3 animate-fade-in print:hidden">
            <div className="flex items-center gap-2">
              <Sparkles className="w-4 h-4 text-emerald-200" />
              <span>{toastMsg}</span>
            </div>
            <button
              onClick={() => setToastMsg(null)}
              className="text-emerald-200 hover:text-white text-xs font-bold"
            >
              Dismiss
            </button>
          </div>
        )}

        {/* Dynamic View rendering based on activeTab */}
        <div className="print:hidden">
          {activeTab === 'classwork' && (
            <ClassworkView
              currentClass={currentClass}
              selectedDay={selectedDay}
              classworkList={classworkList}
              currentBlock={currentBlock}
              currentWeek={currentWeek}
              onToggleClasswork={handleToggleClasswork}
              onSaveClasswork={handleSaveClasswork}
              isAdminEditMode={isAdminEditMode}
              onAddClasswork={(prefilledData) => handleOpenAddModal('classwork', prefilledData)}
              onEditClasswork={(entry) => handleOpenEditModal('classwork', entry)}
              onDeleteClasswork={(id) => handleDeleteInteractiveItem('classwork', id)}
            />
          )}

          {activeTab === 'homework' && (
            <HomeworkView
              currentClass={currentClass}
              selectedDay={selectedDay}
              homeworkList={homeworkList}
              classworkList={classworkList}
              currentBlock={currentBlock}
              currentWeek={currentWeek}
              onToggleHomework={handleToggleHomework}
              isAdminEditMode={isAdminEditMode}
              onAddHomework={() => handleOpenAddModal('homework')}
              onEditHomework={(entry) => handleOpenEditModal('homework', entry)}
              onDeleteHomework={(id) => handleDeleteInteractiveItem('homework', id)}
            />
          )}

          {activeTab === 'tomorrow' && (
            <TomorrowView
              currentClass={currentClass}
              selectedDay={selectedDay}
              currentBlock={currentBlock}
              currentWeek={currentWeek}
              homeworkList={homeworkList}
              classworkList={classworkList}
              isAdminEditMode={isAdminEditMode}
              onAddTomorrowNote={(prefilled) => handleOpenAddModal('tomorrow', prefilled || { targetDay: NEXT_SCHOOL_DAY[selectedDay] || 'Sunday' })}
              onEditTomorrowNote={(entry) => handleOpenEditModal('tomorrow', entry)}
              onDeleteTomorrowNote={(id) => handleDeleteInteractiveItem('tomorrow', id)}
            />
          )}

          {activeTab === 'timetable' && (
            <TimetableGrid
              currentClass={currentClass}
              selectedDay={selectedDay}
              onSelectDay={(d) => {
                setSelectedDay(d);
                if (isSupabaseConfigured) {
                  savePlannerSetting('selected_day', d).catch(() => {});
                }
                setActiveTab('classwork');
              }}
            />
          )}
        </div>

        {/* Clean Print Layout for parents and students */}
        <PrintSheet
          currentClass={currentClass}
          selectedDay={selectedDay}
          classworkList={classworkList}
          homeworkList={homeworkList}
        />
      </main>

      {/* Bottom Footer with quick stats and reset */}
      <footer className="bg-white border-t border-slate-200 py-4 px-4 sm:px-6 lg:px-8 text-xs text-slate-500 print:hidden mt-auto">
        <div className="max-w-7xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <span className="font-bold text-slate-700">{SCHOOL_NAME}</span>
            <span>•</span>
            <span>{SCHOOL_BRANCH} Branch</span>
            <span>•</span>
            <span>Classes: A, B, C, D, E (KG 1)</span>
          </div>

          <div className="flex items-center gap-4">
            {/* Supabase connection indicator */}
            {supabaseStatus === 'connected' && (
              <button
                type="button"
                onClick={() => setIsSupabaseConfigOpen(true)}
                className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200 hover:bg-emerald-100 transition-colors cursor-pointer"
                title="قاعدة بيانات Supabase السحابية متصلة - انقر لتعديل الإعدادات"
              >
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                <Database className="w-3.5 h-3.5 text-emerald-600" />
                <span>Supabase متصل</span>
              </button>
            )}
            {supabaseStatus === 'connecting' && (
              <button
                type="button"
                onClick={() => setIsSupabaseConfigOpen(true)}
                className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold bg-amber-50 text-amber-700 border border-amber-200 hover:bg-amber-100 transition-colors cursor-pointer"
              >
                <Loader2 className="w-3.5 h-3.5 animate-spin text-amber-600" />
                <span>جاري الاتصال بـ Supabase...</span>
              </button>
            )}
            {supabaseStatus === 'unconfigured' && (
              <button
                type="button"
                onClick={() => setIsSupabaseConfigOpen(true)}
                className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-bold bg-slate-100 hover:bg-slate-200 text-slate-700 border border-slate-300 transition-colors cursor-pointer shadow-2xs"
                title="انقر لإدخال وحفظ رابط ومفتاح Supabase بسهولة"
              >
                <Database className="w-3.5 h-3.5 text-slate-600" />
                <span>إعداد وحفظ Supabase</span>
              </button>
            )}
            {supabaseStatus === 'error' && (
              <button
                type="button"
                onClick={() => setIsSupabaseConfigOpen(true)}
                className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold bg-rose-50 hover:bg-rose-100 text-rose-700 border border-rose-200 transition-colors cursor-pointer"
                title="انقر لتصحيح إعدادات ومفاتيح الربط"
              >
                <AlertCircle className="w-3.5 h-3.5 text-rose-600" />
                <span>خطأ في اتصال Supabase (تعديل)</span>
              </button>
            )}

            <button
              onClick={() => setIsPlanModalOpen(true)}
              className="text-indigo-600 hover:text-indigo-800 font-semibold inline-flex items-center gap-1.5 transition-colors"
            >
              <Sparkles className="w-3.5 h-3.5" />
              Smart Plan Classifier
            </button>
            <button
              onClick={handleResetToDefaults}
              className="text-slate-500 hover:text-slate-800 inline-flex items-center gap-1"
            >
              <RotateCcw className="w-3 h-3" />
              Reset Defaults
            </button>
          </div>
        </div>
      </footer>

      {/* Weekly Plan Smart Classifier Modal */}
      <WeeklyPlanModal
        isOpen={isPlanModalOpen}
        onClose={() => setIsPlanModalOpen(false)}
        currentClass={currentClass}
        currentBlock={currentBlock}
        currentWeek={currentWeek}
        onApplyPlan={handleApplyWeeklyPlan}
      />

      {/* Student Profile / Guest Login Modal */}
      <StudentAuthModal
        isOpen={isAuthModalOpen}
        onClose={() => setIsAuthModalOpen(false)}
        currentProfile={userProfile}
        currentClass={currentClass}
        onSelectProfile={handleSelectProfile}
      />

      {/* Admin Password Authentication Modal */}
      <AdminAuthModal
        isOpen={isAdminAuthOpen}
        onClose={() => setIsAdminAuthOpen(false)}
        onSuccess={() => {
          setIsAdminAuthOpen(false);
          setIsAdminDashboardOpen(true);
        }}
      />

      {/* Admin Dashboard / Settings Panel (Placeholder for custom settings) */}
      <AdminDashboardModal
        isOpen={isAdminDashboardOpen}
        onClose={() => setIsAdminDashboardOpen(false)}
        isAdminEditMode={isAdminEditMode}
        onToggleAdminEditMode={setIsAdminEditMode}
        onPlanUpdated={async (updatedBlock?: number, updatedWeek?: number) => {
          try {
            if (updatedBlock) {
              setCurrentBlock(updatedBlock);
              appStorage.setItem('nile_planner_block', String(updatedBlock));
            }
            if (updatedWeek) {
              setCurrentWeek(updatedWeek);
              appStorage.setItem(STORAGE_KEYS.WEEK, String(updatedWeek));
            }
            const [cwData, hwData] = await Promise.all([
              fetchAllClasswork(),
              fetchAllHomework(),
            ]);
            if (cwData && cwData.length > 0) {
              setClassworkList(cwData);
            }
            if (hwData && hwData.length > 0) {
              setHomeworkList(hwData);
            }
            notifyTomorrowNotesListeners();
            setToastMsg('تم تحديث الخطة الأسبوعية والحصص والواجبات بنجاح!');
            setTimeout(() => setToastMsg(null), 4000);
          } catch (err) {
            console.error('Failed to reload after plan update:', err);
          }
        }}
      />

      {/* Unified Direct Interactive Editor Modal */}
      <InteractiveEditorModal
        isOpen={isEditorModalOpen}
        onClose={() => setIsEditorModalOpen(false)}
        mode={editorModalMode}
        itemType={editorItemType}
        initialData={selectedEditorItem}
        currentClass={currentClass}
        currentBlock={currentBlock}
        currentWeek={currentWeek}
        selectedDay={selectedDay}
        onSave={handleSaveInteractiveItem}
      />

      {/* Materials Modal */}
      <MaterialsModal
        isOpen={isMaterialsModalOpen}
        onClose={() => setIsMaterialsModalOpen(false)}
        currentClass={currentClass}
        currentBlock={currentBlock}
        currentWeek={currentWeek}
      />

      {/* Guaranteed In-App PDF Viewer Modal */}
      <PdfViewerModal />

      {/* Supabase Cloud Connection & Persistent Credentials Modal */}
      <SupabaseConfigModal
        isOpen={isSupabaseConfigOpen}
        onClose={() => setIsSupabaseConfigOpen(false)}
        onSaved={async () => {
          setSupabaseStatus('connecting');
          try {
            const [cwData, hwData] = await Promise.all([
              fetchAllClasswork(),
              fetchAllHomework(),
            ]);
            if (cwData && cwData.length > 0) setClassworkList(cwData);
            if (hwData && hwData.length > 0) setHomeworkList(hwData);
            setSupabaseStatus('connected');
            showToast('تم حفظ إعدادات Supabase وتحديث البيانات بنجاح!');
          } catch {
            setSupabaseStatus('error');
          }
        }}
      />
      {isAdminEditMode && (
        <div className="fixed bottom-6 right-6 z-50 print:hidden">
          <button
            onClick={() => {
              setIsAdminEditMode(false);
              showToast('تم الخروج من وضع التعديل المباشر والعودة كزائر 📋');
            }}
            className="bg-rose-600 hover:bg-rose-700 active:scale-95 text-white px-5 py-3 rounded-full font-black text-xs sm:text-sm shadow-xl flex items-center gap-2 border border-rose-500 transition-all cursor-pointer animate-bounce hover:animate-none"
            title="الخروج من التفعيل المباشر والعودة لوضع الزائر"
          >
            <Shield className="w-4 h-4 text-white animate-pulse" />
            <span>الخروج من وضع التعديل المباشر ❌</span>
          </button>
        </div>
      )}
    </div>
  );
}
