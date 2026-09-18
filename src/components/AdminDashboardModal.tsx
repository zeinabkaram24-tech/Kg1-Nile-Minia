import React, { useState, useEffect, useRef } from 'react';
import {
  Shield,
  ArrowRight,
  Upload,
  FileText,
  Trash2,
  CheckCircle2,
  AlertCircle,
  Eye,
  Download,
  Printer,
  Calendar,
  Layers,
  X,
  Database,
  Cloud,
  RefreshCw,
  Copy,
  Check,
  Sparkles,
  Pencil,
} from 'lucide-react';
import { ClassId, MaterialItem, ClassworkEntry, HomeworkEntry } from '../types';
import { TomorrowSpecialNote } from '../data/defaultWeeklyPlan';
import {
  getAllMaterials,
  syncMaterialsFromCloud,
  saveMaterial,
  deleteMaterial,
  subscribeToMaterials,
  formatBytes,
  openPdfItem,
  printPdfItem,
  downloadPdfItem,
  clearAllMaterialsStorage,
} from '../utils/materialsStorage';
import { saveMaterialBlob } from '../utils/materialsDb';
import { PdfViewerModal } from './PdfViewerModal';
import { isSupabaseConfigured } from '../lib/supabase';
import { seedInitialDataIfNeeded } from '../services/supabaseService';
import { AdminWeeklyPlanManager } from './AdminWeeklyPlanManager';

interface AdminDashboardModalProps {
  isOpen: boolean;
  onClose: () => void;
  onClearAllAppData?: () => void;
  onRestoreArabicWeeklyPlan?: () => void;
  onApplyWeeklyPlan?: (
    classwork: ClassworkEntry[],
    homework: HomeworkEntry[],
    tomorrowNotes?: TomorrowSpecialNote[],
    replaceExisting?: boolean,
    options?: {
      targetBlock?: number;
      targetWeek?: number;
      targetClasses?: ClassId[];
      subjectFilter?: string;
      saveMode?: 'replace_week' | 'replace_subject' | 'replace_all' | 'append';
    }
  ) => Promise<void> | void;
  currentClass?: ClassId;
  currentBlock?: number;
  currentWeek?: number;
  initialTab?: 'materials' | 'weekly_plan' | 'supabase';
  isAdminLiveEdit?: boolean;
  onToggleAdminLiveEdit?: () => void;
}

export const AdminDashboardModal: React.FC<AdminDashboardModalProps> = ({
  isOpen,
  onClose,
  onClearAllAppData,
  onRestoreArabicWeeklyPlan,
  onApplyWeeklyPlan,
  currentClass = 'KG1A',
  currentBlock = 1,
  currentWeek = 1,
  initialTab = 'materials',
  isAdminLiveEdit = false,
  onToggleAdminLiveEdit,
}) => {
  const [materials, setMaterials] = useState<MaterialItem[]>([]);
  const [isUploading, setIsUploading] = useState(false);
  const [showUploadForm, setShowUploadForm] = useState(true);
  const [previewItem, setPreviewItem] = useState<MaterialItem | null>(null);

  // Upload Form State
  const [targetBlock, setTargetBlock] = useState<number>(1);
  const [targetSection, setTargetSection] = useState<string>('Main sheet');
  const [targetClass, setTargetClass] = useState<ClassId | 'ALL'>('ALL');
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [adminTab, setAdminTab] = useState<'materials' | 'weekly_plan' | 'supabase'>(initialTab || 'materials');

  useEffect(() => {
    if (isOpen && initialTab) {
      setAdminTab(initialTab);
    }
  }, [isOpen, initialTab]);
  const [isSeeding, setIsSeeding] = useState<boolean>(false);
  const [isSyncingCloud, setIsSyncingCloud] = useState<boolean>(false);
  const [copiedSql, setCopiedSql] = useState<boolean>(false);
  const [confirmDeleteItem, setConfirmDeleteItem] = useState<MaterialItem | null>(null);
  const [isConfirmClearAllOpen, setIsConfirmClearAllOpen] = useState<boolean>(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleSeedDatabase = async () => {
    setIsSeeding(true);
    setErrorMessage(null);
    setSuccessMessage(null);
    try {
      const res = await seedInitialDataIfNeeded(true);
      if (res.seeded) {
        setSuccessMessage(
          `تم استيراد وحفظ البيانات الأولية في Supabase بنجاح! (${res.classworkCount} درس، ${res.homeworkCount} واجب، ${res.timetablesCount} جداول).`
        );
      } else {
        setErrorMessage(
          res.message || 'لم يتم استيراد البيانات. يرجى التأكد من تشغيل كود SQL وإنشاء الجداول في Supabase.'
        );
      }
    } catch (err: any) {
      setErrorMessage(err.message || 'خطأ أثناء الاتصال بـ Supabase');
    } finally {
      setIsSeeding(false);
    }
  };

  // Load materials from storage and cloud
  const refreshMaterials = async (showSyncIndicator = false) => {
    if (showSyncIndicator) setIsSyncingCloud(true);
    try {
      await syncMaterialsFromCloud();
    } catch (e) {
      console.warn('Sync materials error:', e);
    }
    const list = await getAllMaterials();
    // Sort latest first
    list.sort(
      (a, b) => new Date(b.uploadedAt).getTime() - new Date(a.uploadedAt).getTime()
    );
    setMaterials(list);
    if (showSyncIndicator) {
      setTimeout(() => setIsSyncingCloud(false), 500);
      setSuccessMessage('تمت مزامنة الملفات سحابياً بنجاح (Mobile ⇄ Laptop).');
      setTimeout(() => setSuccessMessage(null), 3500);
    }
  };

  useEffect(() => {
    if (isOpen) {
      refreshMaterials();
    }
  }, [isOpen]);

  useEffect(() => {
    const unsubscribe = subscribeToMaterials(() => {
      refreshMaterials();
    });
    return () => unsubscribe();
  }, []);

  if (!isOpen) return null;

  // Handle File Selection
  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setErrorMessage(null);
    setSuccessMessage(null);
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.type !== 'application/pdf' && !file.name.toLowerCase().endsWith('.pdf')) {
      setErrorMessage('عفواً، الملف المحدد ليس بصيغة PDF. يرجى اختيار ملف PDF فقط.');
      setSelectedFile(null);
      if (fileInputRef.current) fileInputRef.current.value = '';
      return;
    }

    setSelectedFile(file);
  };

  // Submit Upload
  const handleConfirmUpload = async () => {
    if (!selectedFile) {
      setErrorMessage('يرجى اختيار ملف PDF أولاً.');
      return;
    }

    try {
      setIsUploading(true);
      setErrorMessage(null);

      // Read file exact binary as Base64 Data URL to preserve 100% layout and colors
      const reader = new FileReader();
      reader.onload = async () => {
        try {
          const fileData = reader.result as string;

          const newItem: MaterialItem = {
            id: 'mat_' + Date.now() + '_' + Math.random().toString(36).substring(2, 7),
            fileName: selectedFile.name,
            fileSize: selectedFile.size,
            fileData: fileData,
            block: targetBlock,
            section: targetSection,
            classId: targetClass,
            uploadedAt: new Date().toISOString(),
          };

          await saveMaterial(newItem, selectedFile);
          try {
            await saveMaterialBlob(newItem.id, selectedFile);
          } catch (blobSaveErr) {
            console.warn('Could not cache blob in IndexedDB:', blobSaveErr);
          }
          await refreshMaterials();

          setSuccessMessage(
            `تم رفع الملف "${selectedFile.name}" بنجاح في Topic ${targetBlock} (${targetSection}) وحفظه في سحابة Supabase ومزامنته!`
          );
          setSelectedFile(null);
          if (fileInputRef.current) fileInputRef.current.value = '';
          setIsUploading(false);

          // Auto clear success message after 4s
          setTimeout(() => {
            setSuccessMessage(null);
          }, 4000);
        } catch (saveErr) {
          console.error(saveErr);
          setErrorMessage('حدث خطأ أثناء حفظ الملف. يرجى المحاولة مرة أخرى.');
          setIsUploading(false);
        }
      };

      reader.onerror = () => {
        setErrorMessage('تعذر قراءة ملف الـ PDF. يرجى التحقق من الملف.');
        setIsUploading(false);
      };

      reader.readAsDataURL(selectedFile);
    } catch (err) {
      console.error(err);
      setErrorMessage('حدث خطأ غير متوقع أثناء الرفع.');
      setIsUploading(false);
    }
  };

  // Trigger Delete Confirmation Modal
  const handleDelete = (item: MaterialItem) => {
    setConfirmDeleteItem(item);
  };

  // Execute single file deletion across all stores
  const handleExecuteDelete = async () => {
    if (!confirmDeleteItem) return;
    const item = confirmDeleteItem;
    setDeletingId(item.id);
    setConfirmDeleteItem(null);

    // Optimistic local state update so it disappears immediately
    setMaterials((prev) => prev.filter((m) => m.id !== item.id));

    try {
      await deleteMaterial(item.id);
      await refreshMaterials();
      setSuccessMessage(`تم مسح ملف "${item.fileName}" نهائياً من كافة قواعد البيانات.`);
      setTimeout(() => setSuccessMessage(null), 3500);
    } catch (err) {
      console.error(err);
      setErrorMessage('حدث خطأ أثناء مسح الملف.');
      await refreshMaterials();
    } finally {
      setDeletingId(null);
    }
  };

  // Helper to open PDF in interactive in-app preview modal
  const handlePreview = (item: MaterialItem) => {
    setPreviewItem(item);
  };

  // Trigger Clear All Materials Confirmation Modal
  const handleClearAllMaterials = () => {
    setIsConfirmClearAllOpen(true);
  };

  // Execute clearing all materials across all stores
  const handleExecuteClearAll = async () => {
    setIsConfirmClearAllOpen(false);
    setMaterials([]);

    try {
      await clearAllMaterialsStorage();
      await refreshMaterials();
      setSuccessMessage('تم تفريغ وحذف كافة ملفات الماتيريال بنجاح.');
      setTimeout(() => setSuccessMessage(null), 3500);
    } catch (err) {
      console.error(err);
      setErrorMessage('فشل حذف كافة الملفات.');
      await refreshMaterials();
    }
  };

  // Print helper
  const handlePrint = (item: MaterialItem) => {
    printPdfItem(item);
  };

  // Download helper
  const handleDownload = (item: MaterialItem) => {
    downloadPdfItem(item);
  };

  const blocks = [1, 2, 3, 4];
  const sections = ['Main sheet', 'Week 1', 'Week 2', 'Week 3', 'Week 4'];

  return (
    <>
      <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-900/60 backdrop-blur-xs">
        <div
          className="bg-white rounded-3xl shadow-2xl border border-slate-200 max-w-3xl w-full p-5 sm:p-7 relative max-h-[92vh] flex flex-col animate-in fade-in zoom-in-95 duration-150"
          dir="rtl"
        >
          {/* Header */}
          <div className="flex items-center justify-between pb-4 border-b border-slate-100">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-2xl bg-slate-900 text-white flex items-center justify-center shadow-2xs">
                <Shield className="w-5 h-5 text-indigo-400" />
              </div>
              <div>
                <h2 className="text-base sm:text-lg font-black text-slate-900 leading-tight">
                  لوحة تحكم الأدمن (Admin Dashboard)
                </h2>
                <p className="text-xs text-slate-500 mt-0.5 font-semibold">
                  إدارة الماتيريال وقاعدة بيانات Supabase السحابية
                </p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => {
                  if (onToggleAdminLiveEdit) onToggleAdminLiveEdit();
                  onClose();
                }}
                className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-black transition-all cursor-pointer shadow-xs active:scale-95 ${
                  isAdminLiveEdit
                    ? 'bg-amber-500 hover:bg-amber-600 text-slate-950'
                    : 'bg-indigo-600 hover:bg-indigo-700 text-white'
                }`}
                title="تعديل مباشر على الصفحة دون الحاجة لرفع ملفات"
              >
                <Pencil className="w-3.5 h-3.5" />
                <span>{isAdminLiveEdit ? 'تعديل مباشر: شغال ✏️' : 'تعديل مباشر ✏️'}</span>
              </button>

              <button
                id="admin-dashboard-close-btn"
                onClick={onClose}
                type="button"
                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold text-slate-600 bg-slate-100 hover:bg-slate-200 transition-colors cursor-pointer"
              >
                <span>خروج</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>

          {/* Navigation Tabs (Materials vs Weekly Plan vs Supabase) */}
          <div className="flex items-center gap-2 pt-3 border-b border-slate-100 pb-2 overflow-x-auto">
            <button
              type="button"
              onClick={() => setAdminTab('materials')}
              className={`px-3.5 py-2 rounded-xl text-xs font-black transition-all cursor-pointer inline-flex items-center gap-2 shrink-0 ${
                adminTab === 'materials'
                  ? 'bg-amber-600 text-white shadow-xs'
                  : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
              }`}
            >
              <FileText className="w-4 h-4" />
              <span>ملفات الماتيريال ({materials.length})</span>
            </button>
            <button
              type="button"
              onClick={() => setAdminTab('weekly_plan')}
              className={`px-3.5 py-2 rounded-xl text-xs font-black transition-all cursor-pointer inline-flex items-center gap-2 shrink-0 ${
                adminTab === 'weekly_plan'
                  ? 'bg-indigo-600 text-white shadow-xs'
                  : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
              }`}
            >
              <Sparkles className="w-4 h-4 text-amber-300" />
              <span>إضافة وتحليل Weekly Plan 🪄</span>
            </button>
            <button
              type="button"
              onClick={() => setAdminTab('supabase')}
              className={`px-3.5 py-2 rounded-xl text-xs font-black transition-all cursor-pointer inline-flex items-center gap-2 shrink-0 ${
                adminTab === 'supabase'
                  ? 'bg-emerald-600 text-white shadow-xs'
                  : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
              }`}
            >
              <Database className="w-4 h-4" />
              <span>قاعدة بيانات Supabase السحابية</span>
              {isSupabaseConfigured && (
                <span className="w-2 h-2 rounded-full bg-emerald-300 animate-pulse"></span>
              )}
            </button>
          </div>

          {/* Body Content */}
          <div className="py-4 overflow-y-auto flex-1 space-y-5">
            {/* Success & Error alerts */}
            {successMessage && (
              <div className="p-3 bg-emerald-50 border border-emerald-200 text-emerald-900 text-xs font-bold rounded-2xl flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                <span>{successMessage}</span>
              </div>
            )}
            {errorMessage && (
              <div className="p-3 bg-rose-50 border border-rose-200 text-rose-900 text-xs font-bold rounded-2xl flex items-center gap-2">
                <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" />
                <span>{errorMessage}</span>
              </div>
            )}

            {/* Live Edit Mode Banner Card */}
            <div className="bg-gradient-to-r from-indigo-50 via-purple-50 to-blue-50 border border-indigo-200/90 rounded-2xl p-3.5 sm:p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3 shadow-2xs">
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-xl bg-indigo-600 text-white flex items-center justify-center shrink-0 shadow-xs">
                  <Pencil className="w-4 h-4" />
                </div>
                <div>
                  <h4 className="text-xs sm:text-sm font-black text-slate-900 flex items-center gap-2">
                    <span>وضع التعديل المباشر في التطبيق (Direct Live Edit)</span>
                    {isAdminLiveEdit && (
                      <span className="text-[10px] px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800 font-bold border border-emerald-200">
                        مفعل حالياً
                      </span>
                    )}
                  </h4>
                  <p className="text-[11px] text-slate-600 font-semibold mt-0.5">
                    تعديل وحذف وإضافة الدروس والواجبات والملاحظات مباشرة من كروت الصفحة بنقرة زر واحدة.
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => {
                  if (onToggleAdminLiveEdit) onToggleAdminLiveEdit();
                  onClose();
                }}
                className={`inline-flex items-center justify-center gap-1.5 px-4 py-2 rounded-xl text-xs font-black transition-all cursor-pointer shrink-0 shadow-xs active:scale-95 ${
                  isAdminLiveEdit
                    ? 'bg-rose-600 hover:bg-rose-700 text-white'
                    : 'bg-indigo-600 hover:bg-indigo-700 text-white'
                }`}
              >
                <Pencil className="w-3.5 h-3.5" />
                <span>{isAdminLiveEdit ? 'إيقاف التعديل المباشر' : 'تفعيل والتعديل في الصفحة الآن ✏️'}</span>
              </button>
            </div>

            {adminTab === 'weekly_plan' ? (
              /* WEEKLY PLAN SMART PARSER TAB CONTENT */
              <AdminWeeklyPlanManager
                currentClass={currentClass}
                currentBlock={currentBlock}
                currentWeek={currentWeek}
                onApplyPlan={async (cw, hw, notes, replace, options) => {
                  if (onApplyWeeklyPlan) {
                    await onApplyWeeklyPlan(cw, hw, notes, replace, options);
                  }
                  setSuccessMessage('تم حفظ الخطة الأسبوعية ومزامنتها بنجاح!');
                  setTimeout(() => setSuccessMessage(null), 4000);
                }}
              />
            ) : adminTab === 'supabase' ? (
              /* SUPABASE TAB CONTENT */
              <div className="space-y-5 animate-in fade-in duration-150">
                {/* Connection Status Card */}
                <div className="bg-slate-50 border border-slate-200 rounded-2xl p-4 sm:p-5 shadow-2xs">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                    <div className="flex items-center gap-3">
                      <div
                        className={`w-11 h-11 rounded-2xl flex items-center justify-center text-white shadow-xs ${
                          isSupabaseConfigured ? 'bg-emerald-600' : 'bg-slate-500'
                        }`}
                      >
                        <Cloud className="w-6 h-6" />
                      </div>
                      <div>
                        <div className="flex items-center gap-2">
                          <h3 className="text-sm sm:text-base font-black text-slate-900">
                            حالة اتصال Supabase:
                          </h3>
                          <span
                            className={`px-2.5 py-0.5 rounded-full text-xs font-bold ${
                              isSupabaseConfigured
                                ? 'bg-emerald-100 text-emerald-800 border border-emerald-300'
                                : 'bg-rose-100 text-rose-800 border border-rose-300'
                            }`}
                          >
                            {isSupabaseConfigured ? 'متصل وجاهز (Configured)' : 'غير متصل (Check .env)'}
                          </span>
                        </div>
                        <p className="text-xs text-slate-500 mt-1 font-medium">
                          {isSupabaseConfigured
                            ? 'تم ضبط مفاتيح VITE_SUPABASE_URL و VITE_SUPABASE_ANON_KEY بنجاح. العمليات الحالية تتجه لـ Supabase.'
                            : 'يرجى التأكد من إضافة VITE_SUPABASE_URL و VITE_SUPABASE_ANON_KEY في ملف البيئة.'}
                        </p>
                      </div>
                    </div>

                    <button
                      type="button"
                      onClick={handleSeedDatabase}
                      disabled={isSeeding || !isSupabaseConfigured}
                      className="px-4 py-2.5 rounded-xl text-xs font-black text-white bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 disabled:cursor-not-allowed shadow-xs transition-all flex items-center justify-center gap-2 cursor-pointer shrink-0"
                    >
                      <RefreshCw className={`w-4 h-4 ${isSeeding ? 'animate-spin' : ''}`} />
                      <span>{isSeeding ? 'جاري الاستيراد...' : 'استيراد وحفظ initialData.json في Supabase'}</span>
                    </button>
                  </div>
                </div>

                {/* Schema Information & SQL Code */}
                <div className="bg-white border border-slate-200 rounded-2xl p-4 sm:p-5 shadow-2xs space-y-3">
                  <div className="flex items-center justify-between">
                    <div>
                      <h4 className="text-sm font-black text-slate-900">
                        كود SQL لإنشاء الجداول في Supabase SQL Editor
                      </h4>
                      <p className="text-xs text-slate-500 mt-0.5">
                        قم بنسخ هذا الكود وتشغيله في Supabase Dashbord &gt; SQL Editor لإنشاء الجداول والصلاحيات بنقرة واحدة:
                      </p>
                    </div>
                    <button
                      type="button"
                      onClick={() => {
                        const sqlCode = `-- Nile Egyptian International School - Supabase Database Schema
CREATE TABLE IF NOT EXISTS public.classwork (
    id TEXT PRIMARY KEY,
    class_id TEXT NOT NULL,
    day TEXT NOT NULL,
    period INTEGER NOT NULL,
    subject TEXT NOT NULL,
    title TEXT NOT NULL,
    details TEXT,
    pages TEXT,
    completed BOOLEAN DEFAULT false,
    block INTEGER DEFAULT 1,
    week INTEGER DEFAULT 1,
    link_url TEXT,
    link_title TEXT,
    links JSONB DEFAULT '[]'::jsonb,
    created_at TIMESTAMPTZ DEFAULT timezone('utc'::text, now()) NOT NULL
);

CREATE TABLE IF NOT EXISTS public.homework (
    id TEXT PRIMARY KEY,
    class_id TEXT NOT NULL,
    assigned_day TEXT NOT NULL,
    due_day TEXT NOT NULL,
    subject TEXT NOT NULL,
    task TEXT NOT NULL,
    details TEXT,
    pages TEXT,
    completed BOOLEAN DEFAULT false,
    priority TEXT DEFAULT 'normal',
    block INTEGER DEFAULT 1,
    week INTEGER DEFAULT 1,
    link_url TEXT,
    link_title TEXT,
    links JSONB DEFAULT '[]'::jsonb,
    created_at TIMESTAMPTZ DEFAULT timezone('utc'::text, now()) NOT NULL
);

CREATE TABLE IF NOT EXISTS public.timetables (
    class_id TEXT PRIMARY KEY,
    schedule JSONB NOT NULL,
    updated_at TIMESTAMPTZ DEFAULT timezone('utc'::text, now()) NOT NULL
);

CREATE TABLE IF NOT EXISTS public.student_progress (
    student_name TEXT PRIMARY KEY,
    class_id TEXT,
    completed_classwork_ids JSONB DEFAULT '[]'::jsonb,
    completed_homework_ids JSONB DEFAULT '[]'::jsonb,
    last_active BIGINT DEFAULT 0,
    updated_at TIMESTAMPTZ DEFAULT timezone('utc'::text, now()) NOT NULL
);

CREATE TABLE IF NOT EXISTS public.materials (
    id TEXT PRIMARY KEY,
    file_name TEXT NOT NULL,
    file_size BIGINT NOT NULL,
    file_data TEXT,
    file_url TEXT,
    block INTEGER NOT NULL DEFAULT 1,
    section TEXT NOT NULL DEFAULT 'Main sheet',
    class_id TEXT DEFAULT 'ALL',
    title TEXT,
    category TEXT,
    notes TEXT,
    uploaded_at TIMESTAMPTZ DEFAULT timezone('utc'::text, now()) NOT NULL
);

CREATE TABLE IF NOT EXISTS public.planner_settings (
    id TEXT PRIMARY KEY DEFAULT 'global',
    current_block INTEGER DEFAULT 1,
    current_week INTEGER DEFAULT 1,
    active_term TEXT DEFAULT 'Term 2',
    settings JSONB DEFAULT '{}'::jsonb,
    updated_at TIMESTAMPTZ DEFAULT timezone('utc'::text, now()) NOT NULL
);

CREATE TABLE IF NOT EXISTS public.tomorrow_notes (
    id TEXT PRIMARY KEY,
    class_id TEXT DEFAULT 'ALL',
    target_day TEXT NOT NULL,
    subject TEXT,
    note TEXT NOT NULL,
    arabic_note TEXT,
    bag_item TEXT,
    block INTEGER DEFAULT 1,
    week INTEGER DEFAULT 1,
    created_at TIMESTAMPTZ DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Enable RLS
ALTER TABLE public.classwork ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.homework ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.timetables ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.student_progress ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.materials ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.planner_settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.tomorrow_notes ENABLE ROW LEVEL SECURITY;

-- Grant Full Access Policies
CREATE POLICY "Public full access to classwork" ON public.classwork FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Public full access to homework" ON public.homework FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Public full access to timetables" ON public.timetables FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Public full access to student_progress" ON public.student_progress FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Public full access to materials" ON public.materials FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Public full access to planner_settings" ON public.planner_settings FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Public full access to tomorrow_notes" ON public.tomorrow_notes FOR ALL USING (true) WITH CHECK (true);

-- Storage Bucket Setup for 'materials'
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES ('materials', 'materials', true, 52428800, ARRAY['application/pdf', 'image/png', 'image/jpeg', 'image/webp'])
ON CONFLICT (id) DO UPDATE SET public = true;

CREATE POLICY "Materials Bucket Public Read" ON storage.objects FOR SELECT USING (bucket_id = 'materials');
CREATE POLICY "Materials Bucket Public Insert" ON storage.objects FOR INSERT WITH CHECK (bucket_id = 'materials');
CREATE POLICY "Materials Bucket Public Update" ON storage.objects FOR UPDATE USING (bucket_id = 'materials') WITH CHECK (bucket_id = 'materials');
CREATE POLICY "Materials Bucket Public Delete" ON storage.objects FOR DELETE USING (bucket_id = 'materials');

-- Enable Realtime
DO $$
BEGIN
  BEGIN ALTER PUBLICATION supabase_realtime ADD TABLE public.classwork; EXCEPTION WHEN duplicate_object THEN NULL; END;
  BEGIN ALTER PUBLICATION supabase_realtime ADD TABLE public.homework; EXCEPTION WHEN duplicate_object THEN NULL; END;
  BEGIN ALTER PUBLICATION supabase_realtime ADD TABLE public.timetables; EXCEPTION WHEN duplicate_object THEN NULL; END;
  BEGIN ALTER PUBLICATION supabase_realtime ADD TABLE public.student_progress; EXCEPTION WHEN duplicate_object THEN NULL; END;
  BEGIN ALTER PUBLICATION supabase_realtime ADD TABLE public.materials; EXCEPTION WHEN duplicate_object THEN NULL; END;
  BEGIN ALTER PUBLICATION supabase_realtime ADD TABLE public.planner_settings; EXCEPTION WHEN duplicate_object THEN NULL; END;
  BEGIN ALTER PUBLICATION supabase_realtime ADD TABLE public.tomorrow_notes; EXCEPTION WHEN duplicate_object THEN NULL; END;
END $$;
`;
                        navigator.clipboard.writeText(sqlCode);
                        setCopiedSql(true);
                        setTimeout(() => setCopiedSql(false), 3000);
                      }}
                      className="px-3 py-1.5 rounded-xl text-xs font-bold text-slate-700 bg-slate-100 hover:bg-slate-200 border border-slate-300 transition-colors inline-flex items-center gap-1.5 cursor-pointer"
                    >
                      {copiedSql ? (
                        <>
                          <Check className="w-3.5 h-3.5 text-emerald-600" />
                          <span className="text-emerald-700">تم النسخ للحافظة!</span>
                        </>
                      ) : (
                        <>
                          <Copy className="w-3.5 h-3.5" />
                          <span>نسخ كود SQL</span>
                        </>
                      )}
                    </button>
                  </div>

                  <div className="bg-slate-900 text-slate-200 p-3.5 rounded-xl font-mono text-xs overflow-x-auto max-h-56 leading-relaxed select-all" dir="ltr">
                    <pre>{`-- 1. classwork (الدروس والخطة)
CREATE TABLE IF NOT EXISTS public.classwork (
  id TEXT PRIMARY KEY,
  class_id TEXT NOT NULL,
  day TEXT NOT NULL,
  period INTEGER NOT NULL,
  subject TEXT NOT NULL,
  title TEXT NOT NULL,
  details TEXT,
  pages TEXT,
  completed BOOLEAN DEFAULT false,
  block INTEGER DEFAULT 1,
  week INTEGER DEFAULT 1,
  link_url TEXT,
  link_title TEXT,
  links JSONB DEFAULT '[]'::jsonb,
  created_at TIMESTAMPTZ DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- 2. homework (الواجبات)
CREATE TABLE IF NOT EXISTS public.homework (
  id TEXT PRIMARY KEY,
  class_id TEXT NOT NULL,
  assigned_day TEXT NOT NULL,
  due_day TEXT NOT NULL,
  subject TEXT NOT NULL,
  task TEXT NOT NULL,
  details TEXT,
  pages TEXT,
  completed BOOLEAN DEFAULT false,
  priority TEXT DEFAULT 'normal',
  block INTEGER DEFAULT 1,
  week INTEGER DEFAULT 1,
  link_url TEXT,
  link_title TEXT,
  links JSONB DEFAULT '[]'::jsonb,
  created_at TIMESTAMPTZ DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- 3. timetables (الجداول)
CREATE TABLE IF NOT EXISTS public.timetables (
  class_id TEXT PRIMARY KEY,
  schedule JSONB NOT NULL,
  updated_at TIMESTAMPTZ DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- 4. student_progress (إنجاز الطلاب)
CREATE TABLE IF NOT EXISTS public.student_progress (
  student_name TEXT PRIMARY KEY,
  class_id TEXT,
  completed_classwork_ids JSONB DEFAULT '[]'::jsonb,
  completed_homework_ids JSONB DEFAULT '[]'::jsonb,
  last_active BIGINT DEFAULT 0,
  updated_at TIMESTAMPTZ DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- 5. materials (ملفات الشيتات للربط بين الموبايل واللابتوب)
CREATE TABLE IF NOT EXISTS public.materials (
  id TEXT PRIMARY KEY,
  file_name TEXT NOT NULL,
  file_size INTEGER NOT NULL,
  file_data TEXT,
  file_url TEXT,
  block INTEGER NOT NULL,
  section TEXT NOT NULL,
  class_id TEXT,
  title TEXT,
  category TEXT,
  notes TEXT,
  uploaded_at TIMESTAMPTZ DEFAULT timezone('utc'::text, now()) NOT NULL
);`}</pre>
                  </div>
                </div>
              </div>
            ) : (
              /* MATERIALS TAB CONTENT */
              <>
            {/* Top Action Card: Primary Upload Button */}
            <div className="bg-amber-50/60 border border-amber-200/90 rounded-2xl p-4 sm:p-5 shadow-2xs space-y-4">
              <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-amber-500 text-white flex items-center justify-center shadow-xs">
                    <Upload className="w-5 h-5" />
                  </div>
                  <div>
                    <h3 className="text-sm sm:text-base font-black text-amber-950">
                      إضافة شيتات PDF إلى الـ Materials مباشرة
                    </h3>
                    <p className="text-xs text-amber-800/80 font-medium">
                      اختر الـ Topic والقسم لتحميل ملف الـ PDF — يتم حفظه سحابياً ويسمع فوراً على الموبايل واللابتوب
                    </p>
                  </div>
                </div>

                <div className="flex items-center flex-wrap gap-2">
                  {/* Realtime Cloud Sync Button */}
                  <button
                    type="button"
                    onClick={() => refreshMaterials(true)}
                    disabled={isSyncingCloud}
                    className="px-3.5 py-2 rounded-xl text-xs font-bold text-indigo-700 bg-indigo-50 hover:bg-indigo-100 border border-indigo-200 transition-colors inline-flex items-center gap-1.5 cursor-pointer shadow-2xs"
                    title="مزامنة فورية لملفات الـ PDF مع السحابة والخادم"
                  >
                    <RefreshCw className={`w-3.5 h-3.5 text-indigo-600 ${isSyncingCloud ? 'animate-spin' : ''}`} />
                    <span>{isSyncingCloud ? 'جاري المزامنة...' : 'مزامنة السحابة (Mobile ⇄ Laptop)'}</span>
                  </button>

                  {/* Smart Weekly Plan Parsing Quick Button */}
                  <button
                    type="button"
                    onClick={() => setAdminTab('weekly_plan')}
                    className="px-3.5 py-2 rounded-xl text-xs font-bold text-indigo-900 bg-indigo-50 hover:bg-indigo-100 border border-indigo-300 transition-colors inline-flex items-center gap-1.5 cursor-pointer shadow-2xs"
                    title="إضافة وتحليل Weekly Plan بالذكاء الاصطناعي وتوزيعه آلياً"
                  >
                    <Sparkles className="w-3.5 h-3.5 text-indigo-600" />
                    <span>إضافة وتحليل Weekly Plan 🪄</span>
                  </button>

                  {/* Restore Arabic Weekly Plan Button */}
                  {onRestoreArabicWeeklyPlan && (
                    <button
                      type="button"
                      onClick={() => {
                        onRestoreArabicWeeklyPlan();
                        setSuccessMessage('تمت استعادة الويكلي بلان العربي بجميع الروابط والدروس بنجاح!');
                        setTimeout(() => setSuccessMessage(null), 4000);
                      }}
                      className="px-3.5 py-2 rounded-xl text-xs font-bold text-emerald-800 bg-emerald-50 hover:bg-emerald-100 border border-emerald-300 transition-colors inline-flex items-center gap-1.5 cursor-pointer shadow-2xs"
                      title="استعادة الويكلي بلان العربي الأصلي مع كافة لينكات اليوتيوب والدروس"
                    >
                      <Sparkles className="w-3.5 h-3.5 text-emerald-600" />
                      <span>استعادة الويكلي بلان العربي باللينكات</span>
                    </button>
                  )}

                  {materials.length > 0 && (
                    <button
                      type="button"
                      onClick={handleClearAllMaterials}
                      className="px-3.5 py-2 rounded-xl text-xs font-bold text-rose-700 bg-rose-50 hover:bg-rose-100 border border-rose-200 transition-colors inline-flex items-center gap-1.5 cursor-pointer shadow-2xs"
                      title="حذف كافة ملفات الماتيريال المرفوعة"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                      <span>حذف كافة ملفات الماتيريال</span>
                    </button>
                  )}

                  {onClearAllAppData && (
                    <button
                      type="button"
                      onClick={() => {
                        onClose();
                        onClearAllAppData();
                      }}
                      className="px-3.5 py-2 rounded-xl text-xs font-bold text-slate-700 bg-white hover:bg-slate-100 border border-slate-300 transition-colors inline-flex items-center gap-1.5 cursor-pointer shadow-2xs"
                      title="تفريغ جميع بيانات التطبيق والبدء من الصفر"
                    >
                      <Trash2 className="w-3.5 h-3.5 text-rose-600" />
                      <span>تفريغ شامل لبيانات التطبيق</span>
                    </button>
                  )}

                  <button
                    id="toggle-upload-form-btn"
                    type="button"
                    onClick={() => setShowUploadForm(!showUploadForm)}
                    className={`px-4 py-2 rounded-xl text-xs font-black transition-all cursor-pointer shadow-xs inline-flex items-center justify-center gap-1.5 ${
                      showUploadForm
                        ? 'bg-slate-200 text-slate-800 hover:bg-slate-300'
                        : 'bg-amber-600 text-white hover:bg-amber-700'
                    }`}
                  >
                    <Upload className="w-3.5 h-3.5" />
                    <span>{showUploadForm ? 'إخفاء نموذج التحميل' : 'تحميل ملف PDF جديد'}</span>
                  </button>
                </div>
              </div>

              {/* Upload Form Box (when opened) */}
              {showUploadForm && (
                <div className="pt-3 border-t border-amber-200/80 space-y-4 animate-in fade-in duration-200">
                  {/* Step 1: Select Topic */}
                  <div>
                    <label className="block text-xs font-black text-slate-800 mb-1.5">
                      1. اختر الـ Topic المستهدف (Select Topic):
                    </label>
                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                      {blocks.map((b) => (
                        <button
                          key={b}
                          type="button"
                          id={`admin-select-block-${b}-btn`}
                          onClick={() => setTargetBlock(b)}
                          className={`py-2 px-3 rounded-xl text-xs font-black border transition-all cursor-pointer ${
                            targetBlock === b
                              ? 'bg-amber-500 text-white border-amber-600 shadow-xs'
                              : 'bg-white text-slate-700 border-slate-200 hover:bg-amber-50/50'
                          }`}
                        >
                          Topic {b}
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Step 2: Select Section */}
                  <div>
                    <label className="block text-xs font-black text-slate-800 mb-1.5">
                      2. عايز تحمل في الـ Main Sheet ولا في ويك معين؟:
                    </label>
                    <div className="grid grid-cols-2 sm:grid-cols-5 gap-2">
                      {sections.map((sec) => (
                        <button
                          key={sec}
                          type="button"
                          id={`admin-select-sec-${sec.replace(/\s+/g, '-')}-btn`}
                          onClick={() => setTargetSection(sec)}
                          className={`py-2 px-2.5 rounded-xl text-xs font-black border transition-all cursor-pointer text-center ${
                            targetSection === sec
                              ? 'bg-indigo-600 text-white border-indigo-700 shadow-xs'
                              : 'bg-white text-slate-700 border-slate-200 hover:bg-indigo-50/50'
                          }`}
                        >
                          {sec}
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Step 3: Select Target Class */}
                  <div>
                    <label className="block text-xs font-black text-slate-800 mb-1.5">
                      3. تحديد الفصل (المستفيدين - KG 1):
                    </label>
                    <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                      {[
                        { id: 'ALL', label: 'كل الفصول (All Classes)' },
                        { id: 'KG1A', label: 'فصل KG 1 A' },
                        { id: 'KG1B', label: 'فصل KG 1 B' },
                        { id: 'KG1C', label: 'فصل KG 1 C' },
                        { id: 'KG1D', label: 'فصل KG 1 D' },
                        { id: 'KG1E', label: 'فصل KG 1 E' },
                      ].map((c) => (
                        <button
                          key={c.id}
                          type="button"
                          id={`admin-select-class-${c.id}-btn`}
                          onClick={() => setTargetClass(c.id as ClassId | 'ALL')}
                          className={`py-1.5 px-2 rounded-xl text-xs font-bold border transition-all cursor-pointer ${
                            targetClass === c.id
                              ? 'bg-slate-900 text-white border-slate-900 shadow-xs'
                              : 'bg-white text-slate-600 border-slate-200 hover:bg-slate-50'
                          }`}
                        >
                          {c.label}
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Step 4: Choose PDF file */}
                  <div>
                    <label className="block text-xs font-black text-slate-800 mb-1.5">
                      4. اختيار ملف الـ PDF المطلوب رفعه:
                    </label>
                    <div className="flex flex-col sm:flex-row items-center gap-3">
                      <input
                        ref={fileInputRef}
                        type="file"
                        accept=".pdf,application/pdf"
                        onChange={handleFileChange}
                        className="block w-full text-xs text-slate-500 file:mr-0 file:ml-3 file:py-2 file:px-4 file:rounded-xl file:border-0 file:text-xs file:font-black file:bg-amber-600 file:text-white hover:file:bg-amber-700 file:cursor-pointer bg-white border border-slate-200 rounded-xl p-1.5 shadow-2xs"
                      />
                    </div>
                    {selectedFile && (
                      <div className="mt-2 p-2.5 bg-white rounded-xl border border-emerald-200 flex items-center justify-between text-xs">
                        <div className="flex items-center gap-2 text-slate-800 font-bold truncate">
                          <FileText className="w-4 h-4 text-rose-500 shrink-0" />
                          <span className="truncate">{selectedFile.name}</span>
                          <span className="text-slate-400 font-medium">
                            ({formatBytes(selectedFile.size)})
                          </span>
                        </div>
                        <span className="text-emerald-700 font-black bg-emerald-50 px-2 py-0.5 rounded-lg shrink-0">
                          جاهز للرفع
                        </span>
                      </div>
                    )}
                  </div>

                  {/* Upload Confirm Button */}
                  <div className="pt-2 flex justify-end">
                    <button
                      id="admin-submit-upload-btn"
                      type="button"
                      disabled={!selectedFile || isUploading}
                      onClick={handleConfirmUpload}
                      className={`px-5 py-2.5 rounded-xl text-xs font-black text-white shadow-sm flex items-center gap-2 transition-all cursor-pointer ${
                        !selectedFile || isUploading
                          ? 'bg-slate-300 cursor-not-allowed'
                          : 'bg-emerald-600 hover:bg-emerald-700 active:scale-98'
                      }`}
                    >
                      <Upload className="w-4 h-4" />
                      <span>
                        {isUploading
                          ? 'جاري حفظ ورفع الملف...'
                          : `تأكيد الرفع في Topic ${targetBlock} (${targetSection})`}
                      </span>
                    </button>
                  </div>
                </div>
              )}
            </div>

            {/* List of Uploaded Materials with Delete Button */}
            <div className="space-y-3">
              <div className="flex items-center justify-between border-b border-slate-100 pb-2">
                <div className="flex items-center gap-2">
                  <Layers className="w-4 h-4 text-slate-700" />
                  <h3 className="text-sm font-black text-slate-900">
                    الملفات المرفوعة حالياً في Materials ({materials.length})
                  </h3>
                </div>
                <span className="text-[11px] font-bold text-slate-400">
                  يمكنك المعاينة أو الطباعة أو المسح
                </span>
              </div>

              {materials.length === 0 ? (
                <div className="py-8 px-4 bg-slate-50 rounded-2xl border border-dashed border-slate-200 text-center space-y-2">
                  <FileText className="w-8 h-8 text-slate-300 mx-auto" />
                  <p className="text-xs text-slate-500 font-bold">
                    لا توجد ملفات مرفوعة حتى الآن.
                  </p>
                  <p className="text-[11px] text-slate-400 font-medium">
                    اضغط على زر "تحميل ملف PDF جديد" بالأعلى لرفع وتوزيع الملفات.
                  </p>
                </div>
              ) : (
                <div className="space-y-2.5">
                  {materials.map((item) => (
                    <div
                      key={item.id}
                      className="p-3.5 bg-white border border-slate-200 hover:border-slate-300 rounded-2xl shadow-2xs flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 transition-all"
                    >
                      {/* Left: Info (Clickable to preview) */}
                      <div
                        className="flex items-start gap-3 min-w-0 cursor-pointer group/file"
                        onClick={() => handlePreview(item)}
                        title="انقر لمعاينة الـ PDF"
                      >
                        <div className="w-9 h-9 rounded-xl bg-rose-50 border border-rose-200 text-rose-600 flex items-center justify-center shrink-0 mt-0.5 group-hover/file:scale-105 transition-transform">
                          <FileText className="w-5 h-5" />
                        </div>
                        <div className="min-w-0">
                          <div className="flex items-center gap-2 flex-wrap">
                            <span className="text-xs font-black text-slate-900 group-hover/file:text-indigo-600 truncate transition-colors">
                              {item.fileName}
                            </span>
                            <span className="text-[10px] font-extrabold bg-amber-100 text-amber-900 px-2 py-0.5 rounded-md">
                              Topic {item.block}
                            </span>
                            <span className="text-[10px] font-extrabold bg-indigo-100 text-indigo-900 px-2 py-0.5 rounded-md">
                              {item.section}
                            </span>
                            <span className="text-[10px] font-bold bg-slate-100 text-slate-700 px-1.5 py-0.5 rounded-md">
                              {item.classId === 'ALL'
                                ? 'كل الفصول'
                                : item.classId === 'KG1A'
                                ? 'KG 1 A'
                                : item.classId === 'KG1B'
                                ? 'KG 1 B'
                                : item.classId === 'KG1C'
                                ? 'KG 1 C'
                                : item.classId === 'KG1D'
                                ? 'KG 1 D'
                                : item.classId === 'KG1E'
                                ? 'KG 1 E'
                                : item.classId}
                            </span>
                          </div>
                          <div className="flex items-center gap-3 text-[11px] text-slate-400 font-medium mt-1">
                            <span>الحجم: {formatBytes(item.fileSize)}</span>
                            <span>•</span>
                            <span>
                              {new Date(item.uploadedAt).toLocaleDateString('ar-EG', {
                                day: 'numeric',
                                month: 'short',
                                hour: '2-digit',
                                minute: '2-digit',
                              })}
                            </span>
                          </div>
                        </div>
                      </div>

                      {/* Right: Actions (Preview, Print, Download, Delete) */}
                      <div className="flex items-center gap-1.5 self-end sm:self-center shrink-0">
                        {/* Preview */}
                        <button
                          type="button"
                          id={`admin-preview-${item.id}-btn`}
                          onClick={() => handlePreview(item)}
                          className="p-2 rounded-xl text-indigo-700 bg-indigo-50 hover:bg-indigo-100 border border-indigo-200 transition-colors cursor-pointer"
                          title="معاينة الملف"
                        >
                          <Eye className="w-3.5 h-3.5" />
                        </button>

                        {/* Print */}
                        <button
                          type="button"
                          id={`admin-print-${item.id}-btn`}
                          onClick={() => handlePrint(item)}
                          className="p-2 rounded-xl text-slate-700 bg-slate-100 hover:bg-slate-200 border border-slate-200 transition-colors cursor-pointer"
                          title="طباعة الملف"
                        >
                          <Printer className="w-3.5 h-3.5" />
                        </button>

                        {/* Download */}
                        <button
                          type="button"
                          id={`admin-download-${item.id}-btn`}
                          onClick={() => handleDownload(item)}
                          className="p-2 rounded-xl text-emerald-700 bg-emerald-50 hover:bg-emerald-100 border border-emerald-200 transition-colors cursor-pointer"
                          title="تحميل الملف"
                        >
                          <Download className="w-3.5 h-3.5" />
                        </button>

                        {/* Delete Button (زرار مسح) */}
                        <button
                          type="button"
                          id={`admin-delete-${item.id}-btn`}
                          onClick={() => handleDelete(item)}
                          className="p-2 rounded-xl text-rose-700 bg-rose-50 hover:bg-rose-100 border border-rose-200 transition-colors cursor-pointer"
                          title="مسح وحذف الملف نهائياً"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
            </>
            )}
          </div>
        </div>
      </div>

      {/* In-App Interactive PDF Preview Modal */}
      <PdfViewerModal
        isOpen={!!previewItem}
        onClose={() => setPreviewItem(null)}
        item={previewItem}
      />

      {/* In-App Confirmation Modal for Single File Deletion */}
      {confirmDeleteItem && (
        <div className="fixed inset-0 z-70 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-2xl border border-slate-200 text-right animate-in fade-in zoom-in-95 duration-150">
            <div className="w-12 h-12 rounded-2xl bg-rose-50 border border-rose-200 text-rose-600 flex items-center justify-center mx-auto mb-4">
              <Trash2 className="w-6 h-6" />
            </div>
            <h3 className="text-base font-black text-slate-900 text-center mb-2">
              تأكيد مسح الملف نهائياً
            </h3>
            <p className="text-xs text-slate-600 leading-relaxed text-center mb-5">
              هل أنت متأكد من مسح ملف <span className="font-bold text-slate-900 font-mono">"{confirmDeleteItem.fileName}"</span> من Topic {confirmDeleteItem.block} ({confirmDeleteItem.section})؟
              <br />
              <span className="text-rose-600 font-semibold text-[11px]">سيتم حذفه بالكامل من قاعدة البيانات السحابية والتخزين المحلي.</span>
            </p>
            <div className="flex items-center justify-center gap-3">
              <button
                type="button"
                onClick={() => setConfirmDeleteItem(null)}
                className="px-4 py-2.5 rounded-xl border border-slate-200 text-slate-700 font-bold text-xs hover:bg-slate-50 transition-colors cursor-pointer"
              >
                إلغاء
              </button>
              <button
                type="button"
                onClick={handleExecuteDelete}
                className="px-5 py-2.5 rounded-xl bg-rose-600 hover:bg-rose-700 text-white font-bold text-xs shadow-sm transition-colors cursor-pointer flex items-center gap-1.5"
              >
                <Trash2 className="w-4 h-4" />
                <span>نعم، امسح الملف الآن</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* In-App Confirmation Modal for Clear All Materials */}
      {isConfirmClearAllOpen && (
        <div className="fixed inset-0 z-70 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-2xl border border-slate-200 text-right animate-in fade-in zoom-in-95 duration-150">
            <div className="w-12 h-12 rounded-2xl bg-rose-100 border border-rose-300 text-rose-700 flex items-center justify-center mx-auto mb-4">
              <AlertCircle className="w-6 h-6" />
            </div>
            <h3 className="text-base font-black text-slate-900 text-center mb-2">
              حذف كافة ملفات الماتيريال
            </h3>
            <p className="text-xs text-slate-600 leading-relaxed text-center mb-5">
              هل أنت متأكد من رغبتك في حذف جميع ملفات الـ PDF والماتيريال المرفوعة ({materials.length} ملف) نهائياً من كافة السحابات والتخزين؟
            </p>
            <div className="flex items-center justify-center gap-3">
              <button
                type="button"
                onClick={() => setIsConfirmClearAllOpen(false)}
                className="px-4 py-2.5 rounded-xl border border-slate-200 text-slate-700 font-bold text-xs hover:bg-slate-50 transition-colors cursor-pointer"
              >
                تراجع
              </button>
              <button
                type="button"
                onClick={handleExecuteClearAll}
                className="px-5 py-2.5 rounded-xl bg-rose-600 hover:bg-rose-700 text-white font-bold text-xs shadow-sm transition-colors cursor-pointer flex items-center gap-1.5"
              >
                <Trash2 className="w-4 h-4" />
                <span>نعم، احذف جميع الملفات</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
};
