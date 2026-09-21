import React from 'react';
import {
  CalendarDays,
  BookOpen,
  CheckSquare,
  Briefcase,
  School,
  ChevronDown,
  User,
  Eye,
  Shield,
  GraduationCap,
  FolderOpen,
  Database,
  RefreshCw,
} from 'lucide-react';
import { ClassId, SchoolDay, UserProfile } from '../types';
import { SCHOOL_DAYS, BLOCK_WEEK_DATES } from '../data/timetables';

interface NavbarProps {
  currentClass: ClassId;
  onSelectClass: (c: ClassId) => void;
  currentBlock: number;
  onSelectBlock: (b: number) => void;
  currentWeek: number;
  onSelectWeek: (w: number) => void;
  activeTab: 'classwork' | 'homework' | 'tomorrow' | 'timetable';
  onSelectTab: (t: 'classwork' | 'homework' | 'tomorrow' | 'timetable') => void;
  selectedDay: SchoolDay;
  onSelectDay: (d: SchoolDay) => void;
  onPrint?: () => void;
  pendingHomeworkCount: number;
  userProfile?: UserProfile | null;
  onOpenProfileModal?: () => void;
  onOpenAdminAuth?: () => void;
  onOpenMaterials?: () => void;
  onOpenSupabaseConfig?: () => void;
  supabaseStatus?: 'connecting' | 'connected' | 'unconfigured' | 'error';
  onSyncNow?: () => void;
  isSyncing?: boolean;
}

export const Navbar: React.FC<NavbarProps> = ({
  currentClass,
  onSelectClass,
  currentBlock,
  onSelectBlock,
  currentWeek,
  onSelectWeek,
  activeTab,
  onSelectTab,
  selectedDay,
  onSelectDay,
  pendingHomeworkCount,
  userProfile,
  onOpenProfileModal,
  onOpenAdminAuth,
  onOpenMaterials,
  onOpenSupabaseConfig,
  supabaseStatus = 'unconfigured',
  onSyncNow,
  isSyncing = false,
}) => {
  const tabs = [
    {
      id: 'classwork',
      label: 'Classwork',
      icon: BookOpen,
      badge: null,
    },
    {
      id: 'homework',
      label: 'Homework',
      icon: CheckSquare,
      badge: null,
    },
    {
      id: 'tomorrow',
      label: 'Tomorrow',
      icon: Briefcase,
      badge: null,
    },
    {
      id: 'timetable',
      label: 'Timetable',
      icon: CalendarDays,
      badge: null,
    },
  ] as const;

  return (
    <header className="bg-white border-b border-slate-200 sticky top-0 z-40 shadow-sm print:hidden">
      {/* Top Banner: Full-width unified blue row containing title & admin button without separation */}
      <div className="bg-gradient-to-r from-blue-950 via-indigo-950 to-blue-900 text-white border-b border-indigo-950 shadow-xs">
        <div className="max-w-7xl mx-auto px-2.5 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between py-2 sm:py-2.5 gap-2">
            {/* Logo & School info: Nile Egyptian International School / Grade 2 */}
            <div className="flex items-center gap-2.5 shrink-0">
              <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-blue-500 via-indigo-600 to-indigo-700 flex items-center justify-center text-white shadow-md border border-white/20 shrink-0 relative">
                <School className="w-4 h-4 text-white" />
                <div className="absolute -bottom-1 -right-1 w-3.5 h-3.5 rounded-full bg-amber-400 text-slate-950 flex items-center justify-center shadow-xs">
                  <GraduationCap className="w-2.5 h-2.5 text-slate-900 stroke-[2.5]" />
                </div>
              </div>
              <div className="flex flex-col items-start justify-center text-start">
                <h1 className="text-xs sm:text-sm font-black text-white tracking-tight leading-none flex items-center gap-1.5">
                  <span>Nile Egyptian International School</span>
                </h1>
                <p className="text-[10px] sm:text-[11px] text-blue-200 font-bold mt-1 leading-none flex items-center gap-1.5">
                  <span>KG 1</span>
                  <span className="text-indigo-300">•</span>
                  <span className="text-amber-300 font-black">خطة المذاكرة الأسبوعية</span>
                </p>
              </div>
            </div>

            <div className="flex items-center gap-1.5 sm:gap-2">
              {/* Instant Cross-Device Sync Button */}
              <button
                type="button"
                onClick={onSyncNow}
                disabled={isSyncing}
                className="inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-xl text-xs font-black shadow-xs cursor-pointer transition-all border border-white/25 bg-white/10 hover:bg-white/20 active:scale-95 text-white hover:text-cyan-300 shrink-0"
                title="مزامنة فورية وتحديث البيانات بين السحابة واللاب توب والموبايل"
              >
                <RefreshCw className={`w-3.5 h-3.5 ${isSyncing ? 'animate-spin text-cyan-300' : 'text-cyan-400'}`} />
                <span className="hidden sm:inline">{isSyncing ? 'تحديث...' : 'مزامنة'}</span>
              </button>

              {/* Supabase Cloud Connection & Settings */}
              <button
                type="button"
                onClick={onOpenSupabaseConfig}
                className={`inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-xl text-xs font-black shadow-xs cursor-pointer transition-all border active:scale-95 shrink-0 ${
                  supabaseStatus === 'connected'
                    ? 'bg-emerald-500/20 text-emerald-300 border-emerald-400/40 hover:bg-emerald-500/30'
                    : supabaseStatus === 'connecting'
                    ? 'bg-amber-500/20 text-amber-300 border-amber-400/40 hover:bg-amber-500/30'
                    : 'bg-white/10 hover:bg-white/20 text-white hover:text-emerald-300 border-white/25'
                }`}
                title="إعدادات وحفظ ربط Supabase السحابي الدائم"
              >
                <Database className="w-3.5 h-3.5 text-emerald-400" />
                <span className="hidden sm:inline">السحابة</span>
                <span
                  className={`w-2 h-2 rounded-full ${
                    supabaseStatus === 'connected'
                      ? 'bg-emerald-400 animate-pulse'
                      : supabaseStatus === 'connecting'
                      ? 'bg-amber-400 animate-pulse'
                      : 'bg-slate-400'
                  }`}
                />
              </button>

              {/* Admin Button directly inside the top blue bar without any separation */}
              <button
                type="button"
                onClick={onOpenAdminAuth}
                className="inline-flex items-center gap-1.5 bg-white/10 hover:bg-white/20 active:bg-white/30 text-white hover:text-amber-300 px-3 py-1.5 rounded-xl text-xs font-black shadow-xs cursor-pointer transition-all border border-white/25 active:scale-95 shrink-0"
                title="لوحة الأدمن / Admin Mode"
              >
                <Shield className="w-3.5 h-3.5 text-amber-300" />
                <span>أدمن</span>
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Row 2: Classes (2A, 2B, 2C), Student Profile, and Block & Week */}
      <div className="max-w-7xl mx-auto px-2.5 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between py-2 gap-2 flex-wrap sm:flex-nowrap">
          {/* Left: Student Profile & Classes */}
          <div className="flex items-center gap-1.5 sm:gap-2">
            {/* Student Name / Profile Badge directly next to 2A, 2B, 2C */}
            {userProfile?.mode === 'student' && userProfile.studentName ? (
              <button
                type="button"
                onClick={onOpenProfileModal}
                className="group inline-flex items-center gap-1.5 bg-gradient-to-r from-indigo-50 to-purple-50 hover:from-indigo-100 hover:to-purple-100 border border-indigo-200/90 text-indigo-950 px-2.5 py-1 rounded-xl shadow-2xs cursor-pointer transition-all shrink-0"
                title="انقر لتعديل اسم الطالب أو التبديل"
              >
                <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse shrink-0" />
                <User className="w-3.5 h-3.5 text-indigo-700 shrink-0" />
                <span className="text-xs font-black text-indigo-950 truncate max-w-[100px] sm:max-w-[160px]">
                  {userProfile.studentName}
                </span>
                <span className="text-[10px] text-indigo-600 group-hover:text-indigo-900 font-bold border-s border-indigo-200 ps-1.5 ms-0.5">
                  تبديل
                </span>
              </button>
            ) : (
              <button
                type="button"
                onClick={onOpenProfileModal}
                className="group inline-flex items-center gap-1.5 bg-slate-100 hover:bg-indigo-50 border border-slate-200 hover:border-indigo-200 text-slate-700 hover:text-indigo-950 px-2.5 py-1 rounded-xl shadow-2xs cursor-pointer transition-all shrink-0"
                title="أنت الآن زائر، انقر للدخول باسم الطالب وحفظ إنجازاتك"
              >
                <Eye className="w-3.5 h-3.5 text-slate-500 group-hover:text-indigo-600 shrink-0" />
                <span className="text-xs font-bold">زائر</span>
                <span className="text-[10px] text-indigo-600 group-hover:text-indigo-900 font-black border-s border-slate-300 group-hover:border-indigo-200 ps-1.5 ms-0.5">
                  دخول كطالب
                </span>
              </button>
            )}

            {/* Class Buttons Side-by-Side (A, B, C, D, E) */}
            <div className="inline-flex items-center bg-slate-100 p-0.5 rounded-xl border border-slate-200 shadow-2xs shrink-0">
              {(['KG1A', 'KG1B', 'KG1C', 'KG1D', 'KG1E'] as const).map((cls) => {
                const isSelected = currentClass === cls || currentClass === cls.replace('KG1', '') || currentClass === `G2${cls.slice(-1)}`;
                const label = cls.slice(-1); // 'A', 'B', 'C', 'D', 'E'
                return (
                  <button
                    key={cls}
                    type="button"
                    onClick={() => onSelectClass(cls)}
                    className={`px-2.5 sm:px-3 py-1 text-xs font-black rounded-lg transition-all ${
                      isSelected
                        ? 'bg-slate-900 text-white shadow-2xs'
                        : 'text-slate-600 hover:text-slate-900 hover:bg-slate-200/60'
                    }`}
                  >
                    {label}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Right: Block & Week Dropdowns Group */}
          <div className="inline-flex items-center gap-1.5 bg-slate-50 p-1 rounded-xl border border-slate-200/60 shrink-0">
            {/* Compact Block Dropdown */}
            <div className="relative">
              <select
                id="block-select"
                value={currentBlock}
                onChange={(e) => onSelectBlock(Number(e.target.value))}
                className="appearance-none bg-indigo-50 hover:bg-indigo-100/80 border border-indigo-200 text-indigo-950 font-black text-xs rounded-xl pl-2.5 pr-6 py-1 cursor-pointer transition-colors shadow-2xs focus:outline-none focus:ring-2 focus:ring-indigo-500"
                title="Topic"
              >
                <option value={1}>Topic 1</option>
                <option value={2}>Topic 2</option>
                <option value={3}>Topic 3</option>
                <option value={4}>Topic 4</option>
              </select>
              <ChevronDown className="w-3.5 h-3.5 text-indigo-700 absolute right-1.5 top-1/2 -translate-y-1/2 pointer-events-none" />
            </div>

            {/* Compact Week Dropdown */}
            <div className="relative">
              <select
                id="week-select"
                value={currentWeek}
                onChange={(e) => onSelectWeek(Number(e.target.value))}
                className="appearance-none bg-purple-50 hover:bg-purple-100/80 border border-purple-200 text-purple-950 font-black text-xs rounded-xl pl-2.5 pr-6 py-1 cursor-pointer transition-colors shadow-2xs focus:outline-none focus:ring-2 focus:ring-purple-500"
                title="Week"
              >
                {[1, 2, 3, 4].map((w) => {
                  const range = BLOCK_WEEK_DATES[currentBlock]?.[w];
                  return (
                    <option key={w} value={w}>
                      Week {w} {range ? `(${range})` : ''}
                    </option>
                  );
                })}
              </select>
              <ChevronDown className="w-3.5 h-3.5 text-purple-700 absolute right-1.5 top-1/2 -translate-y-1/2 pointer-events-none" />
            </div>

            {/* Materials Button */}
            <button
              id="materials-btn"
              type="button"
              onClick={onOpenMaterials}
              className="inline-flex items-center gap-1 bg-amber-50 hover:bg-amber-100/80 border border-amber-200 text-amber-950 font-black text-xs rounded-xl px-2.5 py-1 cursor-pointer transition-colors shadow-2xs focus:outline-none focus:ring-2 focus:ring-amber-500"
              title="Materials"
            >
              <FolderOpen className="w-3.5 h-3.5 text-amber-700 shrink-0" />
              <span>Materials</span>
            </button>
          </div>
        </div>

        {/* Navigation Tabs - All 4 visible side-by-side in one single line matching row width */}
        <div className="border-t border-slate-100 py-1.5">
          <nav className="grid grid-cols-4 gap-1 sm:gap-2 w-full">
            {tabs.map((tab) => {
              const Icon = tab.icon;
              const isActive = activeTab === tab.id;
              return (
                <button
                  key={tab.id}
                  onClick={() => onSelectTab(tab.id)}
                  className={`flex items-center justify-center gap-1 sm:gap-1.5 py-1.5 px-1 rounded-xl text-[11px] sm:text-xs font-bold transition-all truncate ${
                    isActive
                      ? 'bg-indigo-600 text-white shadow-2xs font-black'
                      : 'text-slate-600 hover:text-slate-900 bg-slate-50 hover:bg-slate-100 border border-slate-200/80'
                  }`}
                >
                  <Icon className={`w-3.5 h-3.5 shrink-0 ${isActive ? 'text-white' : 'text-slate-500'}`} />
                  <span className="truncate">{tab.label}</span>
                </button>
              );
            })}
          </nav>
        </div>
      </div>

      {/* Day Ribbon: NO scroll, NO 'School Day' label, ALL 6 days visible side-by-side in one single row */}
      {activeTab !== 'timetable' && (
        <div className="bg-slate-50 border-t border-slate-200 py-1.5 px-2 sm:px-6 lg:px-8">
          <div className="max-w-7xl mx-auto">
            <div className="grid grid-cols-6 gap-1 sm:gap-1.5 w-full">
              {SCHOOL_DAYS.map((day) => {
                const isSelected = selectedDay === day;
                return (
                  <button
                    key={day}
                    onClick={() => onSelectDay(day)}
                    className={`w-full py-1 sm:py-1.5 px-0.5 sm:px-1 rounded-lg text-center transition-all text-[11px] sm:text-xs font-black truncate ${
                      isSelected
                        ? 'bg-indigo-600 text-white shadow-2xs'
                        : 'bg-white text-slate-700 hover:text-slate-950 border border-slate-200 hover:bg-slate-100'
                    }`}
                    title={day}
                  >
                    {day}
                  </button>
                );
              })}
            </div>
          </div>
        </div>
      )}
    </header>
  );
};
