import React, { useState, useEffect } from 'react';
import { ClassId, SchoolDay, ClassworkEntry, HomeworkEntry, UserProfile, PeriodSlot } from './types';
import { INITIAL_CLASSWORK, INITIAL_HOMEWORK, SPECIAL_TEACHER_NOTES, TomorrowSpecialNote } from './data/defaultWeeklyPlan';
import { WEEK2_CLASSWORK, ALL_LINK_AND_WEEK2_HOMEWORK, WEEK2_SPECIAL_NOTES } from './data/week2Plan';
import { SCHOOL_DAYS, SCHOOL_NAME, SCHOOL_BRANCH } from './data/timetables';
import {
  getStoredTimetables,
  saveAllStoredTimetables,
  clearAllStoredTimetables,
} from './utils/timetableStorage';
import { clearAllMaterialsStorage, syncMaterialsFromCloud } from './utils/materialsStorage';
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
import { LiveEditItemModal, LiveEditModeType } from './components/LiveEditItemModal';
import {
  getActiveUserProfile,
  setActiveUserProfile,
  getStudentProgress,
  saveStudentProgress,
} from './utils/studentStorage';
import { Sparkles, Trash2, RotateCcw, Database, Cloud, CheckCircle, Pencil } from 'lucide-react';
import { isSupabaseConfigured, supabase } from './lib/supabase';
import {
  seedInitialDataIfNeeded,
  supabaseFetchClasswork,
  supabaseUpsertClasswork,
  supabaseDeleteClasswork,
  supabaseBatchInsertClasswork,
  supabaseClearAllClasswork,
  supabaseFetchHomework,
  supabaseUpsertHomework,
  supabaseDeleteHomework,
  supabaseBatchInsertHomework,
  supabaseClearAllHomework,
  supabaseFetchTimetables,
  supabaseSaveAllTimetables,
  supabaseClearAllTimetables,
  supabaseFetchStudentProgress,
  supabaseSaveStudentProgress,
  supabaseFetchPlannerSettings,
  supabaseSavePlannerSettings,
  supabaseFetchTomorrowNotes,
  supabaseSaveTomorrowNotes,
  supabaseDeleteClassworkForScope,
  supabaseDeleteHomeworkForScope,
  supabaseDeleteTomorrowNotesForScope,
} from './services/supabaseService';

const STORAGE_KEYS = {
  CLASS: 'nile_planner_current_class_v3',
  DAY: 'nile_planner_selected_day_v3',
  WEEK: 'nile_planner_current_week_v3',
  CUSTOM_CLASSWORK: 'nile_planner_custom_classwork_v4',
  CUSTOM_HOMEWORK: 'nile_planner_custom_homework_v3',
};

function getStoredCustomClasswork(profile: UserProfile | null): ClassworkEntry[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEYS.CUSTOM_CLASSWORK);
    if (raw) {
      const list: ClassworkEntry[] = JSON.parse(raw);
      if (Array.isArray(list) && list.length > 0 && list.some((c) => c.classId === 'KG1A')) {
        const hasWeek2Arabic = list.some((c) => (c.week || 1) === 2 && c.subject === 'Arabic');
        const fullList = hasWeek2Arabic ? list : [...list.filter((c) => (c.week || 1) !== 2), ...WEEK2_CLASSWORK];
        if (!hasWeek2Arabic && WEEK2_CLASSWORK.length > 0) {
          localStorage.setItem(STORAGE_KEYS.CUSTOM_CLASSWORK, JSON.stringify(fullList));
        }
        if (profile?.mode === 'student' && profile.studentName) {
          const progress = getStudentProgress(profile.studentName);
          const set = new Set(progress.completedClassworkIds);
          return fullList.map((c) => ({
            ...c,
            completed: set.has(c.id),
          }));
        }
        return fullList.map((c) => ({ ...c, completed: false }));
      }
    }
  } catch (e) {
    console.error('Failed to load custom classwork:', e);
  }
  return INITIAL_CLASSWORK;
}

function getStoredCustomHomework(profile: UserProfile | null): HomeworkEntry[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEYS.CUSTOM_HOMEWORK);
    if (raw) {
      const list: HomeworkEntry[] = JSON.parse(raw);
      if (Array.isArray(list) && list.length > 0 && list.some((h) => h.classId === 'KG1A')) {
        const hasWeek2Arabic = list.some((h) => (h.week || 1) === 2 && h.subject === 'Arabic');
        const fullList = hasWeek2Arabic ? list : [...list.filter((h) => (h.week || 1) !== 2), ...ALL_LINK_AND_WEEK2_HOMEWORK];
        if (!hasWeek2Arabic && ALL_LINK_AND_WEEK2_HOMEWORK.length > 0) {
          localStorage.setItem(STORAGE_KEYS.CUSTOM_HOMEWORK, JSON.stringify(fullList));
        }
        if (profile?.mode === 'student' && profile.studentName) {
          const progress = getStudentProgress(profile.studentName);
          const set = new Set(progress.completedHomeworkIds);
          return fullList.map((h) => ({
            ...h,
            completed: set.has(h.id),
          }));
        }
        return fullList.map((h) => ({ ...h, completed: false }));
      }
    }
  } catch (e) {
    console.error('Failed to load custom homework:', e);
  }
  return INITIAL_HOMEWORK;
}

export default function App() {
  // Active User Profile (Guest vs Student)
  const [userProfile, setUserProfile] = useState<UserProfile | null>(() => {
    return getActiveUserProfile();
  });

  const [isAuthModalOpen, setIsAuthModalOpen] = useState<boolean>(() => {
    return getActiveUserProfile() === null;
  });

  // Class selection (KG1A, KG1B, KG1C, KG1D, KG1E)
  const [currentClass, setCurrentClass] = useState<ClassId>(() => {
    const profile = getActiveUserProfile();
    if (profile?.classId && ['KG1A', 'KG1B', 'KG1C', 'KG1D', 'KG1E'].includes(profile.classId)) {
      return profile.classId;
    }
    const saved = localStorage.getItem(STORAGE_KEYS.CLASS);
    if (saved && ['KG1A', 'KG1B', 'KG1C', 'KG1D', 'KG1E'].includes(saved)) {
      return saved as ClassId;
    }
    return 'KG1A';
  });

  // Current Topic / Block (1, 2, 3, 4)
  const [currentBlock, setCurrentBlock] = useState<number>(() => {
    const saved = localStorage.getItem('nile_planner_block');
    return saved ? Number(saved) : 1;
  });

  // Current Week (1, 2, 3, 4) - Starts Week 2
  const [currentWeek, setCurrentWeek] = useState<number>(() => {
    const saved = localStorage.getItem(STORAGE_KEYS.WEEK);
    return saved ? Number(saved) : 2;
  });

  // Selected Day (Sunday, Monday, Tuesday, Wednesday, Thursday)
  const [selectedDay, setSelectedDay] = useState<SchoolDay>(() => {
    const saved = localStorage.getItem(STORAGE_KEYS.DAY);
    if (saved && SCHOOL_DAYS.includes(saved as SchoolDay)) {
      return saved as SchoolDay;
    }
    const dayOfWeek = new Date().getDay(); // 0 = Sunday, 1 = Monday, etc.
    const dayMap: Record<number, SchoolDay> = {
      0: 'Sunday',
      1: 'Monday',
      2: 'Tuesday',
      3: 'Wednesday',
      4: 'Thursday',
      5: 'Sunday',
      6: 'Sunday',
    };
    return dayMap[dayOfWeek] || 'Sunday';
  });

  // Active View Tab: 'classwork' | 'homework' | 'tomorrow' | 'timetable'
  const [activeTab, setActiveTab] = useState<'classwork' | 'homework' | 'tomorrow' | 'timetable'>('classwork');

  // Dynamic Timetables state
  const [timetables, setTimetables] = useState<Record<ClassId, Record<SchoolDay, PeriodSlot[]>>>(() => {
    return getStoredTimetables();
  });

  // Classwork state initialized with storage
  const [classworkList, setClassworkList] = useState<ClassworkEntry[]>(() => {
    return getStoredCustomClasswork(getActiveUserProfile());
  });

  // Homework state initialized with storage
  const [homeworkList, setHomeworkList] = useState<HomeworkEntry[]>(() => {
    return getStoredCustomHomework(getActiveUserProfile());
  });

  // Tomorrow Notes state (Teacher notes, supply bag items, Arabic & English notes)
  const [customTomorrowNotes, setCustomTomorrowNotes] = useState<TomorrowSpecialNote[]>(() => {
    try {
      const saved = localStorage.getItem('nile_custom_tomorrow_notes');
      const list = saved ? JSON.parse(saved) : [];
      if (Array.isArray(list)) {
        const hasWeek2Arabic = list.some((n) => n.week === 2 && n.subject === 'Arabic');
        if (hasWeek2Arabic) {
          return list;
        } else {
          const cleanList = list.filter((n) => n.week !== 2);
          const fullList = [...cleanList, ...WEEK2_SPECIAL_NOTES];
          localStorage.setItem('nile_custom_tomorrow_notes', JSON.stringify(fullList));
          return fullList;
        }
      }
      return WEEK2_SPECIAL_NOTES;
    } catch {
      return WEEK2_SPECIAL_NOTES;
    }
  });

  const [isAdmin, setIsAdmin] = useState<boolean>(() => {
    return sessionStorage.getItem('nile_admin_authenticated') === 'true';
  });
  const [isAdminLiveEdit, setIsAdminLiveEdit] = useState<boolean>(() => {
    return localStorage.getItem('nile_admin_live_edit') === 'true';
  });
  const [liveEditModalConfig, setLiveEditModalConfig] = useState<{
    isOpen: boolean;
    type: LiveEditModeType;
    item?: any;
    originalIndex?: number;
  }>({
    isOpen: false,
    type: 'classwork',
  });

  const [toastMsg, setToastMsg] = useState<string | null>(null);
  const [isPlanModalOpen, setIsPlanModalOpen] = useState(false);
  const [isAdminAuthOpen, setIsAdminAuthOpen] = useState(false);
  const [isAdminDashboardOpen, setIsAdminDashboardOpen] = useState(false);
  const [adminDashboardInitialTab, setAdminDashboardInitialTab] = useState<'materials' | 'weekly_plan' | 'supabase'>('materials');
  const [isMaterialsModalOpen, setIsMaterialsModalOpen] = useState(false);
  const [isSupabaseSyncing, setIsSupabaseSyncing] = useState<boolean>(false);
  const [supabaseStatus, setSupabaseStatus] = useState<'connected' | 'offline' | 'checking'>(
    isSupabaseConfigured ? 'checking' : 'offline'
  );

  // Initial load, Auto-seeding and Real-time syncing with Supabase
  useEffect(() => {
    let isMounted = true;

    async function syncFromSupabase() {
      // 1. Sync materials from Cloud (Supabase or server fallback) immediately
      try {
        await syncMaterialsFromCloud();
      } catch (e) {
        console.warn('Initial cloud materials sync warning:', e);
      }

      if (!isSupabaseConfigured) {
        setSupabaseStatus('offline');
        return;
      }

      setIsSupabaseSyncing(true);
      try {
        // 1. Seed initial data if tables are empty
        const seedResult = await seedInitialDataIfNeeded();
        if (seedResult.seeded) {
          console.log('Seeded initial data into Supabase:', seedResult);
        }

        // 2. Fetch classwork
        const remoteCw = await supabaseFetchClasswork();
        if (isMounted) {
          const hasWeek2Arabic = remoteCw.some((c) => (c.week || 1) === 2 && c.subject === 'Arabic');
          if (remoteCw.length > 0 && hasWeek2Arabic) {
            setClassworkList(remoteCw);
            localStorage.setItem(STORAGE_KEYS.CUSTOM_CLASSWORK, JSON.stringify(remoteCw));
          } else {
            const baseCw = remoteCw.length > 0 ? remoteCw : INITIAL_CLASSWORK;
            const cleanCw = baseCw.filter((c) => (c.week || 1) !== 2);
            const fullCw = [...cleanCw, ...WEEK2_CLASSWORK];
            setClassworkList(fullCw);
            localStorage.setItem(STORAGE_KEYS.CUSTOM_CLASSWORK, JSON.stringify(fullCw));
            if (isSupabaseConfigured) {
              supabaseBatchInsertClasswork(fullCw).catch(console.warn);
            }
          }
        }

        // 3. Fetch homework
        const remoteHw = await supabaseFetchHomework();
        if (isMounted) {
          const hasWeek2Arabic = remoteHw.some((h) => (h.week || 1) === 2 && h.subject === 'Arabic');
          if (remoteHw.length > 0 && hasWeek2Arabic) {
            setHomeworkList(remoteHw);
            localStorage.setItem(STORAGE_KEYS.CUSTOM_HOMEWORK, JSON.stringify(remoteHw));
          } else {
            const baseHw = remoteHw.length > 0 ? remoteHw : INITIAL_HOMEWORK;
            const cleanHw = baseHw.filter((h) => (h.week || 1) !== 2);
            const fullHw = [...cleanHw, ...ALL_LINK_AND_WEEK2_HOMEWORK];
            setHomeworkList(fullHw);
            localStorage.setItem(STORAGE_KEYS.CUSTOM_HOMEWORK, JSON.stringify(fullHw));
            if (isSupabaseConfigured) {
              supabaseBatchInsertHomework(fullHw).catch(console.warn);
            }
          }
        }

        // 4. Fetch timetables
        const remoteTt = await supabaseFetchTimetables();
        if (isMounted && remoteTt) {
          setTimetables(remoteTt);
          saveAllStoredTimetables(remoteTt);
        }

        // 5. Fetch planner settings (Active Block & Week)
        const remoteSettings = await supabaseFetchPlannerSettings();
        if (isMounted) {
          if (remoteSettings) {
            if (remoteSettings.currentBlock) setCurrentBlock(remoteSettings.currentBlock);
            if (remoteSettings.currentWeek) {
              const savedWeek = localStorage.getItem(STORAGE_KEYS.WEEK);
              if (savedWeek) {
                setCurrentWeek(Number(savedWeek));
              } else {
                // If database setting is 1 (old week), automatically upgrade it to Week 2 globally
                const finalWeek = remoteSettings.currentWeek === 1 ? 2 : remoteSettings.currentWeek;
                setCurrentWeek(finalWeek);
                if (remoteSettings.currentWeek === 1 && isSupabaseConfigured) {
                  supabaseSavePlannerSettings({
                    currentBlock: remoteSettings.currentBlock || 1,
                    currentWeek: 2,
                  }).catch(console.warn);
                }
              }
            }
          } else if (isSupabaseConfigured) {
            // Seed defaults of week 2 if missing entirely
            supabaseSavePlannerSettings({ currentBlock: 1, currentWeek: 2 }).catch(console.warn);
          }
        }

        // 6. Fetch tomorrow special notes
        const remoteTomorrow = await supabaseFetchTomorrowNotes();
        if (isMounted) {
          const hasWeek2Arabic = remoteTomorrow.some((n) => n.week === 2 && n.subject === 'Arabic');
          if (remoteTomorrow.length > 0 && hasWeek2Arabic) {
            setCustomTomorrowNotes(remoteTomorrow);
            localStorage.setItem('nile_custom_tomorrow_notes', JSON.stringify(remoteTomorrow));
          } else {
            const baseTomorrow = remoteTomorrow.length > 0 ? remoteTomorrow : WEEK2_SPECIAL_NOTES;
            const cleanTomorrow = baseTomorrow.filter((n) => n.week !== 2);
            const fullTomorrow = [...cleanTomorrow, ...WEEK2_SPECIAL_NOTES];
            setCustomTomorrowNotes(fullTomorrow);
            localStorage.setItem('nile_custom_tomorrow_notes', JSON.stringify(fullTomorrow));
            if (isSupabaseConfigured) {
              supabaseSaveTomorrowNotes(fullTomorrow).catch(console.warn);
            }
          }
        }

        if (isMounted) {
          setSupabaseStatus('connected');
        }
      } catch (err) {
        console.error('Failed to sync initial data from Supabase:', err);
        if (isMounted) setSupabaseStatus('offline');
      } finally {
        if (isMounted) setIsSupabaseSyncing(false);
      }
    }

    syncFromSupabase();

    // Setup Supabase Real-time listener for multi-device sync
    if (isSupabaseConfigured) {
      const channel = supabase
        .channel('school-realtime-channel')
        .on('postgres_changes', { event: '*', schema: 'public', table: 'classwork' }, async () => {
          const fresh = await supabaseFetchClasswork();
          if (isMounted && fresh.length > 0) {
            setClassworkList(fresh);
            localStorage.setItem(STORAGE_KEYS.CUSTOM_CLASSWORK, JSON.stringify(fresh));
          }
        })
        .on('postgres_changes', { event: '*', schema: 'public', table: 'homework' }, async () => {
          const fresh = await supabaseFetchHomework();
          if (isMounted && fresh.length > 0) {
            setHomeworkList(fresh);
            localStorage.setItem(STORAGE_KEYS.CUSTOM_HOMEWORK, JSON.stringify(fresh));
          }
        })
        .on('postgres_changes', { event: '*', schema: 'public', table: 'timetables' }, async () => {
          const fresh = await supabaseFetchTimetables();
          if (isMounted && fresh) {
            setTimetables(fresh);
          }
        })
        .on('postgres_changes', { event: '*', schema: 'public', table: 'materials' }, async () => {
          await syncMaterialsFromCloud();
        })
        .on('postgres_changes', { event: '*', schema: 'public', table: 'planner_settings' }, async () => {
          const freshSettings = await supabaseFetchPlannerSettings();
          if (isMounted && freshSettings) {
            if (freshSettings.currentBlock) setCurrentBlock(freshSettings.currentBlock);
            if (freshSettings.currentWeek) setCurrentWeek(freshSettings.currentWeek);
          }
        })
        .on('postgres_changes', { event: '*', schema: 'public', table: 'tomorrow_notes' }, async () => {
          const freshNotes = await supabaseFetchTomorrowNotes();
          if (isMounted && freshNotes.length > 0) {
            setCustomTomorrowNotes(freshNotes);
            localStorage.setItem('nile_custom_tomorrow_notes', JSON.stringify(freshNotes));
          }
        })
        .subscribe();

      return () => {
        isMounted = false;
        supabase.removeChannel(channel);
      };
    }

    return () => {
      isMounted = false;
    };
  }, []);

  // Listen to timetable updates from other components
  useEffect(() => {
    const handleTimetableChange = () => {
      setTimetables(getStoredTimetables());
    };
    window.addEventListener('timetableUpdated', handleTimetableChange);
    return () => window.removeEventListener('timetableUpdated', handleTimetableChange);
  }, []);

  // Persistence effects for class, week, day
  useEffect(() => {
    localStorage.setItem(STORAGE_KEYS.CLASS, currentClass);
  }, [currentClass]);

  useEffect(() => {
    localStorage.setItem(STORAGE_KEYS.WEEK, String(currentWeek));
  }, [currentWeek]);

  useEffect(() => {
    localStorage.setItem(STORAGE_KEYS.DAY, selectedDay);
  }, [selectedDay]);

  const showToast = (msg: string) => {
    setToastMsg(msg);
    setTimeout(() => setToastMsg(null), 3500);
  };

  // Switch student profile
  const handleSelectProfile = async (newProfile: UserProfile | null) => {
    setUserProfile(newProfile);
    setActiveUserProfile(newProfile);

    if (newProfile?.mode === 'student' && newProfile.studentName) {
      if (newProfile.classId) {
        setCurrentClass(newProfile.classId);
      }

      let cwSet: Set<string>;
      let hwSet: Set<string>;

      // Try fetching student progress from Supabase first
      const remoteProgress = await supabaseFetchStudentProgress(newProfile.studentName);
      if (remoteProgress) {
        cwSet = new Set(remoteProgress.completedClassworkIds);
        hwSet = new Set(remoteProgress.completedHomeworkIds);
      } else {
        const progress = getStudentProgress(newProfile.studentName);
        cwSet = new Set(progress.completedClassworkIds);
        hwSet = new Set(progress.completedHomeworkIds);
      }

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
      showToast(`مرحباً يا ${newProfile.studentName}! تم تحميل بياناتك.`);
    } else {
      // Guest mode
      setClassworkList((prev) => prev.map((c) => ({ ...c, completed: false })));
      setHomeworkList((prev) => prev.map((h) => ({ ...h, completed: false })));
      showToast('تم الدخول كزائر (تصفح فقط).');
    }
  };

  // Classwork handlers (CRUD -> Supabase + local cache)
  const handleToggleClasswork = async (id: string) => {
    setClassworkList((prev) => {
      const updated = prev.map((c) => (c.id === id ? { ...c, completed: !c.completed } : c));
      localStorage.setItem(STORAGE_KEYS.CUSTOM_CLASSWORK, JSON.stringify(updated));
      const target = updated.find((c) => c.id === id);
      if (target) {
        supabaseUpsertClasswork(target).catch(console.warn);
      }
      if (userProfile?.mode === 'student' && userProfile.studentName) {
        const completedCwIds = updated.filter((c) => c.completed).map((c) => c.id);
        const completedHwIds = homeworkList.filter((h) => h.completed).map((h) => h.id);
        saveStudentProgress(userProfile.studentName, completedCwIds, completedHwIds, currentClass);
        supabaseSaveStudentProgress(userProfile.studentName, completedCwIds, completedHwIds, currentClass).catch(console.warn);
      } else {
        showToast('تنبيه: أنت تتصفح كزائر، لن يتم حفظ علامة الإنجاز بعد إغلاق المتصفح.');
      }
      return updated;
    });
  };

  const handleSaveClasswork = async (entry: ClassworkEntry) => {
    setClassworkList((prev) => {
      const idx = prev.findIndex((c) => c.id === entry.id);
      let next: ClassworkEntry[];
      if (idx >= 0) {
        next = [...prev];
        next[idx] = entry;
      } else {
        next = [...prev, entry];
      }
      localStorage.setItem(STORAGE_KEYS.CUSTOM_CLASSWORK, JSON.stringify(next));
      if (userProfile?.mode === 'student' && userProfile.studentName) {
        const completedCwIds = next.filter((c) => c.completed).map((c) => c.id);
        const completedHwIds = homeworkList.filter((h) => h.completed).map((h) => h.id);
        saveStudentProgress(userProfile.studentName, completedCwIds, completedHwIds, currentClass);
        supabaseSaveStudentProgress(userProfile.studentName, completedCwIds, completedHwIds, currentClass).catch(console.warn);
      }
      return next;
    });

    const res = await supabaseUpsertClasswork(entry);
    if (res.success) {
      showToast('تم حفظ الدرس في Supabase بنجاح!');
    } else {
      showToast('تم حفظ الدرس محلياً.');
    }
  };

  const handleDeleteClasswork = async (id: string) => {
    setClassworkList((prev) => {
      const next = prev.filter((c) => c.id !== id);
      localStorage.setItem(STORAGE_KEYS.CUSTOM_CLASSWORK, JSON.stringify(next));
      if (userProfile?.mode === 'student' && userProfile.studentName) {
        const completedCwIds = next.filter((c) => c.completed).map((c) => c.id);
        const completedHwIds = homeworkList.filter((h) => h.completed).map((h) => h.id);
        saveStudentProgress(userProfile.studentName, completedCwIds, completedHwIds, currentClass);
        supabaseSaveStudentProgress(userProfile.studentName, completedCwIds, completedHwIds, currentClass).catch(console.warn);
      }
      return next;
    });

    await supabaseDeleteClasswork(id);
    showToast('تم حذف الدرس من الخطة وقاعدة البيانات بنجاح');
  };

  // Homework handlers (CRUD -> Supabase + local cache)
  const handleToggleHomework = async (id: string) => {
    setHomeworkList((prev) => {
      const updated = prev.map((h) => (h.id === id ? { ...h, completed: !h.completed } : h));
      localStorage.setItem(STORAGE_KEYS.CUSTOM_HOMEWORK, JSON.stringify(updated));
      const target = updated.find((h) => h.id === id);
      if (target) {
        supabaseUpsertHomework(target).catch(console.warn);
      }
      if (userProfile?.mode === 'student' && userProfile.studentName) {
        const completedCwIds = classworkList.filter((c) => c.completed).map((c) => c.id);
        const completedHwIds = updated.filter((h) => h.completed).map((h) => h.id);
        saveStudentProgress(userProfile.studentName, completedCwIds, completedHwIds, currentClass);
        supabaseSaveStudentProgress(userProfile.studentName, completedCwIds, completedHwIds, currentClass).catch(console.warn);
      } else {
        showToast('تنبيه: أنت تتصفح كزائر، لن يتم حفظ علامة الإنجاز بعد إغلاق المتصفح.');
      }
      return updated;
    });
  };

  const handleAddHomework = async (entry: HomeworkEntry) => {
    setHomeworkList((prev) => {
      const idx = prev.findIndex((h) => h.id === entry.id);
      let next: HomeworkEntry[];
      if (idx >= 0) {
        next = [...prev];
        next[idx] = entry;
      } else {
        next = [entry, ...prev];
      }
      localStorage.setItem(STORAGE_KEYS.CUSTOM_HOMEWORK, JSON.stringify(next));
      if (userProfile?.mode === 'student' && userProfile.studentName) {
        const completedCwIds = classworkList.filter((c) => c.completed).map((c) => c.id);
        const completedHwIds = next.filter((h) => h.completed).map((h) => h.id);
        saveStudentProgress(userProfile.studentName, completedCwIds, completedHwIds, currentClass);
        supabaseSaveStudentProgress(userProfile.studentName, completedCwIds, completedHwIds, currentClass).catch(console.warn);
      }
      return next;
    });

    const res = await supabaseUpsertHomework(entry);
    if (res.success) {
      showToast('تم حفظ الواجب في Supabase بنجاح!');
    } else {
      showToast('تم حفظ الواجب محلياً.');
    }
  };

  const handleDeleteHomework = async (id: string) => {
    setHomeworkList((prev) => {
      const next = prev.filter((h) => h.id !== id);
      localStorage.setItem(STORAGE_KEYS.CUSTOM_HOMEWORK, JSON.stringify(next));
      if (userProfile?.mode === 'student' && userProfile.studentName) {
        const completedCwIds = classworkList.filter((c) => c.completed).map((c) => c.id);
        const completedHwIds = next.filter((h) => h.completed).map((h) => h.id);
        saveStudentProgress(userProfile.studentName, completedCwIds, completedHwIds, currentClass);
        supabaseSaveStudentProgress(userProfile.studentName, completedCwIds, completedHwIds, currentClass).catch(console.warn);
      }
      return next;
    });

    await supabaseDeleteHomework(id);
    showToast('تم حذف الواجب من قاعدة البيانات بنجاح.');
  };

  const handleSaveTomorrowNote = async (note: TomorrowSpecialNote, originalIndex?: number) => {
    setCustomTomorrowNotes((prev) => {
      let next: TomorrowSpecialNote[];
      if (originalIndex !== undefined && originalIndex >= 0 && originalIndex < prev.length) {
        next = prev.map((n, i) => (i === originalIndex ? note : n));
      } else {
        next = [note, ...prev];
      }
      localStorage.setItem('nile_custom_tomorrow_notes', JSON.stringify(next));
      supabaseSaveTomorrowNotes(next).catch(console.warn);
      return next;
    });
    showToast('تم حفظ ملاحظة الغد بنجاح!');
  };

  const handleDeleteTomorrowNote = async (index: number) => {
    setCustomTomorrowNotes((prev) => {
      const next = prev.filter((_, i) => i !== index);
      localStorage.setItem('nile_custom_tomorrow_notes', JSON.stringify(next));
      supabaseSaveTomorrowNotes(next).catch(console.warn);
      return next;
    });
    showToast('تم حذف الملاحظة بنجاح.');
  };

  const handleApplyWeeklyPlan = async (
    newClasswork: ClassworkEntry[],
    newHomework: HomeworkEntry[],
    newTomorrowNotes?: TomorrowSpecialNote[],
    replaceExisting: boolean = false,
    options?: {
      targetBlock?: number;
      targetWeek?: number;
      targetClasses?: ClassId[];
      subjectFilter?: string;
      saveMode?: 'replace_week' | 'replace_subject' | 'replace_all' | 'append';
    }
  ) => {
    const targetBlock = options?.targetBlock ?? (newClasswork[0]?.block || 1);
    const targetWeek = options?.targetWeek ?? (newClasswork[0]?.week || 1);
    const targetClasses: ClassId[] =
      options?.targetClasses && options.targetClasses.length > 0
        ? options.targetClasses
        : Array.from(new Set([...newClasswork.map((c) => c.classId), ...newHomework.map((h) => h.classId)]));
    const subjectFilter =
      options?.subjectFilter && options.subjectFilter !== 'ALL' ? options.subjectFilter : undefined;
    const mode = options?.saveMode || (replaceExisting ? 'replace_week' : 'append');

    // Scoped filtering logic for local state
    const filterOutItems = <T extends { block?: number; week?: number; classId: ClassId; subject?: string }>(
      list: T[]
    ): T[] => {
      if (mode === 'append') return list;
      if (mode === 'replace_all') return [];
      return list.filter((item) => {
        const itemBlock = item.block || 1;
        const itemWeek = item.week || 1;
        const isSameScope =
          itemBlock === targetBlock &&
          itemWeek === targetWeek &&
          (targetClasses.length === 0 || targetClasses.includes(item.classId));

        if (!isSameScope) return true; // keep items of other weeks/blocks/classes

        if (mode === 'replace_subject' && subjectFilter) {
          // only remove items of this specific subject
          const itemSubject = (item.subject || '').toLowerCase();
          return itemSubject !== subjectFilter.toLowerCase();
        }

        // replace_week removes all items for that week
        return false;
      });
    };

    setClassworkList((prev) => {
      const filtered = filterOutItems(prev);
      const next = [...newClasswork, ...filtered];
      localStorage.setItem(STORAGE_KEYS.CUSTOM_CLASSWORK, JSON.stringify(next));
      return next;
    });

    setHomeworkList((prev) => {
      const filtered = filterOutItems(prev);
      const next = [...newHomework, ...filtered];
      localStorage.setItem(STORAGE_KEYS.CUSTOM_HOMEWORK, JSON.stringify(next));
      return next;
    });

    if (newTomorrowNotes && newTomorrowNotes.length > 0) {
      setCustomTomorrowNotes((prev) => {
        const filtered =
          mode === 'append'
            ? prev
            : prev.filter((n) => {
                const nBlock = n.block || 1;
                const nWeek = n.week || 1;
                const isSame =
                  nBlock === targetBlock &&
                  nWeek === targetWeek &&
                  (targetClasses.includes(n.classId as ClassId) || n.classId === 'ALL');
                if (!isSame) return true;
                if (mode === 'replace_subject' && subjectFilter) {
                  return (n.subject || '').toLowerCase() !== subjectFilter.toLowerCase();
                }
                return false;
              });
        const next = [...newTomorrowNotes, ...filtered];
        localStorage.setItem('nile_custom_tomorrow_notes', JSON.stringify(next));
        return next;
      });
    }

    // Supabase scoped cleanup & insert
    if (mode === 'replace_week' || mode === 'replace_subject') {
      await Promise.all([
        supabaseDeleteClassworkForScope(
          targetClasses,
          targetBlock,
          targetWeek,
          mode === 'replace_subject' ? subjectFilter : undefined
        ),
        supabaseDeleteHomeworkForScope(
          targetClasses,
          targetBlock,
          targetWeek,
          mode === 'replace_subject' ? subjectFilter : undefined
        ),
        supabaseDeleteTomorrowNotesForScope(
          targetClasses,
          targetBlock,
          targetWeek,
          mode === 'replace_subject' ? subjectFilter : undefined
        ),
      ]).catch(console.warn);
    }

    // Batch insert new items to Supabase
    if (newClasswork.length > 0) await supabaseBatchInsertClasswork(newClasswork);
    if (newHomework.length > 0) await supabaseBatchInsertHomework(newHomework);
    if (newTomorrowNotes && newTomorrowNotes.length > 0) await supabaseSaveTomorrowNotes(newTomorrowNotes);

    showToast(`تم تنزيل وحفظ الخطة بنجاح في Topic ${targetBlock} - Week ${targetWeek}!`);
  };

  const handleUpdateTimetable = async (updated: Record<ClassId, Record<SchoolDay, PeriodSlot[]>>) => {
    setTimetables(updated);
    saveAllStoredTimetables(updated);
    await supabaseSaveAllTimetables(updated);
    showToast('تم تحديث جدول الحصص وحفظه في Supabase!');
  };

  // Complete data reset / Clean slate
  const handleClearAllData = async () => {
    const confirmed = window.confirm(
      'هل أنتِ متأكدة من تفريغ كافة البيانات؟\n' +
      'سيتم مسح جدول الحصص، والواجبات، والدروس، وكافة ملفات الماتيريال من Supabase والتخزين المحلي للبدء ببيانات جديدة تماماً.'
    );
    if (!confirmed) return;

    // 1. Clear classwork and homework in Supabase & local
    await supabaseClearAllClasswork();
    await supabaseClearAllHomework();
    localStorage.removeItem(STORAGE_KEYS.CUSTOM_CLASSWORK);
    localStorage.removeItem(STORAGE_KEYS.CUSTOM_HOMEWORK);
    localStorage.removeItem('nile_planner_tasks_v2');
    localStorage.removeItem('nile_custom_tomorrow_notes');
    setClassworkList([]);
    setHomeworkList([]);
    setCustomTomorrowNotes([]);

    // 2. Clear timetables in Supabase & local
    await supabaseClearAllTimetables();
    const emptyTimetables = clearAllStoredTimetables();
    setTimetables(emptyTimetables);

    // 3. Clear all materials from IndexedDB and storage
    await clearAllMaterialsStorage();

    // 4. Clear student progress
    if (userProfile?.mode === 'student' && userProfile.studentName) {
      saveStudentProgress(userProfile.studentName, [], [], currentClass);
      await supabaseSaveStudentProgress(userProfile.studentName, [], [], currentClass);
    }

    showToast('تم تفريغ كافة البيانات والملفات بنجاح! الأبليكيشن جاهز لبياناتك الجديدة بالكامل.');
  };

  // Restore original Arabic weekly plan with YouTube links & lessons
  const handleRestoreArabicWeeklyPlan = async () => {
    setClassworkList(INITIAL_CLASSWORK);
    setHomeworkList(INITIAL_HOMEWORK);
    setCustomTomorrowNotes([]);
    localStorage.removeItem('nile_custom_tomorrow_notes');
    localStorage.setItem(STORAGE_KEYS.CUSTOM_CLASSWORK, JSON.stringify(INITIAL_CLASSWORK));
    localStorage.setItem(STORAGE_KEYS.CUSTOM_HOMEWORK, JSON.stringify(INITIAL_HOMEWORK));

    if (isSupabaseConfigured) {
      try {
        await supabaseBatchInsertClasswork(INITIAL_CLASSWORK);
        await supabaseBatchInsertHomework(INITIAL_HOMEWORK);
      } catch (e) {
        console.warn('Failed to push restored weekly plan to Supabase:', e);
      }
    }
    showToast('تمت استعادة الويكلي بلان العربي بجميع الروابط والدروس بنجاح!');
  };

  const handlePrint = () => {
    window.print();
  };

  const handleSelectBlock = (block: number) => {
    setCurrentBlock(block);
    localStorage.setItem('nile_planner_current_block_v3', String(block));
    supabaseSavePlannerSettings({ currentBlock: block, currentWeek }).catch(console.warn);
  };

  const handleSelectWeek = (week: number) => {
    setCurrentWeek(week);
    localStorage.setItem(STORAGE_KEYS.WEEK, String(week));
    supabaseSavePlannerSettings({ currentBlock, currentWeek: week }).catch(console.warn);
  };

  // Calculate pending homework count for current class
  const pendingHomeworkCount = homeworkList.filter(
    (h) => h.classId === currentClass && !h.completed
  ).length;

  return (
    <div className="min-h-screen bg-slate-100 flex flex-col antialiased text-slate-900 font-sans">
      {/* Top Navigation */}
      <Navbar
        currentClass={currentClass}
        selectedDay={selectedDay}
        activeTab={activeTab}
        pendingHomeworkCount={pendingHomeworkCount}
        currentBlock={currentBlock}
        currentWeek={currentWeek}
        userProfile={userProfile}
        onSelectClass={setCurrentClass}
        onSelectDay={setSelectedDay}
        onSelectTab={setActiveTab}
        onSelectBlock={handleSelectBlock}
        onSelectWeek={handleSelectWeek}
        isAdmin={isAdmin}
        isAdminLiveEdit={isAdminLiveEdit}
        onToggleAdminLiveEdit={() => {
          setIsAdminLiveEdit((prev) => {
            const next = !prev;
            localStorage.setItem('nile_admin_live_edit', String(next));
            if (next) {
              showToast('تم تفعيل وضع التعديل المباشر ✏️ يمكنك الآن تعديل وحذف وإضافة أي درس أو واجب أو ملاحظة مباشرة');
            } else {
              showToast('تم إيقاف وضع التعديل المباشر.');
            }
            return next;
          });
        }}
        onOpenProfileModal={() => setIsAuthModalOpen(true)}
        onOpenAdminAuth={() => {
          setAdminDashboardInitialTab('materials');
          const isAuthed = sessionStorage.getItem('nile_admin_authenticated') === 'true';
          if (isAuthed) {
            setIsAdmin(true);
            setIsAdminDashboardOpen(true);
          } else {
            setIsAdminAuthOpen(true);
          }
        }}
        onOpenWeeklyPlan={() => {
          setAdminDashboardInitialTab('weekly_plan');
          const isAuthed = sessionStorage.getItem('nile_admin_authenticated') === 'true';
          if (isAuthed) {
            setIsAdmin(true);
            setIsAdminDashboardOpen(true);
          } else {
            setIsAdminAuthOpen(true);
          }
        }}
        onOpenMaterials={() => setIsMaterialsModalOpen(true)}
        onPrint={handlePrint}
      />

      {/* Main Content Area */}
      <main className="flex-1 max-w-7xl w-full mx-auto p-4 sm:p-6 lg:p-8">
        {/* Live Edit Active Sticky Banner */}
        {isAdminLiveEdit && (
          <div className="mb-4 bg-gradient-to-r from-amber-500 via-amber-400 to-amber-500 text-slate-950 p-3.5 sm:p-4 rounded-2xl shadow-sm border border-amber-400/90 flex flex-wrap items-center justify-between gap-2.5 animate-in fade-in duration-200">
            <div className="flex items-center gap-2.5 font-black text-xs sm:text-sm">
              <div className="w-7 h-7 rounded-lg bg-slate-950 text-amber-300 flex items-center justify-center shrink-0 shadow-2xs">
                <Pencil className="w-3.5 h-3.5" />
              </div>
              <span>
                وضع التعديل المباشر نشط (Live Edit Mode): اضغط على أيقونة القلم ✏️ لتعديل أي عنصر، أو سلة المهملات 🗑️ للحذف، أو زر الإضافة ➕.
              </span>
            </div>
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => {
                  if (activeTab === 'classwork') {
                    setLiveEditModalConfig({ isOpen: true, type: 'classwork', item: null });
                  } else if (activeTab === 'homework') {
                    setLiveEditModalConfig({ isOpen: true, type: 'homework', item: null });
                  } else {
                    setLiveEditModalConfig({ isOpen: true, type: 'tomorrow_note', item: null });
                  }
                }}
                className="bg-indigo-600 hover:bg-indigo-700 text-white px-3 py-1.5 rounded-xl text-xs font-black transition-all shadow-2xs cursor-pointer active:scale-95"
              >
                + إضافة عنصر جديد
              </button>
              <button
                type="button"
                onClick={() => {
                  setIsAdminLiveEdit(false);
                  localStorage.setItem('nile_admin_live_edit', 'false');
                  showToast('تم إيقاف وضع التعديل المباشر.');
                }}
                className="bg-slate-950 hover:bg-slate-800 text-white px-3 py-1.5 rounded-xl text-xs font-black transition-all shadow-2xs cursor-pointer active:scale-95"
              >
                إنهاء التعديل
              </button>
            </div>
          </div>
        )}

        {/* Toast Notification */}
        {toastMsg && (
          <div className="mb-4 bg-emerald-600 text-white px-4 py-2.5 rounded-xl shadow-md text-xs sm:text-sm font-semibold flex items-center justify-between animate-in fade-in slide-in-from-top-2 duration-200">
            <div className="flex items-center gap-2">
              <Sparkles className="w-4 h-4 text-emerald-200" />
              <span>{toastMsg}</span>
            </div>
            <button
              onClick={() => setToastMsg(null)}
              className="text-emerald-200 hover:text-white text-xs font-bold"
            >
              إغلاق
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
              timetables={timetables}
              onToggleClasswork={handleToggleClasswork}
              onSaveClasswork={handleSaveClasswork}
              onDeleteClasswork={handleDeleteClasswork}
              isAdminLiveEdit={isAdminLiveEdit}
              onEditClasswork={(cw) => {
                setLiveEditModalConfig({
                  isOpen: true,
                  type: 'classwork',
                  item: cw,
                });
              }}
              onAddClasswork={() => {
                setLiveEditModalConfig({
                  isOpen: true,
                  type: 'classwork',
                  item: null,
                });
              }}
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
              onAddHomework={handleAddHomework}
              onDeleteHomework={handleDeleteHomework}
              isAdminLiveEdit={isAdminLiveEdit}
              onEditHomework={(hw) => {
                setLiveEditModalConfig({
                  isOpen: true,
                  type: 'homework',
                  item: hw,
                });
              }}
              onAddNewHomework={() => {
                setLiveEditModalConfig({
                  isOpen: true,
                  type: 'homework',
                  item: null,
                });
              }}
            />
          )}

          {activeTab === 'tomorrow' && (
            <TomorrowView
              currentClass={currentClass}
              selectedDay={selectedDay}
              currentBlock={currentBlock}
              currentWeek={currentWeek}
              timetables={timetables}
              customTomorrowNotes={customTomorrowNotes}
              isAdminLiveEdit={isAdminLiveEdit}
              onEditTomorrowNote={(note, idx) => {
                setLiveEditModalConfig({
                  isOpen: true,
                  type: 'tomorrow_note',
                  item: note,
                  originalIndex: idx,
                });
              }}
              onDeleteTomorrowNote={handleDeleteTomorrowNote}
              onAddTomorrowNote={() => {
                setLiveEditModalConfig({
                  isOpen: true,
                  type: 'tomorrow_note',
                  item: null,
                });
              }}
            />
          )}

          {activeTab === 'timetable' && (
            <TimetableGrid
              currentClass={currentClass}
              selectedDay={selectedDay}
              timetables={timetables}
              onUpdateTimetable={handleUpdateTimetable}
              onSelectDay={(d) => {
                setSelectedDay(d);
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
          timetables={timetables}
        />
      </main>

      {/* Bottom Footer with quick actions and clean slate */}
      <footer className="bg-white border-t border-slate-200 py-4 px-4 sm:px-6 lg:px-8 text-xs text-slate-500 print:hidden mt-auto">
        <div className="max-w-7xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <span className="font-bold text-slate-700">{SCHOOL_NAME}</span>
            <span>•</span>
            <span>{SCHOOL_BRANCH} Campus</span>
            <span>•</span>
            {isSupabaseConfigured ? (
              <span
                className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full font-medium ${
                  supabaseStatus === 'connected'
                    ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                    : 'bg-amber-50 text-amber-700 border border-amber-200'
                }`}
                title="مربوط بقاعدة بيانات Supabase السحابية"
              >
                <Cloud className="w-3 h-3" />
                {supabaseStatus === 'connected' ? 'Supabase متصل' : 'جاري الاتصال بـ Supabase...'}
                {isSupabaseSyncing && <span className="animate-spin text-xs">↻</span>}
              </span>
            ) : (
              <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full font-medium bg-slate-100 text-slate-500 border border-slate-200">
                <Database className="w-3 h-3" />
                تخزين محلي (Offline)
              </span>
            )}
          </div>

          <div className="flex items-center gap-3">
            <span className="text-slate-400 font-normal">
              لوحة التحكم والإدارة مخصصة لإدارة المدرسة عبر زر الأدمن
            </span>
          </div>
        </div>
      </footer>

      {/* Weekly Plan Smart Classifier Modal */}
      <WeeklyPlanModal
        isOpen={isPlanModalOpen}
        onClose={() => setIsPlanModalOpen(false)}
        currentClass={currentClass}
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
          setIsAdmin(true);
          sessionStorage.setItem('nile_admin_authenticated', 'true');
          setIsAdminDashboardOpen(true);
        }}
      />

      {/* Admin Dashboard / Settings Panel */}
      <AdminDashboardModal
        isOpen={isAdminDashboardOpen}
        onClose={() => setIsAdminDashboardOpen(false)}
        onClearAllAppData={handleClearAllData}
        onRestoreArabicWeeklyPlan={handleRestoreArabicWeeklyPlan}
        onApplyWeeklyPlan={handleApplyWeeklyPlan}
        currentClass={currentClass}
        currentBlock={currentBlock}
        currentWeek={currentWeek}
        initialTab={adminDashboardInitialTab}
        isAdminLiveEdit={isAdminLiveEdit}
        onToggleAdminLiveEdit={() => {
          setIsAdminLiveEdit((prev) => {
            const next = !prev;
            localStorage.setItem('nile_admin_live_edit', String(next));
            if (next) {
              showToast('تم تفعيل وضع التعديل المباشر ✏️');
            } else {
              showToast('تم إيقاف وضع التعديل المباشر.');
            }
            return next;
          });
        }}
      />

      {/* School Materials Modal */}
      <MaterialsModal
        isOpen={isMaterialsModalOpen}
        onClose={() => setIsMaterialsModalOpen(false)}
        currentClass={currentClass}
        currentBlock={currentBlock}
      />

      {/* Live Direct Edit Item Modal (Classwork / Homework / Tomorrow Note) */}
      <LiveEditItemModal
        isOpen={liveEditModalConfig.isOpen}
        onClose={() => setLiveEditModalConfig((prev) => ({ ...prev, isOpen: false }))}
        type={liveEditModalConfig.type}
        item={liveEditModalConfig.item}
        originalIndex={liveEditModalConfig.originalIndex}
        currentClass={currentClass}
        selectedDay={selectedDay}
        currentBlock={currentBlock}
        currentWeek={currentWeek}
        onSaveClasswork={handleSaveClasswork}
        onSaveHomework={handleAddHomework}
        onSaveTomorrowNote={handleSaveTomorrowNote}
      />
    </div>
  );
}
