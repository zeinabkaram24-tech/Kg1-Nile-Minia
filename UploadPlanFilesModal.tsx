import React, { useState, useRef, useEffect } from 'react';
import { DAYS_LIST } from '../data/defaultData';
import { DayOfWeek, GradeSection, PlanTask, Subject, TaskType, UploadedPlanFile, MaterialItem } from '../types';
import { SubjectIcon } from './SubjectIcon';
import {
  X,
  UploadCloud,
  FileText,
  FileImage,
  Sparkles,
  Check,
  Plus,
  Trash2,
  Calendar,
  Layers,
  FileCheck,
  History,
  AlertCircle,
  Lock,
  ShieldCheck,
  KeyRound,
  FolderOpen,
  BookOpen,
  Eye,
  EyeOff,
  RefreshCw,
  ExternalLink,
  Download,
  Search,
  CheckSquare,
  Square,
  Users,
  Link as LinkIcon,
  FolderUp,
  CalendarPlus,
} from 'lucide-react';
import { verifyAdminPassword, setAdminLoggedIn, isAdminLoggedIn } from '../utils/storage';
import {
  getSavedMaterials,
  addMaterialItem,
  updateMaterialItem,
  deleteMaterialItem,
  deleteMultipleMaterialItems,
  resetToDefaultMaterials,
} from '../utils/materialsStorage';
import { saveMaterialBlob } from '../utils/materialsDb';
import {
  openMaterialSheetInNewTab,
  downloadMaterialSheet,
} from '../utils/sheetPdfViewer';
import { VisitorStatsSummary } from '../types';
import { VisitorStatsPanel } from './VisitorStatsPanel';
import { processTasksAndExtractLinkTasks, extractFirstUrl, parseWeeklyPlanTextWithLinks } from '../utils/urlHelper';
import { extractWeeklyPlanText } from '../utils/planFileParser';

export type AdminUploadTab = 'materials' | 'visitors' | 'weekly_plan' | 'history';

export interface UploadPlanFilesModalProps {
  isOpen: boolean;
  onClose: () => void;
  subjects: Subject[];
  currentWeekTitle: string;
  currentTasks: PlanTask[];
  isAdmin?: boolean;
  onAdminUnlock?: () => void;
  onApplyNewWeeklyPlan: (
    newTasks: PlanTask[],
    newWeekTitle: string,
    mode: 'keep_pending_and_add' | 'replace' | 'append',
    uploadedFiles: UploadedPlanFile[],
    blockNumber: number,
    weekNumber: number,
    targetSection: 'all' | GradeSection,
    setAsCurrent: boolean
  ) => void;
  savedUploadedFiles: UploadedPlanFile[];
  onDeleteSavedUploadedFile?: (fileId: string) => void;
  onDeleteSavedUploadedFiles?: (fileIds: string[]) => void;
  suggestedBlock?: number;
  suggestedWeek?: number;
  initialTab?: AdminUploadTab;
  visitorStats?: VisitorStatsSummary | null;
  onRefreshStats?: () => void;
}

export const UploadPlanFilesModal: React.FC<UploadPlanFilesModalProps> = ({
  isOpen,
  onClose,
  subjects,
  currentWeekTitle,
  currentTasks,
  isAdmin = false,
  onAdminUnlock,
  onApplyNewWeeklyPlan,
  savedUploadedFiles,
  onDeleteSavedUploadedFile,
  onDeleteSavedUploadedFiles,
  suggestedBlock = 1,
  suggestedWeek = 2,
  initialTab = 'materials',
  visitorStats,
  onRefreshStats,
}) => {
  // Admin is fully unlocked if already logged in as admin - no repeated password prompt!
  const [isUnlocked, setIsUnlocked] = useState(() => isAdmin || isAdminLoggedIn());
  const [activeTab, setActiveTab] = useState<AdminUploadTab>(initialTab || 'materials');
  const [matInputMode, setMatInputMode] = useState<'link' | 'file'>('link');

  useEffect(() => {
    if (isOpen) {
      if (initialTab) {
        setActiveTab(initialTab);
      }
      if (isAdmin || isAdminLoggedIn()) {
        setIsUnlocked(true);
      }
    }
  }, [isOpen, initialTab, isAdmin]);

  // Multi-selection states for bulk deletion
  const [selectedMaterialIds, setSelectedMaterialIds] = useState<Set<string>>(new Set());
  const [selectedHistoryFileIds, setSelectedHistoryFileIds] = useState<Set<string>>(new Set());
  const [selectedTaskIndices, setSelectedTaskIndices] = useState<Set<number>>(new Set());

  // Weekly plan upload state
  const [blockNumber, setBlockNumber] = useState<number>(suggestedBlock);
  const [weekNumber, setWeekNumber] = useState<number>(suggestedWeek);
  const [targetSection, setTargetSection] = useState<'all' | GradeSection>('all');
  const [setAsCurrent, setSetAsCurrent] = useState<boolean>(true);

  const [weekTitle, setWeekTitle] = useState(() => {
    return `Week ${suggestedWeek} Plan (Block ${suggestedBlock} - Week ${suggestedWeek})`;
  });

  const [selectedSubjectId, setSelectedSubjectId] = useState<string>('all');
  const [updateMode, setUpdateMode] = useState<'keep_pending_and_add' | 'replace' | 'append'>('keep_pending_and_add');
  const [dragActive, setDragActive] = useState(false);
  const [uploadedFilesList, setUploadedFilesList] = useState<UploadedPlanFile[]>([]);
  const [generatedTasks, setGeneratedTasks] = useState<Omit<PlanTask, 'id' | 'createdAt'>[]>([]);

  // Manual task addition in weekly plan
  const [isManualTaskFormOpen, setIsManualTaskFormOpen] = useState(false);
  const [manualTitle, setManualTitle] = useState('');
  const [manualSubjectId, setManualSubjectId] = useState('math');
  const [manualDay, setManualDay] = useState<DayOfWeek>('sunday');
  const [manualType, setManualType] = useState<TaskType>('homework');
  const [manualDetails, setManualDetails] = useState('');

  // Smart text paste for plan
  const [smartPlanText, setSmartPlanText] = useState('');
  const [isSmartTextPlanOpen, setIsSmartTextPlanOpen] = useState(false);

  // Materials & Sheets upload state
  const [materialsList, setMaterialsList] = useState<MaterialItem[]>([]);
  const [matTitle, setMatTitle] = useState('');
  const [matSubjectId, setMatSubjectId] = useState('science');
  const [matCategory, setMatCategory] = useState<'main_sheets' | 'week1' | 'week2' | 'week3'>('main_sheets');
  const [matBlock, setMatBlock] = useState<number>(1);
  const [matSection, setMatSection] = useState<'all' | GradeSection>('all');
  const [matUnit, setMatUnit] = useState('');
  const [matPageCount, setMatPageCount] = useState('');
  const [matFileName, setMatFileName] = useState('');
  const [matFileUrl, setMatFileUrl] = useState('');
  const [matFileData, setMatFileData] = useState<string | null>(null);
  const [matFileType, setMatFileType] = useState<string>('');
  const [selectedMatFile, setSelectedMatFile] = useState<File | null>(null);
  const [matExercisesText, setMatExercisesText] = useState('');
  const [matNotes, setMatNotes] = useState('');
  const [matSuccessMsg, setMatSuccessMsg] = useState<string | null>(null);
  const [historySuccessMsg, setHistorySuccessMsg] = useState<string | null>(null);
  const [matSearchQuery, setMatSearchQuery] = useState('');
  const [matFilterCategory, setMatFilterCategory] = useState<string>('all');
  const [downloadingMatId, setDownloadingMatId] = useState<string | null>(null);
  const [lastAddedMat, setLastAddedMat] = useState<MaterialItem | null>(null);

  // Confirmation state for reset
  const [isResetMaterialsConfirm, setIsResetMaterialsConfirm] = useState(false);

  // Admin lock inline auth
  const [adminPinInput, setAdminPinInput] = useState('');
  const [showAdminPin, setShowAdminPin] = useState(false);
  const [adminPinError, setAdminPinError] = useState<string | null>(null);

  const fileInputRef = useRef<HTMLInputElement>(null);
  const matFileInputRef = useRef<HTMLInputElement>(null);

  // Reset and sync state whenever the modal opens
  useEffect(() => {
    if (isOpen) {
      if (isAdmin || isAdminLoggedIn()) {
        setIsUnlocked(true);
      } else {
        setIsUnlocked(false);
      }
      setAdminPinInput('');
      setAdminPinError(null);
      setShowAdminPin(false);
      setMaterialsList(getSavedMaterials());
      setSelectedMaterialIds(new Set());
      setSelectedHistoryFileIds(new Set());
      setSelectedTaskIndices(new Set());
      setMatSuccessMsg(null);
      setHistorySuccessMsg(null);
    }
  }, [isOpen, isAdmin]);

  if (!isOpen) return null;

  const handleUnlockAdmin = (e: React.FormEvent) => {
    e.preventDefault();
    if (verifyAdminPassword(adminPinInput)) {
      setIsUnlocked(true);
      setAdminLoggedIn(true);
      setAdminPinError(null);
      if (onAdminUnlock) onAdminUnlock();
    } else {
      setAdminPinError('رمز المرور غير صحيح. يرجى إعادة المحاولة.');
    }
  };

  const handleBlockWeekChange = (newBlock: number, newWeek: number) => {
    setBlockNumber(newBlock);
    setWeekNumber(newWeek);
    setWeekTitle(`Week ${newWeek} Plan (Block ${newBlock} - Week ${newWeek})`);
  };

  const subjectMap = new Map<string, Subject>();
  subjects.forEach((s) => subjectMap.set(s.id, s));

  // Handle files selection for Weekly Plan
  const handleFiles = async (files: FileList | null) => {
    if (!files || files.length === 0) return;

    const newFiles: UploadedPlanFile[] = [];
    const newGeneratedTasks: Omit<PlanTask, 'id' | 'createdAt'>[] = [];

    await Promise.all(Array.from(files).map(async (file, index) => {
      const fileId = `file-${Date.now()}-${index}`;
      const fileNameLower = file.name.toLowerCase();

      let guessedSubjectId = selectedSubjectId !== 'all' ? selectedSubjectId : 'math';
      if (fileNameLower.includes('math') || fileNameLower.includes('حساب') || fileNameLower.includes('رياضيات')) {
        guessedSubjectId = 'math';
      } else if (fileNameLower.includes('sci') || fileNameLower.includes('علوم') || fileNameLower.includes('discover')) {
        guessedSubjectId = 'science';
      } else if (fileNameLower.includes('eng') || fileNameLower.includes('connect') || fileNameLower.includes('انجليزي')) {
        guessedSubjectId = 'english';
      } else if (fileNameLower.includes('arab') || fileNameLower.includes('عربي') || fileNameLower.includes('لغة عربية')) {
        guessedSubjectId = 'arabic';
      } else if (fileNameLower.includes('fren') || fileNameLower.includes('fr') || fileNameLower.includes('فرنساوي')) {
        guessedSubjectId = 'french';
      } else if (fileNameLower.includes('comp') || fileNameLower.includes('ict') || fileNameLower.includes('حاسب')) {
        guessedSubjectId = 'computer';
      }

      let extractedCount = 0;
      try {
        const rawText = await extractWeeklyPlanText(file);
        const extracted = parseWeeklyPlanTextWithLinks(
          rawText,
          'sunday',
          subjects,
          targetSection === 'all' ? undefined : targetSection
        );
        if (extracted.length > 0) {
          extractedCount = extracted.length;
          newGeneratedTasks.push(...extracted.map(({ id, createdAt, ...task }) => ({
            ...task,
            subjectId: task.subjectId || guessedSubjectId,
          })));
        }
      } catch (error) {
        console.warn('Could not extract weekly plan file; using a visible fallback task:', error);
      }

      newFiles.push({
        id: fileId,
        name: file.name,
        size: file.size,
        type: file.type || 'application/octet-stream',
        uploadDate: Date.now(),
        weekName: weekTitle,
        subjectId: guessedSubjectId,
        extractedTaskCount: extractedCount,
      });

      if (extractedCount === 0) {
        const dayKeys: DayOfWeek[] = ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday'];
        const targetDay = dayKeys[index % dayKeys.length];
        newGeneratedTasks.push({
          subjectId: guessedSubjectId,
          day: targetDay,
          type: 'homework' as TaskType,
          title: `مهمة أسبوعية من ملف: ${file.name.replace(/\.[^/.]+$/, '')}`,
          details: `تم رفع الملف بالكامل، ولم يتم العثور على نص قابل للاستخراج تلقائياً. (Block ${blockNumber} - Week ${weekNumber})`,
          isDone: false,
          section: targetSection === 'all' ? undefined : targetSection,
        });
      }
    }));

    setUploadedFilesList((prev) => [...prev, ...newFiles]);
    setGeneratedTasks((prev) => [...prev, ...newGeneratedTasks]);
  };

  const handleDrag = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === 'dragenter' || e.type === 'dragover') {
      setDragActive(true);
    } else if (e.type === 'dragleave') {
      setDragActive(false);
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      handleFiles(e.dataTransfer.files);
    }
  };

  const handleApply = () => {
    const formatted: PlanTask[] = generatedTasks.map((t, idx) => ({
      ...t,
      section: targetSection === 'all' ? undefined : targetSection,
      id: `task-uploaded-${Date.now()}-${idx}`,
      createdAt: Date.now(),
    }));

    // Automatically convert any URL / link in tasks into separate actionable tasks:
    // 'استماع / مشاهدة الرابط التالي: [اسم المادة أو الدرس]'
    const tasksWithLinkItems = processTasksAndExtractLinkTasks(formatted, subjects);

    onApplyNewWeeklyPlan(
      tasksWithLinkItems,
      weekTitle,
      updateMode,
      uploadedFilesList,
      blockNumber,
      weekNumber,
      targetSection,
      setAsCurrent
    );
    onClose();
  };

  // Materials Handlers
  const handleMatFileSelected = (files: FileList | null) => {
    if (!files || files.length === 0) return;
    const file = files[0];
    setMatFileName(file.name);
    setSelectedMatFile(file);
    setMatFileType(file.type || (file.name.endsWith('.pdf') ? 'application/pdf' : ''));
    if (!matTitle) {
      const cleanName = file.name.replace(/\.[^/.]+$/, '').replace(/[-_]/g, ' ');
      setMatTitle(cleanName);
    }

    // Read file as Data URL
    try {
      const reader = new FileReader();
      reader.onload = () => {
        if (typeof reader.result === 'string') {
          setMatFileData(reader.result);
        }
      };
      reader.readAsDataURL(file);
    } catch (err) {
      console.warn('Error reading material file data:', err);
    }
  };

  const handleAttachFileToExistingMaterial = async (matId: string, files: FileList | null) => {
    if (!files || files.length === 0) return;
    const file = files[0];
    await saveMaterialBlob(matId, file);

    let finalFileUrl: string | undefined = undefined;
    try {
      const formData = new FormData();
      formData.append('file', file);
      const res = await fetch('/api/materials/upload', {
        method: 'POST',
        body: formData,
      });
      if (res.ok) {
        const data = await res.json();
        if (data.fileUrl) finalFileUrl = data.fileUrl;
      }
    } catch {
      // Ignore
    }

    updateMaterialItem(matId, {
      fileName: file.name,
      fileUrl: finalFileUrl || `/api/materials/file/${encodeURIComponent(file.name)}`,
      fileType: file.type || (file.name.toLowerCase().endsWith('.pdf') ? 'application/pdf' : undefined),
    });
    setMaterialsList(getSavedMaterials());
    setMatSuccessMsg(`تم بنجاح حفظ وإرفاق ملف PDF الأصلي للشيت: ${file.name}`);
    setTimeout(() => setMatSuccessMsg(null), 4000);
  };

  const handleAddMaterial = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!matTitle.trim()) return;

    let categoryLabel = 'Main Sheets';
    if (matCategory === 'week1') categoryLabel = 'Week 1';
    else if (matCategory === 'week2') categoryLabel = 'Week 2';
    else if (matCategory === 'week3') categoryLabel = 'Week 3';

    const exercises = matExercisesText
      .split('\n')
      .map((s) => s.trim())
      .filter(Boolean);

    const detectedType =
      selectedMatFile?.type ||
      (matFileName.toLowerCase().endsWith('.pdf') ? 'application/pdf' : matFileType || undefined);

    let finalFileUrl = matFileUrl.trim() || undefined;
    let finalFileName = matFileName.trim() || selectedMatFile?.name || undefined;

    if (matInputMode === 'link') {
      if (!finalFileUrl) {
        alert('يرجى إدخال رابط الملف (Google Drive أو OneDrive أو أي رابط مباشر) لإدراج الشيت.');
        return;
      }
      if (!finalFileName) {
        finalFileName = `${matTitle.trim()}.pdf`;
      }
    }

    // Direct server upload for 100% binary preservation if a local file is chosen
    if (selectedMatFile) {
      try {
        const formData = new FormData();
        formData.append('file', selectedMatFile);
        formData.append('title', matTitle.trim());
        formData.append('subjectId', matSubjectId);

        const res = await fetch('/api/materials/upload', {
          method: 'POST',
          body: formData,
        });
        if (res.ok) {
          const data = await res.json();
          if (data.fileUrl) finalFileUrl = data.fileUrl;
          if (data.fileName) finalFileName = data.fileName;
        }
      } catch (uploadErr) {
        console.warn('Server upload notice:', uploadErr);
      }
    }

    const newMat = addMaterialItem({
      title: matTitle.trim(),
      subjectId: matSubjectId,
      blockNumber: matBlock,
      category: matCategory,
      categoryLabel,
      itemType: 'sheet',
      fileName: finalFileName,
      fileUrl: finalFileUrl || (finalFileName ? `/api/materials/file/${encodeURIComponent(finalFileName)}` : undefined),
      fileData: undefined, // Prevent localStorage quota bloat
      fileType: detectedType,
      unitTitle: matUnit.trim() || undefined,
      pageCount: matPageCount.trim() ? Number(matPageCount) || undefined : undefined,
      contentPreview: exercises.length > 0 ? { type: 'exercises', items: exercises } : undefined,
      notes: matNotes.trim() || undefined,
      section: matSection,
    });

    // Save actual original file blob in IndexedDB for permanent local storage
    if (selectedMatFile) {
      await saveMaterialBlob(newMat.id, selectedMatFile);
    }

    const updated = getSavedMaterials();
    setMaterialsList(updated);
    setLastAddedMat(newMat);
    setMatSuccessMsg(`تم بنجاح حفظ وإدراج الشيت "${newMat.title}" بنفس صيغته وتنسيقه وألوانه الأصلية 100%.`);
    setMatTitle('');
    setMatFileName('');
    setMatFileUrl('');
    setMatFileData(null);
    setMatFileType('');
    setSelectedMatFile(null);
    setMatUnit('');
    setMatPageCount('');
    setMatExercisesText('');
    setMatNotes('');
    setTimeout(() => setMatSuccessMsg(null), 8000);
  };

  // Safe direct download of a material sheet for admin
  const handleAdminDownloadSheet = async (mat: MaterialItem) => {
    setDownloadingMatId(mat.id);
    try {
      await downloadMaterialSheet(mat);
      setMatSuccessMsg(`تم بدء تنزيل الشيت "${mat.title}" (${mat.fileName || 'PDF'}) على جهازك.`);
      setTimeout(() => setMatSuccessMsg(null), 4000);
    } catch (err) {
      console.error('Error in handleAdminDownloadSheet:', err);
      alert('حدث خطأ أثناء تنزيل الشيت، يرجى المحاولة مرة أخرى.');
    } finally {
      setTimeout(() => setDownloadingMatId(null), 1000);
    }
  };

  // Safe batch download for selected sheets
  const handleDownloadSelectedMaterials = async () => {
    if (selectedMaterialIds.size === 0) return;
    const selectedMats = materialsList.filter((m) => selectedMaterialIds.has(m.id));
    setMatSuccessMsg(`جاري تنزيل (${selectedMats.length}) شيتات محددة بالتتابع بنفس تنسيقها الأصلي...`);
    for (let i = 0; i < selectedMats.length; i++) {
      await downloadMaterialSheet(selectedMats[i]);
      if (i < selectedMats.length - 1) {
        await new Promise((resolve) => setTimeout(resolve, 600));
      }
    }
    setMatSuccessMsg(`تم الانتهاء من تنزيل الشيتات المحددة بنجاح.`);
    setTimeout(() => setMatSuccessMsg(null), 5000);
  };

  // Safe download for history file
  const handleDownloadHistoryFile = (f: { name: string; fileUrl?: string; fileData?: string }) => {
    try {
      if (f.fileUrl) {
        const downloadUrl = f.fileUrl.startsWith('/api/materials/file/')
          ? f.fileUrl.replace('/api/materials/file/', '/api/materials/download/')
          : f.fileUrl.startsWith('http') || f.fileUrl.startsWith('/')
          ? f.fileUrl
          : `/api/materials/download/${encodeURIComponent(f.fileUrl)}`;
        const a = document.createElement('a');
        a.href = downloadUrl;
        a.download = f.name;
        document.body.appendChild(a);
        a.click();
        setTimeout(() => {
          if (document.body.contains(a)) document.body.removeChild(a);
        }, 1000);
      } else if (f.fileData) {
        const a = document.createElement('a');
        a.href = f.fileData;
        a.download = f.name;
        document.body.appendChild(a);
        a.click();
        setTimeout(() => {
          if (document.body.contains(a)) document.body.removeChild(a);
        }, 1000);
      } else {
        const blob = new Blob([f.name], { type: 'text/plain;charset=utf-8' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = f.name.endsWith('.txt') ? f.name : `${f.name}.txt`;
        document.body.appendChild(a);
        a.click();
        setTimeout(() => {
          if (document.body.contains(a)) document.body.removeChild(a);
          URL.revokeObjectURL(url);
        }, 60000);
      }
    } catch (err) {
      console.error('Error downloading history file:', err);
    }
  };

  const handleAddManualTask = (e: React.FormEvent) => {
    e.preventDefault();
    if (!manualTitle.trim()) return;

    const tempTask: PlanTask = {
      id: `manual-temp-${Date.now()}`,
      title: manualTitle.trim(),
      subjectId: manualSubjectId,
      day: manualDay,
      type: manualType,
      details: manualDetails.trim() || undefined,
      isDone: false,
      section: targetSection === 'all' ? undefined : targetSection,
      createdAt: Date.now(),
    };

    // Extract any links into separate tasks
    const expanded = processTasksAndExtractLinkTasks([tempTask], subjects);
    const cleaned: Omit<PlanTask, 'id' | 'createdAt'>[] = expanded.map(({ id, createdAt, ...rest }) => rest);

    setGeneratedTasks((prev) => [...prev, ...cleaned]);
    setManualTitle('');
    setManualDetails('');
    setIsManualTaskFormOpen(false);
  };

  const handleExtractFromPlanText = () => {
    if (!smartPlanText.trim()) return;
    const extracted = parseWeeklyPlanTextWithLinks(
      smartPlanText,
      'sunday',
      subjects,
      targetSection === 'all' ? undefined : targetSection
    );
    if (extracted.length > 0) {
      const cleaned: Omit<PlanTask, 'id' | 'createdAt'>[] = extracted.map(({ id, createdAt, ...rest }) => rest);
      setGeneratedTasks((prev) => [...prev, ...cleaned]);
      setSmartPlanText('');
      setIsSmartTextPlanOpen(false);
    }
  };

  // Direct and Multi-select Material deletion
  const handleDeleteMaterialDirect = (id: string, title: string) => {
    deleteMaterialItem(id);
    const updated = getSavedMaterials();
    setMaterialsList(updated);
    setSelectedMaterialIds((prev) => {
      const next = new Set(prev);
      next.delete(id);
      return next;
    });
    setMatSuccessMsg(`تم حذف الشيت "${title}" بنجاح.`);
    setTimeout(() => setMatSuccessMsg(null), 4000);
  };

  const handleDeleteSelectedMaterials = () => {
    if (selectedMaterialIds.size === 0) return;
    const count = selectedMaterialIds.size;
    deleteMultipleMaterialItems(Array.from(selectedMaterialIds));
    const updated = getSavedMaterials();
    setMaterialsList(updated);
    setSelectedMaterialIds(new Set());
    setMatSuccessMsg(`تم حذف (${count}) شيتات محددة بنجاح.`);
    setTimeout(() => setMatSuccessMsg(null), 4000);
  };

  const toggleSelectMaterial = (id: string) => {
    setSelectedMaterialIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const toggleSelectAllMaterials = () => {
    if (selectedMaterialIds.size === filteredMaterials.length) {
      setSelectedMaterialIds(new Set());
    } else {
      setSelectedMaterialIds(new Set(filteredMaterials.map((m) => m.id)));
    }
  };

  const handleResetMaterials = () => {
    setIsResetMaterialsConfirm(true);
  };

  const confirmResetMaterials = () => {
    const def = resetToDefaultMaterials();
    setMaterialsList(def);
    setIsResetMaterialsConfirm(false);
    setSelectedMaterialIds(new Set());
    setMatSuccessMsg('تم مسح وتفريغ كافة شيتات الماتيريال بنجاح.');
    setTimeout(() => setMatSuccessMsg(null), 4000);
  };

  // Direct and Multi-select History File deletion
  const handleDeleteHistoryFileDirect = (id: string, name: string) => {
    if (onDeleteSavedUploadedFiles) {
      onDeleteSavedUploadedFiles([id]);
    } else if (onDeleteSavedUploadedFile) {
      onDeleteSavedUploadedFile(id);
    }
    setSelectedHistoryFileIds((prev) => {
      const next = new Set(prev);
      next.delete(id);
      return next;
    });
    setHistorySuccessMsg(`تم حذف الملف "${name}" من السجل بنجاح.`);
    setTimeout(() => setHistorySuccessMsg(null), 4000);
  };

  const handleDeleteSelectedHistoryFiles = () => {
    if (selectedHistoryFileIds.size === 0) return;
    const count = selectedHistoryFileIds.size;
    const ids = Array.from(selectedHistoryFileIds);
    if (onDeleteSavedUploadedFiles) {
      onDeleteSavedUploadedFiles(ids);
    } else if (onDeleteSavedUploadedFile) {
      ids.forEach((id) => onDeleteSavedUploadedFile(id));
    }
    setSelectedHistoryFileIds(new Set());
    setHistorySuccessMsg(`تم حذف (${count}) ملفات محددة من السجل بنجاح.`);
    setTimeout(() => setHistorySuccessMsg(null), 4000);
  };

  const toggleSelectHistoryFile = (id: string) => {
    setSelectedHistoryFileIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const toggleSelectAllHistoryFiles = () => {
    if (selectedHistoryFileIds.size === savedUploadedFiles.length) {
      setSelectedHistoryFileIds(new Set());
    } else {
      setSelectedHistoryFileIds(new Set(savedUploadedFiles.map((f) => f.id)));
    }
  };

  // Weekly plan task remove & multi-delete
  const handleRemoveTask = (index: number) => {
    setGeneratedTasks((prev) => prev.filter((_, i) => i !== index));
    setSelectedTaskIndices((prev) => {
      const next = new Set<number>();
      prev.forEach((idx) => {
        if (idx < index) next.add(idx);
        else if (idx > index) next.add(idx - 1);
      });
      return next;
    });
  };

  const handleDeleteSelectedTasks = () => {
    if (selectedTaskIndices.size === 0) return;
    setGeneratedTasks((prev) => prev.filter((_, i) => !selectedTaskIndices.has(i)));
    setSelectedTaskIndices(new Set());
  };

  const toggleSelectTask = (index: number) => {
    setSelectedTaskIndices((prev) => {
      const next = new Set(prev);
      if (next.has(index)) next.delete(index);
      else next.add(index);
      return next;
    });
  };

  const toggleSelectAllTasks = () => {
    if (selectedTaskIndices.size === generatedTasks.length) {
      setSelectedTaskIndices(new Set());
    } else {
      setSelectedTaskIndices(new Set(generatedTasks.map((_, i) => i)));
    }
  };

  // Filter materials in admin manager
  const filteredMaterials = materialsList.filter((m) => {
    if (m.subjectId === 'religion') return false;
    if (matFilterCategory !== 'all' && m.category !== matFilterCategory) return false;
    if (matSearchQuery.trim()) {
      const q = matSearchQuery.toLowerCase().trim();
      const matchTitle = m.title.toLowerCase().includes(q);
      const matchSubject = (subjectMap.get(m.subjectId)?.nameAr || m.subjectId).toLowerCase().includes(q);
      if (!matchTitle && !matchSubject) return false;
    }
    return true;
  });

  return (
    <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-3 sm:p-5 overflow-y-auto animate-fadeIn">
      <div className="bg-white rounded-3xl w-full max-w-4xl shadow-2xl border border-slate-100 my-4 flex flex-col max-h-[92vh] overflow-hidden">
        
        {/* Header */}
        <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between bg-slate-50/80">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-indigo-600 text-white flex items-center justify-center font-bold shadow-sm">
              <UploadCloud className="w-5 h-5 stroke-[2.25]" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-lg sm:text-xl font-black text-slate-900">
                  مركز رفع وتحميل الملفات والماتيريال (Admin Center)
                </h3>
                <span className="text-xs px-2.5 py-0.5 rounded-full bg-indigo-100 text-indigo-800 font-bold font-sans">
                  Admin Only 🔒
                </span>
              </div>
              <p className="text-xs text-slate-500">
                إدارة ورفع الخطط الأسبوعية وشيتات المواد الرسمية (مقتصر على الأدمن فقط)
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            {isUnlocked && (
              <div className="bg-slate-200/80 p-1 rounded-xl flex items-center text-xs font-bold font-sans flex-wrap gap-1">
                <button
                  type="button"
                  id="modal-tab-weekly-plan"
                  onClick={() => setActiveTab('weekly_plan')}
                  className={`px-3 py-1.5 rounded-lg transition-all cursor-pointer flex items-center gap-1.5 ${
                    activeTab === 'weekly_plan' ? 'bg-indigo-600 text-white shadow-xs font-bold' : 'text-slate-700 hover:text-indigo-700'
                  }`}
                >
                  <CalendarPlus className="w-4 h-4" />
                  <span>الخطة الأسبوعية (Weekly Plan)</span>
                </button>
                <button
                  type="button"
                  id="modal-tab-materials"
                  onClick={() => setActiveTab('materials')}
                  className={`px-3 py-1.5 rounded-lg transition-all cursor-pointer flex items-center gap-1.5 ${
                    activeTab === 'materials' ? 'bg-emerald-600 text-white shadow-xs font-bold' : 'text-slate-700 hover:text-emerald-700'
                  }`}
                >
                  <FolderUp className="w-4 h-4" />
                  <span>Materials ({materialsList.length})</span>
                </button>
                <button
                  type="button"
                  onClick={() => setActiveTab('visitors')}
                  className={`px-2.5 py-1.5 rounded-lg transition-all cursor-pointer flex items-center gap-1 text-[11px] ${
                    activeTab === 'visitors' ? 'bg-white text-slate-800 shadow-2xs font-bold' : 'text-slate-500 hover:text-slate-800'
                  }`}
                >
                  <Users className="w-3.5 h-3.5" />
                  <span>الزوار</span>
                </button>
                <button
                  type="button"
                  onClick={() => setActiveTab('history')}
                  className={`px-2.5 py-1.5 rounded-lg transition-all cursor-pointer flex items-center gap-1 text-[11px] ${
                    activeTab === 'history' ? 'bg-white text-slate-800 shadow-2xs font-bold' : 'text-slate-500 hover:text-slate-800'
                  }`}
                >
                  <History className="w-3.5 h-3.5" />
                  <span>السجل</span>
                </button>
              </div>
            )}

            <button
              type="button"
              onClick={onClose}
              className="p-2 rounded-xl text-slate-400 hover:text-slate-700 hover:bg-slate-200 transition-colors cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* If user is not Unlocked: ALWAYS show admin password gate as the first page! */}
        {!isUnlocked ? (
          <div className="p-8 sm:p-12 text-center space-y-6 flex-1 flex flex-col items-center justify-center bg-[#F8FAFC]">
            <div className="w-20 h-20 rounded-3xl bg-amber-50 border-2 border-amber-200 flex items-center justify-center shadow-xs">
              <Lock className="w-10 h-10 text-amber-600" />
            </div>

            <div className="max-w-md space-y-2">
              <h4 className="text-xl font-black text-slate-900">
                تسجيل دخول الأدمن 🔒
              </h4>
              <p className="text-xs text-slate-600 leading-relaxed">
                مركز إدارة ورفع الخطط الأسبوعية وشيتات المواد مخصص للمشرف العام فقط.
                يرجى إدخال رمز المرور للمتابعة والوصول لكافة خيارات الإضافة والحذف المتعدد.
              </p>
            </div>

            <form onSubmit={handleUnlockAdmin} className="w-full max-w-sm space-y-3.5">
              <div className="relative">
                <KeyRound className="w-4 h-4 text-slate-400 absolute start-3.5 top-1/2 -translate-y-1/2" />
                <input
                  type={showAdminPin ? 'text' : 'password'}
                  value={adminPinInput}
                  onChange={(e) => {
                    setAdminPinInput(e.target.value);
                    setAdminPinError(null);
                  }}
                  placeholder="أدخل رمز مرور الأدمن..."
                  className="w-full ps-10 pe-11 py-3.5 rounded-2xl border border-slate-300 focus:outline-hidden focus:ring-2 focus:ring-indigo-500 text-sm font-bold text-center tracking-wider bg-white shadow-xs"
                  autoFocus
                />
                <button
                  type="button"
                  onClick={() => setShowAdminPin(!showAdminPin)}
                  className="p-1.5 rounded-lg text-slate-400 hover:text-slate-700 absolute end-2.5 top-1/2 -translate-y-1/2 transition-colors cursor-pointer"
                  title={showAdminPin ? 'إخفاء الرمز' : 'إظهار الرمز'}
                >
                  {showAdminPin ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>

              {adminPinError && (
                <div className="p-2.5 rounded-xl bg-rose-50 border border-rose-200 text-xs text-rose-700 font-bold flex items-center justify-center gap-1.5">
                  <AlertCircle className="w-4 h-4 shrink-0 text-rose-600" />
                  <span>{adminPinError}</span>
                </div>
              )}

              <button
                type="submit"
                className="w-full py-3.5 rounded-2xl bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold transition-all shadow-md shadow-indigo-200 flex items-center justify-center gap-2 cursor-pointer active:scale-98"
              >
                <ShieldCheck className="w-4 h-4" />
                <span>دخول مركز الإدارة</span>
              </button>
            </form>
          </div>
        ) : activeTab === 'weekly_plan' ? (
          /* ========================================================================= */
          /* TAB 1: WEEKLY PLAN UPLOAD & TASK GENERATOR                                */
          /* ========================================================================= */
          <div className="overflow-y-auto p-5 sm:p-6 space-y-5 flex-1">
            {/* Block & Week Selector Fields */}
            <div className="p-4 rounded-2xl bg-indigo-50/70 border border-indigo-200/80 space-y-3">
              <div className="flex items-center gap-2">
                <Layers className="w-4 h-4 text-indigo-700 stroke-[2.25]" />
                <span className="text-xs font-black text-indigo-900">
                  تحديد البلوك والأسبوع المستهدف بالخطة (Block & Week):
                </span>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs">
                <div>
                  <label className="block text-[11px] font-bold text-slate-700 mb-1">
                    رقم البلوك (Block Number):
                  </label>
                  <select
                    value={blockNumber}
                    onChange={(e) => handleBlockWeekChange(Number(e.target.value), weekNumber)}
                    className="w-full px-3 py-2 rounded-xl border border-slate-300 bg-white font-bold text-slate-800"
                  >
                    {[1, 2, 3, 4, 5, 6].map((b) => (
                      <option key={b} value={b}>
                        Block {b}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-[11px] font-bold text-slate-700 mb-1">
                    رقم الأسبوع (Week Number):
                  </label>
                  <select
                    value={weekNumber}
                    onChange={(e) => handleBlockWeekChange(blockNumber, Number(e.target.value))}
                    className="w-full px-3 py-2 rounded-xl border border-slate-300 bg-white font-bold text-slate-800"
                  >
                    {[1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12].map((w) => (
                      <option key={w} value={w}>
                        Week {w}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-[11px] font-bold text-slate-700 mb-1">
                    الفصل المستهدف (Target Section):
                  </label>
                  <select
                    value={targetSection}
                    onChange={(e) => setTargetSection(e.target.value as 'all' | GradeSection)}
                    className="w-full px-3 py-2 rounded-xl border border-slate-300 bg-white font-bold text-slate-800"
                  >
                    <option value="all">جميع الفصول (2A, 2B, 2C معاً)</option>
                    <option value="2A">فصل 2A فقط</option>
                    <option value="2B">فصل 2B فقط</option>
                    <option value="2C">فصل 2C فقط</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-[11px] font-bold text-slate-700 mb-1">
                  عنوان الخطة الأسبوعية (Week Title):
                </label>
                <input
                  type="text"
                  value={weekTitle}
                  onChange={(e) => setWeekTitle(e.target.value)}
                  className="w-full px-3.5 py-2 rounded-xl border border-slate-300 bg-white font-bold text-xs text-slate-900"
                />
              </div>

              <div className="pt-1 flex items-center gap-2">
                <input
                  type="checkbox"
                  id="set-as-current"
                  checked={setAsCurrent}
                  onChange={(e) => setSetAsCurrent(e.target.checked)}
                  className="rounded-md border-slate-300 text-indigo-600 focus:ring-indigo-500 w-4 h-4 cursor-pointer"
                />
                <label htmlFor="set-as-current" className="text-xs font-bold text-slate-800 cursor-pointer">
                  تعيين هذا الأسبوع كـ "الأسبوع الحالي المباشر" في التطبيق فوراً
                </label>
              </div>
            </div>

            {/* Drag and Drop Zone */}
            <div
              onDragEnter={handleDrag}
              onDragLeave={handleDrag}
              onDragOver={handleDrag}
              onDrop={handleDrop}
              onClick={() => fileInputRef.current?.click()}
              className={`p-6 border-2 border-dashed rounded-3xl text-center cursor-pointer transition-all ${
                dragActive
                  ? 'border-indigo-500 bg-indigo-50/50 scale-[0.99]'
                  : 'border-slate-300 hover:border-indigo-400 bg-slate-50/50 hover:bg-slate-50'
              }`}
            >
              <input
                ref={fileInputRef}
                type="file"
                multiple
                accept=".pdf,.png,.jpg,.jpeg,.doc,.docx"
                className="hidden"
                onChange={(e) => handleFiles(e.target.files)}
              />

              <div className="w-12 h-12 rounded-2xl bg-indigo-100 text-indigo-600 flex items-center justify-center mx-auto mb-3">
                <UploadCloud className="w-6 h-6" />
              </div>

              <h4 className="text-sm font-bold text-slate-800 mb-1">
                اضغط لاختيار ملفات خطة الأسبوع أو اسحبها وأفلتها هنا
              </h4>
              <p className="text-xs text-slate-500 max-w-md mx-auto">
                يدعم صور ومستندات الويكلي بلان (PDF, JPG, PNG, DOCX) لجميع المواد
              </p>
            </div>

            {/* Manual Task Add Option */}
            <div className="bg-indigo-50/40 border border-indigo-100 rounded-2xl p-4 space-y-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <div className="w-6 h-6 rounded-lg bg-indigo-600 text-white flex items-center justify-center">
                    <Plus className="w-3.5 h-3.5" />
                  </div>
                  <span className="text-xs font-bold text-slate-800">
                    إضافة مهمة للأسبوع يدوياً (اختياري بجانب الملفات):
                  </span>
                </div>
                <button
                  type="button"
                  onClick={() => setIsManualTaskFormOpen(!isManualTaskFormOpen)}
                  className="px-3 py-1 rounded-lg bg-white hover:bg-slate-50 border border-slate-200 text-xs font-bold text-indigo-700 shadow-2xs transition-colors cursor-pointer"
                >
                  {isManualTaskFormOpen ? 'إغلاق النموذج' : '+ إضافة مهمة يدوياً'}
                </button>
              </div>

              {isManualTaskFormOpen && (
                <form onSubmit={handleAddManualTask} className="pt-2 border-t border-indigo-100 space-y-3 text-xs">
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                    <div>
                      <label className="block text-[11px] font-bold text-slate-700 mb-1">
                        عنوان المهمة / الواجب:
                      </label>
                      <input
                        type="text"
                        value={manualTitle}
                        onChange={(e) => setManualTitle(e.target.value)}
                        placeholder="مثال: قراءة درس Sound ص 14 أو حل شيت..."
                        className="w-full px-3 py-2 rounded-xl border border-slate-300 bg-white font-bold text-slate-900"
                        required
                      />
                    </div>

                    <div>
                      <label className="block text-[11px] font-bold text-slate-700 mb-1">
                        المادة:
                      </label>
                      <select
                        value={manualSubjectId}
                        onChange={(e) => setManualSubjectId(e.target.value)}
                        className="w-full px-3 py-2 rounded-xl border border-slate-300 bg-white font-bold text-slate-800"
                      >
                        {subjects
                          .filter((s) => s.id !== 'religion')
                          .map((s) => (
                            <option key={s.id} value={s.id}>
                              {s.nameEn || s.nameAr}
                            </option>
                          ))}
                      </select>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                    <div>
                      <label className="block text-[11px] font-bold text-slate-700 mb-1">
                        اليوم في الأسبوع:
                      </label>
                      <select
                        value={manualDay}
                        onChange={(e) => setManualDay(e.target.value as DayOfWeek)}
                        className="w-full px-3 py-2 rounded-xl border border-slate-300 bg-white font-bold text-slate-800"
                      >
                        {DAYS_LIST.map((d) => (
                          <option key={d.key} value={d.key}>
                            {d.nameAr} ({d.nameEn})
                          </option>
                        ))}
                      </select>
                    </div>

                    <div>
                      <label className="block text-[11px] font-bold text-slate-700 mb-1">
                        نوع المهمة:
                      </label>
                      <select
                        value={manualType}
                        onChange={(e) => setManualType(e.target.value as TaskType)}
                        className="w-full px-3 py-2 rounded-xl border border-slate-300 bg-white font-bold text-slate-800"
                      >
                        <option value="homework">واجب منزلي (Homework)</option>
                        <option value="study">مذاكرة ومراجعة (Study)</option>
                        <option value="quiz">اختبار / كويز (Quiz)</option>
                        <option value="bring">إحضار أدوات (Bring)</option>
                      </select>
                    </div>
                  </div>

                  <div>
                    <label className="block text-[11px] font-bold text-slate-700 mb-1">
                      تفاصيل إضافية أو أرقام الصفحات (اختياري):
                    </label>
                    <input
                      type="text"
                      value={manualDetails}
                      onChange={(e) => setManualDetails(e.target.value)}
                      placeholder="مثال: ص 14 تمرين 2 و 3 في البوكليت"
                      className="w-full px-3 py-2 rounded-xl border border-slate-300 bg-white text-slate-800"
                    />
                  </div>

                  <button
                    type="submit"
                    className="px-4 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs cursor-pointer flex items-center gap-1.5 transition-colors shadow-2xs"
                  >
                    <Plus className="w-3.5 h-3.5" />
                    <span>إضافة المهمة لقائمة مهام الأسبوع</span>
                  </button>
                </form>
              )}
            </div>

            {/* Smart Plan Text & Link Extractor (Converts text with URLs to tasks) */}
            <div className="bg-rose-50/40 border border-rose-100 rounded-2xl p-4 space-y-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <div className="w-6 h-6 rounded-lg bg-rose-600 text-white flex items-center justify-center">
                    <Sparkles className="w-3.5 h-3.5" />
                  </div>
                  <span className="text-xs font-bold text-slate-800">
                    لصق نص الخطة الأسبوعية واستخراج الروابط تلقائياً كمهام عملية:
                  </span>
                </div>
                <button
                  type="button"
                  onClick={() => setIsSmartTextPlanOpen(!isSmartTextPlanOpen)}
                  className="px-3 py-1 rounded-lg bg-white hover:bg-rose-50 border border-rose-200 text-xs font-bold text-rose-700 shadow-2xs transition-colors cursor-pointer"
                >
                  {isSmartTextPlanOpen ? 'إغلاق نافذة اللصق' : '+ لصق نص الخطة والروابط'}
                </button>
              </div>

              {isSmartTextPlanOpen && (
                <div className="pt-2 border-t border-rose-100 space-y-3 text-xs">
                  <p className="text-[11px] text-slate-600 leading-relaxed">
                    الصق هنا نص الخطة الأسبوعية (شروحات، روابط ICT، مراجعات، يوتيوب، أو درايف). سيقوم النظام تلقائياً باستخراج كل رابط وتحويله إلى مهمة منفصلة:
                    <span className="font-bold text-rose-700 dir-rtl mx-1 font-mono">
                      "استماع / مشاهدة الرابط التالي: [اسم المادة أو الدرس]"
                    </span>
                    مع زر نشط يفتح فوراً في تبويب جديد.
                  </p>
                  <textarea
                    rows={4}
                    value={smartPlanText}
                    onChange={(e) => setSmartPlanText(e.target.value)}
                    placeholder={`مثال:\nSunday:\nEnglish: Connect Plus Unit 1 - Explanation https://youtu.be/sample1\nMonday:\nICT: Computer parts - Watch video https://youtu.be/sample2\nWednesday:\nScience: Plant review https://drive.google.com/open?id=sample3`}
                    className="w-full px-3 py-2 rounded-xl border border-rose-200 bg-white font-mono text-xs text-slate-800 focus:outline-hidden focus:ring-2 focus:ring-rose-400"
                  />
                  <div className="flex items-center justify-end gap-2">
                    <button
                      type="button"
                      onClick={() => setSmartPlanText('')}
                      className="px-3 py-1.5 rounded-lg text-slate-500 hover:bg-slate-100 font-bold text-xs"
                    >
                      مسح
                    </button>
                    <button
                      type="button"
                      onClick={handleExtractFromPlanText}
                      disabled={!smartPlanText.trim()}
                      className="px-4 py-2 rounded-xl bg-rose-600 hover:bg-rose-700 disabled:opacity-50 text-white font-bold text-xs cursor-pointer flex items-center gap-1.5 transition-colors shadow-2xs"
                    >
                      <Sparkles className="w-3.5 h-3.5" />
                      <span>تفريغ النص واستخراج المهام والروابط تلقائياً</span>
                    </button>
                  </div>
                </div>
              )}
            </div>

            {/* Generated Tasks preview with multi-select */}
            {generatedTasks.length > 0 && (
              <div className="space-y-3">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                  <h4 className="text-xs font-black text-slate-800">
                    قائمة مهام الأسبوع ({generatedTasks.length}):
                  </h4>
                  <span className="text-[11px] text-slate-500">
                    يمكنك حذف أي مهمة فردياً أو تحديد عدة مهام وحذفها معاً
                  </span>
                </div>

                {/* Multi-select bar for tasks */}
                <div className="flex items-center justify-between gap-2 p-2.5 bg-slate-100 rounded-xl text-xs">
                  <div className="flex items-center gap-2">
                    <label className="flex items-center gap-1.5 cursor-pointer font-bold text-slate-700 select-none">
                      <input
                        type="checkbox"
                        checked={
                          generatedTasks.length > 0 &&
                          selectedTaskIndices.size === generatedTasks.length
                        }
                        onChange={toggleSelectAllTasks}
                        className="w-4 h-4 rounded border-slate-300 text-indigo-600 focus:ring-indigo-500 cursor-pointer"
                      />
                      <span>تحديد الكل ({generatedTasks.length})</span>
                    </label>

                    {selectedTaskIndices.size > 0 && (
                      <span className="font-bold text-indigo-700 bg-indigo-200/80 px-2 py-0.5 rounded-md text-[11px]">
                        تم تحديد {selectedTaskIndices.size}
                      </span>
                    )}
                  </div>

                  {selectedTaskIndices.size > 0 && (
                    <div className="flex items-center gap-2">
                      <button
                        type="button"
                        onClick={() => setSelectedTaskIndices(new Set())}
                        className="text-slate-500 hover:text-slate-700 text-xs font-bold transition-colors cursor-pointer"
                      >
                        إلغاء
                      </button>
                      <button
                        type="button"
                        onClick={handleDeleteSelectedTasks}
                        className="px-3 py-1 rounded-lg bg-rose-600 hover:bg-rose-700 text-white font-bold text-xs flex items-center gap-1 shadow-2xs transition-colors cursor-pointer"
                      >
                        <Trash2 className="w-3 h-3" />
                        <span>حذف المحدد ({selectedTaskIndices.size})</span>
                      </button>
                    </div>
                  )}
                </div>

                <div className="space-y-2 max-h-56 overflow-y-auto pr-1">
                  {generatedTasks.map((t, idx) => {
                    const isSelected = selectedTaskIndices.has(idx);
                    return (
                      <div
                        key={idx}
                        className={`p-2.5 rounded-xl border flex items-center justify-between text-xs transition-colors ${
                          isSelected
                            ? 'bg-indigo-50/60 border-indigo-300 ring-1 ring-indigo-200'
                            : 'p-2.5 rounded-xl border border-slate-200 bg-white'
                        }`}
                      >
                        <div className="flex items-center gap-2.5 min-w-0">
                          <input
                            type="checkbox"
                            checked={isSelected}
                            onChange={() => toggleSelectTask(idx)}
                            className="w-4 h-4 rounded border-slate-300 text-indigo-600 focus:ring-indigo-500 cursor-pointer shrink-0"
                            title="تحديد لحذف هذه المهمة"
                          />
                          <div className="flex items-center gap-2 min-w-0">
                            <span className="font-bold text-slate-900 truncate">{t.title}</span>
                            {t.title.includes('استماع / مشاهدة الرابط التالي') && (
                              <span className="text-[10px] px-2 py-0.5 rounded-md bg-rose-100 text-rose-700 font-bold shrink-0">
                                🔗 رابط نشط
                              </span>
                            )}
                            <span className="text-[10px] px-2 py-0.5 rounded-md bg-slate-100 text-slate-600 shrink-0 font-bold">
                              {DAYS_LIST.find((d) => d.key === t.day)?.nameAr}
                            </span>
                            {t.details && (
                              <span className="text-[10px] text-slate-400 truncate hidden sm:inline">
                                • {t.details}
                              </span>
                            )}
                          </div>
                        </div>
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            handleRemoveTask(idx);
                          }}
                          className="p-1.5 rounded-lg text-rose-500 hover:bg-rose-50 hover:text-rose-700 transition-colors cursor-pointer shrink-0"
                          title="حذف هذه المهمة"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}
          </div>
        ) : activeTab === 'materials' ? (
          /* ========================================================================= */
          /* TAB 2: ADMIN MATERIALS & SHEETS UPLOAD & MANAGEMENT CENTER                */
          /* ========================================================================= */
          <div className="overflow-y-auto p-5 sm:p-6 space-y-6 flex-1 bg-slate-50/50">
            
            {/* Notification Banner */}
            {matSuccessMsg && (
              <div className="p-3.5 rounded-2xl bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs font-bold flex flex-wrap items-center justify-between gap-2 animate-fadeIn">
                <div className="flex items-center gap-2">
                  <Check className="w-4 h-4 text-emerald-600 shrink-0" />
                  <span>{matSuccessMsg}</span>
                </div>
                {lastAddedMat && (
                  <div className="flex flex-wrap items-center gap-2 pt-2 border-t border-emerald-200/60">
                    <span className="text-[11px] text-emerald-800 font-bold">اختبار فوري للملف والتنسيق:</span>
                    <button
                      type="button"
                      onClick={() => openMaterialSheetInNewTab(lastAddedMat, subjectMap.get(lastAddedMat.subjectId)?.nameAr || lastAddedMat.subjectId)}
                      className="px-3 py-1.5 rounded-xl bg-white hover:bg-emerald-100 text-emerald-800 border border-emerald-300 font-bold text-xs flex items-center gap-1.5 transition-all cursor-pointer shadow-2xs"
                    >
                      <Eye className="w-3.5 h-3.5 text-emerald-700" />
                      <span>فتح الرابط للتأكد من الألوان والتنسيق الأصلي 100%</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => handleAdminDownloadSheet(lastAddedMat)}
                      className="px-3 py-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs flex items-center gap-1.5 shadow-xs transition-all cursor-pointer active:scale-95"
                    >
                      <Download className="w-3.5 h-3.5" />
                      <span>تنزيل الشيت للتأكد من التحميل ({lastAddedMat.fileName ? lastAddedMat.fileName.split('.').pop()?.toUpperCase() : 'PDF'})</span>
                    </button>
                  </div>
                )}
              </div>
            )}

            {/* Add New Material Form */}
            <form onSubmit={handleAddMaterial} className="bg-white rounded-2xl border border-indigo-100 p-5 shadow-xs space-y-4">
              <div className="flex items-center justify-between border-b border-slate-100 pb-3">
                <div className="flex items-center gap-2">
                  <div className="w-7 h-7 rounded-lg bg-indigo-100 text-indigo-700 flex items-center justify-center">
                    <Plus className="w-4 h-4" />
                  </div>
                  <h4 className="text-sm font-black text-slate-900">
                    إدراج ورفع شيت أو ماتيريال جديد (خاص بالأدمن)
                  </h4>
                </div>
                <span className="text-[11px] text-slate-400 font-medium">
                  يظهر فوراً في أيقونة الماتيريال للطلاب بنفس التنسيق الأصلي 100%
                </span>
              </div>

              {/* Mode Toggle: Direct Link (Recommended for 100% formatting) vs Local File */}
              <div className="p-1.5 bg-slate-100 rounded-2xl flex flex-col sm:flex-row gap-1.5">
                <button
                  type="button"
                  id="btn-mode-link"
                  onClick={() => setMatInputMode('link')}
                  className={`flex-1 py-2.5 px-3 rounded-xl font-bold text-xs flex items-center justify-center gap-2 transition-all cursor-pointer ${
                    matInputMode === 'link'
                      ? 'bg-indigo-600 text-white shadow-xs'
                      : 'text-slate-600 hover:text-slate-900 hover:bg-slate-200/70'
                  }`}
                >
                  <LinkIcon className="w-4 h-4" />
                  <span>إدخال رابط مباشر (Google Drive / OneDrive) — الحفاظ على 100% من التنسيق والألوان</span>
                </button>
                <button
                  type="button"
                  id="btn-mode-file"
                  onClick={() => setMatInputMode('file')}
                  className={`py-2.5 px-4 rounded-xl font-bold text-xs flex items-center justify-center gap-2 transition-all cursor-pointer ${
                    matInputMode === 'file'
                      ? 'bg-indigo-600 text-white shadow-xs'
                      : 'text-slate-600 hover:text-slate-900 hover:bg-slate-200/70'
                  }`}
                >
                  <UploadCloud className="w-4 h-4" />
                  <span>رفع ملف من جهازك</span>
                </button>
              </div>

              {/* Mode 1: Direct Link */}
              {matInputMode === 'link' && (
                <div className="p-4 rounded-2xl bg-indigo-50/70 border border-indigo-200 space-y-3">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-1">
                    <label className="block text-xs font-bold text-indigo-950">
                      رابط الملف الأصلي (Google Drive أو OneDrive أو أي رابط مباشر):
                    </label>
                    <span className="text-[11px] bg-emerald-100 text-emerald-800 font-bold px-2 py-0.5 rounded-full inline-block">
                      ✓ يضمن 100% بقاء الألوان، الخطوط، والصيغة الأصلية دون أي تعديل
                    </span>
                  </div>

                  <div className="flex items-center gap-2">
                    <input
                      type="url"
                      required={matInputMode === 'link'}
                      value={matFileUrl}
                      onChange={(e) => setMatFileUrl(e.target.value)}
                      placeholder="https://drive.google.com/file/d/.../view?usp=sharing"
                      className="flex-1 px-3.5 py-2.5 rounded-xl border border-indigo-300 focus:ring-2 focus:ring-indigo-500 bg-white font-mono text-xs text-slate-800 shadow-2xs"
                    />
                    {matFileUrl.trim() && (
                      <a
                        href={matFileUrl.trim()}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="px-3.5 py-2.5 rounded-xl bg-white border border-indigo-200 hover:bg-indigo-100 text-indigo-700 font-bold text-xs flex items-center gap-1.5 shrink-0 transition-colors shadow-2xs"
                      >
                        <ExternalLink className="w-3.5 h-3.5" />
                        <span>تجربة الرابط ↗</span>
                      </a>
                    )}
                  </div>

                  <div className="p-3 rounded-xl bg-white/90 border border-indigo-100 text-xs text-indigo-950 space-y-1">
                    <div className="font-bold flex items-center gap-1.5 text-indigo-700">
                      <Sparkles className="w-4 h-4 text-indigo-600" />
                      <span>طريقة الحفظ المباشر بدون تغيير:</span>
                    </div>
                    <p className="text-slate-600 text-[11px] leading-relaxed">
                      ضعي رابط ملفك كما هو؛ سيتولى النظام فتحه للطلاب عبر عارض Google الرسمي، ويتيح لهم تنزيله مباشرة على أجهزتهم بنفس الدقة، الألوان، والتنسيق الأصلي تماماً دون أي إعادة رسم أو مساس به.
                    </p>
                  </div>
                </div>
              )}

              {/* Mode 2: Local File Upload */}
              {matInputMode === 'file' && (
                <div className="p-4 rounded-xl border border-dashed border-indigo-200 bg-indigo-50/30 flex flex-col sm:flex-row items-center justify-between gap-3">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xl bg-indigo-600 text-white flex items-center justify-center shrink-0">
                      <UploadCloud className="w-5 h-5" />
                    </div>
                    <div>
                      <div className="text-xs font-bold text-slate-800">
                        تحميل ملف من جهازك (PDF, Word, صور, إلخ):
                      </div>
                      <div className="text-[11px] text-slate-500">
                        {matFileName ? (
                          <span className="font-mono text-indigo-700 font-bold">{matFileName}</span>
                        ) : (
                          'اختاري الملف لتعيين الاسم تلقائياً وتجهيز الشيت'
                        )}
                      </div>
                    </div>
                  </div>

                  <input
                    ref={matFileInputRef}
                    type="file"
                    accept=".pdf,.docx,.doc,.png,.jpg,.jpeg,.txt"
                    className="hidden"
                    onChange={(e) => handleMatFileSelected(e.target.files)}
                  />

                  <button
                    type="button"
                    onClick={() => matFileInputRef.current?.click()}
                    className="px-4 py-2 rounded-xl bg-white hover:bg-slate-50 border border-slate-300 text-slate-700 text-xs font-bold transition-all shadow-2xs cursor-pointer"
                  >
                    اختيار ملف من الجهاز
                  </button>
                </div>
              )}

              {/* Basic Fields */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs">
                <div className="sm:col-span-2">
                  <label className="block text-[11px] font-bold text-slate-700 mb-1">
                    عنوان الشيت / الماتيريال (مطلوب):
                  </label>
                  <input
                    type="text"
                    required
                    value={matTitle}
                    onChange={(e) => setMatTitle(e.target.value)}
                    placeholder="مثال: شيت مراجعة Unit 1، تدريبات Week 1..."
                    className="w-full px-3 py-2 rounded-xl border border-slate-300 focus:border-indigo-500 outline-hidden font-bold"
                  />
                </div>

                <div>
                  <label className="block text-[11px] font-bold text-slate-700 mb-1">
                    المادة:
                  </label>
                  <select
                    value={matSubjectId}
                    onChange={(e) => setMatSubjectId(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl border border-slate-300 bg-white font-bold text-slate-800"
                  >
                    {subjects
                      .filter((s) => s.id !== 'religion')
                      .map((s) => (
                        <option key={s.id} value={s.id}>
                          {s.nameEn || s.nameAr}
                        </option>
                      ))}
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-4 gap-3 text-xs">
                <div>
                  <label className="block text-[11px] font-bold text-slate-700 mb-1">
                    التقسيم / التبويب:
                  </label>
                  <select
                    value={matCategory}
                    onChange={(e) => setMatCategory(e.target.value as any)}
                    className="w-full px-3 py-2 rounded-xl border border-slate-300 bg-white font-bold text-slate-800"
                  >
                    <option value="main_sheets">Main Sheets (Block 1)</option>
                    <option value="week1">Week 1</option>
                    <option value="week2">Week 2</option>
                    <option value="week3">Week 3</option>
                  </select>
                </div>

                <div>
                  <label className="block text-[11px] font-bold text-slate-700 mb-1">
                    رقم البلوك:
                  </label>
                  <select
                    value={matBlock}
                    onChange={(e) => setMatBlock(Number(e.target.value))}
                    className="w-full px-3 py-2 rounded-xl border border-slate-300 bg-white font-bold text-slate-800"
                  >
                    {[1, 2, 3, 4, 5, 6].map((b) => (
                      <option key={b} value={b}>
                        Block {b}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-[11px] font-bold text-slate-700 mb-1">
                    الفصل المستهدف:
                  </label>
                  <select
                    value={matSection}
                    onChange={(e) => setMatSection(e.target.value as any)}
                    className="w-full px-3 py-2 rounded-xl border border-slate-300 bg-white font-bold text-slate-800"
                  >
                    <option value="all">جميع الفصول (2A, 2B, 2C)</option>
                    <option value="2A">2A فقط</option>
                    <option value="2B">2B فقط</option>
                    <option value="2C">2C فقط</option>
                  </select>
                </div>

                <div>
                  <label className="block text-[11px] font-bold text-slate-700 mb-1">
                    عدد الصفحات (اختياري):
                  </label>
                  <input
                    type="text"
                    value={matPageCount}
                    onChange={(e) => setMatPageCount(e.target.value)}
                    placeholder="مثال: 2 صفحة"
                    className="w-full px-3 py-2 rounded-xl border border-slate-300 focus:border-indigo-500 outline-hidden font-bold"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
                <div>
                  <label className="block text-[11px] font-bold text-slate-700 mb-1">
                    الوحدة / عنوان الدرس (اختياري):
                  </label>
                  <input
                    type="text"
                    value={matUnit}
                    onChange={(e) => setMatUnit(e.target.value)}
                    placeholder="مثال: Unit 1: How the World Works"
                    className="w-full px-3 py-2 rounded-xl border border-slate-300 focus:border-indigo-500 outline-hidden font-bold"
                  />
                </div>

                {matInputMode === 'file' && (
                  <div>
                    <label className="block text-[11px] font-bold text-slate-700 mb-1">
                      رابط ملف خارجي بديل (اختياري):
                    </label>
                    <input
                      type="url"
                      value={matFileUrl}
                      onChange={(e) => setMatFileUrl(e.target.value)}
                      placeholder="https://..."
                      className="w-full px-3 py-2 rounded-xl border border-slate-300 focus:border-indigo-500 outline-hidden font-mono"
                    />
                  </div>
                )}
              </div>

              {/* Multiline exercises */}
              <div className="text-xs">
                <label className="block text-[11px] font-bold text-slate-700 mb-1">
                  أسئلة وفقرات الشيت المباشرة للحل والمراجعة بالتطبيق (اختياري - سطر لكل سؤال):
                </label>
                <textarea
                  rows={3}
                  value={matExercisesText}
                  onChange={(e) => setMatExercisesText(e.target.value)}
                  placeholder="السؤال الأول: ...&#10;السؤال الثاني: ...&#10;السؤال الثالث: ..."
                  className="w-full px-3 py-2 rounded-xl border border-slate-300 focus:border-indigo-500 outline-hidden font-sans text-xs leading-relaxed"
                />
              </div>

              <div className="flex items-center justify-between pt-2">
                <p className="text-[11px] text-slate-500">
                  الماتيريال في واجهة الطلاب ستكون عرض وتنزيل مباشر بدون إمكانية تعديل أو مساس بالملف.
                </p>

                <button
                  type="submit"
                  id="btn-submit-material"
                  className="px-5 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs flex items-center gap-2 transition-all shadow-sm cursor-pointer active:scale-95"
                >
                  <Check className="w-4 h-4" />
                  <span>حفظ وإدراج الشيت في الماتيريال</span>
                </button>
              </div>
            </form>

            {/* Manage Existing Materials List */}
            <div className="bg-white rounded-2xl border border-slate-200 p-5 space-y-4">
              <div className="flex flex-col sm:flex-row items-center justify-between gap-3 border-b border-slate-100 pb-3">
                <div className="flex items-center gap-2">
                  <BookOpen className="w-4 h-4 text-indigo-600" />
                  <h4 className="text-sm font-black text-slate-900">
                    شيتات الماتيريال الحالية ({filteredMaterials.length})
                  </h4>
                </div>

                <div className="flex items-center gap-2 w-full sm:w-auto">
                  <select
                    value={matFilterCategory}
                    onChange={(e) => setMatFilterCategory(e.target.value)}
                    className="px-2.5 py-1.5 rounded-xl border border-slate-200 text-xs font-bold bg-slate-50 text-slate-700"
                  >
                    <option value="all">All Categories (جميع الأقسام)</option>
                    <option value="main_sheets">Main Sheets</option>
                    <option value="week1">Week 1</option>
                    <option value="week2">Week 2</option>
                    <option value="week3">Week 3</option>
                  </select>

                  <input
                    type="text"
                    value={matSearchQuery}
                    onChange={(e) => setMatSearchQuery(e.target.value)}
                    placeholder="بحث في الشيتات..."
                    className="px-3 py-1.5 rounded-xl border border-slate-200 text-xs bg-slate-50 font-bold w-40"
                  />

                  <button
                    type="button"
                    onClick={handleResetMaterials}
                    className="px-3 py-1.5 rounded-xl border border-rose-200 hover:bg-rose-50 text-rose-600 text-xs font-bold transition-colors cursor-pointer"
                    title="مسح وتفريغ كافة الشيتات"
                  >
                    مسح كافة الشيتات
                  </button>
                </div>
              </div>

              {/* Multi-select Action Bar for Materials */}
              {filteredMaterials.length > 0 && (
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-3 bg-indigo-50/70 border border-indigo-100 rounded-xl text-xs">
                  <div className="flex items-center gap-3">
                    <label className="flex items-center gap-2 cursor-pointer font-bold text-slate-800 select-none">
                      <input
                        type="checkbox"
                        checked={
                          filteredMaterials.length > 0 &&
                          filteredMaterials.every((m) => selectedMaterialIds.has(m.id))
                        }
                        onChange={toggleSelectAllMaterials}
                        className="w-4 h-4 rounded border-slate-300 text-indigo-600 focus:ring-indigo-500 cursor-pointer"
                      />
                      <span>تحديد الكل ({filteredMaterials.length})</span>
                    </label>

                    {selectedMaterialIds.size > 0 && (
                      <span className="font-bold text-indigo-800 bg-indigo-200/80 px-2.5 py-0.5 rounded-lg text-xs">
                        تم تحديد {selectedMaterialIds.size} شيت
                      </span>
                    )}
                  </div>

                  {selectedMaterialIds.size > 0 && (
                    <div className="flex items-center gap-2">
                      <button
                        type="button"
                        onClick={handleDownloadSelectedMaterials}
                        className="px-3.5 py-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs flex items-center gap-1.5 shadow-sm transition-all cursor-pointer active:scale-95"
                        title="تنزيل الشيتات المحددة على جهازك بنفس تنسيقها الأصلي"
                      >
                        <Download className="w-3.5 h-3.5" />
                        <span>تنزيل المحدد ({selectedMaterialIds.size})</span>
                      </button>
                      <button
                        type="button"
                        onClick={() => setSelectedMaterialIds(new Set())}
                        className="px-3 py-1.5 text-slate-600 hover:text-slate-800 font-bold text-xs transition-colors cursor-pointer"
                      >
                        إلغاء التحديد
                      </button>
                      <button
                        type="button"
                        onClick={handleDeleteSelectedMaterials}
                        className="px-4 py-1.5 rounded-xl bg-rose-600 hover:bg-rose-700 text-white font-bold text-xs flex items-center gap-1.5 shadow-sm transition-all cursor-pointer active:scale-95"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                        <span>حذف الشيتات المحددة ({selectedMaterialIds.size})</span>
                      </button>
                    </div>
                  )}
                </div>
              )}

              {filteredMaterials.length === 0 ? (
                <div className="text-center py-8 text-slate-400 text-xs">
                  لا توجد شيتات مطابقة لهذا البحث أو القسم حالياً.
                </div>
              ) : (
                <div className="space-y-2 max-h-80 overflow-y-auto pr-1">
                  {filteredMaterials.map((mat) => {
                    const subObj = subjectMap.get(mat.subjectId);
                    const isSelected = selectedMaterialIds.has(mat.id);
                    return (
                      <div
                        key={mat.id}
                        className={`p-3 rounded-xl border transition-all flex items-center justify-between gap-3 text-xs ${
                          isSelected
                            ? 'bg-indigo-50/50 border-indigo-300 ring-1 ring-indigo-200'
                            : 'border-slate-200 bg-white hover:border-indigo-300'
                        }`}
                      >
                        <div className="flex items-center gap-3 min-w-0">
                          <input
                            type="checkbox"
                            checked={isSelected}
                            onChange={() => toggleSelectMaterial(mat.id)}
                            className="w-4 h-4 rounded border-slate-300 text-indigo-600 focus:ring-indigo-500 cursor-pointer shrink-0"
                            title="تحديد للحذف التعددي"
                          />

                          {subObj && (
                            <span
                              className={`text-[10px] font-bold px-2 py-0.5 rounded-md shrink-0 ${subObj.color.lightBg} ${subObj.color.text}`}
                            >
                              {subObj.nameAr}
                            </span>
                          )}
                          <div className="min-w-0">
                            <span className="font-bold text-slate-900 block truncate">
                              {mat.title}
                            </span>
                            <span className="text-[11px] text-slate-400 font-sans">
                              {mat.categoryLabel || mat.category} • Block {mat.blockNumber}{' '}
                              {mat.pageCount ? `• ${mat.pageCount} صفحة` : ''}
                            </span>
                          </div>
                        </div>

                        <div className="flex items-center gap-1.5 shrink-0">
                          <span className="text-[10px] text-slate-400 hidden sm:inline font-sans ml-1">
                            {new Date(mat.createdAt).toLocaleDateString('ar-EG')}
                          </span>

                          {/* Quick Attach / Update original PDF file */}
                          <label
                            className="p-1.5 rounded-xl border border-slate-200 text-slate-500 hover:text-indigo-600 hover:bg-slate-100 transition-colors cursor-pointer flex items-center justify-center"
                            title="إرفاق أو استبدال ملف PDF الأصلي للشيت"
                          >
                            <UploadCloud className="w-4 h-4" />
                            <input
                              type="file"
                              accept=".pdf,.docx,.doc,.jpg,.jpeg,.png"
                              className="hidden"
                              onChange={(e) => handleAttachFileToExistingMaterial(mat.id, e.target.files)}
                            />
                          </label>

                          {/* Eye button: View in new tab */}
                          <button
                            type="button"
                            onClick={() => openMaterialSheetInNewTab(mat, subObj?.nameAr || mat.subjectId)}
                            className="p-2 rounded-xl bg-indigo-50 hover:bg-indigo-100 text-indigo-700 transition-colors cursor-pointer border border-indigo-200"
                            title="عرض في تبويب جديد"
                          >
                            <Eye className="w-4 h-4" />
                          </button>

                          {/* Download button */}
                          <button
                            type="button"
                            onClick={() => handleAdminDownloadSheet(mat)}
                            disabled={downloadingMatId === mat.id}
                            className="px-2.5 py-1.5 rounded-xl bg-emerald-50 hover:bg-emerald-100 text-emerald-700 hover:text-emerald-800 transition-colors cursor-pointer border border-emerald-200 font-bold flex items-center gap-1 active:scale-95 disabled:opacity-50"
                            title="تحميل وتنزيل الملف على جهازك بنفس تنسيقه الأصلي"
                          >
                            <Download className={`w-3.5 h-3.5 ${downloadingMatId === mat.id ? 'animate-bounce' : ''}`} />
                            <span className="text-[11px] font-sans">تنزيل {mat.fileName ? mat.fileName.split('.').pop()?.toUpperCase() : 'PDF'}</span>
                          </button>

                          {/* Delete button */}
                          <button
                            type="button"
                            onClick={() => handleDeleteMaterialDirect(mat.id, mat.title)}
                            className="p-2 rounded-xl text-rose-500 hover:bg-rose-50 hover:text-rose-700 transition-colors cursor-pointer border border-transparent hover:border-rose-200"
                            title="حذف هذا الشيت"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </div>
        ) : activeTab === 'visitors' ? (
          /* ========================================================================= */
          /* TAB 3: VISITOR & STUDENT STATS CENSUS                                     */
          /* ========================================================================= */
          <div className="overflow-y-auto p-4 sm:p-6 flex-1 bg-slate-50/50">
            <VisitorStatsPanel summaryStats={visitorStats} onRefreshStats={onRefreshStats} />
          </div>
        ) : (
          /* ========================================================================= */
          /* TAB 4: ARCHIVE / HISTORY OF UPLOADED PLANS                                 */
          /* ========================================================================= */
          <div className="overflow-y-auto p-6 space-y-4 flex-1">
            {historySuccessMsg && (
              <div className="p-3.5 rounded-2xl bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs font-bold flex items-center gap-2 animate-fadeIn">
                <Check className="w-4 h-4 text-emerald-600 shrink-0" />
                <span>{historySuccessMsg}</span>
              </div>
            )}

            <div className="flex items-center justify-between">
              <h4 className="text-sm font-black text-slate-900">
                الملفات السابقة التي تم رفعها لحفظ الخطط الأسبوعية ({savedUploadedFiles.length}):
              </h4>
            </div>

            {/* Multi-select Action Bar for History Files */}
            {savedUploadedFiles.length > 0 && (
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-3 bg-purple-50/70 border border-purple-100 rounded-xl text-xs">
                <div className="flex items-center gap-3">
                  <label className="flex items-center gap-2 cursor-pointer font-bold text-slate-800 select-none">
                    <input
                      type="checkbox"
                      checked={
                        savedUploadedFiles.length > 0 &&
                        savedUploadedFiles.every((f) => selectedHistoryFileIds.has(f.id))
                      }
                      onChange={toggleSelectAllHistoryFiles}
                      className="w-4 h-4 rounded border-slate-300 text-purple-600 focus:ring-purple-500 cursor-pointer"
                    />
                    <span>تحديد الكل ({savedUploadedFiles.length})</span>
                  </label>

                  {selectedHistoryFileIds.size > 0 && (
                    <span className="font-bold text-purple-800 bg-purple-200/80 px-2.5 py-0.5 rounded-lg text-xs">
                      تم تحديد {selectedHistoryFileIds.size} ملف
                    </span>
                  )}
                </div>

                {selectedHistoryFileIds.size > 0 && (
                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={() => setSelectedHistoryFileIds(new Set())}
                      className="px-3 py-1.5 text-slate-600 hover:text-slate-800 font-bold text-xs transition-colors cursor-pointer"
                    >
                      إلغاء التحديد
                    </button>
                    <button
                      type="button"
                      onClick={handleDeleteSelectedHistoryFiles}
                      className="px-4 py-1.5 rounded-xl bg-rose-600 hover:bg-rose-700 text-white font-bold text-xs flex items-center gap-1.5 shadow-sm transition-all cursor-pointer active:scale-95"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                      <span>حذف الملفات المحددة ({selectedHistoryFileIds.size})</span>
                    </button>
                  </div>
                )}
              </div>
            )}

            {savedUploadedFiles.length === 0 ? (
              <div className="text-center py-12 text-slate-400 text-xs">
                لا توجد ملفات سابقة محفوظة بعد. يمكنك رفع ملفات الأسبوع الجديد من تبويب "رفع الخطة الأسبوعية".
              </div>
            ) : (
              <div className="space-y-2">
                {savedUploadedFiles.map((f) => {
                  const isSelected = selectedHistoryFileIds.has(f.id);
                  return (
                    <div
                      key={f.id}
                      className={`p-3 rounded-2xl border flex items-center justify-between transition-all ${
                        isSelected
                          ? 'bg-purple-50/50 border-purple-300 ring-1 ring-purple-200'
                          : 'bg-white border-slate-200 hover:border-purple-300'
                      }`}
                    >
                      <div className="flex items-center gap-3">
                        <input
                          type="checkbox"
                          checked={isSelected}
                          onChange={() => toggleSelectHistoryFile(f.id)}
                          className="w-4 h-4 rounded border-slate-300 text-purple-600 focus:ring-purple-500 cursor-pointer shrink-0"
                          title="تحديد للمسح التعددي"
                        />
                        <div className="w-9 h-9 rounded-xl bg-purple-50 text-purple-700 flex items-center justify-center shrink-0">
                          <FileCheck className="w-4 h-4" />
                        </div>
                        <div>
                          <span className="text-xs font-bold text-slate-900 block">{f.name}</span>
                          <span className="text-[11px] text-slate-400 font-sans">
                            {f.weekName || 'خطة الأسبوع'} • {new Date(f.uploadDate).toLocaleDateString('ar-EG')}
                          </span>
                        </div>
                      </div>

                      <div className="flex items-center gap-2">
                        <span className="text-xs font-bold font-sans text-indigo-700 bg-indigo-50 px-2.5 py-1 rounded-lg hidden sm:inline">
                          Archived
                        </span>
                        <button
                          type="button"
                          onClick={() => handleDownloadHistoryFile(f)}
                          className="p-2 rounded-xl bg-emerald-50 hover:bg-emerald-100 text-emerald-700 transition-colors cursor-pointer border border-emerald-200"
                          title="تحميل الملف على جهازك"
                        >
                          <Download className="w-4 h-4" />
                        </button>
                        <button
                          type="button"
                          onClick={() => handleDeleteHistoryFileDirect(f.id, f.name)}
                          className="p-2 rounded-xl text-rose-500 hover:bg-rose-50 hover:text-rose-700 transition-colors cursor-pointer border border-transparent hover:border-rose-200"
                          title="حذف هذا الملف من السجل"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        )}

        {/* Footer (Only shown when unlocked) */}
        {isUnlocked && (
          <div className="px-6 py-3.5 border-t border-slate-100 bg-slate-50 text-right flex items-center justify-between">
            <span className="text-xs text-slate-500">
              {activeTab === 'weekly_plan' ? (
                generatedTasks.length > 0
                  ? `سيتم تطبيق ${generatedTasks.length} مهمة على الخطة الأسبوعية`
                  : 'ارفعي الملفات ليتم تجهيز وتحديث الخطة فورياً'
              ) : activeTab === 'materials' ? (
                'جميع الشيتات المرفوعة تظهر فوراً للطلاب كعرض فقط وتدريبات مباشرة'
              ) : (
                `إجمالي الملفات المؤرشفة: ${savedUploadedFiles.length}`
              )}
            </span>

            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={onClose}
                className="px-4 py-2 rounded-full text-xs font-semibold text-slate-600 hover:bg-slate-200 transition-colors cursor-pointer"
              >
                إغلاق
              </button>

              {activeTab === 'weekly_plan' && (
                <button
                  type="button"
                  id="btn-apply-weekly-plan-admin"
                  onClick={handleApply}
                  className="px-6 py-2 rounded-full text-xs font-bold bg-indigo-600 hover:bg-indigo-700 text-white shadow-sm flex items-center gap-1.5 transition-all font-sans cursor-pointer active:scale-95"
                >
                  <Check className="w-4 h-4 stroke-[2.5]" />
                  <span>
                    {generatedTasks.length > 0
                      ? `حفظ وتطبيق خطة (Block ${blockNumber} - Week ${weekNumber}) [${generatedTasks.length} مهمة]`
                      : `إنشاء وتطبيق خطة (Block ${blockNumber} - Week ${weekNumber})`}
                  </span>
                </button>
              )}
            </div>
          </div>
        )}

        {/* Modal: Reset / Clear All Materials Confirmation */}
        {isResetMaterialsConfirm && (
          <div className="fixed inset-0 z-60 bg-black/50 backdrop-blur-xs flex items-center justify-center p-4">
            <div className="bg-white rounded-2xl p-5 max-w-sm w-full shadow-2xl border border-slate-200 space-y-4 animate-scaleUp">
              <div className="flex items-center gap-3 text-rose-600">
                <div className="w-10 h-10 rounded-xl bg-rose-100 flex items-center justify-center">
                  <Trash2 className="w-5 h-5" />
                </div>
                <div>
                  <h4 className="text-sm font-bold text-slate-900">مسح وتفريغ كافة الشيتات</h4>
                  <span className="text-xs text-slate-500">حذف جميع شيتات الماتيريال</span>
                </div>
              </div>
              <p className="text-xs text-slate-600 leading-relaxed">
                هل تريدين مسح وتفريغ كافة الشيتات والماتيريال نهائياً؟ يمكنك بعد ذلك رفع شيتات جديدة في أي وقت.
              </p>
              <div className="flex items-center justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setIsResetMaterialsConfirm(false)}
                  className="px-4 py-2 rounded-xl text-xs font-bold text-slate-600 hover:bg-slate-100 transition-colors cursor-pointer"
                >
                  إلغاء
                </button>
                <button
                  type="button"
                  onClick={confirmResetMaterials}
                  className="px-4 py-2 rounded-xl text-xs font-bold bg-rose-600 hover:bg-rose-700 text-white transition-colors cursor-pointer"
                >
                  نعم، مسح الكل
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
