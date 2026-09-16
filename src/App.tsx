import React, { useState, useEffect } from 'react';
import { ClassId, SchoolDay, ClassworkEntry, HomeworkEntry, UserProfile, PeriodSlot } from './types';
import { INITIAL_CLASSWORK, INITIAL_HOMEWORK, TomorrowSpecialNote } from './data/defaultWeeklyPlan';
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
import {
  getActiveUserProfile,
  setActiveUserProfile,
  getStudentProgress,
  saveStudentProgress,
} from './utils/studentStorage';
import { Sparkles, Trash2, RotateCcw, Database, Cloud, CheckCircle } from 'lucide-react';
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
        if (profile?.mode === 'student' && profile.studentName) {
          const progress = getStudentProgress(profile.studentName);
          const set = new Set(progress.completedClassworkIds);
          return list.map((c) => ({
            ...c,
            completed: set.has(c.id),
          }));
        }
        return list.map((c) => ({ ...c, completed: false }));
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
        if (profile?.mode === 'student' && profile.studentName) {
          const progress = getStudentProgress(profile.studentName);
          const set = new Set(progress.completedHomeworkIds);
          return list.map((h) => ({
            ...h,
            completed: set.has(h.id),
          }));
        }
        return list.map((h) => ({ ...h, completed: false }));
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

  // Current Week (1, 2, 3, 4) - Starts Week 1
  const [currentWeek, setCurrentWeek] = useState<number>(() => {
    const saved = localStorage.getItem(STORAGE_KEYS.WEEK);
    return saved ? Number(saved) : 1;
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
      return saved ? JSON.parse(saved) : [];
    } catch {
      return [];
    }
  });

  const [toastMsg, setToastMsg] = useState<string | null>(null);
  const [isPlanModalOpen, setIsPlanModalOpen] = useState(false);
  const [isAdminAuthOpen, setIsAdminAuthOpen] = useState(false);
  const [isAdminDashboardOpen, setIsAdminDashboardOpen] = useState(false);
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
          if (remoteCw.length > 0) {
            setClassworkList(remoteCw);
            localStorage.setItem(STORAGE_KEYS.CUSTOM_CLASSWORK, JSON.stringify(remoteCw));
          } else {
            // Seed default Arabic weekly plan if empty
            setClassworkList(INITIAL_CLASSWORK);
            localStorage.setItem(STORAGE_KEYS.CUSTOM_CLASSWORK, JSON.stringify(INITIAL_CLASSWORK));
            supabaseBatchInsertClasswork(INITIAL_CLASSWORK).catch(console.warn);
          }
        }

        // 3. Fetch homework
        const remoteHw = await supabaseFetchHomework();
        if (isMounted) {
          if (remoteHw.length > 0) {
            setHomeworkList(remoteHw);
            localStorage.setItem(STORAGE_KEYS.CUSTOM_HOMEWORK, JSON.stringify(remoteHw));
          } else {
            // Seed default Arabic homework if empty
            setHomeworkList(INITIAL_HOMEWORK);
            localStorage.setItem(STORAGE_KEYS.CUSTOM_HOMEWORK, JSON.stringify(INITIAL_HOMEWORK));
            supabaseBatchInsertHomework(INITIAL_HOMEWORK).catch(console.warn);
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
        if (isMounted && remoteSettings) {
          if (remoteSettings.currentBlock) setCurrentBlock(remoteSettings.currentBlock);
          if (remoteSettings.currentWeek) setCurrentWeek(remoteSettings.currentWeek);
        }

        // 6. Fetch tomorrow special notes
        const remoteTomorrow = await supabaseFetchTomorrowNotes();
        if (isMounted && remoteTomorrow.length > 0) {
          setCustomTomorrowNotes(remoteTomorrow);
          localStorage.setItem('nile_custom_tomorrow_notes', JSON.stringify(remoteTomorrow));
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
      const next = [entry, ...prev];
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
      showToast('تمت إضافة الواجب وحفظه في Supabase بنجاح!');
    } else {
      showToast('تمت إضافة الواجب محلياً.');
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

  const handleApplyWeeklyPlan = async (
    newClasswork: ClassworkEntry[],
    newHomework: HomeworkEntry[],
    newTomorrowNotes?: TomorrowSpecialNote[],
    replaceExisting: boolean = false
  ) => {
    setClassworkList((prev) => {
      const next = replaceExisting ? newClasswork : [...newClasswork, ...prev];
      localStorage.setItem(STORAGE_KEYS.CUSTOM_CLASSWORK, JSON.stringify(next));
      return next;
    });
    setHomeworkList((prev) => {
      const next = replaceExisting ? newHomework : [...newHomework, ...prev];
      localStorage.setItem(STORAGE_KEYS.CUSTOM_HOMEWORK, JSON.stringify(next));
      return next;
    });

    if (newTomorrowNotes && newTomorrowNotes.length > 0) {
      setCustomTomorrowNotes((prev) => {
        const next = replaceExisting ? newTomorrowNotes : [...newTomorrowNotes, ...prev];
        localStorage.setItem('nile_custom_tomorrow_notes', JSON.stringify(next));
        return next;
      });
      supabaseSaveTomorrowNotes(newTomorrowNotes).catch(console.warn);
    }

    // Batch insert to Supabase
    await supabaseBatchInsertClasswork(newClasswork);
    await supabaseBatchInsertHomework(newHomework);

    showToast('تم استيراد وحفظ الخطة الأسبوعية وملاحظات الغد في Supabase بنجاح!');
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
        onOpenProfileModal={() => setIsAuthModalOpen(true)}
        onOpenAdminAuth={() => setIsAdminAuthOpen(true)}
        onOpenMaterials={() => setIsMaterialsModalOpen(true)}
        onPrint={handlePrint}
      />

      {/* Main Content Area */}
      <main className="flex-1 max-w-7xl w-full mx-auto p-4 sm:p-6 lg:p-8">
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
      />

      {/* School Materials Modal */}
      <MaterialsModal
        isOpen={isMaterialsModalOpen}
        onClose={() => setIsMaterialsModalOpen(false)}
        currentClass={currentClass}
        currentBlock={currentBlock}
      />
    </div>
  );
}
