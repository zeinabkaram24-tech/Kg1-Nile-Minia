import React, { useState, useEffect } from 'react';
import { User, GraduationCap, Eye, Sparkles, CheckCircle2, ArrowRight, X, Trash2 } from 'lucide-react';
import { ClassId, UserProfile } from '../types';
import { getKnownStudents, removeKnownStudent } from '../utils/studentStorage';
import { ALL_CLASSES } from '../data/timetables';

interface StudentAuthModalProps {
  isOpen: boolean;
  onClose: () => void;
  currentProfile: UserProfile | null;
  currentClass: ClassId;
  onSelectProfile: (profile: UserProfile) => void;
}

export const StudentAuthModal: React.FC<StudentAuthModalProps> = ({
  isOpen,
  onClose,
  currentProfile,
  currentClass,
  onSelectProfile,
}) => {
  const [studentName, setStudentName] = useState(
    currentProfile?.mode === 'student' ? currentProfile.studentName || '' : ''
  );
  const [selectedClass, setSelectedClass] = useState<ClassId>(
    currentProfile?.classId || currentClass
  );
  const [knownStudents, setKnownStudents] = useState<
    { name: string; classId?: ClassId; lastActive: number }[]
  >([]);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  useEffect(() => {
    if (isOpen) {
      setKnownStudents(getKnownStudents());
      if (currentProfile?.mode === 'student' && currentProfile.studentName) {
        setStudentName(currentProfile.studentName);
      }
      setSelectedClass(currentProfile?.classId || currentClass);
      setErrorMsg(null);
    }
  }, [isOpen, currentProfile, currentClass]);

  if (!isOpen) return null;

  const handleEnterAsStudent = (nameToUse?: string, classToUse?: ClassId) => {
    const finalName = (nameToUse || studentName).trim();
    if (!finalName) {
      setErrorMsg('يرجى كتابة اسم الطالب أولاً للمتابعة.');
      return;
    }
    const finalClass = classToUse || selectedClass;
    onSelectProfile({
      mode: 'student',
      studentName: finalName,
      classId: finalClass,
    });
    onClose();
  };

  const handleEnterAsGuest = () => {
    onSelectProfile({
      mode: 'guest',
      classId: currentClass,
    });
    onClose();
  };

  const handleRemoveSavedStudent = (name: string, e: React.MouseEvent) => {
    e.stopPropagation();
    removeKnownStudent(name);
    setKnownStudents(getKnownStudents());
    if (studentName === name) {
      setStudentName('');
    }
  };

  const canDismiss = currentProfile !== null;

  return (
    <div
      id="student-auth-modal-backdrop"
      className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-3.5 sm:p-4 overflow-y-auto"
      dir="rtl"
    >
      <div
        id="student-auth-modal"
        className="bg-white rounded-3xl max-w-lg w-full shadow-2xl border border-slate-200 overflow-hidden my-auto animate-fade-in"
      >
        {/* Top Header Banner */}
        <div className="bg-gradient-to-r from-slate-900 via-indigo-950 to-slate-900 text-white p-5 sm:p-6 relative">
          {canDismiss && (
            <button
              onClick={onClose}
              className="absolute top-4 left-4 text-slate-400 hover:text-white p-1.5 rounded-full hover:bg-white/10 transition-colors"
              title="إغلاق"
            >
              <X className="w-5 h-5" />
            </button>
          )}

          <div className="flex items-center gap-3">
            <div className="w-11 h-11 rounded-2xl bg-indigo-500/20 border border-indigo-400/30 flex items-center justify-center text-indigo-300 shadow-inner">
              <GraduationCap className="w-6 h-6 text-indigo-300" />
            </div>
            <div>
              <span className="text-[11px] font-bold tracking-wider text-indigo-300 uppercase block">
                Nile Egyptian International School
              </span>
              <h2 className="text-lg sm:text-xl font-black text-white leading-tight">
                اختر طريقة الدخول
              </h2>
            </div>
          </div>
          <p className="text-xs sm:text-sm text-slate-300 mt-2 leading-relaxed">
            يمكنك الدخول باسم الطالب لحفظ الواجبات والإنجازات (Done)، أو الدخول كزائر للتصفح السريع.
          </p>
        </div>

        {/* Modal Body */}
        <div className="p-5 sm:p-6 space-y-6">
          {/* OPTION 1: Enter as Student (Recommended) */}
          <div className="border-2 border-indigo-200 bg-indigo-50/40 rounded-2xl p-4 sm:p-5 space-y-4 shadow-xs relative">
            <div className="flex items-center justify-between gap-2">
              <div className="flex items-center gap-2 text-indigo-950">
                <div className="w-8 h-8 rounded-xl bg-indigo-600 text-white flex items-center justify-center shadow-xs">
                  <User className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="text-sm sm:text-base font-black text-indigo-950">
                    الدخول باسم الطالب (يوصى به)
                  </h3>
                  <p className="text-[11px] sm:text-xs text-indigo-700 font-bold">
                    حفظ تلقائي لجميع علامات الإنجاز (Done) باسم الطالب
                  </p>
                </div>
              </div>
              <span className="bg-indigo-600 text-white text-[10px] font-black px-2 py-0.5 rounded-full shadow-2xs">
                حفظ دائم
              </span>
            </div>

            {/* Input Form */}
            <div className="space-y-3 pt-1">
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1.5">
                  اسم الطالب / الطالبة:
                </label>
                <div className="relative">
                  <input
                    id="student-name-input"
                    type="text"
                    value={studentName}
                    onChange={(e) => {
                      setStudentName(e.target.value);
                      setErrorMsg(null);
                    }}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') handleEnterAsStudent();
                    }}
                    placeholder="اكتب اسم الطالب (مثال: أحمد علي)..."
                    className="w-full bg-white border border-indigo-300 rounded-xl px-3.5 py-2.5 text-sm font-bold text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 shadow-2xs"
                  />
                  {studentName && (
                    <button
                      type="button"
                      onClick={() => setStudentName('')}
                      className="absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 p-1 text-xs"
                    >
                      مسح
                    </button>
                  )}
                </div>
                {errorMsg && (
                  <p className="text-xs text-rose-600 font-bold mt-1 animate-fade-in">
                    {errorMsg}
                  </p>
                )}
              </div>

              {/* Class Selection Pills */}
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1.5">
                  اختر الفصل الدراسي (KG 1):
                </label>
                <div className="grid grid-cols-5 gap-1.5">
                  {ALL_CLASSES.map((cls) => {
                    const isSelected = selectedClass === cls.id;
                    return (
                      <button
                        key={cls.id}
                        type="button"
                        onClick={() => setSelectedClass(cls.id)}
                        className={`py-1.5 px-2 rounded-xl font-black text-xs border transition-all text-center ${
                          isSelected
                            ? 'bg-slate-900 text-white border-slate-900 shadow-xs'
                            : 'bg-white text-slate-700 border-slate-300 hover:bg-slate-100'
                        }`}
                      >
                        {cls.label}
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Previously Saved Students Chips */}
              {knownStudents.length > 0 && (
                <div className="pt-1">
                  <span className="text-[11px] font-bold text-indigo-900/80 block mb-1.5">
                    أو اختر طالباً مسجلاً من قبل على هذا الجهاز:
                  </span>
                  <div className="flex flex-wrap gap-1.5">
                    {knownStudents.map((s) => (
                      <div
                        key={s.name}
                        onClick={() => {
                          setStudentName(s.name);
                          if (s.classId) setSelectedClass(s.classId);
                          handleEnterAsStudent(s.name, s.classId);
                        }}
                        className="group inline-flex items-center gap-1.5 bg-white hover:bg-indigo-100/70 border border-indigo-200 text-slate-800 text-xs font-bold px-2.5 py-1 rounded-xl cursor-pointer transition-all shadow-2xs hover:shadow-xs"
                      >
                        <User className="w-3 h-3 text-indigo-600" />
                        <span>{s.name}</span>
                        {s.classId && (
                          <span className="text-[10px] text-indigo-900 bg-indigo-50 px-1 py-0.2 rounded font-black border border-indigo-100">
                            {s.classId.replace('G', '')}
                          </span>
                        )}
                        <button
                          type="button"
                          onClick={(e) => handleRemoveSavedStudent(s.name, e)}
                          className="text-slate-300 hover:text-rose-600 p-0.5 transition-colors ms-0.5"
                          title="حذف من القائمة"
                        >
                          <Trash2 className="w-3 h-3" />
                        </button>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Action Button */}
              <button
                type="button"
                onClick={() => handleEnterAsStudent()}
                className="w-full bg-indigo-600 hover:bg-indigo-700 active:bg-indigo-800 text-white font-black text-sm py-2.5 px-4 rounded-xl transition-all shadow-md flex items-center justify-center gap-2 cursor-pointer mt-2"
              >
                <CheckCircle2 className="w-4 h-4" />
                <span>دخول وحفظ إنجازات الطالب</span>
              </button>

              <p className="text-[11px] text-slate-500 text-center leading-relaxed">
                أي علامة تم إنجازها (Done) أو إلغاؤها ستُحفظ تلقائياً باسم الطالب، وتجدها دائماً كما تركتها عند عودتك.
              </p>
            </div>
          </div>

          {/* Divider */}
          <div className="relative flex items-center justify-center">
            <div className="border-t border-slate-200 w-full" />
            <span className="bg-white px-3 text-xs font-bold text-slate-400 absolute">أو</span>
          </div>

          {/* OPTION 2: Enter as Guest */}
          <div className="border border-slate-200 hover:border-slate-300 rounded-2xl p-4 bg-slate-50/70 transition-all flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
            <div className="flex items-start gap-2.5">
              <div className="w-8 h-8 rounded-xl bg-slate-200 text-slate-700 flex items-center justify-center shrink-0 mt-0.5">
                <Eye className="w-4 h-4" />
              </div>
              <div className="space-y-0.5">
                <h4 className="text-xs sm:text-sm font-black text-slate-800">
                  الدخول كزائر (تصفح فقط)
                </h4>
                <p className="text-[11px] text-slate-500 leading-snug">
                  تصفح الخطة والمواعيد بدون حفظ حالة الإنجاز (Done) بعد إغلاق المتصفح.
                </p>
              </div>
            </div>

            <button
              type="button"
              onClick={handleEnterAsGuest}
              className="w-full sm:w-auto shrink-0 bg-white hover:bg-slate-100 text-slate-800 border border-slate-300 font-black text-xs py-2 px-4 rounded-xl transition-all shadow-2xs cursor-pointer flex items-center justify-center gap-1.5"
            >
              <span>دخول كزائر</span>
              <ArrowRight className="w-3.5 h-3.5 rotate-180" />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
