import React, { useState } from 'react';
import { ShieldCheck, Lock, KeyRound, Check, X, AlertCircle, Sparkles, UserCheck } from 'lucide-react';
import { isAdminLoggedIn, setAdminLoggedIn, verifyAdminPassword } from '../utils/storage';

interface AdminAuthModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess?: () => void;
  reasonTitle?: string;
  reasonMessage?: string;
}

export const AdminAuthModal: React.FC<AdminAuthModalProps> = ({
  isOpen,
  onClose,
  onSuccess,
  reasonTitle = 'صلاحية المشرف العام (الأدمن)',
  reasonMessage = 'إضافة ملفات الخطط الأسبوعية وتعديل الجداول مقتصر على الأدمن فقط.',
}) => {
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [isSuccess, setIsSuccess] = useState(false);
  const currentlyAdmin = isAdminLoggedIn();

  if (!isOpen) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!password.trim()) {
      setError('يرجى كتابة رمز المرور أو البريد الإلكتروني للأدمن');
      return;
    }

    if (verifyAdminPassword(password)) {
      setAdminLoggedIn(true);
      setIsSuccess(true);
      setTimeout(() => {
        setIsSuccess(false);
        setPassword('');
        if (onSuccess) onSuccess();
        onClose();
      }, 700);
    } else {
      setError('رمز المرور غير صحيح. يرجى التأكد من الرمز والمحاولة ثانية.');
    }
  };

  const handleLogoutAdmin = () => {
    setAdminLoggedIn(false);
    onClose();
    window.location.reload();
  };

  return (
    <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 animate-fadeIn">
      <div className="bg-white rounded-3xl w-full max-w-md shadow-2xl border border-slate-100 overflow-hidden">
        {/* Header */}
        <div className="bg-gradient-to-r from-indigo-700 via-indigo-600 to-indigo-800 text-white p-6 relative">
          <button
            type="button"
            onClick={onClose}
            className="absolute top-4 start-4 p-2 rounded-full bg-white/10 hover:bg-white/20 text-white transition-colors"
          >
            <X className="w-5 h-5" />
          </button>

          <div className="flex flex-col items-center text-center pt-2">
            <div className="w-14 h-14 rounded-2xl bg-white/15 border border-white/20 flex items-center justify-center mb-3 shadow-inner">
              {currentlyAdmin ? (
                <ShieldCheck className="w-8 h-8 text-emerald-300" />
              ) : (
                <Lock className="w-8 h-8 text-amber-300" />
              )}
            </div>
            <h3 className="text-xl font-black">{reasonTitle}</h3>
            <p className="text-xs text-indigo-100 mt-1 max-w-xs">{reasonMessage}</p>
          </div>
        </div>

        {/* Content */}
        <div className="p-6">
          {currentlyAdmin ? (
            <div className="space-y-4">
              <div className="p-4 rounded-2xl bg-emerald-50 border border-emerald-200 text-emerald-950 flex items-start gap-3">
                <ShieldCheck className="w-5 h-5 text-emerald-600 shrink-0 mt-0.5" />
                <div className="text-xs leading-relaxed">
                  <span className="font-bold block text-sm mb-0.5">وضع الأدمن نشط حالياً 👑</span>
                  أنت مسجل الدخول بصلاحية المشرف الكاملة (أ. زينب كرم). يمكنك إضافة وتعديل ملفات الخطط الأسبوعية وتعديل الجدول الدراسي.
                </div>
              </div>

              <div className="flex items-center gap-2 pt-2">
                <button
                  type="button"
                  onClick={onClose}
                  className="flex-1 py-3 px-4 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold transition-all shadow-xs"
                >
                  متابعة العمل كأدمن
                </button>
                <button
                  type="button"
                  onClick={handleLogoutAdmin}
                  className="py-3 px-4 rounded-xl bg-slate-100 hover:bg-rose-50 hover:text-rose-700 text-slate-600 text-xs font-bold transition-all"
                >
                  تسجيل خروج الأدمن
                </button>
              </div>
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="p-3.5 rounded-2xl bg-amber-50/80 border border-amber-200 text-amber-950 text-xs flex items-start gap-2.5">
                <AlertCircle className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
                <div className="leading-relaxed">
                  هذا الإجراء مخصص للأدمن فقط (المسؤولة: أ. زينب كرم). إذا كنتِ الأدمن، يرجى كتابة رمز المرور لتفعيل التعديل وإضافة الخطط.
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1.5 flex items-center justify-between">
                  <span className="flex items-center gap-1.5">
                    <KeyRound className="w-3.5 h-3.5 text-indigo-600" />
                    <span>رمز مرور الأدمن (Admin Password / PIN):</span>
                  </span>
                </label>
                <input
                  type="password"
                  value={password}
                  onChange={(e) => {
                    setPassword(e.target.value);
                    setError(null);
                  }}
                  placeholder="أدخل كلمة المرور..."
                  autoFocus
                  className="w-full px-4 py-3 rounded-xl border border-slate-300 focus:outline-hidden focus:ring-2 focus:ring-indigo-500 text-sm font-bold text-slate-900 text-center tracking-widest"
                />
              </div>

              {error && (
                <div className="p-3 rounded-xl bg-rose-50 border border-rose-200 text-rose-700 text-xs font-medium flex items-center gap-2">
                  <AlertCircle className="w-4 h-4 shrink-0" />
                  <span>{error}</span>
                </div>
              )}

              {isSuccess && (
                <div className="p-3 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-700 text-xs font-bold flex items-center justify-center gap-2 animate-fadeIn">
                  <Check className="w-4 h-4" />
                  <span>تم تفعيل وضع الأدمن بنجاح! جاري المتابعة...</span>
                </div>
              )}

              <div className="pt-2 flex items-center gap-2">
                <button
                  type="submit"
                  className="flex-1 py-3 px-4 rounded-xl bg-indigo-600 hover:bg-indigo-700 active:scale-98 text-white text-xs font-bold transition-all shadow-xs flex items-center justify-center gap-2"
                >
                  <Sparkles className="w-4 h-4" />
                  <span>تأكيد تسجيل الدخول كأدمن</span>
                </button>
                <button
                  type="button"
                  onClick={onClose}
                  className="py-3 px-4 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-600 text-xs font-bold transition-all"
                >
                  إلغاء
                </button>
              </div>
            </form>
          )}
        </div>
      </div>
    </div>
  );
};
