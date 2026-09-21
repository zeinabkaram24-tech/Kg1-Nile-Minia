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
  Sparkles,
  BookOpen,
  ListChecks,
  Clock,
  Loader2,
  ChevronDown,
  ChevronUp,
  Edit2,
  Plus,
  Link2,
  ExternalLink,
  Globe,
  Database,
} from 'lucide-react';
import { ClassId, MaterialItem, ClassworkEntry, HomeworkEntry } from '../types';
import { TomorrowSpecialNote } from '../data/defaultWeeklyPlan';
import { SupabaseConfigModal } from './SupabaseConfigModal';
import {
  getAllMaterials,
  saveMaterial,
  deleteMaterial,
  clearAllMaterials,
  subscribeToMaterials,
  formatBytes,
  openPdfItem,
  printPdfItem,
  downloadPdfItem,
} from '../utils/materialsStorage';
import {
  uploadPdfToSupabaseStorage,
  bulkInsertClasswork,
  bulkInsertHomework,
  getLocalCustomClasswork,
  getLocalCustomHomework,
  upsertClasswork,
  upsertHomework,
  deleteClasswork,
  deleteHomework,
} from '../lib/supabase';
import { saveTomorrowNotes, saveDeletedTomorrowNoteId, getSemanticKey, notifyTomorrowNotesListeners } from '../utils/tomorrowNotesStorage';
import { INITIAL_CLASSWORK, INITIAL_HOMEWORK, SPECIAL_TEACHER_NOTES } from '../data/defaultWeeklyPlan';
import { WEEK2_CLASSWORK, ALL_LINK_AND_WEEK2_HOMEWORK, WEEK2_SPECIAL_NOTES } from '../data/week2Plan';
import { fileToBase64, extractTextFromPdf } from '../utils/pdfExtractor';
import { fallbackClientParser, parseWeeklyPlanWithAI } from '../services/aiClassifier';

interface AdminDashboardModalProps {
  isOpen: boolean;
  onClose: () => void;
  onPlanUpdated?: (block?: number, week?: number) => void;
  isAdminEditMode: boolean;
  onToggleAdminEditMode: (enabled: boolean) => void;
}

export const AdminDashboardModal: React.FC<AdminDashboardModalProps> = ({
  isOpen,
  onClose,
  onPlanUpdated,
  isAdminEditMode,
  onToggleAdminEditMode,
}) => {
  const [materials, setMaterials] = useState<MaterialItem[]>([]);
  const [isUploading, setIsUploading] = useState(false);
  const [showUploadForm, setShowUploadForm] = useState(false);

  // Materials Upload Form State
  const [materialUploadMode, setMaterialUploadMode] = useState<'pdf' | 'link'>('pdf');
  const [targetBlock, setTargetBlock] = useState<number>(1);
  const [targetSection, setTargetSection] = useState<string>('Main sheet');
  const [targetClass, setTargetClass] = useState<ClassId | 'ALL'>('ALL');
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [materialLinkTitle, setMaterialLinkTitle] = useState<string>('');
  const [materialLinkUrl, setMaterialLinkUrl] = useState<string>('');

  // Weekly Plan Upload State (Set to true by default so all controls are immediately visible!)
  const [showPlanUploadForm, setShowPlanUploadForm] = useState(true);
  const [planBlock, setPlanBlock] = useState<number>(1);
  const [planWeek, setPlanWeek] = useState<number>(2);
  const [planClass, setPlanClass] = useState<ClassId | 'ALL'>('ALL');
  const [planFile, setPlanFile] = useState<File | null>(null);
  const [planTextInput, setPlanTextInput] = useState<string>('');
  const [planInputMode, setPlanInputMode] = useState<'pdf' | 'text'>('pdf');
  const [importMode, setImportMode] = useState<'merge' | 'replace'>('replace');
  const [isParsingPlan, setIsParsingPlan] = useState(false);
  const [parsingStep, setParsingStep] = useState<string>('');
  const [parsedResult, setParsedResult] = useState<{
    classwork: ClassworkEntry[];
    homework: HomeworkEntry[];
    tomorrowNotes: TomorrowSpecialNote[];
  } | null>(null);
  const [isPublishingPlan, setIsPublishingPlan] = useState(false);
  const [previewTab, setPreviewTab] = useState<'classwork' | 'homework' | 'tomorrow'>('classwork');
  const [isSupabaseModalOpen, setIsSupabaseModalOpen] = useState(false);

  // Editing state for parsed weekly plan before publishing
  const [editingItemType, setEditingItemType] = useState<'classwork' | 'homework' | 'tomorrow' | null>(null);
  const [editingItemIndex, setEditingItemIndex] = useState<number | null>(null);
  const [isAddingNewItem, setIsAddingNewItem] = useState(false);

  // Edit Form Fields
  const [formTitle, setFormTitle] = useState('');
  const [formDetails, setFormDetails] = useState('');
  const [formPages, setFormPages] = useState('');
  const [formSubject, setFormSubject] = useState<string>('English');
  const [formClassId, setFormClassId] = useState<ClassId | 'ALL'>('KG1A');
  const [formDay, setFormDay] = useState<string>('Sunday');
  const [formDueDay, setFormDueDay] = useState<string>('Monday');
  const [formPeriod, setFormPeriod] = useState<number>(1);
  const [formPriority, setFormPriority] = useState<'normal' | 'urgent'>('normal');
  const [formLinkUrl, setFormLinkUrl] = useState('');
  const [formLinkTitle, setFormLinkTitle] = useState('');
  const [formArabicNote, setFormArabicNote] = useState('');
  const [formBagItem, setFormBagItem] = useState('');
  const [formIsQuiz, setFormIsQuiz] = useState(false);
  const [formPdfUrl, setFormPdfUrl] = useState('');
  const [hwSelectedFile, setHwSelectedFile] = useState<File | null>(null);
  const [isUploadingHwPdf, setIsUploadingHwPdf] = useState(false);

  const openEditClasswork = (cw: ClassworkEntry, index: number) => {
    setEditingItemType('classwork');
    setEditingItemIndex(index);
    setIsAddingNewItem(false);
    setFormTitle(cw.title || '');
    setFormDetails(cw.details || '');
    setFormPages(cw.pages || '');
    setFormSubject(cw.subject || 'English');
    setFormClassId(cw.classId || 'KG1A');
    setFormDay(cw.day || 'Sunday');
    setFormPeriod(cw.period || 1);
    setFormLinkUrl(cw.linkUrl || '');
    setFormLinkTitle(cw.linkTitle || '');
    setFormPdfUrl(cw.pdfUrl || '');
    setHwSelectedFile(null);
  };

  const openAddClasswork = () => {
    setEditingItemType('classwork');
    setEditingItemIndex(null);
    setIsAddingNewItem(true);
    setFormTitle('');
    setFormDetails('');
    setFormPages('');
    setFormSubject('English');
    setFormClassId(planClass === 'ALL' ? 'KG1A' : planClass);
    setFormDay('Sunday');
    setFormPeriod(1);
    setFormLinkUrl('');
    setFormLinkTitle('');
    setFormPdfUrl('');
    setHwSelectedFile(null);
  };

  const openEditHomework = (hw: HomeworkEntry, index: number) => {
    setEditingItemType('homework');
    setEditingItemIndex(index);
    setIsAddingNewItem(false);
    setFormTitle(hw.task || '');
    setFormDetails(hw.details || '');
    setFormPages(hw.pages || '');
    setFormSubject(hw.subject || 'English');
    setFormClassId(hw.classId || 'KG1A');
    setFormDay(hw.assignedDay || 'Sunday');
    setFormDueDay(hw.dueDay || 'Monday');
    setFormPriority(hw.priority || 'normal');
    setFormLinkUrl(hw.linkUrl || '');
    setFormPdfUrl(hw.pdfUrl || '');
    setHwSelectedFile(null);
  };

  const openAddHomework = () => {
    setEditingItemType('homework');
    setEditingItemIndex(null);
    setIsAddingNewItem(true);
    setFormTitle('');
    setFormDetails('');
    setFormPages('');
    setFormSubject('English');
    setFormClassId(planClass === 'ALL' ? 'KG1A' : planClass);
    setFormDay('Sunday');
    setFormDueDay('Monday');
    setFormPriority('normal');
    setFormLinkUrl('');
    setFormPdfUrl('');
    setHwSelectedFile(null);
  };

  const openEditTomorrowNote = (note: TomorrowSpecialNote, index: number) => {
    setEditingItemType('tomorrow');
    setEditingItemIndex(index);
    setIsAddingNewItem(false);
    setFormTitle(note.note || '');
    setFormArabicNote(note.arabicNote || note.note || '');
    setFormSubject(note.subject || 'English');
    setFormClassId(note.classId || 'KG1A');
    setFormDay(note.targetDay || 'Sunday');
    setFormBagItem(note.bagItem || '');
    setFormIsQuiz(Boolean(note.isQuiz || note.categoryType === 'quiz'));
    setFormLinkUrl(note.linkUrl || '');
    setFormLinkTitle(note.linkTitle || '');
    setFormPdfUrl(note.pdfUrl || '');
    setHwSelectedFile(null);
  };

  const openAddTomorrowNote = () => {
    setEditingItemType('tomorrow');
    setEditingItemIndex(null);
    setIsAddingNewItem(true);
    setFormTitle('');
    setFormArabicNote('');
    setFormSubject('English');
    setFormClassId(planClass === 'ALL' ? 'KG1A' : planClass);
    setFormDay('Sunday');
    setFormBagItem('');
    setFormIsQuiz(false);
    setFormLinkUrl('');
    setFormLinkTitle('');
    setFormPdfUrl('');
    setHwSelectedFile(null);
  };

  const handleDeleteItem = async (type: 'classwork' | 'homework' | 'tomorrow', index: number) => {
    if (!parsedResult) return;
    if (type === 'classwork') {
      const item = parsedResult.classwork[index];
      if (item?.id) {
        await deleteClasswork(item.id);
        await fetch('/api/planner-data/delete', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ id: item.id, type: 'classwork' }),
        }).catch(() => {});
      }
      setParsedResult({
        ...parsedResult,
        classwork: parsedResult.classwork.filter((_, i) => i !== index),
      });
      if (onPlanUpdated) await onPlanUpdated(planBlock, planWeek);
    } else if (type === 'homework') {
      const item = parsedResult.homework[index];
      if (item?.id) {
        await deleteHomework(item.id);
        await fetch('/api/planner-data/delete', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ id: item.id, type: 'homework' }),
        }).catch(() => {});
      }
      setParsedResult({
        ...parsedResult,
        homework: parsedResult.homework.filter((_, i) => i !== index),
      });
      if (onPlanUpdated) await onPlanUpdated(planBlock, planWeek);
    } else if (type === 'tomorrow') {
      const item = parsedResult.tomorrowNotes[index];
      if (item) {
        const itemIds = [
          item.id,
          ...(item.linkedIds || []),
          getSemanticKey(item),
        ].filter(Boolean) as string[];

        for (const idToDelete of itemIds) {
          await saveDeletedTomorrowNoteId(idToDelete);
        }

        await fetch('/api/planner-data/delete', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ ids: itemIds, type: 'tomorrowNotes' }),
        }).catch(() => {});
      }
      setParsedResult({
        ...parsedResult,
        tomorrowNotes: parsedResult.tomorrowNotes.filter((_, i) => i !== index),
      });
      notifyTomorrowNotesListeners();
      if (onPlanUpdated) await onPlanUpdated(planBlock, planWeek);
    }
  };

  const handleSaveModalItem = async () => {
    if (!parsedResult || !editingItemType) return;

    let finalPdfUrl = formPdfUrl;

    if (hwSelectedFile) {
      try {
        setIsUploadingHwPdf(true);
        const cloudUrl = await uploadPdfToSupabaseStorage(hwSelectedFile, hwSelectedFile.name);
        if (cloudUrl) {
          finalPdfUrl = cloudUrl;
        } else {
          const readerPromise = new Promise<string>((resolve) => {
            const r = new FileReader();
            r.onload = () => resolve(r.result as string);
            r.readAsDataURL(hwSelectedFile);
          });
          finalPdfUrl = await readerPromise;
        }
      } catch (uploadErr) {
        console.error('PDF upload error:', uploadErr);
        const readerPromise = new Promise<string>((resolve) => {
          const r = new FileReader();
          r.onload = () => resolve(r.result as string);
          r.readAsDataURL(hwSelectedFile);
        });
        finalPdfUrl = await readerPromise;
      } finally {
        setIsUploadingHwPdf(false);
      }
    }

    if (editingItemType === 'classwork') {
      const entry: ClassworkEntry = {
        id: isAddingNewItem || editingItemIndex === null
          ? `cw-manual-${Date.now()}`
          : parsedResult.classwork[editingItemIndex]?.id || `cw-manual-${Date.now()}`,
        classId: formClassId as any,
        day: formDay as any,
        period: Number(formPeriod) || 1,
        subject: formSubject as any,
        title: formTitle.trim() || `${formSubject} Lesson`,
        details: formDetails.trim() || undefined,
        pages: formPages.trim() || undefined,
        completed: false,
        block: planBlock,
        week: planWeek,
        linkUrl: formLinkUrl.trim() || undefined,
        linkTitle: formLinkTitle.trim() || (formLinkUrl.trim() ? 'رابط الدرس 🔗' : undefined),
        pdfUrl: finalPdfUrl.trim() || undefined,
      };

      // Persist immediately to Supabase and local storage
      await upsertClasswork(entry);

      if (isAddingNewItem) {
        setParsedResult({
          ...parsedResult,
          classwork: [entry, ...parsedResult.classwork],
        });
      } else if (editingItemIndex !== null) {
        setParsedResult({
          ...parsedResult,
          classwork: parsedResult.classwork.map((c, i) => (i === editingItemIndex ? entry : c)),
        });
      }
      if (onPlanUpdated) await onPlanUpdated(planBlock, planWeek);
    } else if (editingItemType === 'homework') {
      const entry: HomeworkEntry = {
        id: isAddingNewItem || editingItemIndex === null
          ? `hw-manual-${Date.now()}`
          : parsedResult.homework[editingItemIndex]?.id || `hw-manual-${Date.now()}`,
        classId: formClassId as any,
        assignedDay: formDay as any,
        dueDay: formDueDay as any,
        subject: formSubject as any,
        task: formTitle.trim() || 'Homework task',
        details: formDetails.trim() || undefined,
        pages: formPages.trim() || undefined,
        completed: false,
        priority: formPriority,
        block: planBlock,
        week: planWeek,
        linkUrl: formLinkUrl.trim() || undefined,
        isLinkTask: Boolean(formLinkUrl.trim()),
        pdfUrl: finalPdfUrl.trim() || undefined,
      };

      // Persist immediately to Supabase and local storage
      await upsertHomework(entry);

      if (isAddingNewItem) {
        setParsedResult({
          ...parsedResult,
          homework: [entry, ...parsedResult.homework],
        });
      } else if (editingItemIndex !== null) {
        setParsedResult({
          ...parsedResult,
          homework: parsedResult.homework.map((h, i) => (i === editingItemIndex ? entry : h)),
        });
      }
      if (onPlanUpdated) await onPlanUpdated(planBlock, planWeek);
    } else if (editingItemType === 'tomorrow') {
      const entry: TomorrowSpecialNote = {
        id: isAddingNewItem || editingItemIndex === null
          ? `note-manual-${Date.now()}`
          : parsedResult.tomorrowNotes[editingItemIndex]?.id || `note-manual-${Date.now()}`,
        classId: formClassId as any,
        targetDay: formDay as any,
        subject: formSubject as any,
        note: formTitle.trim() || formArabicNote.trim() || 'School Note',
        arabicNote: formArabicNote.trim() || formTitle.trim() || 'ملاحظة مدرسية',
        bagItem: formBagItem.trim() || undefined,
        isQuiz: formIsQuiz,
        categoryType: formIsQuiz ? 'quiz' : 'note',
        isCustom: true,
        block: planBlock,
        week: planWeek,
        linkUrl: formLinkUrl.trim() || undefined,
        linkTitle: formLinkTitle.trim() || (formLinkUrl.trim() ? 'رابط مرفق 🔗' : undefined),
        pdfUrl: finalPdfUrl.trim() || undefined,
      };

      // Persist immediately to Supabase and local storage
      await saveTomorrowNotes(planBlock, planWeek, [entry], 'merge');
      notifyTomorrowNotesListeners();

      if (isAddingNewItem) {
        setParsedResult({
          ...parsedResult,
          tomorrowNotes: [entry, ...parsedResult.tomorrowNotes],
        });
      } else if (editingItemIndex !== null) {
        setParsedResult({
          ...parsedResult,
          tomorrowNotes: parsedResult.tomorrowNotes.map((n, i) => (i === editingItemIndex ? entry : n)),
        });
      }
      if (onPlanUpdated) await onPlanUpdated(planBlock, planWeek);
    }

    setSuccessMessage('تم الحفظ والتثبيت بنجاح ✅');
    setTimeout(() => setSuccessMessage(null), 3000);

    setEditingItemType(null);
    setEditingItemIndex(null);
    setIsAddingNewItem(false);
  };

  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  const fileInputRef = useRef<HTMLInputElement>(null);
  const planFileInputRef = useRef<HTMLInputElement>(null);

  // Load materials
  const refreshMaterials = async () => {
    const list = await getAllMaterials();
    // Sort latest first
    list.sort(
      (a, b) => new Date(b.uploadedAt).getTime() - new Date(a.uploadedAt).getTime()
    );
    setMaterials(list);
  };

  useEffect(() => {
    if (isOpen) {
      refreshMaterials();
    }
  }, [isOpen]);

  // Load active published plan data automatically on open or whenever block/week/class selectors change
  useEffect(() => {
    if (isOpen) {
      const loadActiveDataQuietly = async () => {
        const b = Number(planBlock);
        const w = Number(planWeek);

        const filterAndSet = (classwork: any[], homework: any[], tomorrowNotes: any[]) => {
          let fc = (classwork || []).filter(
            (c: any) => Number(c.block || 1) === b && Number(c.week || 1) === w
          );
          let fh = (homework || []).filter(
            (h: any) => Number(h.block || 1) === b && Number(h.week || 1) === w
          );
          let ft = (tomorrowNotes || []).filter(
            (n: any) => Number(n.block || 1) === b && Number(n.week || 1) === w
          );

          if (planClass !== 'ALL') {
            fc = fc.filter((c: any) => c.classId === planClass);
            fh = fh.filter((h: any) => h.classId === planClass);
            ft = ft.filter((n: any) => n.classId === planClass);
          }

          setParsedResult({
            classwork: fc,
            homework: fh,
            tomorrowNotes: ft,
          });
        };

        try {
          const controller = new AbortController();
          const timeoutId = setTimeout(() => controller.abort(), 2500);
          const res = await fetch('/api/planner-data', { signal: controller.signal });
          clearTimeout(timeoutId);

          if (res.ok) {
            const data = await res.json();
            filterAndSet(data.classwork || [], data.homework || [], data.tomorrowNotes || []);
            return;
          }
        } catch {
          // Graceful fallback to client-cached and default baseline plan data if server is unreachable or slow
        }

        // Fallback: Assemble from local custom and default baseline data
        try {
          const localCw = getLocalCustomClasswork();
          const localHw = getLocalCustomHomework();
          const defaultCw = w === 2 ? WEEK2_CLASSWORK : INITIAL_CLASSWORK;
          const defaultHw = w === 2 ? ALL_LINK_AND_WEEK2_HOMEWORK : INITIAL_HOMEWORK;
          const defaultTn = w === 2 ? WEEK2_SPECIAL_NOTES : SPECIAL_TEACHER_NOTES;

          const cwMap = new Map<string, any>();
          defaultCw.forEach((c) => cwMap.set(c.id, c));
          localCw.forEach((c) => cwMap.set(c.id, c));

          const hwMap = new Map<string, any>();
          defaultHw.forEach((h) => hwMap.set(h.id, h));
          localHw.forEach((h) => hwMap.set(h.id, h));

          filterAndSet(Array.from(cwMap.values()), Array.from(hwMap.values()), defaultTn);
        } catch {
          // Keep whatever parsedResult is or clean fallback
        }
      };
      loadActiveDataQuietly();
    }
  }, [isOpen, planBlock, planWeek, planClass]);

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

  // Submit Upload (PDF or External Link)
  const handleConfirmUpload = async () => {
    if (materialUploadMode === 'pdf') {
      if (!selectedFile) {
        setErrorMessage('يرجى اختيار ملف PDF أولاً.');
        return;
      }

      try {
        setIsUploading(true);
        setErrorMessage(null);

        // 1. Try uploading to Supabase Storage bucket first
        let cloudUrl: string | null = null;
        try {
          cloudUrl = await uploadPdfToSupabaseStorage(selectedFile, selectedFile.name);
        } catch (uploadErr) {
          console.warn('Direct bucket upload failed, using local/DB fallback:', uploadErr);
        }

        // 2. Read file binary as Base64 Data URL for local offline cache and fallback
        const reader = new FileReader();
        reader.onload = async () => {
          try {
            const fileData = reader.result as string;

            const newItem: MaterialItem = {
              id: 'mat_' + Date.now() + '_' + Math.random().toString(36).substring(2, 7),
              fileName: selectedFile.name,
              fileSize: selectedFile.size,
              fileData: fileData,
              storageUrl: cloudUrl || undefined,
              type: 'pdf',
              block: targetBlock,
              section: targetSection,
              classId: targetClass,
              uploadedAt: new Date().toISOString(),
            };

            await saveMaterial(newItem);
            await refreshMaterials();

            setSuccessMessage(
              cloudUrl
                ? `تم رفع الملف سحابياً بنجاح وتوفيره لجميع الأجهزة واللابتوب!`
                : `تم حفظ الملف بنجاح في Block ${targetBlock} — ${targetSection}!`
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
    } else {
      // Link Upload Mode
      if (!materialLinkUrl.trim()) {
        setErrorMessage('يرجى إدخال رابط الويب (URL).');
        return;
      }
      if (!materialLinkTitle.trim()) {
        setErrorMessage('يرجى إدخال اسم أو عنوان الرابط / المادة.');
        return;
      }

      try {
        setIsUploading(true);
        setErrorMessage(null);

        let cleanUrl = materialLinkUrl.trim();
        if (!/^https?:\/\//i.test(cleanUrl)) {
          cleanUrl = 'https://' + cleanUrl;
        }

        const newItem: MaterialItem = {
          id: 'mat_link_' + Date.now() + '_' + Math.random().toString(36).substring(2, 7),
          fileName: materialLinkTitle.trim(),
          fileSize: 0,
          storageUrl: cleanUrl,
          linkUrl: cleanUrl,
          type: 'link',
          block: targetBlock,
          section: targetSection,
          classId: targetClass,
          uploadedAt: new Date().toISOString(),
        };

        await saveMaterial(newItem);
        await refreshMaterials();

        setSuccessMessage(
          `✨ تمت إضافة وتوزيع الرابط بنجاح في Block ${targetBlock} (${targetSection})!`
        );
        setMaterialLinkTitle('');
        setMaterialLinkUrl('');
        setIsUploading(false);

        setTimeout(() => {
          setSuccessMessage(null);
        }, 4000);
      } catch (err: any) {
        console.error(err);
        setErrorMessage('حدث خطأ أثناء حفظ الرابط. يرجى المحاولة مرة أخرى.');
        setIsUploading(false);
      }
    }
  };

  // Handle Delete with Confirmation
  const handleDelete = async (item: MaterialItem) => {
    const itemTypeName = item.type === 'link' || item.linkUrl ? 'الرابط' : 'الملف';
    const confirmed = window.confirm(
      `هل أنت متأكد من مسح ${itemTypeName} "${item.fileName}" نهائياً من Block ${item.block} (${item.section})؟`
    );
    if (!confirmed) return;

    try {
      await deleteMaterial(item.id, item.storageUrl);
      await refreshMaterials();
      setSuccessMessage(`تم مسح الملف "${item.fileName}" بنجاح.`);
      setTimeout(() => setSuccessMessage(null), 3000);
    } catch (err) {
      console.error(err);
      setErrorMessage('فشل مسح الملف.');
    }
  };

  // Helper to open PDF directly in new tab
  const handlePreview = (item: MaterialItem) => {
    openPdfItem(item);
  };

  // Print helper
  const handlePrint = (item: MaterialItem) => {
    printPdfItem(item);
  };

  // Download helper
  const handleDownload = (item: MaterialItem) => {
    downloadPdfItem(item);
  };

  // Plan File Change Handler
  const handlePlanFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setErrorMessage(null);
    setSuccessMessage(null);
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.type !== 'application/pdf' && !file.name.toLowerCase().endsWith('.pdf')) {
      setErrorMessage('عفواً، ملف الخطة الأسبوعية يجب أن يكون بصيغة PDF.');
      setPlanFile(null);
      if (planFileInputRef.current) planFileInputRef.current.value = '';
      return;
    }

    setPlanFile(file);
    setParsedResult(null);
  };

  // Fetch currently active published data for editing / manual addition from scratch
  const handleLoadActiveData = async () => {
    try {
      setIsParsingPlan(true);
      setParsingStep('جاري جلب البيانات النشطة حالياً من السيرفر لـ Block ' + planBlock + ' (Week ' + planWeek + ')...');
      
      const b = Number(planBlock);
      const w = Number(planWeek);

      let fetchedData: any = null;
      try {
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 3500);
        const res = await fetch('/api/planner-data', { signal: controller.signal });
        clearTimeout(timeoutId);
        if (res.ok) {
          fetchedData = await res.json();
        }
      } catch {
        // Fallback below
      }

      if (fetchedData) {
        const filteredClasswork = (fetchedData.classwork || []).filter(
          (c: any) => Number(c.block || 1) === b && Number(c.week || 1) === w
        );
        const filteredHomework = (fetchedData.homework || []).filter(
          (h: any) => Number(h.block || 1) === b && Number(h.week || 1) === w
        );
        const filteredTomorrow = (fetchedData.tomorrowNotes || []).filter(
          (n: any) => Number(n.block || 1) === b && Number(n.week || 1) === w
        );

        setParsedResult({
          classwork: filteredClasswork,
          homework: filteredHomework,
          tomorrowNotes: filteredTomorrow,
        });
        
        setSuccessMessage('✨ تم تحميل البيانات النشطة بنجاح! يمكنك الآن تعديل أي عنصر، أو إضافة حصص/واجبات/تنبيهات يدوية بالكامل.');
        setTimeout(() => setSuccessMessage(null), 5000);
      } else {
        // Assemble from local storage and default baseline plan
        const localCw = getLocalCustomClasswork();
        const localHw = getLocalCustomHomework();
        const defaultCw = w === 2 ? WEEK2_CLASSWORK : INITIAL_CLASSWORK;
        const defaultHw = w === 2 ? ALL_LINK_AND_WEEK2_HOMEWORK : INITIAL_HOMEWORK;
        const defaultTn = w === 2 ? WEEK2_SPECIAL_NOTES : SPECIAL_TEACHER_NOTES;

        const cwMap = new Map<string, any>();
        defaultCw.forEach((c) => cwMap.set(c.id, c));
        localCw.forEach((c) => cwMap.set(c.id, c));

        const hwMap = new Map<string, any>();
        defaultHw.forEach((h) => hwMap.set(h.id, h));
        localHw.forEach((h) => hwMap.set(h.id, h));

        const fc = Array.from(cwMap.values()).filter(
          (c: any) => Number(c.block || 1) === b && Number(c.week || 1) === w
        );
        const fh = Array.from(hwMap.values()).filter(
          (h: any) => Number(h.block || 1) === b && Number(h.week || 1) === w
        );
        const ft = (defaultTn || []).filter(
          (n: any) => Number(n.block || 1) === b && Number(n.week || 1) === w
        );

        setParsedResult({
          classwork: fc,
          homework: fh,
          tomorrowNotes: ft,
        });
        setSuccessMessage('✨ تم تحميل الخطة النشطة من الذاكرة المحلية والافتراضية بنجاح!');
        setTimeout(() => setSuccessMessage(null), 5000);
      }
    } catch {
      // Fallback: initialize clean empty lists for adding from scratch
      setParsedResult({
        classwork: [],
        homework: [],
        tomorrowNotes: [],
      });
      setSuccessMessage('✨ تم تهيئة لوحة الإضافة اليدوية. يمكنك الآن البدء بإضافة الحصص والواجبات والتنبيهات بالكامل من الصفر!');
      setTimeout(() => setSuccessMessage(null), 5000);
    } finally {
      setIsParsingPlan(false);
    }
  };

  // AI Parse Weekly Plan Handler
  const handleParseWeeklyPlan = async () => {
    if (planInputMode === 'pdf' && !planFile) {
      setErrorMessage('يرجى اختيار ملف PDF الخاص بالخطة الأسبوعية أولاً.');
      return;
    }
    if (planInputMode === 'text' && !planTextInput.trim()) {
      setErrorMessage('يرجى لصق نص أو جدول الخطة الأسبوعية أولاً.');
      return;
    }

    try {
      setIsParsingPlan(true);
      setErrorMessage(null);
      setSuccessMessage(null);

      let availableText = planTextInput;

      if (planInputMode === 'pdf' && planFile) {
        setParsingStep('جاري استخراج النصوص والجداول من ملف الـ PDF...');
        const extractedText = await extractTextFromPdf(planFile);
        availableText = extractedText;
      }

      setParsingStep('الذكاء الاصطناعي يحلل الجداول، يوزع Classwork و Homework، وينقل Quiz والاختبارات والملاحظات إلى Tomorrow...');
      const data = await parseWeeklyPlanWithAI(
        availableText,
        planClass,
        planBlock,
        planWeek,
        planInputMode === 'pdf' ? (planFile || undefined) : undefined
      );

      const cw = data.classwork || [];
      const hw = data.homework || [];
      const notes = data.tomorrowNotes || [];

      setParsedResult({
        classwork: cw,
        homework: hw,
        tomorrowNotes: notes,
      });

      setSuccessMessage(
        `✨ تم تفكيك وتحليل الخطة بنجاح! تم استخراج ${cw.length} حصة صفية (Classwork)، ${hw.length} واجب منزلي (Homework)، و ${notes.length} تنبيه واختبار وملاحظة (Tomorrow).`
      );
    } catch (err: any) {
      console.error('Error parsing weekly plan:', err);

      // Robust Client Fallback: If network or server request failed, extract locally from available text
      let fallbackText = (planInputMode === 'pdf' ? (await extractTextFromPdf(planFile!).catch(() => '')) : planTextInput) || '';
      if (fallbackText.trim().length > 0) {
        try {
          console.log('Activating client-side fallback parser...');
          const localParsed = fallbackClientParser(fallbackText, planClass, planBlock, planWeek);
          if (localParsed.classwork.length > 0 || localParsed.homework.length > 0 || localParsed.tomorrowNotes.length > 0) {
            setParsedResult(localParsed);
            setSuccessMessage(
              `✨ تم تفكيك وتحليل الخطة بنجاح (المعالج السريع): تم استخراج ${localParsed.classwork.length} حصة صفية، ${localParsed.homework.length} واجب، و ${localParsed.tomorrowNotes.length} تنبيه واختبار.`
            );
            return;
          }
        } catch (localErr) {
          console.warn('Local parser fallback also failed:', localErr);
        }
      }

      setErrorMessage(`تعذر تحليل الخطة الأسبوعية: ${err.message || 'حدث خطأ أثناء المعالجة'}`);
    } finally {
      setIsParsingPlan(false);
      setParsingStep('');
    }
  };

  // Publish Parsed Plan to Supabase & Storage
  const handlePublishPlan = async () => {
    if (!parsedResult) return;

    try {
      setIsPublishingPlan(true);
      setErrorMessage(null);

      // 1. Bulk insert classwork
      if (parsedResult.classwork.length > 0) {
        await bulkInsertClasswork(parsedResult.classwork, importMode);
      }

      // 2. Bulk insert homework
      if (parsedResult.homework.length > 0) {
        await bulkInsertHomework(parsedResult.homework, importMode);
      }

      // 3. Save tomorrow notes
      if (parsedResult.tomorrowNotes.length > 0) {
        await saveTomorrowNotes(planBlock, planWeek, parsedResult.tomorrowNotes, importMode);
      }

      // 4. Centralized Server Persistence for cross-device sync (Mobile, Laptop, Desktop)
      try {
        await fetch('/api/planner-data', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            classwork: parsedResult.classwork,
            homework: parsedResult.homework,
            tomorrowNotes: parsedResult.tomorrowNotes,
            mode: importMode,
          }),
        });
      } catch (serverSyncErr) {
        console.warn('Failed to sync plan data to server:', serverSyncErr);
      }

      setSuccessMessage(
        importMode === 'replace'
          ? `🎉 تم بنجاح استبدال الخطة القديمة ونشر الخطة الأسبوعية الجديدة (Block ${planBlock} — Week ${planWeek}) وتحديث التطبيق لجميع الطلاب والأجهزة!`
          : `🎉 تم بنجاح دمج الخطة الأسبوعية (Block ${planBlock} — Week ${planWeek}) في قاعدة البيانات وتحديث التطبيق فوراً لجميع الطلاب والأجهزة!`
      );
      setParsedResult(null);
      setPlanFile(null);
      if (planFileInputRef.current) planFileInputRef.current.value = '';

      if (onPlanUpdated) {
        onPlanUpdated(planBlock, planWeek);
      }
    } catch (err: any) {
      console.error('Error publishing plan:', err);
      setErrorMessage(`تعذر حفظ الخطة في قاعدة البيانات: ${err.message || err}`);
    } finally {
      setIsPublishingPlan(false);
    }
  };

  const blocks = [1, 2, 3, 4];
  const planWeeks = [1, 2, 3, 4];
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
                  لوحة الأدمن — إدارة الخطة الأسبوعية والمواد
                </h2>
                <p className="text-xs text-slate-500 mt-0.5 font-semibold">
                  رفع ومعالجة الـ Weekly Plan ذكياً + تحميل وتوزيع ملفات وملازم الـ Materials
                </p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => setIsSupabaseModalOpen(true)}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold text-emerald-800 bg-emerald-50 hover:bg-emerald-100 border border-emerald-300 transition-colors cursor-pointer shadow-2xs"
                title="إعدادات وحفظ مفاتيح وقاعدة بيانات Supabase"
              >
                <Database className="w-3.5 h-3.5 text-emerald-600" />
                <span>ربط Supabase</span>
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

          {/* Body Content */}
          <div className="py-4 overflow-y-auto flex-1 space-y-5">
            {/* Direct Admin Edit Mode Toggle Banner */}
            <div className="bg-amber-50 border border-amber-300 rounded-2xl p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3 shadow-2xs">
              <div className="text-right">
                <h3 className="text-xs sm:text-sm font-black text-amber-950 flex items-center gap-1.5 justify-start">
                  <span>🛠️ وضع التحكم والتعديل المباشر (Direct Edit Mode)</span>
                  {isAdminEditMode && (
                    <span className="px-2 py-0.5 rounded-full text-[10px] bg-emerald-100 text-emerald-800 border border-emerald-300 animate-pulse">
                      نشط حالياً 🟢
                    </span>
                  )}
                </h3>
                <p className="text-[11px] text-amber-900/80 font-bold mt-1">
                  عند تفعيل هذا الخيار، سيتم عرض أزرار (إضافة ➕، تعديل ✏️، حذف 🗑️) مباشرة على صفحة الحصص والواجبات والتنبيهات أمامكِ لتعديلها فوراً كأدمن!
                </p>
              </div>
              <button
                type="button"
                onClick={() => {
                  onToggleAdminEditMode(!isAdminEditMode);
                  if (!isAdminEditMode) {
                    onClose();
                  }
                }}
                className={`px-4.5 py-2.5 rounded-xl text-xs font-black transition-all cursor-pointer shadow-xs whitespace-nowrap text-center ${
                  isAdminEditMode
                    ? 'bg-rose-600 hover:bg-rose-700 text-white'
                    : 'bg-amber-500 hover:bg-amber-600 text-slate-950'
                }`}
              >
                {isAdminEditMode ? '❌ إيقاف وضع التعديل المباشر' : '⚙️ تفعيل وضع التعديل المباشر والخروج للمعالجة'}
              </button>
            </div>

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

            {/* NEW: Primary Weekly Plan Upload & AI Parser Card */}
            <div className="bg-linear-to-br from-indigo-50/90 via-purple-50/40 to-white border border-indigo-200/90 rounded-2xl p-4 sm:p-5 shadow-2xs space-y-4">
              <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-indigo-600 text-white flex items-center justify-center shadow-xs">
                    <Sparkles className="w-5 h-5" />
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <h3 className="text-sm sm:text-base font-black text-indigo-950">
                        زر رفع ومعالجة الـ Weekly Plan ذكياً
                      </h3>
                      <span className="px-2 py-0.5 rounded-full text-[10px] font-black bg-indigo-100 text-indigo-700 border border-indigo-200">
                        تفكيك ذكي AI
                      </span>
                    </div>
                    <p className="text-xs text-indigo-900/70 font-medium">
                      ارفع ملف PDF للخطة الأسبوعية لتفكيك الحصص وجدولة الواجبات (حصة 3 للفرنساوي و ICT) واستخراج ملاحظات الغد
                    </p>
                  </div>
                </div>

                <button
                  id="toggle-plan-upload-form-btn"
                  type="button"
                  onClick={() => setShowPlanUploadForm(!showPlanUploadForm)}
                  className={`px-4 py-2 rounded-xl text-xs font-black transition-all cursor-pointer shadow-xs inline-flex items-center justify-center gap-1.5 ${
                    showPlanUploadForm
                      ? 'bg-slate-200 text-slate-800 hover:bg-slate-300'
                      : 'bg-indigo-600 text-white hover:bg-indigo-700'
                  }`}
                >
                  <Upload className="w-3.5 h-3.5" />
                  <span>{showPlanUploadForm ? 'إخفاء نموذج الخطة' : 'رفع Weekly Plan جديد (PDF)'}</span>
                </button>
              </div>

              {/* Weekly Plan Upload Form (when opened) */}
              {showPlanUploadForm && (
                <div className="pt-3 border-t border-indigo-200/80 space-y-4 animate-in fade-in duration-200">
                  {/* Step 1: Select Topic */}
                  <div>
                    <label className="block text-xs font-black text-slate-800 mb-1.5">
                      1. اختر التوبيك المستهدف (Target Topic):
                    </label>
                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                      {blocks.map((b) => (
                        <button
                          key={b}
                          type="button"
                          id={`admin-plan-block-${b}-btn`}
                          onClick={() => setPlanBlock(b)}
                          className={`py-2 px-3 rounded-xl text-xs font-black border transition-all cursor-pointer ${
                            planBlock === b
                              ? 'bg-indigo-600 text-white border-indigo-700 shadow-xs'
                              : 'bg-white text-slate-700 border-slate-200 hover:bg-indigo-50/50'
                          }`}
                        >
                          توبيك {b}
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Step 2: Select Week */}
                  <div>
                    <label className="block text-xs font-black text-slate-800 mb-1.5">
                      2. اختر الأسبوع (Target Week):
                    </label>
                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                      {planWeeks.map((w) => (
                        <button
                          key={w}
                          type="button"
                          id={`admin-plan-week-${w}-btn`}
                          onClick={() => setPlanWeek(w)}
                          className={`py-2 px-3 rounded-xl text-xs font-black border transition-all cursor-pointer ${
                            planWeek === w
                              ? 'bg-purple-600 text-white border-purple-700 shadow-xs'
                              : 'bg-white text-slate-700 border-slate-200 hover:bg-purple-50/50'
                          }`}
                        >
                          Week {w}
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Step 3: Target Class */}
                  <div>
                    <label className="block text-xs font-black text-slate-800 mb-1.5">
                      3. تحديد الفصل (المستهدفين بتوزيع الجدول):
                    </label>
                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                      {[
                        { id: 'ALL', label: 'كل الفصول (A, B, C, D, E)' },
                        { id: 'KG1A', label: 'فصل A' },
                        { id: 'KG1B', label: 'فصل B' },
                        { id: 'KG1C', label: 'فصل C' },
                        { id: 'KG1D', label: 'فصل D' },
                        { id: 'KG1E', label: 'فصل E' },
                      ].map((c) => (
                        <button
                          key={c.id}
                          type="button"
                          id={`admin-plan-class-${c.id}-btn`}
                          onClick={() => setPlanClass(c.id as ClassId | 'ALL')}
                          className={`py-1.5 px-2 rounded-xl text-xs font-bold border transition-all cursor-pointer ${
                            planClass === c.id
                              ? 'bg-slate-900 text-white border-slate-900 shadow-xs'
                              : 'bg-white text-slate-600 border-slate-200 hover:bg-slate-50'
                          }`}
                        >
                          {c.label}
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Step 4: Choose Plan Input Mode (PDF or Paste Table) */}
                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <label className="block text-xs font-black text-slate-800">
                        4. إدخال الخطة الأسبوعية (ملف PDF أو لصق جدول الخطة):
                      </label>
                      <div className="flex rounded-lg bg-slate-100 p-0.5 text-[11px] font-bold">
                        <button
                          type="button"
                          onClick={() => setPlanInputMode('pdf')}
                          className={`px-2.5 py-1 rounded-md transition-all cursor-pointer ${
                            planInputMode === 'pdf'
                              ? 'bg-white text-indigo-700 shadow-2xs'
                              : 'text-slate-500 hover:text-slate-800'
                          }`}
                        >
                          📄 رفع ملف PDF
                        </button>
                        <button
                          type="button"
                          onClick={() => setPlanInputMode('text')}
                          className={`px-2.5 py-1 rounded-md transition-all cursor-pointer ${
                            planInputMode === 'text'
                              ? 'bg-white text-indigo-700 shadow-2xs'
                              : 'text-slate-500 hover:text-slate-800'
                          }`}
                        >
                          📋 نسخ ولصق الجدول
                        </button>
                      </div>
                    </div>

                    {planInputMode === 'pdf' ? (
                      <div>
                        <input
                          ref={planFileInputRef}
                          type="file"
                          accept=".pdf,application/pdf"
                          onChange={handlePlanFileChange}
                          className="block w-full text-xs text-slate-500 file:mr-0 file:ml-3 file:py-2 file:px-4 file:rounded-xl file:border-0 file:text-xs file:font-black file:bg-indigo-600 file:text-white hover:file:bg-indigo-700 file:cursor-pointer bg-white border border-slate-200 rounded-xl p-1.5 shadow-2xs"
                        />

                        {planFile && (
                          <div className="mt-2 p-2.5 bg-white rounded-xl border border-indigo-200 flex items-center justify-between text-xs">
                            <div className="flex items-center gap-2 text-slate-800 font-bold truncate">
                              <FileText className="w-4 h-4 text-indigo-600 shrink-0" />
                              <span className="truncate">{planFile.name}</span>
                              <span className="text-slate-400 font-medium">
                                ({formatBytes(planFile.size)})
                              </span>
                            </div>
                            <span className="text-indigo-700 font-black bg-indigo-50 px-2 py-0.5 rounded-lg shrink-0">
                              جاهز للتحليل والتفكيك
                            </span>
                          </div>
                        )}
                      </div>
                    ) : (
                      <div>
                        <textarea
                          rows={6}
                          value={planTextInput}
                          onChange={(e) => {
                            setPlanTextInput(e.target.value);
                            setParsedResult(null);
                          }}
                          placeholder={`الصق هنا جدول أو نصوص الخطة الأسبوعية (Weekly Plan) مباشرة من ملف Word أو Excel أو PDF...

مثال:
Sunday:
- English: Alphabet & Phonics. CW: Pupil book p. 6-8. HW: Activity book p. 4.
- Arabic: درس أنا أستطيع. أعمال الفصل: ص 10. الواجب المنزلي: كتابة ص 11. ملاحظات: إحضار كشكول العربي.`}
                          className="w-full text-xs p-3 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 bg-white font-mono leading-relaxed"
                          dir="auto"
                        />
                      </div>
                    )}
                  </div>

                  {/* Parse Action Button */}
                  <div className="pt-2 flex flex-col md:flex-row items-stretch md:items-center gap-3">
                    <button
                      id="admin-parse-plan-btn"
                      type="button"
                      disabled={
                        (planInputMode === 'pdf' && !planFile) ||
                        (planInputMode === 'text' && !planTextInput.trim()) ||
                        isParsingPlan
                      }
                      onClick={handleParseWeeklyPlan}
                      className="px-6 py-2.5 rounded-xl text-xs font-black text-white bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed transition-all cursor-pointer shadow-xs inline-flex items-center justify-center gap-2 shrink-0"
                    >
                      {isParsingPlan ? (
                        <>
                          <Loader2 className="w-4 h-4 animate-spin" />
                          <span>{parsingStep || 'جاري تفكيك الخطة وقراءتها...'}</span>
                        </>
                      ) : (
                        <>
                          <Sparkles className="w-4 h-4" />
                          <span>قراءة وتفكيك الخطة ذكياً بالـ AI</span>
                        </>
                      )}
                    </button>

                    <button
                      type="button"
                      disabled={isParsingPlan}
                      onClick={handleLoadActiveData}
                      className="px-6 py-2.5 rounded-xl text-xs font-black text-emerald-800 bg-emerald-50 hover:bg-emerald-100 border border-emerald-300 disabled:opacity-50 disabled:cursor-not-allowed transition-all cursor-pointer shadow-xs inline-flex items-center justify-center gap-2 shrink-0"
                    >
                      <span>✏️ تعديل / إضافة يدوية على الخطة الحالية</span>
                    </button>

                    <p className="text-[11px] text-slate-500 leading-relaxed">
                      * اضغط على <strong>تعديل / إضافة يدوية</strong> لفتح لوحة التحكم والتعديل مباشرةً لـ Block {planBlock} الأسبوع {planWeek} دون الحاجة لرفع ملف.
                    </p>
                  </div>

                  {/* Parsed Result Preview Box */}
                  {parsedResult && (
                    <div className="mt-4 p-4 bg-white rounded-2xl border-2 border-indigo-200/90 shadow-sm space-y-4 animate-in fade-in duration-200">
                      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-3 border-b border-slate-100">
                        <div>
                          <div className="flex items-center gap-2">
                            <CheckCircle2 className="w-5 h-5 text-emerald-600" />
                            <h4 className="text-sm font-black text-slate-900">
                              تم تفكيك الخطة بنجاح! جاهزة للاعتماد والحفظ
                            </h4>
                          </div>
                          <p className="text-xs text-slate-500 mt-0.5">
                            تمت مواءمة الحصص مع جدول الفصول، ونقل الاختبارات والملاحظات إلى Tomorrow، وتعيين واجبات الفرنساوي والـ ICT في الحصة الثالثة.
                          </p>
                        </div>

                        {/* Summary Badges */}
                        <div className="flex flex-wrap items-center gap-1.5">
                          <span className="px-2.5 py-1 rounded-lg text-xs font-bold bg-blue-50 text-blue-700 border border-blue-100">
                            📘 {parsedResult.classwork.length} أعمال فصل (CW)
                          </span>
                          <span className="px-2.5 py-1 rounded-lg text-xs font-bold bg-amber-50 text-amber-800 border border-amber-100">
                            📝 {parsedResult.homework.length} واجب (HW)
                          </span>
                          <span className="px-2.5 py-1 rounded-lg text-xs font-bold bg-emerald-50 text-emerald-800 border border-emerald-100">
                            🎒 {parsedResult.tomorrowNotes.length} ملاحظات وكويزات (Tomorrow)
                          </span>
                        </div>
                      </div>

                      {/* Preview Tabs */}
                      <div className="flex border-b border-slate-100 gap-2">
                        <button
                          type="button"
                          onClick={() => setPreviewTab('classwork')}
                          className={`pb-2 px-3 text-xs font-black border-b-2 transition-colors cursor-pointer ${
                            previewTab === 'classwork'
                              ? 'border-indigo-600 text-indigo-600'
                              : 'border-transparent text-slate-500 hover:text-slate-800'
                          }`}
                        >
                          أعمال الفصل (Classwork) ({parsedResult.classwork.length})
                        </button>
                        <button
                          type="button"
                          onClick={() => setPreviewTab('homework')}
                          className={`pb-2 px-3 text-xs font-black border-b-2 transition-colors cursor-pointer ${
                            previewTab === 'homework'
                              ? 'border-indigo-600 text-indigo-600'
                              : 'border-transparent text-slate-500 hover:text-slate-800'
                          }`}
                        >
                          الواجبات المنزلية (Homework) ({parsedResult.homework.length})
                        </button>
                        <button
                          type="button"
                          onClick={() => setPreviewTab('tomorrow')}
                          className={`pb-2 px-3 text-xs font-black border-b-2 transition-colors cursor-pointer ${
                            previewTab === 'tomorrow'
                              ? 'border-indigo-600 text-indigo-600'
                              : 'border-transparent text-slate-500 hover:text-slate-800'
                          }`}
                        >
                          تنبيهات الغد والكويزات (Tomorrow) ({parsedResult.tomorrowNotes.length})
                        </button>
                      </div>

                      {/* Preview Tab Content */}
                      <div className="max-h-72 overflow-y-auto space-y-2 pr-1 text-xs">
                        {previewTab === 'classwork' && (
                          <div className="space-y-2">
                            <div className="flex items-center justify-between pb-2 border-b border-slate-100 gap-2">
                              <span className="text-[11px] text-slate-500 font-bold">
                                يمكنك تعديل تفاصيل أي حصة، أرقام صفحاتها، أو حذفها مباشرةً:
                              </span>
                              <button
                                type="button"
                                onClick={openAddClasswork}
                                id="add-classwork-task-btn"
                                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-black text-[11px] cursor-pointer transition-all shadow-xs shrink-0 hover:scale-[1.02]"
                              >
                                <Plus className="w-3.5 h-3.5" />
                                ➕ إضافة حصة جديدة يدوياً
                              </button>
                            </div>

                            {parsedResult.classwork.length === 0 ? (
                              <p className="text-center py-4 text-slate-400 font-bold">
                                لا توجد حصص مستخرجة حالياً. يمكنك الضغط على "+ إضافة حصة" لإضافة حصص يدوياً.
                              </p>
                            ) : (
                              parsedResult.classwork.map((cw, idx) => (
                                <div
                                  key={`preview-cw-${cw.id || 'item'}-${idx}`}
                                  className="p-3 rounded-xl bg-slate-50 border border-slate-200 hover:border-indigo-300 hover:bg-indigo-50/10 transition-all flex flex-col sm:flex-row sm:items-center justify-between gap-3 shadow-2xs"
                                >
                                  <div className="flex items-center gap-2 shrink-0">
                                    <span className="w-7 h-7 rounded-lg bg-indigo-100 text-indigo-800 font-black text-xs flex items-center justify-center shrink-0">
                                      ح{cw.period}
                                    </span>
                                    <div className="flex flex-col">
                                      <div className="flex items-center gap-1.5">
                                        <span className="font-black text-slate-900 text-xs">{cw.subject}</span>
                                        <span className="px-1.5 py-0.5 rounded bg-slate-200 text-slate-700 text-[10px] font-bold">
                                          {cw.classId}
                                        </span>
                                        <span className="text-slate-500 text-[10px] font-medium">{cw.day}</span>
                                      </div>
                                      {cw.pages && (
                                        <span className="text-[10px] font-bold text-amber-900 bg-amber-100/70 px-1.5 py-0.5 rounded border border-amber-200 inline-block w-fit mt-0.5">
                                          📖 {cw.pages}
                                        </span>
                                      )}
                                    </div>
                                  </div>

                                  <div className="flex-1 min-w-0 px-2 text-right">
                                    <p className="text-slate-800 font-bold text-xs truncate">
                                      {cw.title || cw.details || (cw as any).lesson || 'درس بدون عنوان'}
                                    </p>
                                    {cw.details && cw.details !== cw.title && (
                                      <p className="text-slate-500 text-[11px] truncate font-medium">
                                        {cw.details}
                                      </p>
                                    )}
                                    {(() => {
                                      const linksToRender: { title: string; url: string }[] = [];
                                      if (cw.links && Array.isArray(cw.links) && cw.links.length > 0) {
                                        linksToRender.push(...cw.links);
                                      } else if (cw.linkUrl) {
                                        linksToRender.push({ title: cw.linkTitle || 'رابط الدرس 🔗', url: cw.linkUrl });
                                      }
                                      if (linksToRender.length === 0) return null;
                                      return (
                                        <div className="flex flex-wrap gap-1 mt-1">
                                          {linksToRender.map((lnk, lIdx) => (
                                            <a
                                              key={lIdx}
                                              href={lnk.url}
                                              target="_blank"
                                              rel="noopener noreferrer"
                                              className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded bg-blue-50 text-blue-700 hover:bg-blue-100 text-[10px] font-bold border border-blue-200 transition-colors"
                                            >
                                              <span>🔗 {lnk.title}</span>
                                            </a>
                                          ))}
                                        </div>
                                      );
                                    })()}
                                  </div>

                                  <div className="flex items-center gap-1.5 shrink-0 self-end sm:self-auto">
                                    <button
                                      type="button"
                                      onClick={() => openEditClasswork(cw, idx)}
                                      className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-xl bg-indigo-50 border border-indigo-200 hover:bg-indigo-100 hover:border-indigo-400 text-indigo-700 font-black text-[11px] transition-all cursor-pointer shadow-3xs"
                                      title="تعديل الحصة"
                                    >
                                      <Edit2 className="w-3 h-3 text-indigo-600" />
                                      <span>تعديل ✏️</span>
                                    </button>
                                    <button
                                      type="button"
                                      onClick={() => handleDeleteItem('classwork', idx)}
                                      className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-xl bg-rose-50 border border-rose-200 hover:bg-rose-100 hover:border-rose-400 text-rose-700 font-black text-[11px] transition-all cursor-pointer shadow-3xs"
                                      title="حذف الحصة"
                                    >
                                      <Trash2 className="w-3 h-3 text-rose-600" />
                                      <span>حذف ❌</span>
                                    </button>
                                  </div>
                                </div>
                              ))
                            )}
                          </div>
                        )}

                        {previewTab === 'homework' && (
                          <div className="space-y-2">
                            <div className="flex items-center justify-between pb-2 border-b border-slate-100 gap-2">
                              <span className="text-[11px] text-slate-500 font-bold">
                                يمكنك مراجعة وتعديل الواجبات المنزلية وأرقام الصفحات مباشرةً:
                              </span>
                              <button
                                type="button"
                                onClick={openAddHomework}
                                id="add-homework-task-btn"
                                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-black text-[11px] cursor-pointer transition-all shadow-xs shrink-0 hover:scale-[1.02]"
                              >
                                <Plus className="w-3.5 h-3.5" />
                                ➕ إضافة واجب جديد يدوياً
                              </button>
                            </div>

                            {parsedResult.homework.length === 0 ? (
                              <p className="text-center py-4 text-slate-400 font-bold">
                                لا توجد واجبات مستخرجة حالياً. يمكنك الضغط على "+ إضافة واجب" لإضافة واجب يدوياً.
                              </p>
                            ) : (
                              parsedResult.homework.map((hw, idx) => (
                                <div
                                  key={`preview-hw-${hw.id || 'item'}-${idx}`}
                                  className="p-3 rounded-xl bg-slate-50 border border-slate-200 hover:border-amber-300 hover:bg-amber-50/10 transition-all flex flex-col sm:flex-row sm:items-center justify-between gap-3 shadow-2xs"
                                >
                                  <div className="flex items-center gap-2 shrink-0">
                                    <span className="px-2 py-1 rounded-md bg-amber-100 text-amber-900 font-bold text-[11px]">
                                      {hw.subject}
                                    </span>
                                    <div className="flex flex-col">
                                      <div className="flex items-center gap-1 text-slate-500 text-[10px]">
                                        <span className="font-bold text-slate-700">{hw.classId}</span>
                                        <span>• يعطى: {hw.assignedDay}</span>
                                        <span>• تسليم: {hw.dueDay}</span>
                                      </div>
                                      {hw.pages && (
                                        <span className="text-[10px] font-bold text-indigo-900 bg-indigo-50 px-1.5 py-0.5 rounded border border-indigo-200 inline-block w-fit mt-0.5">
                                          📖 {hw.pages}
                                        </span>
                                      )}
                                    </div>
                                    {hw.priority === 'urgent' && (
                                      <span className="px-1.5 py-0.5 rounded bg-rose-100 text-rose-800 text-[10px] font-bold animate-pulse">
                                        🚨 عاجل
                                      </span>
                                    )}
                                  </div>

                                  <div className="flex-1 min-w-0 px-2 text-right">
                                    <p className="text-slate-800 font-bold text-xs truncate">
                                      {hw.task}
                                    </p>
                                    {hw.details && (
                                      <p className="text-slate-500 text-[11px] truncate font-medium">
                                        {hw.details}
                                      </p>
                                    )}
                                    {(() => {
                                      const linksToRender: { title: string; url: string }[] = [];
                                      if (hw.links && Array.isArray(hw.links) && hw.links.length > 0) {
                                        linksToRender.push(...hw.links);
                                      } else if (hw.linkUrl) {
                                        linksToRender.push({ title: hw.linkTitle || 'رابط الواجب 🔗', url: hw.linkUrl });
                                      }
                                      if (linksToRender.length === 0) return null;
                                      return (
                                        <div className="flex flex-wrap gap-1 mt-1">
                                          {linksToRender.map((lnk, lIdx) => (
                                            <a
                                              key={lIdx}
                                              href={lnk.url}
                                              target="_blank"
                                              rel="noopener noreferrer"
                                              className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded bg-amber-50 text-amber-900 hover:bg-amber-100 text-[10px] font-bold border border-amber-200 transition-colors"
                                            >
                                              <span>🔗 {lnk.title}</span>
                                            </a>
                                          ))}
                                        </div>
                                      );
                                    })()}
                                  </div>

                                  <div className="flex items-center gap-1.5 shrink-0 self-end sm:self-auto">
                                    <button
                                      type="button"
                                      onClick={() => openEditHomework(hw, idx)}
                                      className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-xl bg-amber-50 border border-amber-200 hover:bg-amber-100 hover:border-amber-400 text-amber-800 font-black text-[11px] transition-all cursor-pointer shadow-3xs"
                                      title="تعديل الواجب"
                                    >
                                      <Edit2 className="w-3 h-3 text-amber-600" />
                                      <span>تعديل ✏️</span>
                                    </button>
                                    <button
                                      type="button"
                                      onClick={() => handleDeleteItem('homework', idx)}
                                      className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-xl bg-rose-50 border border-rose-200 hover:bg-rose-100 hover:border-rose-400 text-rose-700 font-black text-[11px] transition-all cursor-pointer shadow-3xs"
                                      title="حذف الواجب"
                                    >
                                      <Trash2 className="w-3 h-3 text-rose-600" />
                                      <span>حذف ❌</span>
                                    </button>
                                  </div>
                                </div>
                              ))
                            )}
                          </div>
                        )}

                        {previewTab === 'tomorrow' && (
                          <div className="space-y-2">
                            <div className="flex items-center justify-between pb-2 border-b border-slate-100 gap-2">
                              <span className="text-[11px] text-slate-500 font-bold">
                                يمكنك تعديل تنبيهات الغد والكويزات المدرسية مباشرةً:
                              </span>
                              <button
                                type="button"
                                onClick={openAddTomorrowNote}
                                id="add-tomorrow-task-btn"
                                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-black text-[11px] cursor-pointer transition-all shadow-xs shrink-0 hover:scale-[1.02]"
                              >
                                <Plus className="w-3.5 h-3.5" />
                                ➕ إضافة تنبيه جديد يدوياً
                              </button>
                            </div>

                            {parsedResult.tomorrowNotes.length === 0 ? (
                              <p className="text-center py-4 text-slate-400 font-bold">
                                لا توجد تنبيهات مستخرجة حالياً. يمكنك الضغط على "+ إضافة تنبيه" لإضافة تنبيهات يدوياً.
                              </p>
                            ) : (
                              parsedResult.tomorrowNotes.map((note, idx) => {
                                const isQuiz =
                                  note.isQuiz ||
                                  note.categoryType === 'quiz' ||
                                  /quiz|test|exam|dictation|اختبار|امتحان|كويز|إملاء|تسميع|تقييم/i.test(
                                    note.note + ' ' + (note.arabicNote || '')
                                  );

                                let badgeLabel = 'Notes';
                                let badgeStyle = 'bg-blue-100 text-blue-800 border-blue-200';

                                if (isQuiz) {
                                  badgeLabel = '🚨 اختبار / Quiz';
                                  badgeStyle = 'bg-rose-100 text-rose-800 border-rose-200';
                                } else if (
                                  note.subject?.toLowerCase().includes('french') ||
                                  note.subject?.includes('فرنساوي')
                                ) {
                                  badgeLabel = 'Remarque';
                                  badgeStyle = 'bg-purple-100 text-purple-800 border-purple-200';
                                } else if (
                                  note.subject?.toLowerCase().includes('arabic') ||
                                  note.subject?.toLowerCase().includes('social') ||
                                  note.subject?.includes('عربي') ||
                                  note.subject?.includes('دراسات')
                                ) {
                                  badgeLabel = 'ملاحظات';
                                  badgeStyle = 'bg-emerald-100 text-emerald-800 border-emerald-200';
                                }

                                const dayArabicMap: Record<string, string> = {
                                  Sunday: 'الأحد',
                                  Monday: 'الاثنين',
                                  Tuesday: 'الثلاثاء',
                                  Wednesday: 'الأربعاء',
                                  Thursday: 'الخميس',
                                };

                                return (
                                  <div
                                    key={`preview-note-${note.id || 'item'}-${idx}`}
                                    className="p-3 rounded-xl bg-slate-50 border border-slate-200 hover:border-emerald-300 hover:bg-emerald-50/10 transition-all flex flex-col sm:flex-row sm:items-center justify-between gap-3 shadow-2xs"
                                  >
                                    <div className="flex-1 min-w-0 space-y-1">
                                      <div className="flex items-center gap-2">
                                        <span className="font-black text-indigo-900 text-xs">
                                          يوم {dayArabicMap[note.targetDay] || note.targetDay} — {note.subject}
                                        </span>
                                        <span className="px-1.5 py-0.5 rounded bg-slate-200 text-slate-700 text-[10px] font-bold">
                                          {note.classId}
                                        </span>
                                        <span
                                          className={`text-[10px] font-black px-2 py-0.5 rounded-md border ${badgeStyle}`}
                                        >
                                          {badgeLabel}
                                        </span>
                                      </div>
                                      <p className="text-slate-700 text-xs leading-relaxed font-medium">
                                        {note.arabicNote || note.note}
                                      </p>
                                      {note.bagItem && (
                                        <div className="mt-1">
                                          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-white border border-amber-200 text-[11px] text-amber-900 font-bold">
                                            🎒 الحقيبة المدرسية: {note.bagItem}
                                          </span>
                                        </div>
                                      )}
                                      {(() => {
                                        const linksToRender: { title: string; url: string }[] = [];
                                        if (note.links && Array.isArray(note.links) && note.links.length > 0) {
                                          linksToRender.push(...note.links);
                                        } else if (note.linkUrl) {
                                          linksToRender.push({ title: note.linkTitle || 'رابط الملاحظة 🔗', url: note.linkUrl });
                                        }
                                        if (linksToRender.length === 0) return null;
                                        return (
                                          <div className="flex flex-wrap gap-1 mt-1">
                                            {linksToRender.map((lnk, lIdx) => (
                                              <a
                                                key={lIdx}
                                                href={lnk.url}
                                                target="_blank"
                                                rel="noopener noreferrer"
                                                className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded bg-emerald-50 text-emerald-800 hover:bg-emerald-100 text-[10px] font-bold border border-emerald-200 transition-colors"
                                              >
                                                <span>🔗 {lnk.title}</span>
                                              </a>
                                            ))}
                                          </div>
                                        );
                                      })()}
                                    </div>

                                    <div className="flex items-center gap-1.5 shrink-0 self-end sm:self-auto">
                                      <button
                                        type="button"
                                        onClick={() => openEditTomorrowNote(note, idx)}
                                        className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-xl bg-emerald-50 border border-emerald-200 hover:bg-emerald-100 hover:border-emerald-400 text-emerald-800 font-black text-[11px] transition-all cursor-pointer shadow-3xs"
                                        title="تعديل التنبيه"
                                      >
                                        <Edit2 className="w-3 h-3 text-emerald-600" />
                                        <span>تعديل ✏️</span>
                                      </button>
                                      <button
                                        type="button"
                                        onClick={() => handleDeleteItem('tomorrow', idx)}
                                        className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-xl bg-rose-50 border border-rose-200 hover:bg-rose-100 hover:border-rose-400 text-rose-700 font-black text-[11px] transition-all cursor-pointer shadow-3xs"
                                        title="حذف التنبيه"
                                      >
                                        <Trash2 className="w-3 h-3 text-rose-600" />
                                        <span>حذف ❌</span>
                                      </button>
                                    </div>
                                  </div>
                                );
                              })
                            )}
                          </div>
                        )}
                      </div>

                      {/* Edit Sub-Modal Dialog */}
                      {editingItemType && (
                        <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-in fade-in duration-200">
                          <div className="bg-white rounded-2xl shadow-2xl border border-slate-200 w-full max-w-lg overflow-hidden flex flex-col max-h-[90vh]">
                            {/* Header */}
                            <div className="px-5 py-4 bg-gradient-to-r from-indigo-900 to-slate-900 text-white flex items-center justify-between">
                              <div className="flex items-center gap-2">
                                <div className="p-2 rounded-xl bg-white/10 text-white">
                                  <Edit2 className="w-5 h-5 text-indigo-300" />
                                </div>
                                <div>
                                  <h3 className="font-black text-sm text-white">
                                    {isAddingNewItem ? 'إضافة عنصر جديد للخطة' : 'تعديل تفاصيل العنصر قبل النشر'}
                                  </h3>
                                  <p className="text-[11px] text-slate-300">
                                    {editingItemType === 'classwork'
                                      ? 'حصة أعمال فصل (Classwork)'
                                      : editingItemType === 'homework'
                                      ? 'واجب منزلي (Homework)'
                                      : 'تنبيه الغد أو الكويز (Tomorrow)'}
                                  </p>
                                </div>
                              </div>
                              <button
                                type="button"
                                onClick={() => {
                                  setEditingItemType(null);
                                  setEditingItemIndex(null);
                                  setIsAddingNewItem(false);
                                }}
                                className="p-1.5 rounded-lg text-slate-300 hover:text-white hover:bg-white/10 transition-colors cursor-pointer"
                              >
                                <X className="w-5 h-5" />
                              </button>
                            </div>

                            {/* Form Body */}
                            <div className="p-5 overflow-y-auto space-y-4 text-xs">
                              {/* Class, Subject, Day Row */}
                              <div className="grid grid-cols-3 gap-2.5">
                                <div>
                                  <label className="block text-[11px] font-bold text-slate-700 mb-1">الفصل</label>
                                  <select
                                    value={formClassId}
                                    onChange={(e) => setFormClassId(e.target.value as any)}
                                    className="w-full px-2.5 py-1.5 rounded-lg border border-slate-200 text-slate-900 font-bold focus:border-indigo-500 focus:outline-none"
                                  >
                                    <option value="KG1A">KG 1A</option>
                                    <option value="KG1B">KG 1B</option>
                                    <option value="KG1C">KG 1C</option>
                                    <option value="KG1D">KG 1D</option>
                                    <option value="KG1E">KG 1E</option>
                                    <option value="ALL">جميع الفصول (ALL)</option>
                                  </select>
                                </div>

                                <div>
                                  <label className="block text-[11px] font-bold text-slate-700 mb-1">المادة</label>
                                  <select
                                    value={formSubject}
                                    onChange={(e) => setFormSubject(e.target.value)}
                                    className="w-full px-2.5 py-1.5 rounded-lg border border-slate-200 text-slate-900 font-bold focus:border-indigo-500 focus:outline-none"
                                  >
                                    <option value="English">English</option>
                                    <option value="Arabic">Arabic (اللغة العربية)</option>
                                  </select>
                                </div>

                                <div>
                                  <label className="block text-[11px] font-bold text-slate-700 mb-1">
                                    {editingItemType === 'homework' ? 'يوم الإعطاء' : 'اليوم'}
                                  </label>
                                  <select
                                    value={formDay}
                                    onChange={(e) => setFormDay(e.target.value)}
                                    className="w-full px-2.5 py-1.5 rounded-lg border border-slate-200 text-slate-900 font-bold focus:border-indigo-500 focus:outline-none"
                                  >
                                    <option value="Sunday">Sunday (الأحد)</option>
                                    <option value="Monday">Monday (الاثنين)</option>
                                    <option value="Tuesday">Tuesday (الثلاثاء)</option>
                                    <option value="Wednesday">Wednesday (الأربعاء)</option>
                                    <option value="Thursday">Thursday (الخميس)</option>
                                  </select>
                                </div>
                              </div>

                              {/* Conditional Fields */}
                              {editingItemType === 'classwork' && (
                                <>
                                  <div className="grid grid-cols-2 gap-2.5">
                                    <div>
                                      <label className="block text-[11px] font-bold text-slate-700 mb-1">رقم الحصة (Period)</label>
                                      <select
                                        value={formPeriod}
                                        onChange={(e) => setFormPeriod(Number(e.target.value))}
                                        className="w-full px-2.5 py-1.5 rounded-lg border border-slate-200 text-slate-900 font-bold focus:border-indigo-500 focus:outline-none"
                                      >
                                        {[1, 2, 3, 4, 5, 6, 7, 8].map((p) => (
                                          <option key={`period-${p}`} value={p}>
                                            الحصة {p}
                                          </option>
                                        ))}
                                      </select>
                                    </div>
                                    <div>
                                      <label className="block text-[11px] font-bold text-slate-700 mb-1">أرقام الصفحات (Book Pages)</label>
                                      <input
                                        type="text"
                                        value={formPages}
                                        onChange={(e) => setFormPages(e.target.value)}
                                        placeholder="مثال: ص 24 أو ص 14-24"
                                        className="w-full px-2.5 py-1.5 rounded-lg border border-slate-200 text-slate-900 font-bold focus:border-indigo-500 focus:outline-none placeholder:text-slate-400"
                                      />
                                    </div>
                                  </div>

                                  <div>
                                    <label className="block text-[11px] font-bold text-slate-700 mb-1">عنوان الدرس (Title)</label>
                                    <input
                                      type="text"
                                      value={formTitle}
                                      onChange={(e) => setFormTitle(e.target.value)}
                                      placeholder="مثال: فصلي الجديد، Unit 1 Lesson 2"
                                      className="w-full px-2.5 py-1.5 rounded-lg border border-slate-200 text-slate-900 font-bold focus:border-indigo-500 focus:outline-none"
                                    />
                                  </div>

                                  <div>
                                    <label className="block text-[11px] font-bold text-slate-700 mb-1">التفاصيل والأنشطة (Details)</label>
                                    <textarea
                                      value={formDetails}
                                      onChange={(e) => setFormDetails(e.target.value)}
                                      rows={2}
                                      placeholder="تفاصيل الدرس وشرح الأنشطة المدرسية..."
                                      className="w-full px-2.5 py-1.5 rounded-lg border border-slate-200 text-slate-900 font-medium focus:border-indigo-500 focus:outline-none"
                                    />
                                  </div>

                                  <div className="grid grid-cols-2 gap-2.5">
                                    <div>
                                      <label className="block text-[11px] font-bold text-slate-700 mb-1">رابط الدرس الإلكتروني (اختياري)</label>
                                      <input
                                        type="url"
                                        value={formLinkUrl}
                                        onChange={(e) => setFormLinkUrl(e.target.value)}
                                        placeholder="https://..."
                                        className="w-full px-2.5 py-1.5 rounded-lg border border-slate-200 text-slate-900 text-xs focus:border-indigo-500 focus:outline-none"
                                      />
                                    </div>
                                    <div>
                                      <label className="block text-[11px] font-bold text-slate-700 mb-1">اسم الرابط (Link Title)</label>
                                      <input
                                        type="text"
                                        value={formLinkTitle}
                                        onChange={(e) => setFormLinkTitle(e.target.value)}
                                        placeholder="مثال: كاهوت 🔗، فيديو توضيحي"
                                        className="w-full px-2.5 py-1.5 rounded-lg border border-slate-200 text-slate-900 text-xs focus:border-indigo-500 focus:outline-none"
                                      />
                                    </div>
                                  </div>

                                  {/* Classwork PDF Attachment */}
                                  <div className="bg-slate-50 p-3 rounded-xl border border-slate-200 space-y-2">
                                    <div className="flex items-center justify-between">
                                      <label className="block text-[11px] font-black text-slate-700">📄 شيت الحصة كملف PDF (اختياري)</label>
                                      {formPdfUrl && (
                                        <div className="flex items-center gap-1.5 text-xs text-rose-700 font-bold">
                                          <a href={formPdfUrl} target="_blank" rel="noopener noreferrer" className="hover:underline flex items-center gap-1">
                                            <span>عرض الملف المرفق</span>
                                            <ExternalLink className="w-3 h-3" />
                                          </a>
                                          <button
                                            type="button"
                                            onClick={() => {
                                              setFormPdfUrl('');
                                              setHwSelectedFile(null);
                                            }}
                                            className="text-slate-400 hover:text-red-500 font-bold text-[10px] bg-white border border-slate-200 px-1.5 py-0.5 rounded cursor-pointer"
                                          >
                                            إلغاء المرفق 🗑️
                                          </button>
                                        </div>
                                      )}
                                    </div>
                                    
                                    <input
                                      type="file"
                                      accept=".pdf"
                                      onChange={(e) => {
                                        const file = e.target.files?.[0];
                                        if (file) setHwSelectedFile(file);
                                      }}
                                      className="w-full text-xs text-slate-600 file:mr-2 file:py-1 file:px-2.5 file:rounded-lg file:border-0 file:text-[11px] file:font-black file:bg-rose-50 file:text-rose-700 hover:file:bg-rose-100 cursor-pointer"
                                    />
                                    {hwSelectedFile && (
                                      <p className="text-[10px] font-bold text-emerald-700">
                                        ✨ ملف مجهز للرفع عند الحفظ: {hwSelectedFile.name} ({(hwSelectedFile.size / 1024).toFixed(1)} KB)
                                      </p>
                                    )}
                                  </div>
                                </>
                              )}

                              {editingItemType === 'homework' && (
                                <>
                                  <div className="grid grid-cols-3 gap-2.5">
                                    <div>
                                      <label className="block text-[11px] font-bold text-slate-700 mb-1">يوم التسليم (Due Day)</label>
                                      <select
                                        value={formDueDay}
                                        onChange={(e) => setFormDueDay(e.target.value)}
                                        className="w-full px-2.5 py-1.5 rounded-lg border border-slate-200 text-slate-900 font-bold focus:border-indigo-500 focus:outline-none"
                                      >
                                        <option value="Sunday">Sunday (الأحد)</option>
                                        <option value="Monday">Monday (الاثنين)</option>
                                        <option value="Tuesday">Tuesday (الثلاثاء)</option>
                                        <option value="Wednesday">Wednesday (الأربعاء)</option>
                                        <option value="Thursday">Thursday (الخميس)</option>
                                      </select>
                                    </div>
                                    <div>
                                      <label className="block text-[11px] font-bold text-slate-700 mb-1">أرقام الصفحات (Pages)</label>
                                      <input
                                        type="text"
                                        value={formPages}
                                        onChange={(e) => setFormPages(e.target.value)}
                                        placeholder="مثال: ص 29-32"
                                        className="w-full px-2.5 py-1.5 rounded-lg border border-slate-200 text-slate-900 font-bold focus:border-indigo-500 focus:outline-none placeholder:text-slate-400"
                                      />
                                    </div>
                                    <div>
                                      <label className="block text-[11px] font-bold text-slate-700 mb-1">الأهمية (Priority)</label>
                                      <select
                                        value={formPriority}
                                        onChange={(e) => setFormPriority(e.target.value as any)}
                                        className="w-full px-2.5 py-1.5 rounded-lg border border-slate-200 text-slate-900 font-bold focus:border-indigo-500 focus:outline-none"
                                      >
                                        <option value="normal">عادي (Normal)</option>
                                        <option value="urgent">🚨 عاجل (Urgent)</option>
                                      </select>
                                    </div>
                                  </div>

                                  <div>
                                    <label className="block text-[11px] font-bold text-slate-700 mb-1">المهمة والواجب (Task)</label>
                                    <input
                                      type="text"
                                      value={formTitle}
                                      onChange={(e) => setFormTitle(e.target.value)}
                                      placeholder="مثال: حل صفحة 29 بالكتاب، تدريب 3"
                                      className="w-full px-2.5 py-1.5 rounded-lg border border-slate-200 text-slate-900 font-bold focus:border-indigo-500 focus:outline-none"
                                    />
                                  </div>

                                  <div>
                                    <label className="block text-[11px] font-bold text-slate-700 mb-1">تفاصيل إضافية (Details)</label>
                                    <textarea
                                      value={formDetails}
                                      onChange={(e) => setFormDetails(e.target.value)}
                                      rows={2}
                                      placeholder="تفاصيل وإرشادات حل الواجب..."
                                      className="w-full px-2.5 py-1.5 rounded-lg border border-slate-200 text-slate-900 font-medium focus:border-indigo-500 focus:outline-none"
                                    />
                                  </div>

                                  <div>
                                    <label className="block text-[11px] font-bold text-slate-700 mb-1">رابط الواجب الإلكتروني (اختياري)</label>
                                    <input
                                      type="url"
                                      value={formLinkUrl}
                                      onChange={(e) => setFormLinkUrl(e.target.value)}
                                      placeholder="https://forms.gle/... أو رابط كاهوت"
                                      className="w-full px-2.5 py-1.5 rounded-lg border border-slate-200 text-slate-900 text-xs focus:border-indigo-500 focus:outline-none"
                                    />
                                  </div>

                                  {/* Homework PDF Attachment */}
                                  <div className="bg-slate-50 p-3 rounded-xl border border-slate-200 space-y-2">
                                    <div className="flex items-center justify-between">
                                      <label className="block text-[11px] font-black text-slate-700">📄 شيت الواجب كملف PDF (اختياري)</label>
                                      {formPdfUrl && (
                                        <div className="flex items-center gap-1.5 text-xs text-rose-700 font-bold">
                                          <a href={formPdfUrl} target="_blank" rel="noopener noreferrer" className="hover:underline flex items-center gap-1">
                                            <span>عرض الملف المرفق</span>
                                            <ExternalLink className="w-3 h-3" />
                                          </a>
                                          <button
                                            type="button"
                                            onClick={() => {
                                              setFormPdfUrl('');
                                              setHwSelectedFile(null);
                                            }}
                                            className="text-slate-400 hover:text-red-500 font-bold text-[10px] bg-white border border-slate-200 px-1.5 py-0.5 rounded cursor-pointer"
                                          >
                                            إلغاء المرفق 🗑️
                                          </button>
                                        </div>
                                      )}
                                    </div>
                                    
                                    <input
                                      type="file"
                                      accept=".pdf"
                                      onChange={(e) => {
                                        const file = e.target.files?.[0];
                                        if (file) setHwSelectedFile(file);
                                      }}
                                      className="w-full text-xs text-slate-600 file:mr-2 file:py-1 file:px-2.5 file:rounded-lg file:border-0 file:text-[11px] file:font-black file:bg-rose-50 file:text-rose-700 hover:file:bg-rose-100 cursor-pointer"
                                    />
                                    {hwSelectedFile && (
                                      <p className="text-[10px] font-bold text-emerald-700">
                                        ✨ ملف مجهز للرفع عند الحفظ: {hwSelectedFile.name} ({(hwSelectedFile.size / 1024).toFixed(1)} KB)
                                      </p>
                                    )}
                                  </div>
                                </>
                              )}

                              {editingItemType === 'tomorrow' && (
                                <>
                                  <div>
                                    <label className="block text-[11px] font-bold text-slate-700 mb-1">نص الملاحظة أو التنبيه (Arabic Note)</label>
                                    <textarea
                                      value={formArabicNote}
                                      onChange={(e) => setFormArabicNote(e.target.value)}
                                      rows={3}
                                      placeholder="مثال: اختبار في الوحدة الأولى، أو إحضار زي التربية الرياضية..."
                                      className="w-full px-2.5 py-1.5 rounded-lg border border-slate-200 text-slate-900 font-bold focus:border-indigo-500 focus:outline-none"
                                    />
                                  </div>

                                  <div>
                                    <label className="block text-[11px] font-bold text-slate-700 mb-1">أدوات الحقيبة المدرسية (Bag Item - اختياري)</label>
                                    <input
                                      type="text"
                                      value={formBagItem}
                                      onChange={(e) => setFormBagItem(e.target.value)}
                                      placeholder="مثال: كشكول أزرق 60 ورقة، ألوان خشبية، مسطرة"
                                      className="w-full px-2.5 py-1.5 rounded-lg border border-slate-200 text-slate-900 font-medium focus:border-indigo-500 focus:outline-none"
                                    />
                                  </div>

                                  <div className="flex items-center gap-2 p-2 rounded-lg bg-rose-50 border border-rose-200">
                                    <input
                                      type="checkbox"
                                      id="formIsQuizCheck"
                                      checked={formIsQuiz}
                                      onChange={(e) => setFormIsQuiz(e.target.checked)}
                                      className="w-4 h-4 text-rose-600 rounded cursor-pointer"
                                    />
                                    <label htmlFor="formIsQuizCheck" className="text-xs font-bold text-rose-900 cursor-pointer">
                                      🚨 هل هذا اختبار / Quiz / إملاء / تقييم أسبوعي؟
                                    </label>
                                  </div>

                                  <div className="grid grid-cols-2 gap-2.5">
                                    <div>
                                      <label className="block text-[11px] font-bold text-slate-700 mb-1">رابط إضافي (اختياري)</label>
                                      <input
                                        type="url"
                                        value={formLinkUrl}
                                        onChange={(e) => setFormLinkUrl(e.target.value)}
                                        placeholder="https://..."
                                        className="w-full px-2.5 py-1.5 rounded-lg border border-slate-200 text-slate-900 text-xs focus:border-indigo-500 focus:outline-none"
                                      />
                                    </div>
                                    <div>
                                      <label className="block text-[11px] font-bold text-slate-700 mb-1">اسم الرابط (Link Title)</label>
                                      <input
                                        type="text"
                                        value={formLinkTitle}
                                        onChange={(e) => setFormLinkTitle(e.target.value)}
                                        placeholder="مثال: رابط كويز، لعبة تفاعلية"
                                        className="w-full px-2.5 py-1.5 rounded-lg border border-slate-200 text-slate-900 text-xs focus:border-indigo-500 focus:outline-none"
                                      />
                                    </div>
                                  </div>

                                  {/* Tomorrow PDF Attachment */}
                                  <div className="bg-slate-50 p-3 rounded-xl border border-slate-200 space-y-2">
                                    <div className="flex items-center justify-between">
                                      <label className="block text-[11px] font-black text-slate-700">📄 شيت التنبيه كملف PDF (اختياري)</label>
                                      {formPdfUrl && (
                                        <div className="flex items-center gap-1.5 text-xs text-rose-700 font-bold">
                                          <a href={formPdfUrl} target="_blank" rel="noopener noreferrer" className="hover:underline flex items-center gap-1">
                                            <span>عرض الملف المرفق</span>
                                            <ExternalLink className="w-3 h-3" />
                                          </a>
                                          <button
                                            type="button"
                                            onClick={() => {
                                              setFormPdfUrl('');
                                              setHwSelectedFile(null);
                                            }}
                                            className="text-slate-400 hover:text-red-500 font-bold text-[10px] bg-white border border-slate-200 px-1.5 py-0.5 rounded cursor-pointer"
                                          >
                                            إلغاء المرفق 🗑️
                                          </button>
                                        </div>
                                      )}
                                    </div>
                                    
                                    <input
                                      type="file"
                                      accept=".pdf"
                                      onChange={(e) => {
                                        const file = e.target.files?.[0];
                                        if (file) setHwSelectedFile(file);
                                      }}
                                      className="w-full text-xs text-slate-600 file:mr-2 file:py-1 file:px-2.5 file:rounded-lg file:border-0 file:text-[11px] file:font-black file:bg-rose-50 file:text-rose-700 hover:file:bg-rose-100 cursor-pointer"
                                    />
                                    {hwSelectedFile && (
                                      <p className="text-[10px] font-bold text-emerald-700">
                                        ✨ ملف مجهز للرفع عند الحفظ: {hwSelectedFile.name} ({(hwSelectedFile.size / 1024).toFixed(1)} KB)
                                      </p>
                                    )}
                                  </div>
                                </>
                              )}
                            </div>

                            {/* Footer */}
                            <div className="px-5 py-3 bg-slate-50 border-t border-slate-200 flex items-center justify-end gap-2">
                              <button
                                type="button"
                                onClick={() => {
                                  setEditingItemType(null);
                                  setEditingItemIndex(null);
                                  setIsAddingNewItem(false);
                                }}
                                className="px-4 py-2 rounded-xl border border-slate-300 text-slate-700 font-bold hover:bg-slate-100 transition-colors cursor-pointer text-xs"
                              >
                                إلغاء
                              </button>
                              <button
                                type="button"
                                disabled={isUploadingHwPdf}
                                onClick={handleSaveModalItem}
                                className="px-4 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-black shadow-md transition-colors cursor-pointer text-xs flex items-center gap-1.5 disabled:opacity-50"
                              >
                                {isUploadingHwPdf ? (
                                  <>
                                    <Loader2 className="w-4 h-4 animate-spin" />
                                    <span>جاري رفع شيت الواجب...</span>
                                  </>
                                ) : (
                                  <>
                                    <CheckCircle2 className="w-4 h-4" />
                                    <span>حفظ التعديل في الخطة</span>
                                  </>
                                )}
                              </button>
                            </div>
                          </div>
                        </div>
                      )}

                      {/* Mode selection: Merge vs Replace */}
                      <div className="p-3 bg-slate-50/90 rounded-xl border border-slate-200 space-y-2">
                        <div className="flex items-center justify-between">
                          <label className="text-xs font-black text-slate-800">
                            طريقة إدخال الخطة الأسبوعية:
                          </label>
                          <span className="text-[11px] font-bold text-slate-500">
                            اختر ما إذا كنت تريد الإضافة مع الخطة القديمة أو استبدالها
                          </span>
                        </div>
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                          <button
                            type="button"
                            id="plan-import-mode-replace-btn"
                            onClick={() => setImportMode('replace')}
                            className={`p-3 rounded-xl border text-right transition-all cursor-pointer flex items-start gap-2.5 ${
                              importMode === 'replace'
                                ? 'bg-purple-50/90 border-purple-500 text-purple-950 ring-1 ring-purple-400 shadow-2xs'
                                : 'bg-white border-slate-200 text-slate-700 hover:bg-slate-50'
                            }`}
                          >
                            <div className={`mt-0.5 w-4 h-4 rounded-full border flex items-center justify-center shrink-0 ${
                              importMode === 'replace' ? 'border-purple-600 bg-purple-600 text-white' : 'border-slate-300 bg-white'
                            }`}>
                              {importMode === 'replace' && <div className="w-1.5 h-1.5 rounded-full bg-white" />}
                            </div>
                            <div>
                              <div className="font-black text-xs text-purple-950 flex items-center gap-1.5">
                                <span>🔄 استبدال القديمة بالجديدة (Replace)</span>
                                <span className="px-1.5 py-0.2 rounded bg-purple-200 text-purple-900 text-[10px] font-bold">الموصى به</span>
                              </div>
                              <div className="text-[11px] text-slate-600 mt-1 leading-normal">
                                استبدال وتحديث حصص وواجبات المواد المذكورة بالخطة الجديدة لتجنب أي تكرار.
                              </div>
                            </div>
                          </button>

                          <button
                            type="button"
                            id="plan-import-mode-merge-btn"
                            onClick={() => setImportMode('merge')}
                            className={`p-3 rounded-xl border text-right transition-all cursor-pointer flex items-start gap-2.5 ${
                              importMode === 'merge'
                                ? 'bg-indigo-50/90 border-indigo-500 text-indigo-950 ring-1 ring-indigo-400 shadow-2xs'
                                : 'bg-white border-slate-200 text-slate-700 hover:bg-slate-50'
                            }`}
                          >
                            <div className={`mt-0.5 w-4 h-4 rounded-full border flex items-center justify-center shrink-0 ${
                              importMode === 'merge' ? 'border-indigo-600 bg-indigo-600 text-white' : 'border-slate-300 bg-white'
                            }`}>
                              {importMode === 'merge' && <div className="w-1.5 h-1.5 rounded-full bg-white" />}
                            </div>
                            <div>
                              <div className="font-black text-xs text-indigo-950">
                                ➕ إدخالها مع القديمة (Merge / Add)
                              </div>
                              <div className="text-[11px] text-slate-600 mt-1 leading-normal">
                                الإضافة إلى جانب الحصص والواجبات والملاحظات الموجودة مسبقاً دون حذف.
                              </div>
                            </div>
                          </button>
                        </div>
                      </div>

                      {/* Publish and Cancel Buttons */}
                      <div className="pt-2 flex flex-col sm:flex-row items-center gap-2 border-t border-slate-100">
                        <button
                          id="admin-publish-plan-btn"
                          type="button"
                          disabled={isPublishingPlan}
                          onClick={handlePublishPlan}
                          className="w-full sm:w-auto px-6 py-2.5 rounded-xl text-xs font-black text-white bg-emerald-600 hover:bg-emerald-700 transition-all cursor-pointer shadow-xs inline-flex items-center justify-center gap-2"
                        >
                          {isPublishingPlan ? (
                            <>
                              <Loader2 className="w-4 h-4 animate-spin" />
                              <span>جاري الاعتماد والحفظ في قاعدة البيانات...</span>
                            </>
                          ) : (
                            <>
                              <CheckCircle2 className="w-4 h-4" />
                              <span>اعتماد ونشر الخطة في التطبيق وقاعدة البيانات</span>
                            </>
                          )}
                        </button>

                        <button
                          type="button"
                          onClick={() => setParsedResult(null)}
                          className="w-full sm:w-auto px-4 py-2.5 rounded-xl text-xs font-bold text-slate-600 hover:bg-slate-100 transition-all cursor-pointer text-center"
                        >
                          إلغاء أو إعادة المحاولة
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>

            {/* Top Action Card: Primary Upload Button */}
            <div className="bg-amber-50/60 border border-amber-200/90 rounded-2xl p-4 sm:p-5 shadow-2xs space-y-4">
              <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-amber-500 text-white flex items-center justify-center shadow-xs">
                    <Upload className="w-5 h-5" />
                  </div>
                  <div>
                    <h3 className="text-sm sm:text-base font-black text-amber-950">
                      زر تحميل وتوزيع الـ PDF والروابط على الـ Materials
                    </h3>
                    <p className="text-xs text-amber-800/80 font-medium">
                      اختر الـ Topic والقسم لتحميل ملف PDF أو إضافة رابط إلكتروني / فيديو
                    </p>
                  </div>
                </div>

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
                  <Plus className="w-3.5 h-3.5" />
                  <span>{showUploadForm ? 'إخفاء نموذج الإضافة' : 'إضافة ملف PDF أو رابط جديد'}</span>
                </button>
              </div>

              {/* Upload Form Box (when opened) */}
              {showUploadForm && (
                <div className="pt-3 border-t border-amber-200/80 space-y-4 animate-in fade-in duration-200">
                  {/* Step 0: Choose Type (PDF vs Link) */}
                  <div>
                    <label className="block text-xs font-black text-slate-800 mb-1.5">
                      1. نوع المحتوى المراد إضافته وتوزيعه:
                    </label>
                    <div className="grid grid-cols-2 gap-2">
                      <button
                        type="button"
                        id="admin-choose-type-pdf-btn"
                        onClick={() => setMaterialUploadMode('pdf')}
                        className={`py-2.5 px-3 rounded-xl text-xs font-black border flex items-center justify-center gap-2 transition-all cursor-pointer ${
                          materialUploadMode === 'pdf'
                            ? 'bg-rose-600 text-white border-rose-700 shadow-xs'
                            : 'bg-white text-slate-700 border-slate-200 hover:bg-rose-50/50'
                        }`}
                      >
                        <FileText className="w-4 h-4" />
                        <span>ملف PDF (شيت أو مذكرة)</span>
                      </button>

                      <button
                        type="button"
                        id="admin-choose-type-link-btn"
                        onClick={() => setMaterialUploadMode('link')}
                        className={`py-2.5 px-3 rounded-xl text-xs font-black border flex items-center justify-center gap-2 transition-all cursor-pointer ${
                          materialUploadMode === 'link'
                            ? 'bg-indigo-600 text-white border-indigo-700 shadow-xs'
                            : 'bg-white text-slate-700 border-slate-200 hover:bg-indigo-50/50'
                        }`}
                      >
                        <Link2 className="w-4 h-4" />
                        <span>رابط إلكتروني / فيديو (Link)</span>
                      </button>
                    </div>
                  </div>

                  {/* Step 1: Select Topic */}
                  <div>
                    <label className="block text-xs font-black text-slate-800 mb-1.5">
                      2. أنت عايز تضيف في أي توبيك؟ (اختر الـ Topic):
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
                          توبيك {b}
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Step 2: Select Section */}
                  <div>
                    <label className="block text-xs font-black text-slate-800 mb-1.5">
                      3. عايز تضيف في الـ Main Sheet ولا في ويك معين؟:
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
                      4. تحديد الفصل (المستفيدين):
                    </label>
                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                      {[
                        { id: 'ALL', label: 'كل الفصول (All Classes)' },
                        { id: 'KG1A', label: 'فصل A' },
                        { id: 'KG1B', label: 'فصل B' },
                        { id: 'KG1C', label: 'فصل C' },
                        { id: 'KG1D', label: 'فصل D' },
                        { id: 'KG1E', label: 'فصل E' },
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

                  {/* Step 4: Mode Specific Form (PDF File Input vs Link Input) */}
                  {materialUploadMode === 'pdf' ? (
                    <div>
                      <label className="block text-xs font-black text-slate-800 mb-1.5">
                        5. اختيار ملف الـ PDF المطلوب رفعه:
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
                  ) : (
                    <div className="space-y-3 bg-white p-3.5 rounded-xl border border-indigo-100 shadow-2xs">
                      <div>
                        <label className="block text-xs font-black text-slate-800 mb-1">
                          5. عنوان أو اسم الرابط / الشيت:
                        </label>
                        <input
                          type="text"
                          id="admin-material-link-title"
                          placeholder="مثال: فيديو درس أفراد العائلة - Les membres de ma famille"
                          value={materialLinkTitle}
                          onChange={(e) => setMaterialLinkTitle(e.target.value)}
                          className="w-full text-xs border border-slate-200 rounded-xl p-2.5 focus:ring-2 focus:ring-indigo-500 focus:outline-none font-medium"
                          dir="auto"
                        />
                      </div>

                      <div>
                        <label className="block text-xs font-black text-slate-800 mb-1">
                          رابط الويب (URL) أو فيديو YouTube:
                        </label>
                        <div className="relative">
                          <Globe className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                          <input
                            type="url"
                            id="admin-material-link-url"
                            placeholder="https://www.youtube.com/watch?v=... أو https://example.com"
                            value={materialLinkUrl}
                            onChange={(e) => setMaterialLinkUrl(e.target.value)}
                            className="w-full text-xs border border-slate-200 rounded-xl py-2.5 pr-3 pl-9 focus:ring-2 focus:ring-indigo-500 focus:outline-none font-mono text-left"
                            dir="ltr"
                          />
                        </div>
                      </div>
                    </div>
                  )}

                  {/* Upload / Add Confirm Button */}
                  <div className="pt-2 flex justify-end">
                    <button
                      id="admin-submit-upload-btn"
                      type="button"
                      disabled={isUploading}
                      onClick={handleConfirmUpload}
                      className={`px-5 py-2.5 rounded-xl text-xs font-black text-white shadow-sm flex items-center gap-2 transition-all cursor-pointer ${
                        isUploading
                          ? 'bg-slate-300 cursor-not-allowed'
                          : materialUploadMode === 'pdf'
                          ? 'bg-emerald-600 hover:bg-emerald-700 active:scale-98'
                          : 'bg-indigo-600 hover:bg-indigo-700 active:scale-98'
                      }`}
                    >
                      {materialUploadMode === 'pdf' ? (
                        <Upload className="w-4 h-4" />
                      ) : (
                        <Link2 className="w-4 h-4" />
                      )}
                      <span>
                        {isUploading
                          ? 'جاري الحفظ...'
                          : materialUploadMode === 'pdf'
                          ? `تأكيد رفع PDF في Block ${targetBlock} (${targetSection})`
                          : `تأكيد إضافة الرابط في Block ${targetBlock} (${targetSection})`}
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
                    المحتويات المرفوعة حالياً في Materials ({materials.length})
                  </h3>
                </div>
                {materials.length > 0 && (
                  <button
                    type="button"
                    onClick={async () => {
                      if (window.confirm('هل أنت متأكد من حذف جميع ملفات وروابط الماتيريال؟')) {
                        await clearAllMaterials();
                        setMaterials([]);
                        alert('تم مسح جميع ملفات الماتيريال بنجاح!');
                      }
                    }}
                    className="px-2.5 py-1 text-xs font-bold text-rose-600 hover:text-white bg-rose-50 hover:bg-rose-600 rounded-lg transition-colors border border-rose-200"
                  >
                    مسح جميع ملفات الماتيريال
                  </button>
                )}
                {materials.length === 0 && (
                  <span className="text-[11px] font-bold text-slate-400">
                    يمكنك المعاينة أو الفتح أو الطباعة أو المسح
                  </span>
                )}
              </div>

              {materials.length === 0 ? (
                <div className="py-8 px-4 bg-slate-50 rounded-2xl border border-dashed border-slate-200 text-center space-y-2">
                  <FileText className="w-8 h-8 text-slate-300 mx-auto" />
                  <p className="text-xs text-slate-500 font-bold">
                    لا توجد ملفات أو روابط مرفوعة حتى الآن.
                  </p>
                  <p className="text-[11px] text-slate-400 font-medium">
                    اضغط على زر "إضافة ملف PDF أو رابط جديد" بالأعلى لرفع وتوزيع المواد.
                  </p>
                </div>
              ) : (
                <div className="space-y-2.5">
                  {materials.map((item) => {
                    const isLink = item.type === 'link' || Boolean(item.linkUrl);

                    return (
                      <div
                        key={item.id}
                        className="p-3.5 bg-white border border-slate-200 hover:border-slate-300 rounded-2xl shadow-2xs flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 transition-all"
                      >
                        {/* Left: Info */}
                        <div className="flex items-start gap-3 min-w-0">
                          <div
                            className={`w-9 h-9 rounded-xl border flex items-center justify-center shrink-0 mt-0.5 ${
                              isLink
                                ? 'bg-indigo-50 border-indigo-200 text-indigo-600'
                                : 'bg-rose-50 border-rose-200 text-rose-600'
                            }`}
                          >
                            {isLink ? <ExternalLink className="w-5 h-5" /> : <FileText className="w-5 h-5" />}
                          </div>
                          <div className="min-w-0">
                            <div className="flex items-center gap-2 flex-wrap">
                              <span className="text-xs font-black text-slate-900 truncate">
                                {item.fileName}
                              </span>
                              <span className="text-[10px] font-extrabold bg-amber-100 text-amber-900 px-2 py-0.5 rounded-md">
                                Topic {item.block}
                              </span>
                              <span className="text-[10px] font-extrabold bg-indigo-100 text-indigo-900 px-2 py-0.5 rounded-md">
                                {item.section}
                              </span>
                              <span className="text-[10px] font-bold bg-slate-100 text-slate-700 px-1.5 py-0.5 rounded-md">
                                {item.classId === 'ALL' ? 'كل الفصول' : item.classId}
                              </span>
                              {isLink ? (
                                <span className="text-[10px] font-black bg-indigo-100 text-indigo-900 border border-indigo-200 px-1.5 py-0.5 rounded-md">
                                  رابط إلكتروني 🔗
                                </span>
                              ) : item.storageUrl && (
                                <span className="text-[10px] font-extrabold bg-emerald-100 text-emerald-900 border border-emerald-300 px-1.5 py-0.5 rounded-md">
                                  سحابي ☁️
                                </span>
                              )}
                            </div>
                            <div className="flex items-center gap-3 text-[11px] text-slate-400 font-medium mt-1">
                              {isLink ? (
                                <span className="truncate max-w-[220px] text-indigo-600 font-mono" dir="ltr">
                                  {item.linkUrl || item.storageUrl}
                                </span>
                              ) : (
                                <span>الحجم: {formatBytes(item.fileSize)}</span>
                              )}
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

                        {/* Right: Actions */}
                        <div className="flex items-center gap-1.5 self-end sm:self-center shrink-0">
                          {/* Preview / Open */}
                          <button
                            type="button"
                            id={`admin-preview-${item.id}-btn`}
                            onClick={() => handlePreview(item)}
                            className="p-2 rounded-xl text-indigo-700 bg-indigo-50 hover:bg-indigo-100 border border-indigo-200 transition-colors cursor-pointer"
                            title={isLink ? 'فتح الرابط في صفحة جديدة' : 'معاينة الملف'}
                          >
                            {isLink ? <ExternalLink className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                          </button>

                          {/* Print (Only for PDF) */}
                          {!isLink && (
                            <button
                              type="button"
                              id={`admin-print-${item.id}-btn`}
                              onClick={() => handlePrint(item)}
                              className="p-2 rounded-xl text-slate-700 bg-slate-100 hover:bg-slate-200 border border-slate-200 transition-colors cursor-pointer"
                              title="طباعة الملف"
                            >
                              <Printer className="w-3.5 h-3.5" />
                            </button>
                          )}

                          {/* Download (Only for PDF) */}
                          {!isLink && (
                            <button
                              type="button"
                              id={`admin-download-${item.id}-btn`}
                              onClick={() => handleDownload(item)}
                              className="p-2 rounded-xl text-emerald-700 bg-emerald-50 hover:bg-emerald-100 border border-emerald-200 transition-colors cursor-pointer"
                              title="تحميل الملف"
                            >
                              <Download className="w-3.5 h-3.5" />
                            </button>
                          )}

                          {/* Delete Button (زرار مسح) */}
                          <button
                            type="button"
                            id={`admin-delete-${item.id}-btn`}
                            onClick={() => handleDelete(item)}
                            className="p-2 rounded-xl text-rose-700 bg-rose-50 hover:bg-rose-100 border border-rose-200 transition-colors cursor-pointer"
                            title="مسح وحذف نهائياً"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Supabase Cloud Connection & Persistent Credentials Modal */}
      <SupabaseConfigModal
        isOpen={isSupabaseModalOpen}
        onClose={() => setIsSupabaseModalOpen(false)}
        onSaved={() => {
          setSuccessMessage('تم حفظ إعدادات ومفاتيح Supabase وتحديث الاتصال بنجاح!');
        }}
      />
    </>
  );
};
