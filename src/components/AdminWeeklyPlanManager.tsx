import React, { useState, useRef, useEffect } from 'react';
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
  Zap,
  FolderUp,
  CheckSquare,
  Briefcase,
  Clock,
  ArrowRight,
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
import { triggerDoneCelebration } from '../utils/celebrate';

interface AdminWeeklyPlanManagerProps {
  currentClass?: ClassId;
  currentBlock?: number;
  currentWeek?: number;
  onApplyPlan: (
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
}

const KG1_CLASSES: ClassId[] = ['KG1A', 'KG1B', 'KG1C', 'KG1D', 'KG1E'];

const SUBJECT_OPTIONS = [
  { value: 'ALL', label: 'جميع المواد (خطة عامة وشاملة)' },
  { value: 'Arabic', label: 'اللغة العربية (خطة العربي الأسبوعية)' },
  { value: 'English', label: 'English / Phonics' },
  { value: 'Mathematics', label: 'Mathematics / الحساب' },
  { value: 'Science', label: 'Science / Discover' },
  { value: 'French', label: 'French / اللغة الفرنسية' },
  { value: 'Social Studies', label: 'Social Studies / دراسات اجتماعية' },
  { value: 'Religion', label: 'Religion / تربية دينية' },
  { value: 'ICT', label: 'ICT / كمبيوتر وتكنولوجيا' },
  { value: 'Arts', label: 'Arts / تربية فنية' },
  { value: 'Music', label: 'Music / تربية موسيقية' },
  { value: 'PE', label: 'PE / تربية رياضية' },
];

const SAMPLE_ARABIC_PLAN = `الخطة الأسبوعية لمادة اللغة العربية - رياض الأطفال (KG 1)
الموضوع: ما أروعني | الأسبوع 1

الأحد:
العمل بالصف: استقبال الأطفال والتعرف على حجرة الدراسة والمدرسة
الواجب: لا يوجد واجب اليوم
ملاحظات: ضرورة استماع الطفل لروابط الفيديوهات المرسلة لتنمية مهارة الاستماع لدى الطفل.

الإثنين:
العمل بالصف: أستقبال الأطفال والعودة إلى المدرسة
الواجب: لا يوجد واجب اليوم
ملاحظات: ضرورة استماع الطفل لروابط الفيديوهات المرسلة لتنمية مهارة الاستماع لدى الطفل.

الثلاثاء:
العمل بالصف: التعرف على الروتين اليومي والتعرف على أنواع الخطوط - حل ورق العمل ص 3 و 4 و 5
الواجب: متابعة فيديو تدريب الخطوط https://youtu.be/WP8wRNwZmCo?si=OytpY8mViq_V2-Rl
ملاحظات: رابط التعرف على الروتين اليومي https://youtu.be/yPKU5pjBgts?si=y2boOfPVrrTyeLuz

الأربعاء:
العمل بالصف: التعرف على القواعد الصفية و التعرف على حجرات المدرسة - حل ورق العمل ص 6
الواجب: متابعة فيديو القواعد الصفية https://youtu.be/5kU7OcIX7BY?si=7xef9jFupDxvBBt0
ملاحظات: رابط حجرات المدرسة https://youtu.be/TCiQ8F2xdvQ?si=Ib5Sq_w_0n0QzFCZ

الخميس:
العمل بالصف: التعرف على الرقم 1 - حل ورق العمل ص 7
الواجب: متابعة فيديو الرقم 1 https://youtu.be/ocwAHmoHkMk?si=d8Is97zI_9gzfiws
ملاحظات: ضرورة استماع الطفل لروابط الفيديوهات المرسلة لتنمية مهارة الاستماع لدى الطفل.`;

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
  const [blockNumber, setBlockNumber] = useState<number>(currentBlock || 1);
  const [weekNumber, setWeekNumber] = useState<number>(currentWeek || 1);
  const [subjectFilter, setSubjectFilter] = useState<string>('ALL');
  const [saveMode, setSaveMode] = useState<'replace_subject' | 'replace_week' | 'append'>('replace_week');

  // Option: Auto-download and apply on upload
  const [autoApplyOnUpload, setAutoApplyOnUpload] = useState<boolean>(() => {
    const saved = localStorage.getItem('nile_auto_apply_plan');
    return saved !== null ? saved === 'true' : true;
  });

  const [planText, setPlanText] = useState<string>('');
  const [isParsing, setIsParsing] = useState<boolean>(false);
  const [isApplying, setIsApplying] = useState<boolean>(false);
  const [isDragging, setIsDragging] = useState<boolean>(false);
  const [processingStep, setProcessingStep] = useState<string | null>(null);

  const [uploadedFileName, setUploadedFileName] = useState<string | null>(null);
  const [uploadedFileSize, setUploadedFileSize] = useState<number | null>(null);

  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  const [parsedResult, setParsedResult] = useState<ParsedWeeklyPlanResponse | null>(null);
  const [activePreviewTab, setActivePreviewTab] = useState<'classwork' | 'homework' | 'tomorrow'>('classwork');

  // Last applied plan summary
  const [appliedSummary, setAppliedSummary] = useState<{
    block: number;
    week: number;
    subject: string;
    classworkCount: number;
    homeworkCount: number;
    tomorrowCount: number;
    classesCount: number;
    time: string;
  } | null>(null);

  const fileInputRef = useRef<HTMLInputElement>(null);

  // Sync autoApplyOnUpload with localStorage
  const handleToggleAutoApply = (enabled: boolean) => {
    setAutoApplyOnUpload(enabled);
    localStorage.setItem('nile_auto_apply_plan', String(enabled));
  };

  // Auto-adjust saveMode when subjectFilter changes
  const handleSubjectChange = (subject: string) => {
    setSubjectFilter(subject);
    if (subject !== 'ALL') {
      setSaveMode('replace_subject');
    } else {
      setSaveMode('replace_week');
    }
  };

  // Smart detection of Subject, Week, and Topic from file name & text
  const analyzeFileNameHints = (fileName: string) => {
    const lower = fileName.toLowerCase();
    let detectedSubject: string | undefined = undefined;
    let detectedWeek: number | undefined = undefined;
    let detectedBlock: number | undefined = undefined;

    // 1. Subject hint
    if (lower.includes('عربي') || lower.includes('arabic') || lower.includes('لغة عربية')) {
      detectedSubject = 'Arabic';
      setSubjectFilter('Arabic');
      setSaveMode('replace_subject');
    } else if (lower.includes('math') || lower.includes('حساب') || lower.includes('رياضيات')) {
      detectedSubject = 'Mathematics';
      setSubjectFilter('Mathematics');
      setSaveMode('replace_subject');
    } else if (lower.includes('english') || lower.includes('انجلش') || lower.includes('phonics')) {
      detectedSubject = 'English';
      setSubjectFilter('English');
      setSaveMode('replace_subject');
    } else if (lower.includes('science') || lower.includes('علوم') || lower.includes('discover')) {
      detectedSubject = 'Science';
      setSubjectFilter('Science');
      setSaveMode('replace_subject');
    } else if (lower.includes('french') || lower.includes('فرنساوي') || lower.includes('français')) {
      detectedSubject = 'French';
      setSubjectFilter('French');
      setSaveMode('replace_subject');
    }

    // 2. Week hint
    if (/(week|أسبوع|w)\s*[-_]?\s*1/i.test(lower) || lower.includes('الأول') || lower.includes('الاول')) {
      detectedWeek = 1;
      setWeekNumber(1);
    } else if (/(week|أسبوع|w)\s*[-_]?\s*2/i.test(lower) || lower.includes('الثاني')) {
      detectedWeek = 2;
      setWeekNumber(2);
    } else if (/(week|أسبوع|w)\s*[-_]?\s*3/i.test(lower) || lower.includes('الثالث')) {
      detectedWeek = 3;
      setWeekNumber(3);
    } else if (/(week|أسبوع|w)\s*[-_]?\s*4/i.test(lower) || lower.includes('الرابع')) {
      detectedWeek = 4;
      setWeekNumber(4);
    } else if (/(week|أسبوع|w)\s*[-_]?\s*5/i.test(lower) || lower.includes('الخامس')) {
      detectedWeek = 5;
      setWeekNumber(5);
    }

    // 3. Topic / Block hint
    if (/(topic|block|موضوع|بلوك)\s*[-_]?\s*1/i.test(lower)) {
      detectedBlock = 1;
      setBlockNumber(1);
    } else if (/(topic|block|موضوع|بلوك)\s*[-_]?\s*2/i.test(lower)) {
      detectedBlock = 2;
      setBlockNumber(2);
    } else if (/(topic|block|موضوع|بلوك)\s*[-_]?\s*3/i.test(lower)) {
      detectedBlock = 3;
      setBlockNumber(3);
    } else if (/(topic|block|موضوع|بلوك)\s*[-_]?\s*4/i.test(lower)) {
      detectedBlock = 4;
      setBlockNumber(4);
    }

    return { detectedSubject, detectedWeek, detectedBlock };
  };

  const detectMetaFromText = (text: string) => {
    let detectedWeek: number | undefined = undefined;
    let detectedBlock: number | undefined = undefined;
    let detectedSubject: string | undefined = undefined;

    // Week detection from text
    const weekMatch = text.match(/(?:الأسبوع|week)\s*[:\-–\s]*([0-9]+|الأول|الاول|الثاني|الثالث|الرابع|الخامس|first|second|third|fourth)/i);
    if (weekMatch) {
      const val = weekMatch[1].toLowerCase();
      if (val === '1' || val.includes('أول') || val.includes('اول') || val === 'first') detectedWeek = 1;
      else if (val === '2' || val.includes('ثان') || val === 'second') detectedWeek = 2;
      else if (val === '3' || val.includes('ثالث') || val === 'third') detectedWeek = 3;
      else if (val === '4' || val.includes('رابع') || val === 'fourth') detectedWeek = 4;
      else if (val === '5' || val.includes('خامس')) detectedWeek = 5;
    }

    // Topic / Block detection from text
    const topicMatch = text.match(/(?:الموضوع|topic|block|بلوك)\s*[:\-–\s]*([0-9]+|الأول|الاول|الثاني|الثالث|الرابع|ما أروعني|عالمي الصغير|أنا وعائلتي)/i);
    if (topicMatch) {
      const val = topicMatch[1].toLowerCase();
      if (val === '1' || val.includes('أول') || val.includes('اول') || val.includes('ما أروعني')) detectedBlock = 1;
      else if (val === '2' || val.includes('ثان') || val.includes('عالمي الصغير')) detectedBlock = 2;
      else if (val === '3' || val.includes('ثالث') || val.includes('أنا وعائلتي')) detectedBlock = 3;
      else if (val === '4' || val.includes('رابع')) detectedBlock = 4;
    }

    // Subject detection from text
    if (/اللغة العربية|عربي|arabic/i.test(text)) detectedSubject = 'Arabic';
    else if (/mathematics|رياضيات|حساب|math/i.test(text)) detectedSubject = 'Mathematics';
    else if (/english|اللغة الإنجليزية|phonics/i.test(text)) detectedSubject = 'English';
    else if (/science|العلوم|ديسكفر/i.test(text)) detectedSubject = 'Science';
    else if (/french|اللغة الفرنسية/i.test(text)) detectedSubject = 'French';

    return { detectedWeek, detectedBlock, detectedSubject };
  };

  // Execute Direct Plan Application to App & Supabase
  const executeApplyPlan = async (
    resultToApply: ParsedWeeklyPlanResponse,
    targetB: number,
    targetW: number,
    targetSubj: string,
    targetCls: ClassId | 'ALL',
    mode: 'replace_subject' | 'replace_week' | 'append'
  ) => {
    setIsApplying(true);
    setErrorMsg(null);
    setProcessingStep('جاري الحفظ والتنزيل في قاعدة البيانات والمزامنة السحابية...');

    try {
      const classesToPopulate: ClassId[] = targetCls === 'ALL' ? KG1_CLASSES : [targetCls];

      const finalClasswork: ClassworkEntry[] = [];
      const finalHomework: HomeworkEntry[] = [];
      const finalTomorrowNotes: TomorrowSpecialNote[] = [];

      classesToPopulate.forEach((cls) => {
        // Classwork
        resultToApply.classwork.forEach((item, idx) => {
          const finalSubj =
            targetSubj !== 'ALL'
              ? (targetSubj as SubjectName)
              : (item.subject as SubjectName) || 'English';

          finalClasswork.push({
            id: `cw-plan-${cls}-${targetB}-${targetW}-${Date.now()}-${idx}`,
            classId: cls,
            day: item.day as SchoolDay,
            period: item.period || (idx % 6) + 1,
            subject: finalSubj,
            title: item.title,
            details: item.details,
            pages: item.pages,
            completed: false,
            block: targetB,
            week: targetW,
            linkUrl: item.linkUrl,
            linkTitle: item.linkTitle,
            links: item.links,
          });
        });

        // Homework
        resultToApply.homework.forEach((item, idx) => {
          const finalSubj =
            targetSubj !== 'ALL'
              ? (targetSubj as SubjectName)
              : (item.subject as SubjectName) || 'Arabic';

          finalHomework.push({
            id: `hw-plan-${cls}-${targetB}-${targetW}-${Date.now()}-${idx}`,
            classId: cls,
            assignedDay: item.assignedDay as SchoolDay,
            dueDay: item.dueDay as SchoolDay,
            subject: finalSubj,
            task: item.task,
            details: item.details,
            pages: item.pages,
            completed: item.completed ?? false,
            priority: item.priority || 'normal',
            block: targetB,
            week: targetW,
            linkUrl: item.linkUrl,
            linkTitle: item.linkTitle,
            links: item.links,
          });
        });

        // Tomorrow Notes
        if (resultToApply.tomorrowNotes) {
          resultToApply.tomorrowNotes.forEach((n) => {
            const finalSubj =
              targetSubj !== 'ALL' ? targetSubj : n.subject || 'Arabic';

            finalTomorrowNotes.push({
              classId: cls,
              targetDay: (((n as any).targetDay || n.day || 'Sunday') as SchoolDay),
              subject: finalSubj,
              note: n.note,
              arabicNote: n.arabicNote || n.note,
              bagItem: n.bagItem,
              block: targetB,
              week: targetW,
            });
          });
        }
      });

      // Call onApplyPlan with scoped parameters
      await onApplyPlan(
        finalClasswork,
        finalHomework,
        finalTomorrowNotes,
        mode !== 'append',
        {
          targetBlock: targetB,
          targetWeek: targetW,
          targetClasses: classesToPopulate,
          subjectFilter: targetSubj,
          saveMode: mode,
        }
      );

      triggerDoneCelebration();

      setAppliedSummary({
        block: targetB,
        week: targetW,
        subject: targetSubj,
        classworkCount: resultToApply.classwork.length,
        homeworkCount: resultToApply.homework.length,
        tomorrowCount: resultToApply.tomorrowNotes?.length || 0,
        classesCount: classesToPopulate.length,
        time: new Date().toLocaleTimeString('ar-EG'),
      });

      setSuccessMsg(
        `🎉 تم بنجاح! تم تنزيل واعتماد الخطة الأسبوعية في Topic ${targetB} - Week ${targetW} على ${classesToPopulate.length} فصول!`
      );
    } catch (err: any) {
      console.error('Failed to apply plan:', err);
      setErrorMsg(err.message || 'فشل حفظ وتطبيق الخطة في النظام.');
    } finally {
      setIsApplying(false);
      setProcessingStep(null);
    }
  };

  // Handle incoming file (drag/drop or file picker)
  const processUploadedFile = async (file: File) => {
    setErrorMsg(null);
    setSuccessMsg(null);
    setUploadedFileName(file.name);
    setUploadedFileSize(file.size);

    // Detect subject and week hints from filename
    const fileHints = analyzeFileNameHints(file.name);
    let activeWeek = fileHints.detectedWeek ?? weekNumber;
    let activeBlock = fileHints.detectedBlock ?? blockNumber;
    let activeSubj = fileHints.detectedSubject ?? subjectFilter;

    setIsParsing(true);
    setProcessingStep('1. جاري قراءة واستخراج النصوص من ملف الـ PDF...');

    try {
      const extracted = await extractWeeklyPlanText(file);
      if (!extracted || extracted.trim().length < 10) {
        throw new Error('تعذر استخراج نص مقروء من هذا الملف. يرجى التأكد من محتوى الـ PDF أو لصق النص يدوياً.');
      }

      setPlanText(extracted);

      // Also inspect extracted text for Week / Topic / Subject hints if not already in filename
      const textHints = detectMetaFromText(extracted);
      if (!fileHints.detectedWeek && textHints.detectedWeek) {
        activeWeek = textHints.detectedWeek;
        setWeekNumber(textHints.detectedWeek);
      }
      if (!fileHints.detectedBlock && textHints.detectedBlock) {
        activeBlock = textHints.detectedBlock;
        setBlockNumber(textHints.detectedBlock);
      }
      if (!fileHints.detectedSubject && textHints.detectedSubject) {
        activeSubj = textHints.detectedSubject;
        setSubjectFilter(textHints.detectedSubject);
        setSaveMode('replace_subject');
      }

      setProcessingStep('2. جاري التحليل الذكي وتصنيف الحصص والواجبات والملاحظات...');

      const classForParsing = targetClass === 'ALL' ? 'KG1A' : targetClass;
      const result = await parseWeeklyPlanWithAI(extracted, classForParsing, activeSubj);

      const hasItems =
        (result.classwork && result.classwork.length > 0) ||
        (result.homework && result.homework.length > 0) ||
        (result.tomorrowNotes && result.tomorrowNotes.length > 0);

      if (!hasItems) {
        throw new Error('لم يتم رصد حصص أو واجبات صالحة في ملف الخطة. يرجى فحص النص أو مراجعة الصياغة.');
      }

      setParsedResult(result);

      // Check if Option: Auto-Download on Upload is active
      if (autoApplyOnUpload) {
        setProcessingStep(`3. تنزيل واعتماد فوري في Topic ${activeBlock} - Week ${activeWeek}...`);
        await executeApplyPlan(
          result,
          activeBlock,
          activeWeek,
          activeSubj,
          targetClass,
          activeSubj !== 'ALL' ? 'replace_subject' : saveMode
        );
      } else {
        setSuccessMsg(
          `تم تحليل الـ Weekly Plan بنجاح! راجع الإحصائيات واضغط زر "OK — تنزيل واعتماد الخطة" لتثبيتها في Topic ${activeBlock} - Week ${activeWeek}.`
        );
      }
    } catch (err: any) {
      console.error('Processing file failed:', err);
      setErrorMsg(err.message || 'حدث خطأ أثناء معالجة ملف الخطة.');
    } finally {
      setIsParsing(false);
      setProcessingStep(null);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      processUploadedFile(file);
    }
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(true);
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);
    const file = e.dataTransfer.files?.[0];
    if (file) {
      processUploadedFile(file);
    }
  };

  // Manual Parsing trigger (from textarea)
  const handleParseTextManual = async () => {
    if (!planText.trim()) {
      setErrorMsg('يرجى كتابة أو لصق نص الخطة الأسبوعية أولاً.');
      return;
    }

    setIsParsing(true);
    setErrorMsg(null);
    setSuccessMsg(null);
    setProcessingStep('جاري التحليل بالذكاء الاصطناعي...');

    try {
      const classForParsing = targetClass === 'ALL' ? 'KG1A' : targetClass;
      const result = await parseWeeklyPlanWithAI(planText, classForParsing, subjectFilter);

      const hasItems =
        (result.classwork && result.classwork.length > 0) ||
        (result.homework && result.homework.length > 0) ||
        (result.tomorrowNotes && result.tomorrowNotes.length > 0);

      if (!hasItems) {
        throw new Error('لم يتم رصد حصص أو واجبات صالحة في النص المدخل.');
      }

      setParsedResult(result);
      setSuccessMsg(
        `تم تحليل الخطة بنجاح! تم استخراج ${result.classwork.length} حصة، و ${result.homework.length} واجب، و ${result.tomorrowNotes?.length || 0} ملاحظة.`
      );
    } catch (err: any) {
      console.error('Manual parse error:', err);
      setErrorMsg(err.message || 'فشل تحليل الخطة الأسبوعية.');
    } finally {
      setIsParsing(false);
      setProcessingStep(null);
    }
  };

  // Button OK Click handler: Applies currently parsedResult
  const handleOkClick = async () => {
    if (!parsedResult) return;
    await executeApplyPlan(parsedResult, blockNumber, weekNumber, subjectFilter, targetClass, saveMode);
  };

  return (
    <div className="space-y-4" dir="rtl">
      {/* Top Banner & Mode Summary */}
      <div className="bg-gradient-to-r from-indigo-900 via-indigo-800 to-purple-900 text-white p-4 rounded-2xl shadow-sm space-y-2">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-white/15 text-amber-300 flex items-center justify-center shadow-xs shrink-0">
              <Sparkles className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-sm sm:text-base font-black flex items-center gap-2">
                <span>تحليل وتنزيل Weekly Plan بالذكاء الاصطناعي</span>
                <span className="bg-amber-400 text-slate-950 text-[10px] font-black px-2 py-0.5 rounded-md">
                  PDF Smart Importer
                </span>
              </h3>
              <p className="text-xs text-indigo-200 font-medium">
                ارفع ملف الـ PDF وسيقوم النظام بتحليله فوراً وتصنيفه وتنزيله في الأسبوع والموضوع المحددين بنقرة واحدة!
              </p>
            </div>
          </div>

          {/* Quick Target Indicator */}
          <div className="flex items-center gap-1.5 bg-white/10 px-3 py-1.5 rounded-xl border border-white/20 text-xs font-black self-start sm:self-auto shrink-0">
            <Calendar className="w-3.5 h-3.5 text-amber-300" />
            <span>Topic {blockNumber}</span>
            <span className="text-white/40">•</span>
            <span>Week {weekNumber}</span>
            <span className="text-white/40">•</span>
            <span>{subjectFilter === 'ALL' ? 'جميع المواد' : subjectFilter}</span>
          </div>
        </div>
      </div>

      {/* Target Parameters Card (Topic, Week, Class, Subject, Save Mode) */}
      <div className="bg-slate-50 p-4 rounded-2xl border border-slate-200 shadow-2xs space-y-3.5">
        <div className="flex items-center justify-between border-b border-slate-200 pb-2">
          <span className="text-xs font-black text-slate-800 flex items-center gap-1.5">
            <Layers className="w-4 h-4 text-indigo-600" />
            <span>بيانات التصنيف والأسبوع المستهدف (حدد أين تنزل الخطة):</span>
          </span>
          <span className="text-[11px] font-bold text-slate-500">
            {targetClass === 'ALL' ? 'كافة فصول KG 1' : `فصل ${targetClass}`}
          </span>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs font-bold">
          {/* Topic / Block Selector */}
          <div>
            <label className="block text-slate-700 mb-1">الموضوع (Topic / Block):</label>
            <select
              value={blockNumber}
              onChange={(e) => setBlockNumber(Number(e.target.value))}
              className="w-full p-2 bg-white rounded-xl border border-slate-300 font-black text-slate-800 focus:ring-2 focus:ring-indigo-500 cursor-pointer shadow-2xs"
            >
              <option value={1}>Topic 1 (Block 1)</option>
              <option value={2}>Topic 2 (Block 2)</option>
              <option value={3}>Topic 3 (Block 3)</option>
              <option value={4}>Topic 4 (Block 4)</option>
            </select>
          </div>

          {/* Week Selector */}
          <div>
            <label className="block text-slate-700 mb-1">الأسبوع (Week):</label>
            <select
              value={weekNumber}
              onChange={(e) => setWeekNumber(Number(e.target.value))}
              className="w-full p-2 bg-white rounded-xl border border-purple-300 bg-purple-50/50 font-black text-purple-950 focus:ring-2 focus:ring-purple-500 cursor-pointer shadow-2xs"
            >
              <option value={1}>Week 1 (الأسبوع 1)</option>
              <option value={2}>Week 2 (الأسبوع 2)</option>
              <option value={3}>Week 3 (الأسبوع 3)</option>
              <option value={4}>Week 4 (الأسبوع 4)</option>
              <option value={5}>Week 5 (الأسبوع 5)</option>
            </select>
          </div>

          {/* Subject Focus / Filter */}
          <div>
            <label className="block text-slate-700 mb-1">المادة (تخصيص الخطة):</label>
            <select
              value={subjectFilter}
              onChange={(e) => handleSubjectChange(e.target.value)}
              className="w-full p-2 bg-white rounded-xl border border-emerald-300 bg-emerald-50/50 font-black text-emerald-950 focus:ring-2 focus:ring-emerald-500 cursor-pointer shadow-2xs"
            >
              {SUBJECT_OPTIONS.map((s) => (
                <option key={s.value} value={s.value}>
                  {s.label}
                </option>
              ))}
            </select>
          </div>

          {/* Target Class */}
          <div>
            <label className="block text-slate-700 mb-1">الفصل المستهدف:</label>
            <select
              value={targetClass}
              onChange={(e) => setTargetClass(e.target.value as any)}
              className="w-full p-2 bg-white rounded-xl border border-slate-300 font-black text-slate-800 focus:ring-2 focus:ring-indigo-500 cursor-pointer shadow-2xs"
            >
              <option value="ALL">جميع فصول KG 1 (A, B, C, D, E)</option>
              {KG1_CLASSES.map((cls) => (
                <option key={cls} value={cls}>
                  {cls}
                </option>
              ))}
            </select>
          </div>
        </div>

        {/* Save Mode & The Core Auto-Apply Option Switch */}
        <div className="pt-2 border-t border-slate-200/80 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
          {/* Save Mode */}
          <div className="flex items-center gap-2 text-xs font-bold w-full sm:w-auto">
            <span className="text-slate-600 shrink-0">طريقة التنزيل:</span>
            <select
              value={saveMode}
              onChange={(e) => setSaveMode(e.target.value as any)}
              className="p-1.5 bg-white rounded-lg border border-slate-300 text-xs font-black text-slate-800 focus:ring-2 focus:ring-indigo-500 cursor-pointer shadow-2xs flex-1 sm:flex-none"
            >
              {subjectFilter !== 'ALL' && (
                <option value="replace_subject">
                  استبدال محتوى {subjectFilter === 'Arabic' ? 'اللغة العربية' : subjectFilter} فقط لهذا الأسبوع
                </option>
              )}
              <option value="replace_week">استبدال كامل للأسبوع المحدد (مسح مواد الأسبوع وتنزيل الجديد)</option>
              <option value="append">إضافة فوق الخطة الموجودة (Append)</option>
            </select>
          </div>

          {/* Option: Auto-Apply Toggle (Requested explicitly by user) */}
          <label className="inline-flex items-center gap-2 bg-amber-50 hover:bg-amber-100/70 border border-amber-300 px-3 py-1.5 rounded-xl cursor-pointer transition-colors shadow-2xs">
            <input
              type="checkbox"
              checked={autoApplyOnUpload}
              onChange={(e) => handleToggleAutoApply(e.target.checked)}
              className="w-4 h-4 rounded text-amber-600 focus:ring-amber-500 cursor-pointer"
            />
            <div className="flex items-center gap-1.5">
              <Zap className="w-3.5 h-3.5 text-amber-600" />
              <span className="text-xs font-black text-amber-950">
                Option: تنزيل واعتماد فوري وتلقائي بمجرد رفع الـ PDF
              </span>
            </div>
          </label>
        </div>
      </div>

      {/* Drag & Drop PDF Zone */}
      <div
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
        onClick={() => fileInputRef.current?.click()}
        className={`relative p-6 sm:p-8 rounded-2xl border-2 border-dashed transition-all text-center cursor-pointer flex flex-col items-center justify-center gap-3 ${
          isDragging
            ? 'border-indigo-600 bg-indigo-50/80 scale-101 shadow-md'
            : 'border-indigo-300 bg-gradient-to-b from-indigo-50/40 via-white to-purple-50/30 hover:bg-indigo-50/60 hover:border-indigo-400 shadow-2xs'
        }`}
      >
        <input
          type="file"
          ref={fileInputRef}
          onChange={handleFileChange}
          accept=".pdf,.docx,.txt"
          className="hidden"
        />

        <div className="w-14 h-14 rounded-2xl bg-indigo-600 text-white flex items-center justify-center shadow-md">
          {isParsing ? (
            <RefreshCw className="w-7 h-7 animate-spin text-white" />
          ) : (
            <FolderUp className="w-7 h-7 text-white" />
          )}
        </div>

        <div className="space-y-1">
          <h4 className="text-sm sm:text-base font-black text-slate-900">
            {isParsing
              ? processingStep || 'جاري معالجة الـ PDF...'
              : 'اسحب وأفلت ملف الـ Weekly Plan هنا (PDF) أو انقر للاختيار'}
          </h4>
          <p className="text-xs text-slate-600 font-medium max-w-md mx-auto">
            ارفع ملف الخطة وسيتم تحليله بالذكاء الاصطناعي وتوزيعه تلقائياً على أيام الأسبوع (الأحد - الخميس) في{' '}
            <span className="font-black text-indigo-700">Topic {blockNumber} • Week {weekNumber}</span>
          </p>
        </div>

        {uploadedFileName && (
          <div className="inline-flex items-center gap-2 px-3 py-1 bg-white border border-indigo-200 rounded-full text-xs font-bold text-indigo-900 shadow-2xs">
            <FileText className="w-3.5 h-3.5 text-indigo-600" />
            <span className="truncate max-w-[200px]">{uploadedFileName}</span>
            {uploadedFileSize && (
              <span className="text-slate-400 text-[10px]">
                ({(uploadedFileSize / 1024).toFixed(1)} KB)
              </span>
            )}
            <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
          </div>
        )}

        <div className="flex items-center gap-2 text-[11px] text-slate-500 font-bold mt-1">
          <span>صيغ مدعومة: PDF • Word (DOCX) • نص (TXT)</span>
          <span>•</span>
          <span className="text-indigo-700 font-black">
            {autoApplyOnUpload ? '⚡ التنزيل التلقائي مفعل' : 'زر OK للاعتماد مفعل'}
          </span>
        </div>
      </div>

      {/* Processing Status Banner */}
      {processingStep && (
        <div className="p-3.5 bg-indigo-50 border border-indigo-200 text-indigo-950 text-xs font-black rounded-xl flex items-center gap-3 animate-pulse">
          <RefreshCw className="w-4 h-4 animate-spin text-indigo-600 shrink-0" />
          <span>{processingStep}</span>
        </div>
      )}

      {/* Success Banner */}
      {successMsg && (
        <div className="p-3.5 bg-emerald-50 border border-emerald-200 text-emerald-950 text-xs font-bold rounded-xl flex items-start justify-between gap-2">
          <div className="flex items-center gap-2">
            <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0" />
            <span>{successMsg}</span>
          </div>
          <button
            onClick={() => setSuccessMsg(null)}
            className="text-emerald-700 hover:text-emerald-950 font-bold text-xs"
          >
            إغلاق
          </button>
        </div>
      )}

      {/* Error Banner */}
      {errorMsg && (
        <div className="p-3.5 bg-rose-50 border border-rose-200 text-rose-950 text-xs font-bold rounded-xl flex items-start justify-between gap-2">
          <div className="flex items-center gap-2">
            <AlertCircle className="w-5 h-5 text-rose-600 shrink-0" />
            <span>{errorMsg}</span>
          </div>
          <button
            onClick={() => setErrorMsg(null)}
            className="text-rose-700 hover:text-rose-950 font-bold text-xs"
          >
            إغلاق
          </button>
        </div>
      )}

      {/* Applied Plan Summary Card (When already applied) */}
      {appliedSummary && (
        <div className="bg-emerald-50/80 border-2 border-emerald-300 p-4 rounded-2xl shadow-2xs space-y-3 animate-in fade-in duration-200">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-emerald-200 pb-2">
            <div className="flex items-center gap-2">
              <span className="w-7 h-7 rounded-lg bg-emerald-600 text-white flex items-center justify-center font-black text-xs">
                ✓
              </span>
              <div>
                <h4 className="text-xs sm:text-sm font-black text-emerald-950">
                  تم تنزيل وتثبيت الخطة في النظام بنجاح!
                </h4>
                <p className="text-[11px] text-emerald-800 font-medium">
                  تم الحفظ في Topic {appliedSummary.block} • Week {appliedSummary.week} • المادة: {appliedSummary.subject} • الساعة: {appliedSummary.time}
                </p>
              </div>
            </div>
            <span className="text-[11px] font-black text-emerald-900 bg-emerald-100/90 px-2.5 py-1 rounded-lg border border-emerald-300 self-start sm:self-auto">
              سحابي Supabase Cloud Sync ✓
            </span>
          </div>

          <div className="grid grid-cols-3 gap-2 text-center text-xs">
            <div className="bg-white p-2.5 rounded-xl border border-emerald-200">
              <span className="block text-[11px] font-bold text-slate-500">حصص ودروس (Classwork)</span>
              <span className="text-base font-black text-blue-700">{appliedSummary.classworkCount}</span>
            </div>
            <div className="bg-white p-2.5 rounded-xl border border-emerald-200">
              <span className="block text-[11px] font-bold text-slate-500">واجبات منزلية (Homework)</span>
              <span className="text-base font-black text-purple-700">{appliedSummary.homeworkCount}</span>
            </div>
            <div className="bg-white p-2.5 rounded-xl border border-emerald-200">
              <span className="block text-[11px] font-bold text-slate-500">ملاحظات غد (Tomorrow)</span>
              <span className="text-base font-black text-amber-700">{appliedSummary.tomorrowCount}</span>
            </div>
          </div>
        </div>
      )}

      {/* CORE OK BUTTON BANNER (When parsedResult is ready) */}
      {parsedResult && (
        <div className="bg-white rounded-2xl border-2 border-indigo-400 p-4 sm:p-5 shadow-md space-y-4 animate-in fade-in duration-150">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-slate-100">
            <div>
              <h4 className="text-sm sm:text-base font-black text-slate-900 flex items-center gap-2">
                <span>نتائج تحليل الخطة الأسبوعية:</span>
                <span className="text-xs font-bold text-indigo-700 bg-indigo-50 px-2 py-0.5 rounded-md border border-indigo-200">
                  Topic {blockNumber} • Week {weekNumber}
                </span>
              </h4>
              <p className="text-xs text-slate-600 font-medium mt-0.5">
                اضغط زر <strong>OK</strong> بالأسفل لاعتماد وتنزيل البيانات في جدول الحصص والواجبات فوراً.
              </p>
            </div>

            {/* Quick stats pills */}
            <div className="flex items-center gap-1.5 flex-wrap">
              <span className="px-2.5 py-1 bg-blue-50 text-blue-800 border border-blue-200 rounded-lg text-xs font-black">
                📚 {parsedResult.classwork.length} حصة (CW)
              </span>
              <span className="px-2.5 py-1 bg-purple-50 text-purple-800 border border-purple-200 rounded-lg text-xs font-black">
                📝 {parsedResult.homework.length} واجب (HW)
              </span>
              <span className="px-2.5 py-1 bg-amber-50 text-amber-800 border border-amber-200 rounded-lg text-xs font-black">
                🔔 {parsedResult.tomorrowNotes?.length || 0} ملاحظة غد
              </span>
            </div>
          </div>

          {/* THE PROMINENT 'OK' BUTTON REQUESTED BY THE USER */}
          <button
            type="button"
            onClick={handleOkClick}
            disabled={isApplying}
            className="w-full py-3.5 px-5 rounded-xl bg-emerald-600 hover:bg-emerald-700 active:scale-98 disabled:opacity-50 text-white font-black text-sm sm:text-base flex items-center justify-center gap-2.5 shadow-md transition-all cursor-pointer border border-emerald-500"
          >
            {isApplying ? (
              <>
                <RefreshCw className="w-5 h-5 animate-spin text-white" />
                <span>جاري الحفظ والتنزيل في Supabase...</span>
              </>
            ) : (
              <>
                <Check className="w-5 h-5 text-white stroke-[3]" />
                <span>
                  OK — تنزيل واعتماد الخطة الآن في الأسبوع {weekNumber} (Topic {blockNumber})
                </span>
              </>
            )}
          </button>

          {/* Preview Tabs Header */}
          <div className="flex items-center justify-between pt-1">
            <span className="text-xs font-black text-slate-700">معاينة تفاصيل الخطة المستخرجة:</span>
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
                الحصص ({parsedResult.classwork.length})
              </button>
              <button
                type="button"
                onClick={() => setActivePreviewTab('homework')}
                className={`px-3 py-1 rounded-lg font-bold transition-colors cursor-pointer ${
                  activePreviewTab === 'homework'
                    ? 'bg-purple-600 text-white shadow-2xs'
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
                    ? 'bg-amber-600 text-white shadow-2xs'
                    : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
                }`}
              >
                ملاحظات الغد ({parsedResult.tomorrowNotes?.length || 0})
              </button>
            </div>
          </div>

          {/* Tab 1: Classwork */}
          {activePreviewTab === 'classwork' && (
            <div className="max-h-60 overflow-y-auto space-y-2 pr-1 border border-slate-200 rounded-xl p-2.5 bg-slate-50/50">
              {parsedResult.classwork.length === 0 ? (
                <p className="text-xs text-slate-400 text-center py-4">لا توجد حصص مسجلة</p>
              ) : (
                parsedResult.classwork.map((cw, i) => (
                  <div
                    key={i}
                    className="p-2.5 rounded-xl border border-slate-200 bg-white flex items-start justify-between gap-2 text-xs shadow-2xs"
                  >
                    <div className="space-y-1">
                      <div className="flex items-center gap-2">
                        <span className="px-2 py-0.5 rounded bg-blue-100 text-blue-900 font-black text-[10px]">
                          {cw.day} • P{cw.period || (i % 6) + 1}
                        </span>
                        <span className="font-black text-slate-800">{cw.subject}</span>
                        {cw.pages && (
                          <span className="text-[10px] text-slate-500 bg-slate-100 px-1.5 py-0.5 rounded font-bold">
                            📖 {cw.pages}
                          </span>
                        )}
                      </div>
                      <p className="font-bold text-slate-900">{cw.title}</p>
                      {cw.details && <p className="text-slate-600 text-[11px]">{cw.details}</p>}
                      {cw.linkUrl && (
                        <a
                          href={cw.linkUrl}
                          target="_blank"
                          rel="noreferrer"
                          className="inline-flex items-center gap-1 text-[11px] text-indigo-600 hover:underline font-semibold"
                        >
                          <ExternalLink className="w-3 h-3" />
                          <span>رابط الدرس: {cw.linkUrl}</span>
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
            <div className="max-h-60 overflow-y-auto space-y-2 pr-1 border border-slate-200 rounded-xl p-2.5 bg-slate-50/50">
              {parsedResult.homework.length === 0 ? (
                <p className="text-xs text-slate-400 text-center py-4">لا توجد واجبات مسجلة</p>
              ) : (
                parsedResult.homework.map((hw, i) => (
                  <div
                    key={i}
                    className="p-2.5 rounded-xl border border-slate-200 bg-white flex items-start justify-between gap-2 text-xs shadow-2xs"
                  >
                    <div className="space-y-1">
                      <div className="flex items-center gap-2">
                        <span className="px-2 py-0.5 rounded bg-purple-100 text-purple-900 font-black text-[10px]">
                          تسليم: {hw.dueDay} (مطلوب: {hw.assignedDay})
                        </span>
                        <span className="font-black text-slate-800">{hw.subject}</span>
                        {hw.priority === 'urgent' && (
                          <span className="px-1.5 py-0.2 rounded bg-rose-100 text-rose-800 text-[10px] font-black">
                            مهم / كويز
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
            <div className="max-h-60 overflow-y-auto space-y-2 pr-1 border border-slate-200 rounded-xl p-2.5 bg-slate-50/50">
              {!parsedResult.tomorrowNotes || parsedResult.tomorrowNotes.length === 0 ? (
                <p className="text-xs text-slate-400 text-center py-4">لم يتم رصد ملاحظات تحضير خاصة للغد</p>
              ) : (
                parsedResult.tomorrowNotes.map((note, i) => (
                  <div
                    key={i}
                    className="p-2.5 rounded-xl border border-amber-200 bg-amber-50/40 flex items-start justify-between gap-2 text-xs shadow-2xs"
                  >
                    <div className="space-y-1">
                      <div className="flex items-center gap-2">
                        <span className="px-2 py-0.5 rounded bg-amber-100 text-amber-950 font-black text-[10px]">
                          ليوم: {note.targetDay || note.day || 'Sunday'}
                        </span>
                        {note.subject && (
                          <span className="font-bold text-amber-900">{note.subject}</span>
                        )}
                      </div>
                      <p className="font-bold text-slate-900">{note.arabicNote || note.note}</p>
                      {note.bagItem && (
                        <span className="inline-block text-[11px] text-amber-800 bg-white px-2 py-0.5 rounded border border-amber-200 font-bold">
                          أدوات مطلوبة: {note.bagItem}
                        </span>
                      )}
                    </div>
                  </div>
                ))
              )}
            </div>
          )}
        </div>
      )}

      {/* Manual Pasting Section (Collapsible / Alternative) */}
      <div className="bg-slate-50 p-3.5 rounded-2xl border border-slate-200 space-y-2">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
          <label className="text-xs font-black text-slate-700 flex items-center gap-1.5">
            <FileText className="w-3.5 h-3.5 text-slate-500" />
            <span>نص الخطة (بديل للصق النص مباشرة إن لم يتوفر PDF):</span>
          </label>
          <div className="flex items-center gap-2 flex-wrap">
            <button
              type="button"
              onClick={() => {
                setPlanText(SAMPLE_ARABIC_PLAN);
                setSubjectFilter('Arabic');
                setSaveMode('replace_subject');
              }}
              className="inline-flex items-center gap-1 px-2.5 py-1 bg-emerald-50 hover:bg-emerald-100 text-emerald-800 border border-emerald-300 rounded-lg text-xs font-bold transition-colors cursor-pointer"
            >
              <BookOpen className="w-3 h-3 text-emerald-600" />
              <span>نموذج خطة العربي (Week 1)</span>
            </button>
            <button
              type="button"
              onClick={() => setPlanText(SAMPLE_KG1_PLAN)}
              className="inline-flex items-center gap-1 px-2.5 py-1 bg-indigo-50 hover:bg-indigo-100 text-indigo-700 rounded-lg text-xs font-bold transition-colors cursor-pointer"
            >
              <Sparkles className="w-3 h-3 text-amber-500" />
              <span>نموذج إنجليزي</span>
            </button>
            {planText && (
              <button
                type="button"
                onClick={() => {
                  setPlanText('');
                  setParsedResult(null);
                }}
                className="px-2 py-1 text-slate-400 hover:text-slate-600 rounded-lg text-xs font-bold"
              >
                مسح
              </button>
            )}
          </div>
        </div>

        <textarea
          rows={4}
          value={planText}
          onChange={(e) => setPlanText(e.target.value)}
          placeholder={`الصق نص الويكلي بلان هنا مباشرة... مثال:
Sunday:
- Math: Classwork p. 14-17. Homework p. 11 (Due Monday)
- Arabic: درس أنا أستطيع. كتابة الفقرة في الكشكول`}
          className="w-full text-xs font-mono p-2.5 bg-white rounded-xl border border-slate-300 focus:outline-hidden focus:ring-2 focus:ring-indigo-500 leading-relaxed text-slate-800"
          dir="ltr"
        />

        {planText && !parsedResult && (
          <button
            type="button"
            onClick={handleParseTextManual}
            disabled={isParsing || !planText.trim()}
            className="w-full py-2.5 px-4 rounded-xl bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 text-white font-black text-xs sm:text-sm flex items-center justify-center gap-2 shadow-xs transition-all cursor-pointer"
          >
            {isParsing ? (
              <>
                <RefreshCw className="w-4 h-4 animate-spin text-white" />
                <span>جاري تحليل النص بالذكاء الاصطناعي...</span>
              </>
            ) : (
              <>
                <Sparkles className="w-4 h-4 text-amber-300" />
                <span>تحليل النص بالذكاء الاصطناعي وإظهار زر OK للاعتماد</span>
              </>
            )}
          </button>
        )}
      </div>
    </div>
  );
};
