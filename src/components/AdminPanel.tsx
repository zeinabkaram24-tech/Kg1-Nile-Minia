import React, { useState, useRef, useEffect } from 'react';
import {
  ShieldCheck,
  Download,
  Upload,
  RotateCcw,
  Calendar,
  Layers,
  BookOpen,
  FolderOpen,
  Plus,
  Trash2,
  Edit2,
  Search,
  FileText,
  FileSpreadsheet,
  Image as ImageIcon,
  AlertTriangle,
  CheckCircle2,
  X,
  Eye,
  Filter,
  Clock,
  Sparkles,
  Package,
  GraduationCap,
  FileUp,
  File,
  ExternalLink,
  Printer,
  Maximize2,
  Users,
  UserCheck,
  Activity,
  Mic,
  Square,
  Save
} from 'lucide-react';
import {
  SchoolClass,
  DailyFollowUp,
  WeeklyPlanItem,
  ClassTimetable,
  SchoolMaterialFile,
  PeriodSlot
} from '../types';
import { exportAllDataToJSON } from '../lib/storage';
import { getStoredVisitorStats, resetDailyVisitorStats, DailyVisitorStats } from '../lib/visitorTracking';
import { SUBJECTS, BLOCKS, WEEKS, PERIOD_TIMES, INITIAL_TIMETABLES } from '../data/initialData';
import { SubjectBadge, getSubjectInfo } from './SubjectBadge';
import { parseUploadedTimetable } from '../lib/timetableParser';

const SUBJECT_PACKING_KIT: Record<string, { book: string; notebook: string; tools: string }> = {
  english: {
    book: "Cambridge Primary English Learner's Book",
    notebook: 'كشكول إنجليزي مسطر 4 أسطر',
    tools: 'مقلمة، قلم رصاص HB، ممحاة'
  },
  math: {
    book: "Cambridge Primary Math Learner's Book",
    notebook: 'كشكول ماث مربعات Grid',
    tools: 'مسطرة 20 سم، قلم رصاص، ممحاة'
  },
  science: {
    book: "Cambridge Primary Science Learner's Book",
    notebook: 'كشكول الساينس للأنشطة والتجارب',
    tools: 'ألوان خشبية للرسم التوضيحي'
  },
  arabic: {
    book: 'كتاب تواصل (اللغة العربية) وكراسة الأنشطة',
    notebook: 'كشكول عربي مسطر سطرين',
    tools: 'قلم رصاص + ممحاة'
  },
  social: {
    book: 'كتاب الدراسات الاجتماعية والمواطنة',
    notebook: 'كشكول الدراسات الاجتماعية',
    tools: 'ألوان خشبية ومسطرة'
  },
  french: {
    book: "Alex et Zoé (Livre de l'élève)",
    notebook: 'كشكول اللغة الفرنسية',
    tools: 'أقلام رصاص وممحاة'
  },
  ict: {
    book: 'كتاب تكنولوجيا المعلومات والاتصالات ICT',
    notebook: 'كشكول الحاسب الآلي',
    tools: 'جاهزية الحصة بمعمل الحاسب'
  },
  art: {
    book: 'كراسة الرسم والتصميم (Sketchbook)',
    notebook: 'ملف الأعمال الفنية',
    tools: 'ألوان خشبية، شمعية، مسطرة، صمغ'
  },
  pe: {
    book: 'لا يوجد كتاب (نشاط رياضي بدني)',
    notebook: 'لا يوجد كشكول',
    tools: 'الزي الرياضي الكامل والحذاء الرياضي'
  },
  ethics: {
    book: 'كتاب التربية الدينية / القيم وبناء الشخصية',
    notebook: 'كشكول القيم والدين',
    tools: 'قلم رصاص وممحاة'
  }
};

interface AdminPanelProps {
  selectedClass: SchoolClass;
  onSelectClass: (c: SchoolClass) => void;
  selectedBlock?: string;
  selectedWeek?: string;
  onNavigateToTab: (tab: 'daily' | 'weekly' | 'timetable' | 'materials') => void;
  onResetData: () => void;
  onImportData: (importedJson: any) => void;
  dailyFollowUps: DailyFollowUp[];
  weeklyPlans: WeeklyPlanItem[];
  onUpdateWeeklyPlans: (plans: WeeklyPlanItem[]) => void;
  timetables: ClassTimetable[];
  onUpdateTimetables: (timetables: ClassTimetable[]) => void;
  materials: SchoolMaterialFile[];
  onUpdateMaterials: (materials: SchoolMaterialFile[]) => void;
}

export const AdminPanel: React.FC<AdminPanelProps> = ({
  selectedClass,
  onSelectClass,
  selectedBlock = 'block1',
  selectedWeek = 'week2',
  onNavigateToTab,
  onResetData,
  onImportData,
  dailyFollowUps,
  weeklyPlans,
  onUpdateWeeklyPlans,
  timetables,
  onUpdateTimetables,
  materials,
  onUpdateMaterials
}) => {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [adminTab, setAdminTab] = useState<'timetables' | 'materials' | 'plans' | 'daily' | 'visitors' | 'overview'>('timetables');

  // Daily voice-entry states. Content is stored on WeeklyPlanItem.dayContent so
  // the existing visitor and student views render it immediately.
  const [dailyEntryDay, setDailyEntryDay] = useState('الأحد');
  const [dailyEntrySubject, setDailyEntrySubject] = useState(SUBJECTS[0].id);
  const [dailyEntryClass, setDailyEntryClass] = useState<SchoolClass | 'all'>(selectedClass);
  const [dailyEntryBlock, setDailyEntryBlock] = useState(selectedBlock);
  const [dailyEntryWeek, setDailyEntryWeek] = useState(selectedWeek);
  const [dailyClasswork, setDailyClasswork] = useState('');
  const [dailyHomework, setDailyHomework] = useState('');
  const [dailyTomorrow, setDailyTomorrow] = useState('');
  const [voiceField, setVoiceField] = useState<'classwork' | 'homework' | 'tomorrow' | null>(null);
  const recognitionRef = useRef<any>(null);

  useEffect(() => {
    const matching = weeklyPlans.find((plan) =>
      plan.blockId === dailyEntryBlock &&
      plan.weekId === dailyEntryWeek &&
      plan.subjectId === dailyEntrySubject &&
      (plan.classId === dailyEntryClass || plan.classId === 'all' || dailyEntryClass === 'all')
    );
    const dayKey = `${dailyEntryDay}|${dailyEntrySubject}`;
    const dayContent = matching?.dayContent?.[dayKey] || matching?.dayContent?.[dailyEntryDay];
    setDailyClasswork(dayContent?.classworkNote || '');
    setDailyHomework(dayContent?.homeworkNote || '');
    setDailyTomorrow(dayContent?.tomorrowNote || '');
  }, [weeklyPlans, dailyEntryBlock, dailyEntryWeek, dailyEntrySubject, dailyEntryClass, dailyEntryDay]);

  const stopVoiceEntry = () => {
    recognitionRef.current?.stop?.();
    recognitionRef.current = null;
    setVoiceField(null);
  };

  const startVoiceEntry = (field: 'classwork' | 'homework' | 'tomorrow') => {
    if (voiceField) {
      stopVoiceEntry();
      return;
    }
    const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (!SpeechRecognition) {
      alert('المتصفح لا يدعم الإدخال الصوتي. استخدم Google Chrome أو Microsoft Edge.');
      return;
    }
    const recognition = new SpeechRecognition();
    recognition.lang = 'ar-EG';
    recognition.interimResults = false;
    recognition.continuous = false;
    recognition.onresult = (event: any) => {
      const text = event.results?.[0]?.[0]?.transcript?.trim() || '';
      if (field === 'classwork') setDailyClasswork((value) => `${value}${value ? ' ' : ''}${text}`);
      if (field === 'homework') setDailyHomework((value) => `${value}${value ? ' ' : ''}${text}`);
      if (field === 'tomorrow') setDailyTomorrow((value) => `${value}${value ? ' ' : ''}${text}`);
    };
    recognition.onerror = () => stopVoiceEntry();
    recognition.onend = () => {
      recognitionRef.current = null;
      setVoiceField(null);
    };
    recognitionRef.current = recognition;
    setVoiceField(field);
    recognition.start();
  };

  const handleSaveDailyEntry = (e: React.FormEvent) => {
    e.preventDefault();
    const dayKey = `${dailyEntryDay}|${dailyEntrySubject}`;
    const matching = weeklyPlans.find((plan) =>
      plan.blockId === dailyEntryBlock && plan.weekId === dailyEntryWeek && plan.subjectId === dailyEntrySubject && plan.classId === dailyEntryClass
    );
    const existingDayContent = matching?.dayContent || {};
    const nextDayContent = {
      ...existingDayContent,
      [dayKey]: {
        classworkNote: dailyClasswork.trim() || undefined,
        homeworkNote: dailyHomework.trim() || undefined,
        tomorrowNote: dailyTomorrow.trim() || undefined
      }
    };
    if (matching) {
      onUpdateWeeklyPlans(weeklyPlans.map((plan) => plan.id === matching.id ? { ...plan, dayContent: nextDayContent } : plan));
    } else {
      const newPlan: WeeklyPlanItem = {
        id: `plan-${Date.now()}`,
        blockId: dailyEntryBlock,
        weekId: dailyEntryWeek,
        classId: dailyEntryClass,
        subjectId: dailyEntrySubject,
        unitOrTheme: `Daily entry - ${dailyEntryDay}`,
        learningObjectives: [],
        dayContent: nextDayContent
      };
      onUpdateWeeklyPlans([newPlan, ...weeklyPlans]);
    }
    triggerSyncAlert('تم حفظ الـ Classwork والـ Homework وتجهيزات الغد وتحديث واجهتي الطالب والزائر فوراً ✓');
  };

  // Visitor Tracking States (12:00 AM to 12:00 AM)
  const [visitorStats, setVisitorStats] = useState<DailyVisitorStats>(() => getStoredVisitorStats());

  useEffect(() => {
    const handleVisitorUpdate = (e: any) => {
      if (e?.detail) {
        setVisitorStats(e.detail);
      } else {
        setVisitorStats(getStoredVisitorStats());
      }
    };
    window.addEventListener('nile_minya_visitor_update', handleVisitorUpdate);
    return () => {
      window.removeEventListener('nile_minya_visitor_update', handleVisitorUpdate);
    };
  }, []);

  const handleManualResetVisitors = () => {
    if (window.confirm('هل أنت متأكد من تصفير إحصائيات الزوار لهذا اليوم؟ (ملاحظة: النظام يقوم تلقائياً بالتصفير يومياً عند الساعة 12:00 منتصف الليل)')) {
      const fresh = resetDailyVisitorStats();
      setVisitorStats(fresh);
      triggerSyncAlert('تم تصفير سجل زوار اليوم بنجاح ✓');
    }
  };

  // Live Sync feedback alert
  const [syncAlert, setSyncAlert] = useState<string | null>(null);

  const triggerSyncAlert = (msg: string) => {
    setSyncAlert(msg);
    setTimeout(() => {
      setSyncAlert(null);
    }, 4500);
  };

  // Timetable Management States
  const [timetableClass, setTimetableClass] = useState<SchoolClass>(selectedClass);
  const [timetableDay, setTimetableDay] = useState<string>('الأحد');
  const [isPeriodModalOpen, setIsPeriodModalOpen] = useState(false);
  const [editingPeriodId, setEditingPeriodId] = useState<string | null>(null);
  const [periodClassTarget, setPeriodClassTarget] = useState<SchoolClass | 'all'>(selectedClass);
  const [periodDay, setPeriodDay] = useState<string>('الأحد');
  const [periodNumber, setPeriodNumber] = useState<number>(1);
  const [periodSubject, setPeriodSubject] = useState<string>(SUBJECTS[0].id);
  const [periodTime, setPeriodTime] = useState<string>('08:00 - 08:45');
  const [periodTeacher, setPeriodTeacher] = useState<string>('');
  const [periodRoom, setPeriodRoom] = useState<string>('');

  // Bulk Timetable File Upload States (PDF / Image / Word)
  const [isReplaceTimetableModalOpen, setIsReplaceTimetableModalOpen] = useState(false);
  const [replaceClassTarget, setReplaceClassTarget] = useState<SchoolClass | 'all'>(selectedClass);
  const [replaceTimetableFile, setReplaceTimetableFile] = useState<{
    name: string;
    size: string;
    type: 'pdf' | 'image' | 'word';
    dataUrl: string;
  } | null>(null);
  const [previewTimetableDoc, setPreviewTimetableDoc] = useState<ClassTimetable | null>(null);

  // Search & Filter States for Materials
  const [materialSearch, setMaterialSearch] = useState('');
  const [materialSubjectFilter, setMaterialSubjectFilter] = useState('all');
  const [materialClassFilter, setMaterialClassFilter] = useState<string>('all');

  // Search & Filter States for Weekly Plans
  const [planSearch, setPlanSearch] = useState('');
  const [planSubjectFilter, setPlanSubjectFilter] = useState('all');
  const [planClassFilter, setPlanClassFilter] = useState<string>('all');
  const [planBlockFilter, setPlanBlockFilter] = useState<string>('all');
  const [planWeekFilter, setPlanWeekFilter] = useState<string>('all');

  // Modal States for Materials
  const [isMaterialModalOpen, setIsMaterialModalOpen] = useState(false);
  const [editingMaterial, setEditingMaterial] = useState<SchoolMaterialFile | null>(null);
  const [materialTitle, setMaterialTitle] = useState('');
  const [materialSubject, setMaterialSubject] = useState(SUBJECTS[0].id);
  const [materialClass, setMaterialClass] = useState<SchoolClass | 'all'>('all');
  const [materialType, setMaterialType] = useState<'pdf' | 'doc' | 'image' | 'sheet'>('pdf');
  const [materialFileName, setMaterialFileName] = useState('');
  const [materialFileSize, setMaterialFileSize] = useState('1.8 MB');
  const [materialDesc, setMaterialDesc] = useState('');
  const [materialPreview, setMaterialPreview] = useState('');

  // Modal States for Weekly Plans
  const [isPlanModalOpen, setIsPlanModalOpen] = useState(false);
  const [editingPlan, setEditingPlan] = useState<WeeklyPlanItem | null>(null);
  const [planSubject, setPlanSubject] = useState(SUBJECTS[0].id);
  const [planClass, setPlanClass] = useState<SchoolClass | 'all'>('all');
  const [planBlock, setPlanBlock] = useState(selectedBlock);
  const [planWeek, setPlanWeek] = useState(selectedWeek);
  const [planUnitTitle, setPlanUnitTitle] = useState('');
  const [planObjectivesText, setPlanObjectivesText] = useState('');
  const [planVocabText, setPlanVocabText] = useState('');
  const [planResources, setPlanResources] = useState('');
  const [planAssessment, setPlanAssessment] = useState('');
  const [planUploadedFile, setPlanUploadedFile] = useState<{
    name: string;
    size: string;
    type: 'pdf' | 'word' | 'image';
    dataUrl: string;
  } | null>(null);

  // Weekly Plan Preview Modal State
  const [previewPlan, setPreviewPlan] = useState<WeeklyPlanItem | null>(null);

  // Import JSON handler
  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      try {
        const json = JSON.parse(event.target?.result as string);
        onImportData(json);
        alert('تم استيراد بيانات الجداول والخطط بنجاح!');
      } catch (err) {
        alert('ملف غير صالح، يرجى اختيار ملف JSON صحيح تم تصديره من النظام.');
      }
    };
    reader.readAsText(file);
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  // ================= MATERIAL ACTIONS =================
  const handleOpenAddMaterial = () => {
    setEditingMaterial(null);
    setMaterialTitle('');
    setMaterialSubject(SUBJECTS[0].id);
    setMaterialClass('all');
    setMaterialType('pdf');
    setMaterialFileName('Worksheet-KG1.pdf');
    setMaterialFileSize('1.5 MB');
    setMaterialDesc('');
    setMaterialPreview('');
    setIsMaterialModalOpen(true);
  };

  const handleOpenEditMaterial = (item: SchoolMaterialFile) => {
    setEditingMaterial(item);
    setMaterialTitle(item.title);
    setMaterialSubject(item.subjectId);
    setMaterialClass(item.classId);
    setMaterialType(item.fileType);
    setMaterialFileName(item.fileName);
    setMaterialFileSize(item.fileSize);
    setMaterialDesc(item.description || '');
    setMaterialPreview(item.previewSummary || '');
    setIsMaterialModalOpen(true);
  };

  const handleDeleteMaterial = (id: string, title: string) => {
    if (window.confirm(`هل أنت متأكد من حذف الملف "${title}" من مكتبة الماتيريال؟`)) {
      const updated = materials.filter((m) => m.id !== id);
      onUpdateMaterials(updated);
      triggerSyncAlert(`تم حذف الملف "${title}" بنجاح وتحديث واجهة الزائر والطالب فوراً ✓`);
    }
  };

  const handleSaveMaterial = (e: React.FormEvent) => {
    e.preventDefault();
    if (!materialTitle.trim()) {
      alert('يرجى كتابة عنوان المذكرة أو الملف');
      return;
    }

    if (editingMaterial) {
      // Edit existing
      const updated = materials.map((m) => {
        if (m.id === editingMaterial.id) {
          return {
            ...m,
            title: materialTitle.trim(),
            subjectId: materialSubject,
            classId: materialClass,
            fileType: materialType,
            fileName: materialFileName || m.fileName,
            fileSize: materialFileSize || m.fileSize,
            description: materialDesc.trim(),
            previewSummary: materialPreview.trim() || undefined
          };
        }
        return m;
      });
      onUpdateMaterials(updated);
      triggerSyncAlert(`تم تعديل المذكرة "${materialTitle.trim()}" بنجاح وتحديثها فوراً للزوار والطلاب ✓`);
    } else {
      // Add new
      const newMat: SchoolMaterialFile = {
        id: 'mat-' + Date.now(),
        title: materialTitle.trim(),
        subjectId: materialSubject,
        classId: materialClass,
        fileType: materialType,
        fileName: materialFileName || `${materialSubject}-revision.pdf`,
        fileSize: materialFileSize || '2.1 MB',
        uploadDate: new Date().toISOString().split('T')[0],
        uploadedBy: 'إدارة المدرسة (Admin)',
        description: materialDesc.trim(),
        previewSummary: materialPreview.trim() || undefined
      };
      onUpdateMaterials([newMat, ...materials]);
      triggerSyncAlert(`تمت إضافة المذكرة "${materialTitle.trim()}" بنجاح ونزولها فوراً في واجهة الزائر والطالب ✓`);
    }

    setIsMaterialModalOpen(false);
  };

  // Local file upload inside modal
  const handlePickLocalMaterialFile = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setMaterialFileName(file.name);
    const sizeInMB = (file.size / (1024 * 1024)).toFixed(1);
    setMaterialFileSize(`${sizeInMB} MB`);

    const ext = file.name.split('.').pop()?.toLowerCase();
    if (ext === 'pdf') setMaterialType('pdf');
    else if (ext === 'doc' || ext === 'docx') setMaterialType('doc');
    else if (ext === 'xls' || ext === 'xlsx') setMaterialType('sheet');
    else if (['jpg', 'jpeg', 'png', 'webp'].includes(ext || '')) setMaterialType('image');

    if (!materialTitle) {
      const cleanName = file.name.replace(/\.[^/.]+$/, '');
      setMaterialTitle(cleanName);
    }
  };

  // ================= WEEKLY PLAN ACTIONS =================
  const generateWeeklyPlanHtml = (plan: WeeklyPlanItem) => {
    const sub = getSubjectInfo(plan.subjectId);
    const blockObj = BLOCKS.find((b) => b.id === plan.blockId);
    const weekObj = WEEKS.find((w) => w.id === plan.weekId);

    return `<!DOCTYPE html>
<html lang="ar" dir="rtl">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=5.0">
  <title>Weekly Plan - ${sub.nameEn}</title>
  <style>
    body { font-family: system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif; background: #f8fafc; color: #1e293b; padding: 24px; margin: 0; line-height: 1.6; }
    .sheet-card { max-width: 820px; margin: 0 auto; background: white; border: 2px solid #0f766e; border-radius: 16px; padding: 32px; box-shadow: 0 10px 25px -5px rgba(0,0,0,0.05); }
    .header-box { display: flex; justify-content: space-between; align-items: center; border-bottom: 2px solid #e2e8f0; padding-bottom: 18px; margin-bottom: 20px; }
    .title { font-size: 20px; font-weight: 900; color: #0f172a; margin-bottom: 4px; }
    .sub-title { font-size: 13px; color: #64748b; font-weight: 600; }
    .badge { background: #0f766e; color: white; padding: 6px 14px; border-radius: 8px; font-weight: 800; font-size: 14px; }
    .info-grid { display: grid; grid-template-columns: repeat(3, 1fr); gap: 12px; background: #f1f5f9; padding: 14px; border-radius: 10px; margin-bottom: 22px; font-size: 12px; }
    .plan-title { font-size: 18px; font-weight: 900; color: #047857; margin-bottom: 14px; }
    .section-title { font-size: 14px; font-weight: 800; color: #0f172a; margin: 16px 0 8px; border-right: 4px solid #0f766e; padding-right: 8px; }
    ul { margin: 0; padding-right: 20px; }
    li { margin-bottom: 6px; font-size: 13px; }
    .vocab-tag { display: inline-block; background: #e0f2fe; color: #0369a1; border: 1px solid #bae6fd; padding: 3px 8px; border-radius: 6px; font-size: 11px; font-weight: 600; margin: 2px 4px; }
    .footer-note { margin-top: 24px; padding-top: 14px; border-top: 1px dashed #cbd5e1; display: flex; justify-content: space-between; font-size: 11px; color: #64748b; font-weight: 600; }
  </style>
</head>
<body>
  <div class="sheet-card">
    <div class="header-box">
      <div>
        <div class="title">مدارس النيل المصرية الدولية - فرع المنيا</div>
        <div class="sub-title">Nile Egyptian Schools • Minya Branch • KG 1</div>
      </div>
      <div class="badge">${sub.nameEn} (${sub.nameAr})</div>
    </div>

    <div class="info-grid">
      <div><strong>المادة:</strong> ${sub.nameEn}</div>
      <div><strong>Class:</strong> ${plan.classId === 'all' ? 'All Classes (A, B, C, D, E)' : `Class ${plan.classId}`}</div>
      <div><strong>التوبيك والأسبوع:</strong> ${blockObj?.nameAr || plan.blockId} • ${weekObj?.nameAr || plan.weekId}</div>
    </div>

    <div class="plan-title">Weekly Plan - ${sub.nameEn}: ${plan.unitOrTheme}</div>

    <div class="section-title">🎯 أهداف ومخرجات التعلم:</div>
    <ul>
      ${plan.learningObjectives.map((o) => `<li>${o}</li>`).join('')}
    </ul>

    ${plan.vocabulary && plan.vocabulary.length > 0 ? `
      <div class="section-title">🔤 الكلمات والمصطلحات:</div>
      <div style="margin-top: 6px;">
        ${plan.vocabulary.map((v) => `<span class="vocab-tag">${v}</span>`).join('')}
      </div>
    ` : ''}

    ${plan.resourcesNote ? `
      <div class="section-title">📖 المصادر والكتب المقررة:</div>
      <div style="font-size: 13px; color: #334155; margin-right: 8px;">${plan.resourcesNote}</div>
    ` : ''}

    ${plan.assessmentNote ? `
      <div class="section-title">📝 التقييم والملاحظات:</div>
      <div style="font-size: 13px; color: #b45309; background: #fffbeb; padding: 8px 12px; border-radius: 8px; border: 1px solid #fef3c7; margin-top: 4px;">${plan.assessmentNote}</div>
    ` : ''}

    <div class="footer-note">
      <div>الملف المعتمد: ${plan.fileName || 'WeeklyPlan.pdf'}</div>
      <div>ختم الاعتماد الأكاديمي: مدارس النيل المصرية الدولية ✓</div>
    </div>
  </div>
</body>
</html>`;
  };

  const handleOpenAddPlan = () => {
    setEditingPlan(null);
    setPlanSubject(SUBJECTS[0].id);
    setPlanClass('all');
    setPlanBlock(selectedBlock);
    setPlanWeek(selectedWeek);
    setPlanUnitTitle('');
    setPlanObjectivesText('');
    setPlanVocabText('');
    setPlanResources('');
    setPlanAssessment('');
    setPlanUploadedFile(null);
    setIsPlanModalOpen(true);
  };

  const handleOpenEditPlan = (plan: WeeklyPlanItem) => {
    setEditingPlan(plan);
    setPlanSubject(plan.subjectId);
    setPlanClass(plan.classId);
    setPlanBlock(plan.blockId);
    setPlanWeek(plan.weekId);
    setPlanUnitTitle(plan.unitOrTheme);
    setPlanObjectivesText(plan.learningObjectives.join('\n'));
    setPlanVocabText((plan.vocabulary || []).join(', '));
    setPlanResources(plan.resourcesNote || '');
    setPlanAssessment(plan.assessmentNote || '');
    if (plan.fileDataUrl) {
      setPlanUploadedFile({
        name: plan.fileName || `${plan.unitOrTheme}.pdf`,
        size: plan.fileSize || '1.5 MB',
        type: plan.fileType || 'pdf',
        dataUrl: plan.fileDataUrl
      });
    } else {
      setPlanUploadedFile(null);
    }
    setIsPlanModalOpen(true);
  };

  const handlePickLocalPlanFile = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const sizeInMB = (file.size / (1024 * 1024)).toFixed(2);
    const ext = file.name.split('.').pop()?.toLowerCase();
    let fType: 'pdf' | 'word' | 'image' = 'pdf';
    if (['jpg', 'jpeg', 'png', 'webp'].includes(ext || '')) {
      fType = 'image';
    } else if (ext === 'doc' || ext === 'docx') {
      fType = 'word';
    }

    const reader = new FileReader();
    reader.onload = (event) => {
      setPlanUploadedFile({
        name: file.name,
        size: `${sizeInMB} MB`,
        type: fType,
        dataUrl: event.target?.result as string
      });
    };
    reader.readAsDataURL(file);
  };

  const handleDeletePlan = (id: string, title: string) => {
    if (window.confirm(`هل أنت متأكد من حذف الخطة الأسبوعية "${title}"؟`)) {
      const updated = weeklyPlans.filter((p) => p.id !== id);
      onUpdateWeeklyPlans(updated);
      triggerSyncAlert('تم حذف الخطة الأسبوعية بنجاح وتحديث واجهة الزائر والطالب فوراً ✓');
    }
  };

  const handleSavePlan = (e: React.FormEvent) => {
    e.preventDefault();
    if (!planUnitTitle.trim()) {
      alert('يرجى كتابة عنوان الوحدة أو المحور الدراسي');
      return;
    }

    const objectives = planObjectivesText
      .split('\n')
      .map((line) => line.trim())
      .filter((line) => line.length > 0);

    const vocab = planVocabText
      .split(',')
      .map((w) => w.trim())
      .filter((w) => w.length > 0);

    const fileDataUrl = planUploadedFile ? planUploadedFile.dataUrl : editingPlan?.fileDataUrl;
    const fileName = planUploadedFile ? planUploadedFile.name : editingPlan?.fileName;
    const fileType = planUploadedFile ? planUploadedFile.type : editingPlan?.fileType;
    const fileSize = planUploadedFile ? planUploadedFile.size : editingPlan?.fileSize;

    if (editingPlan) {
      // Edit
      const updated = weeklyPlans.map((p) => {
        if (p.id === editingPlan.id) {
          return {
            ...p,
            subjectId: planSubject,
            classId: planClass,
            blockId: planBlock,
            weekId: planWeek,
            unitOrTheme: planUnitTitle.trim(),
            learningObjectives: objectives.length > 0 ? objectives : ['تغطية أهداف الوحدة بحسب منهج النيل المعتمد'],
            vocabulary: vocab.length > 0 ? vocab : undefined,
            resourcesNote: planResources.trim() || undefined,
            assessmentNote: planAssessment.trim() || undefined,
            fileDataUrl,
            fileName,
            fileType,
            fileSize
          };
        }
        return p;
      });
      onUpdateWeeklyPlans(updated);
      triggerSyncAlert('تم تحديث الخطة الأسبوعية بنجاح وتفعيلها فوراً لجميع الفصول والزوار ✓');
    } else {
      // Add new
      const newPlan: WeeklyPlanItem = {
        id: 'wp-' + Date.now(),
        subjectId: planSubject,
        classId: planClass,
        blockId: planBlock,
        weekId: planWeek,
        unitOrTheme: planUnitTitle.trim(),
        learningObjectives: objectives.length > 0 ? objectives : ['تغطية أهداف الوحدة بحسب منهج النيل المعتمد'],
        vocabulary: vocab.length > 0 ? vocab : undefined,
        resourcesNote: planResources.trim() || undefined,
        assessmentNote: planAssessment.trim() || undefined,
        fileDataUrl,
        fileName,
        fileType,
        fileSize
      };
      onUpdateWeeklyPlans([newPlan, ...weeklyPlans]);
      triggerSyncAlert('تمت إضافة الخطة الأسبوعية بنجاح ونزولها فوراً في جدول الخطط الأسبوعية ✓');
    }

    setIsPlanModalOpen(false);
  };

  // ================= BULK TIMETABLE REPLACEMENT HANDLERS =================
  const handlePickTimetableFile = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const sizeInMB = (file.size / (1024 * 1024)).toFixed(2);
    const ext = file.name.split('.').pop()?.toLowerCase();
    let fType: 'pdf' | 'image' | 'word' = 'pdf';
    if (['jpg', 'jpeg', 'png', 'webp'].includes(ext || '')) {
      fType = 'image';
    } else if (ext === 'doc' || ext === 'docx') {
      fType = 'word';
    }

    const reader = new FileReader();
    reader.onload = (event) => {
      setReplaceTimetableFile({
        name: file.name,
        size: `${sizeInMB} MB`,
        type: fType,
        dataUrl: event.target?.result as string
      });
    };
    reader.readAsDataURL(file);
  };

  const handleConfirmReplaceTimetable = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!replaceTimetableFile) {
      alert('يرجى اختيار ملف الجدول (PDF أو صورة أو Word) أولاً');
      return;
    }

    const nowStr = new Date().toLocaleDateString('ar-EG', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    });

    const targetClasses = replaceClassTarget === 'all' ? (['KG1A', 'KG1B', 'KG1C', 'KG1D', 'KG1E'] as SchoolClass[]) : [replaceClassTarget];
    const parsedByClass: Record<string, Awaited<ReturnType<typeof parseUploadedTimetable>>> = {};
    if (replaceTimetableFile.type === 'pdf' || replaceTimetableFile.type === 'image') {
      try {
        const parsed = await Promise.all(targetClasses.map(async (classId) => [classId, await parseUploadedTimetable(replaceTimetableFile.dataUrl, classId, replaceTimetableFile.type)] as const));
        Object.assign(parsedByClass, Object.fromEntries(parsed));
      } catch (error) {
        console.error('PDF timetable extraction failed', error);
      }
    }

    const updated = timetables.map((tt) => {
      if (replaceClassTarget === 'all' || tt.classId === replaceClassTarget) {
        const parsed = parsedByClass[tt.classId];
        return {
          ...tt,
          days: parsed?.days?.length ? parsed.days : tt.days,
          fileName: replaceTimetableFile.name,
          fileType: replaceTimetableFile.type,
          fileSize: replaceTimetableFile.size,
          fileDataUrl: replaceTimetableFile.dataUrl,
          uploadedAt: nowStr
        };
      }
      return tt;
    });

    onUpdateTimetables(updated);
    setIsReplaceTimetableModalOpen(false);
    setReplaceTimetableFile(null);
    triggerSyncAlert(
      replaceClassTarget === 'all'
        ? `تم استبدال الجدول بالكامل لجميع الفصول بملف (${replaceTimetableFile.name}) بنجاح ✓`
        : `تم استبدال جدول Class ${replaceClassTarget} بالكامل بملف (${replaceTimetableFile.name}) بنجاح ✓`
    );
  };

  const handleRemoveUploadedTimetableDoc = (classId: SchoolClass) => {
    if (window.confirm(`هل تريد حذف ملف الجدول المرفوع لـ Class ${classId} والرجوع للجدول النموذجي التفاعلي؟`)) {
      const updated = timetables.map((tt) => {
        if (tt.classId === classId) {
          const { fileName, fileType, fileSize, fileDataUrl, uploadedAt, ...rest } = tt;
          return rest as ClassTimetable;
        }
        return tt;
      });
      onUpdateTimetables(updated);
      triggerSyncAlert(`تمت إزالة المستند المرفوع لـ Class ${classId} واستعادة الجدول التفاعلي ✓`);
    }
  };

  // ================= TIMETABLE CRUD ACTIONS =================
  const handleOpenAddPeriod = (day?: string) => {
    setEditingPeriodId(null);
    setPeriodClassTarget(timetableClass);
    const targetDay = day || timetableDay;
    setPeriodDay(targetDay);

    // Calculate next period number
    const targetTT = timetables.find((t) => t.classId === timetableClass) || timetables[0];
    const targetDaySchedule = targetTT?.days.find((d) => d.dayNameAr === targetDay);
    const existing = targetDaySchedule?.periods || [];
    const maxPeriod = existing.length > 0 ? Math.max(...existing.map((p) => p.periodNum)) : 0;
    const nextNum = maxPeriod >= 7 ? 8 : maxPeriod + 1;
    setPeriodNumber(nextNum);

    const defaultTime = PERIOD_TIMES.find((pt) => pt.periodNum === nextNum)?.time || '08:00 - 08:45';
    setPeriodTime(defaultTime);
    setPeriodSubject(SUBJECTS[0].id);
    setPeriodTeacher('');
    setPeriodRoom('');
    setIsPeriodModalOpen(true);
  };

  const handleOpenEditPeriod = (targetClass: SchoolClass, dayName: string, slot: PeriodSlot) => {
    setEditingPeriodId(slot.id);
    setPeriodClassTarget(targetClass);
    setPeriodDay(dayName);
    setPeriodNumber(slot.periodNum);
    setPeriodSubject(slot.subjectId);
    setPeriodTime(slot.time);
    setPeriodTeacher(slot.teacher || '');
    setPeriodRoom(slot.room || '');
    setIsPeriodModalOpen(true);
  };

  const handleDeletePeriod = (targetClass: SchoolClass, dayName: string, periodId: string) => {
    if (!window.confirm('هل أنت متأكد من حذف هذه الحصة من الجدول؟ سيتم تفعيل الحذف فوراً لجميع الطلاب والزوار وجدول الحقيبة.')) {
      return;
    }
    const updatedTimetables = timetables.map((tt) => {
      if (tt.classId === targetClass) {
        return {
          ...tt,
          days: tt.days.map((d) => {
            if (d.dayNameAr === dayName) {
              return {
                ...d,
                periods: d.periods.filter((p) => p.id !== periodId)
              };
            }
            return d;
          })
        };
      }
      return tt;
    });
    onUpdateTimetables(updatedTimetables);
    triggerSyncAlert('تم حذف الحصة من الجدول بنجاح وتحديث واجهات الطلاب والزوار فوراً ✓');
  };

  const handleResetClassTimetable = (targetClass: SchoolClass) => {
    if (!window.confirm(`هل أنت متأكد من رغبتك في استعادة الجدول الدراسي النموذجي لـ Class ${targetClass}؟`)) {
      return;
    }
    const initialForClass = INITIAL_TIMETABLES.find((t) => t.classId === targetClass);
    if (!initialForClass) return;

    const updatedTimetables = timetables.map((tt) => {
      if (tt.classId === targetClass) {
        return JSON.parse(JSON.stringify(initialForClass));
      }
      return tt;
    });
    onUpdateTimetables(updatedTimetables);
    triggerSyncAlert(`تمت استعادة الجدول النموذجي لـ Class ${targetClass} بنجاح وتفعيله فوراً ✓`);
  };

  const handleSavePeriod = (e: React.FormEvent) => {
    e.preventDefault();

    const targetClasses: SchoolClass[] =
      periodClassTarget === 'all' ? ['KG1A', 'KG1B', 'KG1C', 'KG1D', 'KG1E'] : [periodClassTarget];

    let updatedTimetables = [...timetables];

    targetClasses.forEach((cls) => {
      updatedTimetables = updatedTimetables.map((tt) => {
        if (tt.classId !== cls) return tt;

        const updatedDays = tt.days.map((day) => {
          if (day.dayNameAr !== periodDay) return day;

          let updatedPeriods: PeriodSlot[];

          if (editingPeriodId) {
            // Editing existing period
            updatedPeriods = day.periods.map((p) => {
              if (p.id === editingPeriodId) {
                return {
                  ...p,
                  periodNum: Number(periodNumber),
                  time: periodTime.trim(),
                  subjectId: periodSubject,
                  teacher: periodTeacher.trim() || undefined,
                  room: periodRoom.trim() || undefined
                };
              }
              return p;
            });
          } else {
            // Check if slot with same periodNum already exists
            const exists = day.periods.find((p) => p.periodNum === Number(periodNumber));
            if (exists) {
              updatedPeriods = day.periods.map((p) => {
                if (p.periodNum === Number(periodNumber)) {
                  return {
                    ...p,
                    time: periodTime.trim(),
                    subjectId: periodSubject,
                    teacher: periodTeacher.trim() || undefined,
                    room: periodRoom.trim() || undefined
                  };
                }
                return p;
              });
            } else {
              const newSlot: PeriodSlot = {
                id: `p-${cls.toLowerCase()}-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
                periodNum: Number(periodNumber),
                time: periodTime.trim(),
                subjectId: periodSubject,
                teacher: periodTeacher.trim() || undefined,
                room: periodRoom.trim() || undefined
              };
              updatedPeriods = [...day.periods, newSlot];
            }
          }

          updatedPeriods.sort((a, b) => a.periodNum - b.periodNum);
          return { ...day, periods: updatedPeriods };
        });

        return { ...tt, days: updatedDays };
      });
    });

    onUpdateTimetables(updatedTimetables);
    setIsPeriodModalOpen(false);
    triggerSyncAlert('تم حفظ وتحديث الحصة في الجدول فوراً لجميع الطلاب والزوار وجدول الحقيبة المدرسية ✓');
  };

  // ================= FILTERED LISTS =================
  const filteredMaterials = materials.filter((m) => {
    const matchesSearch =
      m.title.toLowerCase().includes(materialSearch.toLowerCase()) ||
      m.fileName.toLowerCase().includes(materialSearch.toLowerCase()) ||
      (m.description || '').toLowerCase().includes(materialSearch.toLowerCase());
    const matchesSubject = materialSubjectFilter === 'all' || m.subjectId === materialSubjectFilter;
    const matchesClass = materialClassFilter === 'all' || m.classId === 'all' || m.classId === materialClassFilter;
    return matchesSearch && matchesSubject && matchesClass;
  });

  const filteredPlans = weeklyPlans.filter((p) => {
    const matchesSearch =
      p.unitOrTheme.toLowerCase().includes(planSearch.toLowerCase()) ||
      p.learningObjectives.some((obj) => obj.toLowerCase().includes(planSearch.toLowerCase())) ||
      (p.vocabulary || []).some((v) => v.toLowerCase().includes(planSearch.toLowerCase()));
    const matchesSubject = planSubjectFilter === 'all' || p.subjectId === planSubjectFilter;
    const matchesClass = planClassFilter === 'all' || p.classId === 'all' || p.classId === planClassFilter;
    const matchesBlock = planBlockFilter === 'all' || p.blockId === planBlockFilter;
    const matchesWeek = planWeekFilter === 'all' || p.weekId === planWeekFilter;
    return matchesSearch && matchesSubject && matchesClass && matchesBlock && matchesWeek;
  });

  const totalPeriodsCount = timetables.reduce(
    (acc, tt) => acc + tt.days.reduce((dAcc, d) => dAcc + d.periods.length, 0),
    0
  );

  return (
    <div className="space-y-6">
      {/* Top Banner with Direct Action Buttons */}
      <div className="bg-gradient-to-r from-amber-600 via-amber-500 to-amber-700 text-slate-950 rounded-3xl p-6 shadow-md">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div className="flex items-center gap-3.5">
            <div className="w-14 h-14 rounded-2xl bg-slate-950 text-amber-400 flex items-center justify-center font-black shadow-lg">
              <ShieldCheck className="w-8 h-8" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-2xl font-black tracking-tight">
                  لوحة تحكم وإدارة المسؤول (Admin)
                </h2>
                <span className="bg-slate-950 text-amber-300 text-[11px] font-black px-2.5 py-0.5 rounded-full">
                  صلاحيات كاملة
                </span>
              </div>
              <p className="text-xs font-semibold text-slate-900 mt-1">
                إضافة وحذف وتعديل الماتيريال والمذكرات والخطط الأسبوعية وجداول الحصص لفصول KG 1
              </p>
            </div>
          </div>

          {/* Quick Direct Add Action Buttons */}
          <div className="flex flex-wrap items-center gap-2.5">
            {/* Button requested by user: Add to Timetable directly */}
            <button
              id="admin-btn-add-period"
              type="button"
              onClick={() => handleOpenAddPeriod()}
              className="flex items-center gap-1.5 bg-indigo-700 hover:bg-indigo-800 text-white font-bold px-4 py-2.5 rounded-xl text-xs shadow-md transition-all hover:scale-102"
            >
              <Calendar className="w-4 h-4" />
              <span>+ إضافة حصة للجدول الدراسي</span>
            </button>

            <button
              id="admin-btn-add-material"
              type="button"
              onClick={handleOpenAddMaterial}
              className="flex items-center gap-1.5 bg-purple-700 hover:bg-purple-800 text-white font-bold px-4 py-2.5 rounded-xl text-xs shadow-md transition-all hover:scale-102"
            >
              <Plus className="w-4 h-4" />
              <span>+ إضافة مادة / مذكرة جديدة</span>
            </button>

            <button
              id="admin-btn-add-plan"
              type="button"
              onClick={handleOpenAddPlan}
              className="flex items-center gap-1.5 bg-emerald-700 hover:bg-emerald-800 text-white font-bold px-4 py-2.5 rounded-xl text-xs shadow-md transition-all hover:scale-102"
            >
              <Plus className="w-4 h-4" />
              <span>+ إضافة خطة أسبوعية جديدة</span>
            </button>

            <button
              type="button"
              onClick={exportAllDataToJSON}
              className="flex items-center gap-1 bg-slate-950/80 hover:bg-slate-950 text-amber-300 font-bold px-3 py-2 rounded-xl text-xs transition-colors"
              title="تصدير نسخة احتياطية من كل البيانات"
            >
              <Download className="w-3.5 h-3.5" />
              <span>نسخة احتياطية</span>
            </button>

            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              className="flex items-center gap-1 bg-white/80 hover:bg-white text-slate-900 font-bold px-3 py-2 rounded-xl text-xs transition-colors"
              title="استيراد نسخة احتياطية"
            >
              <Upload className="w-3.5 h-3.5" />
              <span>استيراد</span>
            </button>
            <input
              type="file"
              ref={fileInputRef}
              onChange={handleFileChange}
              accept=".json"
              className="hidden"
            />
          </div>
        </div>
      </div>

      {/* Live Sync Status Banner */}
      <div className="bg-emerald-50 border border-emerald-200 rounded-2xl p-4 text-xs flex items-center justify-between flex-wrap gap-3">
        <div className="flex items-center gap-2.5 text-emerald-950">
          <div className="w-3 h-3 rounded-full bg-emerald-500 animate-pulse shrink-0" />
          <span className="font-black text-sm">المزامنة الفورية المباشرة مفعلة (Live Instant Sync):</span>
          <span className="text-emerald-800 font-medium">
            أي إضافة أو تعديل أو حذف في الماتيريال أو الخطط أو جداول الحصص ينزل فوراً في واجهة الزائر وواجهة الطالب وتجهيزات الحقيبة المدرسية بدون الحاجة لإعادة تحميل الصفحة.
          </span>
        </div>
        <div className="flex items-center gap-2">
          <span className="bg-emerald-200 text-emerald-900 font-black px-2.5 py-1 rounded-lg text-[11px] border border-emerald-300">
            ✓ تحديث فوري ومحفوظ
          </span>
        </div>
      </div>

      {/* Sync Alert Toast Notification */}
      {syncAlert && (
        <div className="bg-slate-900 text-white p-4 rounded-2xl shadow-xl border border-emerald-500/50 flex items-center justify-between gap-3 animate-fade-in">
          <div className="flex items-center gap-2.5 text-xs font-bold text-emerald-300">
            <CheckCircle2 className="w-5 h-5 text-emerald-400 shrink-0" />
            <span>{syncAlert}</span>
          </div>
          <button
            type="button"
            onClick={() => setSyncAlert(null)}
            className="text-slate-400 hover:text-white p-1"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* Admin Navigation Tabs */}
      <div className="flex items-center gap-2 border-b border-slate-200 pb-3 flex-wrap">
        <button
          id="admin-tab-timetables"
          type="button"
          onClick={() => setAdminTab('timetables')}
          className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-bold transition-all ${
            adminTab === 'timetables'
              ? 'bg-indigo-600 text-white shadow-xs'
              : 'bg-white text-slate-700 hover:bg-slate-100 border border-slate-200'
          }`}
        >
          <Calendar className="w-4 h-4" />
          <span>إدارة وتعديل جداول الحصص</span>
          <span className={`px-2 py-0.5 rounded-full text-[10px] font-black ${
            adminTab === 'timetables' ? 'bg-indigo-800 text-white' : 'bg-slate-100 text-slate-600'
          }`}>
            {totalPeriodsCount} حصة مجدولة
          </span>
        </button>

        <button
          id="admin-tab-materials"
          type="button"
          onClick={() => setAdminTab('materials')}
          className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-bold transition-all ${
            adminTab === 'materials'
              ? 'bg-purple-600 text-white shadow-xs'
              : 'bg-white text-slate-700 hover:bg-slate-100 border border-slate-200'
          }`}
        >
          <FolderOpen className="w-4 h-4" />
          <span>إدارة وحذف الماتيريال والمذكرات</span>
          <span className={`px-2 py-0.5 rounded-full text-[10px] font-black ${
            adminTab === 'materials' ? 'bg-purple-800 text-white' : 'bg-slate-100 text-slate-600'
          }`}>
            {materials.length}
          </span>
        </button>

        <button
          id="admin-tab-plans"
          type="button"
          onClick={() => setAdminTab('plans')}
          className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-bold transition-all ${
            adminTab === 'plans'
              ? 'bg-emerald-600 text-white shadow-xs'
              : 'bg-white text-slate-700 hover:bg-slate-100 border border-slate-200'
          }`}
        >
          <Layers className="w-4 h-4" />
          <span>إدارة وحذف الخطط الأسبوعية</span>
          <span className={`px-2 py-0.5 rounded-full text-[10px] font-black ${
            adminTab === 'plans' ? 'bg-emerald-800 text-white' : 'bg-slate-100 text-slate-600'
          }`}>
            {weeklyPlans.length}
          </span>
        </button>

        <button
          id="admin-tab-daily"
          type="button"
          onClick={() => setAdminTab('daily')}
          className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-bold transition-all ${adminTab === 'daily' ? 'bg-rose-600 text-white shadow-xs' : 'bg-white text-slate-700 hover:bg-slate-100 border border-slate-200'}`}
        >
          <Mic className="w-4 h-4" />
          <span>الإضافة اليومية بالصوت</span>
          <span className={`px-2 py-0.5 rounded-full text-[10px] font-black ${adminTab === 'daily' ? 'bg-rose-800 text-white' : 'bg-rose-100 text-rose-700'}`}>
            Homework • Classwork • Tomorrow
          </span>
        </button>

        <button
          id="admin-tab-visitors"
          type="button"
          onClick={() => setAdminTab('visitors')}
          className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-bold transition-all ${
            adminTab === 'visitors'
              ? 'bg-sky-700 text-white shadow-xs'
              : 'bg-white text-slate-700 hover:bg-slate-100 border border-slate-200'
          }`}
        >
          <Users className="w-4 h-4" />
          <span>بيان زوار الموقع (من 12 إلى 12)</span>
          <span className={`px-2 py-0.5 rounded-full text-[10px] font-black ${
            adminTab === 'visitors' ? 'bg-sky-900 text-white' : 'bg-sky-100 text-sky-800'
          }`}>
            {visitorStats.totalVisits} زيارة
          </span>
        </button>

        <button
          id="admin-tab-overview"
          type="button"
          onClick={() => setAdminTab('overview')}
          className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-bold transition-all ${
            adminTab === 'overview'
              ? 'bg-slate-900 text-white shadow-xs'
              : 'bg-white text-slate-700 hover:bg-slate-100 border border-slate-200'
          }`}
        >
          <Sparkles className="w-4 h-4" />
          <span>نظرة عامة وإحصائيات سريعة</span>
        </button>
      </div>

      {/* ================= TAB: DAILY VOICE ENTRY ================= */}
      {adminTab === 'daily' && (
        <form onSubmit={handleSaveDailyEntry} className="space-y-4">
          <div className="bg-gradient-to-r from-rose-600 to-orange-500 rounded-3xl p-6 text-white shadow-md">
            <div className="flex items-start gap-3">
              <div className="w-12 h-12 rounded-2xl bg-white/15 flex items-center justify-center shrink-0"><Mic className="w-6 h-6" /></div>
              <div>
                <h3 className="text-xl font-black">إضافة Homework و Classwork و Tomorrow بالصوت</h3>
                <p className="text-xs text-white/90 mt-1">اختر اليوم والمادة، اضغط الميكروفون، وتحدث بالعربية. بعد الحفظ سيظهر النص مباشرة في واجهتي الطالب والزائر.</p>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-xs space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3">
              <label className="text-xs font-bold text-slate-700">الفصل
                <select value={dailyEntryClass} onChange={(e) => setDailyEntryClass(e.target.value as SchoolClass | 'all')} className="mt-1 w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-2">
                  <option value="all">كل الفصول</option><option value="KG1A">A</option><option value="KG1B">B</option><option value="KG1C">C</option><option value="KG1D">D</option><option value="KG1E">E</option>
                </select>
              </label>
              <label className="text-xs font-bold text-slate-700">اليوم
                <select value={dailyEntryDay} onChange={(e) => setDailyEntryDay(e.target.value)} className="mt-1 w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-2">
                  {(['الأحد', 'الإثنين', 'الثلاثاء', 'الأربعاء', 'الخميس'] as const).map((day, index) => <option key={day} value={day}>{['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday'][index]}</option>)}
                </select>
              </label>
              <label className="text-xs font-bold text-slate-700">المادة
                <select value={dailyEntrySubject} onChange={(e) => setDailyEntrySubject(e.target.value)} className="mt-1 w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-2">
                  {SUBJECTS.map((subject) => <option key={subject.id} value={subject.id}>{subject.nameEn} - {subject.nameAr}</option>)}
                </select>
              </label>
              <label className="text-xs font-bold text-slate-700">التوبيك
                <select value={dailyEntryBlock} onChange={(e) => setDailyEntryBlock(e.target.value)} className="mt-1 w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-2">
                  {BLOCKS.map((block) => <option key={block.id} value={block.id}>{block.nameAr}</option>)}
                </select>
              </label>
              <label className="text-xs font-bold text-slate-700">الأسبوع
                <select value={dailyEntryWeek} onChange={(e) => setDailyEntryWeek(e.target.value)} className="mt-1 w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-2">
                  {WEEKS.map((week) => <option key={week.id} value={week.id}>{week.nameAr}</option>)}
                </select>
              </label>
            </div>

            {([
              ['classwork', 'Classwork / ما تم شرحه', dailyClasswork, setDailyClasswork, 'border-indigo-200 focus:ring-indigo-500'],
              ['homework', 'Homework / الواجب', dailyHomework, setDailyHomework, 'border-rose-200 focus:ring-rose-500'],
              ['tomorrow', 'Tomorrow / تجهيزات الغد', dailyTomorrow, setDailyTomorrow, 'border-amber-200 focus:ring-amber-500']
            ] as const).map(([field, label, value, setter, color]) => (
              <div key={field}>
                <div className="flex items-center justify-between mb-1.5">
                  <label className="text-sm font-black text-slate-800">{label}</label>
                  <button type="button" onClick={() => startVoiceEntry(field)} className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-black transition-colors ${voiceField === field ? 'bg-red-600 text-white animate-pulse' : 'bg-slate-100 text-slate-700 hover:bg-slate-200'}`}>
                    {voiceField === field ? <Square className="w-3.5 h-3.5" /> : <Mic className="w-3.5 h-3.5" />}
                    {voiceField === field ? 'إيقاف التسجيل' : 'تحدث صوتياً'}
                  </button>
                </div>
                <textarea value={value} onChange={(e) => setter(e.target.value)} rows={3} placeholder="اكتب هنا أو استخدم الميكروفون..." className={`w-full rounded-2xl border bg-slate-50 px-4 py-3 text-sm focus:outline-none focus:ring-2 ${color}`} />
              </div>
            ))}

            <div className="flex justify-end pt-2">
              <button type="submit" className="flex items-center gap-2 rounded-xl bg-slate-950 px-5 py-3 text-sm font-black text-white hover:bg-slate-800">
                <Save className="w-4 h-4" /> حفظ وتحديث الواجهتين
              </button>
            </div>
          </div>
        </form>
      )}

      {/* ================= TAB 1: MATERIALS MANAGEMENT ================= */}
      {adminTab === 'materials' && (
        <div className="space-y-4">
          <div className="bg-white rounded-2xl p-5 border border-slate-200 shadow-xs">
            <div className="flex flex-wrap items-center justify-between gap-4 mb-4">
              <div>
                <h3 className="font-black text-lg text-slate-900 flex items-center gap-2">
                  <FolderOpen className="w-5 h-5 text-purple-600" />
                  <span>إدارة ملفات ومذكرات المواد (Materials & Library)</span>
                </h3>
                <p className="text-xs text-slate-500 mt-0.5">
                  أضف مذكرات جديدة، أو عدل عليها، أو احذف أي ملف لم يعد مطلوباً.
                </p>
              </div>

              <button
                type="button"
                onClick={handleOpenAddMaterial}
                className="flex items-center gap-1.5 bg-purple-600 hover:bg-purple-700 text-white font-bold px-4 py-2 rounded-xl text-xs shadow-xs transition-colors"
              >
                <Plus className="w-4 h-4" />
                <span>+ إضافة ملف ماتيريال جديد</span>
              </button>
            </div>

            {/* Filter Bar */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-3 border-t border-slate-100">
              <div className="relative">
                <Search className="w-4 h-4 text-slate-400 absolute right-3 top-2.5" />
                <input
                  type="text"
                  placeholder="بحث في المذكرات والملفات..."
                  value={materialSearch}
                  onChange={(e) => setMaterialSearch(e.target.value)}
                  className="w-full pr-9 pl-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs focus:outline-hidden focus:ring-2 focus:ring-purple-500"
                />
              </div>

              <div>
                <select
                  value={materialSubjectFilter}
                  onChange={(e) => setMaterialSubjectFilter(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold text-slate-700 focus:outline-hidden focus:ring-2 focus:ring-purple-500"
                >
                  <option value="all">جميع المواد (All Subjects)</option>
                  {SUBJECTS.map((s) => (
                    <option key={s.id} value={s.id}>
                      {s.nameEn} ({s.nameAr})
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <select
                  value={materialClassFilter}
                  onChange={(e) => setMaterialClassFilter(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold text-slate-700 focus:outline-hidden focus:ring-2 focus:ring-purple-500"
                >
                  <option value="all">All Classes (A, B, C, D, E)</option>
                  <option value="KG1A">Class A</option>
                  <option value="KG1B">Class B</option>
                  <option value="KG1C">Class C</option>
                  <option value="KG1D">Class D</option>
                  <option value="KG1E">Class E</option>
                </select>
              </div>
            </div>
          </div>

          {/* Materials List Table / Cards */}
          <div className="space-y-3">
            {filteredMaterials.length === 0 ? (
              <div className="bg-white rounded-2xl p-12 text-center border border-slate-200 text-slate-400">
                <FolderOpen className="w-12 h-12 mx-auto mb-3 text-slate-300" />
                <p className="text-sm font-bold text-slate-600">لا توجد ملفات تطابق البحث أو الفلتر</p>
                <button
                  type="button"
                  onClick={handleOpenAddMaterial}
                  className="mt-3 text-xs bg-purple-100 hover:bg-purple-200 text-purple-800 font-bold px-3.5 py-1.5 rounded-lg"
                >
                  + إضافة أول ملف ماتيريال الآن
                </button>
              </div>
            ) : (
              filteredMaterials.map((item) => {
                return (
                  <div
                    key={item.id}
                    className="bg-white rounded-2xl p-4 border border-slate-200 shadow-xs hover:border-purple-300 transition-all flex flex-wrap items-center justify-between gap-4"
                  >
                    <div className="flex items-start gap-3.5">
                      <div className="w-11 h-11 rounded-xl bg-purple-50 text-purple-700 flex items-center justify-center shrink-0 border border-purple-100">
                        {item.fileType === 'pdf' ? (
                          <FileText className="w-5 h-5 text-red-500" />
                        ) : item.fileType === 'sheet' ? (
                          <FileSpreadsheet className="w-5 h-5 text-emerald-600" />
                        ) : item.fileType === 'image' ? (
                          <ImageIcon className="w-5 h-5 text-sky-600" />
                        ) : (
                          <FileText className="w-5 h-5 text-blue-600" />
                        )}
                      </div>

                      <div>
                        <div className="flex items-center gap-2 flex-wrap mb-1">
                          <SubjectBadge subjectId={item.subjectId} size="sm" />
                          <span className="bg-slate-100 text-slate-700 text-[10px] font-bold px-2 py-0.5 rounded-md">
                            {item.classId === 'all' ? 'All Classes (KG 1)' : `Class ${item.classId}`}
                          </span>
                          <span className="bg-slate-100 text-slate-500 text-[10px] px-2 py-0.5 rounded-md uppercase font-mono">
                            {item.fileType} • {item.fileSize}
                          </span>
                        </div>

                        <h4 className="font-black text-sm text-slate-900">{item.title}</h4>
                        <p className="text-xs text-slate-500 mt-0.5 font-mono">{item.fileName}</p>
                        {item.description && (
                          <p className="text-xs text-slate-600 mt-1 line-clamp-1">{item.description}</p>
                        )}
                      </div>
                    </div>

                    {/* Action Buttons: Edit and Delete */}
                    <div className="flex items-center gap-2">
                      <button
                        type="button"
                        onClick={() => handleOpenEditMaterial(item)}
                        className="flex items-center gap-1 bg-slate-100 hover:bg-purple-100 text-slate-700 hover:text-purple-800 font-bold px-3 py-1.5 rounded-xl text-xs transition-colors"
                        title="تعديل بيانات الملف"
                      >
                        <Edit2 className="w-3.5 h-3.5" />
                        <span>تعديل</span>
                      </button>

                      <button
                        type="button"
                        onClick={() => handleDeleteMaterial(item.id, item.title)}
                        className="flex items-center gap-1 bg-red-50 hover:bg-red-600 text-red-700 hover:text-white font-bold px-3 py-1.5 rounded-xl text-xs transition-colors"
                        title="حذف الملف من الماتيريال"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                        <span>حذف</span>
                      </button>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>
      )}

      {/* ================= TAB 2: WEEKLY PLANS MANAGEMENT ================= */}
      {adminTab === 'plans' && (
        <div className="space-y-4">
          <div className="bg-white rounded-2xl p-5 border border-slate-200 shadow-xs">
            <div className="flex flex-wrap items-center justify-between gap-4 mb-4">
              <div>
                <h3 className="font-black text-lg text-slate-900 flex items-center gap-2">
                  <Layers className="w-5 h-5 text-emerald-600" />
                  <span>إدارة الخطط الأسبوعية (Weekly Plans)</span>
                </h3>
                <p className="text-xs text-slate-500 mt-0.5">
                  إضافة وحذف وتعديل الخطط الدراسية لكل مادة وأسبوع وتوبيك.
                </p>
              </div>

              <button
                type="button"
                onClick={handleOpenAddPlan}
                className="flex items-center gap-1.5 bg-emerald-600 hover:bg-emerald-700 text-white font-bold px-4 py-2 rounded-xl text-xs shadow-xs transition-colors"
              >
                <Plus className="w-4 h-4" />
                <span>+ إضافة خطة أسبوعية جديدة</span>
              </button>
            </div>

            {/* Filter Bar */}
            <div className="grid grid-cols-1 sm:grid-cols-4 gap-3 pt-3 border-t border-slate-100">
              <div className="relative">
                <Search className="w-4 h-4 text-slate-400 absolute right-3 top-2.5" />
                <input
                  type="text"
                  placeholder="بحث في الخطط والوحدات..."
                  value={planSearch}
                  onChange={(e) => setPlanSearch(e.target.value)}
                  className="w-full pr-9 pl-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs focus:outline-hidden focus:ring-2 focus:ring-emerald-500"
                />
              </div>

              <div>
                <select
                  value={planSubjectFilter}
                  onChange={(e) => setPlanSubjectFilter(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold text-slate-700 focus:outline-hidden focus:ring-2 focus:ring-emerald-500"
                >
                  <option value="all">جميع المواد (All Subjects)</option>
                  {SUBJECTS.map((s) => (
                    <option key={s.id} value={s.id}>
                      {s.nameEn} ({s.nameAr})
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <select
                  value={planBlockFilter}
                  onChange={(e) => setPlanBlockFilter(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold text-slate-700 focus:outline-hidden focus:ring-2 focus:ring-emerald-500"
                >
                  <option value="all">جميع التوبيكات (All Topics)</option>
                  {BLOCKS.map((b) => (
                    <option key={b.id} value={b.id}>
                      {b.nameAr}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <select
                  value={planWeekFilter}
                  onChange={(e) => setPlanWeekFilter(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold text-slate-700 focus:outline-hidden focus:ring-2 focus:ring-emerald-500"
                >
                  <option value="all">جميع الأسابيع (All Weeks)</option>
                  {WEEKS.map((w) => (
                    <option key={w.id} value={w.id}>
                      {w.nameAr}
                    </option>
                  ))}
                </select>
              </div>
            </div>
          </div>

          {/* Plans List Cards */}
          <div className="space-y-3">
            {filteredPlans.length === 0 ? (
              <div className="bg-white rounded-2xl p-12 text-center border border-slate-200 text-slate-400">
                <Layers className="w-12 h-12 mx-auto mb-3 text-slate-300" />
                <p className="text-sm font-bold text-slate-600">لا توجد خطط أسبوعية تطابق البحث أو الفلتر</p>
                <button
                  type="button"
                  onClick={handleOpenAddPlan}
                  className="mt-3 text-xs bg-emerald-100 hover:bg-emerald-200 text-emerald-800 font-bold px-3.5 py-1.5 rounded-lg"
                >
                  + إضافة خطة أسبوعية الآن
                </button>
              </div>
            ) : (
              filteredPlans.map((plan) => {
                const sub = getSubjectInfo(plan.subjectId);
                const blockObj = BLOCKS.find((b) => b.id === plan.blockId);
                const weekObj = WEEKS.find((w) => w.id === plan.weekId);

                return (
                  <div
                    key={plan.id}
                    className="bg-white rounded-2xl p-5 border border-slate-200 shadow-xs hover:border-emerald-300 transition-all space-y-3"
                  >
                    <div className="flex flex-wrap items-center justify-between gap-3">
                      <div className="flex items-center gap-2 flex-wrap">
                        <SubjectBadge subjectId={plan.subjectId} size="md" />
                        <span className="bg-slate-100 text-slate-700 text-xs font-bold px-2.5 py-1 rounded-lg">
                          {plan.classId === 'all' ? 'All Classes (KG 1)' : `Class ${plan.classId}`}
                        </span>
                        <span className="bg-emerald-50 text-emerald-800 border border-emerald-200 text-xs font-bold px-2.5 py-1 rounded-lg">
                          {blockObj?.nameAr || plan.blockId} • {weekObj?.nameAr || plan.weekId}
                        </span>
                      </div>

                      <button
                        type="button"
                        onClick={() => handleDeletePlan(plan.id, plan.unitOrTheme)}
                        className="p-1.5 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                        title="حذف الخطة"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>

                    <div>
                      <h4 className="font-black text-base text-slate-900 leading-snug">
                        Weekly Plan - {sub.nameEn} ({plan.unitOrTheme})
                      </h4>
                      <div className="flex items-center gap-1.5 text-[11px] text-slate-500 font-medium mt-1">
                        <FileText className="w-3.5 h-3.5 text-emerald-600" />
                        <span>{plan.fileName || `${sub.nameEn}_WeeklyPlan.pdf`}</span>
                        <span>•</span>
                        <span className="uppercase font-bold text-emerald-700 bg-emerald-50 px-1.5 py-0.2 rounded border border-emerald-200 text-[10px]">
                          {plan.fileType?.toUpperCase() || 'PDF'}
                        </span>
                        <span>•</span>
                        <span>{plan.fileSize || '1.5 MB'}</span>
                      </div>
                    </div>

                    {/* Exactly 2 Buttons: Preview & Edit */}
                    <div className="grid grid-cols-2 gap-2 pt-2 border-t border-slate-100">
                      <button
                        type="button"
                        onClick={() => setPreviewPlan(plan)}
                        className="flex items-center justify-center gap-1.5 py-2.5 px-4 bg-emerald-600 hover:bg-emerald-700 text-white font-bold rounded-xl text-xs shadow-xs transition-all cursor-pointer"
                      >
                        <Eye className="w-4 h-4" />
                        <span>معاينة</span>
                      </button>

                      <button
                        type="button"
                        onClick={() => handleOpenEditPlan(plan)}
                        className="flex items-center justify-center gap-1.5 py-2.5 px-4 bg-slate-100 hover:bg-slate-200 text-slate-800 font-bold rounded-xl text-xs transition-all cursor-pointer"
                      >
                        <Edit2 className="w-4 h-4" />
                        <span>تعديل</span>
                      </button>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>
      )}

      {/* ================= TAB 3: OVERVIEW & QUICK LINKS ================= */}
      {adminTab === 'overview' && (
        <div className="space-y-6">
          {/* Quick Stats Grid */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
            <div className="bg-white rounded-2xl p-4 border border-slate-200 shadow-xs">
              <span className="text-xs font-semibold text-slate-500 block">فصول KG 1</span>
              <span className="text-2xl font-black text-slate-900">5 فصول</span>
              <span className="text-[11px] text-sky-600 font-bold mt-1 block">A و B و C و D و E</span>
            </div>

            <div className="bg-white rounded-2xl p-4 border border-slate-200 shadow-xs">
              <span className="text-xs font-semibold text-slate-500 block">الخطط الأسبوعية</span>
              <span className="text-2xl font-black text-emerald-700">{weeklyPlans.length}</span>
              <span className="text-[11px] text-slate-500 mt-1 block">خطة معتمدة بالتوبيكات</span>
            </div>

            <div className="bg-white rounded-2xl p-4 border border-slate-200 shadow-xs">
              <span className="text-xs font-semibold text-slate-500 block">ملفات الماتيريال</span>
              <span className="text-2xl font-black text-purple-700">{materials.length}</span>
              <span className="text-[11px] text-slate-500 mt-1 block">مذكرات وملازم مرفوعة</span>
            </div>

            <div className="bg-white rounded-2xl p-4 border border-slate-200 shadow-xs">
              <span className="text-xs font-semibold text-slate-500 block">سجلات المتابعة</span>
              <span className="text-2xl font-black text-indigo-700">{dailyFollowUps.length}</span>
              <span className="text-[11px] text-slate-500 mt-1 block">تقارير يومية مسجلة</span>
            </div>
          </div>

          {/* Quick Navigation Action Cards for Admin */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
            <div className="bg-white rounded-2xl p-5 border border-slate-200 shadow-xs flex flex-col justify-between">
              <div>
                <div className="w-10 h-10 rounded-xl bg-sky-100 text-sky-700 flex items-center justify-center font-bold mb-3">
                  <BookOpen className="w-5 h-5" />
                </div>
                <h3 className="font-extrabold text-base text-slate-900 mb-1">
                  إدارة المتابعة اليومية
                </h3>
                <p className="text-xs text-slate-500 leading-relaxed mb-4">
                  إدخال الهوم ورك والواجبات، وما تم تدريسه في الحصص، وتجهيزات ومستلزمات الغد.
                </p>
              </div>

              <button
                type="button"
                onClick={() => onNavigateToTab('daily')}
                className="w-full py-2.5 bg-sky-600 hover:bg-sky-700 text-white font-bold text-xs rounded-xl shadow-xs transition-colors"
              >
                إدارة المتابعة اليومية →
              </button>
            </div>

            <div className="bg-white rounded-2xl p-5 border border-slate-200 shadow-xs flex flex-col justify-between">
              <div>
                <div className="w-10 h-10 rounded-xl bg-emerald-100 text-emerald-700 flex items-center justify-center font-bold mb-3">
                  <Layers className="w-5 h-5" />
                </div>
                <h3 className="font-extrabold text-base text-slate-900 mb-1">
                  إدارة الخطط الأسبوعية
                </h3>
                <p className="text-xs text-slate-500 leading-relaxed mb-4">
                  تنزيل وتحديث الخطط لكل مادة (English, Math, Science, Arabic, إلخ) أسبوعياً.
                </p>
              </div>

              <button
                type="button"
                onClick={() => onNavigateToTab('weekly')}
                className="w-full py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs rounded-xl shadow-xs transition-colors"
              >
                إدارة الخطط الأسبوعية →
              </button>
            </div>

            <div className="bg-white rounded-2xl p-5 border border-slate-200 shadow-xs flex flex-col justify-between">
              <div>
                <div className="w-10 h-10 rounded-xl bg-indigo-100 text-indigo-700 flex items-center justify-center font-bold mb-3">
                  <Calendar className="w-5 h-5" />
                </div>
                <h3 className="font-extrabold text-base text-slate-900 mb-1">
                  إدارة جداول الحصص
                </h3>
                <p className="text-xs text-slate-500 leading-relaxed mb-4">
                  تعديل توزيع الحصص اليومية، أسماء المعلمين، وتوقيت الحصص لفصول KG1A إلى KG1E.
                </p>
              </div>

              <button
                type="button"
                onClick={() => onNavigateToTab('timetable')}
                className="w-full py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs rounded-xl shadow-xs transition-colors"
              >
                تعديل جداول الحصص →
              </button>
            </div>

            <div className="bg-white rounded-2xl p-5 border border-slate-200 shadow-xs flex flex-col justify-between">
              <div>
                <div className="w-10 h-10 rounded-xl bg-purple-100 text-purple-700 flex items-center justify-center font-bold mb-3">
                  <FolderOpen className="w-5 h-5" />
                </div>
                <h3 className="font-extrabold text-base text-slate-900 mb-1">
                  رفع وإدارة الماتيريال
                </h3>
                <p className="text-xs text-slate-500 leading-relaxed mb-4">
                  رفع ملفات ومذكرات المواد مع أيقونات فتح، معاينة، تحميل، وطباعة لكل ملف.
                </p>
              </div>

              <button
                type="button"
                onClick={() => onNavigateToTab('materials')}
                className="w-full py-2.5 bg-purple-600 hover:bg-purple-700 text-white font-bold text-xs rounded-xl shadow-xs transition-colors"
              >
                رفع وإدارة الماتيريال →
              </button>
            </div>
          </div>

          {/* Reset Defaults */}
          <div className="bg-red-50/50 rounded-2xl p-5 border border-red-200 flex flex-wrap items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-red-100 text-red-700 flex items-center justify-center font-bold shrink-0">
                <AlertTriangle className="w-5 h-5" />
              </div>
              <div>
                <h4 className="font-extrabold text-sm text-red-950">إعادة ضبط البيانات للوضع الافتراضي</h4>
                <p className="text-xs text-red-700 mt-0.5">
                  يعيد الجداول والخطط والمتابعة إلى النموذج الأساسي لمدارس النيل فرع المنيا.
                </p>
              </div>
            </div>

            <button
              type="button"
              onClick={() => {
                if (window.confirm('هل أنت متأكد من رغبتك في إعادة ضبط البيانات؟ سيتم مسح أي تعديلات شخصية والعودة للبيانات الافتراضية.')) {
                  onResetData();
                }
              }}
              className="flex items-center gap-1.5 px-4 py-2 bg-red-600 hover:bg-red-700 text-white font-bold text-xs rounded-xl shadow-xs transition-colors"
            >
              <RotateCcw className="w-3.5 h-3.5" />
              <span>استعادة البيانات الافتراضية</span>
            </button>
          </div>
        </div>
      )}

      {/* ================= TAB: TIMETABLE MANAGEMENT ================= */}
      {adminTab === 'timetables' && (
        <div className="space-y-5">
          {/* Controls Bar: Class Selector & Day Selector */}
          <div className="bg-white rounded-2xl p-5 border border-slate-200 shadow-xs space-y-4">
            <div className="flex flex-wrap items-center justify-between gap-4">
              <div>
                <h3 className="font-black text-lg text-slate-900 flex items-center gap-2">
                  <Calendar className="w-5 h-5 text-indigo-600" />
                  <span>إدارة وتعديل جداول الحصص الأسبوعية</span>
                </h3>
                <p className="text-xs text-slate-500 mt-0.5">
                  إضافة الحصص، تعديل المواد والمعلمين، أو استبدال الجدول بالكامل بملف PDF أو صورة أو Word
                </p>
              </div>

              <div className="flex items-center gap-2 flex-wrap">
                {/* Bulk Timetable Upload Button */}
                <button
                  type="button"
                  onClick={() => {
                    setReplaceClassTarget(timetableClass);
                    setIsReplaceTimetableModalOpen(true);
                  }}
                  className="flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-emerald-600 via-teal-600 to-indigo-600 hover:from-emerald-700 hover:to-indigo-700 text-white font-black text-xs rounded-xl shadow-xs transition-all hover:scale-102 cursor-pointer"
                  title="استبدال الجدول بالكامل بملف PDF أو صورة أو Word"
                >
                  <FileUp className="w-4 h-4" />
                  <span>استبدال الجدول بالكامل بملف (PDF / صورة / Word)</span>
                </button>

                {/* Class Selection Buttons */}
                <div className="flex items-center gap-1.5 bg-slate-100 p-1.5 rounded-xl border border-slate-200">
                  <span className="text-[11px] font-bold text-slate-500 px-2">Class:</span>
                  {(['KG1A', 'KG1B', 'KG1C', 'KG1D', 'KG1E'] as SchoolClass[]).map((cls) => (
                    <button
                      key={cls}
                      type="button"
                      onClick={() => {
                        setTimetableClass(cls);
                        onSelectClass(cls);
                      }}
                      className={`px-3 py-1.5 rounded-lg text-xs font-black transition-all ${
                        timetableClass === cls
                          ? 'bg-indigo-600 text-white shadow-xs'
                          : 'text-slate-600 hover:text-slate-900 hover:bg-slate-200/60'
                      }`}
                    >
                      Class {cls}
                    </button>
                  ))}
                </div>
              </div>
            </div>

            {/* Days Tabs */}
            <div className="flex items-center gap-2 border-t border-slate-100 pt-3 flex-wrap">
              <span className="text-[11px] font-bold text-slate-500">اختر اليوم:</span>
              {(['الأحد', 'الإثنين', 'الثلاثاء', 'الأربعاء', 'الخميس'] as const).map((dayName, index) => {
                const daySlotCount =
                  timetables
                    .find((t) => t.classId === timetableClass)
                    ?.days.find((d) => d.dayNameAr === dayName)?.periods.length || 0;
                const isSelected = timetableDay === dayName;
                return (
                  <button
                    key={dayName}
                    type="button"
                    onClick={() => setTimetableDay(dayName)}
                    className={`flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-bold transition-all ${
                      isSelected
                        ? 'bg-indigo-600 text-white shadow-xs'
                        : 'bg-slate-50 hover:bg-slate-100 text-slate-700 border border-slate-200'
                    }`}
                  >
                    <span>{['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday'][index]}</span>
                    <span
                      className={`text-[10px] px-1.5 py-0.2 rounded-full font-black ${
                        isSelected ? 'bg-indigo-800 text-white' : 'bg-slate-200 text-slate-600'
                      }`}
                    >
                      {daySlotCount}
                    </span>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Day View Header & Action Buttons */}
          {(() => {
            const currentTT = timetables.find((t) => t.classId === timetableClass) || timetables[0];
            const currentDayObj = currentTT?.days.find((d) => d.dayNameAr === timetableDay) || currentTT?.days[0];
            const activePeriods = currentDayObj?.periods || [];

            return (
              <>
                {/* Active Uploaded Timetable Document Banner */}
                {currentTT?.fileDataUrl && (
                  <div className="bg-emerald-50 border-2 border-emerald-300 rounded-2xl p-5 shadow-xs flex flex-wrap items-center justify-between gap-4">
                    <div className="flex items-center gap-3">
                      <div className="w-12 h-12 rounded-xl bg-emerald-600 text-white flex items-center justify-center font-bold shadow-xs shrink-0">
                        <FileText className="w-6 h-6" />
                      </div>
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="bg-emerald-600 text-white text-[11px] font-black px-2.5 py-0.5 rounded-md">
                            تم استبدال الجدول بالكامل بالمستند المعتمد
                          </span>
                          <span className="text-xs font-bold text-slate-800">Class {timetableClass}</span>
                        </div>
                        <h4 className="text-sm font-black text-slate-900 mt-1 flex items-center gap-2 flex-wrap">
                          <span>{currentTT.fileName}</span>
                          <span className="text-xs font-semibold text-emerald-800 uppercase bg-emerald-100/80 px-2 py-0.5 rounded">
                            {currentTT.fileType?.toUpperCase()}
                          </span>
                          <span className="text-xs text-slate-500 font-normal">({currentTT.fileSize})</span>
                        </h4>
                        <p className="text-[11px] text-slate-500 mt-0.5">
                          تاريخ الرفع: {currentTT.uploadedAt || '2026/2027'} • يظهر هذا الملف كجدول معتمد للطلاب والزوار
                        </p>
                      </div>
                    </div>

                    <div className="flex items-center gap-2 flex-wrap">
                      <button
                        type="button"
                        onClick={() => setPreviewTimetableDoc(currentTT)}
                        className="flex items-center gap-1.5 px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold rounded-xl shadow-xs transition-colors cursor-pointer"
                      >
                        <Eye className="w-4 h-4" />
                        <span>معاينة المستند المعتمد</span>
                      </button>

                      <button
                        type="button"
                        onClick={() => {
                          setReplaceClassTarget(timetableClass);
                          setIsReplaceTimetableModalOpen(true);
                        }}
                        className="flex items-center gap-1.5 px-3.5 py-2 bg-white hover:bg-slate-100 text-slate-700 border border-slate-200 text-xs font-bold rounded-xl transition-colors cursor-pointer"
                      >
                        <FileUp className="w-4 h-4" />
                        <span>استبدال بملف آخر</span>
                      </button>

                      <button
                        type="button"
                        onClick={() => handleRemoveUploadedTimetableDoc(timetableClass)}
                        className="flex items-center gap-1 px-3 py-2 bg-red-50 hover:bg-red-100 text-red-700 text-xs font-bold rounded-xl border border-red-200 transition-colors cursor-pointer"
                        title="حذف المستند المرفوع واستعادة الجدول التفاعلي"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                        <span>إلغاء المستند المرفوع</span>
                      </button>
                    </div>
                  </div>
                )}

                <div className="bg-gradient-to-r from-indigo-900 via-indigo-800 to-slate-900 text-white rounded-2xl p-5 shadow-sm flex flex-wrap items-center justify-between gap-4">
                  <div className="flex items-center gap-3">
                    <div className="w-12 h-12 rounded-xl bg-white/10 backdrop-blur-xs flex items-center justify-center font-black text-indigo-200 border border-white/10">
                      <Clock className="w-6 h-6" />
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <h4 className="text-lg font-black tracking-tight">
                          جدول حصص يوم {timetableDay} - Class {timetableClass}
                        </h4>
                        <span className="bg-amber-400 text-slate-950 text-[10px] font-black px-2 py-0.5 rounded-full">
                          {activePeriods.length} حصص مجدولة
                        </span>
                      </div>
                      <p className="text-xs text-indigo-200/80 mt-0.5">
                        مدارس النيل المصرية الدولية - فرع المنيا • العام الدراسي 2026/2027
                      </p>
                    </div>
                  </div>

                  {/* Direct Add Buttons for Timetable */}
                  <div className="flex items-center gap-2 flex-wrap">
                    <button
                      type="button"
                      onClick={() => handleOpenAddPeriod(timetableDay)}
                      className="flex items-center gap-1.5 px-4 py-2.5 bg-emerald-500 hover:bg-emerald-600 text-slate-950 font-black text-xs rounded-xl shadow-md transition-all hover:scale-102"
                    >
                      <Plus className="w-4 h-4" />
                      <span>+ إضافة حصة لهذا اليوم ({timetableDay})</span>
                    </button>

                    <button
                      type="button"
                      onClick={() => {
                        handleOpenAddPeriod(timetableDay);
                        setPeriodClassTarget('all');
                      }}
                      className="flex items-center gap-1.5 px-3.5 py-2.5 bg-white/10 hover:bg-white/20 text-white font-bold text-xs rounded-xl border border-white/20 transition-colors"
                      title="إضافة الحصة لجميع الفصول دفعة واحدة"
                    >
                      <span>+ إضافة لجميع الفصول (A, B, C, D, E)</span>
                    </button>

                    <button
                      type="button"
                      onClick={() => handleResetClassTimetable(timetableClass)}
                      className="flex items-center gap-1 px-3 py-2.5 bg-red-500/20 hover:bg-red-500/30 text-red-200 border border-red-500/30 font-bold text-xs rounded-xl transition-colors"
                      title="استعادة الجدول النموذجي لهذا الفصل"
                    >
                      <RotateCcw className="w-3.5 h-3.5" />
                      <span>استعادة الافتراضي</span>
                    </button>
                  </div>
                </div>

                {/* Periods Cards List */}
                {activePeriods.length === 0 ? (
                  <div className="bg-white rounded-2xl p-12 text-center border border-slate-200">
                    <Calendar className="w-12 h-12 text-slate-300 mx-auto mb-3" />
                    <h4 className="font-bold text-slate-800 text-base mb-1">
                      لا توجد حصص مجدولة ليوم {timetableDay} في Class {timetableClass}
                    </h4>
                    <p className="text-xs text-slate-500 mb-4 max-w-md mx-auto">
                      يمكنك الآن الضغط على زر إضافة حصة لإدراج الحصة الأولى وتحديد المادة والتوقيت واسم المعلم ومستلزمات الحقيبة المدرسية.
                    </p>
                    <button
                      type="button"
                      onClick={() => handleOpenAddPeriod(timetableDay)}
                      className="px-5 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs rounded-xl shadow-xs transition-colors"
                    >
                      + إضافة أول حصة ليوم {timetableDay}
                    </button>
                  </div>
                ) : (
                  <div className="space-y-3">
                    {activePeriods.map((slot) => {
                      const kit = SUBJECT_PACKING_KIT[slot.subjectId] || {
                        book: 'كتاب المادة المعتمد',
                        notebook: 'كشكول المادة',
                        tools: 'الأدوات المدرسية والمقلمة'
                      };

                      return (
                        <div
                          key={slot.id}
                          className="bg-white rounded-2xl p-4 border border-slate-200 shadow-xs hover:border-indigo-300 transition-all flex flex-col md:flex-row md:items-center justify-between gap-4"
                        >
                          {/* Left: Period Number & Time & Subject */}
                          <div className="flex items-start sm:items-center gap-3.5 flex-1 min-w-0">
                            {/* Period Badge */}
                            <div className="w-12 h-12 rounded-xl bg-indigo-50 border border-indigo-100 flex flex-col items-center justify-center shrink-0">
                              <span className="text-[10px] font-bold text-indigo-600">حصة</span>
                              <span className="text-base font-black text-indigo-950 leading-none">
                                {slot.periodNum}
                              </span>
                            </div>

                            {/* Subject and Details */}
                            <div className="space-y-1.5 min-w-0 flex-1">
                              <div className="flex items-center gap-2 flex-wrap">
                                <SubjectBadge subjectId={slot.subjectId} showIcon size="md" />
                                <div className="flex items-center gap-1 text-[11px] font-semibold text-slate-500 bg-slate-100 px-2.5 py-0.5 rounded-md">
                                  <Clock className="w-3 h-3 text-slate-400" />
                                  <span>{slot.time}</span>
                                </div>
                              </div>

                              <div className="flex items-center gap-3 text-xs text-slate-600 flex-wrap">
                                <div className="flex items-center gap-1 font-medium">
                                  <GraduationCap className="w-3.5 h-3.5 text-slate-400" />
                                  <span>المعلم:</span>
                                  <span className="font-bold text-slate-800">
                                    {slot.teacher || 'معلم المادة المعتمد'}
                                  </span>
                                </div>

                                <span className="text-slate-300">•</span>

                                <div className="flex items-center gap-1 font-medium">
                                  <span>القاعة / المكان:</span>
                                  <span className="font-bold text-slate-800">
                                    {slot.room || `فصل ${timetableClass}`}
                                  </span>
                                </div>
                              </div>

                              {/* Packing Kit requirements summary */}
                              <div className="flex items-center gap-2 pt-1 text-[11px] text-slate-500 flex-wrap">
                                <span className="font-bold text-slate-600 flex items-center gap-1">
                                  <Package className="w-3 h-3 text-slate-400" />
                                  تجهيزات الحقيبة:
                                </span>
                                <span className="bg-slate-50 border border-slate-200 px-2 py-0.5 rounded text-slate-700">
                                  📖 {kit.book}
                                </span>
                                <span className="bg-slate-50 border border-slate-200 px-2 py-0.5 rounded text-slate-700">
                                  📓 {kit.notebook}
                                </span>
                              </div>
                            </div>
                          </div>

                          {/* Right: Actions */}
                          <div className="flex items-center gap-2 shrink-0 border-t md:border-t-0 pt-3 md:pt-0 border-slate-100 justify-end">
                            <button
                              type="button"
                              onClick={() => handleOpenEditPeriod(timetableClass, timetableDay, slot)}
                              className="flex items-center gap-1 px-3 py-2 bg-indigo-50 hover:bg-indigo-100 text-indigo-700 rounded-xl text-xs font-bold transition-colors"
                              title="تعديل الحصة وتوقيتها ومعلمها"
                            >
                              <Edit2 className="w-3.5 h-3.5" />
                              <span>تعديل الحصة</span>
                            </button>

                            <button
                              type="button"
                              onClick={() => handleDeletePeriod(timetableClass, timetableDay, slot.id)}
                              className="flex items-center gap-1 px-3 py-2 bg-red-50 hover:bg-red-100 text-red-700 rounded-xl text-xs font-bold transition-colors"
                              title="حذف الحصة من الجدول"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                              <span>حذف</span>
                            </button>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </>
            );
          })()}
        </div>
      )}

      {/* ================= MODAL: ADD / EDIT MATERIAL ================= */}
      {isMaterialModalOpen && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl max-w-xl w-full p-6 shadow-2xl border border-slate-200 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between border-b border-slate-100 pb-4 mb-5">
              <div className="flex items-center gap-2">
                <div className="w-10 h-10 rounded-xl bg-purple-100 text-purple-700 flex items-center justify-center font-bold">
                  <FolderOpen className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="font-black text-lg text-slate-900">
                    {editingMaterial ? 'تعديل ملف الماتيريال' : 'رفع وإضافة مذكرة / ماتيريال جديد'}
                  </h3>
                  <p className="text-xs text-slate-500">
                    مكتبة مدارس النيل المصرية الدولية فرع المنيا - KG 1
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setIsMaterialModalOpen(false)}
                className="text-slate-400 hover:text-slate-600 p-1"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSaveMaterial} className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  عنوان الملف / المذكرة: <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  required
                  placeholder="مثال: مذكرة مراجعة Math Block 1 أو قصة اللغة العربية"
                  value={materialTitle}
                  onChange={(e) => setMaterialTitle(e.target.value)}
                  className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 text-xs focus:ring-2 focus:ring-purple-500"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">المادة الدراسية:</label>
                  <select
                    value={materialSubject}
                    onChange={(e) => setMaterialSubject(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl border border-slate-300 text-xs font-semibold"
                  >
                    {SUBJECTS.map((s) => (
                      <option key={s.id} value={s.id}>
                        {s.nameEn} ({s.nameAr})
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">Class:</label>
                  <select
                    value={materialClass}
                    onChange={(e) => setMaterialClass(e.target.value as any)}
                    className="w-full px-3 py-2 rounded-xl border border-slate-300 text-xs font-semibold"
                  >
                    <option value="all">All Classes (A, B, C, D, E)</option>
                    <option value="KG1A">Class A</option>
                    <option value="KG1B">Class B</option>
                    <option value="KG1C">Class C</option>
                    <option value="KG1D">Class D</option>
                    <option value="KG1E">Class E</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">نوع المستند:</label>
                  <select
                    value={materialType}
                    onChange={(e) => setMaterialType(e.target.value as any)}
                    className="w-full px-3 py-2 rounded-xl border border-slate-300 text-xs font-semibold"
                  >
                    <option value="pdf">ملف PDF (أكروبات)</option>
                    <option value="doc">مستند Word</option>
                    <option value="sheet">جدول بيانات Excel</option>
                    <option value="image">صورة / خريطة توضيحية</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">اختيار ملف من الجهاز:</label>
                  <input
                    type="file"
                    onChange={handlePickLocalMaterialFile}
                    className="w-full px-2 py-1.5 rounded-xl border border-slate-300 text-xs file:mr-2 file:py-1 file:px-2.5 file:rounded-lg file:border-0 file:text-xs file:font-semibold file:bg-purple-50 file:text-purple-700 hover:file:bg-purple-100"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">اسم الملف (File Name):</label>
                  <input
                    type="text"
                    value={materialFileName}
                    onChange={(e) => setMaterialFileName(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl border border-slate-300 text-xs font-mono"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">الحجم التقريبي:</label>
                  <input
                    type="text"
                    value={materialFileSize}
                    onChange={(e) => setMaterialFileSize(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl border border-slate-300 text-xs"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">وصف المذكرة والملاحظات:</label>
                <textarea
                  rows={2}
                  placeholder="وصف مختصر لمحتوى الملف وما يغطيه من دروس وأسئلة..."
                  value={materialDesc}
                  onChange={(e) => setMaterialDesc(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl border border-slate-300 text-xs"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  نص المعاينة السريعة (يظهر داخل نافذة المعاينة بالبرنامج):
                </label>
                <textarea
                  rows={3}
                  placeholder="يمكنك كتابة ملخص أو أهم النقاط لكي يستطيع الطالب وولي الأمر قراءتها سريعاً دون تحميل الملف..."
                  value={materialPreview}
                  onChange={(e) => setMaterialPreview(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl border border-slate-300 text-xs font-mono"
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setIsMaterialModalOpen(false)}
                  className="px-4 py-2 text-xs text-slate-600 hover:bg-slate-100 rounded-xl font-bold"
                >
                  إلغاء
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 text-xs bg-purple-600 hover:bg-purple-700 text-white font-bold rounded-xl shadow-xs"
                >
                  {editingMaterial ? 'حفظ التعديلات' : 'رفع وحفظ في الماتيريال ✓'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ================= MODAL: ADD / EDIT WEEKLY PLAN ================= */}
      {isPlanModalOpen && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl max-w-xl w-full p-6 shadow-2xl border border-slate-200 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between border-b border-slate-100 pb-4 mb-5">
              <div className="flex items-center gap-2">
                <div className="w-10 h-10 rounded-xl bg-emerald-100 text-emerald-700 flex items-center justify-center font-bold">
                  <Layers className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="font-black text-lg text-slate-900">
                    {editingPlan ? 'تعديل الخطة الأسبوعية' : 'إضافة خطة أسبوعية جديدة'}
                  </h3>
                  <p className="text-xs text-slate-500">
                    نظام الخطط المعتمد لمدارس النيل فرع المنيا
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setIsPlanModalOpen(false)}
                className="text-slate-400 hover:text-slate-600 p-1"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSavePlan} className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">المادة الدراسية:</label>
                  <select
                    value={planSubject}
                    onChange={(e) => setPlanSubject(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl border border-slate-300 text-xs font-semibold"
                  >
                    {SUBJECTS.map((s) => (
                      <option key={s.id} value={s.id}>
                        {s.nameEn} ({s.nameAr})
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">Class:</label>
                  <select
                    value={planClass}
                    onChange={(e) => setPlanClass(e.target.value as any)}
                    className="w-full px-3 py-2 rounded-xl border border-slate-300 text-xs font-semibold"
                  >
                    <option value="all">All Classes (KG 1)</option>
                    <option value="KG1A">Class A</option>
                    <option value="KG1B">Class B</option>
                    <option value="KG1C">Class C</option>
                    <option value="KG1D">Class D</option>
                    <option value="KG1E">Class E</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">التوبيك الدراسي:</label>
                  <select
                    value={planBlock}
                    onChange={(e) => setPlanBlock(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl border border-slate-300 text-xs font-semibold"
                  >
                    {BLOCKS.map((b) => (
                      <option key={b.id} value={b.id}>
                        {b.nameAr}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">الأسبوع:</label>
                  <select
                    value={planWeek}
                    onChange={(e) => setPlanWeek(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl border border-slate-300 text-xs font-semibold"
                  >
                    {WEEKS.map((w) => (
                      <option key={w.id} value={w.id}>
                        {w.nameAr}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  عنوان الخطة الأسبوعية (Weekly Plan Title): <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  required
                  placeholder="مثال: Two-Digit Addition or أنا أستطيع"
                  value={planUnitTitle}
                  onChange={(e) => setPlanUnitTitle(e.target.value)}
                  className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 text-xs focus:ring-2 focus:ring-emerald-500 font-bold"
                />
              </div>

              {/* File Attachment for Weekly Plan (PDF / Word / Image) */}
              <div className="bg-emerald-50/70 border border-emerald-200 rounded-xl p-3.5 space-y-2">
                <label className="block text-xs font-bold text-emerald-950 flex items-center justify-between">
                  <span className="flex items-center gap-1.5">
                    <FileUp className="w-4 h-4 text-emerald-600" />
                    <span>رفع ملف الخطة الأسبوعية (PDF / Word / صورة):</span>
                  </span>
                  <span className="text-[10px] text-emerald-700 font-normal">يفتح للمعاينة المباشرة بنفس الصيغة</span>
                </label>
                <input
                  type="file"
                  accept=".pdf,.doc,.docx,.png,.jpg,.jpeg,.webp"
                  onChange={handlePickLocalPlanFile}
                  className="w-full px-2 py-1.5 rounded-xl border border-emerald-300 text-xs bg-white file:mr-2 file:py-1 file:px-2.5 file:rounded-lg file:border-0 file:text-xs file:font-semibold file:bg-emerald-100 file:text-emerald-800 hover:file:bg-emerald-200 cursor-pointer"
                />
                {planUploadedFile && (
                  <div className="flex items-center justify-between bg-white px-3 py-1.5 rounded-lg border border-emerald-200 text-xs">
                    <span className="font-bold text-emerald-900 truncate">{planUploadedFile.name}</span>
                    <span className="text-[11px] text-emerald-700 font-mono shrink-0 mr-2">{planUploadedFile.size} • {planUploadedFile.type.toUpperCase()}</span>
                  </div>
                )}
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  الأهداف التعليمية (Learning Objectives):
                </label>
                <p className="text-[11px] text-slate-400 mb-1">اكتب كل هدف في سطر منفصل</p>
                <textarea
                  rows={4}
                  placeholder={`الهدف الأول\nالهدف الثاني\nالهدف الثالث`}
                  value={planObjectivesText}
                  onChange={(e) => setPlanObjectivesText(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl border border-slate-300 text-xs"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  الكلمات والمفردات الجديدة (Vocabulary):
                </label>
                <p className="text-[11px] text-slate-400 mb-1">افصل بين كل كلمة بفاصلة (,)</p>
                <input
                  type="text"
                  placeholder="Community, Helper, Firefighter, Clinic"
                  value={planVocabText}
                  onChange={(e) => setPlanVocabText(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl border border-slate-300 text-xs font-mono"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">المصادر والصفحات:</label>
                  <input
                    type="text"
                    placeholder="Student Book pp. 24-30 + Workbook"
                    value={planResources}
                    onChange={(e) => setPlanResources(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl border border-slate-300 text-xs"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">ملاحظة التقييم والاختبار:</label>
                  <input
                    type="text"
                    placeholder="إملاء يوم الخميس + تقييم أسبوعي"
                    value={planAssessment}
                    onChange={(e) => setPlanAssessment(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl border border-slate-300 text-xs"
                  />
                </div>
              </div>

              <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setIsPlanModalOpen(false)}
                  className="px-4 py-2 text-xs text-slate-600 hover:bg-slate-100 rounded-xl font-bold"
                >
                  إلغاء
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 text-xs bg-emerald-600 hover:bg-emerald-700 text-white font-bold rounded-xl shadow-xs"
                >
                  {editingPlan ? 'حفظ التعديل' : 'إضافة الخطة الأسبوعية ✓'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ================= MODAL: ADD / EDIT TIMETABLE PERIOD ================= */}
      {isPeriodModalOpen && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl max-w-xl w-full p-6 shadow-2xl border border-slate-200 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between border-b border-slate-100 pb-4 mb-5">
              <div className="flex items-center gap-2">
                <div className="w-10 h-10 rounded-xl bg-indigo-100 text-indigo-700 flex items-center justify-center font-bold">
                  <Calendar className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="font-black text-lg text-slate-900">
                    {editingPeriodId ? 'تعديل بيانات الحصة في الجدول' : 'إضافة حصة جديدة إلى جدول الحصص'}
                  </h3>
                  <p className="text-xs text-slate-500">
                    مدارس النيل المصرية الدولية فرع المنيا - KG 1
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setIsPeriodModalOpen(false)}
                className="text-slate-400 hover:text-slate-600 p-1"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSavePeriod} className="space-y-4">
              {/* Notice of Live Sync */}
              <div className="bg-indigo-50 border border-indigo-200 rounded-xl p-3 text-xs text-indigo-900 flex items-center gap-2">
                <Sparkles className="w-4 h-4 text-indigo-600 shrink-0" />
                <span>
                  <strong>تأكيد النشر المباشر:</strong> بمجرد الحفظ، تنزل الحصة فوراً في واجهة الزائر وواجهة الطالب وتجهيزات الحقيبة المدرسية وطباعة الجدول.
                </span>
              </div>

              {/* Class target & Day */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    Class:
                  </label>
                  <select
                    value={periodClassTarget}
                    onChange={(e) => setPeriodClassTarget(e.target.value as SchoolClass | 'all')}
                    className="w-full px-3 py-2 rounded-xl border border-slate-300 text-xs font-bold"
                  >
                    <option value="KG1A">Class A</option>
                    <option value="KG1B">Class B</option>
                    <option value="KG1C">Class C</option>
                    <option value="KG1D">Class D</option>
                    <option value="KG1E">Class E</option>
                    <option value="all">★ All Classes (A, B, C, D, E)</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    اليوم الدراسي:
                  </label>
                  <select
                    value={periodDay}
                    onChange={(e) => setPeriodDay(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl border border-slate-300 text-xs font-bold"
                  >
                    <option value="الأحد">Sunday</option>
                    <option value="الإثنين">Monday</option>
                    <option value="الثلاثاء">Tuesday</option>
                    <option value="الأربعاء">Wednesday</option>
                    <option value="الخميس">Thursday</option>
                  </select>
                </div>
              </div>

              {/* Period Number and Subject */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    رقم الحصة:
                  </label>
                  <select
                    value={periodNumber}
                    onChange={(e) => {
                      const num = Number(e.target.value);
                      setPeriodNumber(num);
                      const matchingTime = PERIOD_TIMES.find((pt) => pt.periodNum === num);
                      if (matchingTime) {
                        setPeriodTime(matchingTime.time);
                      }
                    }}
                    className="w-full px-3 py-2 rounded-xl border border-slate-300 text-xs font-bold"
                  >
                    {[1, 2, 3, 4, 5, 6, 7, 8].map((num) => (
                      <option key={num} value={num}>
                        الحصة {num}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    المادة الدراسية:
                  </label>
                  <select
                    value={periodSubject}
                    onChange={(e) => setPeriodSubject(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl border border-slate-300 text-xs font-bold"
                  >
                    {SUBJECTS.map((s) => (
                      <option key={s.id} value={s.id}>
                        {s.nameAr} ({s.nameEn})
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              {/* Time slot */}
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  توقيت الحصة:
                </label>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                  <select
                    onChange={(e) => {
                      if (e.target.value) setPeriodTime(e.target.value);
                    }}
                    className="sm:col-span-1 px-3 py-2 rounded-xl border border-slate-300 text-xs bg-slate-50"
                  >
                    <option value="">اختر توقيت معتمد...</option>
                    {PERIOD_TIMES.map((pt) => (
                      <option key={pt.periodNum} value={pt.time}>
                        حصة {pt.periodNum}: {pt.time}
                      </option>
                    ))}
                  </select>
                  <input
                    type="text"
                    required
                    value={periodTime}
                    onChange={(e) => setPeriodTime(e.target.value)}
                    placeholder="مثال: 08:00 - 08:45"
                    className="sm:col-span-2 px-3 py-2 rounded-xl border border-slate-300 text-xs font-bold"
                  />
                </div>
              </div>

              {/* Teacher & Room */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    اسم المعلم / المعلمة (اختياري):
                  </label>
                  <input
                    type="text"
                    placeholder="اكتب اسمًا عند الحاجة"
                    value={periodTeacher}
                    onChange={(e) => setPeriodTeacher(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl border border-slate-300 text-xs"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    القاعة / المعمل (اختياري):
                  </label>
                  <input
                    type="text"
                    placeholder="مثال: معمل العلوم Science Lab أو Room 204"
                    value={periodRoom}
                    onChange={(e) => setPeriodRoom(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl border border-slate-300 text-xs"
                  />
                </div>
              </div>

              {/* Packing list preview for this subject */}
              {(() => {
                const kit = SUBJECT_PACKING_KIT[periodSubject] || {
                  book: 'كتاب المادة المعتمد',
                  notebook: 'كشكول المادة',
                  tools: 'الأدوات المدرسية والمقلمة'
                };
                return (
                  <div className="bg-slate-50 rounded-xl p-3 border border-slate-200 text-xs space-y-1">
                    <span className="font-bold text-slate-700 block text-[11px]">
                      مستلزمات الحقيبة المدرسية التلقائية لهذه المادة:
                    </span>
                    <div className="text-slate-600 text-[11px] grid grid-cols-1 sm:grid-cols-3 gap-1">
                      <div>📚 {kit.book}</div>
                      <div>📓 {kit.notebook}</div>
                      <div>✏️ {kit.tools}</div>
                    </div>
                  </div>
                );
              })()}

              <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setIsPeriodModalOpen(false)}
                  className="px-4 py-2 text-xs text-slate-600 hover:bg-slate-100 rounded-xl font-bold"
                >
                  إلغاء
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 text-xs bg-indigo-600 hover:bg-indigo-700 text-white font-black rounded-xl shadow-xs"
                >
                  {editingPeriodId ? 'حفظ تعديل الحصة ✓' : 'حفظ وإدراج الحصة في الجدول ✓'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
      {/* ================= MODAL: BULK TIMETABLE REPLACEMENT ================= */}
      {isReplaceTimetableModalOpen && (
        <div className="fixed inset-0 bg-slate-950/70 backdrop-blur-xs flex items-center justify-center z-50 p-4 animate-in fade-in duration-200">
          <div className="bg-white rounded-3xl max-w-xl w-full p-6 shadow-2xl border border-slate-200 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between pb-4 border-b border-slate-100 mb-4">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-2xl bg-gradient-to-tr from-emerald-600 to-indigo-600 text-white flex items-center justify-center font-bold shadow-md">
                  <FileUp className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="font-black text-lg text-slate-900">
                    استبدال الجدول بالكامل بملف واحد
                  </h3>
                  <p className="text-xs text-slate-500">
                    رفع ملف PDF أو صورة أو Word ليكون هو الجدول المعتمد للفصل
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => {
                  setIsReplaceTimetableModalOpen(false);
                  setReplaceTimetableFile(null);
                }}
                className="text-slate-400 hover:text-slate-600 p-1 rounded-lg"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleConfirmReplaceTimetable} className="space-y-4">
              {/* Target Class Selection */}
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1.5">
                  الفصل المستهدف بالاستبدال:
                </label>
                <div className="grid grid-cols-6 gap-1.5">
                  {(['KG1A', 'KG1B', 'KG1C', 'KG1D', 'KG1E', 'all'] as const).map((cls) => (
                    <button
                      key={cls}
                      type="button"
                      onClick={() => setReplaceClassTarget(cls as any)}
                      className={`py-2 px-1 rounded-xl text-xs font-black transition-all border ${
                        replaceClassTarget === cls
                          ? 'bg-indigo-600 text-white border-indigo-600 shadow-xs'
                          : 'bg-slate-50 text-slate-700 border-slate-200 hover:bg-slate-100'
                      }`}
                    >
                      {cls === 'all' ? 'All Classes' : `Class ${cls.slice(-1)}`}
                    </button>
                  ))}
                </div>
              </div>

              {/* File Upload Drop Area */}
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1.5">
                  اختر ملف الجدول (PDF أو صورة أو ملف Word): <span className="text-red-500">*</span>
                </label>
                <div className="border-2 border-dashed border-indigo-200 hover:border-indigo-400 bg-indigo-50/40 rounded-2xl p-6 text-center transition-colors">
                  <FileUp className="w-10 h-10 text-indigo-500 mx-auto mb-2" />
                  <p className="text-xs font-bold text-slate-800">
                    اضغط لاختيار الملف من جهازك (أو اسحبه وأفلته هنا)
                  </p>
                  <p className="text-[11px] text-slate-500 mt-1">
                    يدعم ملفات PDF، الصور عالية الدقة (PNG, JPG)، ومستندات Word (DOC, DOCX)
                  </p>
                  <input
                    type="file"
                    required
                    accept=".pdf,.png,.jpg,.jpeg,.webp,.doc,.docx"
                    onChange={handlePickTimetableFile}
                    className="w-full mt-3 text-xs text-slate-600 file:mr-2 file:py-1.5 file:px-4 file:rounded-xl file:border-0 file:text-xs file:font-bold file:bg-indigo-600 file:text-white hover:file:bg-indigo-700 cursor-pointer"
                  />
                </div>
              </div>

              {/* Selected File Details & Preview */}
              {replaceTimetableFile && (
                <div className="bg-emerald-50 border border-emerald-200 rounded-2xl p-4 space-y-2">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                      <span className="text-xs font-black text-emerald-950 truncate max-w-[280px]">
                        {replaceTimetableFile.name}
                      </span>
                    </div>
                    <span className="bg-emerald-200 text-emerald-900 text-[10px] font-bold px-2 py-0.5 rounded uppercase font-mono">
                      {replaceTimetableFile.type} • {replaceTimetableFile.size}
                    </span>
                  </div>

                  {replaceTimetableFile.type === 'image' && (
                    <div className="mt-2 rounded-xl overflow-hidden border border-emerald-200 max-h-48 bg-white flex items-center justify-center p-2">
                      <img
                        src={replaceTimetableFile.dataUrl}
                        alt="معاينة الجدول"
                        className="max-h-44 object-contain rounded-lg"
                      />
                    </div>
                  )}

                  {replaceTimetableFile.type === 'pdf' && (
                    <p className="text-[11px] text-emerald-800 font-medium">
                      ✓ تم تجهيز ملف الـ PDF للعرض المباشر والطباعة عند فتح الطلاب للجدول.
                    </p>
                  )}
                </div>
              )}

              <div className="bg-amber-50 border border-amber-200 rounded-xl p-3 text-amber-900 text-xs leading-relaxed">
                <strong>تنبيه:</strong> سيتم اعتماد هذا المستند فوراً كجدول رئيسي للفصل المختار، وسيتمكن الطلاب وأولياء الأمور من معاينته وطباعته مباشرة بضغطة زر.
              </div>

              <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => {
                    setIsReplaceTimetableModalOpen(false);
                    setReplaceTimetableFile(null);
                  }}
                  className="px-4 py-2.5 text-xs text-slate-600 hover:bg-slate-100 rounded-xl font-bold cursor-pointer"
                >
                  إلغاء
                </button>
                <button
                  type="submit"
                  className="px-6 py-2.5 text-xs bg-gradient-to-r from-emerald-600 to-indigo-600 hover:from-emerald-700 hover:to-indigo-700 text-white font-black rounded-xl shadow-md transition-all cursor-pointer"
                >
                  اعتماد واستبدال الجدول الآن ✓
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ================= MODAL: TIMETABLE DOCUMENT PREVIEW ================= */}
      {previewTimetableDoc && (
        <div className="fixed inset-0 bg-slate-950/80 backdrop-blur-sm flex items-center justify-center z-50 p-3 sm:p-6 animate-in fade-in duration-200">
          <div className="bg-white rounded-3xl max-w-4xl w-full h-[90vh] flex flex-col shadow-2xl border border-slate-200 overflow-hidden">
            {/* Header */}
            <div className="flex items-center justify-between px-5 py-3.5 bg-slate-900 text-white shrink-0">
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-xl bg-indigo-500/20 text-indigo-300 flex items-center justify-center font-bold">
                  <FileText className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="font-black text-sm sm:text-base flex items-center gap-2">
                    <span>مستند جدول حصص Class {previewTimetableDoc.classId}</span>
                    <span className="bg-indigo-500/30 text-indigo-200 text-[10px] px-2 py-0.5 rounded uppercase">
                      {previewTimetableDoc.fileType?.toUpperCase() || 'DOCUMENT'}
                    </span>
                  </h3>
                  <p className="text-[11px] text-slate-400">
                    {previewTimetableDoc.fileName} • {previewTimetableDoc.fileSize}
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => {
                    const printWin = window.open('', '_blank');
                    if (printWin && previewTimetableDoc.fileDataUrl) {
                      if (previewTimetableDoc.fileType === 'image') {
                        printWin.document.write(`<html><head><meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=5.0"><title>طباعة الجدول</title></head><body style="margin:0;display:flex;justify-content:center;align-items:center;"><img src="${previewTimetableDoc.fileDataUrl}" style="max-width:100%;" onload="window.print();window.close();" /></body></html>`);
                        printWin.document.close();
                      } else {
                        printWin.location.href = previewTimetableDoc.fileDataUrl;
                      }
                    }
                  }}
                  className="flex items-center gap-1.5 px-3 py-1.5 bg-white/10 hover:bg-white/20 text-white rounded-xl text-xs font-bold transition-colors cursor-pointer"
                  title="طباعة الجدول"
                >
                  <Printer className="w-3.5 h-3.5" />
                  <span className="hidden sm:inline">طباعة</span>
                </button>

                <button
                  type="button"
                  onClick={() => setPreviewTimetableDoc(null)}
                  className="p-1.5 text-slate-400 hover:text-white rounded-xl hover:bg-white/10 transition-colors cursor-pointer"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
            </div>

            {/* Content Area */}
            <div className="flex-1 bg-slate-100 p-4 overflow-auto flex items-center justify-center">
              {previewTimetableDoc.fileType === 'image' && previewTimetableDoc.fileDataUrl ? (
                <img
                  src={previewTimetableDoc.fileDataUrl}
                  alt={previewTimetableDoc.fileName || 'جدول الحصص'}
                  className="max-w-full max-h-full object-contain rounded-xl shadow-lg border border-slate-200"
                />
              ) : previewTimetableDoc.fileType === 'pdf' && previewTimetableDoc.fileDataUrl ? (
                <iframe
                  src={previewTimetableDoc.fileDataUrl}
                  title={previewTimetableDoc.fileName || 'جدول الحصص PDF'}
                  className="w-full h-full rounded-xl border border-slate-200 shadow-sm bg-white"
                />
              ) : (
                <div className="bg-white p-8 rounded-2xl border border-slate-200 text-center max-w-md shadow-sm">
                  <File className="w-12 h-12 text-indigo-500 mx-auto mb-3" />
                  <h4 className="font-bold text-slate-900 text-sm mb-1">{previewTimetableDoc.fileName}</h4>
                  <p className="text-xs text-slate-500 mb-4 font-mono">{previewTimetableDoc.fileSize}</p>
                  {previewTimetableDoc.fileDataUrl && (
                    <a
                      href={previewTimetableDoc.fileDataUrl}
                      download={previewTimetableDoc.fileName}
                      className="inline-flex items-center gap-1.5 px-4 py-2 bg-indigo-600 text-white text-xs font-bold rounded-xl shadow-xs"
                    >
                      <Download className="w-4 h-4" />
                      <span>تحميل المستند المعتمد</span>
                    </a>
                  )}
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* ================= MODAL: WEEKLY PLAN PREVIEW ================= */}
      {previewPlan && (
        <div className="fixed inset-0 bg-slate-950/80 backdrop-blur-sm flex items-center justify-center z-50 p-3 sm:p-6 animate-in fade-in duration-200">
          <div className="bg-white rounded-3xl max-w-4xl w-full h-[90vh] flex flex-col shadow-2xl border border-slate-200 overflow-hidden">
            {/* Header */}
            <div className="flex items-center justify-between px-5 py-3.5 bg-slate-900 text-white shrink-0">
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-xl bg-emerald-500/20 text-emerald-300 flex items-center justify-center font-bold">
                  <FileText className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="font-black text-sm sm:text-base flex items-center gap-2">
                    <span>Weekly Plan - {getSubjectInfo(previewPlan.subjectId).nameEn} ({previewPlan.unitOrTheme})</span>
                    <span className="bg-emerald-500/30 text-emerald-200 text-[10px] px-2 py-0.5 rounded uppercase">
                      {previewPlan.fileType?.toUpperCase() || 'DOCUMENT'}
                    </span>
                  </h3>
                  <p className="text-[11px] text-slate-400">
                    {previewPlan.fileName || `${getSubjectInfo(previewPlan.subjectId).nameEn}_WeeklyPlan.pdf`} • {previewPlan.fileSize || '1.5 MB'}
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => {
                    const printWin = window.open('', '_blank');
                    if (printWin) {
                      if (previewPlan.fileDataUrl && previewPlan.fileType === 'image') {
                        printWin.document.write(`<html><head><meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=5.0"><title>طباعة الخطة الأسبوعية</title></head><body style="margin:0;display:flex;justify-content:center;align-items:center;"><img src="${previewPlan.fileDataUrl}" style="max-width:100%;" onload="window.print();window.close();" /></body></html>`);
                        printWin.document.close();
                      } else if (previewPlan.fileDataUrl) {
                        printWin.location.href = previewPlan.fileDataUrl;
                      } else {
                        printWin.document.write(generateWeeklyPlanHtml(previewPlan));
                        printWin.document.close();
                        printWin.print();
                      }
                    }
                  }}
                  className="flex items-center gap-1.5 px-3 py-1.5 bg-white/10 hover:bg-white/20 text-white rounded-xl text-xs font-bold transition-colors cursor-pointer"
                  title="طباعة الخطة"
                >
                  <Printer className="w-3.5 h-3.5" />
                  <span className="hidden sm:inline">طباعة</span>
                </button>

                <button
                  type="button"
                  onClick={() => setPreviewPlan(null)}
                  className="p-1.5 text-slate-400 hover:text-white rounded-xl hover:bg-white/10 transition-colors cursor-pointer"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
            </div>

            {/* Content Area */}
            <div className="flex-1 bg-slate-100 p-4 overflow-auto flex items-center justify-center">
              {previewPlan.fileDataUrl && previewPlan.fileType === 'image' ? (
                <img
                  src={previewPlan.fileDataUrl}
                  alt={previewPlan.unitOrTheme}
                  className="max-w-full max-h-full object-contain rounded-xl shadow-lg border border-slate-200"
                />
              ) : previewPlan.fileDataUrl && previewPlan.fileType === 'pdf' ? (
                <iframe
                  src={previewPlan.fileDataUrl}
                  title={previewPlan.unitOrTheme}
                  className="w-full h-full rounded-xl border border-slate-200 shadow-sm bg-white"
                />
              ) : (
                <iframe
                  srcDoc={generateWeeklyPlanHtml(previewPlan)}
                  title={previewPlan.unitOrTheme}
                  className="w-full h-full rounded-xl border border-slate-200 shadow-sm bg-white"
                />
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
