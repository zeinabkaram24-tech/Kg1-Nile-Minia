import React, { useState, useEffect } from 'react';
import {
  Users,
  GraduationCap,
  UserCheck,
  Clock,
  Download,
  Copy,
  Check,
  Search,
  Trash2,
  RefreshCw,
  School,
  Sparkles,
  Smartphone,
  Calendar,
} from 'lucide-react';
import { VisitorItem, VisitorStatsSummary } from '../types';
import {
  fetchAllVisitorsAdmin,
  deleteVisitorRecord,
  getStoredAdminPin,
} from '../utils/visitorTracker';

interface VisitorStatsPanelProps {
  summaryStats?: VisitorStatsSummary | null;
  onRefreshStats?: () => void;
}

type FilterTab = 'today' | 'all' | 'students' | 'visitors' | '2A' | '2B' | '2C';

export const VisitorStatsPanel: React.FC<VisitorStatsPanelProps> = ({
  summaryStats,
  onRefreshStats,
}) => {
  const [visitors, setVisitors] = useState<VisitorItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [activeTab, setActiveTab] = useState<FilterTab>('today');
  const [copied, setCopied] = useState(false);
  const [liveStats, setLiveStats] = useState<VisitorStatsSummary | null>(summaryStats || null);

  useEffect(() => {
    if (summaryStats) {
      setLiveStats(summaryStats);
    }
  }, [summaryStats]);

  const loadVisitors = async () => {
    setLoading(true);
    setError(null);
    try {
      const pin = getStoredAdminPin() || '1940';
      const res = await fetchAllVisitorsAdmin(pin);
      if (res.authorized) {
        setVisitors(res.visitors || []);
        if (res.stats) setLiveStats(res.stats);
      } else {
        setError(res.error || 'تعذر تحميل بيانات الزوار');
      }
    } catch {
      setError('تعذر الاتصال بالخادم لجلب بيانات الزوار');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadVisitors();
  }, []);

  const handleRefresh = () => {
    if (onRefreshStats) onRefreshStats();
    loadVisitors();
  };

  const handleDeleteVisitor = async (id: string, name: string) => {
    if (!window.confirm(`هل أنتِ متأكدة من حذف هذا السجل (${name}) من التقرير؟`)) return;

    const success = await deleteVisitorRecord(id);
    if (success) {
      setVisitors((prev) => prev.filter((v) => v.id !== id));
      if (onRefreshStats) onRefreshStats();
      loadVisitors();
    } else {
      alert('تعذر حذف السجل');
    }
  };

  const handleCopyNamesList = () => {
    const studentList = visitors
      .filter((v) => v.loginType === 'student' || (v.name && !v.name.startsWith('زائر')))
      .map((v, i) => `${i + 1}. ${v.name} - فصل ${v.section || v.studentGrade || 'عام'}`)
      .join('\n');

    if (!studentList) {
      alert('لا توجد أسماء طلاب مسجلين حالياً للنسخ');
      return;
    }

    const textToCopy = `📋 كشف حضور ومتابعة طلاب مدارس النيل:\n${studentList}\n\nإجمالي الطلاب المسجلين بالاسم: ${totalStudentsNamed}`;
    navigator.clipboard.writeText(textToCopy).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2500);
    });
  };

  const handleExportCSV = () => {
    if (visitors.length === 0) {
      alert('لا توجد بيانات لتصديرها');
      return;
    }

    const headers = [
      '#',
      'الاسم',
      'النوع',
      'الفصل',
      'تاريخ أول دخول',
      'آخر نشاط',
      'عدد الزيارات الكلية',
      'حضر اليوم',
      'الجهاز',
    ];
    const rows = visitors.map((v, i) => [
      i + 1,
      `"${v.name}"`,
      v.loginType === 'student' ? 'طالب' : v.loginType === 'admin' ? 'مسؤول' : 'زائر',
      `"${v.section || v.studentGrade || '-'}"`,
      `"${new Date(v.firstSeenAt).toLocaleString('ar-EG')}"`,
      `"${new Date(v.lastSeenAt).toLocaleString('ar-EG')}"`,
      v.visitCount || 1,
      isVisitedToday(v) ? 'نعم' : 'لا',
      `"${v.device || '-'}"`,
    ]);

    const csvContent = '\uFEFF' + [headers.join(','), ...rows.map((r) => r.join(','))].join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `nile_school_visitors_${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const isVisitedToday = (v: VisitorItem) => {
    if ((v as any).visitedToday !== undefined) return Boolean((v as any).visitedToday);
    const todayKey = liveStats?.todayDateString;
    if (todayKey && v.dailyVisits && (v.dailyVisits[todayKey] || 0) > 0) return true;
    try {
      const todayEgypt = new Intl.DateTimeFormat('en-CA', { timeZone: 'Africa/Cairo' }).format(new Date());
      const vEgypt = new Intl.DateTimeFormat('en-CA', { timeZone: 'Africa/Cairo' }).format(new Date(v.lastSeenAt));
      return todayEgypt === vEgypt;
    } catch {
      return new Date(v.lastSeenAt).toDateString() === new Date().toDateString();
    }
  };

  // Cumulative all-time stats
  const totalStudentsNamed = liveStats?.totalStudentsNamed ?? visitors.filter((v) => v.loginType === 'student').length;
  const totalVisitorsGuest = liveStats?.totalVisitorsGuest ?? visitors.filter((v) => v.loginType === 'visitor').length;
  const totalVisits = liveStats?.totalVisits ?? visitors.reduce((a, b) => a + (b.visitCount || 1), 0);

  // Daily Census (12:00 AM to 12:00 AM next day)
  const todayStudentsNamed = liveStats?.todayStudentsNamed ?? visitors.filter((v) => isVisitedToday(v) && v.loginType === 'student').length;
  const todayVisitorsGuest = liveStats?.todayVisitorsGuest ?? visitors.filter((v) => isVisitedToday(v) && v.loginType === 'visitor').length;
  const todayTotalUsers = liveStats?.todayTotalUsers ?? visitors.filter(isVisitedToday).length;
  const todayVisits = liveStats?.todayVisits ?? visitors.filter(isVisitedToday).reduce((acc, v) => acc + ((v as any).todayVisitsCount || 1), 0);

  // Filtered list
  const filteredVisitors = visitors.filter((v) => {
    if (activeTab === 'today' && !isVisitedToday(v)) return false;
    if (activeTab === 'students' && v.loginType !== 'student') return false;
    if (activeTab === 'visitors' && v.loginType !== 'visitor') return false;
    if (activeTab === '2A' && v.section !== '2A' && !v.studentGrade?.includes('2A')) return false;
    if (activeTab === '2B' && v.section !== '2B' && !v.studentGrade?.includes('2B')) return false;
    if (activeTab === '2C' && v.section !== '2C' && !v.studentGrade?.includes('2C')) return false;

    const q = searchQuery.toLowerCase().trim();
    if (!q) return true;
    return (
      (v.name && v.name.toLowerCase().includes(q)) ||
      (v.studentGrade && v.studentGrade.toLowerCase().includes(q)) ||
      (v.section && v.section.toLowerCase().includes(q)) ||
      (v.device && v.device.toLowerCase().includes(q))
    );
  });

  return (
    <div className="space-y-4 text-right">
      {/* Daily Census Banner & Live 12AM-12AM Counters */}
      <div className="bg-gradient-to-r from-slate-900 via-indigo-950 to-blue-950 text-white p-4 sm:p-5 rounded-2xl border border-indigo-900/60 shadow-sm">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-3 mb-3.5">
          <div className="space-y-1">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-emerald-500/20 text-emerald-300 text-xs font-bold border border-emerald-400/30">
              <Calendar className="w-3.5 h-3.5 text-emerald-400" />
              <span>الحصر اليومي الرسمي (12:00 منتصف الليل - 12:00 منتصف الليل)</span>
            </div>
            <h3 className="text-sm sm:text-base font-black text-slate-100 flex items-center gap-2 font-sans pt-0.5">
              <span>تاريخ الحصر اليومي: {liveStats?.todayDateLabel || 'اليوم الحصري'}</span>
            </h3>
            <p className="text-[11px] sm:text-xs text-slate-300 leading-relaxed font-sans">
              يبدأ الحصر بالكامل من الساعة 12 بالليل، وينتهي الساعة 12 بالليل لليوم التالي؛ لتبدأ دورة حصر جديدة تلقائياً.
            </p>
          </div>

          <div className="flex items-center gap-2 self-start md:self-auto">
            <button
              type="button"
              onClick={handleRefresh}
              className="px-3 py-1.5 rounded-xl bg-white/10 hover:bg-white/20 text-slate-200 transition-colors text-xs font-bold flex items-center gap-1.5 cursor-pointer"
              title="تحديث البيانات فورياً"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
              <span>تحديث الأرقام</span>
            </button>
          </div>
        </div>

        {/* 4 Daily Census Cards (12 AM to 12 AM) */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-2.5 sm:gap-3">
          {/* 1. Today Students Named */}
          <div className="bg-white/10 hover:bg-white/15 transition-colors p-3 rounded-2xl border border-indigo-300/20 shadow-xs">
            <span className="text-[11px] font-bold text-indigo-200 block mb-1">
              طلاب مسجلين بالاسم اليوم
            </span>
            <div className="flex items-baseline justify-between">
              <div className="flex items-baseline gap-1.5">
                <span className="text-2xl sm:text-3xl font-black text-white font-sans">
                  {todayStudentsNamed}
                </span>
                <span className="text-[10px] font-bold text-indigo-200">طالب اليوم</span>
              </div>
              <div className="w-8 h-8 rounded-lg bg-indigo-500/20 text-indigo-300 flex items-center justify-center shrink-0">
                <GraduationCap className="w-4 h-4" />
              </div>
            </div>
          </div>

          {/* 2. Today Guests */}
          <div className="bg-white/10 hover:bg-white/15 transition-colors p-3 rounded-2xl border border-amber-300/20 shadow-xs">
            <span className="text-[11px] font-bold text-amber-200 block mb-1">
              زوار اليوم (كزائر)
            </span>
            <div className="flex items-baseline justify-between">
              <div className="flex items-baseline gap-1.5">
                <span className="text-2xl sm:text-3xl font-black text-amber-300 font-sans">
                  {todayVisitorsGuest}
                </span>
                <span className="text-[10px] font-bold text-amber-200">زائر اليوم</span>
              </div>
              <div className="w-8 h-8 rounded-lg bg-amber-500/20 text-amber-300 flex items-center justify-center shrink-0">
                <UserCheck className="w-4 h-4" />
              </div>
            </div>
          </div>

          {/* 3. Today Total Users */}
          <div className="bg-white/10 hover:bg-white/15 transition-colors p-3 rounded-2xl border border-emerald-300/20 shadow-xs">
            <span className="text-[11px] font-bold text-emerald-200 block mb-1">
              إجمالي الحضور اليوم
            </span>
            <div className="flex items-baseline justify-between">
              <div className="flex items-baseline gap-1.5">
                <span className="text-2xl sm:text-3xl font-black text-emerald-300 font-sans">
                  {todayTotalUsers}
                </span>
                <span className="text-[10px] font-bold text-emerald-200">مستخدم اليوم</span>
              </div>
              <div className="w-8 h-8 rounded-lg bg-emerald-500/20 text-emerald-300 flex items-center justify-center shrink-0">
                <Sparkles className="w-4 h-4" />
              </div>
            </div>
          </div>

          {/* 4. Today Visits */}
          <div className="bg-white/10 hover:bg-white/15 transition-colors p-3 rounded-2xl border border-purple-300/20 shadow-xs">
            <span className="text-[11px] font-bold text-purple-200 block mb-1">
              مرات فتح الخطة اليوم
            </span>
            <div className="flex items-baseline justify-between">
              <div className="flex items-baseline gap-1.5">
                <span className="text-2xl sm:text-3xl font-black text-purple-300 font-sans">
                  {todayVisits}
                </span>
                <span className="text-[10px] font-bold text-purple-200">جلسة اليوم</span>
              </div>
              <div className="w-8 h-8 rounded-lg bg-purple-500/20 text-purple-300 flex items-center justify-center shrink-0">
                <Clock className="w-4 h-4" />
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Cumulative All-time Summary Strip */}
      <div className="bg-slate-50 p-3 sm:px-4 rounded-xl border border-slate-200 flex flex-wrap items-center justify-between gap-2 text-xs text-slate-600">
        <div className="flex items-center gap-2 font-bold flex-wrap">
          <span className="text-slate-500">السجل الدائم التراكمي:</span>
          <span className="text-indigo-700 bg-indigo-50 px-2 py-0.5 rounded-md border border-indigo-200">
            {totalStudentsNamed} طالب مسجل كلياً
          </span>
          <span>•</span>
          <span className="text-amber-700 bg-amber-50 px-2 py-0.5 rounded-md border border-amber-200">
            {totalVisitorsGuest} زائر كلي
          </span>
          <span>•</span>
          <span className="text-purple-700 bg-purple-50 px-2 py-0.5 rounded-md border border-purple-200">
            {totalVisits} إجمالي الزيارات الكلية
          </span>
        </div>
        <div className="text-[11px] text-slate-500 font-sans">
          فصول اليوم: 2A ({liveStats?.todaySectionCounts?.['2A'] || 0}) | 2B ({liveStats?.todaySectionCounts?.['2B'] || 0}) | 2C ({liveStats?.todaySectionCounts?.['2C'] || 0})
        </div>
      </div>

      {/* Search Bar & Action Buttons */}
      <div className="flex flex-col sm:flex-row items-center justify-between gap-2.5 pt-1">
        <div className="relative w-full sm:w-80">
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="بحث باسم الطالب، الفصل، أو الجهاز..."
            className="w-full pl-3 pr-9 py-2 rounded-xl border border-slate-300 focus:border-indigo-600 focus:ring-2 focus:ring-indigo-100 text-xs font-bold outline-hidden shadow-2xs"
          />
          <Search className="w-4 h-4 text-slate-400 absolute right-3 top-2.5" />
        </div>

        <div className="flex items-center gap-2 w-full sm:w-auto justify-end">
          <button
            type="button"
            onClick={handleCopyNamesList}
            className="flex-1 sm:flex-none px-3 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-800 font-bold text-xs flex items-center justify-center gap-1.5 transition-colors cursor-pointer border border-slate-200"
            title="نسخ تقرير قائمة الأسماء"
          >
            {copied ? (
              <>
                <Check className="w-3.5 h-3.5 text-emerald-600" />
                <span className="text-emerald-700">تم نسخ التقرير!</span>
              </>
            ) : (
              <>
                <Copy className="w-3.5 h-3.5 text-slate-600" />
                <span>نسخ قائمة الأسماء</span>
              </>
            )}
          </button>

          <button
            type="button"
            onClick={handleExportCSV}
            className="flex-1 sm:flex-none px-3 py-2 rounded-xl bg-indigo-50 hover:bg-indigo-100 text-indigo-700 font-bold text-xs flex items-center justify-center gap-1.5 border border-indigo-200 transition-colors cursor-pointer shadow-2xs"
            title="تصدير جدول Excel / CSV بأسماء وتفاصيل الطلاب والزوار"
          >
            <Download className="w-3.5 h-3.5" />
            <span>تصدير Excel (CSV)</span>
          </button>
        </div>
      </div>

      {/* Filter Tabs */}
      <div className="flex items-center gap-1.5 overflow-x-auto pb-1 max-w-full select-none">
        <button
          type="button"
          onClick={() => setActiveTab('today')}
          className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer shrink-0 ${
            activeTab === 'today'
              ? 'bg-emerald-600 text-white shadow-xs'
              : 'bg-emerald-50 hover:bg-emerald-100 text-emerald-800 border border-emerald-200'
          }`}
        >
          <Sparkles className="w-3.5 h-3.5" />
          <span>حضور اليوم ({todayTotalUsers})</span>
        </button>

        <button
          type="button"
          onClick={() => setActiveTab('all')}
          className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer shrink-0 ${
            activeTab === 'all'
              ? 'bg-slate-900 text-white shadow-xs'
              : 'bg-slate-100 hover:bg-slate-200 text-slate-600'
          }`}
        >
          الكل في السجل ({visitors.length})
        </button>

        <button
          type="button"
          onClick={() => setActiveTab('students')}
          className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all flex items-center gap-1 cursor-pointer shrink-0 ${
            activeTab === 'students'
              ? 'bg-indigo-600 text-white shadow-xs'
              : 'bg-indigo-50 hover:bg-indigo-100 text-indigo-700'
          }`}
        >
          <GraduationCap className="w-3.5 h-3.5" />
          <span>الطلاب بالاسم ({totalStudentsNamed})</span>
        </button>

        <button
          type="button"
          onClick={() => setActiveTab('visitors')}
          className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all flex items-center gap-1 cursor-pointer shrink-0 ${
            activeTab === 'visitors'
              ? 'bg-amber-600 text-white shadow-xs'
              : 'bg-amber-50 hover:bg-amber-100 text-amber-700'
          }`}
        >
          <UserCheck className="w-3.5 h-3.5" />
          <span>الزوار ({totalVisitorsGuest})</span>
        </button>

        <div className="h-4 w-px bg-slate-200 mx-1 shrink-0" />

        <button
          type="button"
          onClick={() => setActiveTab('2A')}
          className={`px-2.5 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer shrink-0 ${
            activeTab === '2A'
              ? 'bg-indigo-700 text-white'
              : 'bg-slate-100 hover:bg-slate-200 text-slate-600'
          }`}
        >
          فصل 2A
        </button>

        <button
          type="button"
          onClick={() => setActiveTab('2B')}
          className={`px-2.5 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer shrink-0 ${
            activeTab === '2B'
              ? 'bg-indigo-700 text-white'
              : 'bg-slate-100 hover:bg-slate-200 text-slate-600'
          }`}
        >
          فصل 2B
        </button>

        <button
          type="button"
          onClick={() => setActiveTab('2C')}
          className={`px-2.5 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer shrink-0 ${
            activeTab === '2C'
              ? 'bg-indigo-700 text-white'
              : 'bg-slate-100 hover:bg-slate-200 text-slate-600'
          }`}
        >
          فصل 2C
        </button>
      </div>

      {error && (
        <div className="p-3 bg-rose-50 text-rose-700 text-xs font-bold rounded-xl border border-rose-200">
          {error}
        </div>
      )}

      {/* Visitor Log Table */}
      {filteredVisitors.length === 0 ? (
        <div className="p-8 text-center bg-slate-50 rounded-2xl border border-slate-200 text-slate-500 text-xs">
          لا توجد سجلات تطابق البحث أو التصنيف المحدد.
        </div>
      ) : (
        <div className="overflow-x-auto rounded-2xl border border-slate-200 shadow-2xs max-h-[50vh]">
          <table className="w-full text-right text-xs text-slate-700">
            <thead className="bg-slate-100 text-slate-600 font-bold border-b border-slate-200 select-none sticky top-0 z-10">
              <tr>
                <th className="p-3 w-10">#</th>
                <th className="p-3">اسم الطالب / اسم الدخول</th>
                <th className="p-3">نوع الدخول</th>
                <th className="p-3">الفصل</th>
                <th className="p-3">أول دخول</th>
                <th className="p-3">آخر نشاط</th>
                <th className="p-3 text-center">مرات الفتح</th>
                <th className="p-3">الجهاز</th>
                <th className="p-3 text-center w-12">حذف</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 bg-white">
              {filteredVisitors.map((vis, idx) => {
                const isAdmin = vis.loginType === 'admin' || vis.id === 'owner-zeinab';
                const isStudent = vis.loginType === 'student';
                const isGuest = vis.loginType === 'visitor';

                const firstDate = new Date(vis.firstSeenAt).toLocaleDateString('ar-EG', {
                  month: 'numeric',
                  day: 'numeric',
                  year: 'numeric',
                });
                const lastDate = new Date(vis.lastSeenAt).toLocaleDateString('ar-EG', {
                  month: 'short',
                  day: 'numeric',
                  hour: '2-digit',
                  minute: '2-digit',
                });

                const attendedToday = isVisitedToday(vis);
                const todayCount = (vis as any).todayVisitsCount || vis.dailyVisits?.[liveStats?.todayDateString || ''] || (attendedToday ? 1 : 0);

                return (
                  <tr
                    key={vis.id}
                    className={`hover:bg-indigo-50/40 transition-colors ${
                      isAdmin ? 'bg-amber-50/40 font-bold' : attendedToday ? 'bg-emerald-50/20' : ''
                    }`}
                  >
                    <td className="p-3 text-slate-400 font-mono">{idx + 1}</td>
                    <td className="p-3 font-bold text-slate-900">
                      <div className="flex items-center gap-1.5">
                        <span>{vis.name}</span>
                        {isAdmin && (
                          <span className="text-[10px] font-bold px-1.5 py-0.2 rounded-md bg-amber-500 text-white">
                            أدمن
                          </span>
                        )}
                        {attendedToday && (
                          <span className="text-[10px] font-bold px-1.5 py-0.2 rounded-md bg-emerald-100 text-emerald-800">
                            اليوم
                          </span>
                        )}
                      </div>
                    </td>
                    <td className="p-3">
                      {isStudent ? (
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-indigo-50 text-indigo-700 font-bold text-[11px] border border-indigo-200">
                          <GraduationCap className="w-3 h-3" />
                          <span>طالب</span>
                        </span>
                      ) : isGuest ? (
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-amber-50 text-amber-700 font-bold text-[11px] border border-amber-200">
                          <UserCheck className="w-3 h-3" />
                          <span>زائر</span>
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-slate-100 text-slate-700 font-bold text-[11px]">
                          مسؤول
                        </span>
                      )}
                    </td>
                    <td className="p-3 font-mono font-bold text-slate-700">
                      {vis.section ? (
                        <span className="px-2 py-0.5 rounded-md bg-slate-100 text-slate-800 border border-slate-200">
                          {vis.section}
                        </span>
                      ) : vis.studentGrade ? (
                        <span className="text-slate-600">{vis.studentGrade}</span>
                      ) : (
                        <span className="text-slate-400">-</span>
                      )}
                    </td>
                    <td className="p-3 text-slate-500 font-mono text-[11px]">{firstDate}</td>
                    <td className="p-3 text-slate-700 font-mono text-[11px] font-medium">{lastDate}</td>
                    <td className="p-3 text-center">
                      <span className="font-mono font-bold px-2 py-0.5 rounded-md bg-purple-50 text-purple-700 border border-purple-200">
                        {vis.visitCount || 1}
                      </span>
                      {attendedToday && todayCount > 1 && (
                        <span className="block text-[9px] text-emerald-600 font-bold mt-0.5">
                          ({todayCount} اليوم)
                        </span>
                      )}
                    </td>
                    <td className="p-3 text-slate-500 text-[11px] truncate max-w-[140px]" title={vis.device}>
                      <span className="inline-flex items-center gap-1">
                        <Smartphone className="w-3 h-3 text-slate-400" />
                        <span>{vis.device || 'متصفح ويب'}</span>
                      </span>
                    </td>
                    <td className="p-3 text-center">
                      {!isAdmin && (
                        <button
                          type="button"
                          onClick={() => handleDeleteVisitor(vis.id, vis.name)}
                          className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-colors cursor-pointer"
                          title="حذف هذا السجل"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
};
