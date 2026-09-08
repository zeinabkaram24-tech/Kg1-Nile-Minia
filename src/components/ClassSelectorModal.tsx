import React from 'react';
import { School, CheckCircle2, Sparkles, ChevronLeft, BookOpen, Layers } from 'lucide-react';
import { GradeSection } from '../types';
import { GRADE_SECTIONS } from '../data/defaultData';

interface ClassSelectorModalProps {
  isOpen: boolean;
  currentSection: GradeSection;
  onSelectSection: (section: GradeSection) => void;
  onClose?: () => void;
  isInitialSelection?: boolean;
}

export const ClassSelectorModal: React.FC<ClassSelectorModalProps> = ({
  isOpen,
  currentSection,
  onSelectSection,
  onClose,
  isInitialSelection = false,
}) => {
  if (!isOpen) return null;

  const sectionDescriptions: Record<GradeSection, { title: string; subtitle: string; tag: string }> = {
    '2A': {
      title: 'فصل 2A (Grade 2A)',
      subtitle: 'عرض جدول حصص 2A، تجهيزات حقيبة الغد، وخطة المذاكرة الأسبوعية',
      tag: 'الأحد: حصة 1 تربية بدنية (PE)',
    },
    '2B': {
      title: 'فصل 2B (Grade 2B)',
      subtitle: 'عرض جدول حصص 2B، تجهيزات حقيبة الغد، وخطة المذاكرة الأسبوعية',
      tag: 'الأحد: حصة 1 فرنسي (Français)',
    },
    '2C': {
      title: 'فصل 2C (Grade 2C)',
      subtitle: 'عرض جدول حصص 2C، تجهيزات حقيبة الغد، وخطة المذاكرة الأسبوعية',
      tag: 'الأحد: حصة 1 رياضيات (Math)',
    },
  };

  return (
    <div className="fixed inset-0 z-50 bg-slate-900/80 backdrop-blur-xs flex items-center justify-center p-4 overflow-y-auto animate-fadeIn">
      <div className="bg-white rounded-3xl w-full max-w-lg shadow-2xl border border-slate-100 overflow-hidden text-slate-800 my-auto">
        {/* Top Gradient Header */}
        <div className="bg-gradient-to-r from-indigo-700 via-indigo-600 to-purple-700 p-6 text-white text-right relative">
          {!isInitialSelection && onClose && (
            <button
              type="button"
              onClick={onClose}
              className="absolute top-4 left-4 p-1.5 rounded-full bg-white/10 hover:bg-white/20 text-white transition-colors"
              title="إغلاق"
            >
              ✕
            </button>
          )}

          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-white/15 text-indigo-100 text-xs font-bold mb-3">
            <Sparkles className="w-3.5 h-3.5 text-amber-300" />
            <span>Nile Egyptian International Schools • Grade 2</span>
          </div>

          <h2 className="text-xl sm:text-2xl font-black mb-1.5 flex items-center gap-2">
            <School className="w-6 h-6 text-indigo-200" />
            <span>اختر فصلك الدراسي</span>
          </h2>
          <p className="text-xs sm:text-sm text-indigo-100 leading-relaxed">
            الخطة الأسبوعية موحدة للصف الثاني، ويتم تخصيص جدول الحصص اليومية وحقيبة ومطلوبات الغد بدقة حسب فصلك (2A / 2B / 2C).
          </p>
        </div>

        {/* Section Options Cards */}
        <div className="p-6 space-y-3">
          {GRADE_SECTIONS.map((sec) => {
            const isSelected = currentSection === sec.id;
            const meta = sectionDescriptions[sec.id];

            return (
              <button
                key={sec.id}
                type="button"
                onClick={() => {
                  onSelectSection(sec.id);
                  if (onClose) onClose();
                }}
                className={`w-full text-right p-4 rounded-2xl border-2 transition-all flex items-center justify-between group ${
                  isSelected
                    ? 'border-indigo-600 bg-indigo-50/70 shadow-md ring-2 ring-indigo-200'
                    : 'border-slate-200 hover:border-indigo-300 hover:bg-slate-50'
                }`}
              >
                <div className="flex items-center gap-3">
                  <div
                    className={`w-12 h-12 rounded-2xl flex items-center justify-center font-black font-sans text-base transition-transform group-hover:scale-105 ${
                      isSelected
                        ? 'bg-indigo-600 text-white shadow-sm'
                        : 'bg-slate-100 text-slate-700'
                    }`}
                  >
                    {sec.id}
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="font-black text-slate-900 text-sm sm:text-base">
                        {meta.title}
                      </span>
                      {isSelected && (
                        <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-indigo-600 text-white">
                          الفصل الحالي
                        </span>
                      )}
                    </div>
                    <p className="text-xs text-slate-500 mt-0.5">{meta.subtitle}</p>
                    <span className="inline-block mt-1 text-[11px] font-medium text-indigo-700 bg-indigo-100/60 px-2 py-0.5 rounded-md">
                      {meta.tag}
                    </span>
                  </div>
                </div>

                <div className="shrink-0 mr-2">
                  {isSelected ? (
                    <CheckCircle2 className="w-6 h-6 text-indigo-600" />
                  ) : (
                    <ChevronLeft className="w-5 h-5 text-slate-300 group-hover:text-indigo-500 group-hover:-translate-x-0.5 transition-transform" />
                  )}
                </div>
              </button>
            );
          })}
        </div>

        {/* Footer Note */}
        <div className="p-4 bg-slate-50 border-t border-slate-200 flex items-center justify-between text-xs text-slate-500">
          <div className="flex items-center gap-2">
            <Layers className="w-4 h-4 text-indigo-600" />
            <span>يمكنك دائماً تغيير الفصل بضغطة واحدة من أعلى التطبيق.</span>
          </div>

          {!isInitialSelection && onClose && (
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-1.5 rounded-xl bg-slate-200 hover:bg-slate-300 font-bold text-slate-700 transition-colors text-xs"
            >
              إغلاق
            </button>
          )}
        </div>
      </div>
    </div>
  );
};
