import React, { useState, useEffect } from 'react';
import { User, Sparkles, CheckCircle2, ShieldCheck, X, School, BookmarkCheck, LogOut, LogIn } from 'lucide-react';
import { registerStudentLogin, registerGuestVisitor } from '../utils/visitorTracker';
import { GradeSection, VisitorItem } from '../types';
import { GRADE_SECTIONS } from '../data/defaultData';
import { getSavedStudentName, isStudentRemembered, saveStudentLogin } from '../utils/storage';

interface VisitorWelcomeModalProps {
  isOpen: boolean;
  onClose: () => void;
  onRegistered: (visitor: VisitorItem) => void;
  selectedSection: GradeSection;
  onSectionChange: (section: GradeSection) => void;
  currentStudentName?: string;
  isLoggedIn?: boolean;
  onLogout?: () => void;
}

export const VisitorWelcomeModal: React.FC<VisitorWelcomeModalProps> = ({
  isOpen,
  onClose,
  onRegistered,
  selectedSection,
  onSectionChange,
  currentStudentName = '',
  isLoggedIn = false,
  onLogout,
}) => {
  const [name, setName] = useState('');
  const [rememberMe, setRememberMe] = useState(true);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Load existing or saved student name if present
  useEffect(() => {
    if (isOpen) {
      const savedName = getSavedStudentName() || currentStudentName;
      if (savedName && savedName !== 'طالب KG 1' && savedName !== 'فصل G2B') {
        setName(savedName);
      }
      setRememberMe(isStudentRemembered() || true);
      setError(null);
    }
  }, [isOpen, currentStudentName]);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    const cleanName = name.trim();
    if (!cleanName || cleanName.length < 2) {
      setError('يرجى كتابة اسم الطالب (حرفين على الأقل)');
      return;
    }

    // 1. Save student locally with the remember preference
    saveStudentLogin(cleanName, selectedSection, rememberMe);

    setLoading(true);
    // 2. Register with the backend for visit tracking
    const res = await registerStudentLogin(cleanName, `Grade ${selectedSection}`, selectedSection);
    setLoading(false);

    if (res.success && res.visitor) {
      onRegistered(res.visitor);
    } else {
      // Even if server is offline or fails, local login succeeded
      onRegistered({
        id: `local-${Date.now()}`,
        name: cleanName,
        loginType: 'student',
        studentGrade: `Grade ${selectedSection}`,
        section: selectedSection,
        firstSeenAt: Date.now(),
        lastSeenAt: Date.now(),
        visitCount: 1,
      });
    }

    onClose();
  };

  const handleQuickEnter = () => {
    // Enter as visitor without saving credentials - also register visitor in backend so admin sees visitor count
    registerGuestVisitor(selectedSection);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 bg-slate-900/70 backdrop-blur-xs flex items-center justify-center p-4 overflow-y-auto animate-fadeIn">
      <div className="bg-white rounded-3xl w-full max-w-lg shadow-2xl border border-slate-100 overflow-hidden relative text-slate-800 my-auto">
        {/* Decorative Header Banner */}
        <div className="bg-gradient-to-r from-indigo-700 via-indigo-600 to-purple-600 p-6 text-white text-right relative">
          <button
            type="button"
            onClick={onClose}
            className="absolute top-4 left-4 p-1.5 rounded-full bg-white/10 hover:bg-white/20 text-white transition-colors"
            title="إغلاق"
          >
            <X className="w-5 h-5" />
          </button>
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-white/15 text-indigo-100 text-xs font-bold mb-3">
            <Sparkles className="w-3.5 h-3.5 text-amber-300" />
            <span>تسجيل الدخول باسم الطالب • KG 1</span>
          </div>
          <h2 className="text-xl sm:text-2xl font-black mb-1.5">
            مرحباً بك في الخطة الأسبوعية 🎒
          </h2>
          <p className="text-xs sm:text-sm text-indigo-100 leading-relaxed">
            سجّل باسم الطالب واختر الفصل لمتابعة خطة المذاكرة اليومية وتجهيزات الغد مع خاصية الحفظ التلقائي.
          </p>
        </div>

        {/* Form Body */}
        <form onSubmit={handleSubmit} className="p-6 space-y-4 text-right">
          {error && (
            <div className="p-3 rounded-xl bg-rose-50 border border-rose-200 text-rose-800 text-xs font-bold flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-rose-500 shrink-0" />
              <span>{error}</span>
            </div>
          )}

          {/* Section Picker */}
          <div>
            <label className="block text-xs font-bold text-slate-700 mb-2 flex items-center justify-between">
              <span className="flex items-center gap-1.5">
                <School className="w-3.5 h-3.5 text-indigo-600" />
                <span>اختر الفصل الدراسي (Class Section) *</span>
              </span>
              <span className="text-[11px] text-indigo-600 font-bold">فصل {selectedSection}</span>
            </label>
            <div className="grid grid-cols-3 gap-2">
              {GRADE_SECTIONS.map((sec) => {
                const isSelected = selectedSection === sec.id;
                return (
                  <button
                    key={sec.id}
                    type="button"
                    onClick={() => onSectionChange(sec.id)}
                    className={`p-3 rounded-xl border-2 transition-all flex flex-col items-center justify-center gap-1 ${
                      isSelected
                        ? 'border-indigo-600 bg-indigo-50 text-indigo-900 font-black shadow-xs ring-2 ring-indigo-200'
                        : 'border-slate-200 bg-slate-50/50 hover:bg-slate-100 text-slate-700 font-medium'
                    }`}
                  >
                    <span className="text-base font-sans font-black">{sec.id}</span>
                    <span className="text-[11px] text-slate-500">{sec.nameAr.replace('فصل ', '')}</span>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Student Name Input */}
          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1.5 flex items-center justify-between">
              <span className="flex items-center gap-1.5">
                <User className="w-3.5 h-3.5 text-indigo-600" />
                <span>اسم الطالب (أو الطالبة) *</span>
              </span>
              <span className="text-[11px] text-indigo-600 font-normal">لتخصيص الخطة والمهام</span>
            </label>
            <div className="relative">
              <input
                type="text"
                required
                autoFocus
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="مثال: يوسف أحمد / مريم محمد"
                className="w-full pl-3 pr-10 py-3 rounded-xl border border-slate-300 focus:border-indigo-600 focus:ring-2 focus:ring-indigo-100 text-sm font-bold text-slate-900 outline-hidden text-right shadow-inner"
              />
              <User className="w-4 h-4 text-slate-400 absolute right-3.5 top-4" />
            </div>
          </div>

          {/* Remember Student Checkbox (Requested Feature) */}
          <div className="p-3.5 rounded-2xl bg-indigo-50/70 border border-indigo-100 transition-all hover:bg-indigo-50">
            <label className="flex items-start gap-3 cursor-pointer select-none">
              <input
                type="checkbox"
                checked={rememberMe}
                onChange={(e) => setRememberMe(e.target.checked)}
                className="mt-0.5 w-4 h-4 text-indigo-600 rounded-md border-indigo-300 focus:ring-indigo-500 cursor-pointer accent-indigo-600"
              />
              <div className="space-y-0.5 text-right">
                <div className="flex items-center gap-1.5 text-xs font-bold text-indigo-950">
                  <BookmarkCheck className="w-4 h-4 text-indigo-600" />
                  <span>حفظ اسم الطالب على هذا الجهاز (تذكرني دائماً)</span>
                </div>
                <p className="text-[11px] text-indigo-700/80 leading-relaxed">
                  عند التفعيل، لن تحتاج إلى كتابة اسم الطالب في المرات القادمة وسيدخل تلقائياً إلى الخطة.
                </p>
              </div>
            </label>
          </div>

          <div className="p-3 rounded-xl bg-slate-50 border border-slate-200 text-[11px] text-slate-600 space-y-1">
            <div className="flex items-center gap-1.5 font-bold text-slate-700">
              <ShieldCheck className="w-3.5 h-3.5 text-emerald-600" />
              <span>سهولة وخصوصية تامة:</span>
            </div>
            <p>لا نطلب أي بريد إلكتروني، يتم فقط حفظ اسم الطالب والفصل لعرض المواد والتجهيزات المطلوبة.</p>
          </div>

          <div className="pt-2 flex flex-col sm:flex-row items-center gap-2.5">
            <button
              type="submit"
              disabled={loading}
              className="w-full sm:flex-1 bg-indigo-600 hover:bg-indigo-700 text-white font-bold py-3 px-4 rounded-xl text-sm transition-all shadow-md shadow-indigo-900/20 active:scale-98 flex items-center justify-center gap-2 disabled:opacity-50 cursor-pointer"
            >
              <CheckCircle2 className="w-4 h-4" />
              <span>{loading ? 'جاري الحفظ...' : (isLoggedIn ? 'تحديث بيانات الطالب' : 'تسجيل ودخول للمنصة')}</span>
            </button>

            <button
              type="button"
              onClick={handleQuickEnter}
              className="w-full sm:w-auto px-4 py-3 rounded-xl text-xs font-bold text-slate-500 hover:text-slate-800 hover:bg-slate-100 transition-colors cursor-pointer"
              title="تصفح الخطة كزائر بدون حفظ بيانات"
            >
              المتابعة كزائر
            </button>
          </div>

          {isLoggedIn && onLogout && (
            <div className="pt-3 border-t border-slate-100 flex items-center justify-between">
              <span className="text-xs text-slate-500 font-medium">
                مسجل حالياً باسم: <strong className="text-indigo-900">{currentStudentName}</strong>
              </span>
              <button
                type="button"
                onClick={() => {
                  onLogout();
                  onClose();
                }}
                className="text-xs font-bold text-rose-600 hover:text-rose-700 bg-rose-50 hover:bg-rose-100 border border-rose-200 px-3 py-1.5 rounded-xl transition-colors flex items-center gap-1.5 cursor-pointer"
              >
                <LogOut className="w-3.5 h-3.5" />
                <span>تسجيل خروج</span>
              </button>
            </div>
          )}
        </form>
      </div>
    </div>
  );
};
