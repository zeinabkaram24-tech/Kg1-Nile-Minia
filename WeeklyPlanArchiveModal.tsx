import React, { useState } from 'react';
import {
  X,
  Layers,
  Calendar,
  CheckCircle2,
  Clock,
  ArrowRight,
  Plus,
  Trash2,
  Star,
  FileText,
  Bookmark,
  Shield,
  History,
  FolderArchive,
} from 'lucide-react';
import { GradeSection, WeeklyPlanArchiveEntry } from '../types';

interface WeeklyPlanArchiveModalProps {
  isOpen: boolean;
  onClose: () => void;
  archive: WeeklyPlanArchiveEntry[];
  activePlanId: string;
  currentSection: GradeSection;
  isAdmin: boolean;
  onSelectPlan: (planId: string) => void;
  onSetAsCurrent: (planId: string) => void;
  onDeletePlan?: (planId: string) => void;
  onOpenUploadNewPlan: () => void;
  onOpenAdminLogin: () => void;
  userRole?: 'admin' | 'student' | 'visitor';
}

export const WeeklyPlanArchiveModal: React.FC<WeeklyPlanArchiveModalProps> = ({
  isOpen,
  onClose,
  archive,
  activePlanId,
  currentSection,
  isAdmin,
  onSelectPlan,
  onSetAsCurrent,
  onDeletePlan,
  onOpenUploadNewPlan,
  onOpenAdminLogin,
  userRole = 'student',
}) => {
  const [selectedBlockFilter, setSelectedBlockFilter] = useState<number | 'all'>('all');

  if (!isOpen) return null;

  // Unique blocks in archive
  const uniqueBlocks = archive
    .map((p) => p.blockNumber)
    .filter((v, i, arr) => arr.indexOf(v) === i)
    .sort((a, b) => a - b);

  // Filtered archive
  const filteredPlans = archive.filter((p) => {
    if (selectedBlockFilter === 'all') return true;
    return p.blockNumber === selectedBlockFilter;
  });

  return (
    <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-3 sm:p-5 overflow-y-auto animate-fadeIn">
      <div className="bg-white rounded-3xl w-full max-w-3xl shadow-2xl border border-slate-100 my-4 flex flex-col max-h-[90vh] overflow-hidden">
        {/* Header */}
        <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between bg-slate-50/90">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-indigo-600 text-white flex items-center justify-center font-bold shadow-xs">
              <FolderArchive className="w-5 h-5 stroke-[2.25]" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-lg sm:text-xl font-black text-slate-900">
                  ذاكرة وأرشيف الخطط الأسبوعية
                </h3>
                <span className="text-[11px] px-2.5 py-0.5 rounded-full bg-indigo-100 text-indigo-800 font-bold font-sans">
                  Block & Week Archive
                </span>
              </div>
              <p className="text-xs text-slate-500 mt-0.5">
                يمكنك في أي وقت الرجوع لأي أسبوع أو بلوك سابق ومراجعة مهامه وتكليفاته الأصلية
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="p-2 rounded-xl text-slate-400 hover:text-slate-700 hover:bg-slate-200 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Filter Toolbar */}
        <div className="px-6 py-3 bg-white border-b border-slate-100 flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-1.5 overflow-x-auto py-1">
            <span className="text-xs font-bold text-slate-500 ms-1">تصفية حسب البلوك:</span>
            <button
              type="button"
              onClick={() => setSelectedBlockFilter('all')}
              className={`px-3 py-1 rounded-xl text-xs font-bold transition-all ${
                selectedBlockFilter === 'all'
                  ? 'bg-indigo-600 text-white shadow-2xs'
                  : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
              }`}
            >
              جميع البلوكات ({archive.length})
            </button>
            {uniqueBlocks.map((blockNum) => (
              <button
                key={blockNum}
                type="button"
                onClick={() => setSelectedBlockFilter(blockNum)}
                className={`px-3 py-1 rounded-xl text-xs font-bold transition-all ${
                  selectedBlockFilter === blockNum
                    ? 'bg-indigo-600 text-white shadow-2xs'
                    : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                }`}
              >
                Block {blockNum}
              </button>
            ))}
          </div>

          {isAdmin && (
            <button
              type="button"
              onClick={() => {
                onClose();
                onOpenUploadNewPlan();
              }}
              className="px-3.5 py-1.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold flex items-center gap-1.5 shadow-2xs transition-all"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>إضافة خطة أسبوع جديد</span>
            </button>
          )}
        </div>

        {/* List of Weeks in Archive */}
        <div className="p-5 sm:p-6 overflow-y-auto space-y-3.5 flex-1 bg-[#F8FAFC]">
          {filteredPlans.length === 0 ? (
            <div className="text-center py-10 bg-white rounded-2xl border border-slate-200">
              <FolderArchive className="w-10 h-10 text-slate-300 mx-auto mb-2" />
              <p className="text-sm font-bold text-slate-600">لا توجد خطط مؤرشفة لهذا البلوك</p>
            </div>
          ) : (
            filteredPlans.map((plan) => {
              const isSelected = plan.id === activePlanId;
              const isCurrent = plan.isCurrent;
              const sectionTasksCount = plan.tasksBySection?.[currentSection]?.length || 0;
              const allTasksCount =
                (plan.tasksBySection?.['2A']?.length || 0) +
                (plan.tasksBySection?.['2B']?.length || 0) +
                (plan.tasksBySection?.['2C']?.length || 0);

              return (
                <div
                  key={plan.id}
                  className={`bg-white rounded-2xl p-4 sm:p-5 border transition-all duration-200 ${
                    isSelected
                      ? 'border-indigo-500 ring-2 ring-indigo-500/20 shadow-md'
                      : 'border-slate-200 hover:border-indigo-200 hover:shadow-xs'
                  }`}
                >
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                    {/* Left Details */}
                    <div className="space-y-1.5 flex-1">
                      <div className="flex flex-wrap items-center gap-2">
                        <span className="px-2.5 py-0.5 rounded-lg bg-indigo-100 text-indigo-800 text-xs font-black font-sans">
                          Block {plan.blockNumber} • Week {plan.weekNumber}
                        </span>

                        {isCurrent && (
                          <span className="px-2.5 py-0.5 rounded-lg bg-emerald-100 text-emerald-800 text-xs font-black flex items-center gap-1">
                            <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
                            <span>الأسبوع الحالي النشط للجميع</span>
                          </span>
                        )}

                        {isSelected && !isCurrent && (
                          <span className="px-2.5 py-0.5 rounded-lg bg-amber-100 text-amber-800 text-xs font-black">
                            تتصفحه الآن كأرشيف سابق 🔍
                          </span>
                        )}
                      </div>

                      <h4 className="text-base sm:text-lg font-black text-slate-900">
                        {plan.title}
                      </h4>

                      <div className="flex flex-wrap items-center gap-y-1 gap-x-3 text-xs text-slate-500">
                        {plan.startDate && (
                          <span className="flex items-center gap-1 font-sans">
                            <Calendar className="w-3.5 h-3.5 text-slate-400" />
                            <span>
                              {plan.startDate} {plan.endDate ? `- ${plan.endDate}` : ''}
                            </span>
                          </span>
                        )}

                        <span className="flex items-center gap-1">
                          <CheckCircle2 className="w-3.5 h-3.5 text-indigo-500" />
                          <span>
                            مهام فصل {currentSection}:{' '}
                            <strong className="text-slate-800">{sectionTasksCount} مهمة</strong>
                          </span>
                        </span>

                        {plan.uploadedFiles && plan.uploadedFiles.length > 0 && (
                          <span className="flex items-center gap-1">
                            <FileText className="w-3.5 h-3.5 text-purple-500" />
                            <span>
                              <strong className="text-purple-700">
                                {plan.uploadedFiles.length}
                              </strong>{' '}
                              ملف خطة مرفوع
                            </span>
                          </span>
                        )}
                      </div>

                      {plan.notes && (
                        <p className="text-[11px] text-slate-500 bg-slate-50 p-2 rounded-xl border border-slate-100">
                          💡 {plan.notes}
                        </p>
                      )}
                    </div>

                    {/* Right Actions */}
                    <div className="flex flex-wrap sm:flex-col items-end gap-2 shrink-0">
                      {isSelected ? (
                        <div className="w-full sm:w-auto px-4 py-2 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs font-black flex items-center justify-center gap-1.5">
                          <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                          <span>معروض حالياً في التطبيق</span>
                        </div>
                      ) : (
                        <button
                          type="button"
                          onClick={() => {
                            onSelectPlan(plan.id);
                            onClose();
                          }}
                          className="w-full sm:w-auto px-4 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-700 active:scale-98 text-white text-xs font-bold transition-all flex items-center justify-center gap-1.5 shadow-2xs"
                        >
                          <span>الانتقال وتصفح هذا الأسبوع</span>
                          <ArrowRight className="w-3.5 h-3.5 rotate-180" />
                        </button>
                      )}

                      {isAdmin && (
                        <div className="flex items-center gap-1.5 w-full sm:w-auto justify-end pt-1">
                          {!isCurrent && (
                            <button
                              type="button"
                              onClick={() => onSetAsCurrent(plan.id)}
                              className="px-2.5 py-1 rounded-lg text-[11px] font-bold bg-slate-100 hover:bg-emerald-50 hover:text-emerald-700 text-slate-600 transition-colors"
                              title="جعله الأسبوع الحالي الافتراضي للجميع"
                            >
                              تعيين كأسبوع حالي ⭐
                            </button>
                          )}

                          {archive.length > 1 && onDeletePlan && (
                            <button
                              type="button"
                              onClick={() => {
                                if (
                                  window.confirm(
                                    `هل تريد بالتأكيد حذف "${plan.title}" من الأرشيف نهائياً؟`
                                  )
                                ) {
                                  onDeletePlan(plan.id);
                                }
                              }}
                              className="p-1.5 rounded-lg text-slate-400 hover:text-rose-600 hover:bg-rose-50 transition-colors"
                              title="حذف الأسبوع من الأرشيف"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          )}
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              );
            })
          )}
        </div>

        {/* Footer */}
        <div className="px-6 py-3.5 border-t border-slate-100 bg-white flex flex-wrap items-center justify-between gap-3 text-xs text-slate-500">
          <div className="flex items-center gap-2">
            <History className="w-4 h-4 text-indigo-600" />
            <span>
              ذاكرة التطبيق تحتفظ بجميع الأسابيع والبلوكات السابقة دون مسح أو فقدان للبيانات.
            </span>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold transition-colors"
          >
            إغلاق الأرشيف
          </button>
        </div>
      </div>
    </div>
  );
};
