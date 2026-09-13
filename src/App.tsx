import React, { useState, useEffect } from 'react';
import { ClassId, SchoolDay, ClassworkEntry, HomeworkEntry, UserProfile } from './types';
import { INITIAL_CLASSWORK, INITIAL_HOMEWORK } from './data/defaultWeeklyPlan';
import { SCHOOL_DAYS, SCHOOL_NAME, SCHOOL_BRANCH } from './data/timetables';
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
import { Sparkles, RotateCcw } from 'lucide-react';

const STORAGE_KEYS = {
  CLASS: 'nile_planner_current_class_v3',
  DAY: 'nile_planner_selected_day_v3',
  WEEK: 'nile_planner_current_week_v3',
};

function getProfileClasswork(profile: UserProfile | null): ClassworkEntry[] {
  if (profile?.mode === 'student' && profile.studentName) {
    const progress = getStudentProgress(profile.studentName);
    const set = new Set(progress.completedClassworkIds);
    return INITIAL_CLASSWORK.map((c) => ({
      ...c,
      completed: set.has(c.id),
    }));
  }
  return INITIAL_CLASSWORK.map((c) => ({
    ...c,
    completed: false,
  }));
}

function getProfileHomework(profile: UserProfile | null): HomeworkEntry[] {
  if (profile?.mode === 'student' && profile.studentName) {
    const progress = getStudentProgress(profile.studentName);
    const set = new Set(progress.completedHomeworkIds);
    return INITIAL_HOMEWORK.map((h) => ({
      ...h,
      completed: set.has(h.id),
    }));
  }
  return INITIAL_HOMEWORK.map((h) => ({
    ...h,
    completed: false,
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

  // Class selection (G2A, G2B, G2C)
  const [currentClass, setCurrentClass] = useState<ClassId>(() => {
    const profile = getActiveUserProfile();
    if (profile?.classId) return profile.classId;
    const saved = localStorage.getItem(STORAGE_KEYS.CLASS);
    return saved === 'G2A' || saved === 'G2B' || saved === 'G2C' ? saved : 'G2B';
  });

  // Current Block (1, 2, 3, 4)
  const [currentBlock, setCurrentBlock] = useState<number>(() => {
    const saved = localStorage.getItem('nile_planner_block');
    return saved ? Number(saved) : 1;
  });

  // Current Week (1, 2, 3, 4)
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

  // Classwork state initialized based on user profile
  const [classworkList, setClassworkList] = useState<ClassworkEntry[]>(() => {
    return getProfileClasswork(getActiveUserProfile());
  });

  // Homework state initialized based on user profile
  const [homeworkList, setHomeworkList] = useState<HomeworkEntry[]>(() => {
    return getProfileHomework(getActiveUserProfile());
  });

  const [toastMsg, setToastMsg] = useState<string | null>(null);
  const [isPlanModalOpen, setIsPlanModalOpen] = useState(false);
  const [isAdminAuthOpen, setIsAdminAuthOpen] = useState(false);
  const [isAdminDashboardOpen, setIsAdminDashboardOpen] = useState(false);
  const [isMaterialsModalOpen, setIsMaterialsModalOpen] = useState(false);

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
    setTimeout(() => setToastMsg(null), 4500);
  };

  // Handle switching user profile (Student vs Guest)
  const handleSelectProfile = (newProfile: UserProfile) => {
    setUserProfile(newProfile);
    setActiveUserProfile(newProfile);

    if (newProfile.classId && newProfile.classId !== currentClass) {
      setCurrentClass(newProfile.classId);
    }

    if (newProfile.mode === 'student' && newProfile.studentName) {
      const progress = getStudentProgress(newProfile.studentName);
      const cwSet = new Set(progress.completedClassworkIds);
      const hwSet = new Set(progress.completedHomeworkIds);

      setClassworkList(
        INITIAL_CLASSWORK.map((c) => ({
          ...c,
          completed: cwSet.has(c.id),
        }))
      );
      setHomeworkList(
        INITIAL_HOMEWORK.map((h) => ({
          ...h,
          completed: hwSet.has(h.id),
        }))
      );
      showToast(`مرحباً يا ${newProfile.studentName}! تم تحميل إنجازاتك وواجباتك المحفوظة.`);
    } else {
      // Guest mode: Reset all checkmarks (transient session, not saved)
      setClassworkList(INITIAL_CLASSWORK.map((c) => ({ ...c, completed: false })));
      setHomeworkList(INITIAL_HOMEWORK.map((h) => ({ ...h, completed: false })));
      showToast('تم الدخول كزائر (تصفح فقط - لن يتم حفظ علامات الإنجاز بعد إغلاق المتصفح).');
    }
  };

  // Classwork handlers
  const handleToggleClasswork = (id: string) => {
    setClassworkList((prev) => {
      const updated = prev.map((c) => (c.id === id ? { ...c, completed: !c.completed } : c));
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
      if (userProfile?.mode === 'student' && userProfile.studentName) {
        const completedCwIds = next.filter((c) => c.completed).map((c) => c.id);
        const completedHwIds = homeworkList.filter((h) => h.completed).map((h) => h.id);
        saveStudentProgress(userProfile.studentName, completedCwIds, completedHwIds, currentClass);
      }
      return next;
    });
    showToast('Classwork saved successfully!');
  };

  // Homework handlers
  const handleToggleHomework = (id: string) => {
    setHomeworkList((prev) => {
      const updated = prev.map((h) => (h.id === id ? { ...h, completed: !h.completed } : h));
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
      if (userProfile?.mode === 'student' && userProfile.studentName) {
        const completedCwIds = classworkList.filter((c) => c.completed).map((c) => c.id);
        const completedHwIds = next.filter((h) => h.completed).map((h) => h.id);
        saveStudentProgress(userProfile.studentName, completedCwIds, completedHwIds, currentClass);
      }
      return next;
    });
    showToast('New homework assignment added!');
  };

  const handleDeleteHomework = (id: string) => {
    setHomeworkList((prev) => {
      const next = prev.filter((h) => h.id !== id);
      if (userProfile?.mode === 'student' && userProfile.studentName) {
        const completedCwIds = classworkList.filter((c) => c.completed).map((c) => c.id);
        const completedHwIds = next.filter((h) => h.completed).map((h) => h.id);
        saveStudentProgress(userProfile.studentName, completedCwIds, completedHwIds, currentClass);
      }
      return next;
    });
    showToast('Assignment removed.');
  };

  const handleApplyWeeklyPlan = (newClasswork: ClassworkEntry[], newHomework: HomeworkEntry[]) => {
    setClassworkList((prev) => [...newClasswork, ...prev]);
    setHomeworkList((prev) => [...newHomework, ...prev]);
    showToast('Weekly plan imported successfully!');
  };

  // Reset to sample plan
  const handleResetToDefaults = () => {
    if (confirm('Reset to standard Grade 2 Nile International School weekly plan?')) {
      setClassworkList(INITIAL_CLASSWORK.map((c) => ({ ...c, completed: false })));
      setHomeworkList(INITIAL_HOMEWORK.map((h) => ({ ...h, completed: false })));
      if (userProfile?.mode === 'student' && userProfile.studentName) {
        saveStudentProgress(userProfile.studentName, [], [], currentClass);
      }
      showToast('Reset to default sample plan.');
    }
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
        onSelectClass={setCurrentClass}
        currentBlock={currentBlock}
        onSelectBlock={(b) => {
          setCurrentBlock(b);
          localStorage.setItem('nile_planner_block', String(b));
          showToast(`Switched to Block ${b}`);
        }}
        currentWeek={currentWeek}
        onSelectWeek={(w) => {
          setCurrentWeek(w);
          localStorage.setItem(STORAGE_KEYS.WEEK, String(w));
          showToast(`Switched to Week ${w}`);
        }}
        activeTab={activeTab}
        onSelectTab={setActiveTab}
        selectedDay={selectedDay}
        onSelectDay={setSelectedDay}
        onPrint={handlePrint}
        pendingHomeworkCount={pendingHomeworkCount}
        userProfile={userProfile}
        onOpenProfileModal={() => setIsAuthModalOpen(true)}
        onOpenAdminAuth={() => setIsAdminAuthOpen(true)}
        onOpenMaterials={() => setIsMaterialsModalOpen(true)}
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
            />
          )}

          {activeTab === 'timetable' && (
            <TimetableGrid
              currentClass={currentClass}
              selectedDay={selectedDay}
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
            <span>Classes: G2A, G2B, G2C</span>
          </div>

          <div className="flex items-center gap-4">
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
      />

      {/* Materials Modal */}
      <MaterialsModal
        isOpen={isMaterialsModalOpen}
        onClose={() => setIsMaterialsModalOpen(false)}
        currentClass={currentClass}
        currentBlock={currentBlock}
        currentWeek={currentWeek}
      />
    </div>
  );
}
