import React, { useState, useRef } from 'react';
import {
  Sparkles,
  Upload,
  FileText,
  Check,
  AlertCircle,
  RefreshCw,
  Trash2,
  Calendar,
  BookOpen,
  CheckCircle2,
  ExternalLink,
  Layers,
  FileCheck,
  GraduationCap,
} from 'lucide-react';
import {
  ClassId,
  SchoolDay,
  ClassworkEntry,
  HomeworkEntry,
  ParsedWeeklyPlanResponse,
  SubjectName,
} from '../types';
import { parseWeeklyPlanWithAI } from '../services/aiClassifier';
import { TomorrowSpecialNote } from '../data/defaultWeeklyPlan';
import { SUBJECT_METADATA } from '../data/timetables';
import { extractWeeklyPlanText } from '../utils/planFileParser';

interface AdminWeeklyPlanManagerProps {
  currentClass?: ClassId;
  currentBlock?: number;
  currentWeek?: number;
  onApplyPlan: (
    classwork: ClassworkEntry[],
    homework: HomeworkEntry[],
    tomorrowNotes?: TomorrowSpecialNote[],
    replaceExisting?: boolean
  ) => Promise<void> | void;
}

const KG1_CLASSES: ClassId[] = ['KG1A', 'KG1B', 'KG1C', 'KG1D', 'KG1E'];

const SAMPLE_KG1_PLAN = `Sunday:
- French: Unité 1 Salutations. CW: Manuel p. 6-8. HW: None
- Mathematics: Place Value up to 100 with base-ten blocks. CW: Student Book p. 14-17. HW: Practice Book p. 11 exercises 1-8 (Due Monday)
- Arabic: درس أنا أستطيع. CW: كتاب التلميذ ص 12-15. HW: كتابة الفقرة الأولى في كشكول الواجب (Due Tuesday)
- Arabic: ملاحظات: ضرورة استماع الطفل لروابط الفيديوهات المرسلة لتنمية مهارة الاستماع https://youtu.be/arabic-listening-sample
- Science: Habitats & Living Things. CW: Learner's Book p. 18-21. HW: Workbook p. 15
- English: Phonics: Letter P /p/ (heavy P with top circle) & words (pen, pig, pot). CW: Pupil's Book p. 10-13. HW: Activity Book p. 8 (Due Monday) https://youtu.be/phonics-letter-p

Monday:
- PE: Agility ladder & ball bouncing. Bring sports shoes!
- English: Story Time The Kind Rabbit & Letter P practice. CW: Pupil's Book p. 14-15. HW: Copybook sentences
- Mathematics: Comparing numbers with <, >, =. CW: Student Book p. 18-20. HW: Practice Book p. 12 (Due Tuesday)
- Arabic: أسماء الإشارة (هذا وهذه). CW: كتاب المدرسة ص 16. HW: حل التدريب 3
- Notes: Please pack extra water bottle and PE shoes for sports day.

Tuesday:
- Social Studies: My Community and Neighborhood. CW: Book p. 8-11. HW: Draw 3 places in notebook (Due Wednesday)
- Mathematics: Skip counting by 2s and 5s. CW: Student Book p. 22-24. HW: Sheet 4
- Arts: Primary colors & watercolor painting. Bring sketch and watercolor set!
- Religion: سورة الفلق وحفظ الآيات الكريمة. HW: حفظ السورة للتسميع (Urgent Quiz)
- French: L'alphabet français A à H. CW: Cahier p. 11. HW: Cahier d'activités p. 7
- English: Phonics Letter P handwriting and sound practice. CW: Workbook p. 16. HW: Practice tracing letter p (البي التقيلة p)

Wednesday:
- English: Comprehension Animal Friends. CW: Pupil's Book p. 18. HW: Study 10 spelling words for Thursday Quiz (Urgent)
- Science: Plant parts & functions (roots, stems, leaves). CW: Learner's Book p. 24. HW: Workbook p. 19
- Mathematics: Even and odd numbers. CW: Student Book p. 28. HW: Practice Book p. 14
- Arabic: التاء المربوطة والمفتوحة. CW: ص 22. HW: إملاء كلمات التدريب

Thursday:
- English: Weekly Spelling Bee & Dictation Quiz!
- Mathematics: Weekly review & word problems.
- Arabic: نشيد وطني الجميل وحفظ 3 أبيات.
- Science: Germinating seeds experiment. Bring plastic cup & cotton.`;

export const AdminWeeklyPlanManager: React.FC<AdminWeeklyPlanManagerProps> = ({
  currentClass = 'KG1A',
  currentBlock = 1,
  currentWeek = 1,
  onApplyPlan,
}) => {
  const [targetClass, setTargetClass] = useState<ClassId | 'ALL'>('ALL');
  const [blockNumber, setBlockNumber] = useState<number>(currentBlock);
  const [weekNumber, setWeekNumber] = useState<number>(currentWeek);
  const [saveMode, setSaveMode] = useState<'replace' | 'append'>('replace');
  const [planText, setPlanText] = useState<string>('');
  const [isParsing, setIsParsing] = useState<boolean>(false);
  const [isApplying, setIsApplying] = useState<boolean>(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);
  const [parsedResult, setParsedResult] = useState<ParsedWeeklyPlanResponse | null>(null);
  const [activePreviewTab, setActivePreviewTab] = useState<'classwork' | 'homework' | 'tomorrow'>('classwork');

  const fileInputRef = useRef<HTMLInputElement>(null);

  // File Upload handler (PDF, DOCX, TXT, Excel)
  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setErrorMsg(null);
    try {
      const extracted = await extractWeeklyPlanText(file);
      if (extracted && extracted.trim().length > 10) {
        setPlanText(extracted);
        setSuccessMsg(`تم استخراج نص الخطة بنجاح من ملف: ${file.name}`);
        setTimeout(() => setSuccessMsg(null), 3500);
      } else {
        setErrorMsg('تعذر استخراج نص من هذا الملف، يرجى لصق نص الخطة مباشرة.');
      }
    } catch (err: any) {
      console.error('File extraction failed:', err);
      setErrorMsg(`خطأ أثناء قراءة الملف: ${err.message || 'صيغة غير مدعومة'}`);
    } finally {
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  // Run Smart AI Parsing
  const handleParsePlan = async () => {
    if (!planText.trim()) {
      setErrorMsg('يرجى كتابة أو لصق نص الخطة الأسبوعية أولاً.');
      return;
    }

    setIsParsing(true);
    setErrorMsg(null);
    setSuccessMsg(null);

    try {
      const classForParsing = targetClass === 'ALL' ? 'KG1A' : targetClass;
      const result = await parseWeeklyPlanWithAI(planText, classForParsing);

      if (
        (!result.classwork || result.classwork.length === 0) &&
        (!result.homework || result.homework.length === 0) &&
        (!result.tomorrowNotes || result.tomorrowNotes.length === 0)
      ) {
        setErrorMsg('لم يتم العثور على حصص أو واجبات صالحة في النص المدخل. يرجى مراجعة الصياغة.');
        setIsParsing(false);
        return;
      }

      setParsedResult(result);
      setSuccessMsg(
        `تم التحليل الذكي بنجاح! تم استخراج: ${result.classwork.length} درس (Classwork) • ${result.homework.length} واجب (Homework) • ${result.tomorrowNotes?.length || 0} ملاحظة ليوم الغد (Tomorrow).`
      );
    } catch (err: any) {
      console.error('Parsing failed:', err);
      setErrorMsg(err.message || 'حدث خطأ أثناء تحليل الخطة الأسبوعية.');
    } finally {
      setIsParsing(false);
    }
  };

  // Apply Plan to Database and State
  const handleApplyToSystem = async () => {
    if (!parsedResult) return;

    setIsApplying(true);
    setErrorMsg(null);

    try {
      const classesToPopulate: ClassId[] = targetClass === 'ALL' ? KG1_CLASSES : [targetClass];

      const finalClasswork: ClassworkEntry[] = [];
      const finalHomework: HomeworkEntry[] = [];
      const finalTomorrowNotes: TomorrowSpecialNote[] = [];

      classesToPopulate.forEach((cls) => {
        // Map classwork
        parsedResult.classwork.forEach((item, idx) => {
          finalClasswork.push({
            id: `cw-plan-${cls}-${blockNumber}-${weekNumber}-${Date.now()}-${idx}`,
            classId: cls,
            day: item.day as SchoolDay,
            period: item.period || (idx % 6) + 1,
            subject: (item.subject as SubjectName) || 'English',
            title: item.title,
            details: item.details,
            pages: item.pages,
            completed: false,
            block: blockNumber,
            week: weekNumber,
            linkUrl: item.linkUrl,
            linkTitle: item.linkTitle,
            links: item.links,
          });
        });

        // Map homework
        parsedResult.homework.forEach((item, idx) => {
          finalHomework.push({
            id: `hw-plan-${cls}-${blockNumber}-${weekNumber}-${Date.now()}-${idx}`,
            classId: cls,
            assignedDay: item.assignedDay as SchoolDay,
            dueDay: item.dueDay as SchoolDay,
            subject: (item.subject as SubjectName) || 'English',
            task: item.task,
            details: item.details,
            pages: item.pages,
            completed: false,
            priority: item.priority || 'normal',
            linkUrl: item.linkUrl,
            linkTitle: item.linkTitle,
            links: item.links,
          });
        });

        // Map tomorrow notes (Teacher notes / parent notes / English & Arabic notes)
        if (parsedResult.tomorrowNotes) {
          parsedResult.tomorrowNotes.forEach((n) => {
            finalTomorrowNotes.push({
              classId: cls,
              targetDay: n.day as SchoolDay,
              subject: n.subject || 'General',
              note: n.note,
              arabicNote: n.arabicNote || n.note,
              bagItem: n.bagItem,
              block: blockNumber,
              week: weekNumber,
            });
          });
        }
      });

      await onApplyPlan(
        finalClasswork,
        finalHomework,
        finalTomorrowNotes,
        saveMode === 'replace'
      );

      setSuccessMsg(
        `تم حفظ وتطبيق الخطة الأسبوعية بنجاح على ${classesToPopulate.length} فصل ومزامنتها سحابياً!`
      );
      setParsedResult(null);
      setPlanText('');
    } catch (err: any) {
      console.error('Failed to apply weekly plan:', err);
      setErrorMsg(err.message || 'فشل حفظ الخطة في النظام.');
    } finally {
      setIsApplying(false);
    }
  };

  return (
    <div className="space-y-4" dir="rtl">
      {/* Header Info */}
      <div className="bg-gradient-to-r from-indigo-50 to-purple-50 p-4 rounded-2xl border border-indigo-100 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
        <div className="flex items-center gap-2.5">
          <div className="w-9 h-9 rounded-xl bg-indigo-600 text-white flex items-center justify-center shadow-xs">
            <Sparkles className="w-5 h-5 text-amber-300" />
          </div>
          <div>
            <h3 className="text-sm font-black text-indigo-950">
              إضافة وتحليل Weekly Plan بالذكاء الاصطناعي
            </h3>
            <p className="text-xs text-indigo-800/80 font-medium">
              التحليل التلقائي يوزع المحتوى لـ: Classwork و Homework و Tomorrow، وينزل الروابط وملاحظات العربي والإنجليزي فوراً.
            </p>
          </div>
        </div>
      </div>

      {/* Alerts */}
      {successMsg && (
        <div className="p-3 bg-emerald-50 border border-emerald-200 text-emerald-900 text-xs font-bold rounded-xl flex items-center gap-2">
          <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
          <span>{successMsg}</span>
        </div>
      )}
      {errorMsg && (
        <div className="p-3 bg-rose-50 border border-rose-200 text-rose-900 text-xs font-bold rounded-xl flex items-center gap-2">
          <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" />
          <span>{errorMsg}</span>
        </div>
      )}

      {/* Target Parameters & Plan Configuration */}
      <div className="grid grid-cols-1 sm:grid-cols-4 gap-3 bg-slate-50 p-3.5 rounded-2xl border border-slate-200 text-xs font-bold">
        {/* Target Class */}
        <div>
          <label className="block text-slate-700 mb-1">الفصل المستهدف:</label>
          <select
            value={targetClass}
            onChange={(e) => setTargetClass(e.target.value as any)}
            className="w-full p-2 bg-white rounded-xl border border-slate-300 font-black text-slate-800 focus:ring-2 focus:ring-indigo-500 cursor-pointer"
          >
            <option value="ALL">جميع فصول KG 1 (A, B, C, D, E)</option>
            {KG1_CLASSES.map((cls) => (
              <option key={cls} value={cls}>
                {cls}
              </option>
            ))}
          </select>
        </div>

        {/* Block */}
        <div>
          <label className="block text-slate-700 mb-1">البلوك (Block):</label>
          <select
            value={blockNumber}
            onChange={(e) => setBlockNumber(Number(e.target.value))}
            className="w-full p-2 bg-white rounded-xl border border-slate-300 font-black text-slate-800 focus:ring-2 focus:ring-indigo-500 cursor-pointer"
          >
            <option value={1}>Block 1</option>
            <option value={2}>Block 2</option>
            <option value={3}>Block 3</option>
            <option value={4}>Block 4</option>
          </select>
        </div>

        {/* Week */}
        <div>
          <label className="block text-slate-700 mb-1">الأسبوع (Week):</label>
          <select
            value={weekNumber}
            onChange={(e) => setWeekNumber(Number(e.target.value))}
            className="w-full p-2 bg-white rounded-xl border border-slate-300 font-black text-slate-800 focus:ring-2 focus:ring-indigo-500 cursor-pointer"
          >
            <option value={1}>Week 1</option>
            <option value={2}>Week 2</option>
            <option value={3}>Week 3</option>
            <option value={4}>Week 4</option>
            <option value={5}>Week 5</option>
          </select>
        </div>

        {/* Save Mode */}
        <div>
          <label className="block text-slate-700 mb-1">طريقة الحفظ:</label>
          <select
            value={saveMode}
            onChange={(e) => setSaveMode(e.target.value as any)}
            className="w-full p-2 bg-white rounded-xl border border-slate-300 font-black text-slate-800 focus:ring-2 focus:ring-indigo-500 cursor-pointer"
          >
            <option value="replace">استبدال الخطة الحالية (Clean)</option>
            <option value="append">إضافة فوق الخطة الحالية</option>
          </select>
        </div>
      </div>

      {/* Input Options: File upload & Textarea */}
      <div className="space-y-2">
        <div className="flex items-center justify-between">
          <label className="text-xs font-black text-slate-800">
            نص الخطة الأسبوعية (الصق النص أو ارفع ملف):
          </label>
          <div className="flex items-center gap-2">
            <input
              type="file"
              ref={fileInputRef}
              onChange={handleFileUpload}
              accept=".pdf,.docx,.txt,.csv,.xlsx,.xls"
              className="hidden"
            />
            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              className="inline-flex items-center gap-1.5 px-3 py-1 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg text-xs font-bold transition-colors cursor-pointer"
            >
              <Upload className="w-3.5 h-3.5 text-indigo-600" />
              <span>قراءة من ملف (PDF/Word)</span>
            </button>
            <button
              type="button"
              onClick={() => setPlanText(SAMPLE_KG1_PLAN)}
              className="inline-flex items-center gap-1 px-3 py-1 bg-indigo-50 hover:bg-indigo-100 text-indigo-700 rounded-lg text-xs font-bold transition-colors cursor-pointer"
            >
              <FileText className="w-3.5 h-3.5" />
              <span>ملء نموذج تجريبي</span>
            </button>
          </div>
        </div>

        <textarea
          rows={7}
          value={planText}
          onChange={(e) => setPlanText(e.target.value)}
          placeholder={`الصق نص الويكلي بلان هنا... مثال:
Sunday:
- Math: Classwork pages 14-17. Homework page 11 (Due Monday)
- English: Phonics: Letter P /p/ (sound of heavy P with circle on top). Homework activity book p. 8 https://youtu.be/phonics-p
- Arabic: درس أنا أستطيع، كتابة الفقرة الأولى في كشكول الواجب
- Arabic: ملاحظات: الاستماع لفيديو القراءة`}
          className="w-full text-xs font-mono p-3 bg-slate-50 rounded-2xl border border-slate-300 focus:outline-hidden focus:ring-2 focus:ring-indigo-500 leading-relaxed text-slate-800"
          dir="ltr"
        />
      </div>

      {/* Parse Action Button */}
      <div className="flex items-center gap-3">
        <button
          type="button"
          onClick={handleParsePlan}
          disabled={isParsing || !planText.trim()}
          className="flex-1 py-3 px-4 rounded-xl bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 text-white font-black text-xs sm:text-sm flex items-center justify-center gap-2 shadow-sm transition-all cursor-pointer"
        >
          {isParsing ? (
            <>
              <RefreshCw className="w-4 h-4 animate-spin text-white" />
              <span>جاري تحليل وتوزيع الخطة بالذكاء الاصطناعي...</span>
            </>
          ) : (
            <>
              <Sparkles className="w-4 h-4 text-amber-300" />
              <span>تحليل وقراءة الويكلي بلان بالمنطق الذكي (Classwork • Homework • Tomorrow)</span>
            </>
          )}
        </button>

        {planText && (
          <button
            type="button"
            onClick={() => {
              setPlanText('');
              setParsedResult(null);
            }}
            className="p-3 text-slate-400 hover:text-slate-600 rounded-xl bg-slate-100 hover:bg-slate-200 transition-colors cursor-pointer"
            title="مسح النص"
          >
            <Trash2 className="w-4 h-4" />
          </button>
        )}
      </div>

      {/* Parsed Result Preview */}
      {parsedResult && (
        <div className="bg-white rounded-2xl border border-indigo-200 p-4 shadow-sm space-y-4 animate-in fade-in duration-150">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-3 border-b border-slate-100">
            <div className="flex items-center gap-2">
              <span className="text-xs font-black text-slate-900">
                نتائج التحليل الذكي للخطة:
              </span>
              <span className="px-2 py-0.5 rounded-full text-[11px] font-bold bg-indigo-50 text-indigo-700 border border-indigo-200">
                {targetClass === 'ALL' ? 'سيتم التطبيق على كافة فصول KG1 الخمسة' : `خاص بفصل ${targetClass}`}
              </span>
            </div>
            <div className="flex items-center gap-1 text-xs">
              <button
                type="button"
                onClick={() => setActivePreviewTab('classwork')}
                className={`px-3 py-1 rounded-lg font-bold transition-colors cursor-pointer ${
                  activePreviewTab === 'classwork'
                    ? 'bg-blue-600 text-white shadow-2xs'
                    : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
                }`}
              >
                الدروس ({parsedResult.classwork.length})
              </button>
              <button
                type="button"
                onClick={() => setActivePreviewTab('homework')}
                className={`px-3 py-1 rounded-lg font-bold transition-colors cursor-pointer ${
                  activePreviewTab === 'homework'
                    ? 'bg-amber-600 text-white shadow-2xs'
                    : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
                }`}
              >
                الواجبات ({parsedResult.homework.length})
              </button>
              <button
                type="button"
                onClick={() => setActivePreviewTab('tomorrow')}
                className={`px-3 py-1 rounded-lg font-bold transition-colors cursor-pointer ${
                  activePreviewTab === 'tomorrow'
                    ? 'bg-purple-600 text-white shadow-2xs'
                    : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
                }`}
              >
                تنبيهات الغد ({parsedResult.tomorrowNotes?.length || 0})
              </button>
            </div>
          </div>

          {/* Tab 1: Classwork */}
          {activePreviewTab === 'classwork' && (
            <div className="max-h-56 overflow-y-auto space-y-2 pr-1">
              {parsedResult.classwork.length === 0 ? (
                <p className="text-xs text-slate-400 text-center py-4">لم يتم استخراج دروس لهذا الأسبوع</p>
              ) : (
                parsedResult.classwork.map((cw, i) => (
                  <div
                    key={i}
                    className="p-2.5 rounded-xl border border-slate-200 bg-slate-50 flex items-start justify-between gap-2 text-xs"
                  >
                    <div className="space-y-1">
                      <div className="flex items-center gap-2">
                        <span className="px-2 py-0.5 rounded bg-blue-100 text-blue-900 font-black text-[10px]">
                          {cw.day} • الحصة {cw.period}
                        </span>
                        <span className="font-bold text-slate-800">{cw.subject}</span>
                        {cw.pages && (
                          <span className="text-[10px] text-slate-500 bg-white px-1.5 py-0.5 rounded border border-slate-200">
                            {cw.pages}
                          </span>
                        )}
                      </div>
                      <p className="font-bold text-slate-900">{cw.title}</p>
                      {cw.linkUrl && (
                        <a
                          href={cw.linkUrl}
                          target="_blank"
                          rel="noreferrer"
                          className="inline-flex items-center gap-1 text-[11px] text-indigo-600 hover:underline font-semibold"
                        >
                          <ExternalLink className="w-3 h-3" />
                          <span>رابط مرفق: {cw.linkUrl}</span>
                        </a>
                      )}
                    </div>
                  </div>
                ))
              )}
            </div>
          )}

          {/* Tab 2: Homework */}
          {activePreviewTab === 'homework' && (
            <div className="max-h-56 overflow-y-auto space-y-2 pr-1">
              {parsedResult.homework.length === 0 ? (
                <p className="text-xs text-slate-400 text-center py-4">لم يتم استخراج واجبات لهذا الأسبوع</p>
              ) : (
                parsedResult.homework.map((hw, i) => (
                  <div
                    key={i}
                    className="p-2.5 rounded-xl border border-amber-200 bg-amber-50/50 flex items-start justify-between gap-2 text-xs"
                  >
                    <div className="space-y-1">
                      <div className="flex items-center gap-2">
                        <span className="px-2 py-0.5 rounded bg-amber-100 text-amber-900 font-black text-[10px]">
                          {hw.assignedDay} ➔ تسليم: {hw.dueDay}
                        </span>
                        <span className="font-bold text-slate-800">{hw.subject}</span>
                        {hw.priority === 'urgent' && (
                          <span className="px-1.5 py-0.2 rounded bg-rose-100 text-rose-800 font-black text-[10px]">
                            عاجل / اختبار
                          </span>
                        )}
                      </div>
                      <p className="font-bold text-slate-900">{hw.task}</p>
                      {hw.linkUrl && (
                        <a
                          href={hw.linkUrl}
                          target="_blank"
                          rel="noreferrer"
                          className="inline-flex items-center gap-1 text-[11px] text-indigo-600 hover:underline font-semibold"
                        >
                          <ExternalLink className="w-3 h-3" />
                          <span>رابط الواجب: {hw.linkUrl}</span>
                        </a>
                      )}
                    </div>
                  </div>
                ))
              )}
            </div>
          )}

          {/* Tab 3: Tomorrow Notes */}
          {activePreviewTab === 'tomorrow' && (
            <div className="max-h-56 overflow-y-auto space-y-2 pr-1">
              {(!parsedResult.tomorrowNotes || parsedResult.tomorrowNotes.length === 0) ? (
                <p className="text-xs text-slate-400 text-center py-4">لم يتم رصد ملاحظات تحضير خاصة للغد</p>
              ) : (
                parsedResult.tomorrowNotes.map((note, i) => (
                  <div
                    key={i}
                    className="p-2.5 rounded-xl border border-purple-200 bg-purple-50/50 flex items-start justify-between gap-2 text-xs"
                  >
                    <div className="space-y-1">
                      <div className="flex items-center gap-2">
                        <span className="px-2 py-0.5 rounded bg-purple-100 text-purple-900 font-black text-[10px]">
                          ليوم: {note.day}
                        </span>
                        {note.subject && (
                          <span className="font-bold text-purple-800">{note.subject}</span>
                        )}
                      </div>
                      <p className="font-bold text-slate-900">{note.arabicNote || note.note}</p>
                      {note.bagItem && (
                        <span className="inline-block text-[11px] text-purple-700 bg-white px-2 py-0.5 rounded border border-purple-200">
                          أدوات مطلوبة: {note.bagItem}
                        </span>
                      )}
                    </div>
                  </div>
                ))
              )}
            </div>
          )}

          {/* Confirm & Save to Supabase Button */}
          <div className="pt-2 border-t border-slate-100">
            <button
              type="button"
              onClick={handleApplyToSystem}
              disabled={isApplying}
              className="w-full py-3 px-4 rounded-xl bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 text-white font-black text-xs sm:text-sm flex items-center justify-center gap-2 shadow-md transition-all cursor-pointer"
            >
              {isApplying ? (
                <>
                  <RefreshCw className="w-4 h-4 animate-spin text-white" />
                  <span>جاري الحفظ في Supabase والمزامنة السحابية...</span>
                </>
              ) : (
                <>
                  <Check className="w-4 h-4 text-white" />
                  <span>
                    حفظ وتطبيق الخطة في السحابة فوراً (Supabase Cloud Sync)
                  </span>
                </>
              )}
            </button>
          </div>
        </div>
      )}
    </div>
  );
};
