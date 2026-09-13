import React, { useState, useEffect } from 'react';
import { ClassId, SchoolDay, ClassworkEntry, HomeworkEntry, UserProfile, PeriodSlot } from './types';
import { INITIAL_CLASSWORK, INITIAL_HOMEWORK } from './data/defaultWeeklyPlan';
import { SCHOOL_DAYS, SCHOOL_NAME, SCHOOL_BRANCH } from './data/timetables';
import {
  getStoredTimetables,
  saveAllStoredTimetables,
  clearAllStoredTimetables,
} from './utils/timetableStorage';
import { clearAllMaterialsStorage } from './utils/materialsStorage';
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
import { Sparkles, Trash2, RotateCcw } from 'lucide-react';

const STORAGE_KEYS = {
  CLASS: 'nile_planner_current_class_v3',
  DAY: 'nile_planner_selected_day_v3',
  WEEK: 'nile_planner_current_week_v3',
  CUSTOM_CLASSWORK: 'nile_planner_custom_classwork_v1',
  CUSTOM_HOMEWORK: 'nile_planner_custom_homework_v1',
};

function getStoredCustomClasswork(profile: UserProfile | null): ClassworkEntry[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEYS.CUSTOM_CLASSWORK);
    if (raw) {
      const list: ClassworkEntry[] = JSON.parse(raw);
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

  const [toastMsg, setToastMsg] = useState<string | null>(null);
  const [isPlanModalOpen, setIsPlanModalOpen] = useState(false);
  const [isAdminAuthOpen, setIsAdminAuthOpen] = useState(false);
  const [isAdminDashboardOpen, setIsAdminDashboardOpen] = useState(false);
  const [isMaterialsModalOpen, setIsMaterialsModalOpen] = useState(false);

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
  const handleSelectProfile = (newProfile: UserProfile | null) => {
    setUserProfile(newProfile);
    setActiveUserProfile(newProfile);

    if (newProfile?.mode === 'student' && newProfile.studentName) {
      if (newProfile.classId) {
        setCurrentClass(newProfile.classId);
      }
      const progress = getStudentProgress(newProfile.studentName);
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
      showToast(`مرحباً يا ${newProfile.studentName}! تم تحميل بياناتك.`);
    } else {
      // Guest mode
      setClassworkList((prev) => prev.map((c) => ({ ...c, completed: false })));
      setHomeworkList((prev) => prev.map((h) => ({ ...h, completed: false })));
      showToast('تم الدخول كزائر (تصفح فقط).');
    }
  };

  // Classwork handlers
  const handleToggleClasswork = (id: string) => {
    setClassworkList((prev) => {
      const updated = prev.map((c) => (c.id === id ? { ...c, completed: !c.completed } : c));
      localStorage.setItem(STORAGE_KEYS.CUSTOM_CLASSWORK, JSON.stringify(updated));
      if (userProfile?.mode === 'student' && userProfile.studentName) {
        const completedCwIds = updated.filter((c) => c.completed).map((c) => c.id);
        const completedHwIds = homeworkList.filter((h) => h.completed).map((h) => h.id);
        saveStudentProgress(userProfile.studentName, completedCwIds, completedHwIds, currentClass);
      } else {
        showToast('تنبيه: أنت تتصفح كزائر، لن يتم حفظ علامة الإنجاز بعد إغلاق المتصفح.');
      }
      return updated;
    });
  };

  const handleSaveClasswork = (entry: ClassworkEntry) => {
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
      }
      return next;
    });
    showToast('تم حفظ الدرس بنجاح!');
  };

  // Homework handlers
  const handleToggleHomework = (id: string) => {
    setHomeworkList((prev) => {
      const updated = prev.map((h) => (h.id === id ? { ...h, completed: !h.completed } : h));
      localStorage.setItem(STORAGE_KEYS.CUSTOM_HOMEWORK, JSON.stringify(updated));
      if (userProfile?.mode === 'student' && userProfile.studentName) {
        const completedCwIds = classworkList.filter((c) => c.completed).map((c) => c.id);
        const completedHwIds = updated.filter((h) => h.completed).map((h) => h.id);
        saveStudentProgress(userProfile.studentName, completedCwIds, completedHwIds, currentClass);
      } else {
        showToast('تنبيه: أنت تتصفح كزائر، لن يتم حفظ علامة الإنجاز بعد إغلاق المتصفح.');
      }
      return updated;
    });
  };

  const handleAddHomework = (entry: HomeworkEntry) => {
    setHomeworkList((prev) => {
      const next = [entry, ...prev];
      localStorage.setItem(STORAGE_KEYS.CUSTOM_HOMEWORK, JSON.stringify(next));
      if (userProfile?.mode === 'student' && userProfile.studentName) {
        const completedCwIds = classworkList.filter((c) => c.completed).map((c) => c.id);
        const completedHwIds = next.filter((h) => h.completed).map((h) => h.id);
        saveStudentProgress(userProfile.studentName, completedCwIds, completedHwIds, currentClass);
      }
      return next;
    });
    showToast('تمت إضافة الواجب بنجاح!');
  };

  const handleDeleteHomework = (id: string) => {
    setHomeworkList((prev) => {
      const next = prev.filter((h) => h.id !== id);
      localStorage.setItem(STORAGE_KEYS.CUSTOM_HOMEWORK, JSON.stringify(next));
      if (userProfile?.mode === 'student' && userProfile.studentName) {
        const completedCwIds = classworkList.filter((c) => c.completed).map((c) => c.id);
        const completedHwIds = next.filter((h) => h.completed).map((h) => h.id);
        saveStudentProgress(userProfile.studentName, completedCwIds, completedHwIds, currentClass);
      }
      return next;
    });
    showToast('تم حذف الواجب.');
  };

  const handleApplyWeeklyPlan = (newClasswork: ClassworkEntry[], newHomework: HomeworkEntry[]) => {
    setClassworkList((prev) => {
      const next = [...newClasswork, ...prev];
      localStorage.setItem(STORAGE_KEYS.CUSTOM_CLASSWORK, JSON.stringify(next));
      return next;
    });
    setHomeworkList((prev) => {
      const next = [...newHomework, ...prev];
      localStorage.setItem(STORAGE_KEYS.CUSTOM_HOMEWORK, JSON.stringify(next));
      return next;
    });
    showToast('تم استيراد وتطبيق الخطة الأسبوعية بنجاح!');
  };

  // Complete data reset / Clean slate
  const handleClearAllData = async () => {
    const confirmed = window.confirm(
      'هل أنتِ متأكدة من تفريغ كافة البيانات؟\n' +
      'سيتم مسح جدول الحصص، والواجبات، والدروس، وكافة ملفات الماتيريال للبدء ببيانات جديدة تماماً.'
    );
    if (!confirmed) return;

    // 1. Clear classwork and homework
    localStorage.removeItem(STORAGE_KEYS.CUSTOM_CLASSWORK);
    localStorage.removeItem(STORAGE_KEYS.CUSTOM_HOMEWORK);
    localStorage.removeItem('nile_planner_tasks_v2');
    setClassworkList([]);
    setHomeworkList([]);

    // 2. Clear timetables
    const emptyTimetables = clearAllStoredTimetables();
    setTimetables(emptyTimetables);

    // 3. Clear all materials from IndexedDB and storage
    await clearAllMaterialsStorage();

    // 4. Clear student progress
    if (userProfile?.mode === 'student' && userProfile.studentName) {
      saveStudentProgress(userProfile.studentName, [], [], currentClass);
    }

    showToast('تم تفريغ كافة البيانات والملفات بنجاح! الأبليكيشن جاهز لبياناتك الجديدة بالكامل.');
  };

  const handlePrint = () => {
    window.print();
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
        onSelectBlock={setCurrentBlock}
        onSelectWeek={setCurrentWeek}
        onOpenAuthModal={() => setIsAuthModalOpen(true)}
        onOpenAdminAuthModal={() => setIsAdminAuthOpen(true)}
        onOpenAdminDashboardModal={() => setIsAdminDashboardOpen(true)}
        onOpenMaterialsModal={() => setIsMaterialsModalOpen(true)}
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
            />
          )}

          {activeTab === 'timetable' && (
            <TimetableGrid
              currentClass={currentClass}
              selectedDay={selectedDay}
              timetables={timetables}
              onUpdateTimetable={(updated) => setTimetables(updated)}
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
          </div>

          <div className="flex items-center gap-4">
            <button
              onClick={() => setIsPlanModalOpen(true)}
              className="text-indigo-600 hover:text-indigo-800 font-semibold inline-flex items-center gap-1.5 transition-colors cursor-pointer"
            >
              <Sparkles className="w-3.5 h-3.5" />
              Smart Plan Classifier
            </button>
            <button
              onClick={handleClearAllData}
              className="text-rose-600 hover:text-rose-800 font-semibold inline-flex items-center gap-1 transition-colors cursor-pointer"
              title="تفريغ كافة البيانات والملفات للبدء من الصفر"
            >
              <Trash2 className="w-3.5 h-3.5" />
              تفريغ كافة البيانات (Clean Slate)
            </button>
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
