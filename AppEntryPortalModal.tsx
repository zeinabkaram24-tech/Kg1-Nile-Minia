import React, { useState, useEffect } from 'react';
import {
  ShieldCheck,
  GraduationCap,
  Eye,
  Lock,
  KeyRound,
  Check,
  X,
  AlertCircle,
  Sparkles,
  School,
  ArrowRight,
  User,
  CheckCircle2,
  ChevronDown,
  Info
} from 'lucide-react';
import { GradeSection, UserRole } from '../types';
import { GRADE_SECTIONS } from '../data/defaultData';
import {
  verifyAdminPassword,
  saveStudentLogin,
  getSavedStudentName,
  isStudentRemembered,
  saveUserRole
} from '../utils/storage';
import { registerStudentLogin, registerGuestVisitor } from '../utils/visitorTracker';

interface AppEntryPortalModalProps {
  isOpen: boolean;
  onClose: () => void;
  currentRole?: UserRole;
  currentStudentName?: string;
  selectedSection: GradeSection;
  onSelectSection: (section: GradeSection) => void;
  onAdminLoginSuccess: () => void;
  onStudentLoginSuccess: (studentName: string, section: GradeSection) => void;
  onVisitorLoginSuccess: () => void;
  canDismiss?: boolean;
}

export const AppEntryPortalModal: React.FC<AppEntryPortalModalProps> = ({
  isOpen,
  onClose,
  currentRole = 'visitor',
  currentStudentName = '',
  selectedSection,
  onSelectSection,
  onAdminLoginSuccess,
  onStudentLoginSuccess,
  onVisitorLoginSuccess,
  canDismiss = true,
}) => {
  // Selected card in the 3 options
  const [selectedOption, setSelectedOption] = useState<'admin' | 'student' | 'visitor' | null>(null);

  // Admin Form State
  const [adminPassword, setAdminPassword] = useState('');
  const [adminError, setAdminError] = useState<string | null>(null);
  const [isAdminSuccess, setIsAdminSuccess] = useState(false);

  // Student Form State
  const [studentNameInput, setStudentNameInput] = useState('');
  const [studentSectionInput, setStudentSectionInput] = useState<GradeSection>(selectedSection);
  const [rememberMe, setRememberMe] = useState(true);
  const [studentError, setStudentError] = useState<string | null>(null);
  const [isStudentLoading, setIsStudentLoading] = useState(false);

  // Reset state when opening
  useEffect(() => {
    if (isOpen) {
      const saved = getSavedStudentName() || currentStudentName;
      if (saved && saved !== 'طالب Grade 2' && saved !== 'فصل G2B' && saved !== 'زائر') {
        setStudentNameInput(saved);
      }
      setStudentSectionInput(selectedSection);
      setRememberMe(isStudentRemembered() ?? true);
      setAdminPassword('');
      setAdminError(null);
      setIsAdminSuccess(false);
      setStudentError(null);
      setIsStudentLoading(false);

      // Default expand based on current role if available
      if (currentRole === 'admin') {
        setSelectedOption('admin');
      } else if (currentRole === 'student') {
        setSelectedOption('student');
      } else {
        setSelectedOption(null);
      }
    }
  }, [isOpen, currentStudentName, selectedSection, currentRole]);

  if (!isOpen) return null;

  // 1. Submit Admin Login
  const handleAdminSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setAdminError(null);

    const clean = adminPassword.trim();
    if (!clean) {
      setAdminError('يرجى إدخال كلمة المرور');
      return;
    }

    if (verifyAdminPassword(clean)) {
      saveUserRole('admin');
      setIsAdminSuccess(true);
      setTimeout(() => {
        setIsAdminSuccess(false);
        setAdminPassword('');
        onAdminLoginSuccess();
        onClose();
      }, 500);
    } else {
      setAdminError('كلمة المرور غير صحيحة، يرجى المحاولة مرة أخرى.');
    }
  };

  // 2. Submit Student Login
  const handleStudentSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setStudentError(null);

    const clean = studentNameInput.trim();
    if (!clean || clean.length < 2) {
      setStudentError('يرجى إدخال اسم الطالب (حرفين على الأقل)');
      return;
    }

    setIsStudentLoading(true);
    saveStudentLogin(clean, studentSectionInput, rememberMe);
    saveUserRole('student');
    onSelectSection(studentSectionInput);

    try {
      await registerStudentLogin(clean, `Grade ${studentSectionInput}`, studentSectionInput);
    } catch (err) {
      console.warn('Registration notice:', err);
    }

    setIsStudentLoading(false);
    onStudentLoginSuccess(clean, studentSectionInput);
    onClose();
  };

  // 3. Instant Visitor Login
  const handleVisitorDirectEnter = () => {
    saveUserRole('visitor');
    try {
      registerGuestVisitor(selectedSection);
    } catch (err) {
      console.warn('Visitor notice:', err);
    }
    onVisitorLoginSuccess();
    onClose();
  };

  return (
    <div
      id="app-entry-portal-backdrop"
      className="fixed inset-0 z-50 bg-slate-950/75 backdrop-blur-xs flex items-center justify-center p-3 sm:p-4 md:p-6 overflow-y-auto animate-fadeIn"
      dir="rtl"
    >
      <div
        id="app-entry-portal-container"
        className="bg-white rounded-3xl w-full max-w-2xl shadow-2xl border border-slate-200 overflow-hidden relative text-slate-900 my-auto flex flex-col"
      >
        {/* Header with Nile Schools & System Title */}
        <div className="bg-gradient-to-r from-slate-900 via-indigo-950 to-slate-900 text-white p-5 sm:p-6 relative border-b border-indigo-900/40">
          {canDismiss && (
            <button
              type="button"
              id="entry-portal-btn-close"
              onClick={onClose}
              className="absolute top-4 start-4 p-2 rounded-full bg-white/10 hover:bg-white/20 text-white transition-colors cursor-pointer"
              title="إغلاق"
            >
              <X className="w-5 h-5" />
            </button>
          )}

          <div className="flex items-center gap-3 mb-2">
            <div className="w-10 h-10 rounded-2xl bg-indigo-600/30 border border-indigo-500/40 flex items-center justify-center text-indigo-300">
              <Sparkles className="w-5 h-5 text-amber-300" />
            </div>
            <div>
              <span className="text-[11px] font-bold text-indigo-300 tracking-wide block">
                Nile Egyptian Schools • Grade 2 Weekly Plan
              </span>
              <h2 className="text-xl sm:text-2xl font-black text-white">
                بوابة الدخول وتحديد الصلاحيات
              </h2>
            </div>
          </div>
          <p className="text-xs sm:text-sm text-slate-300 max-w-xl leading-relaxed">
            يرجى اختيار طريقة الدخول المناسبة لك للبدء في تصفح ومتابعة الخطة الأسبوعية:
          </p>
        </div>

        {/* 3 Options Cards */}
        <div className="p-4 sm:p-6 space-y-3.5 flex-1 bg-slate-50/50">

          {/* Option 1: Admin */}
          <div
            id="entry-card-admin"
            className={`rounded-2xl border transition-all duration-200 overflow-hidden bg-white shadow-xs ${
              selectedOption === 'admin'
                ? 'border-indigo-600 ring-2 ring-indigo-500/20 shadow-md'
                : 'border-slate-200 hover:border-indigo-300'
            }`}
          >
            <div
              onClick={() => setSelectedOption(selectedOption === 'admin' ? null : 'admin')}
              className="p-4 sm:p-5 flex items-start justify-between gap-3 cursor-pointer select-none"
            >
              <div className="flex items-start gap-3.5">
                <div className="w-11 h-11 rounded-2xl bg-indigo-50 border border-indigo-200 text-indigo-700 flex items-center justify-center shrink-0 shadow-2xs">
                  <ShieldCheck className="w-6 h-6" />
                </div>
                <div>
                  <div className="flex items-center gap-2 mb-1 flex-wrap">
                    <h3 className="text-base font-black text-slate-900">
                      دخول كـ أدمن (Admin)
                    </h3>
                  </div>
                  <p className="text-xs text-slate-600 leading-relaxed max-w-md">
                    الصلاحية الوحيدة لإضافة، تعديل، أو حذف الشيتات والخطط العامة والجداول وتنعكس فوراً للجميع.
                  </p>
                </div>
              </div>
              <div className="shrink-0 pt-1">
                <span
                  className={`inline-flex items-center justify-center w-7 h-7 rounded-full transition-transform ${
                    selectedOption === 'admin' ? 'bg-indigo-600 text-white rotate-180' : 'bg-slate-100 text-slate-500'
                  }`}
                >
                  <ChevronDown className="w-4 h-4" />
                </span>
              </div>
            </div>

            {/* Admin Password Drawer */}
            {selectedOption === 'admin' && (
              <form
                onSubmit={handleAdminSubmit}
                className="p-4 sm:p-5 bg-indigo-50/40 border-t border-indigo-100 space-y-3.5 animate-fadeIn"
              >
                <div className="space-y-1.5">
                  <label className="block text-xs font-bold text-slate-800">
                    أدخل كلمة مرور الأدمن:
                  </label>
                  <div className="relative">
                    <KeyRound className="w-4 h-4 text-slate-400 absolute start-3.5 top-1/2 -translate-y-1/2" />
                    <input
                      type="password"
                      id="entry-admin-password-input"
                      value={adminPassword}
                      onChange={(e) => {
                        setAdminPassword(e.target.value);
                        setAdminError(null);
                      }}
                      placeholder="أدخل رمز المرور..."
                      autoFocus
                      className="w-full ps-10 pe-4 py-2.5 rounded-xl border border-indigo-200 focus:outline-hidden focus:ring-2 focus:ring-indigo-500 bg-white text-sm font-bold tracking-wider text-slate-900 shadow-2xs"
                    />
                  </div>
                </div>

                {adminError && (
                  <div className="p-2.5 rounded-xl bg-rose-50 border border-rose-200 text-rose-700 text-xs font-bold flex items-center gap-2">
                    <AlertCircle className="w-4 h-4 shrink-0 text-rose-600" />
                    <span>{adminError}</span>
                  </div>
                )}

                {isAdminSuccess && (
                  <div className="p-2.5 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-700 text-xs font-bold flex items-center gap-2">
                    <Check className="w-4 h-4 shrink-0 text-emerald-600" />
                    <span>تم التحقق بنجاح! جاري الدخول كأدمن...</span>
                  </div>
                )}

                <button
                  type="submit"
                  id="entry-admin-btn-submit"
                  className="w-full py-2.5 px-4 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold transition-all shadow-xs flex items-center justify-center gap-2 cursor-pointer active:scale-98"
                >
                  <Lock className="w-4 h-4" />
                  <span>تأكيد الدخول كأدمن</span>
                </button>
              </form>
            )}
          </div>

          {/* Option 2: Student / User (اسم الطالب + الفصل) */}
          <div
            id="entry-card-student"
            className={`rounded-2xl border transition-all duration-200 overflow-hidden bg-white shadow-xs ${
              selectedOption === 'student'
                ? 'border-emerald-600 ring-2 ring-emerald-500/20 shadow-md'
                : 'border-slate-200 hover:border-emerald-300'
            }`}
          >
            <div
              onClick={() => setSelectedOption(selectedOption === 'student' ? null : 'student')}
              className="p-4 sm:p-5 flex items-start justify-between gap-3 cursor-pointer select-none"
            >
              <div className="flex items-start gap-3.5">
                <div className="w-11 h-11 rounded-2xl bg-emerald-50 border border-emerald-200 text-emerald-700 flex items-center justify-center shrink-0 shadow-2xs">
                  <GraduationCap className="w-6 h-6" />
                </div>
                <div>
                  <div className="flex items-center gap-2 mb-1 flex-wrap">
                    <h3 className="text-base font-black text-slate-900">
                      دخول كـ طالب/مستخدم (Student)
                    </h3>
                    <span className="text-[11px] font-bold px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800 border border-emerald-200">
                      حفظ شخصي محلي (Local Storage)
                    </span>
                  </div>
                  <p className="text-xs text-slate-600 leading-relaxed max-w-md">
                    لتحديد المهام المنجزة (Done)، تدوين ملاحظاتك الخاصة، ومتابعة الجدول والدروس في جهازك فقط.
                  </p>
                </div>
              </div>
              <div className="shrink-0 pt-1">
                <span
                  className={`inline-flex items-center justify-center w-7 h-7 rounded-full transition-transform ${
                    selectedOption === 'student' ? 'bg-emerald-600 text-white rotate-180' : 'bg-slate-100 text-slate-500'
                  }`}
                >
                  <ChevronDown className="w-4 h-4" />
                </span>
              </div>
            </div>

            {/* Student Form Drawer */}
            {selectedOption === 'student' && (
              <form
                onSubmit={handleStudentSubmit}
                className="p-4 sm:p-5 bg-emerald-50/40 border-t border-emerald-100 space-y-3.5 animate-fadeIn"
              >
                <div className="space-y-1.5">
                  <label className="block text-xs font-bold text-slate-800">
                    اسم الطالب أو الطالبة (مطلوب):
                  </label>
                  <div className="relative">
                    <User className="w-4 h-4 text-slate-400 absolute start-3.5 top-1/2 -translate-y-1/2" />
                    <input
                      type="text"
                      id="entry-student-name-input"
                      value={studentNameInput}
                      onChange={(e) => {
                        setStudentNameInput(e.target.value);
                        setStudentError(null);
                      }}
                      placeholder="مثال: يوسف أحمد أو فريدة فرغلي..."
                      autoFocus
                      className="w-full ps-10 pe-4 py-2.5 rounded-xl border border-emerald-200 focus:outline-hidden focus:ring-2 focus:ring-emerald-500 bg-white text-sm font-bold text-slate-900 shadow-2xs"
                    />
                  </div>
                </div>

                {/* Section Selector */}
                <div className="space-y-1.5">
                  <label className="block text-xs font-bold text-slate-800">
                    اختر الفصل الدراسي:
                  </label>
                  <div className="grid grid-cols-3 gap-2">
                    {GRADE_SECTIONS.map((sec) => (
                      <button
                        key={sec.id}
                        type="button"
                        onClick={() => setStudentSectionInput(sec.id)}
                        className={`py-2 px-3 rounded-xl text-xs font-black transition-all cursor-pointer flex items-center justify-center gap-1.5 ${
                          studentSectionInput === sec.id
                            ? 'bg-emerald-700 text-white shadow-xs'
                            : 'bg-white border border-slate-200 text-slate-700 hover:bg-slate-100'
                        }`}
                      >
                        <School className="w-3.5 h-3.5" />
                        <span>فصل {sec.id}</span>
                      </button>
                    ))}
                  </div>
                </div>

                {/* Remember Me Toggle */}
                <label className="flex items-center gap-2 cursor-pointer select-none py-1">
                  <input
                    type="checkbox"
                    checked={rememberMe}
                    onChange={(e) => setRememberMe(e.target.checked)}
                    className="w-4 h-4 text-emerald-600 rounded-sm border-slate-300 focus:ring-emerald-500"
                  />
                  <span className="text-xs text-slate-700 font-medium">
                    تذكر اسم الطالب على هذا المتصفح والجهاز دائماً
                  </span>
                </label>

                {studentError && (
                  <div className="p-2.5 rounded-xl bg-rose-50 border border-rose-200 text-rose-700 text-xs font-bold flex items-center gap-2">
                    <AlertCircle className="w-4 h-4 shrink-0 text-rose-600" />
                    <span>{studentError}</span>
                  </div>
                )}

                <button
                  type="submit"
                  id="entry-student-btn-submit"
                  disabled={isStudentLoading}
                  className="w-full py-2.5 px-4 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold transition-all shadow-xs flex items-center justify-center gap-2 cursor-pointer active:scale-98 disabled:opacity-50"
                >
                  <GraduationCap className="w-4 h-4" />
                  <span>{isStudentLoading ? 'جاري الدخول...' : 'الدخول والبدء كطالب'}</span>
                </button>
              </form>
            )}
          </div>

          {/* Option 3: Visitor (دخول مباشر للتصفح فقط) */}
          <div
            id="entry-card-visitor"
            className="rounded-2xl border border-slate-200 hover:border-sky-300 bg-white p-4 sm:p-5 shadow-xs transition-all flex flex-col sm:flex-row sm:items-center justify-between gap-4"
          >
            <div className="flex items-start gap-3.5">
              <div className="w-11 h-11 rounded-2xl bg-sky-50 border border-sky-200 text-sky-700 flex items-center justify-center shrink-0 shadow-2xs">
                <Eye className="w-6 h-6" />
              </div>
              <div>
                <div className="flex items-center gap-2 mb-1 flex-wrap">
                  <h3 className="text-base font-black text-slate-900">
                    دخول كـ زائر (Visitor)
                  </h3>
                  <span className="text-[11px] font-bold px-2 py-0.5 rounded-full bg-sky-100 text-sky-800 border border-sky-200">
                    تصفح وعرض فقط
                  </span>
                </div>
                <p className="text-xs text-slate-600 leading-relaxed max-w-md">
                  يدخل مباشرة للتصفح والاستعراض دون كتابة اسم أو حفظ أي بيانات.
                </p>
              </div>
            </div>

            <button
              type="button"
              id="entry-visitor-btn-direct"
              onClick={handleVisitorDirectEnter}
              className="w-full sm:w-auto shrink-0 py-2.5 px-5 rounded-xl bg-sky-600 hover:bg-sky-700 text-white text-xs font-bold transition-all shadow-xs flex items-center justify-center gap-2 cursor-pointer active:scale-98"
            >
              <span>تصفح كزائر مباشرة</span>
              <ArrowRight className="w-4 h-4 rotate-180" />
            </button>
          </div>

        </div>

        {/* Footer Notes */}
        <div className="p-4 bg-slate-100 border-t border-slate-200 text-center text-xs text-slate-500 flex items-center justify-center gap-2">
          <Info className="w-4 h-4 text-slate-400 shrink-0" />
          <span>يمكنك في أي وقت تغيير نوع الدخول من زر "تبديل الحساب" أعلى القائمة</span>
        </div>
      </div>
    </div>
  );
};
