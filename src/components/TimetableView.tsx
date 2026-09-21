import React, { useState, useRef } from 'react';
import {
  Calendar,
  Clock,
  Download,
  Printer,
  Edit3,
  Check,
  UserCheck,
  Building,
  Coffee,
  Eye,
  FileText,
  X,
  Upload,
  Image as ImageIcon,
  Trash2,
  Sparkles,
  CheckCircle2,
  Save
} from 'lucide-react';
import { ClassTimetable, SchoolClass, UserRole, PeriodSlot, DaySchedule } from '../types';
import { SubjectBadge, getSubjectInfo, RenderSubjectIcon } from './SubjectBadge';
import { SUBJECTS, PERIOD_TIMES } from '../data/initialData';
import { parseUploadedTimetable } from '../lib/timetableParser';

interface TimetableViewProps {
  currentRole: UserRole;
  selectedClass: SchoolClass;
  onSelectClass: (cls: SchoolClass) => void;
  timetables: ClassTimetable[];
  onUpdateTimetables: (data: ClassTimetable[]) => void;
  onOpenPrint: () => void;
}

export const TimetableView: React.FC<TimetableViewProps> = ({
  currentRole,
  selectedClass,
  onSelectClass,
  timetables,
  onUpdateTimetables,
  onOpenPrint
}) => {
  const currentTimetable = timetables.find((t) => t.classId === selectedClass) || timetables[0];
  const [activeDayIndex, setActiveDayIndex] = useState<number>(0); // 0 = Sunday
  const [viewMode, setViewMode] = useState<'grid' | 'day' | 'document'>('grid');
  const [isDocModalOpen, setIsDocModalOpen] = useState<boolean>(false);

  // Bulk Upload / Edit Timetable Modal
  const [isUploadModalOpen, setIsUploadModalOpen] = useState<boolean>(false);
  const [uploadClassTarget, setUploadClassTarget] = useState<SchoolClass | 'all'>(selectedClass);
  const [uploadFileDataUrl, setUploadFileDataUrl] = useState<string>('');
  const [uploadFileName, setUploadFileName] = useState<string>('');
  const [uploadFileType, setUploadFileType] = useState<'image' | 'pdf'>('image');
  const [uploadFileSize, setUploadFileSize] = useState<string>('');
  const [parseNotification, setParseNotification] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  // Full Schedule Quick Bulk Editor Modal
  const [isFullScheduleEditorOpen, setIsFullScheduleEditorOpen] = useState<boolean>(false);
  const [editingDays, setEditingDays] = useState<DaySchedule[]>([]);

  const handleOpenFullScheduleEditor = () => {
    // Deep clone current days of selected timetable
    setEditingDays(JSON.parse(JSON.stringify(currentTimetable.days)));
    setIsFullScheduleEditorOpen(true);
  };

  const handleUpdateEditingSlotSubject = (dayIdx: number, periodIdx: number, newSubjectId: string) => {
    setEditingDays((prev) => {
      const copy: DaySchedule[] = JSON.parse(JSON.stringify(prev));
      if (copy[dayIdx]?.periods[periodIdx]) {
        copy[dayIdx].periods[periodIdx].subjectId = newSubjectId;
      }
      return copy;
    });
  };

  const handleUpdateEditingSlotTeacher = (dayIdx: number, periodIdx: number, teacher: string) => {
    setEditingDays((prev) => {
      const copy: DaySchedule[] = JSON.parse(JSON.stringify(prev));
      if (copy[dayIdx]?.periods[periodIdx]) {
        copy[dayIdx].periods[periodIdx].teacher = teacher;
      }
      return copy;
    });
  };

  const handleSaveFullSchedule = () => {
    const updated = timetables.map((tt) => {
      if (tt.classId === selectedClass) {
        return {
          ...tt,
          days: editingDays
        };
      }
      return tt;
    });
    onUpdateTimetables(updated);
    setIsFullScheduleEditorOpen(false);
    setParseNotification(`تم حفظ وتحديث جدول حصص فصل ${selectedClass} كاملاً بنجاح ✓`);
    setTimeout(() => {
      setParseNotification(null);
    }, 4000);
  };

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const isPdf = file.type.includes('pdf') || file.name.toLowerCase().endsWith('.pdf');
    const isImg = file.type.startsWith('image/');

    if (!isPdf && !isImg) {
      alert('يرجى اختيار ملف صورة (PNG, JPG) أو ملف PDF لجدول الحصص');
      return;
    }

    const reader = new FileReader();
    reader.onload = (event) => {
      const dataUrl = event.target?.result as string;
      setUploadFileDataUrl(dataUrl);
      setUploadFileName(file.name);
      setUploadFileType(isPdf ? 'pdf' : 'image');
      setUploadFileSize(`${(file.size / (1024 * 1024)).toFixed(1)} MB`);
    };
    reader.readAsDataURL(file);
  };

  const handleSaveUploadedTimetable = async () => {
    if (!uploadFileDataUrl) {
      alert('يرجى اختيار ملف الجدول أولاً');
      return;
    }

    let parsedByClass: Record<string, Awaited<ReturnType<typeof parseUploadedTimetable>>> = {};
    if (uploadFileType === 'pdf' || uploadFileType === 'image') {
      try {
        const targets = uploadClassTarget === 'all' ? (['KG1A', 'KG1B', 'KG1C', 'KG1D', 'KG1E'] as SchoolClass[]) : [uploadClassTarget];
        const results = await Promise.all(targets.map(async (classId) => [classId, await parseUploadedTimetable(uploadFileDataUrl, classId, uploadFileType)] as const));
        parsedByClass = Object.fromEntries(results);
      } catch (error) {
        console.error('PDF timetable extraction failed', error);
      }
    }

    // Keep the uploaded bytes as the source of truth. Parsed days only feed the optional interactive grid.
    const updated = timetables.map((tt) => {
      if (uploadClassTarget === 'all' || tt.classId === uploadClassTarget) {
        const parsedResult = parsedByClass[tt.classId];

        return {
          ...tt,
          days: parsedResult?.days?.length ? parsedResult.days : tt.days,
          fileDataUrl: uploadFileDataUrl,
          fileName: uploadFileName || `جدول الحصص المعتمد - فصل ${tt.classId}`,
          fileType: uploadFileType,
          fileSize: uploadFileSize || '1.5 MB',
          uploadedAt: new Date().toISOString().split('T')[0]
        };
      }
      return tt;
    });

    onUpdateTimetables(updated);
    setViewMode('grid');
    setIsUploadModalOpen(false);
    setUploadFileDataUrl('');
    setUploadFileName('');

    const targetLabel = uploadClassTarget === 'all' ? 'جميع فصول KG 1' : `فصل ${uploadClassTarget}`;
    setParseNotification(`تمت قراءة وتنزيل حصص الجدول مباشرة في الجدول المُعد لـ ${targetLabel} بنجاح ✓`);
    setTimeout(() => {
      setParseNotification(null);
    }, 5000);
  };

  const handleRemoveUploadedFile = () => {
    if (!window.confirm('هل ترغب في حذف ملف الجدول المرفوع لهذا الفصل؟')) return;
    const updated = timetables.map((tt) => {
      if (tt.classId === selectedClass) {
        return {
          ...tt,
          fileDataUrl: undefined,
          fileName: undefined,
          fileType: undefined,
          fileSize: undefined,
          uploadedAt: undefined
        };
      }
      return tt;
    });
    onUpdateTimetables(updated);
  };

  // Download Timetable as Image
  const handleDownloadImage = () => {
    if (currentTimetable.fileDataUrl && currentTimetable.fileType === 'image') {
      const link = document.createElement('a');
      link.href = currentTimetable.fileDataUrl;
      link.download = currentTimetable.fileName || `Timetable_Grade2_${selectedClass}.png`;
      link.click();
      return;
    }

    // High quality canvas generation for instant image download
    const canvas = document.createElement('canvas');
    canvas.width = 1200;
    canvas.height = 760;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // Background
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(0, 0, 1200, 760);

    // Top Header Banner
    ctx.fillStyle = '#0f172a';
    ctx.fillRect(0, 0, 1200, 90);

    ctx.fillStyle = '#f59e0b';
    ctx.font = 'bold 22px sans-serif';
    ctx.fillText('Nile Egyptian Schools - Minya Branch', 40, 42);

    ctx.fillStyle = '#ffffff';
    ctx.font = 'bold 16px sans-serif';
    ctx.fillText(`Official Class Timetable: KG 1 (Class ${selectedClass}) • 2026/2027`, 40, 70);

    ctx.fillStyle = '#94a3b8';
    ctx.font = 'bold 16px sans-serif';
    ctx.fillText('مدارس النيل المصرية الدولية - فرع المنيا', 850, 52);

    // Table parameters
    const startX = 40;
    const startY = 110;
    const colWidth = 145;
    const rowHeight = 85;

    // Headers
    ctx.fillStyle = '#1e293b';
    ctx.fillRect(startX, startY, 1120, 45);

    ctx.fillStyle = '#ffffff';
    ctx.font = 'bold 14px sans-serif';
    ctx.fillText('اليوم / Day', startX + 25, startY + 28);

    PERIOD_TIMES.forEach((pt, idx) => {
      const x = startX + 130 + idx * colWidth;
      ctx.fillStyle = '#ffffff';
      ctx.font = 'bold 13px sans-serif';
      ctx.fillText(`الحصة ${pt.periodNum}`, x + 35, startY + 20);
      ctx.fillStyle = '#93c5fd';
      ctx.font = '10px sans-serif';
      ctx.fillText(pt.time, x + 25, startY + 36);
    });

    // Rows
    currentTimetable.days.forEach((day, rIdx) => {
      const y = startY + 45 + rIdx * rowHeight;
      // Day column
      ctx.fillStyle = rIdx % 2 === 0 ? '#f8fafc' : '#f1f5f9';
      ctx.fillRect(startX, y, 130, rowHeight);
      ctx.strokeStyle = '#cbd5e1';
      ctx.strokeRect(startX, y, 130, rowHeight);

      ctx.fillStyle = '#0f172a';
      ctx.font = 'bold 15px sans-serif';
      ctx.fillText(day.dayNameAr, startX + 25, y + 36);
      ctx.fillStyle = '#64748b';
      ctx.font = '12px sans-serif';
      ctx.fillText(day.dayNameEn, startX + 25, y + 58);

      // Period slots
      day.periods.forEach((slot, pIdx) => {
        const x = startX + 130 + pIdx * colWidth;
        const sub = getSubjectInfo(slot.subjectId);

        ctx.fillStyle = '#ffffff';
        ctx.fillRect(x, y, colWidth, rowHeight);
        ctx.strokeStyle = '#e2e8f0';
        ctx.strokeRect(x, y, colWidth, rowHeight);

        // Subject box
        ctx.fillStyle = '#f8fafc';
        ctx.fillRect(x + 5, y + 6, colWidth - 10, rowHeight - 12);
        ctx.strokeStyle = '#cbd5e1';
        ctx.strokeRect(x + 5, y + 6, colWidth - 10, rowHeight - 12);

        ctx.fillStyle = '#1e3a8a';
        ctx.font = 'bold 12px sans-serif';
        ctx.fillText(sub.nameEn, x + 12, y + 28);

        ctx.fillStyle = '#334155';
        ctx.font = '11px sans-serif';
      });
    });

    const dataUrl = canvas.toDataURL('image/png');
    const link = document.createElement('a');
    link.href = dataUrl;
    link.download = `Timetable_Grade2_${selectedClass}.png`;
    link.click();
  };

  // Download Timetable as PDF
  const handleDownloadPDF = () => {
    if (currentTimetable.fileDataUrl && currentTimetable.fileType === 'pdf') {
      const link = document.createElement('a');
      link.href = currentTimetable.fileDataUrl;
      link.download = currentTimetable.fileName || `Timetable_Grade2_${selectedClass}.pdf`;
      link.click();
      return;
    }

    // Open print window configured for saving as PDF
    const printWin = window.open('', '_blank');
    if (!printWin) return;

    const htmlContent = `
      <!DOCTYPE html>
      <html dir="rtl">
      <head>
        <meta charSet="UTF-8" />
        <meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=5.0" />
        <title>جدول حصص KG 1 - فصل ${selectedClass}</title>
        <style>
          @page { size: landscape; margin: 12mm; }
          body { font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; margin: 0; padding: 20px; color: #1e293b; }
          .header { display: flex; justify-content: space-between; align-items: center; border-bottom: 2px solid #0f172a; padding-bottom: 12px; margin-bottom: 20px; }
          .title { font-size: 22px; font-weight: bold; color: #0f172a; }
          .sub { font-size: 14px; color: #475569; }
          table { width: 100%; border-collapse: collapse; text-align: center; }
          th, td { border: 1px solid #cbd5e1; padding: 8px 4px; }
          th { background-color: #0f172a; color: #ffffff; font-size: 12px; }
          th .time { font-size: 10px; color: #93c5fd; display: block; font-weight: normal; }
          .day-col { background-color: #f1f5f9; font-weight: bold; width: 100px; font-size: 13px; }
          .period-cell { background-color: #ffffff; font-size: 11px; height: 55px; }
          .sub-en { font-weight: bold; color: #1e40af; }
          .footer { margin-top: 20px; display: flex; justify-content: space-between; font-size: 11px; color: #64748b; }
        </style>
      </head>
      <body>
        <div class="header">
          <div>
            <div class="title">مدارس النيل المصرية الدولية - فرع المنيا</div>
            <div class="sub">جدول الحصص الأسبوعي المعتمد • مرحلة رياض الأطفال (KG 1 - Class ${selectedClass})</div>
          </div>
          <div style="text-align: left;" dir="ltr">
            <div style="font-weight: bold; font-size: 16px; color: #b45309;">Nile Egyptian Schools</div>
            <div style="font-size: 12px; color: #64748b;">Minya Branch • Academic Year 2026/2027</div>
          </div>
        </div>
        <table>
          <thead>
            <tr>
              <th>اليوم / الحصة</th>
              ${PERIOD_TIMES.map((pt) => `<th>الحصة ${pt.periodNum}<span class="time">${pt.time}</span></th>`).join('')}
            </tr>
          </thead>
          <tbody>
            ${currentTimetable.days
              .map(
                (day) => `
              <tr>
                <td class="day-col">
                  <div>${day.dayNameAr}</div>
                  <div style="font-size: 10px; color: #64748b;">${day.dayNameEn}</div>
                </td>
                ${day.periods
                  .map((p) => {
                    const s = getSubjectInfo(p.subjectId);
                    return `
                    <td class="period-cell">
                      <div class="sub-en">${s.nameEn}</div>
                    </td>
                  `;
                  })
                  .join('')}
              </tr>
            `
              )
              .join('')}
          </tbody>
        </table>
        <div class="footer">
          <div>يعتمد: إدارة مدرسة النيل المصرية الدولية - فرع المنيا</div>
          <div>تاريخ الطباعة: ${new Date().toLocaleDateString('ar-EG')}</div>
        </div>
        <script>
          window.onload = function() {
            window.print();
          };
        </script>
      </body>
      </html>
    `;

    printWin.document.write(htmlContent);
    printWin.document.close();
  };

  // Admin slot edit modal
  const [editingSlot, setEditingSlot] = useState<{
    isOpen: boolean;
    dayNameAr?: string;
    slot?: PeriodSlot;
  }>({ isOpen: false });

  const [editSubject, setEditSubject] = useState('');
  const [editTeacher, setEditTeacher] = useState('');
  const [editRoom, setEditRoom] = useState('');

  const handleOpenEditSlot = (dayNameAr: string, slot: PeriodSlot) => {
    if (currentRole !== 'admin') return;
    setEditingSlot({
      isOpen: true,
      dayNameAr,
      slot
    });
    setEditSubject(slot.subjectId);
    setEditTeacher(slot.teacher || '');
    setEditRoom(slot.room || '');
  };

  const handleSaveSlot = (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingSlot.slot || !editingSlot.dayNameAr) return;

    const updatedTimetables = timetables.map((tt) => {
      if (tt.classId === selectedClass) {
        const updatedDays = tt.days.map((day) => {
          if (day.dayNameAr === editingSlot.dayNameAr) {
            const updatedPeriods = day.periods.map((p) => {
              if (p.id === editingSlot.slot?.id) {
                return {
                  ...p,
                  subjectId: editSubject,
                  teacher: editTeacher.trim() || undefined,
                  room: editRoom.trim() || undefined
                };
              }
              return p;
            });
            return { ...day, periods: updatedPeriods };
          }
          return day;
        });
        return { ...tt, days: updatedDays };
      }
      return tt;
    });

    onUpdateTimetables(updatedTimetables);
    setEditingSlot({ isOpen: false });
  };

  const handleDeleteSlot = (dayNameAr: string, slotId: string) => {
    if (!window.confirm('هل أنت متأكد من رغبتك في حذف هذه الحصة من الجدول الدراسي؟')) return;
    const updatedTimetables = timetables.map((tt) => {
      if (tt.classId === selectedClass) {
        const updatedDays = tt.days.map((day) => {
          if (day.dayNameAr === dayNameAr) {
            return {
              ...day,
              periods: day.periods.filter((p) => p.id !== slotId)
            };
          }
          return day;
        });
        return { ...tt, days: updatedDays };
      }
      return tt;
    });

    onUpdateTimetables(updatedTimetables);
    setEditingSlot({ isOpen: false });
  };

  const currentDaySchedule = currentTimetable.days[activeDayIndex] || currentTimetable.days[0];

  return (
    <div className="space-y-6">
      {/* Header Banner */}
      <div className="bg-white rounded-2xl p-5 border border-slate-200 shadow-xs">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-xl bg-indigo-50 text-indigo-700 border border-indigo-100 flex items-center justify-center font-bold">
              <Calendar className="w-6 h-6" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-xl font-black text-slate-900">
                  جدول الحصص الأسبوعي - Class {selectedClass}
                </h2>
                <span className="bg-indigo-100 text-indigo-900 text-xs px-2.5 py-0.5 rounded-full font-bold">
                  KG 1
                </span>
              </div>
              <p className="text-xs text-slate-500 mt-0.5">
                مدرسة النيل المصرية الدولية فرع المنيا • العام الدراسي 2026/2027
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2 flex-wrap">
            {/* Class Toggle Buttons */}
            <div className="flex items-center bg-slate-100 p-1 rounded-xl">
              {(['KG1A', 'KG1B', 'KG1C', 'KG1D', 'KG1E'] as SchoolClass[]).map((c) => (
                <button
                  key={c}
                  type="button"
                  onClick={() => onSelectClass(c)}
                  className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
                    selectedClass === c
                      ? 'bg-sky-700 text-white shadow-xs'
                      : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  Class {c}
                </button>
              ))}
            </div>

            {/* View Mode Toggle */}
            <div className="flex items-center bg-slate-100 p-1 rounded-xl text-xs font-semibold gap-1">
              {false && currentTimetable.fileDataUrl && (
                <button
                  type="button"
                  onClick={() => setViewMode('document')}
                  className={`px-3 py-1.5 rounded-lg transition-all flex items-center gap-1 cursor-pointer ${
                    viewMode === 'document'
                      ? 'bg-emerald-600 text-white font-bold shadow-xs'
                      : 'text-emerald-800 hover:bg-emerald-100/70 font-bold'
                  }`}
                  title="عرض المستند الأصلي المعتمد (PDF)"
                >
                  <FileText className="w-3.5 h-3.5" />
                  <span>المستند المعتمد (PDF)</span>
                </button>
              )}
              <button
                type="button"
                onClick={() => setViewMode('grid')}
                className={`px-3 py-1.5 rounded-lg transition-all cursor-pointer ${
                  viewMode === 'grid' ? 'bg-white text-slate-900 shadow-xs' : 'text-slate-600'
                }`}
              >
                الجدول التفاعلي
              </button>
              {currentRole === 'admin' && (
                <button
                  type="button"
                  onClick={() => setViewMode('day')}
                  className={`px-3 py-1.5 rounded-lg transition-all cursor-pointer ${
                    viewMode === 'day' ? 'bg-white text-slate-900 shadow-xs' : 'text-slate-600'
                  }`}
                >
                  يوم بيوم
                </button>
              )}
            </div>

            {/* زر تحميل الجدول (Download Table): صورة (Image) أو PDF */}
            {currentRole === 'admin' && <div className="flex items-center rounded-xl bg-indigo-50 border border-indigo-200 p-1">
              <span className="text-xs font-bold text-indigo-900 px-2 flex items-center gap-1">
                <Download className="w-3.5 h-3.5 text-indigo-700" />
                <span className="hidden sm:inline">Schedule</span>
              </span>
              <button
                id="btn-download-timetable-img"
                type="button"
                onClick={handleDownloadImage}
                className="flex items-center gap-1 px-2.5 py-1.5 bg-white hover:bg-indigo-600 hover:text-white text-indigo-800 rounded-lg text-xs font-bold transition-all shadow-2xs cursor-pointer"
                title="تحميل الجدول كاملاً كصورة (Image PNG)"
              >
                <ImageIcon className="w-3.5 h-3.5 text-indigo-600" />
                <span>صورة (Image)</span>
              </button>
              <span className="text-indigo-300 px-1 font-bold">|</span>
              <button
                id="btn-download-timetable-pdf"
                type="button"
                onClick={handleDownloadPDF}
                className="flex items-center gap-1 px-2.5 py-1.5 bg-white hover:bg-indigo-600 hover:text-white text-indigo-800 rounded-lg text-xs font-bold transition-all shadow-2xs cursor-pointer"
                title="تحميل الجدول كاملاً بتنسيق PDF"
              >
                <FileText className="w-3.5 h-3.5 text-indigo-600" />
                <span>ملف (PDF)</span>
              </button>
            </div>}

            {/* أيقونة وزر تعديل الجدول (Edit Schedule) دفعة واحدة بسهولة */}
            {currentRole === 'admin' && <button
              id="btn-edit-full-schedule"
              type="button"
              onClick={handleOpenFullScheduleEditor}
              className="flex items-center gap-1.5 px-3 py-2 bg-amber-400 hover:bg-amber-500 text-slate-950 font-bold rounded-xl text-xs shadow-xs transition-all cursor-pointer border border-amber-500"
              title="تعديل الجدول كاملاً دفعة واحدة بسهولة (Edit Schedule)"
            >
              <Edit3 className="w-4 h-4 text-slate-950" />
              <span>تعديل الجدول (Edit Schedule)</span>
            </button>}

            {currentRole === 'admin' && <button
              type="button"
              onClick={onOpenPrint}
              className="flex items-center gap-1 px-3 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-semibold transition-colors cursor-pointer"
            >
              <Printer className="w-3.5 h-3.5" />
              <span>طباعة</span>
            </button>}

            {/* Bulk Upload Timetable file button */}
            {currentRole === 'admin' && <button
              id="btn-upload-bulk-timetable"
              type="button"
              onClick={() => {
                setUploadClassTarget(selectedClass);
                setIsUploadModalOpen(true);
              }}
              className="flex items-center gap-1.5 px-3 py-2 bg-slate-50 hover:bg-slate-100 text-slate-700 border border-slate-200 rounded-xl text-xs font-bold transition-all cursor-pointer shadow-2xs"
              title="رفع ملف صورة أو PDF لجدول الحصص"
            >
              <Upload className="w-3.5 h-3.5 text-slate-500" />
              <span>رفع ملف الجدول</span>
            </button>}
          </div>
        </div>

        {currentRole === 'admin' && (
          <div className="mt-4 pt-3 border-t border-slate-100 flex items-center justify-between flex-wrap gap-2 text-xs text-amber-900 bg-amber-50 p-3 rounded-xl border border-amber-200">
            <div className="flex items-center gap-2">
              <span className="font-bold bg-amber-200 text-amber-900 px-2 py-0.5 rounded-md text-[11px]">
                صلاحية الأدمن
              </span>
              <span>
                يمكنك النقر مباشرة على أي حصة في الجدول لتعديل المادة أو حذفها، مع إمكانية إضافة وتعديل الحصص بالكامل من تبويب لوحة الإدارة.
              </span>
            </div>
            <span className="text-emerald-700 font-bold bg-emerald-100 border border-emerald-200 px-2 py-0.5 rounded-md text-[10px]">
              ✓ المزامنة المباشرة مع الزوار والطلاب مفعلة
            </span>
          </div>
        )}
      </div>

      {/* Active Uploaded Document Banner */}
      {false && currentTimetable.fileDataUrl && (
        <div className="bg-gradient-to-r from-emerald-50 via-teal-50 to-indigo-50 border-2 border-emerald-300 rounded-2xl p-5 shadow-xs flex flex-wrap items-center justify-between gap-4">
          <div className="flex items-center gap-3.5">
            <div className="w-12 h-12 rounded-2xl bg-emerald-600 text-white flex items-center justify-center font-black shadow-md shrink-0">
              <FileText className="w-6 h-6" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="bg-emerald-600 text-white text-[11px] font-black px-2.5 py-0.5 rounded-md">
                  الجدول المعتمد المرفوع
                </span>
                <span className="text-xs font-black text-slate-800">Class {selectedClass}</span>
              </div>
              <h3 className="font-black text-base text-slate-900 mt-1 flex items-center gap-2 flex-wrap">
                <span>{currentTimetable.fileName}</span>
                <span className="text-[10px] font-bold text-emerald-800 uppercase bg-emerald-100 px-2 py-0.5 rounded border border-emerald-200 font-mono">
                  {currentTimetable.fileType?.toUpperCase()}
                </span>
                <span className="text-xs text-slate-500 font-normal">({currentTimetable.fileSize})</span>
              </h3>
              <p className="text-[11px] text-slate-500 mt-0.5">
                المستند الرسمي المعتمد لجدول هذا الفصل • تم رفعه واعتماده بتاريخ {currentTimetable.uploadedAt || 'العام الحالي'}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2 flex-wrap">
            <button
              type="button"
              onClick={() => setIsDocModalOpen(true)}
              className="flex items-center gap-1.5 px-4 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-black rounded-xl shadow-xs transition-colors cursor-pointer"
            >
              <Eye className="w-4 h-4" />
              <span>معاينة المستند المعتمد</span>
            </button>
            <button
              type="button"
              onClick={() => {
                const printWin = window.open('', '_blank');
                if (printWin && currentTimetable.fileDataUrl) {
                  if (currentTimetable.fileType === 'image') {
                    printWin.document.write(`<html><head><meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=5.0"><title>جدول حصص Class ${selectedClass}</title></head><body style="margin:0;display:flex;justify-content:center;align-items:center;"><img src="${currentTimetable.fileDataUrl}" style="max-width:100%;" onload="window.print();window.close();" /></body></html>`);
                    printWin.document.close();
                  } else {
                    printWin.location.href = currentTimetable.fileDataUrl;
                  }
                }
              }}
              className="flex items-center gap-1.5 px-3.5 py-2.5 bg-white hover:bg-slate-100 text-slate-800 border border-slate-200 text-xs font-bold rounded-xl transition-colors cursor-pointer"
            >
              <Printer className="w-4 h-4 text-slate-600" />
              <span>طباعة الملف المعتمد</span>
            </button>
          </div>
        </div>
      )}

      {/* VIEW MODE: ORIGINAL UPLOADED DOCUMENT (PDF / IMAGE) */}
      {viewMode === 'document' && currentTimetable.fileDataUrl && (
        <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden p-4 space-y-3">
          <div className="flex flex-wrap items-center justify-between gap-3 pb-3 border-b border-slate-100">
            <div className="flex items-center gap-2">
              <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-pulse"></span>
              <span className="font-black text-slate-900 text-sm">
                المستند المعتمد الأصلي لجدول حصص Class {selectedClass}
              </span>
              <span className="text-[10px] font-bold text-emerald-800 bg-emerald-100 px-2 py-0.5 rounded uppercase font-mono">
                {currentTimetable.fileType?.toUpperCase()}
              </span>
              <span className="text-xs text-slate-400 font-mono">
                ({currentTimetable.fileName})
              </span>
            </div>

            <div className="flex items-center gap-2 flex-wrap">
              <button
                type="button"
                onClick={() => {
                  const printWin = window.open('', '_blank');
                  if (printWin && currentTimetable.fileDataUrl) {
                    if (currentTimetable.fileType === 'image') {
                      printWin.document.write(`<html><head><meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=5.0"><title>جدول حصص Class ${selectedClass}</title></head><body style="margin:0;display:flex;justify-content:center;align-items:center;height:100vh;"><img src="${currentTimetable.fileDataUrl}" style="max-width:100%;max-height:100%;object-fit:contain;" onload="window.print();" /></body></html>`);
                      printWin.document.close();
                    } else {
                      printWin.location.href = currentTimetable.fileDataUrl;
                    }
                  }
                }}
                className="flex items-center gap-1.5 px-3 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold rounded-xl transition-colors cursor-pointer"
              >
                <Printer className="w-3.5 h-3.5 text-slate-500" />
                <span>طباعة المستند الأصلي</span>
              </button>

              <button
                type="button"
                onClick={handleDownloadPDF}
                className="flex items-center gap-1.5 px-3 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold rounded-xl shadow-xs transition-colors cursor-pointer"
              >
                <Download className="w-3.5 h-3.5" />
                <span>تحميل الملف الأصلي</span>
              </button>
            </div>
          </div>

          <div className="w-full h-[75vh] min-h-[550px] bg-slate-900/5 rounded-xl border border-slate-200 overflow-hidden">
            {currentTimetable.fileType === 'image' ? (
              <div className="w-full h-full flex items-center justify-center p-4 bg-slate-900 overflow-auto">
                <img
                  src={currentTimetable.fileDataUrl}
                  alt={currentTimetable.fileName || 'جدول الحصص'}
                  className="max-h-full max-w-full object-contain rounded-lg shadow-md"
                />
              </div>
            ) : (
              <iframe
                src={currentTimetable.fileDataUrl}
                title={currentTimetable.fileName || `جدول الحصص فصل ${selectedClass}`}
                className="w-full h-full border-0 bg-white"
              />
            )}
          </div>
        </div>
      )}

      {/* VIEW MODE: FULL GRID */}
      {viewMode === 'grid' && (
        <div className="bg-white rounded-3xl border border-slate-200/80 shadow-xs overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-center border-collapse min-w-[850px]">
              <thead className="sticky top-[var(--app-header-height,0px)] z-20 bg-slate-100/95 shadow-[0_1px_0_rgba(148,163,184,0.35)] backdrop-blur-sm">
                <tr className="bg-slate-100/80 text-slate-700 text-xs font-bold border-b border-slate-200">
                  <th className="p-4 w-32 border-e border-slate-200">
                    <span className="block font-black text-slate-900 text-sm">Day</span>
                    <span className="text-[11px] text-slate-400 font-normal">Weekday</span>
                  </th>
                  {PERIOD_TIMES.map((pt) => (
                    <th
                      key={pt.periodNum}
                      className="p-3 border-e border-slate-200 last:border-e-0"
                    >
                      <span className="block font-black text-slate-900 text-sm">الحصة {pt.periodNum}</span>
                      <span className="text-[10px] text-slate-500 font-mono block font-normal">{pt.time}</span>
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200">
                {currentTimetable.days.map((day) => (
                  <tr key={day.dayNameAr} className="hover:bg-slate-50/50 transition-colors">
                    <td className="p-4 bg-slate-50 border-e border-slate-200 text-center font-bold">
                          <div className="text-slate-900 font-black text-base font-sans">{day.dayNameEn}</div>
                          <div className="text-[11px] text-slate-400 font-medium">{day.dayNameAr}</div>
                    </td>

                    {PERIOD_TIMES.map((periodTime) => {
                      const slot = day.periods.find((period) => period.periodNum === periodTime.periodNum);
                      const sub = slot ? getSubjectInfo(slot.subjectId) : null;
                      return (
                        <td key={periodTime.periodNum} className="p-2 text-center align-middle border-e border-slate-100 last:border-e-0">
                          {slot && sub ? (
                            <div
                              onClick={() => handleOpenEditSlot(day.dayNameAr, slot)}
                              className={`w-full p-2.5 rounded-2xl border text-center ${sub.borderColor} ${sub.color} transition-all ${
                                currentRole === 'admin' ? 'cursor-pointer hover:scale-105 hover:shadow-xs' : ''
                              }`}
                              title={currentRole === 'admin' ? 'اضغط لتعديل المادة' : undefined}
                            >
                              <div className="flex items-center justify-center mb-1">
                                <RenderSubjectIcon iconName={sub.iconName} className={`w-4 h-4 ${sub.textColor}`} />
                              </div>
                              <span className={`text-xs font-bold ${sub.textColor} truncate block font-sans`}>{sub.nameEn}</span>
                            </div>
                          ) : (
                            <div className="w-full p-2.5 rounded-2xl border border-dashed border-slate-100 text-slate-300 text-xs font-medium flex items-center justify-center">
                              <span>-</span>
                            </div>
                          )}
                        </td>
                      );
                    })}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Table Legend */}
          <div className="p-4 bg-slate-50 border-t border-slate-200 flex items-center justify-between flex-wrap gap-3 text-xs">
            <div className="flex items-center gap-2 text-slate-600">
              <Clock className="w-4 h-4 text-slate-500" />
              <span>مواعيد الحصص: 45 دقيقة لكل حصة، استراحة أولى بعد الحصة 2، واستراحة الغداء بعد الحصة 5.</span>
            </div>
            <div className="flex items-center gap-2">
              <span className="w-3 h-3 rounded-full bg-sky-500"></span>
              <span className="text-slate-700 font-medium">جدول معتمد لمدارس النيل - فرع المنيا</span>
            </div>
          </div>
        </div>
      )}

      {/* VIEW MODE: DAY BY DAY */}
      {viewMode === 'day' && (
        <div className="space-y-4">
          {/* Day Selector Tabs */}
          <div className="sticky top-[var(--app-header-height,0px)] z-20 flex items-center gap-2 overflow-x-auto bg-slate-100/95 py-2 pb-3 backdrop-blur-sm">
            {currentTimetable.days.map((day, idx) => (
              <button
                key={day.dayNameAr}
                type="button"
                onClick={() => setActiveDayIndex(idx)}
                className={`px-4 py-2 rounded-xl text-xs font-bold whitespace-nowrap transition-all border ${
                  activeDayIndex === idx
                    ? 'bg-slate-900 text-white border-slate-900 shadow-xs'
                    : 'bg-white text-slate-700 border-slate-200 hover:bg-slate-50'
                }`}
              >
                {day.dayNameEn}
              </button>
            ))}
          </div>

          {/* Day Periods Timeline */}
          <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-xs">
            <h3 className="font-extrabold text-base text-slate-900 mb-4 flex items-center gap-2">
              <span>حصص يوم {currentDaySchedule.dayNameAr}</span>
              <span className="text-xs font-normal text-slate-500">
                - Class {selectedClass}
              </span>
            </h3>

            <div className="space-y-3">
              {currentDaySchedule.periods.map((slot, pIdx) => {
                const sub = getSubjectInfo(slot.subjectId);
                return (
                  <div
                    key={slot.id}
                    className={`p-4 rounded-xl border flex flex-wrap items-center justify-between gap-3 transition-all ${
                      sub.borderColor
                    } ${sub.color} ${
                      currentRole === 'admin'
                        ? 'cursor-pointer hover:shadow-xs'
                        : ''
                    }`}
                    onClick={() => handleOpenEditSlot(currentDaySchedule.dayNameAr, slot)}
                  >
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-xl bg-white/80 shadow-xs flex flex-col items-center justify-center font-black text-slate-800">
                        <span className="text-[10px] text-slate-400 font-semibold">حصة</span>
                        <span className="text-base leading-none">{slot.periodNum}</span>
                      </div>
                      <div>
                        <div className="font-black text-sm text-slate-900">
                          {sub.nameEn}
                        </div>
                      </div>
                    </div>

                    <div className="flex items-center gap-4 text-xs">
                      {currentRole === 'admin' && (
                        <button
                          type="button"
                          className="bg-amber-400 hover:bg-amber-300 text-slate-950 px-2.5 py-1 rounded-lg text-xs font-bold shadow-xs"
                        >
                          تعديل الحصة
                        </button>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      )}

      {/* Admin Slot Edit Modal */}
      {editingSlot.isOpen && editingSlot.slot && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-xl border border-slate-200">
            <h3 className="text-base font-black text-slate-900 mb-1">
              تعديل بيانات الحصة {editingSlot.slot.periodNum}
            </h3>
            <p className="text-xs text-slate-500 mb-4">
              Class {selectedClass} • يوم {editingSlot.dayNameAr} ({editingSlot.slot.time})
            </p>

            <form onSubmit={handleSaveSlot} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  المادة المقررة:
                </label>
                <select
                  value={editSubject}
                  onChange={(e) => setEditSubject(e.target.value)}
                  className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 text-sm focus:outline-hidden focus:ring-2 focus:ring-indigo-500"
                >
                  {SUBJECTS.map((s) => (
                    <option key={s.id} value={s.id}>
                      {s.nameEn} ({s.nameAr})
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  اسم المعلم / المعلمة:
                </label>
                <input
                  type="text"
                  placeholder="اكتب اسمًا عند الحاجة"
                  value={editTeacher}
                  onChange={(e) => setEditTeacher(e.target.value)}
                  className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 text-sm focus:outline-hidden focus:ring-2 focus:ring-indigo-500"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  القاعة / المعمل (اختياري):
                </label>
                <input
                  type="text"
                  placeholder="مثال: فصل 2A، معمل الحاسب 1، معمل العلوم"
                  value={editRoom}
                  onChange={(e) => setEditRoom(e.target.value)}
                  className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 text-sm focus:outline-hidden focus:ring-2 focus:ring-indigo-500"
                />
              </div>

              <div className="flex items-center justify-between gap-2 pt-3 border-t border-slate-100 flex-wrap">
                {editingSlot.slot && (
                  <button
                    type="button"
                    onClick={() => {
                      if (editingSlot.dayNameAr && editingSlot.slot) {
                        handleDeleteSlot(editingSlot.dayNameAr, editingSlot.slot.id);
                      }
                    }}
                    className="px-3 py-2 text-xs text-red-600 hover:bg-red-50 hover:text-red-700 rounded-xl font-bold transition-colors"
                  >
                    حذف الحصة من الجدول
                  </button>
                )}
                <div className="flex items-center gap-2 mr-auto">
                  <button
                    type="button"
                    onClick={() => setEditingSlot({ isOpen: false })}
                    className="px-4 py-2 text-sm text-slate-600 hover:bg-slate-100 rounded-xl"
                  >
                    إلغاء
                  </button>
                  <button
                    type="submit"
                    className="px-5 py-2 text-sm bg-indigo-600 hover:bg-indigo-700 text-white font-bold rounded-xl shadow-xs"
                  >
                    تحديث الحصة في الجدول ✓
                  </button>
                </div>
              </div>
            </form>
          </div>
        </div>
      )}
      {/* Document Full Preview Modal */}
      {isDocModalOpen && currentTimetable.fileDataUrl && (
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
                    <span>مستند جدول حصص Class {selectedClass}</span>
                    <span className="bg-emerald-500/30 text-emerald-200 text-[10px] px-2 py-0.5 rounded uppercase font-mono">
                      {currentTimetable.fileType?.toUpperCase()}
                    </span>
                  </h3>
                  <p className="text-[11px] text-slate-400 font-mono">
                    {currentTimetable.fileName} • {currentTimetable.fileSize}
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => {
                    const printWin = window.open('', '_blank');
                    if (printWin && currentTimetable.fileDataUrl) {
                      if (currentTimetable.fileType === 'image') {
                        printWin.document.write(`<html><head><meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=5.0"><title>جدول حصص Class ${selectedClass}</title></head><body style="margin:0;display:flex;justify-content:center;align-items:center;"><img src="${currentTimetable.fileDataUrl}" style="max-width:100%;" onload="window.print();window.close();" /></body></html>`);
                        printWin.document.close();
                      } else {
                        printWin.location.href = currentTimetable.fileDataUrl;
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
                  onClick={() => setIsDocModalOpen(false)}
                  className="p-1.5 text-slate-400 hover:text-white rounded-xl hover:bg-white/10 transition-colors cursor-pointer"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
            </div>

            {/* Content Viewer */}
            <div className="flex-1 bg-slate-100 p-4 overflow-auto flex items-center justify-center">
              {currentTimetable.fileType === 'image' ? (
                <img
                  src={currentTimetable.fileDataUrl}
                  alt={currentTimetable.fileName || 'جدول الحصص'}
                  className="max-w-full max-h-full object-contain rounded-xl shadow-lg border border-slate-200"
                />
              ) : currentTimetable.fileType === 'pdf' ? (
                <iframe
                  src={currentTimetable.fileDataUrl}
                  title={currentTimetable.fileName || 'جدول الحصص PDF'}
                  className="w-full h-full rounded-xl border border-slate-200 shadow-sm bg-white"
                />
              ) : (
                <div className="bg-white p-8 rounded-2xl border border-slate-200 text-center max-w-md shadow-sm">
                  <FileText className="w-12 h-12 text-indigo-500 mx-auto mb-3" />
                  <h4 className="font-bold text-slate-900 text-sm mb-1">{currentTimetable.fileName}</h4>
                  <p className="text-xs text-slate-500 mb-4 font-mono">{currentTimetable.fileSize}</p>
                  <a
                    href={currentTimetable.fileDataUrl}
                    download={currentTimetable.fileName}
                    className="inline-flex items-center gap-1.5 px-4 py-2 bg-indigo-600 text-white text-xs font-bold rounded-xl shadow-xs"
                  >
                    <Download className="w-4 h-4" />
                    <span>تحميل المستند المعتمد</span>
                  </a>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
      {/* ================= MODAL: BULK UPLOAD & EDIT TIMETABLE ================= */}
      {isUploadModalOpen && (
        <div className="fixed inset-0 bg-black/70 backdrop-blur-xs flex items-center justify-center p-4 z-50 overflow-y-auto">
          <div className="bg-white rounded-3xl max-w-lg w-full shadow-2xl border border-slate-200 overflow-hidden">
            <div className="p-5 border-b border-slate-100 flex items-center justify-between bg-gradient-to-r from-amber-50 to-indigo-50">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-amber-500 text-white flex items-center justify-center font-bold shadow-xs">
                  <Upload className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="font-black text-slate-900 text-base">
                    رفع وتعديل جدول الحصص دفعة واحدة
                  </h3>
                  <p className="text-xs text-slate-500">
                    يمكنك رفع جدول الحصص كصورة (PNG, JPG) أو كملف PDF
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setIsUploadModalOpen(false)}
                className="p-1 text-slate-400 hover:text-slate-600 rounded-lg hover:bg-white transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-5 space-y-4">
              {/* Target Class Selector */}
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1.5">
                  الفصل المستهدف بالجدول:
                </label>
                <div className="grid grid-cols-6 gap-1.5">
                  {(['KG1A', 'KG1B', 'KG1C', 'KG1D', 'KG1E', 'all'] as const).map((cls) => (
                    <button
                      key={cls}
                      type="button"
                      onClick={() => setUploadClassTarget(cls)}
                      className={`py-2 px-2 rounded-xl text-xs font-bold border transition-all ${
                        uploadClassTarget === cls
                          ? 'bg-indigo-600 text-white border-indigo-600 shadow-xs'
                          : 'bg-slate-50 text-slate-700 border-slate-200 hover:bg-slate-100'
                      }`}
                    >
                      {cls === 'all' ? 'جميع الفصول' : `فصل ${cls}`}
                    </button>
                  ))}
                </div>
              </div>

              {/* Upload Drop Area */}
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1.5">
                  ملف جدول الحصص (صورة أو PDF):
                </label>
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/*,application/pdf"
                  onChange={handleFileSelect}
                  className="hidden"
                />

                <div
                  onClick={() => fileInputRef.current?.click()}
                  className="border-2 border-dashed border-indigo-300 hover:border-indigo-500 bg-indigo-50/40 hover:bg-indigo-50/80 rounded-2xl p-6 text-center cursor-pointer transition-all"
                >
                  <div className="w-12 h-12 rounded-2xl bg-indigo-100 text-indigo-600 mx-auto flex items-center justify-center mb-3">
                    <Upload className="w-6 h-6" />
                  </div>
                  <div className="text-xs font-bold text-indigo-900 mb-1">
                    انقر هنا لاختيار أو سحب ملف الجدول
                  </div>
                  <div className="text-[11px] text-slate-500">
                    يدعم ملفات الصور عالية الجودة (PNG, JPG, JPEG) وملفات PDF
                  </div>
                </div>
              </div>

              {/* Selected File Details */}
              {uploadFileDataUrl && (
                <div className="p-3 bg-emerald-50 border border-emerald-200 rounded-xl flex items-center justify-between gap-3">
                  <div className="flex items-center gap-2.5 min-w-0">
                    <div className="w-8 h-8 rounded-lg bg-emerald-600 text-white flex items-center justify-center shrink-0">
                      {uploadFileType === 'image' ? <ImageIcon className="w-4 h-4" /> : <FileText className="w-4 h-4" />}
                    </div>
                    <div className="min-w-0">
                      <div className="text-xs font-bold text-slate-900 truncate">
                        {uploadFileName}
                      </div>
                      <div className="text-[10px] text-emerald-800 font-semibold uppercase">
                        {uploadFileType} • {uploadFileSize}
                      </div>
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={() => {
                      setUploadFileDataUrl('');
                      setUploadFileName('');
                    }}
                    className="p-1 text-slate-400 hover:text-red-600 rounded-md"
                    title="إلغاء الملف"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>
              )}
            </div>

            <div className="p-4 bg-slate-50 border-t border-slate-100 flex items-center justify-end gap-2">
              <button
                type="button"
                onClick={() => setIsUploadModalOpen(false)}
                className="px-4 py-2 text-xs font-bold text-slate-600 hover:bg-slate-200 rounded-xl transition-colors"
              >
                إلغاء
              </button>
              <button
                type="button"
                onClick={handleSaveUploadedTimetable}
                disabled={!uploadFileDataUrl}
                className={`px-5 py-2 text-xs font-bold rounded-xl transition-all shadow-xs ${
                  uploadFileDataUrl
                    ? 'bg-indigo-600 hover:bg-indigo-700 text-white cursor-pointer'
                    : 'bg-slate-200 text-slate-400 cursor-not-allowed'
                }`}
              >
                اعتماد وتطبيق الجدول المرفوع
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ================= MODAL: تعديل الجدول كاملاً دفعة واحدة (Edit Full Schedule) ================= */}
      {isFullScheduleEditorOpen && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs z-50 flex items-center justify-center p-3 sm:p-4 overflow-y-auto">
          <div className="bg-white rounded-2xl max-w-5xl w-full shadow-2xl border border-slate-200 overflow-hidden my-auto animate-in fade-in zoom-in-95 duration-150">
            {/* Modal Header */}
            <div className="p-4 bg-gradient-to-r from-amber-500 to-amber-600 text-slate-950 flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <div className="w-9 h-9 rounded-xl bg-slate-950 text-amber-400 flex items-center justify-center font-black shadow-xs">
                  <Edit3 className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="font-black text-base text-slate-950">
                    تعديل الجدول كاملاً دفعة واحدة - Class {selectedClass}
                  </h3>
                  <p className="text-xs text-slate-900/80 font-medium">
                    قم بتغيير المواد والمعلمين لجميع الحصص والأيام بكل سهولة دفعة واحدة
                  </p>
                </div>
              </div>

              <button
                type="button"
                onClick={() => setIsFullScheduleEditorOpen(false)}
                className="w-8 h-8 rounded-lg bg-slate-950/10 hover:bg-slate-950/20 text-slate-950 flex items-center justify-center transition-colors"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Modal Body: Editable Schedule Grid */}
            <div className="p-4 overflow-x-auto max-h-[70vh]">
              <table className="w-full text-xs text-right border-collapse min-w-[760px]">
                <thead>
                  <tr className="bg-slate-100 text-slate-700 border-b border-slate-200">
                    <th className="p-2.5 font-black text-slate-900 w-28 text-center">اليوم</th>
                    {[1, 2, 3, 4, 5, 6, 7].map((num) => (
                      <th key={num} className="p-2.5 font-bold text-center border-r border-slate-200">
                        الحصة {num}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-200">
                  {editingDays.map((day, dayIdx) => (
                    <tr key={day.dayNameAr} className="hover:bg-amber-50/20 transition-colors">
                      <td className="p-3 font-black text-slate-800 bg-slate-50/80 text-center border-l border-slate-200">
                        <div>{day.dayNameAr}</div>
                        <div className="text-[10px] text-slate-400 font-sans">{day.dayNameEn}</div>
                      </td>

                      {day.periods.map((period, periodIdx) => {
                        const sub = getSubjectInfo(period.subjectId);
                        return (
                          <td key={period.id} className="p-2 border-r border-slate-200 align-top">
                            <div className="space-y-1.5">
                              {/* Subject Select */}
                              <select
                                value={period.subjectId}
                                onChange={(e) => handleUpdateEditingSlotSubject(dayIdx, periodIdx, e.target.value)}
                                className="w-full text-[11px] font-bold py-1 px-1.5 rounded-lg border border-slate-300 bg-white text-slate-800 focus:ring-2 focus:ring-amber-400 focus:border-amber-400 outline-hidden"
                              >
                                {SUBJECTS.map((s) => (
                                  <option key={s.id} value={s.id}>
                                    {s.nameAr} ({s.nameEn})
                                  </option>
                                ))}
                              </select>

                              {/* Teacher Input */}
                              <input
                                type="text"
                                placeholder="اسم المعلم"
                                value={period.teacher || ''}
                                onChange={(e) => handleUpdateEditingSlotTeacher(dayIdx, periodIdx, e.target.value)}
                                className="w-full text-[10px] py-1 px-1.5 rounded-md border border-slate-200 text-slate-600 bg-slate-50/60 focus:bg-white focus:border-amber-400 outline-hidden"
                              />
                            </div>
                          </td>
                        );
                      })}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Modal Footer */}
            <div className="p-4 bg-slate-50 border-t border-slate-200 flex items-center justify-between gap-3">
              <div className="text-xs text-slate-500 font-medium">
                تذكر: الضغط على "حفظ التعديلات" يعتمد التغييرات مباشرة في قاعدة بيانات الجدول.
              </div>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => setIsFullScheduleEditorOpen(false)}
                  className="px-4 py-2 text-xs font-bold text-slate-600 hover:bg-slate-200 rounded-xl transition-colors cursor-pointer"
                >
                  إلغاء
                </button>
                <button
                  id="btn-confirm-save-full-schedule"
                  type="button"
                  onClick={handleSaveFullSchedule}
                  className="px-5 py-2 text-xs font-black bg-amber-500 hover:bg-amber-600 text-slate-950 rounded-xl transition-all shadow-xs cursor-pointer border border-amber-600 flex items-center gap-1.5"
                >
                  <Save className="w-3.5 h-3.5" />
                  <span>حفظ التعديلات على الجدول كاملاً</span>
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
