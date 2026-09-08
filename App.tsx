import React, { useState, useEffect } from 'react';
import {
  DayOfWeek,
  GradeSection,
  PlanTask,
  StudentProfile,
  Subject,
  Timetable,
  UploadedPlanFile,
  UserRole,
  VisitorStatsSummary,
} from './types';
import { Eye, GraduationCap, X } from 'lucide-react';
import {
  getTodayDayOfWeek,
  loadSavedGradeSection,
  loadSavedStudent,
  loadSavedSubjects,
  loadSavedTasks,
  loadSavedTimetable,
  loadSavedUploadedFiles,
  loadWeekTitle,
  resetAllDataToDefault,
  saveGradeSection,
  saveStudent,
  saveTasks,
  saveTimetable,
  saveUploadedFiles,
  saveWeekTitle,
  isStudentRemembered,
  getSavedStudentName,
  isUserLoggedIn,
  clearStudentLogin,
  WeeklyPlanArchiveEntry,
  loadWeeklyPlansArchive,
  saveWeeklyPlansArchive,
  getActiveWeeklyPlanId,
  setActiveWeeklyPlanId,
  getLatestWeeklyPlan,
  addOrUpdateWeeklyPlanInArchive,
  deleteWeeklyPlanFromArchive,
  isAdminLoggedIn,
  setAdminLoggedIn,
  clearAdminLogin,
  fetchGlobalPlanFromServer,
  saveGlobalPlanToServer,
  getUserRole,
  saveUserRole,
  clearUserRole,
  hasStoredUserRole,
} from './utils/storage';
import {
  resolveCurrentUserId,
  getUserProgress,
  setUserTaskDone,
  setUserTaskPersonalNote,
  getUserPersonalTasks,
  saveUserPersonalTask,
  deleteUserPersonalTask,
  mergePlanWithUserProgress,
} from './utils/userProgressStorage';
import { DEFAULT_TIMETABLE, GRADE_TIMETABLES } from './data/defaultData';
import { Navbar } from './components/Navbar';
import { TodayView } from './components/TodayView';
import { WeeklyPlanView } from './components/WeeklyPlanView';
import { TimetableView } from './components/TimetableView';
import { TaskModal } from './components/TaskModal';
import { SmartPasteModal } from './components/SmartPasteModal';
import { EditProfileModal } from './components/EditProfileModal';
import { QuickTimetableModal } from './components/QuickTimetableModal';
import { WeekDaysPickerModal } from './components/WeekDaysPickerModal';
import { UploadPlanFilesModal } from './components/UploadPlanFilesModal';
import { WeeklyPlanArchiveModal } from './components/WeeklyPlanArchiveModal';
import { AdminAuthModal } from './components/AdminAuthModal';
import { AppEntryPortalModal } from './components/AppEntryPortalModal';
import { VisitorStatsModal } from './components/VisitorStatsModal';
import { ClassSelectorModal } from './components/ClassSelectorModal';
import { MaterialsModal } from './components/MaterialsModal';
import { WeekPlanSelectorBar } from './components/WeekPlanSelectorBar';
import { triggerAllDoneCelebration } from './utils/celebration';
import {
  fetchVisitorStats,
  pingVisitorSession,
  registerGuestVisitor,
  getStoredVisitorName,
} from './utils/visitorTracker';

export default function App() {
  const [selectedSection, setSelectedSection] = useState<GradeSection>(() => {
    const saved = loadSavedGradeSection();
    if (saved) return saved;
    const studentSec = loadSavedStudent().section;
    if (studentSec === '2A' || studentSec === '2B' || studentSec === '2C') return studentSec;
    return '2A';
  });

  // Admin & Security State
  const [isAdmin, setIsAdmin] = useState<boolean>(() => isAdminLoggedIn());
  const [isAdminAuthModalOpen, setIsAdminAuthModalOpen] = useState(false);
  const [adminReason, setAdminReason] = useState<{ title: string; message: string } | undefined>();

  // User Role State: 'admin' | 'student' | 'visitor'
  const [userRole, setUserRole] = useState<UserRole>(() => {
    if (isAdminLoggedIn()) return 'admin';
    return getUserRole();
  });
  const [isEntryPortalOpen, setIsEntryPortalOpen] = useState<boolean>(() => !hasStoredUserRole());
  const [visitorNoticeModal, setVisitorNoticeModal] = useState<{ isOpen: boolean; message: string }>({
    isOpen: false,
    message: '',
  });

  // Weekly Plan Archive & Memory State
  const [archive, setArchive] = useState<WeeklyPlanArchiveEntry[]>(() => loadWeeklyPlansArchive());
  const [activePlanId, setActivePlanIdState] = useState<string>(() => {
    const loaded = loadWeeklyPlansArchive();
    const latest = getLatestWeeklyPlan(loaded);
    return latest?.id || getActiveWeeklyPlanId();
  });
  const [isArchiveModalOpen, setIsArchiveModalOpen] = useState(false);

  // Active Plan Metadata
  const activePlan = archive.find((p) => p.id === activePlanId) || archive[0];
  const activeBlockNumber = activePlan?.blockNumber || 1;
  const activeWeekNumber = activePlan?.weekNumber || 1;

  const [student, setStudent] = useState<StudentProfile>(() => {
    const s = loadSavedStudent();
    const savedSec = loadSavedGradeSection();
    if (savedSec) {
      return { ...s, section: savedSec, grade: `Grade ${savedSec}` };
    }
    return s;
  });

  // Official School Weekly Plan Tasks (Global Storage)
  const [officialTasks, setOfficialTasks] = useState<PlanTask[]>(() => {
    const savedSec = loadSavedGradeSection() || '2A';
    const initialArchive = loadWeeklyPlansArchive();
    const activeId = getActiveWeeklyPlanId();
    const current = initialArchive.find((p) => p.id === activeId) || initialArchive[0];
    if (current?.tasksBySection?.[savedSec] && current.tasksBySection[savedSec].length > 0) {
      return current.tasksBySection[savedSec];
    }
    return loadSavedTasks(savedSec);
  });

  // User Role Storage: Current user ID, completion progress, and personal notes
  const currentUserId = resolveCurrentUserId(student.name);
  const [userProgressMap, setUserProgressMap] = useState(() => getUserProgress(currentUserId));
  const [personalTasks, setPersonalTasks] = useState(() => getUserPersonalTasks(currentUserId));

  // Whenever student changes/logs in, re-sync their personal state from localStorage
  useEffect(() => {
    setUserProgressMap(getUserProgress(currentUserId));
    setPersonalTasks(getUserPersonalTasks(currentUserId));
  }, [currentUserId]);

  // Derived tasks for display: Official school tasks overlayed with user's personal progress & notes
  const tasks = React.useMemo(() => {
    return mergePlanWithUserProgress(officialTasks, currentUserId);
  }, [officialTasks, currentUserId, userProgressMap, personalTasks]);

  const [timetable, setTimetable] = useState<Timetable>(() => {
    const savedSec = loadSavedGradeSection();
    return loadSavedTimetable(savedSec || '2A');
  });
  const [subjects] = useState<Subject[]>(() => loadSavedSubjects());
  const [weekTitle, setWeekTitle] = useState<string>(() => {
    const initialArchive = loadWeeklyPlansArchive();
    const activeId = getActiveWeeklyPlanId();
    const current = initialArchive.find((p) => p.id === activeId) || initialArchive[0];
    return current?.title || loadWeekTitle();
  });
  const [uploadedFiles, setUploadedFiles] = useState<UploadedPlanFile[]>(() => {
    const initialArchive = loadWeeklyPlansArchive();
    const activeId = getActiveWeeklyPlanId();
    const current = initialArchive.find((p) => p.id === activeId) || initialArchive[0];
    if (current?.uploadedFiles && current.uploadedFiles.length > 0) {
      return current.uploadedFiles;
    }
    return loadSavedUploadedFiles();
  });

  // Keep browser document title updated with current active block and week
  useEffect(() => {
    const title = activePlan?.title || `Block ${activeBlockNumber} - Week ${activeWeekNumber}`;
    document.title = `${title} | Studying Weekly Plan`;
  }, [activePlan, activeBlockNumber, activeWeekNumber]);

  // Class Selection Modal (Initial first-entry prompt or triggered from button)
  const [isClassSelectorOpen, setIsClassSelectorOpen] = useState(false);
  const [showInitialClassPrompt, setShowInitialClassPrompt] = useState(() => {
    return loadSavedGradeSection() === null;
  });

  // Navigation tabs
  const [currentTab, setCurrentTab] = useState<'today' | 'weekly' | 'timetable'>('today');

  // Today Day & Selected Day in TodayView
  const todayDay = getTodayDayOfWeek();
  const [selectedDay, setSelectedDay] = useState<DayOfWeek>(() => {
    // School week in Egypt begins Sunday. If today is Friday/Saturday, default to Sunday
    if (todayDay === 'friday' || todayDay === 'saturday') return 'sunday';
    return todayDay;
  });

  // Modal States
  const [isTaskModalOpen, setIsTaskModalOpen] = useState(false);
  const [editingTask, setEditingTask] = useState<PlanTask | null>(null);
  const [modalDefaultDay, setModalDefaultDay] = useState<DayOfWeek>(selectedDay);
  const [modalDefaultSubjectId, setModalDefaultSubjectId] = useState<string | undefined>();
  const [isSmartPasteOpen, setIsSmartPasteOpen] = useState(false);
  const [isEditProfileOpen, setIsEditProfileOpen] = useState(false);
  const [isUploadModalOpen, setIsUploadModalOpen] = useState(false);
  const [isMaterialsModalOpen, setIsMaterialsModalOpen] = useState(false);

  // Requested dedicated popups
  const [isTimetableModalOpen, setIsTimetableModalOpen] = useState(false);
  const [isWeekDaysModalOpen, setIsWeekDaysModalOpen] = useState(false);

  // Visitor & Email Tracking States
  const [isVisitorStatsOpen, setIsVisitorStatsOpen] = useState(false);
  const [visitorStats, setVisitorStats] = useState<VisitorStatsSummary | null>(null);

  // Authentication & Visitor Mode State
  const [isLoggedIn, setIsLoggedIn] = useState<boolean>(() => isUserLoggedIn());

  const handleLogin = () => {
    setIsEntryPortalOpen(true);
  };

  const handleLogout = () => {
    clearStudentLogin();
    clearAdminLogin();
    clearUserRole();
    saveUserRole('visitor');
    setUserRole('visitor');
    setIsAdmin(false);
    setIsLoggedIn(false);
    setStudent((prev) => ({
      ...prev,
      name: 'زائر',
    }));
  };

  // Sync visitor stats & session tracking
  useEffect(() => {
    const refreshStats = () => {
      fetchVisitorStats().then((data) => {
        if (data) setVisitorStats(data);
      });
    };
    refreshStats();

    // Check if student login is remembered or user role is stored
    const isRemembered = isStudentRemembered();
    const savedStudentName = getSavedStudentName();
    const storedName = getStoredVisitorName();
    const activeStudentName = savedStudentName || storedName;

    if (hasStoredUserRole()) {
      const storedRole = getUserRole();
      setUserRole(storedRole);
      if (storedRole === 'admin') {
        setIsAdmin(true);
        setAdminLoggedIn(true);
      } else if (storedRole === 'student' && activeStudentName) {
        pingVisitorSession(activeStudentName, selectedSection);
        setStudent((prev) => ({
          ...prev,
          name: activeStudentName,
        }));
        setIsLoggedIn(true);
      } else {
        // Visitor role
        setIsLoggedIn(false);
        registerGuestVisitor(selectedSection);
      }
    } else {
      setIsLoggedIn(false);
      registerGuestVisitor(selectedSection);
      setIsEntryPortalOpen(true);
    }
  }, [selectedSection]);

  // Load Global Plan from server (Global Storage) on mount
  useEffect(() => {
    fetchGlobalPlanFromServer().then((serverPlan) => {
      if (serverPlan) {
        if (serverPlan.archive && serverPlan.archive.length > 0) {
          setArchive(serverPlan.archive);
          saveWeeklyPlansArchive(serverPlan.archive);

          // By default, open on the latest week plan added (current Friday week)
          const latest = getLatestWeeklyPlan(serverPlan.archive);
          const chosen = serverPlan.activePlanId
            ? serverPlan.archive.find((p) => p.id === serverPlan.activePlanId) || latest
            : latest;

          if (chosen) {
            setActivePlanIdState(chosen.id);
            setActiveWeeklyPlanId(chosen.id);
            setWeekTitle(chosen.title);
            saveWeekTitle(chosen.title);
            const secTasks = chosen.tasksBySection?.[selectedSection] || [];
            setOfficialTasks(secTasks);
            saveTasks(secTasks, selectedSection);
            if (chosen.uploadedFiles && chosen.uploadedFiles.length > 0) {
              setUploadedFiles(chosen.uploadedFiles);
              saveUploadedFiles(chosen.uploadedFiles);
            }
          }
        } else {
          if (serverPlan.activePlanId) {
            setActivePlanIdState(serverPlan.activePlanId);
            setActiveWeeklyPlanId(serverPlan.activePlanId);
          }
          if (serverPlan.weekTitle) {
            setWeekTitle(serverPlan.weekTitle);
            saveWeekTitle(serverPlan.weekTitle);
          }
          if (serverPlan.uploadedFiles && serverPlan.uploadedFiles.length > 0) {
            setUploadedFiles(serverPlan.uploadedFiles);
            saveUploadedFiles(serverPlan.uploadedFiles);
          }
          if (serverPlan.tasksBySection && serverPlan.tasksBySection[selectedSection]) {
            setOfficialTasks(serverPlan.tasksBySection[selectedSection]);
            saveTasks(serverPlan.tasksBySection[selectedSection], selectedSection);
          }
        }
      }
    });
  }, []);

  // Sync official tasks to localStorage
  useEffect(() => {
    saveTasks(officialTasks, selectedSection);
  }, [officialTasks, selectedSection]);

  useEffect(() => {
    saveTimetable(timetable, selectedSection);
  }, [timetable, selectedSection]);

  useEffect(() => {
    saveStudent(student);
  }, [student]);

  useEffect(() => {
    saveWeekTitle(weekTitle);
  }, [weekTitle]);

  useEffect(() => {
    saveUploadedFiles(uploadedFiles);
  }, [uploadedFiles]);

  const [pendingAdminAction, setPendingAdminAction] = useState<(() => void) | null>(null);

  // Admin actions
  const handleAdminSuccess = () => {
    setIsAdmin(true);
    setAdminLoggedIn(true);
    saveUserRole('admin');
    setUserRole('admin');
    setIsAdminAuthModalOpen(false);
    if (pendingAdminAction) {
      pendingAdminAction();
      setPendingAdminAction(null);
    }
  };

  const handleAdminLogout = () => {
    setIsAdmin(false);
    clearAdminLogin();
    saveUserRole('visitor');
    setUserRole('visitor');
  };

  const handleOpenAdminLogin = (title?: string, message?: string, onAuthenticated?: () => void) => {
    setAdminReason(title ? { title, message: message || '' } : undefined);
    setPendingAdminAction(() => onAuthenticated || null);
    setIsAdminAuthModalOpen(true);
  };

  // Sync official tasks to active plan in archive and server Global Storage
  const syncTasksWithActivePlan = (
    updatedOfficialTasks: PlanTask[],
    targetSec: GradeSection = selectedSection
  ) => {
    setArchive((prevArchive) => {
      const next = prevArchive.map((plan) => {
        if (plan.id === activePlanId) {
          return {
            ...plan,
            tasksBySection: {
              ...plan.tasksBySection,
              [targetSec]: updatedOfficialTasks,
            },
          };
        }
        return plan;
      });
      saveWeeklyPlansArchive(next);

      // If Admin, sync to Global Storage on server immediately (reflects for all users)
      if (isAdmin) {
        const currentActive = next.find((p) => p.id === activePlanId) || next[0];
        if (currentActive) {
          saveGlobalPlanToServer(
            {
              activePlanId: currentActive.id,
              weekTitle: currentActive.title,
              activeBlockNumber: currentActive.blockNumber,
              activeWeekNumber: currentActive.weekNumber,
              tasksBySection: currentActive.tasksBySection,
              archive: next,
              uploadedFiles: currentActive.uploadedFiles || [],
              lastUpdated: Date.now(),
              updatedBy: 'admin',
            },
            '1111'
          ).catch((e) => console.warn('Notice: Background sync global plan to server:', e));
        }
      }

      return next;
    });
  };

  // Switching & Navigating Archives
  const handleSelectPlan = (planId: string) => {
    const selected = archive.find((p) => p.id === planId);
    if (!selected) return;
    setActivePlanIdState(planId);
    setActiveWeeklyPlanId(planId);
    setWeekTitle(selected.title);
    const secTasks = selected.tasksBySection?.[selectedSection] || [];
    setOfficialTasks(secTasks);
    saveTasks(secTasks, selectedSection);
    if (selected.uploadedFiles && selected.uploadedFiles.length > 0) {
      setUploadedFiles(selected.uploadedFiles);
    }
  };

  const handleSetPlanAsCurrent = (planId: string) => {
    const updated = archive.map((p) => ({
      ...p,
      isCurrent: p.id === planId,
    }));
    saveWeeklyPlansArchive(updated);
    setArchive(updated);
    handleSelectPlan(planId);

    // If Admin, sync active plan to Global Storage
    if (isAdmin) {
      const target = updated.find((p) => p.id === planId);
      if (target) {
        saveGlobalPlanToServer(
          {
            activePlanId: target.id,
            weekTitle: target.title,
            activeBlockNumber: target.blockNumber,
            activeWeekNumber: target.weekNumber,
            tasksBySection: target.tasksBySection,
            archive: updated,
            uploadedFiles: target.uploadedFiles || [],
            lastUpdated: Date.now(),
            updatedBy: 'admin',
          },
          '1111'
        ).catch((e) => console.warn('Sync server global plan error:', e));
      }
    }
  };

  const handleDeletePlan = (planId: string) => {
    const updated = deleteWeeklyPlanFromArchive(planId);
    setArchive(updated);
    if (activePlanId === planId) {
      const fallback = updated[0];
      if (fallback) {
        handleSelectPlan(fallback.id);
      }
    }
  };

  // Section switcher handler
  const handleSelectSection = (newSection: GradeSection) => {
    // Save current section official tasks first
    saveTasks(officialTasks, selectedSection);
    syncTasksWithActivePlan(officialTasks, selectedSection);

    setSelectedSection(newSection);
    saveGradeSection(newSection);
    setStudent((prev) => ({
      ...prev,
      section: newSection,
      grade: `Grade ${newSection}`,
    }));
    const loadedTimetable = loadSavedTimetable(newSection);
    setTimetable(loadedTimetable);

    // Retrieve tasks for new section from active plan if present
    const currActive = archive.find((p) => p.id === activePlanId) || archive[0];
    if (currActive?.tasksBySection?.[newSection] && currActive.tasksBySection[newSection].length > 0) {
      setOfficialTasks(currActive.tasksBySection[newSection]);
      saveTasks(currActive.tasksBySection[newSection], newSection);
    } else {
      const loadedTasks = loadSavedTasks(newSection);
      setOfficialTasks(loadedTasks);
    }
    setShowInitialClassPrompt(false);
    setIsClassSelectorOpen(false);
  };

  // Handler: User Role - Toggle Task Done / Not Done (Strictly saved in localStorage under user_id)
  const handleToggleDone = (taskId: string) => {
    if (userRole === 'visitor') {
      setVisitorNoticeModal({
        isOpen: true,
        message: 'حساب الزائر مخصص للتصفح والعرض فقط دون إمكانية التعديل 👁️. للدخول كطالب وتحديد المهام المنجزة وحفظ تقدمك على جهازك، يرجى تسجيل الدخول كطالب.',
      });
      return;
    }

    const currentTask = tasks.find((t) => t.id === taskId);
    const nextDone = !(currentTask?.isDone);
    const updatedMap = setUserTaskDone(currentUserId, taskId, nextDone);
    setUserProgressMap(updatedMap);

    if (nextDone) {
      // Check if all tasks of the selected day are now completed
      const dayTasks = tasks
        .map((t) => (t.id === taskId ? { ...t, isDone: true } : t))
        .filter((t) => t.day === selectedDay && (!t.section || t.section === selectedSection));
      if (dayTasks.length > 0 && dayTasks.every((t) => t.isDone)) {
        setTimeout(() => triggerAllDoneCelebration(), 250);
      }
    }
  };

  // Handler: User Role - Save Personal Student Note (Strictly in localStorage under user_id)
  const handleSavePersonalNote = (taskId: string, note: string) => {
    if (userRole === 'visitor') {
      setVisitorNoticeModal({
        isOpen: true,
        message: 'حساب الزائر مخصص للتصفح والعرض فقط دون إمكانية التعديل 👁️. لإضافة ملاحظاتك الخاصة على المهام وحفظها على جهازك، يرجى تسجيل الدخول كطالب.',
      });
      return;
    }

    const updatedMap = setUserTaskPersonalNote(currentUserId, taskId, note);
    setUserProgressMap(updatedMap);
  };

  // Handler: Save or Update Task (Admin: Global Storage | User: Personal localStorage)
  const handleSaveTask = (taskData: Omit<PlanTask, 'id' | 'createdAt'> & { id?: string }) => {
    if (userRole === 'visitor') {
      setVisitorNoticeModal({
        isOpen: true,
        message: 'حساب الزائر مخصص للتصفح والعرض فقط دون إمكانية التعديل 👁️. لإضافة أو تعديل مهام خاصة بك، يرجى تسجيل الدخول كطالب أو كأدمن.',
      });
      return;
    }

    if (!isAdmin) {
      // Check if editing an existing official school task
      const isOfficial = officialTasks.some((t) => t.id === taskData.id);
      if (isOfficial) {
        handleOpenAdminLogin(
          'تعديل خطة المدرسة الرسمية',
          'تعديل مهام الخطة الأسبوعية الرسمية لجميع الطلاب مقتصر على المشرف العام (الأدمن). يمكنك كتابة ملاحظاتك الخاصة على المهمة في جهازك بدون رمز مرور.',
          () => {
            setOfficialTasks((prev) => {
              const updated = prev.map((t) =>
                t.id === taskData.id
                  ? {
                      ...t,
                      day: taskData.day,
                      subjectId: taskData.subjectId,
                      type: taskData.type,
                      title: taskData.title,
                      details: taskData.details,
                      pages: taskData.pages,
                    }
                  : t
              );
              syncTasksWithActivePlan(updated);
              return updated;
            });
          }
        );
        return;
      }

      // User Role: Add or edit custom personal task in student's localStorage
      const pTask: PlanTask = {
        id: taskData.id || `ptask-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`,
        day: taskData.day,
        subjectId: taskData.subjectId,
        section: taskData.section || selectedSection,
        period: taskData.period,
        type: taskData.type,
        title: taskData.title,
        details: taskData.details,
        pages: taskData.pages,
        isDone: Boolean(taskData.isDone),
        personalNotes: taskData.personalNotes,
        isPersonalTask: true,
        createdAt: Date.now(),
        completedAt: taskData.isDone ? Date.now() : undefined,
      };
      saveUserPersonalTask(currentUserId, pTask);
      setPersonalTasks(getUserPersonalTasks(currentUserId));
      return;
    }

    // Admin Role: Modifies official school tasks and syncs to Global Storage
    if (taskData.id) {
      setOfficialTasks((prev) => {
        const updated = prev.map((t) =>
          t.id === taskData.id
            ? {
                ...t,
                day: taskData.day,
                subjectId: taskData.subjectId,
                type: taskData.type,
                title: taskData.title,
                details: taskData.details,
                pages: taskData.pages,
              }
            : t
        );
        syncTasksWithActivePlan(updated);
        return updated;
      });
    } else {
      const newTask: PlanTask = {
        id: `task-${Date.now()}-${Math.random().toString(36).substring(2, 9)}`,
        day: taskData.day,
        subjectId: taskData.subjectId,
        section: taskData.section || selectedSection,
        period: taskData.period,
        type: taskData.type,
        title: taskData.title,
        details: taskData.details,
        pages: taskData.pages,
        isDone: false,
        createdAt: Date.now(),
      };
      setOfficialTasks((prev) => {
        const updated = [newTask, ...prev];
        syncTasksWithActivePlan(updated);
        return updated;
      });
    }
  };

  // Handler: Delete Task (Admin: Official Plan | User: Personal tasks only)
  const handleDeleteTask = (taskId: string) => {
    if (userRole === 'visitor') {
      setVisitorNoticeModal({
        isOpen: true,
        message: 'حساب الزائر مخصص للتصفح والعرض فقط دون إمكانية التعديل 👁️. حذف المهام متاح للأدمن (للخطة العامة) أو الطالب (لمهامه الخاصة).',
      });
      return;
    }

    const isPersonal = personalTasks.some((t) => t.id === taskId);
    if (isPersonal) {
      deleteUserPersonalTask(currentUserId, taskId);
      setPersonalTasks(getUserPersonalTasks(currentUserId));
      return;
    }

    if (!isAdmin) {
      handleOpenAdminLogin(
        'حذف مهمة من الخطة الرسمية',
        'حذف مهام الخطة الأسبوعية الرسمية مقتصر على المشرف العام (الأدمن)',
        () => {
          setOfficialTasks((prev) => {
            const updated = prev.filter((t) => t.id !== taskId);
            syncTasksWithActivePlan(updated);
            return updated;
          });
        }
      );
      return;
    }

    setOfficialTasks((prev) => {
      const updated = prev.filter((t) => t.id !== taskId);
      syncTasksWithActivePlan(updated);
      return updated;
    });
  };

  // Handler: Import Parsed Tasks from Smart Paste (Admin: Global | User: Personal)
  const handleImportTasks = (newTasksList: Omit<PlanTask, 'id' | 'createdAt'>[]) => {
    if (userRole === 'visitor') {
      setVisitorNoticeModal({
        isOpen: true,
        message: 'حساب الزائر مخصص للتصفح والعرض فقط دون إمكانية التعديل 👁️. لإضافة مهام إلى خطتك، يرجى تسجيل الدخول كطالب أو كأدمن.',
      });
      return;
    }

    const formatted: PlanTask[] = newTasksList.map((item, index) => ({
      ...item,
      section: item.section || selectedSection,
      id: `task-imported-${Date.now()}-${index}`,
      createdAt: Date.now(),
    }));

    if (isAdmin) {
      setOfficialTasks((prev) => {
        const updated = [...formatted, ...prev];
        syncTasksWithActivePlan(updated);
        return updated;
      });
    } else {
      formatted.forEach((t) => saveUserPersonalTask(currentUserId, t));
      setPersonalTasks(getUserPersonalTasks(currentUserId));
    }
  };

  // Handler: Apply New Weekly Plan (Admin Role -> Global Storage reflects for all users)
  const handleApplyNewWeeklyPlan = (
    newTasks: PlanTask[],
    newWeekTitle: string,
    mode: 'keep_pending_and_add' | 'replace' | 'append',
    newFiles: UploadedPlanFile[],
    blockNumber: number,
    weekNumber: number,
    targetSection: 'all' | GradeSection,
    setAsCurrent: boolean
  ) => {
    let finalSectionTasks: PlanTask[] = [];
    if (mode === 'keep_pending_and_add') {
      const carriedOverPendingTasks: PlanTask[] = officialTasks
        .filter((t) => {
          const userItem = userProgressMap[t.id];
          return !userItem?.isDone;
        })
        .map((t) => ({
          ...t,
          isCarriedOver: true,
          previousWeekNote: 'مهمة متبقية من الأسبوع الماضي لم تُنجز',
        }));
      finalSectionTasks = [...carriedOverPendingTasks, ...newTasks];
    } else if (mode === 'replace') {
      finalSectionTasks = newTasks;
    } else {
      finalSectionTasks = [...officialTasks, ...newTasks];
    }

    const newPlanId = `plan-b${blockNumber}-w${weekNumber}-${Date.now()}`;
    const newEntry: WeeklyPlanArchiveEntry = {
      id: newPlanId,
      blockNumber,
      weekNumber,
      title: newWeekTitle,
      createdAt: Date.now(),
      isCurrent: setAsCurrent,
      uploadedFiles: newFiles,
      tasksBySection: {
        '2A': targetSection === 'all' || targetSection === '2A' ? finalSectionTasks : (activePlan?.tasksBySection?.['2A'] || []),
        '2B': targetSection === 'all' || targetSection === '2B' ? finalSectionTasks : (activePlan?.tasksBySection?.['2B'] || []),
        '2C': targetSection === 'all' || targetSection === '2C' ? finalSectionTasks : (activePlan?.tasksBySection?.['2C'] || []),
      },
    };

    const updatedArchive = addOrUpdateWeeklyPlanInArchive(newEntry);
    setArchive(updatedArchive);

    if (setAsCurrent) {
      setActiveWeeklyPlanId(newPlanId);
      setActivePlanIdState(newPlanId);
      setWeekTitle(newWeekTitle);
      setOfficialTasks(finalSectionTasks);
      saveTasks(finalSectionTasks, selectedSection);
    }

    if (newFiles.length > 0) {
      setUploadedFiles((prev) => [...newFiles, ...prev]);
    }

    // Save to Global Storage on Server (Admin Role - Password 1111)
    saveGlobalPlanToServer(
      {
        activePlanId: newPlanId,
        weekTitle: newWeekTitle,
        activeBlockNumber: blockNumber,
        activeWeekNumber: weekNumber,
        tasksBySection: newEntry.tasksBySection,
        archive: updatedArchive,
        uploadedFiles: newFiles,
        lastUpdated: Date.now(),
        updatedBy: 'admin',
      },
      '1111'
    ).catch((err) => console.warn('Notice: Background sync global plan error:', err));

    setTimeout(() => triggerAllDoneCelebration(), 200);
  };

  // Open Task Modal for a specific day and optional subject
  const handleOpenAddTask = (day?: DayOfWeek, subjectId?: string) => {
    if (userRole === 'visitor') {
      setVisitorNoticeModal({
        isOpen: true,
        message: 'حساب الزائر مخصص للتصفح والعرض فقط دون إمكانية التعديل 👁️. لإضافة مهام خاصة بك (كطالب) أو تعديل الخطة الرسمية (كأدمن)، يرجى تسجيل الدخول.',
      });
      return;
    }
    setEditingTask(null);
    setModalDefaultDay(day || selectedDay);
    setModalDefaultSubjectId(subjectId);
    setIsTaskModalOpen(true);
  };

  const handleOpenEditTask = (task: PlanTask) => {
    if (userRole === 'visitor') {
      setVisitorNoticeModal({
        isOpen: true,
        message: 'حساب الزائر مخصص للتصفح والعرض فقط دون إمكانية التعديل 👁️. لتعديل مهامك الخاصة أو كتابة الملاحظات، يرجى تسجيل الدخول كطالب.',
      });
      return;
    }
    setEditingTask(task);
    setModalDefaultDay(task.day);
    setModalDefaultSubjectId(task.subjectId);
    setIsTaskModalOpen(true);
  };

  // Reset to original defaults for current section
  const handleResetData = () => {
    if (
      window.confirm(
        `هل تريد بالتأكيد استعادة بيانات فصل ${selectedSection} الأصلية وخطط المواد المسجلة؟`
      )
    ) {
      resetAllDataToDefault();
      window.location.reload();
    }
  };

  const handleResetTimetable = () => {
    if (window.confirm(`هل تريد استعادة جدول الحصص الأسبوعي الرسمي لفصل ${selectedSection}؟`)) {
      const original = GRADE_TIMETABLES[selectedSection] || DEFAULT_TIMETABLE;
      setTimetable(original);
    }
  };

  // Counts for today badge
  const todayTasks = tasks.filter((t) => t.day === selectedDay && (!t.section || t.section === selectedSection));
  const todayPendingCount = todayTasks.filter((t) => !t.isDone).length;
  const todayCompletedCount = todayTasks.filter((t) => t.isDone).length;

  return (
    <div className="min-h-screen bg-[#F8FAFC] text-slate-900 flex flex-col md:flex-row font-sans selection:bg-indigo-100 selection:text-indigo-900">
      {/* Sidebar (Desktop) / Header (Mobile) */}
      <Navbar
        currentTab={currentTab}
        onSelectTab={setCurrentTab}
        student={student}
        selectedSection={selectedSection}
        onSelectSection={handleSelectSection}
        onOpenClassSelector={() => setIsClassSelectorOpen(true)}
        onOpenEditProfile={() => setIsEditProfileOpen(true)}
        onOpenAddTask={() => handleOpenAddTask(selectedDay)}
        onOpenSmartPaste={() => setIsSmartPasteOpen(true)}
        onOpenTimetableModal={() => setIsTimetableModalOpen(true)}
        onOpenWeekDaysModal={() => setIsWeekDaysModalOpen(true)}
        onOpenUploadModal={() => setIsUploadModalOpen(true)}
        onOpenArchiveModal={() => setIsArchiveModalOpen(true)}
        userRole={userRole}
        onOpenRoleSwitch={() => setIsEntryPortalOpen(true)}
        isAdmin={isAdmin}
        onOpenAdminLogin={() =>
          handleOpenAdminLogin(
            'لوحة تحكم الأدمن',
            'رفع وتحميل وإدارة ملفات الخطط والشيتات مقتصر على المشرف العام (الأدمن)',
            () => setIsUploadModalOpen(true)
          )
        }
        activeBlockNumber={activeBlockNumber}
        activeWeekNumber={activeWeekNumber}
        onOpenVisitorStats={() => setIsVisitorStatsOpen(true)}
        visitorStats={visitorStats}
        onResetData={handleResetData}
        todayPendingCount={todayPendingCount}
        todayCompletedCount={todayCompletedCount}
        isLoggedIn={isLoggedIn}
        onLogin={handleLogin}
        onLogout={handleLogout}
      />

      {/* Main Content Area */}
      <main className="flex-1 flex flex-col p-4 sm:p-6 lg:p-10 relative overflow-y-auto w-full max-w-7xl mx-auto space-y-4">
        {/* Weekly Plan & Archive Selector Bar with Dropdown Select */}
        <WeekPlanSelectorBar
          archive={archive}
          activePlanId={activePlanId}
          onSelectPlan={handleSelectPlan}
          onOpenArchiveModal={() => setIsArchiveModalOpen(true)}
          onOpenUploadNewPlan={() => setIsUploadModalOpen(true)}
          onOpenMaterialsModal={() => setIsMaterialsModalOpen(true)}
          isAdmin={isAdmin}
          currentSection={selectedSection}
          tasks={tasks}
          userRole={userRole}
          onOpenAdminLogin={() =>
            handleOpenAdminLogin(
              'لوحة تحكم الأدمن',
              'إضافة وتحديث الخطط الأسبوعية مقتصر على المشرف العام (الأدمن)',
              () => setIsUploadModalOpen(true)
            )
          }
        />

        {currentTab === 'today' && (
          <TodayView
            selectedDay={selectedDay}
            onSelectDay={setSelectedDay}
            todayDay={todayDay}
            tasks={tasks}
            subjects={subjects}
            timetable={timetable}
            student={student}
            selectedSection={selectedSection}
            onToggleDone={handleToggleDone}
            onSavePersonalNote={handleSavePersonalNote}
            onEditTask={handleOpenEditTask}
            onDeleteTask={handleDeleteTask}
            onAddTaskForDay={handleOpenAddTask}
            onOpenTimetableModal={() => setIsTimetableModalOpen(true)}
            onOpenWeekDaysModal={() => setIsWeekDaysModalOpen(true)}
            onOpenArchiveModal={() => setIsArchiveModalOpen(true)}
            activeBlockNumber={activeBlockNumber}
            activeWeekNumber={activeWeekNumber}
            activePlanTitle={activePlan?.title || weekTitle}
            isVisitor={userRole === 'visitor'}
          />
        )}

        {currentTab === 'weekly' && (
          <WeeklyPlanView
            tasks={tasks}
            subjects={subjects}
            weekTitle={weekTitle}
            currentSection={selectedSection}
            isAdmin={isAdmin}
            onChangeWeekTitle={(val) => {
              setWeekTitle(val);
              saveWeekTitle(val);
              if (isAdmin) {
                syncTasksWithActivePlan(officialTasks);
              }
            }}
            onToggleDone={handleToggleDone}
            onSavePersonalNote={handleSavePersonalNote}
            onEditTask={handleOpenEditTask}
            onDeleteTask={handleDeleteTask}
            onAddTaskForDay={handleOpenAddTask}
            onOpenSmartPaste={() => setIsSmartPasteOpen(true)}
            onOpenTimetableModal={() => setIsTimetableModalOpen(true)}
            onOpenArchiveModal={() => setIsArchiveModalOpen(true)}
            activeBlockNumber={activeBlockNumber}
            activeWeekNumber={activeWeekNumber}
            isVisitor={userRole === 'visitor'}
          />
        )}

        {currentTab === 'timetable' && (
          <TimetableView
            timetable={timetable}
            subjects={subjects}
            currentSection={selectedSection}
            onSelectSection={handleSelectSection}
            onUpdateTimetable={setTimetable}
            onResetTimetable={handleResetTimetable}
            isAdmin={isAdmin}
            isVisitor={userRole === 'visitor'}
            onOpenAdminLogin={() =>
              handleOpenAdminLogin(
                'تعديل الجدول الدراسي',
                'تعديل وتخصيص حصص الجدول الدراسي مقتصر على الأدمن فقط'
              )
            }
          />
        )}
      </main>

      {/* Class Selector Modal */}
      <ClassSelectorModal
        isOpen={isClassSelectorOpen || showInitialClassPrompt}
        currentSection={selectedSection}
        onSelectSection={handleSelectSection}
        onClose={() => {
          setIsClassSelectorOpen(false);
          setShowInitialClassPrompt(false);
        }}
        isInitialSelection={showInitialClassPrompt}
      />

      {/* Modals & Popups */}
      <TaskModal
        isOpen={isTaskModalOpen}
        onClose={() => setIsTaskModalOpen(false)}
        onSave={handleSaveTask}
        editingTask={editingTask}
        defaultDay={modalDefaultDay}
        defaultSubjectId={modalDefaultSubjectId}
        subjects={subjects}
      />

      <SmartPasteModal
        isOpen={isSmartPasteOpen}
        onClose={() => setIsSmartPasteOpen(false)}
        onImportTasks={handleImportTasks}
        subjects={subjects}
        defaultDay={selectedDay}
      />

      <EditProfileModal
        isOpen={isEditProfileOpen}
        onClose={() => setIsEditProfileOpen(false)}
        student={student}
        onSave={(updated) => {
          setStudent(updated);
          if (updated.section && updated.section !== selectedSection) {
            handleSelectSection(updated.section);
          }
        }}
      />

      {/* Requested Modal 1: Quick Timetable Modal */}
      <QuickTimetableModal
        isOpen={isTimetableModalOpen}
        onClose={() => setIsTimetableModalOpen(false)}
        timetable={timetable}
        subjects={subjects}
        currentSection={selectedSection}
        onSelectSection={handleSelectSection}
        onOpenFullTimetable={() => setCurrentTab('timetable')}
      />

      {/* Requested Modal 2: All Week Days & Planner Picker Modal */}
      <WeekDaysPickerModal
        isOpen={isWeekDaysModalOpen}
        onClose={() => setIsWeekDaysModalOpen(false)}
        selectedDay={selectedDay}
        onSelectDay={(day) => {
          setSelectedDay(day);
          setCurrentTab('today');
          setIsWeekDaysModalOpen(false);
        }}
        tasks={tasks}
        subjects={subjects}
        onToggleDone={handleToggleDone}
        onEditTask={handleOpenEditTask}
        onDeleteTask={handleDeleteTask}
        onAddTaskForDay={handleOpenAddTask}
        onOpenFullWeeklyView={() => setCurrentTab('weekly')}
        isVisitor={userRole === 'visitor'}
      />

      {/* Requested Modal 3: Weekly Plan Files Uploader Modal (Admin Protected) */}
      <UploadPlanFilesModal
        isOpen={isUploadModalOpen}
        onClose={() => setIsUploadModalOpen(false)}
        subjects={subjects}
        currentWeekTitle={weekTitle}
        currentTasks={tasks}
        isAdmin={isAdmin}
        onAdminUnlock={() => {
          setIsAdmin(true);
          setAdminLoggedIn(true);
        }}
        onApplyNewWeeklyPlan={handleApplyNewWeeklyPlan}
        savedUploadedFiles={uploadedFiles}
        onDeleteSavedUploadedFile={(fileId) => {
          setUploadedFiles((prev) => {
            const updated = prev.filter((f) => f.id !== fileId);
            saveUploadedFiles(updated);
            return updated;
          });
          setArchive((prev) =>
            prev.map((plan) => ({
              ...plan,
              uploadedFiles: (plan.uploadedFiles || []).filter((f) => f.id !== fileId),
            }))
          );
        }}
        onDeleteSavedUploadedFiles={(fileIds) => {
          const idSet = new Set(fileIds);
          setUploadedFiles((prev) => {
            const updated = prev.filter((f) => !idSet.has(f.id));
            saveUploadedFiles(updated);
            return updated;
          });
          setArchive((prev) =>
            prev.map((plan) => ({
              ...plan,
              uploadedFiles: (plan.uploadedFiles || []).filter((f) => !idSet.has(f.id)),
            }))
          );
        }}
        suggestedBlock={activeBlockNumber}
        suggestedWeek={activeWeekNumber + 1}
        visitorStats={visitorStats}
        onRefreshStats={() => {
          fetchVisitorStats().then((data) => {
            if (data) setVisitorStats(data);
          });
        }}
        initialTab="materials"
      />

      {/* User Requested: Memory & Archive Modal for Blocks and Weeks */}
      <WeeklyPlanArchiveModal
        isOpen={isArchiveModalOpen}
        onClose={() => setIsArchiveModalOpen(false)}
        archive={archive}
        activePlanId={activePlanId}
        currentSection={selectedSection}
        isAdmin={isAdmin}
        userRole={userRole}
        onSelectPlan={(planId) => {
          handleSelectPlan(planId);
          setIsArchiveModalOpen(false);
        }}
        onSetAsCurrent={(planId) => {
          handleSetPlanAsCurrent(planId);
        }}
        onDeletePlan={(planId) => {
          handleDeletePlan(planId);
        }}
        onOpenUploadNewPlan={() => {
          setIsArchiveModalOpen(false);
          setIsUploadModalOpen(true);
        }}
        onOpenAdminLogin={() => {
          handleOpenAdminLogin(
            'صلاحية إدارة الأرشيف',
            'إضافة الخطط وتعيين الأسبوع النشط مقتصر على الأدمن'
          )
        }}
      />

      {/* Admin Authentication Modal */}
      <AdminAuthModal
        isOpen={isAdminAuthModalOpen}
        onClose={() => setIsAdminAuthModalOpen(false)}
        onSuccess={handleAdminSuccess}
        reasonTitle={adminReason?.title}
        reasonMessage={adminReason?.message}
      />

      {/* 3-Option App Entry Portal Modal (Admin, Student: Name, Visitor: Instant Browse) */}
      <AppEntryPortalModal
        isOpen={isEntryPortalOpen}
        onClose={() => setIsEntryPortalOpen(false)}
        currentRole={userRole}
        currentStudentName={student.name}
        selectedSection={selectedSection}
        onSelectSection={handleSelectSection}
        onAdminLoginSuccess={() => {
          setIsAdmin(true);
          setAdminLoggedIn(true);
          saveUserRole('admin');
          setUserRole('admin');
          setIsEntryPortalOpen(false);
        }}
        onStudentLoginSuccess={(sName, sec) => {
          saveUserRole('student');
          setUserRole('student');
          setIsAdmin(false);
          setAdminLoggedIn(false);
          setIsLoggedIn(true);
          setStudent((prev) => ({
            ...prev,
            name: sName,
            section: sec,
            grade: `Grade ${sec}`,
          }));
          setIsEntryPortalOpen(false);
          fetchVisitorStats().then((data) => {
            if (data) setVisitorStats(data);
          });
        }}
        onVisitorLoginSuccess={() => {
          saveUserRole('visitor');
          setUserRole('visitor');
          setIsAdmin(false);
          setAdminLoggedIn(false);
          setIsLoggedIn(false);
          setStudent((prev) => ({
            ...prev,
            name: 'زائر',
          }));
          setIsEntryPortalOpen(false);
        }}
        canDismiss={hasStoredUserRole()}
      />

      {/* Visitor Action Restriction Dialog */}
      {visitorNoticeModal.isOpen && (
        <div
          id="visitor-restriction-modal"
          className="fixed inset-0 z-50 bg-slate-950/70 backdrop-blur-xs flex items-center justify-center p-4 animate-fadeIn"
          dir="rtl"
        >
          <div className="bg-white rounded-3xl w-full max-w-md shadow-2xl border border-slate-200 overflow-hidden text-slate-900">
            <div className="bg-gradient-to-r from-sky-600 to-indigo-700 text-white p-5 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-2xl bg-white/15 flex items-center justify-center">
                  <Eye className="w-5 h-5 text-sky-200" />
                </div>
                <div>
                  <h3 className="font-bold text-base">وضع التصفح فقط (حساب زائر)</h3>
                  <span className="text-xs text-sky-100">صلاحيات العرض والمتابعة</span>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setVisitorNoticeModal({ isOpen: false, message: '' })}
                className="p-1.5 rounded-full hover:bg-white/20 text-white transition-colors cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-6 space-y-4">
              <p className="text-sm text-slate-700 leading-relaxed font-medium">
                {visitorNoticeModal.message}
              </p>

              <div className="p-3.5 rounded-2xl bg-indigo-50 border border-indigo-100 text-xs text-indigo-900 space-y-1">
                <div className="font-bold flex items-center gap-1.5 text-indigo-700">
                  <GraduationCap className="w-4 h-4" />
                  <span>ميزة حساب الطالب:</span>
                </div>
                <p>
                  تحديد المهام المنجزة (Done) وحفظ ملاحظاتك الخاصة على جهازك دون التأثير على الطلاب الآخرين.
                </p>
              </div>

              <div className="flex flex-col sm:flex-row gap-2 pt-2">
                <button
                  type="button"
                  id="visitor-notice-btn-switch-student"
                  onClick={() => {
                    setVisitorNoticeModal({ isOpen: false, message: '' });
                    setIsEntryPortalOpen(true);
                  }}
                  className="flex-1 py-3 px-4 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs shadow-xs transition-all flex items-center justify-center gap-2 cursor-pointer"
                >
                  <GraduationCap className="w-4 h-4" />
                  <span>دخول كـ طالب الآن</span>
                </button>
                <button
                  type="button"
                  onClick={() => setVisitorNoticeModal({ isOpen: false, message: '' })}
                  className="py-3 px-4 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs transition-all cursor-pointer"
                >
                  متابعة التصفح
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Visitor & Emails Stats Admin Modal */}
      <VisitorStatsModal
        isOpen={isVisitorStatsOpen}
        onClose={() => setIsVisitorStatsOpen(false)}
        summaryStats={visitorStats}
        onRefreshStats={() => {
          fetchVisitorStats().then((data) => {
            if (data) setVisitorStats(data);
          });
        }}
      />

      {/* Materials & Sheets Modal (Block 1 Main Sheets & Weekly Materials - View Only) */}
      <MaterialsModal
        isOpen={isMaterialsModalOpen}
        onClose={() => setIsMaterialsModalOpen(false)}
        subjects={subjects}
        currentSection={selectedSection}
        isAdmin={isAdmin}
      />
    </div>
  );
}
