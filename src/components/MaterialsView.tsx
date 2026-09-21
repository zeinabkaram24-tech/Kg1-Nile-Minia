import React, { useState, useRef, useEffect } from 'react';
import {
  FolderOpen,
  Eye,
  Download,
  Printer,
  Upload,
  Plus,
  Edit2,
  Trash2,
  FileText,
  FileSpreadsheet,
  Image as ImageIcon,
  File,
  Search,
  CheckCircle2,
  X,
  Copy,
  BookOpen,
  Layers,
  GraduationCap,
  Sparkles,
  Check,
  FileCheck,
  Calendar,
  ExternalLink,
  Maximize2,
  Lock
} from 'lucide-react';
import { SchoolMaterialFile, SchoolClass, UserRole } from '../types';
import { SubjectBadge, getSubjectInfo } from './SubjectBadge';
import { SUBJECTS, BLOCKS, WEEKS } from '../data/initialData';
import { saveStoredMaterials } from '../lib/storage';

interface MaterialsViewProps {
  currentRole: UserRole;
  selectedClass: SchoolClass;
  selectedBlock: string;
  selectedWeek: string;
  materials: SchoolMaterialFile[];
  onUpdateMaterials: (materials: SchoolMaterialFile[]) => void;
}

export const MaterialsView: React.FC<MaterialsViewProps> = ({
  currentRole,
  selectedClass,
  selectedBlock,
  selectedWeek,
  materials,
  onUpdateMaterials
}) => {
  // Block selector state (defaults to selectedBlock or block1)
  const [activeBlock, setActiveBlock] = useState<string>(selectedBlock || 'block1');
  const [activeMaterialScope, setActiveMaterialScope] = useState<string>('main');
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedSubjectFilter, setSelectedSubjectFilter] = useState<string>('all');
  const [copiedNotification, setCopiedNotification] = useState(false);

  // Preview Modal State (Shows the actual file in a high-definition document viewer)
  const [previewFile, setPreviewFile] = useState<SchoolMaterialFile | null>(null);
  const [previewObjectUrl, setPreviewObjectUrl] = useState<string | null>(null);
  const [previewTab, setPreviewTab] = useState<'document' | 'text'>('document');

  useEffect(() => {
    if (!previewFile?.fileDataUrl) {
      setPreviewObjectUrl(null);
      return;
    }
    try {
      const [meta, encoded] = previewFile.fileDataUrl.split(',');
      const binary = atob(encoded || '');
      const bytes = Uint8Array.from(binary, (char) => char.charCodeAt(0));
      const mime = meta.match(/^data:([^;]+)/)?.[1] || (previewFile.fileType === 'pdf' ? 'application/pdf' : 'application/octet-stream');
      const url = URL.createObjectURL(new Blob([bytes], { type: mime }));
      setPreviewObjectUrl(url);
      return () => URL.revokeObjectURL(url);
    } catch {
      setPreviewObjectUrl(null);
    }
  }, [previewFile]);

  // Admin Add / Edit Modal State
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingFileId, setEditingFileId] = useState<string | null>(null);

  // Helper to format block name
  const getBlockName = (blockId: string) => {
    const found = BLOCKS.find((b) => b.id === blockId);
    return found ? found.nameAr : 'Block 1';
  };

  // Generate authentic high-fidelity printable HTML document for materials without binary URL
  const generateDocumentHtml = (file: SchoolMaterialFile) => {
    const sub = getSubjectInfo(file.subjectId);
    const blockName = getBlockName(file.blockId || 'block1');
    const classLabel = file.classId === 'all' ? 'All Classes (A, B, C, D, E)' : `Class ${file.classId}`;

    return `<!DOCTYPE html>
<html lang="ar" dir="rtl">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=5.0">
  <title>${file.title} - Nile Egyptian Schools</title>
  <style>
    @import url('https://fonts.googleapis.com/css2?family=Cairo:wght@400;600;700;900&display=swap');
    * { box-sizing: border-box; }
    body {
      font-family: 'Cairo', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
      background: #f8fafc;
      color: #0f172a;
      margin: 0;
      padding: 24px 16px;
      display: flex;
      justify-content: center;
    }
    .page {
      background: white;
      width: 100%;
      max-width: 820px;
      min-height: 1050px;
      padding: 36px 42px;
      border-radius: 12px;
      box-shadow: 0 4px 24px rgba(0, 0, 0, 0.08);
      border: 1px solid #cbd5e1;
      display: flex;
      flex-direction: column;
      justify-content: space-between;
      position: relative;
    }
    .watermark {
      position: absolute;
      top: 50%;
      left: 50%;
      transform: translate(-50%, -50%) rotate(-30deg);
      font-size: 52px;
      font-weight: 900;
      color: rgba(2, 132, 199, 0.04);
      pointer-events: none;
      white-space: nowrap;
      user-select: none;
      z-index: 1;
    }
    .header {
      border-bottom: 2px solid #0f172a;
      padding-bottom: 16px;
      margin-bottom: 18px;
      display: flex;
      align-items: center;
      justify-content: space-between;
      position: relative;
      z-index: 2;
    }
    .school-title-ar { font-size: 17px; font-weight: 900; color: #0f172a; margin-bottom: 2px; }
    .school-title-en { font-size: 13px; font-weight: 700; color: #0284c7; margin-bottom: 4px; }
    .school-sub { font-size: 11px; color: #64748b; }
    .badge-subject {
      background: #0f172a;
      color: white;
      padding: 8px 16px;
      border-radius: 8px;
      font-size: 13px;
      font-weight: 700;
      text-align: center;
    }
    .student-fields {
      display: grid;
      grid-template-columns: 2fr 1fr 1fr;
      gap: 12px;
      background: #f8fafc;
      border: 1px solid #e2e8f0;
      border-radius: 8px;
      padding: 10px 14px;
      font-size: 12px;
      margin-bottom: 20px;
      position: relative;
      z-index: 2;
    }
    .student-field strong { color: #0f172a; }
    .sheet-title-box {
      background: #f0fdf4;
      border: 1px solid #bbf7d0;
      padding: 12px 16px;
      border-radius: 8px;
      margin-bottom: 20px;
      text-align: center;
      position: relative;
      z-index: 2;
    }
    .sheet-title-box h2 {
      margin: 0 0 4px 0;
      font-size: 16px;
      font-weight: 900;
      color: #166534;
    }
    .sheet-meta {
      font-size: 11px;
      color: #15803d;
      font-weight: 600;
    }
    .content-box {
      flex: 1;
      font-size: 13.5px;
      line-height: 1.85;
      color: #1e293b;
      white-space: pre-wrap;
      position: relative;
      z-index: 2;
      border: 1px dashed #cbd5e1;
      border-radius: 8px;
      padding: 24px;
      background: #ffffff;
    }
    .footer {
      margin-top: 24px;
      padding-top: 14px;
      border-top: 1px solid #e2e8f0;
      display: flex;
      justify-content: space-between;
      align-items: center;
      font-size: 11px;
      color: #64748b;
      position: relative;
      z-index: 2;
    }
    .seal {
      border: 2px solid #0284c7;
      color: #0284c7;
      padding: 4px 12px;
      border-radius: 6px;
      font-weight: 800;
      font-size: 10px;
    }
    @media print {
      body { padding: 0; background: white; }
      .page { box-shadow: none; border: none; max-width: 100%; min-height: auto; }
    }
  </style>
</head>
<body>
  <div class="page">
    <div class="watermark">NILE EGYPTIAN SCHOOLS</div>
    <div>
      <div class="header">
        <div>
          <div class="school-title-ar">مدارس النيل المصرية الدولية - فرع المنيا</div>
          <div class="school-title-en">Nile Egyptian Schools - Minya Branch</div>
          <div class="school-sub">KG 1 • ${blockName} • العام الدراسي 2026/2027</div>
        </div>
        <div class="badge-subject">
          ${sub.nameAr}
          <div style="font-size: 10px; opacity: 0.8; font-weight: normal;">${sub.nameEn}</div>
        </div>
      </div>

      <div class="student-fields">
        <div><strong>اسم الطالب:</strong> ....................................................</div>
        <div><strong>Class:</strong> ${classLabel}</div>
        <div><strong>التاريخ:</strong> ${file.uploadDate || '2026/2027'}</div>
      </div>

      <div class="sheet-title-box">
        <h2>${file.title}</h2>
        <div class="sheet-meta">${file.fileName} • ${file.fileSize}</div>
      </div>

      <div class="content-box">
${file.previewSummary || file.description || 'محتوى الشيت والتدريبات الدراسية المعتمدة لمدارس النيل المصرية الدولية.'}
      </div>
    </div>

    <div class="footer">
      <div>اعتماد الإدارة: ................................</div>
      <div class="seal">معتمد ✓ مدرسة النيل بالمنيا</div>
      <div>الصفحة 1 من 1</div>
    </div>
  </div>
</body>
</html>`;
  };

  // Open the actual file in a new tab or window
  const handleOpenInNewTab = (file: SchoolMaterialFile) => {
    if (file.fileDataUrl) {
      const win = window.open();
      if (win) {
        if (file.fileDataUrl.startsWith('data:application/pdf') || file.fileType === 'pdf') {
          // Let the browser's native PDF viewer handle the original document.
          // Wrapping it in another iframe causes a compressed view on mobile
          // and on some desktop browsers.
          win.location.href = file.fileDataUrl;
        } else {
          win.location.href = previewObjectUrl || file.fileDataUrl;
        }
      }
      return;
    }

    const win = window.open('', '_blank');
    if (win) {
      win.document.write(generateDocumentHtml(file));
      win.document.close();
    }
  };

  // Form State
  const [formTitle, setFormTitle] = useState('');
  const [formSubject, setFormSubject] = useState(SUBJECTS[0].id);
  const [formBlock, setFormBlock] = useState(activeBlock);
  const [formWeek, setFormWeek] = useState('');
  const [formClass, setFormClass] = useState<SchoolClass | 'all'>('all');
  const [formType, setFormType] = useState<'pdf' | 'doc' | 'image' | 'sheet'>('pdf');
  const [formDescription, setFormDescription] = useState('');
  const [formPreviewSummary, setFormPreviewSummary] = useState('');
  const [formFileName, setFormFileName] = useState('');
  const [formFileSize, setFormFileSize] = useState('1.8 MB');
  const [formFileDataUrl, setFormFileDataUrl] = useState<string | undefined>(undefined);
  const [dictationOpen, setDictationOpen] = useState(false);
  const [dictationSubject, setDictationSubject] = useState(SUBJECTS[0].id);
  const [dictationFile, setDictationFile] = useState<{ name: string; type: 'pdf' | 'doc' | 'image'; size: string; dataUrl: string } | null>(null);

  const fileInputRef = useRef<HTMLInputElement | null>(null);

  const handlePickDictationFile = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const ext = file.name.split('.').pop()?.toLowerCase();
    const type: 'pdf' | 'doc' | 'image' = file.type.startsWith('image/') ? 'image' : ext === 'doc' || ext === 'docx' ? 'doc' : 'pdf';
    const reader = new FileReader();
    reader.onload = () => setDictationFile({ name: file.name, type, size: `${(file.size / (1024 * 1024)).toFixed(1)} MB`, dataUrl: reader.result as string });
    reader.readAsDataURL(file);
  };

  const saveDictation = () => {
    if (!dictationFile) return;
    onUpdateMaterials([{
      id: `dictation-${Date.now()}`,
      title: `Dictation - ${getSubjectInfo(dictationSubject).nameEn}`,
      subjectId: 'dictation',
      classId: 'all',
      blockId: activeBlock,
      weekId: activeMaterialScope === 'main' ? selectedWeek : activeMaterialScope,
      materialKind: 'dictation',
      fileType: dictationFile.type,
      fileName: dictationFile.name,
      fileSize: dictationFile.size,
      uploadDate: new Date().toISOString().slice(0, 10),
      uploadedBy: 'Admin',
      fileDataUrl: dictationFile.dataUrl
    }, ...materials]);
    setDictationFile(null);
    setDictationOpen(false);
  };

  // Filter materials for the currently active Block
  const blockMaterials = materials.filter((m) => {
    // Check block
    const matchesBlock = (m.blockId || 'block1') === activeBlock;
    if (!matchesBlock) return false;

    // Main Sheets have no week and remain visible in every week; extra sheets are week-scoped.
    const matchesScope = activeMaterialScope === 'main' ? !m.weekId : m.weekId === activeMaterialScope;
    if (!matchesScope) return false;

    // Check subject filter
    if (selectedSubjectFilter !== 'all' && m.subjectId !== selectedSubjectFilter) {
      return false;
    }

    // Check search query
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      const matchTitle = m.title.toLowerCase().includes(q);
      const matchDesc = m.description?.toLowerCase().includes(q) || false;
      const matchFile = m.fileName.toLowerCase().includes(q);
      const sub = getSubjectInfo(m.subjectId);
      const matchSub = sub.nameEn.toLowerCase().includes(q) || sub.nameAr.includes(q);
      if (!matchTitle && !matchDesc && !matchFile && !matchSub) {
        return false;
      }
    }

    return true;
  });

  // Action 1: Preview (معاينة) - Opens the file itself + thumbnail preview
  const handlePreviewFile = (file: SchoolMaterialFile) => {
    setPreviewFile(file);
  };

  // Action 2: Download (تحميل)
  const handleDownloadFile = (file: SchoolMaterialFile) => {
    if (file.fileDataUrl) {
      const link = document.createElement('a');
      link.href = file.fileDataUrl;
      link.download = file.fileName;
      document.body.appendChild(link);
      link.click();
      link.remove();
      return;
    }

    // Build downloadable summary/worksheet
    const content = `===============================================================
مدارس النيل المصرية الدولية - فرع المنيا (Nile Egyptian Schools)
الصف الأول رياض الأطفال (KG 1) - شيت المواد الدراسية
===============================================================
عنوان الشيت: ${file.title}
المادة: ${getSubjectInfo(file.subjectId).nameAr} - ${getSubjectInfo(file.subjectId).nameEn}
Block: ${getBlockName(file.blockId || 'block1')}
Class: ${file.classId === 'all' ? 'All Classes (A, B, C, D, E)' : `Class ${file.classId}`}
تاريخ الرفع: ${file.uploadDate}
اسم الملف: ${file.fileName}
نوع الملف: ${file.fileType.toUpperCase()} (${file.fileSize})
جهة الرفع: ${file.uploadedBy || 'إدارة المدرسة'}

---------------------- محتوى الشيت الدراسي ----------------------
${file.previewSummary || file.description || 'محتوى معتمد من إدارة مدارس النيل المصرية الدولية.'}
===============================================================
`;
    const blob = new Blob([content], { type: 'text/plain;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = file.fileName.endsWith('.txt') ? file.fileName : `${file.fileName.replace(/\.[^/.]+$/, '')}.txt`;
    document.body.appendChild(link);
    link.click();
    link.remove();
    URL.revokeObjectURL(url);
  };

  // Action 3: Print (طباعة)
  const handlePrintFile = (file: SchoolMaterialFile) => {
    if (file.fileDataUrl) {
      if (file.fileType === 'image') {
        const printWindow = window.open('', '_blank');
        if (printWindow) {
          printWindow.document.write(`
            <!DOCTYPE html>
            <html>
              <head><meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=5.0"><title>${file.title}</title></head>
              <body style="margin:0;display:flex;justify-content:center;align-items:center;height:100vh;background:#fff;">
                <img src="${file.fileDataUrl}" style="max-width:100%;max-height:100%;object-fit:contain;" onload="window.print();" />
              </body>
            </html>
          `);
          printWindow.document.close();
        }
      } else {
        // Direct print / view of original PDF
        const printWindow = window.open(file.fileDataUrl, '_blank');
        if (printWindow) {
          printWindow.focus();
        }
      }
      return;
    }

    const sub = getSubjectInfo(file.subjectId);
    const printWindow = window.open('', '_blank');
    if (!printWindow) return;

    printWindow.document.write(`
      <!DOCTYPE html>
      <html lang="ar" dir="rtl">
      <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=5.0">
        <title>${file.title} - مدارس النيل المصرية الدولية</title>
        <style>
          @page { size: A4 portrait; margin: 15mm; }
          body {
            font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
            margin: 0;
            padding: 0;
            color: #0f172a;
            background: white;
            line-height: 1.6;
          }
          .header-box {
            border: 2px solid #0f172a;
            border-radius: 12px;
            padding: 16px 20px;
            margin-bottom: 20px;
            background: #f8fafc;
            display: flex;
            justify-content: space-between;
            align-items: center;
          }
          .school-title { font-size: 16pt; font-weight: bold; margin-bottom: 4px; }
          .school-sub { font-size: 10.5pt; color: #475569; }
          .badge {
            background: #0f172a;
            color: white;
            padding: 6px 14px;
            border-radius: 8px;
            font-size: 11pt;
            font-weight: bold;
          }
          .meta-grid {
            display: grid;
            grid-template-columns: repeat(4, 1fr);
            gap: 10px;
            background: #f1f5f9;
            padding: 12px;
            border-radius: 8px;
            font-size: 9pt;
            margin-bottom: 20px;
            border: 1px solid #cbd5e1;
          }
          .student-row {
            display: flex;
            justify-content: space-between;
            border-bottom: 2px dashed #94a3b8;
            padding-bottom: 8px;
            margin-bottom: 20px;
            font-size: 11pt;
            font-weight: 600;
          }
          .worksheet-body {
            border: 1px solid #cbd5e1;
            border-radius: 8px;
            padding: 24px;
            min-height: 500px;
            white-space: pre-wrap;
            font-size: 11pt;
            line-height: 1.8;
          }
          .footer-sign {
            margin-top: 30px;
            display: flex;
            justify-content: space-between;
            font-size: 10pt;
            border-top: 1px solid #e2e8f0;
            padding-top: 14px;
            color: #64748b;
          }
        </style>
      </head>
      <body>
        <div class="header-box">
          <div>
            <div class="school-title">مدارس النيل المصرية الدولية - فرع المنيا</div>
            <div class="school-sub">بوابة متابعة مرحلة رياض الأطفال • KG 1</div>
          </div>
          <div class="badge">${sub.nameAr} - ${sub.nameEn}</div>
        </div>

        <div class="student-row">
          <div>اسم التلميذ: ..............................................................</div>
          <div>Class: KG 1 ( ... )</div>
          <div>التاريخ: ${new Date().toLocaleDateString('ar-EG')}</div>
        </div>

        <div class="meta-grid">
          <div><strong>عنوان الشيت:</strong> ${file.title}</div>
          <div><strong>Topic:</strong> ${getBlockName(file.blockId || 'block1')}</div>
          <div><strong>نوع الملف:</strong> ${file.fileType.toUpperCase()}</div>
          <div><strong>الملف:</strong> ${file.fileName}</div>
        </div>

        <div class="worksheet-body">
${file.previewSummary || file.description || 'محتوى الشيت الدراسي المعتمد لمدارس النيل المصرية الدولية.'}
        </div>

        <div class="footer-sign">
          <div>توقيع منسق المادة: ........................</div>
          <div>اعتماد إدارة مدرسة النيل - المنيا</div>
          <div>طُبع بتاريخ: ${new Date().toLocaleDateString('ar-EG')}</div>
        </div>
      </body>
      </html>
    `);
    printWindow.document.close();
    printWindow.focus();
    setTimeout(() => {
      printWindow.print();
    }, 400);
  };

  // Admin: Open Add Modal for the selected block
  const handleOpenAddModal = (presetSubjectId?: string) => {
    setEditingFileId(null);
    setFormTitle('');
    setFormSubject(presetSubjectId || SUBJECTS[0].id);
    setFormBlock(activeBlock);
    setFormWeek('');
    setFormClass('all');
    setFormType('pdf');
    setFormDescription('');
    setFormPreviewSummary('');
    setFormFileName(`Worksheet_${presetSubjectId || 'Subject'}_${activeBlock}.pdf`);
    setFormFileSize('1.8 MB');
    setFormFileDataUrl(undefined);
    setIsModalOpen(true);
  };

  // Admin: Open Edit Modal
  const handleOpenEditModal = (file: SchoolMaterialFile) => {
    setEditingFileId(file.id);
    setFormTitle(file.title);
    setFormSubject(file.subjectId);
    setFormBlock(file.blockId || activeBlock);
    setFormWeek(file.weekId || '');
    setFormClass(file.classId);
    setFormType(file.fileType);
    setFormDescription(file.description || '');
    setFormPreviewSummary(file.previewSummary || '');
    setFormFileName(file.fileName);
    setFormFileSize(file.fileSize);
    setFormFileDataUrl(file.fileDataUrl);
    setIsModalOpen(true);
  };

  // Admin: Delete Material
  const handleDeleteFile = (id: string, title: string) => {
    if (!window.confirm(`هل أنت متأكد من حذف الشيت "${title}"؟`)) return;
    const updated = materials.filter((m) => m.id !== id);
    saveStoredMaterials(updated);
    onUpdateMaterials(updated);
  };

  // Local file upload handling
  const handleFileInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setFormFileName(file.name);
    const sizeInMb = (file.size / (1024 * 1024)).toFixed(1);
    setFormFileSize(`${sizeInMb} MB`);

    const ext = file.name.split('.').pop()?.toLowerCase();
    if (ext === 'pdf' || file.type.includes('pdf')) setFormType('pdf');
    else if (['doc', 'docx'].includes(ext || '') || file.type.includes('word') || file.type.includes('document')) setFormType('doc');
    else if (file.type.includes('image') || ['png', 'jpg', 'jpeg', 'webp'].includes(ext || '')) setFormType('image');
    else if (file.type.includes('sheet') || ['xlsx', 'xls', 'csv'].includes(ext || '')) setFormType('sheet');
    else setFormType('doc');

    const reader = new FileReader();
    reader.onload = () => {
      setFormFileDataUrl(reader.result as string);
    };
    reader.readAsDataURL(file);

    if (!formTitle) {
      setFormTitle(file.name.replace(/\.[^/.]+$/, '').replace(/_/g, ' '));
    }
  };

  // Admin: Save File
  const handleSaveFile = (e: React.FormEvent) => {
    e.preventDefault();
    if (!formTitle.trim()) return;

    if (editingFileId) {
      // Edit
      const updated = materials.map((m) => {
        if (m.id === editingFileId) {
          return {
            ...m,
            title: formSubject === 'dictation' ? 'Dictation' : formTitle.trim(),
            subjectId: formSubject,
            blockId: formBlock,
            weekId: formSubject === 'dictation' ? (formWeek || selectedWeek) : formWeek || undefined,
            materialKind: formSubject === 'dictation' ? 'dictation' : formWeek ? 'week' : 'main',
            classId: formClass,
            fileType: formType,
            fileName: formFileName.trim() || m.fileName,
            fileSize: formFileSize || m.fileSize,
            description: formDescription.trim() || undefined,
            previewSummary: formPreviewSummary.trim() || undefined,
            fileDataUrl: formFileDataUrl || m.fileDataUrl
          };
        }
        return m;
      });
      onUpdateMaterials(updated);
    } else {
      // Add
      const newFile: SchoolMaterialFile = {
        id: `mat-${Date.now()}`,
        title: formSubject === 'dictation' ? 'Dictation' : formTitle.trim(),
        subjectId: formSubject,
        classId: formClass,
        blockId: formBlock,
        weekId: formSubject === 'dictation' ? (formWeek || selectedWeek) : formWeek || undefined,
        materialKind: formSubject === 'dictation' ? 'dictation' : formWeek ? 'week' : 'main',
        fileType: formType,
        fileName: formFileName.trim() || `Sheet_${Date.now()}.${formType === 'pdf' ? 'pdf' : 'docx'}`,
        fileSize: formFileSize || '1.8 MB',
        uploadDate: new Date().toISOString().slice(0, 10),
        uploadedBy: 'إدارة المدرسة (Admin)',
        description: formDescription.trim() || undefined,
        previewSummary: formPreviewSummary.trim() || undefined,
        fileDataUrl: formFileDataUrl
      };
      const newScopeWeek = newFile.weekId || undefined;
      const placeholderIndex = materials.findIndex((existing) =>
        !existing.fileDataUrl &&
        existing.subjectId === newFile.subjectId &&
        (existing.blockId || 'block1') === (newFile.blockId || 'block1') &&
        (existing.weekId || undefined) === newScopeWeek &&
        (existing.materialKind || (existing.weekId ? 'week' : 'main')) === newFile.materialKind
      );
      if (placeholderIndex >= 0) {
        const replaced = [...materials];
        replaced[placeholderIndex] = newFile;
        onUpdateMaterials(replaced);
      } else {
        onUpdateMaterials([newFile, ...materials]);
      }
    }

    setIsModalOpen(false);
  };

  // Helper for file type icons
  const renderFileTypeIcon = (type: SchoolMaterialFile['fileType']) => {
    switch (type) {
      case 'pdf':
        return <FileText className="w-5 h-5 text-red-500" />;
      case 'sheet':
        return <FileSpreadsheet className="w-5 h-5 text-emerald-600" />;
      case 'image':
        return <ImageIcon className="w-5 h-5 text-sky-500" />;
      case 'doc':
      default:
        return <File className="w-5 h-5 text-blue-600" />;
    }
  };

  return (
    <div className="space-y-6">
      {/* ================= LEVEL 1: BLOCK CARDS SELECTOR ================= */}
      <div className="bg-white rounded-2xl p-5 border border-slate-200 shadow-xs">
        <div className="flex flex-wrap items-center justify-between gap-4 mb-4">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-xl bg-purple-50 text-purple-700 border border-purple-100 flex items-center justify-center font-bold">
              <FolderOpen className="w-6 h-6" />
            </div>
            <div>
              <h2 className="text-lg font-black text-slate-900 tracking-tight flex items-center gap-2">
                <span>Materials</span>
                <span className="text-xs font-semibold px-2.5 py-0.5 rounded-full bg-purple-100 text-purple-800 border border-purple-200">
                  شيتات ومذكرات التوبيكات
                </span>
              </h2>
              <p className="text-xs text-slate-500 mt-0.5">
                اختر التوبيك لعرض المواد والشيتات الخاصة بكل مادة مباشرة مع أزرار المعاينة، التحميل، والطباعة
              </p>
            </div>
          </div>

          {currentRole === 'admin' && (
            <div className="flex items-center gap-2">
              <button
                id="btn-admin-add-sheet-top"
                type="button"
                onClick={() => handleOpenAddModal()}
                className="bg-purple-600 hover:bg-purple-700 text-white font-bold text-xs px-4 py-2 rounded-xl shadow-xs flex items-center gap-2 transition-all shrink-0"
              >
                <Plus className="w-4 h-4" />
                <span>+ Add Sheet</span>
              </button>
            </div>
          )}
        </div>

        {/* 4 Large Block Cards */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 pt-2">
          {BLOCKS.map((block) => {
            const count = materials.filter((m) => m.blockId === block.id).length;
            const isLocked = count === 0 && block.id !== 'block1';
            const isActive = activeBlock === block.id;

            return (
              <button
                key={block.id}
                id={`block-select-btn-${block.id}`}
                type="button"
                onClick={() => {
                  setActiveBlock(block.id);
                  setSelectedSubjectFilter('all');
                }}
                className={`p-4 rounded-xl border text-right transition-all flex flex-col justify-between relative overflow-hidden ${
                  isActive
                    ? 'bg-purple-50/80 border-purple-500 shadow-sm ring-2 ring-purple-500/20'
                    : isLocked
                    ? 'bg-slate-100/60 border-slate-200 hover:bg-slate-100 text-slate-400'
                    : 'bg-slate-50/70 border-slate-200 hover:bg-slate-100/70 hover:border-slate-300'
                }`}
              >
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center gap-2">
                    {isLocked ? (
                      <Lock className="w-4 h-4 text-slate-400" />
                    ) : (
                      <Layers className={`w-4 h-4 ${isActive ? 'text-purple-600' : 'text-slate-400'}`} />
                    )}
                    <span className={`text-sm font-black ${isActive ? 'text-purple-900' : isLocked ? 'text-slate-600' : 'text-slate-800'}`}>
                      {block.nameAr}
                    </span>
                  </div>
                  {isActive ? (
                    <span className="w-2.5 h-2.5 rounded-full bg-purple-600 animate-pulse"></span>
                  ) : isLocked ? (
                    <span className="text-[10px] bg-slate-200 text-slate-600 px-1.5 py-0.5 rounded font-bold">مقفول</span>
                  ) : null}
                </div>

                <div className="flex items-center justify-between text-xs text-slate-500 mt-1">
                  <span className="font-semibold text-[11px]">
                    {count === 0 ? 'مقفول وفارغ (0)' : `${count} ${count === 1 ? 'شيت متاح' : 'شيتات ومذكرات'}`}
                  </span>
                  <span className={`text-[10px] font-bold px-2 py-0.5 rounded-md ${
                    isActive
                      ? 'bg-purple-200/80 text-purple-900'
                      : isLocked
                      ? 'bg-slate-200 text-slate-600'
                      : 'bg-slate-200/60 text-slate-600'
                  }`}>
                    {isActive ? 'مفتوح الآن' : isLocked ? 'فارغ ومغلق' : 'انقر للفتح'}
                  </span>
                </div>
              </button>
            );
          })}
        </div>
        <div className="mt-4 pt-4 border-t border-slate-100 flex items-center gap-2 overflow-x-auto">
          <span className="text-xs font-black text-slate-500 shrink-0">Sheets:</span>
          <button type="button" onClick={() => setActiveMaterialScope('main')} className={`px-3 py-1.5 rounded-lg text-xs font-bold shrink-0 border ${activeMaterialScope === 'main' ? 'bg-purple-100 text-purple-900 border-purple-300' : 'bg-slate-100 text-slate-600 border-slate-200'}`}>
            Main Sheets (Topic)
          </button>
          {WEEKS.map((week) => (
            <button key={week.id} type="button" onClick={() => setActiveMaterialScope(week.id)} className={`px-3 py-1.5 rounded-lg text-xs font-bold shrink-0 border ${activeMaterialScope === week.id ? 'bg-emerald-100 text-emerald-900 border-emerald-300' : 'bg-slate-100 text-slate-600 border-slate-200'}`}>
              {week.nameAr}
            </button>
          ))}
        </div>
      </div>

      {/* ================= LEVEL 2: ACTIVE BLOCK HEADER & SEARCH ================= */}
      <div className="bg-white rounded-2xl p-4 border border-slate-200 shadow-xs flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <span className="font-bold text-slate-800 text-sm flex items-center gap-1.5">
            <FolderOpen className="w-4 h-4 text-purple-600" />
            <span>محتوى {getBlockName(activeBlock)}:</span>
          </span>
          <span className="text-xs bg-slate-100 text-slate-600 px-2.5 py-1 rounded-lg font-medium">
            يحتوي على شيتات المواد الدراسية المقررة
          </span>
        </div>

        <div className="flex items-center gap-2 flex-wrap w-full sm:w-auto">
          {/* Search bar */}
          <div className="relative flex-1 sm:w-60">
            <Search className="w-4 h-4 text-slate-400 absolute right-3 top-2.5" />
            <input
              type="text"
              placeholder="بحث في شيتات المواد..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-3 pr-9 py-1.5 text-xs bg-slate-50 border border-slate-200 rounded-xl focus:outline-hidden focus:border-purple-500 focus:bg-white transition-colors font-medium"
            />
          </div>

          {/* Subject Filter Dropdown */}
          <select
            value={selectedSubjectFilter}
            onChange={(e) => setSelectedSubjectFilter(e.target.value)}
            className="text-xs bg-slate-50 border border-slate-200 rounded-xl px-3 py-1.5 font-semibold text-slate-700 focus:outline-hidden focus:border-purple-500 cursor-pointer"
          >
            <option value="all">جميع المواد الدراسية</option>
            {SUBJECTS.map((sub) => (
              <option key={sub.id} value={sub.id}>
                {sub.nameAr} ({sub.nameEn})
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* ================= LEVEL 3: SUBJECTS & THEIR SHEETS INSIDE THE BLOCK ================= */}
      {blockMaterials.length === 0 ? (
        <div className="bg-white rounded-2xl p-12 text-center border border-slate-200 shadow-xs">
          <div className="w-16 h-16 rounded-2xl bg-slate-100 text-slate-500 flex items-center justify-center mx-auto mb-3">
            <Lock className="w-8 h-8" />
          </div>
          <h3 className="font-black text-slate-800 text-base mb-1">
            {activeBlock !== 'block1'
              ? `${getBlockName(activeBlock)} مقفول وفارغ تماماً (0 شيتات)`
              : `لا توجد شيتات حالياً في ${getBlockName(activeBlock)}`}
          </h3>
          <p className="text-xs text-slate-500 max-w-md mx-auto mb-4 leading-relaxed">
            {activeBlock !== 'block1'
              ? 'هذا التوبيك فارغ تماماً ومغلق حالياً، ولن يتم تنزيل أو عرض أي شيتات فيه حتى تبدأ الإدارة في تحميلها ورفعها مباشرة.'
              : 'يمكن للأدمن رفع شيتات لكل مادة (عربي، ماث، إنجليزي، ساينس، دراسات، إلخ) بضغطة زر.'}
          </p>
          {currentRole === 'admin' && (
            <button
              type="button"
              onClick={() => handleOpenAddModal()}
              className="bg-purple-600 hover:bg-purple-700 text-white text-xs font-bold px-4 py-2 rounded-xl shadow-xs inline-flex items-center gap-1.5 transition-colors"
            >
              <Plus className="w-4 h-4" />
              <span>تحميل ورفع شيت في {getBlockName(activeBlock)}</span>
            </button>
          )}
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {blockMaterials.map((file) => {
            return (
              <div
                key={file.id}
                id={`material-card-${file.id}`}
                className="bg-white rounded-2xl border border-slate-200 shadow-xs hover:border-purple-300 hover:shadow-md transition-all overflow-hidden group"
              >
                <div className="p-4">
                  {/* Row 1: اسم المادة */}
                  <div className="flex items-center justify-between gap-2 mb-2.5">
                    <SubjectBadge subjectId={file.subjectId} size="md" />

                    {currentRole === 'admin' && (
                      <button
                        id={`btn-delete-material-${file.id}`}
                        type="button"
                        onClick={() => handleDeleteFile(file.id, file.title || file.fileName)}
                        className="p-1.5 rounded-lg text-slate-400 hover:text-red-700 hover:bg-red-50 border border-transparent hover:border-red-200 transition-colors"
                        title="حذف هذا الـSheet"
                        aria-label={`حذف ${file.title || file.fileName}`}
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    )}

                  </div>

                  {/* Row 2: رابط اسم الشيت مباشرة تحت اسم المادة */}
                  <div className="mb-4">
                    <div className="text-right w-full font-bold text-sky-800 text-sm flex items-center gap-2 p-2 rounded-xl bg-slate-50 border border-slate-200">
                      <FileText className="w-4 h-4 text-sky-600 shrink-0" />
                      <span className="truncate">{file.title || file.fileName}</span>
                      <span className="mr-auto text-[10px] font-black uppercase px-2 py-0.5 rounded-md bg-white text-slate-500 border border-slate-200">{file.fileType}</span>
                    </div>
                  </div>

                  <div className="grid grid-cols-3 gap-2">
                    <button
                      id={`btn-preview-${file.id}`}
                      type="button"
                      onClick={() => handlePreviewFile(file)}
                      className="flex items-center justify-center gap-1.5 py-2 px-2 rounded-xl bg-purple-50 hover:bg-purple-100 text-purple-800 border border-purple-200 transition-all text-xs font-bold cursor-pointer"
                      title="معاينة الشيت"
                    >
                      <Eye className="w-3.5 h-3.5 text-purple-600 shrink-0" />
                      <span>معاينة</span>
                    </button>
                    <button
                      id={`btn-download-${file.id}`}
                      type="button"
                      onClick={() => handleDownloadFile(file)}
                      className="flex items-center justify-center gap-1.5 py-2 px-2 rounded-xl bg-emerald-50 hover:bg-emerald-100 text-emerald-800 border border-emerald-200 transition-all text-xs font-bold cursor-pointer"
                      title="تحميل الشيت"
                    >
                      <Download className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                      <span>تحميل</span>
                    </button>

                    <button
                      id={`btn-print-${file.id}`}
                      type="button"
                      onClick={() => handlePrintFile(file)}
                      className="flex items-center justify-center gap-1.5 py-2 px-2 rounded-xl bg-amber-50 hover:bg-amber-100 text-amber-900 border border-amber-200 transition-all text-xs font-bold cursor-pointer"
                      title="طباعة الشيت"
                    >
                      <Printer className="w-3.5 h-3.5 text-amber-700 shrink-0" />
                      <span>طباعة</span>
                    </button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {dictationOpen && currentRole === 'admin' && (
        <div className="fixed inset-0 bg-slate-950/70 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-2xl max-w-lg w-full p-5 shadow-2xl space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="font-black text-slate-900 flex items-center gap-2"><FileText className="w-5 h-5 text-rose-600" /> Dictation</h3>
              <button type="button" onClick={() => setDictationOpen(false)} className="p-1 rounded-lg hover:bg-slate-100"><X className="w-4 h-4" /></button>
            </div>
            <p className="text-xs text-slate-600">ارفع ملف الإملاء الأصلي. سيظهر في Homework دون قراءة أو تغيير الملف.</p>
            <div className="w-full px-3 py-2 rounded-xl border border-rose-200 bg-rose-50 text-rose-800 text-xs font-black">Material: Dictation</div>
            <input type="file" accept=".pdf,.doc,.docx,image/*" onChange={handlePickDictationFile} className="w-full text-xs" />
            {dictationFile && <div className="text-xs font-bold text-rose-700 bg-rose-50 border border-rose-200 rounded-xl p-3">{dictationFile.name} • {dictationFile.size}</div>}
            <div className="flex justify-end gap-2 border-t border-slate-100 pt-3">
              <button type="button" onClick={() => setDictationOpen(false)} className="px-4 py-2 text-xs font-bold text-slate-600 rounded-xl hover:bg-slate-100">Cancel</button>
              <button type="button" disabled={!dictationFile} onClick={saveDictation} className="px-4 py-2 text-xs font-bold text-white bg-rose-600 disabled:opacity-50 rounded-xl">Save Dictation</button>
            </div>
          </div>
        </div>
      )}

      {/* ================= MODAL: HIGH-DEFINITION ACTUAL FILE VIEWER (معاينة) ================= */}
      {previewFile && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-xs flex items-center justify-center p-2 sm:p-4 z-50 overflow-hidden">
          <div className="bg-white rounded-3xl max-w-5xl w-full h-[94vh] shadow-2xl border border-slate-300 flex flex-col justify-between overflow-hidden">
            {/* Modal Top Header */}
            <div className="flex items-center justify-between gap-3 px-5 py-3.5 border-b border-slate-200 bg-slate-50/80 shrink-0">
              <div className="flex items-center gap-3 min-w-0">
                <div className="w-10 h-10 rounded-xl bg-purple-100 text-purple-700 border border-purple-200 flex items-center justify-center shrink-0">
                  {renderFileTypeIcon(previewFile.fileType)}
                </div>
                <div className="min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <SubjectBadge subjectId={previewFile.subjectId} size="sm" />
                    <span className="text-[11px] font-bold px-2 py-0.5 rounded-md bg-purple-100 text-purple-800">
                      {getBlockName(previewFile.blockId || 'block1')}
                    </span>
                    <span className="text-[11px] font-bold px-2 py-0.5 rounded-md bg-slate-100 text-slate-700">
                      {previewFile.classId === 'all' ? 'All Classes (KG 1)' : `Class ${previewFile.classId}`}
                    </span>
                    <span className="text-[11px] font-mono text-slate-500 truncate max-w-[200px]">
                      {previewFile.fileName}
                    </span>
                  </div>
                  <h3 className="font-black text-slate-900 text-sm sm:text-base mt-0.5 truncate">
                    {previewFile.title}
                  </h3>
                </div>
              </div>

              {/* Quick Actions in Header */}
              <div className="flex items-center gap-2 shrink-0">
                {/* View Mode Switcher */}
                <div className="hidden sm:flex items-center bg-slate-200/80 p-0.5 rounded-xl text-xs font-bold text-slate-700">
                  <button
                    type="button"
                    onClick={() => setPreviewTab('document')}
                    className={`px-3 py-1.5 rounded-lg transition-all ${
                      previewTab === 'document' ? 'bg-white text-purple-900 shadow-xs' : 'text-slate-600 hover:text-slate-900'
                    }`}
                  >
                    عرض الفايل الكامل
                  </button>
                  <button
                    type="button"
                    onClick={() => setPreviewTab('text')}
                    className={`px-3 py-1.5 rounded-lg transition-all ${
                      previewTab === 'text' ? 'bg-white text-purple-900 shadow-xs' : 'text-slate-600 hover:text-slate-900'
                    }`}
                  >
                    النص والأسئلة
                  </button>
                </div>

                {/* Open In New Window Button */}
                <button
                  type="button"
                  onClick={() => handleOpenInNewTab(previewFile)}
                  className="px-3 py-1.5 rounded-xl bg-purple-50 hover:bg-purple-100 border border-purple-200 text-purple-800 text-xs font-bold flex items-center gap-1.5 transition-colors cursor-pointer"
                  title="فتح الفايل في نافذة منفصلة أو تبويب كامل"
                >
                  <ExternalLink className="w-4 h-4 text-purple-600" />
                  <span className="hidden md:inline">فتح في نافذة كاملة</span>
                </button>

                {/* Close Button */}
                <button
                  type="button"
                  onClick={() => setPreviewFile(null)}
                  className="p-2 text-slate-400 hover:text-slate-700 hover:bg-slate-200 rounded-xl transition-colors shrink-0 cursor-pointer"
                  title="إغلاق المعاينة"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
            </div>

            {/* Modal Body: The Actual File Viewer */}
            <div className="flex-1 bg-slate-100 p-2 sm:p-4 overflow-hidden flex flex-col">
              {previewTab === 'document' ? (
                <div className="w-full h-full flex flex-col bg-white rounded-2xl border border-slate-300 shadow-inner overflow-hidden relative">
                  {previewFile.fileDataUrl ? (
                    previewFile.fileDataUrl.startsWith('data:image') || previewFile.fileType === 'image' ? (
                      <div className="w-full h-full flex items-center justify-center p-4 bg-slate-900 overflow-auto">
                        <img
                          src={previewFile.fileDataUrl}
                          alt={previewFile.title}
                          className="max-h-full max-w-full object-contain rounded-lg shadow-2xl"
                        />
                      </div>
                    ) : (
                      /* Actual binary PDF embedded directly in native PDF iframe */
                      <iframe
                        src={previewObjectUrl || previewFile.fileDataUrl}
                        title={previewFile.title}
                        className="w-full h-full border-0 bg-white"
                      />
                    )
                  ) : (
                    /* High-definition rendered Nile Egyptian Schools Worksheet Document */
                    <iframe
                      srcDoc={generateDocumentHtml(previewFile)}
                      title={previewFile.title}
                      className="w-full h-full border-0 bg-white"
                    />
                  )}
                </div>
              ) : (
                /* Text and exercises view with copy ability */
                <div className="w-full h-full bg-white rounded-2xl border border-slate-300 shadow-inner p-6 overflow-y-auto flex flex-col justify-between">
                  <div>
                    <div className="flex items-center justify-between pb-3 mb-4 border-b border-slate-200">
                      <div className="flex items-center gap-2">
                        <BookOpen className="w-5 h-5 text-purple-600" />
                        <span className="font-black text-slate-800 text-sm">
                          نص التدريبات والأسئلة الدراسية للشيت:
                        </span>
                      </div>
                      <button
                        type="button"
                        onClick={() => {
                          const text = previewFile.previewSummary || previewFile.description || '';
                          navigator.clipboard.writeText(text);
                          setCopiedNotification(true);
                          setTimeout(() => setCopiedNotification(false), 2000);
                        }}
                        className="text-xs font-bold text-purple-700 hover:text-purple-900 flex items-center gap-1.5 bg-purple-50 hover:bg-purple-100 px-3 py-1.5 rounded-xl border border-purple-200 transition-colors cursor-pointer"
                      >
                        <Copy className="w-4 h-4" />
                        <span>{copiedNotification ? 'تم النسخ بنجاح ✓' : 'نسخ نص الأسئلة'}</span>
                      </button>
                    </div>

                    <div className="font-sans text-sm leading-relaxed whitespace-pre-wrap text-slate-800 p-4 bg-slate-50 rounded-xl border border-slate-200">
                      {previewFile.previewSummary ||
                        previewFile.description ||
                        'محتوى الشيت التدريبي متوفر لدى إدارة مدرسة النيل.'}
                    </div>
                  </div>

                  <div className="mt-4 pt-3 border-t border-slate-200 text-xs text-slate-500 flex justify-between items-center">
                    <span>حجم الملف: {previewFile.fileSize}</span>
                    <span>تاريخ الرفع: {previewFile.uploadDate}</span>
                  </div>
                </div>
              )}
            </div>

            {/* Modal Bottom Footer */}
            <div className="px-5 py-3 border-t border-slate-200 bg-white flex flex-wrap items-center justify-between gap-3 shrink-0">
              <div className="flex items-center gap-3">
                <button
                  type="button"
                  onClick={() => handleDownloadFile(previewFile)}
                  className="px-4 py-2 rounded-xl text-xs font-bold bg-emerald-600 hover:bg-emerald-700 text-white flex items-center gap-1.5 transition-colors shadow-xs cursor-pointer"
                >
                  <Download className="w-4 h-4" />
                  <span>تحميل الشيت</span>
                </button>

                <button
                  type="button"
                  onClick={() => handlePrintFile(previewFile)}
                  className="px-4 py-2 rounded-xl text-xs font-bold bg-amber-500 hover:bg-amber-600 text-white flex items-center gap-1.5 transition-colors shadow-xs cursor-pointer"
                >
                  <Printer className="w-4 h-4" />
                  <span>طباعة الشيت</span>
                </button>

                <button
                  type="button"
                  onClick={() => handleOpenInNewTab(previewFile)}
                  className="px-4 py-2 rounded-xl text-xs font-bold bg-slate-100 hover:bg-slate-200 text-slate-800 flex items-center gap-1.5 transition-colors cursor-pointer"
                >
                  <Maximize2 className="w-4 h-4 text-slate-600" />
                  <span>عرض ملء الشاشة</span>
                </button>
              </div>

              <button
                type="button"
                onClick={() => setPreviewFile(null)}
                className="px-5 py-2 text-xs font-bold text-slate-600 hover:bg-slate-100 rounded-xl transition-colors cursor-pointer"
              >
                إغلاق المعاينة
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ================= MODAL: ADMIN ADD & EDIT ================= */}
      {isModalOpen && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4 z-50 overflow-y-auto">
          <div className="bg-white rounded-3xl max-w-xl w-full p-6 shadow-2xl border border-slate-200 my-8">
            <div className="flex items-center justify-between pb-4 border-b border-slate-100 mb-4">
              <div className="flex items-center gap-2.5">
                <div className="w-9 h-9 rounded-xl bg-purple-50 text-purple-700 flex items-center justify-center font-bold">
                  {editingFileId ? <Edit2 className="w-4 h-4" /> : <Plus className="w-4 h-4" />}
                </div>
                <div>
                  <h3 className="font-black text-slate-900 text-base">
                    {editingFileId ? 'تعديل بيانات الشيت' : `إضافة شيت جديد في ${getBlockName(formBlock)}`}
                  </h3>
                  <p className="text-[11px] text-slate-500">
                    يمكنك رفع ملف PDF أو Word أو كتابة محتوى وتدريبات الشيت
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setIsModalOpen(false)}
                className="p-1.5 text-slate-400 hover:text-slate-700 hover:bg-slate-100 rounded-xl"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSaveFile} className="space-y-4">
              {/* File upload button */}
              <div className="bg-purple-50/70 border border-dashed border-purple-300 rounded-2xl p-4 text-center">
                <input
                  type="file"
                  ref={fileInputRef}
                  onChange={handleFileInputChange}
                  accept=".pdf,.doc,.docx,.xlsx,.png,.jpg"
                  className="hidden"
                />
                <button
                  type="button"
                  onClick={() => fileInputRef.current?.click()}
                  className="bg-white hover:bg-purple-100 text-purple-800 font-bold px-4 py-2 rounded-xl text-xs border border-purple-300 shadow-2xs inline-flex items-center gap-2 transition-all cursor-pointer"
                >
                  <Upload className="w-4 h-4 text-purple-600" />
                  <span>اختيار ملف من الجهاز (PDF أو Word)</span>
                </button>
                {formFileName && (
                  <p className="text-xs text-purple-900 font-bold mt-2">
                    الملف المختار: {formFileName} ({formFileSize})
                  </p>
                )}
              </div>

              {/* Block & Subject */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">التوبيك المقترح</label>
                  <select
                    value={formBlock}
                    onChange={(e) => setFormBlock(e.target.value)}
                    className="w-full text-xs bg-slate-50 border border-slate-200 rounded-xl p-2.5 font-medium"
                  >
                    {BLOCKS.map((b) => (
                      <option key={b.id} value={b.id}>
                        {b.nameAr}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">المادة الدراسية</label>
                  <select
                    value={formSubject}
                    onChange={(e) => setFormSubject(e.target.value)}
                    className="w-full text-xs bg-slate-50 border border-slate-200 rounded-xl p-2.5 font-medium"
                  >
                    {SUBJECTS.map((s) => (
                      <option key={s.id} value={s.id}>
                        {s.nameAr} ({s.nameEn})
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">نطاق الشيت</label>
                  <select
                    value={formWeek}
                    onChange={(e) => setFormWeek(e.target.value)}
                    className="w-full text-xs bg-slate-50 border border-slate-200 rounded-xl p-2.5 font-medium"
                  >
                    <option value="">شيتات التوبيك العامة (Topic Sheets)</option>
                    {WEEKS.map((week) => <option key={week.id} value={week.id}>{week.nameAr}</option>)}
                  </select>
                </div>
              </div>

              {/* Title */}
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">عنوان الشيت</label>
                <input
                  type="text"
                  required
                  placeholder="مثال: شيت مادة اللغة العربية - توبيك 1"
                  value={formTitle}
                  onChange={(e) => setFormTitle(e.target.value)}
                  className="w-full text-xs bg-slate-50 border border-slate-200 rounded-xl p-2.5 font-semibold"
                />
              </div>

              {/* Description */}
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">وصف مختصر للشيت</label>
                <input
                  type="text"
                  placeholder="وصف محتويات الشيت والدروس المستهدفة..."
                  value={formDescription}
                  onChange={(e) => setFormDescription(e.target.value)}
                  className="w-full text-xs bg-slate-50 border border-slate-200 rounded-xl p-2.5"
                />
              </div>

              {/* Summary / Document Content */}
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  محتوى الشيت والتدريبات (يظهر عند الضغط على معاينة وطباعة)
                </label>
                <textarea
                  rows={5}
                  placeholder="اكتب الأسئلة والتدريبات هنا ليتمكن الطالب والمعلم من معاينتها وطباعتها مباشرة..."
                  value={formPreviewSummary}
                  onChange={(e) => setFormPreviewSummary(e.target.value)}
                  className="w-full text-xs bg-slate-50 border border-slate-200 rounded-xl p-2.5 font-mono"
                />
              </div>

              <div className="flex items-center justify-end gap-3 pt-3 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="px-4 py-2 text-xs font-bold text-slate-600 hover:bg-slate-100 rounded-xl"
                >
                  إلغاء
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 text-xs font-bold bg-purple-600 hover:bg-purple-700 text-white rounded-xl shadow-xs"
                >
                  {editingFileId ? 'حفظ التعديلات' : 'حفظ ونشر الشيت فوراً'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
