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
  Lock,
  Unlock,
  ShieldCheck,
  X,
  School,
  Sparkles,
  Smartphone,
  Eye,
  Calendar,
} from 'lucide-react';
import { VisitorItem, VisitorStatsSummary } from '../types';
import {
  fetchAllVisitorsAdmin,
  deleteVisitorRecord,
  getStoredAdminPin,
  setStoredAdminPin,
} from '../utils/visitorTracker';

interface VisitorStatsModalProps {
  isOpen: boolean;
  onClose: () => void;
  summaryStats: VisitorStatsSummary | null;
  onRefreshStats: () => void;
}

type FilterTab = 'today' | 'all' | 'students' | 'visitors' | '2A' | '2B' | '2C';

export const VisitorStatsModal: React.FC<VisitorStatsModalProps> = ({
  isOpen,
  onClose,
  summaryStats,
  onRefreshStats,
}) => {
  const [visitors, setVisitors] = useState<VisitorItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [pinInput, setPinInput] = useState('');
  const [isUnlocked, setIsUnlocked] = useState(false);
  const [showAdminLogin, setShowAdminLogin] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [activeTab, setActiveTab] = useState<FilterTab>('today');
  const [copied, setCopied] = useState(false);
  const [liveStats, setLiveStats] = useState<VisitorStatsSummary | null>(summaryStats);

  // Check admin PIN when modal opens
  useEffect(() => {
    if (!isOpen) return;

    const savedPin = (getStoredAdminPin() || '').trim().toLowerCase();
    const isAuthorizedByDefault =
      savedPin === '1940' ||
      savedPin === '2026' ||
      savedPin === 'admin' ||
      savedPin === 'zeinab' ||
      savedPin === 'zeinabkaram24@gmail.com' ||
      savedPin === 'zeinabkaram909@gmail.com' ||
      savedPin === 'faridaferghali2019@gmail.com' ||
      savedPin === 'faridafarghally2019@gmail.com' ||
      savedPin.includes('zeinabkaram') ||
      savedPin.includes('farida');

    if (isAuthorizedByDefault) {
      setIsUnlocked(true);
      loadVisitorsList(savedPin);
    } else {
      setIsUnlocked(false);
      setShowAdminLogin(false);
      setError(null);
    }
  }, [isOpen]);

  useEffect(() => {
    if (summaryStats) {
      setLiveStats(summaryStats);
    }
  }, [summaryStats]);

  const loadVisitorsList = async (pin?: string) => {
    setLoading(true);
    setError(null);
    const res = await fetchAllVisitorsAdmin(pin);
    setLoading(false);

    if (res.authorized) {
      setIsUnlocked(true);
      setVisitors(res.visitors);
      if (res.stats) {
        setLiveStats(res.stats);
      }
      if (pin) setStoredAdminPin(pin);
    } else {
      setError(res.error || 'رمز المرور غير صحيح. يرجى إدخال رمز المرور السري للمسؤول.');
    }
  };

  const handleUnlockWithPin = (e: React.FormEvent) => {
    e.preventDefault();
    if (!pinInput.trim()) return;
    loadVisitorsList(pinInput.trim());
  };

  const handleDeleteVisitor = async (id: string, name: string) => {
    if (!window.confirm(`هل أنتِ متأكدة من حذف هذا السجل (${name}) من التقرير؟`)) return;

    const success = await deleteVisitorRecord(id);
    if (success) {
      setVisitors((prev) => prev.filter((v) => v.id !== id));
      onRefreshStats();
      // Reload stats after deletion
      loadVisitorsList(getStoredAdminPin() || undefined);
    } else {
      alert('تعذر حذف السجل');
    }
  };

  const handleCopyNamesList = () => {
    const studentList = visitors
      .filter((v) => v.loginType === 'student' || (v.name && !v.name.startsWith('زائر')))
      .map((v, i) => `${i + 1}. ${v.name} (${v.studentGrade || v.section || 'عام'}) - ${v.visitCount || 1} زيارة`)
      .join('\n');

    const totalStudents = visitors.filter((v) => v.loginType === 'student').length;
    const totalVisitors = visitors.filter((v) => v.loginType === 'visitor').length;

    const fullReport = `📊 تقرير الدخول واستخدام الموقع:\n- عدد المسجلين بالاسم: ${totalStudents}\n- عدد الزوار: ${totalVisitors}\n- إجمالي الزيارات: ${liveStats?.totalVisits || 0}\n\nقائمة الأسماء:\n${studentList}`;

    navigator.clipboard.writeText(fullReport);
    setCopied(true);
    setTimeout(() => setCopied(false), 2500);
  };

  const handleExportCSV = () => {
    if (visitors.length === 0) return;

    const headers = 'ID,الاسم / اسم الدخول,نوع الحساب,الصف / الفصل,تاريخ أول دخول,آخر استخدام للمنصة,عدد مرات الفتح,الجهاز / المتصفح\n';
    const rows = visitors
      .map((v) => {
        const first = new Date(v.firstSeenAt).toLocaleString('ar-EG');
        const last = new Date(v.lastSeenAt).toLocaleString('ar-EG');
        const typeLabel = v.loginType === 'admin' ? 'مسؤول' : v.loginType === 'student' ? 'طالب مسجل بالاسم' : 'زائر';
        const gradeLabel = v.studentGrade || (v.section ? `فصل ${v.section}` : '—');
        return `"${v.id}","${v.name}","${typeLabel}","${gradeLabel}","${first}","${last}",${v.visitCount || 1},"${v.device || 'متصفح ويب'}"`;
      })
      .join('\n');

    const blob = new Blob(['\uFEFF' + headers + rows], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', `تقرير_تسجيل_الدخول_والزوار_${new Date().toISOString().slice(0, 10)}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  if (!isOpen) return null;

  // 1. NON-ADMIN GATE (Short, polite notice)
  if (!isUnlocked) {
    return (
      <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 animate-fadeIn">
        <div className="bg-white rounded-3xl w-full max-w-sm sm:max-w-md shadow-2xl border border-slate-200/80 p-6 text-center text-slate-800 space-y-4 relative">
          <button
            type="button"
            onClick={onClose}
            className="absolute top-4 left-4 p-2 rounded-xl text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition-colors"
            title="إغلاق"
          >
            <X className="w-5 h-5" />
          </button>

          <div className="w-14 h-14 rounded-2xl bg-indigo-50 text-indigo-600 border border-indigo-200/60 flex items-center justify-center mx-auto shadow-xs">
            <Lock className="w-7 h-7" />
          </div>

          <div className="space-y-1.5">
            <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-slate-100 text-slate-700 font-bold text-xs">
              <ShieldCheck className="w-3.5 h-3.5 text-indigo-600" />
              <span>مخصصة للمسؤول فقط (Admin Only)</span>
            </div>
            <h3 className="text-lg font-black text-slate-900 font-sans pt-1">
              تقرير تسجيل الدخول ومتابعة الزوار
            </h3>
            <p className="text-xs sm:text-sm text-slate-600 leading-relaxed font-sans px-2">
              هذا التقرير مخصص فقط لإدارة الخطة المدرسية لحساب من دخل بالاسم، وعدد الزوار الذين استخدموا الموقع.
            </p>
          </div>

          <div className="pt-2">
            <button
              type="button"
              onClick={onClose}
              className="w-full bg-slate-900 hover:bg-slate-800 text-white font-bold py-3 px-4 rounded-2xl text-xs sm:text-sm transition-all shadow-md active:scale-98"
            >
              العودة للخطة
            </button>
          </div>

          {/* Admin Login for creator */}
          <div className="pt-3 border-t border-slate-100">
            {!showAdminLogin ? (
              <button
                type="button"
                onClick={() => setShowAdminLogin(true)}
                className="text-[11px] font-semibold text-indigo-600 hover:text-indigo-800 underline transition-colors cursor-pointer"
              >
                تسجيل الدخول كمسؤول لعرض التقرير
              </button>
            ) : (
              <form onSubmit={handleUnlockWithPin} className="space-y-2.5 pt-1">
                <p className="text-[11px] text-slate-500 font-medium">
                  أدخلي رمز المرور (1940) أو أحد الإيميلات المصرح بها للمسؤول:
                </p>
                <input
                  type="text"
                  value={pinInput}
                  onChange={(e) => setPinInput(e.target.value)}
                  placeholder="رمز المرور (1940) أو الإيميل المعتمد..."
                  autoFocus
                  className="w-full text-center px-4 py-2.5 rounded-xl border border-slate-300 focus:border-indigo-600 text-sm font-bold font-sans outline-hidden shadow-inner"
                />
                <button
                  type="submit"
                  disabled={loading}
                  className="w-full bg-indigo-600 hover:bg-indigo-700 text-white font-bold py-2.5 px-4 rounded-xl text-xs transition-colors flex items-center justify-center gap-2 cursor-pointer shadow-sm"
                >
                  <Unlock className="w-4 h-4" />
                  <span>{loading ? 'جارٍ التحقق...' : 'فتح التقرير'}</span>
                </button>
                {error && (
                  <p className="text-xs text-rose-600 font-bold bg-rose-50 p-2 rounded-lg border border-rose-200">
                    {error}
                  </p>
                )}
              </form>
            )}
          </div>
        </div>
      </div>
    );
  }

  // 2. FULL UNLOCKED ADMIN DASHBOARD
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

  // Cumulative all-time database
  const totalStudentsNamed = liveStats?.totalStudentsNamed ?? visitors.filter((v) => v.loginType === 'student').length;
  const totalVisitorsGuest = liveStats?.totalVisitorsGuest ?? visitors.filter((v) => v.loginType === 'visitor').length;
  const totalAllUsers = liveStats?.totalUsers ?? visitors.length;
  const totalVisits = liveStats?.totalVisits ?? visitors.reduce((a, b) => a + (b.visitCount || 1), 0);

  // Daily Census (Starting from 12:00 AM midnight to 12:00 AM next day)
  const todayStudentsNamed = liveStats?.todayStudentsNamed ?? visitors.filter((v) => isVisitedToday(v) && v.loginType === 'student').length;
  const todayVisitorsGuest = liveStats?.todayVisitorsGuest ?? visitors.filter((v) => isVisitedToday(v) && v.loginType === 'visitor').length;
  const todayTotalUsers = liveStats?.todayTotalUsers ?? visitors.filter(isVisitedToday).length;
  const todayVisits = liveStats?.todayVisits ?? visitors.filter(isVisitedToday).reduce((acc, v) => acc + ((v as any).todayVisitsCount || 1), 0);

  // Filter visitors by tab and search
  const filteredVisitors = visitors.filter((v) => {
    // 1. Tab filtering
    if (activeTab === 'today' && !isVisitedToday(v)) return false;
    if (activeTab === 'students' && v.loginType !== 'student') return false;
    if (activeTab === 'visitors' && v.loginType !== 'visitor') return false;
    if (activeTab === '2A' && v.section !== '2A' && !v.studentGrade?.includes('2A')) return false;
    if (activeTab === '2B' && v.section !== '2B' && !v.studentGrade?.includes('2B')) return false;
    if (activeTab === '2C' && v.section !== '2C' && !v.studentGrade?.includes('2C')) return false;

    // 2. Search filtering
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
    <div className="fixed inset-0 z-50 bg-slate-900/70 backdrop-blur-xs flex items-center justify-center p-3 sm:p-5 overflow-y-auto animate-fadeIn text-right">
      <div className="bg-white rounded-3xl w-full max-w-5xl shadow-2xl border border-slate-100 flex flex-col max-h-[92vh] overflow-hidden text-slate-800 my-auto">
        
        {/* Top Header */}
        <div className="p-5 sm:p-6 bg-gradient-to-r from-slate-900 via-indigo-950 to-slate-900 text-white flex items-center justify-between border-b border-slate-800">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-2xl bg-indigo-600/30 border border-indigo-500/40 flex items-center justify-center text-indigo-300 shrink-0">
              <Users className="w-6 h-6" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-lg sm:text-xl font-black font-sans">
                  تقرير تسجيل الدخول ومتابعة الطلاب والزوار
                </h2>
                <span className="text-[11px] font-bold px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">
                  لوحة الإدارة 👑
                </span>
              </div>
              <p className="text-xs text-slate-300 mt-0.5">
                حصر شامل لمن دخل بالاسم والزوار، مع تفاصيل الصفوف ومعدلات الاستخدام
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => {
                onRefreshStats();
                loadVisitorsList(getStoredAdminPin() || undefined);
              }}
              className="p-2 rounded-xl bg-white/10 hover:bg-white/20 text-slate-200 transition-colors cursor-pointer"
              title="تحديث البيانات فورياً"
            >
              <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
            </button>
            <button
              type="button"
              onClick={onClose}
              className="p-2 rounded-xl bg-white/10 hover:bg-white/20 text-slate-200 transition-colors cursor-pointer"
              title="إغلاق"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Daily Census Banner & Live 12AM-12AM Counters */}
        <div className="bg-gradient-to-r from-slate-900 via-indigo-950 to-blue-950 text-white p-4 sm:p-5 border-b border-indigo-900/60">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-3 mb-3">
            <div className="space-y-1">
              <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-emerald-500/20 text-emerald-300 text-xs font-bold border border-emerald-400/30">
                <Calendar className="w-3.5 h-3.5 text-emerald-400" />
                <span>الحصر اليومي الرسمي (يبدأ 12:00 منتصف الليل إلى 12:00 منتصف الليل)</span>
              </div>
              <h3 className="text-sm sm:text-base font-black text-slate-100 flex items-center gap-2 font-sans pt-0.5">
                <span>تاريخ الحصر اليومي: {liveStats?.todayDateLabel || 'اليوم الحصري'}</span>
              </h3>
              <p className="text-[11px] sm:text-xs text-slate-300 leading-relaxed font-sans">
                يبدأ الحصر بالكامل من الساعة 12 بالليل، وينتهي الساعة 12 بالليل لليوم التالي؛ لتبدأ دورة حصر جديدة تلقائياً بعدد جديد.
              </p>
            </div>
            
            <div className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-white/10 border border-white/10 text-slate-200 text-xs font-bold shrink-0 self-start md:self-auto">
              <Clock className="w-4 h-4 text-emerald-400" />
              <span>دورة الحصر: كل 24 ساعة (00:00 - 23:59)</span>
            </div>
          </div>

          {/* 4 Daily Census Cards (12 AM to 12 AM) */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-2.5 sm:gap-3">
            {/* 1. Today Students Named */}
            <div className="bg-white/10 hover:bg-white/15 transition-colors p-3 sm:p-3.5 rounded-2xl border border-indigo-300/20 shadow-xs">
              <span className="text-[11px] sm:text-xs font-bold text-indigo-200 block mb-1">
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
            <div className="bg-white/10 hover:bg-white/15 transition-colors p-3 sm:p-3.5 rounded-2xl border border-amber-300/20 shadow-xs">
              <span className="text-[11px] sm:text-xs font-bold text-amber-200 block mb-1">
                زوار اليوم (تصفح كزائر)
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
            <div className="bg-white/10 hover:bg-white/15 transition-colors p-3 sm:p-3.5 rounded-2xl border border-emerald-300/20 shadow-xs">
              <span className="text-[11px] sm:text-xs font-bold text-emerald-200 block mb-1">
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
            <div className="bg-white/10 hover:bg-white/15 transition-colors p-3 sm:p-3.5 rounded-2xl border border-purple-300/20 shadow-xs">
              <span className="text-[11px] sm:text-xs font-bold text-purple-200 block mb-1">
                مرات فتح واستخدام الخطة اليوم
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
        <div className="bg-slate-50 px-5 py-2.5 border-b border-slate-200 flex flex-wrap items-center justify-between gap-2 text-xs text-slate-600">
          <div className="flex items-center gap-2 font-bold">
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
          <div className="text-[11px] text-slate-500">
            فصول اليوم: 2A ({liveStats?.todaySectionCounts?.['2A'] || 0}) | 2B ({liveStats?.todaySectionCounts?.['2B'] || 0}) | 2C ({liveStats?.todaySectionCounts?.['2C'] || 0})
          </div>
        </div>

        {/* Filter Tabs & Quick Section Counts */}
        <div className="px-5 pt-3 pb-2 bg-white border-b border-slate-100 flex flex-wrap items-center justify-between gap-2 select-none">
          <div className="flex items-center gap-1.5 overflow-x-auto pb-1 max-w-full">
            <button
              type="button"
              onClick={() => setActiveTab('today')}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer ${
                activeTab === 'today'
                  ? 'bg-emerald-600 text-white shadow-xs'
                  : 'bg-emerald-50 hover:bg-emerald-100 text-emerald-800 border border-emerald-200'
              }`}
            >
              <Sparkles className="w-3.5 h-3.5" />
              <span>حضور اليوم (من 12:00 ص) ({todayTotalUsers})</span>
            </button>

            <button
              type="button"
              onClick={() => setActiveTab('all')}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
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
              className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all flex items-center gap-1 cursor-pointer ${
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
              className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all flex items-center gap-1 cursor-pointer ${
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
              className={`px-2.5 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
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
              className={`px-2.5 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
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
              className={`px-2.5 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                activeTab === '2C'
                  ? 'bg-indigo-700 text-white'
                  : 'bg-slate-100 hover:bg-slate-200 text-slate-600'
              }`}
            >
              فصل 2C
            </button>
          </div>

          <div className="text-[11px] text-slate-500 font-medium">
            عدد السجلات المعروضة: <strong className="text-slate-800 font-bold">{filteredVisitors.length}</strong>
          </div>
        </div>

        {/* Content Area */}
        <div className="flex-1 overflow-y-auto p-4 sm:p-5 space-y-3">
          {/* Search bar & Action Buttons */}
          <div className="flex flex-col sm:flex-row items-center justify-between gap-2.5">
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

          {/* Table */}
          {filteredVisitors.length === 0 ? (
            <div className="p-10 text-center bg-slate-50 rounded-2xl border border-slate-200 text-slate-500 text-xs">
              لا توجد سجلات تطابق البحث أو التصنيف المحدد.
            </div>
          ) : (
            <div className="overflow-x-auto rounded-2xl border border-slate-200 shadow-2xs">
              <table className="w-full text-right text-xs text-slate-700">
                <thead className="bg-slate-100 text-slate-600 font-bold border-b border-slate-200 select-none">
                  <tr>
                    <th className="p-3 w-10">#</th>
                    <th className="p-3">اسم الطالب / اسم الدخول</th>
                    <th className="p-3">نوع الدخول</th>
                    <th className="p-3">الفصل الدراسي</th>
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
                        <td className="p-3 font-mono text-slate-400 font-bold">{idx + 1}</td>
                        <td className="p-3">
                          <div className="flex items-center gap-2">
                            <span className="font-bold text-slate-900 text-sm">
                              {vis.name}
                            </span>
                            {isAdmin && (
                              <span className="text-[10px] font-bold px-2 py-0.5 rounded-md bg-amber-100 text-amber-900 border border-amber-300">
                                المسؤول 👑
                              </span>
                            )}
                            {attendedToday && !isAdmin && (
                              <span className="text-[10px] font-bold px-2 py-0.5 rounded-md bg-emerald-100 text-emerald-800 border border-emerald-300 flex items-center gap-1 shrink-0">
                                <Sparkles className="w-3 h-3 text-emerald-600" />
                                <span>حضر اليوم</span>
                              </span>
                            )}
                          </div>
                        </td>
                        <td className="p-3">
                          {isAdmin ? (
                            <span className="inline-flex items-center gap-1 text-[11px] font-bold text-amber-700 bg-amber-50 border border-amber-200 px-2 py-0.5 rounded-lg">
                              إدارة المنصة
                            </span>
                          ) : isStudent ? (
                            <span className="inline-flex items-center gap-1 text-[11px] font-bold text-indigo-700 bg-indigo-50 border border-indigo-200 px-2 py-0.5 rounded-lg">
                              <GraduationCap className="w-3 h-3" />
                              <span>طالب مسجل</span>
                            </span>
                          ) : (
                            <span className="inline-flex items-center gap-1 text-[11px] font-bold text-slate-600 bg-slate-100 border border-slate-200 px-2 py-0.5 rounded-lg">
                              <UserCheck className="w-3 h-3" />
                              <span>زائر بدون تسجيل</span>
                            </span>
                          )}
                        </td>
                        <td className="p-3">
                          <span className="font-bold text-slate-800">
                            {vis.section ? `فصل ${vis.section}` : vis.studentGrade || '—'}
                          </span>
                        </td>
                        <td className="p-3 text-slate-500 font-sans text-[11px]">{firstDate}</td>
                        <td className="p-3 text-slate-700 font-sans font-medium text-[11px]">
                          <span className="inline-flex items-center gap-1">
                            <Clock className="w-3 h-3 text-slate-400" />
                            <span>{lastDate}</span>
                          </span>
                        </td>
                        <td className="p-3 text-center">
                          {attendedToday ? (
                            <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-emerald-50 border border-emerald-200 font-mono font-bold text-emerald-700 text-xs" title={`فتح واستخدم الخطة ${todayCount} مرات اليوم (إجمالي كل الأيام: ${vis.visitCount || 1})`}>
                              <span>{todayCount} اليوم</span>
                              <span className="text-[10px] text-slate-400 font-normal">({vis.visitCount || 1})</span>
                            </span>
                          ) : (
                            <span className="inline-block px-2.5 py-0.5 rounded-full bg-slate-100 font-mono font-bold text-slate-600 text-xs">
                              {vis.visitCount || 1}
                            </span>
                          )}
                        </td>
                        <td className="p-3 text-slate-500 text-[11px] truncate max-w-[130px]" title={vis.device}>
                          {vis.device || 'متصفح ويب'}
                        </td>
                        <td className="p-3 text-center">
                          {!isAdmin && (
                            <button
                              type="button"
                              onClick={() => handleDeleteVisitor(vis.id, vis.name)}
                              className="p-1.5 rounded-lg text-slate-400 hover:text-rose-600 hover:bg-rose-50 transition-colors cursor-pointer"
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

        {/* Footer */}
        <div className="p-4 bg-slate-50 border-t border-slate-200 flex flex-col sm:flex-row items-center justify-between gap-3 text-xs text-slate-600">
          <div className="flex items-center gap-2">
            <ShieldCheck className="w-4 h-4 text-emerald-600 shrink-0" />
            <span>يتم تسجيل ومتابعة الطلاب والزوار تلقائياً وتحديث مرات الدخول والاستخدام في خادم المنصة.</span>
          </div>
          <div className="flex items-center gap-2 shrink-0">
            <button
              type="button"
              onClick={() => {
                setStoredAdminPin('');
                setIsUnlocked(false);
              }}
              className="px-3 py-1.5 rounded-xl border border-slate-300 hover:bg-slate-200 font-bold text-slate-600 transition-colors cursor-pointer text-xs"
              title="قفل التقرير والخروج"
            >
              قفل التقرير
            </button>
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-1.5 rounded-xl bg-slate-900 hover:bg-slate-800 font-bold text-white transition-colors cursor-pointer text-xs"
            >
              إغلاق
            </button>
          </div>
        </div>

      </div>
    </div>
  );
};
