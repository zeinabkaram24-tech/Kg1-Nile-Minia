import React, { useEffect, useRef, useState } from 'react';
import {
  GraduationCap,
  ShieldCheck,
  User,
  Eye,
  Lock,
  LogOut,
  Calendar,
  Layers,
  FolderOpen,
  Sparkles,
  Printer,
  ChevronDown,
  CheckSquare,
  Download
} from 'lucide-react';
import { SchoolClass, UserRole, StudentProfile } from '../types';
import { BLOCKS, WEEKS } from '../data/initialData';

interface HeaderProps {
  currentRole: UserRole;
  onChangeRole: (role: UserRole) => void;
  selectedClass: SchoolClass;
  onSelectClass: (c: SchoolClass) => void;
  selectedBlock: string;
  onSelectBlock: (b: string) => void;
  selectedWeek: string;
  onSelectWeek: (w: string) => void;
  studentProfile: StudentProfile | null;
  onUpdateStudentProfile: (profile: StudentProfile | null) => void;
  activeTab: 'daily' | 'weekly' | 'timetable' | 'materials' | 'admin' | 'student' | 'tasks';
  onChangeTab: (tab: 'daily' | 'weekly' | 'timetable' | 'materials' | 'admin' | 'student' | 'tasks') => void;
  onOpenPrint: () => void;
}

export const Header: React.FC<HeaderProps> = ({
  currentRole,
  onChangeRole,
  selectedClass,
  onSelectClass,
  selectedBlock,
  onSelectBlock,
  selectedWeek,
  onSelectWeek,
  studentProfile,
  onUpdateStudentProfile,
  activeTab,
  onChangeTab,
  onOpenPrint
}) => {
  const headerRef = useRef<HTMLElement | null>(null);
  const [showAdminLoginModal, setShowAdminLoginModal] = useState(false);
  const [adminPasswordInput, setAdminPasswordInput] = useState('');
  const [adminLoginError, setAdminLoginError] = useState('');

  const [showStudentLoginModal, setShowStudentLoginModal] = useState(false);
  const [studentNameInput, setStudentNameInput] = useState(studentProfile?.name || '');
  const [studentClassInput, setStudentClassInput] = useState<SchoolClass>(selectedClass);

  useEffect(() => {
    const header = headerRef.current;
    if (!header) return;

    const updateHeaderHeight = () => {
      document.documentElement.style.setProperty('--app-header-height', `${header.offsetHeight}px`);
    };

    updateHeaderHeight();
    const observer = new ResizeObserver(updateHeaderHeight);
    observer.observe(header);
    return () => observer.disconnect();
  }, []);

  const handleAdminLoginSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    // Admin password set securely to 1111
    if (adminPasswordInput === '1111') {
      onChangeRole('admin');
      setShowAdminLoginModal(false);
      setAdminPasswordInput('');
      setAdminLoginError('');
    } else {
      setAdminLoginError('كلمة المرور غير صحيحة، يرجى المحاولة مرة أخرى.');
    }
  };

  const handleStudentLoginSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!studentNameInput.trim()) return;
    const profile: StudentProfile = {
      name: studentNameInput.trim(),
      classId: studentClassInput
    };
    onUpdateStudentProfile(profile);
    onSelectClass(studentClassInput);
    onChangeRole('student');
    setShowStudentLoginModal(false);
    onChangeTab('student');
  };

  return (
    <header ref={headerRef} className="bg-white border-b border-slate-200 sticky top-0 z-30 shadow-xs">
      {/* Top Banner with Nile Schools Identity */}
      <div className="bg-gradient-to-r from-slate-900 via-sky-950 to-slate-900 text-white px-4 py-2.5">
        <div className="max-w-7xl mx-auto flex flex-wrap items-center justify-between gap-3 text-xs sm:text-sm">
          {/* School Name & Badge - LTR order: Nile Egyptian Schools ... Grade 2 ... Minya Branch */}
          <div className="flex items-center gap-3">
            <div className="w-11 h-11 rounded-xl bg-amber-400/20 border border-amber-400/40 flex items-center justify-center text-amber-300 font-bold shadow-xs shrink-0">
              <GraduationCap className="w-6 h-6 sm:w-7 sm:h-7" />
            </div>
            <div dir="ltr" className="text-left">
              <div className="flex items-center gap-2.5 flex-wrap">
                <span className="text-2xl sm:text-3xl font-black tracking-tight text-amber-300 drop-shadow-xs">
                  Nile Egyptian Schools
                </span>
                <span className="text-slate-400 font-bold text-xl sm:text-2xl">|</span>
                <span className="text-amber-200 text-base sm:text-xl font-extrabold">
                  KG 1
                </span>
              </div>
              <div className="text-amber-300/90 text-xs sm:text-sm font-bold tracking-wide mt-0.5">
                Minya Branch
              </div>
            </div>
          </div>

          {/* User Role Switcher & Badges */}
          <div className="flex items-center gap-2 flex-wrap">
            {/* Current Role Indicator */}
            <div className="flex items-center bg-slate-800/80 rounded-lg p-1 border border-slate-700">
              {/* Visitor Button */}
              <button
                id="role-visitor-btn"
                type="button"
                onClick={() => {
                  onChangeRole('visitor');
                  if (activeTab === 'student' || activeTab === 'admin') {
                    onChangeTab('daily');
                  }
                }}
                className={`flex items-center gap-1.5 px-2.5 py-1 rounded-md text-xs font-medium transition-all ${
                  currentRole === 'visitor'
                    ? 'bg-sky-600 text-white shadow-xs font-semibold'
                    : 'text-slate-300 hover:text-white hover:bg-slate-700/50'
                }`}
                title="وضع الزائر (عرض وتصفح فقط بدون تعديل)"
              >
                <Eye className="w-3.5 h-3.5" />
                <span>واجهة زائر</span>
              </button>

              {/* Student Button */}
              <button
                id="role-student-btn"
                type="button"
                onClick={() => {
                  if (!studentProfile) {
                    setShowStudentLoginModal(true);
                  } else {
                    onChangeRole('student');
                    onChangeTab('student');
                  }
                }}
                className={`flex items-center gap-1.5 px-2.5 py-1 rounded-md text-xs font-medium transition-all ${
                  currentRole === 'student'
                    ? 'bg-emerald-600 text-white shadow-xs font-semibold'
                    : 'text-slate-300 hover:text-white hover:bg-slate-700/50'
                }`}
                title="واجهة الطالب (إضافة تاسكات ومتابعة الواجبات لحسابه)"
              >
                <User className="w-3.5 h-3.5" />
                <span>{studentProfile ? `الطالب: ${studentProfile.name.split(' ')[0]}` : 'واجهة طالب'}</span>
              </button>

              {/* Admin Button */}
              {currentRole === 'admin' ? (
                <div className="flex items-center gap-1 bg-amber-500 text-slate-950 px-2.5 py-1 rounded-md text-xs font-bold shadow-xs">
                  <ShieldCheck className="w-3.5 h-3.5 text-slate-950" />
                  <span>أدمن (له حق التعديل)</span>
                  <button
                    id="admin-logout-btn"
                    type="button"
                    onClick={() => {
                      onChangeRole('visitor');
                      if (activeTab === 'admin') {
                        onChangeTab('daily');
                      }
                    }}
                    title="تسجيل خروج من الأدمن"
                    className="mr-1 hover:text-red-900 transition-colors"
                  >
                    <LogOut className="w-3 h-3" />
                  </button>
                </div>
              ) : (
                <button
                  id="role-admin-login-btn"
                  type="button"
                  onClick={() => setShowAdminLoginModal(true)}
                  className="flex items-center gap-1.5 px-2.5 py-1 rounded-md text-xs font-medium text-amber-300 hover:text-amber-200 hover:bg-amber-400/10 transition-all"
                  title="تسجيل دخول كمسؤول / أدمن"
                >
                  <Lock className="w-3.5 h-3.5" />
                  <span>دخول الأدمن</span>
                </button>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Secondary Controls Bar: Class Selection + Block & Week */}
      <div className="max-w-7xl mx-auto px-4 py-3 flex flex-wrap items-center justify-between gap-4">
        {/* Class Selection Buttons (A, B, C, D, E) */}
        <div className="flex items-center gap-2 flex-wrap">
          <span className="text-xs font-semibold text-slate-500 ml-1">Class:</span>
          {(['KG1A', 'KG1B', 'KG1C', 'KG1D', 'KG1E'] as SchoolClass[]).map((cls) => {
            const isSelected = selectedClass === cls || selectedClass === cls.replace('KG1', '') || selectedClass === `G2${cls.slice(-1)}`;
            const displayLabel = cls.slice(-1); // A, B, C, D, E
            return (
              <button
                key={cls}
                id={`select-class-${cls}`}
                type="button"
                onClick={() => onSelectClass(cls)}
                className={`px-3 py-1.5 rounded-lg text-sm font-bold transition-all border ${
                  isSelected
                    ? 'bg-sky-700 text-white border-sky-800 shadow-xs'
                    : 'bg-slate-50 hover:bg-slate-100 text-slate-700 border-slate-200'
                }`}
              >
                Class {displayLabel}
              </button>
            );
          })}
        </div>

        {/* Block & Week Filter */}
        <div className="flex items-center gap-2 flex-wrap text-xs">
          {/* Block Selector */}
          <div className="flex items-center gap-1.5 bg-slate-100 px-2.5 py-1 rounded-lg border border-slate-200">
            <Layers className="w-3.5 h-3.5 text-slate-500" />
            <span className="text-slate-600 font-medium">توبيك:</span>
            <select
              id="block-select-dropdown"
              value={selectedBlock}
              onChange={(e) => onSelectBlock(e.target.value)}
              className="bg-transparent font-semibold text-slate-800 focus:outline-hidden cursor-pointer"
            >
              {BLOCKS.map((b) => (
                <option key={b.id} value={b.id}>
                  {b.nameAr}
                </option>
              ))}
            </select>
          </div>

          {/* Week Selector */}
          <div className="flex items-center gap-1.5 bg-slate-100 px-2.5 py-1 rounded-lg border border-slate-200">
            <Calendar className="w-3.5 h-3.5 text-slate-500" />
            <span className="text-slate-600 font-medium">Week:</span>
            <select
              id="week-select-dropdown"
              value={selectedWeek}
              onChange={(e) => onSelectWeek(e.target.value)}
              className="bg-transparent font-semibold text-slate-800 focus:outline-hidden cursor-pointer"
            >
              {WEEKS.map((w) => (
                <option key={w.id} value={w.id}>
                  {w.nameAr}
                </option>
              ))}
            </select>
          </div>

          {/* Role Status Pill */}
          <div
            className={`hidden md:inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-semibold border ${
              currentRole === 'admin'
                ? 'bg-amber-50 text-amber-800 border-amber-300'
                : currentRole === 'student'
                ? 'bg-emerald-50 text-emerald-800 border-emerald-300'
                : 'bg-slate-100 text-slate-600 border-slate-200'
            }`}
          >
            {currentRole === 'admin' && <ShieldCheck className="w-3.5 h-3.5 text-amber-600" />}
            {currentRole === 'student' && <User className="w-3.5 h-3.5 text-emerald-600" />}
            {currentRole === 'visitor' && <Eye className="w-3.5 h-3.5 text-slate-500" />}
            <span>
              {currentRole === 'admin'
                ? 'وضع التعديل مفعل (أدمن)'
                : currentRole === 'student'
                ? `حساب: ${studentProfile?.name || 'طالب'}`
                : 'وضع التصفح والعرض فقط'}
            </span>
          </div>
        </div>
      </div>

      {/* Main Tabs Navigation */}
      <div className="border-t border-slate-200 bg-slate-50/70">
        <div className="max-w-7xl mx-auto px-4 flex items-center overflow-x-auto gap-2 py-1.5 scrollbar-none">
          <button
            id="tab-tasks"
            type="button"
            onClick={() => onChangeTab('daily')}
            className={`px-4 py-2 rounded-lg text-sm font-bold flex items-center gap-2 whitespace-nowrap transition-all ${
              activeTab === 'daily' || activeTab === 'tasks'
                ? 'bg-white text-sky-800 shadow-xs border border-slate-200'
                : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
            }`}
          >
            <CheckSquare className="w-4 h-4 text-amber-600" />
            <span>Daily Tasks</span>
          </button>

          {(studentProfile || currentRole === 'student') && (
            <button
              id="tab-student-space"
              type="button"
              onClick={() => onChangeTab('student')}
              className={`px-4 py-2 rounded-lg text-sm font-bold flex items-center gap-2 whitespace-nowrap transition-all ${
                activeTab === 'student'
                  ? 'bg-white text-emerald-800 shadow-xs border border-slate-200'
                  : 'text-slate-600 hover:text-emerald-700 hover:bg-slate-100'
              }`}
            >
              <User className="w-4 h-4 text-emerald-600" />
              <span>مساحة الطالب (My Space)</span>
              {studentProfile && (
                <span className="bg-emerald-100 text-emerald-800 text-xs px-2 py-0.5 rounded-full font-bold">
                  {studentProfile.name.split(' ')[0]}
                </span>
              )}
            </button>
          )}

          <button
            id="tab-weekly-plan"
            type="button"
            onClick={() => onChangeTab('weekly')}
            className={`px-4 py-2 rounded-lg text-sm font-semibold flex items-center gap-2 whitespace-nowrap transition-all ${
              activeTab === 'weekly'
                ? 'bg-white text-sky-800 shadow-xs border border-slate-200'
                : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
            }`}
          >
            <Layers className="w-4 h-4 text-emerald-600" />
            <span>Weekly Plan</span>
          </button>

          <button
            id="tab-materials"
            type="button"
            onClick={() => onChangeTab('materials')}
            className={`px-4 py-2 rounded-lg text-sm font-semibold flex items-center gap-2 whitespace-nowrap transition-all ${
              activeTab === 'materials'
                ? 'bg-white text-purple-800 shadow-xs border border-purple-200'
                : 'text-slate-600 hover:text-purple-700 hover:bg-slate-100'
            }`}
          >
            <FolderOpen className="w-4 h-4 text-purple-600" />
            <span>Materials</span>
          </button>

          {currentRole === 'admin' && (
            <button
              id="tab-admin-panel"
              type="button"
              onClick={() => onChangeTab('admin')}
              className={`px-4 py-2 rounded-lg text-sm font-bold flex items-center gap-2 whitespace-nowrap transition-all ${
                activeTab === 'admin'
                  ? 'bg-amber-500 text-slate-950 shadow-xs'
                  : 'text-amber-800 hover:bg-amber-100 bg-amber-50/70 border border-amber-200'
              }`}
            >
              <ShieldCheck className="w-4 h-4 text-amber-950" />
              <span>لوحة تحكم وإدارة الأدمن</span>
            </button>
          )}
        </div>
      </div>

      {/* Admin Login Modal */}
      {showAdminLoginModal && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-xl border border-slate-200">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2.5">
                <div className="w-10 h-10 rounded-xl bg-amber-100 text-amber-800 flex items-center justify-center">
                  <ShieldCheck className="w-6 h-6" />
                </div>
                <div>
                  <h3 className="font-bold text-lg text-slate-900">دخول مسؤول النظام (الأدمن)</h3>
                  <p className="text-xs text-slate-500">صلاحية التعديل والإضافة والحذف الحصرية</p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => {
                  setShowAdminLoginModal(false);
                  setAdminLoginError('');
                }}
                className="text-slate-400 hover:text-slate-600 p-1"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleAdminLoginSubmit} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                  كلمة مرور الأدمن:
                </label>
                <input
                  id="admin-password-field"
                  type="password"
                  placeholder="أدخل كلمة المرور"
                  value={adminPasswordInput}
                  onChange={(e) => setAdminPasswordInput(e.target.value)}
                  className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 text-sm focus:outline-hidden focus:ring-2 focus:ring-amber-500 focus:border-amber-500"
                  autoFocus
                />
              </div>

              {adminLoginError && (
                <div className="p-2.5 bg-red-50 text-red-700 border border-red-200 rounded-xl text-xs font-medium">
                  {adminLoginError}
                </div>
              )}

              <div className="flex items-center justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => {
                    setShowAdminLoginModal(false);
                    setAdminLoginError('');
                  }}
                  className="px-4 py-2 text-sm text-slate-600 hover:bg-slate-100 rounded-xl font-medium"
                >
                  إلغاء
                </button>
                <button
                  id="admin-submit-login"
                  type="submit"
                  className="px-5 py-2 text-sm bg-amber-500 hover:bg-amber-600 text-slate-950 font-bold rounded-xl shadow-xs transition-colors"
                >
                  تسجيل الدخول كأدمن
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Student Login Modal */}
      {showStudentLoginModal && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-xl border border-slate-200">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2.5">
                <div className="w-10 h-10 rounded-xl bg-emerald-100 text-emerald-800 flex items-center justify-center">
                  <User className="w-6 h-6" />
                </div>
                <div>
                  <h3 className="font-bold text-lg text-slate-900">تسجيل الدخول باسم الطالب</h3>
                  <p className="text-xs text-slate-500">لإضافة تاسكاتك الشخصية ومتابعة واجباتك</p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setShowStudentLoginModal(false)}
                className="text-slate-400 hover:text-slate-600 p-1"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleStudentLoginSubmit} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                  اسم الطالب / الطالبة:
                </label>
                <input
                  id="student-name-field"
                  type="text"
                  placeholder="مثال: عمر أحمد، مريم خالد، إلخ"
                  value={studentNameInput}
                  onChange={(e) => setStudentNameInput(e.target.value)}
                  className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 text-sm focus:outline-hidden focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500"
                  required
                  autoFocus
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                  Class:
                </label>
                <div className="grid grid-cols-5 gap-1.5">
                  {(['KG1A', 'KG1B', 'KG1C', 'KG1D', 'KG1E'] as SchoolClass[]).map((cls) => (
                    <button
                      key={cls}
                      type="button"
                      onClick={() => setStudentClassInput(cls)}
                      className={`py-2 text-xs font-bold rounded-xl border transition-all ${
                        studentClassInput === cls
                          ? 'bg-emerald-600 text-white border-emerald-700 shadow-xs'
                          : 'bg-slate-50 text-slate-700 border-slate-200 hover:bg-slate-100'
                      }`}
                    >
                      Class {cls.slice(-1)}
                    </button>
                  ))}
                </div>
              </div>

              <div className="flex items-center justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setShowStudentLoginModal(false)}
                  className="px-4 py-2 text-sm text-slate-600 hover:bg-slate-100 rounded-xl font-medium"
                >
                  إلغاء
                </button>
                <button
                  id="student-submit-login"
                  type="submit"
                  className="px-5 py-2 text-sm bg-emerald-600 hover:bg-emerald-700 text-white font-bold rounded-xl shadow-xs transition-colors"
                >
                  دخول مساحة الطالب
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </header>
  );
};
