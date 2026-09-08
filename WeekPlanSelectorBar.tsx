import React from 'react';
import {
  Calendar,
  Layers,
  ChevronDown,
  Sparkles,
  History,
  ArrowRight,
  Plus,
  FileText,
  CheckCircle2,
  FolderArchive,
  BookOpen,
} from 'lucide-react';
import { GradeSection, PlanTask, WeeklyPlanArchiveEntry } from '../types';
import { getLatestWeeklyPlan } from '../utils/storage';

interface WeekPlanSelectorBarProps {
  archive: WeeklyPlanArchiveEntry[];
  activePlanId: string;
  onSelectPlan: (planId: string) => void;
  onOpenArchiveModal: () => void;
  onOpenUploadNewPlan: () => void;
  onOpenMaterialsModal?: () => void;
  isAdmin: boolean;
  currentSection: GradeSection;
  tasks: PlanTask[];
  onOpenAdminLogin?: () => void;
  userRole?: 'admin' | 'student' | 'visitor';
}

export const WeekPlanSelectorBar: React.FC<WeekPlanSelectorBarProps> = ({
  archive,
  activePlanId,
  onSelectPlan,
  onOpenArchiveModal,
  onOpenUploadNewPlan,
  onOpenMaterialsModal,
  isAdmin,
  currentSection,
  tasks,
  onOpenAdminLogin,
  userRole = 'student',
}) => {
  // Sort plans so latest/newest block and week comes first in dropdown
  const sortedPlans = [...archive].sort((a, b) => {
    const bBlock = b.blockNumber || 1;
    const aBlock = a.blockNumber || 1;
    if (bBlock !== aBlock) return bBlock - aBlock;

    const bWeek = b.weekNumber || 1;
    const aWeek = a.weekNumber || 1;
    if (bWeek !== aWeek) return bWeek - aWeek;

    return (b.createdAt || 0) - (a.createdAt || 0);
  });

  const activePlan = archive.find((p) => p.id === activePlanId) || sortedPlans[0];
  const latestPlan = getLatestWeeklyPlan(archive);
  const isViewingArchive = activePlan && activePlan.id !== latestPlan.id;

  // Task statistics for the currently active week & section
  const sectionTasks = tasks.filter(
    (t) => !t.section || t.section === currentSection
  );
  const totalTasks = sectionTasks.length;
  const completedTasks = sectionTasks.filter((t) => t.isDone).length;
  const pendingTasks = totalTasks - completedTasks;
  const completionRate = totalTasks > 0 ? Math.round((completedTasks / totalTasks) * 100) : 0;

  // Uploaded files for this specific week
  const weekFilesCount = activePlan?.uploadedFiles?.length || 0;

  const handleDropdownChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const chosenId = e.target.value;
    if (chosenId && chosenId !== activePlanId) {
      onSelectPlan(chosenId);
    }
  };

  return (
    <div className="w-full space-y-2 mb-4">
      {/* 1. Main Week Selector Toolbar with Dropdown List */}
      <div className="bg-white rounded-2xl border border-slate-200/90 p-3 sm:p-4 shadow-xs flex flex-wrap items-center justify-between gap-3">
        {/* Dropdown Select Area */}
        <div className="flex items-center gap-3 flex-1 min-w-[280px]">
          <div className="w-10 h-10 rounded-xl bg-indigo-50 border border-indigo-100 flex items-center justify-center text-indigo-700 shrink-0 shadow-2xs">
            <Layers className="w-5 h-5 stroke-[2.25]" />
          </div>

          <div className="flex-1">
            <div className="flex items-center gap-2 mb-1">
              {activePlan?.isCurrent || activePlan?.id === latestPlan?.id ? (
                <span className="px-3 py-1 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs sm:text-sm font-black flex items-center gap-2 font-sans shadow-2xs">
                  <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
                  <span>الأسبوع الحالي: Block {activePlan?.blockNumber || 1} - Week {activePlan?.weekNumber || 1}</span>
                </span>
              ) : (
                <span className="px-3 py-1 rounded-xl bg-amber-50 border border-amber-200 text-amber-900 text-xs font-black flex items-center gap-2 font-sans">
                  <History className="w-3.5 h-3.5 text-amber-700" />
                  <span>أرشيف أسبوع سابق: Block {activePlan?.blockNumber || 1} - Week {activePlan?.weekNumber || 1}</span>
                </span>
              )}
            </div>

            {/* Dropdown Select Menu containing all available weeks (shown when more than one week exists) */}
            {sortedPlans.length > 1 && (
              <div className="relative">
                <select
                  id="weekly-plan-archive-select"
                  value={activePlanId}
                  onChange={handleDropdownChange}
                  aria-label="اختيار خطة الأسبوع والبلوك"
                  className="w-full pe-9 ps-3 py-1.5 rounded-xl border border-slate-300 hover:border-indigo-400 focus:border-indigo-600 focus:ring-2 focus:ring-indigo-100 bg-slate-50 hover:bg-white text-slate-900 font-bold text-xs transition-all appearance-none cursor-pointer shadow-2xs"
                >
                  {sortedPlans.map((plan) => {
                    const isLatest = plan.id === latestPlan.id || plan.isCurrent;
                    const labelPrefix = isLatest ? '🌟 [الأسبوع الحالي] ' : '📁 [أرشيف] ';
                    const blockWeekStr = `Block ${plan.blockNumber || 1} - Week ${plan.weekNumber || 1}`;
                    const dateStr = plan.startDate ? ` (${plan.startDate} - ${plan.endDate || ''})` : '';
                    return (
                      <option key={plan.id} value={plan.id}>
                        {labelPrefix} {blockWeekStr}: {plan.title} {dateStr}
                      </option>
                    );
                  })}
                </select>
                <div className="pointer-events-none absolute end-2.5 top-1/2 -translate-y-1/2 text-slate-500">
                  <ChevronDown className="w-4 h-4" />
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Right Action Buttons */}
        <div className="flex flex-wrap items-center gap-2 ms-auto">
          {/* Quick Progress Badge for this week */}
          <div
            className="px-3 py-2 rounded-xl bg-slate-50 border border-slate-200 text-xs font-bold text-slate-700 flex items-center gap-1.5 font-sans"
            title={`إنجاز مهام هذا الأسبوع لفصل ${currentSection}: ${completedTasks} من أصل ${totalTasks}`}
          >
            <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
            <span>
              {completedTasks}/{totalTasks} Done ({completionRate}%)
            </span>
          </div>

          {/* Materials of this week */}
          {onOpenMaterialsModal && (
            <button
              type="button"
              id="btn-week-sheets"
              onClick={onOpenMaterialsModal}
              className="px-3.5 py-2 rounded-xl text-xs font-bold bg-indigo-50 hover:bg-indigo-100 text-indigo-800 border border-indigo-200 transition-colors flex items-center gap-1.5 cursor-pointer shadow-2xs font-sans"
              title="Materials"
            >
              <BookOpen className="w-3.5 h-3.5 text-indigo-600" />
              <span>Materials</span>
            </button>
          )}

          {/* Detailed Archive Modal Button */}
          <button
            type="button"
            id="btn-week-full-archive"
            onClick={onOpenArchiveModal}
            className="px-3 py-2 rounded-xl text-xs font-bold bg-purple-50 hover:bg-purple-100 text-purple-900 border border-purple-200 transition-colors flex items-center gap-1.5 cursor-pointer shadow-2xs font-sans"
            title="فتح نافذة الأرشيف الشاملة للبلوكات والأسابيع"
          >
            <FolderArchive className="w-3.5 h-3.5 text-purple-600" />
            <span className="hidden sm:inline">الأرشيف الشامل</span>
            <span className="sm:hidden">الأرشيف</span>
          </button>

          {/* Admin Add New Week Plan Button (Admin Only) */}
          {isAdmin && (
            <button
              type="button"
              id="btn-admin-add-new-week"
              onClick={onOpenUploadNewPlan}
              className="px-3.5 py-2 rounded-xl text-xs font-bold bg-indigo-600 hover:bg-indigo-700 text-white shadow-xs transition-all flex items-center gap-1.5 cursor-pointer active:scale-95 font-sans"
              title="إضافة وتجهيز خطة أسبوع جديد بالبلوك والأسبوع"
            >
              <Plus className="w-3.5 h-3.5 stroke-[2.5]" />
              <span>+ إضافة أسبوع جديد</span>
            </button>
          )}
        </div>
      </div>

      {/* 2. Archive Viewing Notice Banner (Shown when user selects a past week from dropdown) */}
      {isViewingArchive && (
        <div className="p-3 sm:p-3.5 rounded-2xl bg-amber-50 border border-amber-200 text-amber-950 text-xs flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 animate-fadeIn">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-xl bg-amber-200/80 text-amber-900 flex items-center justify-center shrink-0">
              <History className="w-4 h-4" />
            </div>
            <div>
              <div className="font-bold flex items-center gap-1.5">
                <span>أنت تتصفح حالياً أرشيف:</span>
                <span className="font-mono bg-amber-200/70 px-2 py-0.5 rounded text-amber-900 font-black">
                  Block {activePlan?.blockNumber || 1} - Week {activePlan?.weekNumber || 1}
                </span>
                <span>({activePlan?.title})</span>
              </div>
              <p className="text-[11px] text-amber-800 mt-0.5">
                يمكنك مراجعة مهام وشيتات هذا الأسبوع ومتابعة ما لم يكتمل بعد (متبقي {pendingTasks} مهمة).
                حالة الإنجاز محفوظة على جهازك محلياً!
              </p>
            </div>
          </div>

          <button
            type="button"
            id="btn-return-current-week"
            onClick={() => onSelectPlan(latestPlan.id)}
            className="px-3.5 py-1.5 rounded-xl bg-amber-800 hover:bg-amber-900 text-white font-bold text-xs flex items-center gap-1.5 shadow-2xs transition-all cursor-pointer shrink-0 self-end sm:self-auto"
          >
            <span>العودة للأسبوع الحالي (B{latestPlan.blockNumber || 1}-W{latestPlan.weekNumber || 1})</span>
            <ArrowRight className="w-3.5 h-3.5 rtl:rotate-180" />
          </button>
        </div>
      )}
    </div>
  );
};
