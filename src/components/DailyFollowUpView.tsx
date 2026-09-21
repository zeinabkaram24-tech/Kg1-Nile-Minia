import React, { useState, useEffect, useMemo } from 'react';
import {
  BookOpen,
  CheckSquare,
  Package,
  Calendar,
  Clock,
  CheckCircle2,
  Circle,
  Plus,
  Edit2,
  Trash2,
  AlertCircle,
  Sparkles,
  Share2,
  Printer,
  ChevronRight,
  ChevronLeft,
  RotateCcw,
  Check,
  Table,
  LayoutGrid,
  Layers,
  FileSpreadsheet,
  Mic,
  Square,
  MicOff,
  Save,
  Link as LinkIcon
} from 'lucide-react';
import {
  DailyFollowUp,
  SchoolClass,
  UserRole,
  ClassworkRecord,
  HomeworkRecord,
  TomorrowPreparationItem,
  ClassTimetable,
  PeriodSlot,
  WeeklyPlanItem,
  SchoolMaterialFile
} from '../types';
import { SubjectBadge, getSubjectInfo, RenderSubjectIcon } from './SubjectBadge';
import { SUBJECTS, INITIAL_TIMETABLES } from '../data/initialData';

const NEXT_DAY_MAP: Record<string, string> = {
  'الأحد': 'الإثنين',
  'الإثنين': 'الثلاثاء',
  'الثلاثاء': 'الأربعاء',
  'الأربعاء': 'الخميس',
  'الخميس': 'الأحد'
};

// Activity/session periods are not academic classwork.
const SESSION_SUBJECTS = new Set(['music', 'art', 'pe']);

const SUBJECT_PACKING_KIT: Record<string, { book: string; notebook: string; tools: string }> = {
  english: {
    book: "كتاب Cambridge Primary English (Learner's Book + Activity Book)",
    notebook: 'كشكول إنجليزي مسطر (4 أسطر)',
    tools: 'مقلمة، قلم رصاص HB، ممحاة، براية'
  },
  math: {
    book: "كتاب Cambridge Primary Math (Learner's Book + Workbook)",
    notebook: 'كشكول ماث مربعات (Grid Notebook)',
    tools: 'مسطرة 20 سم، قلم رصاص، ممحاة'
  },
  science: {
    book: "كتاب Cambridge Primary Science (Learner's Book)",
    notebook: 'كشكول الساينس للأنشطة والتجارب',
    tools: 'ألوان خشبية للرسومات التوضيحية'
  },
  arabic: {
    book: 'كتاب تواصل (اللغة العربية) + كراسة الأنشطة',
    notebook: 'كشكول عربي مسطر سطرين',
    tools: 'قلم رصاص + ممحاة'
  },
  social: {
    book: 'كتاب الدراسات الاجتماعية والمواطنة',
    notebook: 'كشكول الدراسات الاجتماعية',
    tools: 'ألوان خشبية ومسطرة'
  },
  french: {
    book: "كتاب الفرنسية (Alex et Zoé - Livre de l'élève)",
    notebook: 'كشكول الفرنساوي',
    tools: 'أقلام رصاص وممحاة'
  },
  ict: {
    book: 'كتاب تكنولوجيا المعلومات والاتصالات ICT',
    notebook: 'كشكول الحاسب الآلي',
    tools: 'جاهزية الحصة بمعمل الحاسب الآلي'
  },
  art: {
    book: 'كراسة الرسم والتصميم (Sketchbook)',
    notebook: 'ملف حفظ الأعمال الفنية (Portfolio)',
    tools: 'علبة ألوان خشبية وفلوماستر + مقص أطفال آمن + قلم صمغ'
  },
  pe: {
    book: 'لا يوجد كتاب دراسي (حصة عملية رياضية)',
    notebook: 'لا يوجد كشكول',
    tools: 'الزي الرياضي الرسمي لمدارس النيل + حذاء رياضي (كوتشي) + زجاجة ماء'
  },
  ethics: {
    book: 'كتاب التربية الدينية والقيم',
    notebook: 'كشكول الدين والقيم والأخلاق',
    tools: 'قلم رصاص وممحاة'
  },
  religion: {
    book: 'كتاب التربية الدينية',
    notebook: 'كشكول التربية الدينية',
    tools: 'قلم رصاص وممحاة'
  }
};

interface DailyFollowUpViewProps {
  currentRole: UserRole;
  selectedClass: SchoolClass;
  selectedBlock: string;
  selectedWeek: string;
  dailyFollowUps: DailyFollowUp[];
  onUpdateDailyFollowUps: (data: DailyFollowUp[]) => void;
  completedHwMap: Record<string, boolean>;
  onToggleHwCompletion: (hwId: string) => void;
  studentName?: string;
  onOpenPrint: () => void;
  timetables?: ClassTimetable[];
  weeklyPlans?: WeeklyPlanItem[];
  materials?: SchoolMaterialFile[];
  onUpdateWeeklyPlans?: (data: WeeklyPlanItem[]) => void;
}

export const DailyFollowUpView: React.FC<DailyFollowUpViewProps> = ({
  currentRole,
  selectedClass,
  selectedBlock,
  selectedWeek,
  dailyFollowUps,
  onUpdateDailyFollowUps,
  completedHwMap,
  onToggleHwCompletion,
  studentName,
  onOpenPrint,
  timetables,
  weeklyPlans,
  materials
  ,onUpdateWeeklyPlans
}) => {
  // Find current follow-up or create one
  const currentRecord = dailyFollowUps.find(
    (d) => d.classId === selectedClass && d.blockId === selectedBlock && d.weekId === selectedWeek
  ) || dailyFollowUps.find((d) => d.classId === selectedClass) || dailyFollowUps[0];

  const defaultTomorrow = NEXT_DAY_MAP[currentRecord.dayNameAr] || 'الخميس';
  const [selectedTomorrowDay, setSelectedTomorrowDay] = useState<string>(defaultTomorrow);
  const [selectedFollowUpDay, setSelectedFollowUpDay] = useState<string>(currentRecord?.dayNameAr || 'الأحد');

  useEffect(() => {
    if (NEXT_DAY_MAP[currentRecord.dayNameAr]) {
      setSelectedTomorrowDay(NEXT_DAY_MAP[currentRecord.dayNameAr]);
    }
  }, [currentRecord.dayNameAr]);

  useEffect(() => {
    setSelectedFollowUpDay(currentRecord.dayNameAr);
  }, [currentRecord.dayNameAr]);

  const activeTimetable =
    timetables?.find((t) => t.classId === selectedClass) ||
    INITIAL_TIMETABLES.find((t) => t.classId === selectedClass);
  const tomorrowDaySchedule = activeTimetable?.days.find((d) => d.dayNameAr === selectedTomorrowDay);
  const scheduledTomorrowPeriods = tomorrowDaySchedule?.periods || [];

  // Weekly plans matching current block and week
  const weekPlans = useMemo(() => {
    return (weeklyPlans || []).filter(
      (wp) =>
        wp.blockId === selectedBlock &&
        wp.weekId === selectedWeek &&
        (wp.classId === 'all' || wp.classId === selectedClass)
    );
  }, [weeklyPlans, selectedBlock, selectedWeek, selectedClass]);


  // Clean page extraction helper
  const extractPageNumber = (str?: string): string => {
    if (!str) return '24';
    const match = str.match(/(?:page|pp\.|p\.|صفحة|ص)\s*[:.]?\s*([\d\s\-,–]+)/i);
    if (match) return match[1].trim();
    const numMatch = str.match(/\b\d+(?:[-–]\d+)?\b/);
    return numMatch ? numMatch[0] : str.replace(/[^0-9\-–]/g, '') || '24';
  };

  const hasActualHomework = (value?: string) => Boolean(value && !/^(?:no\s+homework(?:\s+recorded)?|no\s+additional\s+homework(?:\s+recorded)?|none|لا\s*يوجد(?:\s+واجب)?)[.\s،،]*$/i.test(value.trim()));

  const getDayPlanContent = (plan: WeeklyPlanItem | undefined, day: string, subjectId?: string) => {
    if (!plan?.dayContent) return undefined;
    const aliases: Record<string, string[]> = {
      'الأحد': ['Sunday'], 'الإثنين': ['Monday'], 'الثلاثاء': ['Tuesday'],
      'الأربعاء': ['Wednesday'], 'الخميس': ['Thursday'],
      Sunday: ['الأحد'], Monday: ['الإثنين'], Tuesday: ['الثلاثاء'],
      Wednesday: ['الأربعاء'], Thursday: ['الخميس']
    };
    const keys = [
      ...(subjectId ? [`${day}|${subjectId}`] : []), day,
      ...(aliases[day] || []).flatMap((alias) => subjectId ? [`${alias}|${subjectId}`, alias] : [alias])
    ];
    return keys.map((key) => plan.dayContent?.[key]).find(Boolean);
  };

  const getIctSession = (day: string): number | undefined => {
    const sessions: Record<SchoolClass, Record<string, number>> = {
      'KG1A': { 'الأحد': 1, 'الإثنين': 2, 'الأربعاء': 3 },
      'KG1B': { 'الأحد': 1, 'الثلاثاء': 2, 'الخميس': 3 },
      'KG1C': { 'الأحد': 1, 'الثلاثاء': 2, 'الخميس': 3 },
      'KG1D': { 'الأحد': 1, 'الإثنين': 2, 'الأربعاء': 3 },
      'KG1E': { 'الأحد': 1, 'الثلاثاء': 2, 'الخميس': 3 },
    };
    return sessions[selectedClass][day];
  };

  const tomorrowPeriods = scheduledTomorrowPeriods.filter((period) => {
    const plan = weekPlans.find((item) => item.subjectId === period.subjectId);
    return Boolean(getDayPlanContent(plan, selectedTomorrowDay, period.subjectId)?.tomorrowNote || plan?.tomorrowNote);
  });

  // Homework: Weekly Plan is the source of truth; saved daily homework is only a fallback.
  const homeworkItems = useMemo(() => {
    const dictations = (materials || [])
      .filter((material) => (material.materialKind === 'dictation' || material.subjectId === 'dictation') && material.blockId === selectedBlock && material.weekId === selectedWeek)
      .map((material) => ({
        id: `material-dictation-${material.id}`,
        subjectId: material.subjectId,
        subjectName: getSubjectInfo(material.subjectId).nameEn,
        homeworkText: `Dictation: ${material.fileName}`,
        pageNumber: '',
        rawRecord: null
      }));
    const planned = weekPlans
      .filter((wp) => {
        const dayPlan = getDayPlanContent(wp, selectedFollowUpDay, wp.subjectId);
        if (wp.subjectId === 'ict' && getIctSession(selectedFollowUpDay) !== 3) return false;
        return hasActualHomework(dayPlan?.homeworkNote || wp.homeworkNote) || wp.dictationFileName;
      })
      .map((wp) => {
        const sub = getSubjectInfo(wp.subjectId);
        const dayPlan = getDayPlanContent(wp, selectedFollowUpDay, wp.subjectId);
        const ictSession = wp.subjectId === 'ict' ? getIctSession(selectedFollowUpDay) : undefined;
        const rawHomework = wp.subjectId === 'ict' && ictSession === 3 ? wp.homeworkNote : (dayPlan?.homeworkNote || wp.homeworkNote);
        const dayHomework = hasActualHomework(rawHomework) ? rawHomework : undefined;
        const parts = [
          (dayHomework || wp.homeworkNote)?.trim(),
          wp.dictationFileName ? `Dictation: ${wp.dictationFileName}` : undefined
        ].filter(Boolean);
        return {
          id: `weekly-homework-${wp.id}`,
          subjectId: wp.subjectId,
          subjectName: sub.nameEn,
          homeworkText: parts.join(' • '),
          pageNumber: extractPageNumber(parts.join(' ')),
          rawRecord: null
        };
      });
    if (dictations.length || planned.length) return [...dictations, ...planned];

    const legacyPlanned = weekPlans
      .filter((wp) => wp.homeworkNote && wp.homeworkNote.trim().length > 0)
      .map((wp) => {
        const sub = getSubjectInfo(wp.subjectId);
        return {
          id: `weekly-homework-${wp.id}`,
          subjectId: wp.subjectId,
          subjectName: sub.nameEn,
          homeworkText: wp.homeworkNote!,
          pageNumber: extractPageNumber(wp.homeworkNote),
          rawRecord: null
        };
      });
    if (legacyPlanned.length > 0) return legacyPlanned;

    if (currentRecord.homework?.length > 0) {
      return currentRecord.homework.filter((hw) => hw.assignment?.trim()).map((hw) => {
        const sub = getSubjectInfo(hw.subjectId);
        const pageNum = hw.pages ? extractPageNumber(hw.pages) : extractPageNumber(hw.assignment);
        return {
          id: hw.id,
          subjectId: hw.subjectId,
          subjectName: sub.nameEn,
          homeworkText: hw.assignment,
          pageNumber: pageNum || '25',
          rawRecord: hw
        };
      });
    }
  }, [currentRecord.homework, weekPlans, materials, selectedBlock, selectedWeek, selectedFollowUpDay, activeTimetable]);

  // Today's timetable schedule in the exact order of the selected class.
  const todayDaySchedule = useMemo(() => {
    return (
      activeTimetable?.days.find((d) => d.dayNameAr === selectedFollowUpDay) ||
      activeTimetable?.days[0]
    );
  }, [activeTimetable, selectedFollowUpDay]);

  const todayPeriodsList = todayDaySchedule?.periods || [];
  // Classwork comes only from explicit plan details or an admin entry. Never
  // infer it from the weekly-plan title, and never show it for activity sessions.
  const classworkItems = useMemo(() => {
    const seen = new Set<string>();
    return todayPeriodsList.filter((period) => {
      if (SESSION_SUBJECTS.has(period.subjectId)) return false;
      if (seen.has(period.subjectId)) return false;
      seen.add(period.subjectId);
      return true;
    }).map((period) => {
      const sub = getSubjectInfo(period.subjectId);
      const wp = weekPlans.find((p) => p.subjectId === period.subjectId);
      const ictSession = period.subjectId === 'ict' ? getIctSession(selectedFollowUpDay) : undefined;
      const dayPlan = period.subjectId === 'ict' && ictSession
        ? wp?.dayContent?.[`Session ${ictSession}`]
        : getDayPlanContent(wp, selectedFollowUpDay, period.subjectId);
      const existingCw = currentRecord.classwork?.find((c) => c.subjectId === period.subjectId);
      const lessonTopic = dayPlan?.classworkNote || wp?.classworkNote || existingCw?.lessonTitle || '';
      return {
        id: `${period.id}-${existingCw?.id || 'lesson'}`,
        periodNum: period.periodNum,
        subjectId: period.subjectId,
        subjectName: sub.nameEn,
        lessonTopic: lessonTopic || (period.subjectId === 'ict' ? `ICT Session ${ictSession || ''}` : ''),
        links: wp?.links || [],
        existingCw
      };
    });
  }, [todayPeriodsList, weekPlans, currentRecord.classwork, selectedFollowUpDay]);

  // Weekly Plan notes for Tomorrow: resources and assessment notes are both actionable.
  const weeklyPlanNotes = useMemo(() => {
    return weekPlans
      .filter((wp) => {
        const dayPlan = getDayPlanContent(wp, selectedTomorrowDay, wp.subjectId);
        return dayPlan?.tomorrowNote || wp.tomorrowNote;
      })
      .map((wp) => {
        const sub = getSubjectInfo(wp.subjectId);
        const dayPlan = getDayPlanContent(wp, selectedTomorrowDay, wp.subjectId);
        const dayNote = dayPlan?.tomorrowNote;
        return {
          id: wp.id,
          subjectId: wp.subjectId,
          subjectName: sub.nameEn,
          note: dayNote || wp.tomorrowNote || ''
        };
      });
  }, [weekPlans, selectedTomorrowDay]);

  const [packedPeriods, setPackedPeriods] = useState<Record<string, boolean>>(() => {
    try {
      const saved = localStorage.getItem(`nile_packed_periods_${selectedClass}`);
      return saved ? JSON.parse(saved) : {};
    } catch {
      return {};
    }
  });

  const togglePeriodPacked = (periodId: string) => {
    setPackedPeriods((prev) => {
      const updated = { ...prev, [periodId]: !prev[periodId] };
      try {
        localStorage.setItem(`nile_packed_periods_${selectedClass}`, JSON.stringify(updated));
      } catch {}
      return updated;
    });
  };

  const packAllTomorrowPeriods = () => {
    const updated: Record<string, boolean> = { ...packedPeriods };
    tomorrowPeriods.forEach((p) => {
      updated[p.id] = true;
    });
    setPackedPeriods(updated);
    try {
      localStorage.setItem(`nile_packed_periods_${selectedClass}`, JSON.stringify(updated));
    } catch {}
  };

  const resetTomorrowBag = () => {
    const updated: Record<string, boolean> = { ...packedPeriods };
    tomorrowPeriods.forEach((p) => {
      delete updated[p.id];
    });
    setPackedPeriods(updated);
    try {
      localStorage.setItem(`nile_packed_periods_${selectedClass}`, JSON.stringify(updated));
    } catch {}
  };

  const packedTomorrowCount = tomorrowPeriods.filter((p) => packedPeriods[p.id]).length;
  const bagReadyPercent = tomorrowPeriods.length > 0 ? Math.round((packedTomorrowCount / tomorrowPeriods.length) * 100) : 0;

  const [activeSection, setActiveSection] = useState<'all' | 'classwork' | 'homework' | 'preparations'>('all');
  const [followUpLayoutMode, setFollowUpLayoutMode] = useState<'columns' | 'table'>('columns');
  const [voiceLanguage, setVoiceLanguage] = useState<'ar-EG' | 'en-US'>('ar-EG');
  const [voiceField, setVoiceField] = useState<'classwork' | 'homework' | 'tomorrow' | null>(null);
  const [voiceSubject, setVoiceSubject] = useState(SUBJECTS[0].id);
  const [voiceClasswork, setVoiceClasswork] = useState('');
  const [voiceHomework, setVoiceHomework] = useState('');
  const [voiceTomorrow, setVoiceTomorrow] = useState('');
  const [activeCardVoice, setActiveCardVoice] = useState<string | null>(null);
  const voiceRecognitionRef = React.useRef<any>(null);
  const [assistantListening, setAssistantListening] = useState(false);
  const [assistantStatus, setAssistantStatus] = useState('اضغط تشغيل ثم تحدث بجملة طبيعية');
  const assistantRestartRef = React.useRef(false);

  const dayAliases: Record<string, string> = {
    'الأحد': 'الأحد', 'حد': 'الأحد', sunday: 'الأحد',
    'الإثنين': 'الإثنين', 'الاثنين': 'الإثنين', monday: 'الإثنين',
    'الثلاثاء': 'الثلاثاء', tuesday: 'الثلاثاء',
    'الأربعاء': 'الأربعاء', 'الاربعاء': 'الأربعاء', wednesday: 'الأربعاء',
    'الخميس': 'الخميس', thursday: 'الخميس'
  };
  const subjectAliases: Record<string, string> = {
    english: 'english', 'إنجليزي': 'english', 'انجليزي': 'english',
    arabic: 'arabic', 'عربي': 'arabic', 'العربية': 'arabic',
    math: 'math', 'ماث': 'math', 'رياضيات': 'math',
    science: 'science', 'ساينس': 'science', 'علوم': 'science',
    social: 'social', 'دراسات': 'social', french: 'french', 'فرنساوي': 'french',
    ict: 'ict', 'حاسب': 'ict', 'تكنولوجيا': 'ict'
  };

  const saveAssistantCommand = (spokenText: string) => {
    if (!onUpdateWeeklyPlans) return;
    const normalized = spokenText.trim().replace(/[،,؛;]/g, ' ');
    if (!normalized) return;
    const fieldPatterns: Array<{ field: 'classwork' | 'homework' | 'tomorrow'; pattern: RegExp }> = [
      { field: 'classwork', pattern: /class\s*work|classwork|كلاس\s*وورك|عمل\s*الفصل|شرح/i },
      { field: 'homework', pattern: /home\s*work|homework|هوم\s*وورك|واجب/i },
      { field: 'tomorrow', pattern: /tomorrow|تومورو|غد[ًاا]|بكرة|تحضير/i }
    ];
    const targets = fieldPatterns.filter(({ pattern }) => pattern.test(normalized));
    const activeTargets = targets.length ? targets : [{ field: 'classwork' as const, pattern: /$^/ }];
    const lowered = normalized.toLowerCase();
    const detectedDay = Object.keys(dayAliases).find((alias) => lowered.includes(alias.toLowerCase()));
    const detectedClass = normalized.match(/(?:class|فصل|كلاس)\s*(2\s*[abc])\b/i)?.[1]?.replace(/\s+/g, '').toUpperCase() as SchoolClass | undefined;
    const fallbackClass = normalized.match(/\b(2\s*[abc])\b/i)?.[1]?.replace(/\s+/g, '').toUpperCase() as SchoolClass | undefined;
    const detectedSubjectAlias = Object.keys(subjectAliases).sort((a, b) => b.length - a.length).find((alias) => lowered.includes(alias.toLowerCase()));
    const targetDay = detectedDay ? dayAliases[detectedDay] : selectedFollowUpDay;
    const targetClass = detectedClass || fallbackClass || selectedClass;
    const targetSubject = detectedSubjectAlias ? subjectAliases[detectedSubjectAlias] : voiceSubject;
    const routingWords = /^(please\s+)?(ضع|أضف|اضف|سجل|اكتب|add|put|set|update)\s+(في|الى|إلى|to|in|on)?\s*/i;
    const metadataWords = new RegExp(`\\b(?:${Object.keys(dayAliases).join('|')}|(?:class|فصل|كلاس)\\s*2\\s*[abc]|${Object.keys(subjectAliases).join('|')})\\b`, 'gi');
    let updatedPlans = [...(weeklyPlans || [])];
    activeTargets.forEach(({ field }, index) => {
      const marker = fieldPatterns.find((item) => item.field === field)!.pattern;
      const match = marker.exec(normalized);
      const afterMarker = match ? normalized.slice((match.index || 0) + match[0].length) : normalized;
      const nextMarkers = fieldPatterns.filter((item) => item.field !== field).map((item) => item.pattern.exec(afterMarker)?.index).filter((position): position is number => position !== undefined);
      const rawContent = afterMarker.slice(0, nextMarkers.length ? Math.min(...nextMarkers) : undefined);
      const content = rawContent.replace(routingWords, '').replace(metadataWords, '').replace(/\s+/g, ' ').trim().replace(/^(في|إلى|الى|for|to|on|of)\s+/i, '');
      if (!content) return;
      const dayKey = `${targetDay}|${targetSubject}`;
      const matchingIndex = updatedPlans.findIndex((item) => item.blockId === selectedBlock && item.weekId === selectedWeek && item.classId === targetClass && item.subjectId === targetSubject);
      const currentPlan = matchingIndex >= 0 ? updatedPlans[matchingIndex] : undefined;
      const nextContent = { ...(currentPlan?.dayContent || {}), [dayKey]: { ...(currentPlan?.dayContent?.[dayKey] || {}), ...(field === 'classwork' ? { classworkNote: content } : {}), ...(field === 'homework' ? { homeworkNote: content } : {}), ...(field === 'tomorrow' ? { tomorrowNote: content } : {}) } };
      const nextPlan: WeeklyPlanItem = currentPlan ? { ...currentPlan, dayContent: nextContent } : { id: `plan-${Date.now()}-${index}`, blockId: selectedBlock, weekId: selectedWeek, classId: targetClass, subjectId: targetSubject, unitOrTheme: `Voice entry - ${targetDay}`, learningObjectives: [], dayContent: nextContent };
      if (matchingIndex >= 0) updatedPlans[matchingIndex] = nextPlan;
      else updatedPlans.unshift(nextPlan);
    });
    onUpdateWeeklyPlans(updatedPlans);
    setAssistantStatus(`تم الفهم والحفظ: ${activeTargets.map((target) => target.field).join(' + ')} • ${targetDay} • Class ${targetClass}`);
  };

  const stopInlineVoice = () => {
    voiceRecognitionRef.current?.stop?.();
    voiceRecognitionRef.current = null;
    setVoiceField(null);
  };

  const stopVoiceAssistant = () => {
    assistantRestartRef.current = false;
    voiceRecognitionRef.current?.stop?.();
    voiceRecognitionRef.current = null;
    setAssistantListening(false);
    setAssistantStatus('تم إيقاف المساعد الصوتي');
  };

  const startVoiceAssistant = () => {
    const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (!SpeechRecognition) {
      alert('المساعد الصوتي يحتاج إلى Google Chrome أو Microsoft Edge.');
      return;
    }
    assistantRestartRef.current = true;
    const listen = () => {
      if (!assistantRestartRef.current) return;
      const recognition = new SpeechRecognition();
      recognition.lang = voiceLanguage;
      recognition.interimResults = false;
      recognition.continuous = false;
      recognition.onstart = () => { setAssistantListening(true); setAssistantStatus('أستمع... قل مثلًا: ضع في Homework يوم الثلاثاء لفصل KG1A مادة Math صفحة 20'); };
      recognition.onresult = (event: any) => {
        const text = event.results?.[0]?.[0]?.transcript || '';
        setAssistantStatus(`سمعت: ${text}`);
        saveAssistantCommand(text);
      };
      recognition.onerror = () => { if (assistantRestartRef.current) setAssistantStatus('لم ألتقط الكلام، حاول مرة أخرى...'); };
      recognition.onend = () => { voiceRecognitionRef.current = null; if (assistantRestartRef.current) window.setTimeout(listen, 250); else setAssistantListening(false); };
      voiceRecognitionRef.current = recognition;
      recognition.start();
    };
    listen();
  };

  const startInlineVoice = (field: 'classwork' | 'homework' | 'tomorrow') => {
    if (voiceField) return stopInlineVoice();
    const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (!SpeechRecognition) {
      alert('الإدخال الصوتي يحتاج إلى Google Chrome أو Microsoft Edge.');
      return;
    }
    const recognition = new SpeechRecognition();
    recognition.lang = voiceLanguage;
    recognition.interimResults = false;
    recognition.continuous = false;
    recognition.onresult = (event: any) => {
      const text = event.results?.[0]?.[0]?.transcript?.trim() || '';
      const append = (value: string) => `${value}${value ? ' ' : ''}${text}`;
      if (field === 'classwork') setVoiceClasswork(append);
      if (field === 'homework') setVoiceHomework(append);
      if (field === 'tomorrow') setVoiceTomorrow(append);
    };
    recognition.onerror = () => stopInlineVoice();
    recognition.onend = () => { voiceRecognitionRef.current = null; setVoiceField(null); };
    voiceRecognitionRef.current = recognition;
    setVoiceField(field);
    recognition.start();
  };

  const saveInlineVoiceEntry = () => {
    if (!onUpdateWeeklyPlans || (!voiceClasswork.trim() && !voiceHomework.trim() && !voiceTomorrow.trim())) return;
    const dayKey = `${selectedFollowUpDay}|${voiceSubject}`;
    const plan = (weeklyPlans || []).find((item) => item.blockId === selectedBlock && item.weekId === selectedWeek && item.classId === selectedClass && item.subjectId === voiceSubject);
    if (plan) {
      const dayContent = { ...(plan.dayContent || {}), [dayKey]: { classworkNote: voiceClasswork.trim() || undefined, homeworkNote: voiceHomework.trim() || undefined, tomorrowNote: voiceTomorrow.trim() || undefined } };
      onUpdateWeeklyPlans((weeklyPlans || []).map((item) => item.id === plan.id ? { ...item, dayContent } : item));
    } else {
      onUpdateWeeklyPlans([...(weeklyPlans || []), { id: `plan-${Date.now()}`, blockId: selectedBlock, weekId: selectedWeek, classId: selectedClass, subjectId: voiceSubject, unitOrTheme: `Daily entry - ${selectedFollowUpDay}`, learningObjectives: [], dayContent: { [dayKey]: { classworkNote: voiceClasswork.trim() || undefined, homeworkNote: voiceHomework.trim() || undefined, tomorrowNote: voiceTomorrow.trim() || undefined } } }]);
    }
    setVoiceClasswork(''); setVoiceHomework(''); setVoiceTomorrow('');
  };

  const updatePlanNote = (subjectId: string, field: 'classworkNote' | 'homeworkNote' | 'tomorrowNote', text: string, day = selectedFollowUpDay) => {
    if (!onUpdateWeeklyPlans) return;
    const dayKey = `${day}|${subjectId}`;
    const index = (weeklyPlans || []).findIndex((item) => item.blockId === selectedBlock && item.weekId === selectedWeek && item.classId === selectedClass && item.subjectId === subjectId);
    const current = index >= 0 ? (weeklyPlans || [])[index] : undefined;
    const nextDay = { ...(current?.dayContent?.[dayKey] || {}), [field]: text.trim() || undefined };
    const nextPlan: WeeklyPlanItem = current
      ? { ...current, dayContent: { ...(current.dayContent || {}), [dayKey]: nextDay } }
      : { id: `plan-${Date.now()}`, blockId: selectedBlock, weekId: selectedWeek, classId: selectedClass, subjectId, unitOrTheme: `Daily entry - ${day}`, learningObjectives: [], dayContent: { [dayKey]: nextDay } };
    const next = [...(weeklyPlans || [])];
    if (index >= 0) next[index] = nextPlan; else next.unshift(nextPlan);
    onUpdateWeeklyPlans(next);
  };

  const editCardNote = (subjectId: string, field: 'classworkNote' | 'homeworkNote' | 'tomorrowNote', currentText: string, day = selectedFollowUpDay) => {
    const text = window.prompt('اكتب النص المطلوب حفظه لهذه المادة:', currentText || '');
    if (text !== null) updatePlanNote(subjectId, field, text, day);
  };

  const deleteCardNote = (subjectId: string, field: 'classworkNote' | 'homeworkNote' | 'tomorrowNote', day = selectedFollowUpDay) => {
    if (window.confirm('هل تريد حذف النص الخاص بهذه المادة؟')) updatePlanNote(subjectId, field, '', day);
  };

  const startCardVoice = (subjectId: string, field: 'classworkNote' | 'homeworkNote' | 'tomorrowNote', day = selectedFollowUpDay) => {
    const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (!SpeechRecognition) return alert('الإدخال الصوتي يحتاج إلى Google Chrome أو Microsoft Edge.');
    const recognition = new SpeechRecognition();
    const targetKey = `${subjectId}-${field}-${day}`;
    setActiveCardVoice(targetKey);
    recognition.lang = voiceLanguage;
    recognition.interimResults = false;
    recognition.continuous = false;
    recognition.onresult = (event: any) => updatePlanNote(subjectId, field, event.results?.[0]?.[0]?.transcript || '', day);
    recognition.onend = () => setActiveCardVoice(null);
    recognition.onerror = () => setActiveCardVoice(null);
    recognition.start();
  };

  // Admin Modal States
  const [editingCw, setEditingCw] = useState<{ isOpen: boolean; item?: ClassworkRecord }>({ isOpen: false });
  const [editingHw, setEditingHw] = useState<{ isOpen: boolean; item?: HomeworkRecord }>({ isOpen: false });
  const [editingPrep, setEditingPrep] = useState<{ isOpen: boolean; item?: TomorrowPreparationItem }>({ isOpen: false });

  // Form states
  const [cwSubject, setCwSubject] = useState(SUBJECTS[0].id);
  const [cwTitle, setCwTitle] = useState('');
  const [cwDetails, setCwDetails] = useState('');
  const [cwPages, setCwPages] = useState('');

  const [hwSubject, setHwSubject] = useState(SUBJECTS[0].id);
  const [hwAssignment, setHwAssignment] = useState('');
  const [hwDueDate, setHwDueDate] = useState('غداً');
  const [hwPages, setHwPages] = useState('');
  const [hwInstructions, setHwInstructions] = useState('');

  const [prepSubject, setPrepSubject] = useState('');
  const [prepItem, setPrepItem] = useState('');
  const [prepCategory, setPrepCategory] = useState<'books' | 'tools' | 'clothes' | 'general'>('books');
  const [prepImportant, setPrepImportant] = useState(false);

  // Local packed checklist state for student/parent tonight
  const [packedItems, setPackedItems] = useState<Record<string, boolean>>({});

  const togglePacked = (id: string) => {
    setPackedItems((prev) => ({ ...prev, [id]: !prev[id] }));
  };

  if (!currentRecord) {
    return (
      <div className="bg-white rounded-2xl p-8 text-center border border-slate-200">
        <p className="text-slate-500">لا توجد بيانات متابعة مسجلة لهذا اليوم أو الفصل بعد.</p>
      </div>
    );
  }

  // Admin Handlers
  const handleSaveCw = (e: React.FormEvent) => {
    e.preventDefault();
    if (!cwTitle.trim()) return;

    const newRecord: ClassworkRecord = {
      id: editingCw.item?.id || `cw-${Date.now()}`,
      subjectId: cwSubject,
      lessonTitle: cwTitle.trim(),
      details: cwDetails.trim(),
      pages: cwPages.trim() || undefined
    };

    const updatedFollowUps = dailyFollowUps.map((record) => {
      if (record.id === currentRecord.id) {
        const existingList = record.classwork || [];
        const index = existingList.findIndex((x) => x.id === newRecord.id);
        let updatedList: ClassworkRecord[];
        if (index >= 0) {
          updatedList = [...existingList];
          updatedList[index] = newRecord;
        } else {
          updatedList = [...existingList, newRecord];
        }
        return { ...record, classwork: updatedList };
      }
      return record;
    });

    onUpdateDailyFollowUps(updatedFollowUps);
    setEditingCw({ isOpen: false });
    setCwTitle('');
    setCwDetails('');
    setCwPages('');
  };

  const handleDeleteCw = (id: string) => {
    if (!window.confirm('هل أنت متأكد من حذف هذا الدرس؟')) return;
    const updatedFollowUps = dailyFollowUps.map((record) => {
      if (record.id === currentRecord.id) {
        return { ...record, classwork: (record.classwork || []).filter((x) => x.id !== id) };
      }
      return record;
    });
    onUpdateDailyFollowUps(updatedFollowUps);
  };

  const handleSaveHw = (e: React.FormEvent) => {
    e.preventDefault();
    if (!hwAssignment.trim()) return;

    const newRecord: HomeworkRecord = {
      id: editingHw.item?.id || `hw-${Date.now()}`,
      subjectId: hwSubject,
      assignment: hwAssignment.trim(),
      dueDate: hwDueDate.trim() || 'غداً',
      pages: hwPages.trim() || undefined,
      instructions: hwInstructions.trim() || undefined
    };

    const updatedFollowUps = dailyFollowUps.map((record) => {
      if (record.id === currentRecord.id) {
        const existingList = record.homework || [];
        const index = existingList.findIndex((x) => x.id === newRecord.id);
        let updatedList: HomeworkRecord[];
        if (index >= 0) {
          updatedList = [...existingList];
          updatedList[index] = newRecord;
        } else {
          updatedList = [...existingList, newRecord];
        }
        return { ...record, homework: updatedList };
      }
      return record;
    });

    onUpdateDailyFollowUps(updatedFollowUps);
    setEditingHw({ isOpen: false });
    setHwAssignment('');
    setHwDueDate('غداً');
    setHwPages('');
    setHwInstructions('');
  };

  const handleDeleteHw = (id: string) => {
    if (!window.confirm('هل أنت متأكد من حذف هذا الواجب؟')) return;
    const updatedFollowUps = dailyFollowUps.map((record) => {
      if (record.id === currentRecord.id) {
        return { ...record, homework: (record.homework || []).filter((x) => x.id !== id) };
      }
      return record;
    });
    onUpdateDailyFollowUps(updatedFollowUps);
  };

  const handleSavePrep = (e: React.FormEvent) => {
    e.preventDefault();
    if (!prepItem.trim()) return;

    const newRecord: TomorrowPreparationItem = {
      id: editingPrep.item?.id || `prep-${Date.now()}`,
      subjectId: prepSubject || undefined,
      item: prepItem.trim(),
      category: prepCategory,
      isImportant: prepImportant
    };

    const updatedFollowUps = dailyFollowUps.map((record) => {
      if (record.id === currentRecord.id) {
        const existingList = record.tomorrowPreparations || [];
        const index = existingList.findIndex((x) => x.id === newRecord.id);
        let updatedList: TomorrowPreparationItem[];
        if (index >= 0) {
          updatedList = [...existingList];
          updatedList[index] = newRecord;
        } else {
          updatedList = [...existingList, newRecord];
        }
        return { ...record, tomorrowPreparations: updatedList };
      }
      return record;
    });

    onUpdateDailyFollowUps(updatedFollowUps);
    setEditingPrep({ isOpen: false });
    setPrepItem('');
    setPrepSubject('');
    setPrepCategory('books');
    setPrepImportant(false);
  };

  const handleDeletePrep = (id: string) => {
    if (!window.confirm('هل أنت متأكد من حذف هذا العنصر؟')) return;
    const updatedFollowUps = dailyFollowUps.map((record) => {
      if (record.id === currentRecord.id) {
        return { ...record, tomorrowPreparations: (record.tomorrowPreparations || []).filter((x) => x.id !== id) };
      }
      return record;
    });
    onUpdateDailyFollowUps(updatedFollowUps);
  };

  // Metrics
  const cwCount = classworkItems.length;
  const hwCount = homeworkItems.length;
  const prepCount = tomorrowPeriods.length;

  // Calculate completed homework for the student
  const completedHwCount = homeworkItems.filter((h) => completedHwMap[h.id]).length;

  return (
    <div className="space-y-6">
      <div className="sticky top-[205px] md:top-[178px] z-30 bg-white rounded-2xl border border-slate-200 p-3 flex items-center gap-2 overflow-x-auto shadow-md">
        <span className="text-xs font-black text-slate-500 shrink-0">Day:</span>
        {(['الأحد', 'الإثنين', 'الثلاثاء', 'الأربعاء', 'الخميس'] as const).map((day, index) => (
          <button
            key={day}
            type="button"
            onClick={() => { setSelectedFollowUpDay(day); setSelectedTomorrowDay(NEXT_DAY_MAP[day]); }}
            className={`px-4 py-2 rounded-xl text-xs font-black shrink-0 border transition-colors ${selectedFollowUpDay === day ? 'bg-sky-600 text-white border-sky-700' : 'bg-slate-50 text-slate-700 border-slate-200 hover:bg-sky-50'}`}
          >
            {['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday'][index]}
          </button>
        ))}
      </div>

      {/* View Mode 1: 3 Separate Distinct Boxes in a Responsive Grid */}
      {followUpLayoutMode === 'columns' ? (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 items-start">
          
          {/* ================= BOX 1: Homework ================= */}
          <div className="bg-white rounded-3xl border-2 border-rose-200/90 shadow-xs flex flex-col overflow-hidden">
            <div className="bg-rose-50/80 p-4 border-b border-rose-100 flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-xl bg-rose-100 text-rose-700 flex items-center justify-center font-bold">
                  <CheckSquare className="w-4 h-4" />
                </div>
                <h3 className="font-black text-sm text-rose-950 flex items-center gap-1.5">
                  <span>Homework</span>
                  <span className="text-xs font-bold text-rose-600 bg-rose-100/80 px-2 py-0.5 rounded-full">
                    {hwCount}
                  </span>
                </h3>
              </div>

              {currentRole === 'admin' && (
                <button
                  id="admin-add-hw-btn"
                  type="button"
                  onClick={() => {
                    setEditingHw({ isOpen: true });
                    setHwSubject(SUBJECTS[0].id);
                    setHwAssignment('');
                    setHwDueDate('غداً');
                    setHwPages('');
                    setHwInstructions('');
                  }}
                  className="flex items-center gap-1 bg-white hover:bg-rose-100 text-rose-800 font-bold px-2.5 py-1 rounded-lg text-xs shadow-2xs transition-colors border border-rose-200 cursor-pointer"
                >
                  <Plus className="w-3.5 h-3.5" />
                  <span>Add Homework</span>
                </button>
              )}
            </div>

            {/* Homework Items List */}
            <div className="p-4 space-y-3 flex-1 bg-rose-50/10 min-h-[220px]">
              {homeworkItems.length === 0 ? (
                <div className="bg-white rounded-2xl p-6 text-center text-xs text-slate-400 border border-slate-100">
                  No homework assignments recorded today.
                </div>
              ) : (
                homeworkItems.map((item) => {
                  const isDone = !!completedHwMap[item.id];
                  return (
                    <div
                      key={item.id}
                      className={`bg-white rounded-2xl p-3.5 border transition-all shadow-2xs ${
                        isDone
                          ? 'border-emerald-300 bg-emerald-50/20'
                          : 'border-slate-200/80 hover:border-rose-300'
                      }`}
                    >
                      <div className="flex items-center justify-between gap-2">
                        {/* الصيغة المطلوبة: [اسم المادة] - Homework Page: [رقم الصفحة] بدون تفاصيل إضافية */}
                        <div className="flex items-center gap-2 min-w-0">
                          <SubjectBadge subjectId={item.subjectId} size="sm" />
                          <div
                            className={`text-xs font-black tracking-tight ${
                              isDone ? 'line-through text-slate-400' : 'text-slate-900'
                            }`}
                          >
                            <span>{item.subjectName}</span>
                            <span className="text-slate-400 mx-1.5">-</span>
                            <span className="text-rose-700 bg-rose-50 px-2 py-0.5 rounded-md border border-rose-200 font-bold">
                              {item.homeworkText || 'لم يُضاف واجب بعد'}
                            </span>
                          </div>
                        </div>

                        {/* Student Checkbox or Admin Actions */}
                        <div className="flex items-center gap-1.5 shrink-0">
                          {currentRole === 'student' && (
                            <button
                              type="button"
                              onClick={() => onToggleHwCompletion(item.id)}
                              className={`flex items-center gap-1 text-[11px] font-bold px-2.5 py-1 rounded-lg transition-colors cursor-pointer ${
                                isDone
                                  ? 'bg-emerald-600 text-white'
                                  : 'bg-slate-100 text-slate-700 hover:bg-emerald-100 hover:text-emerald-800'
                              }`}
                            >
                              {isDone ? <CheckCircle2 className="w-3.5 h-3.5" /> : <Circle className="w-3.5 h-3.5" />}
                              <span>{isDone ? 'Done ✓' : 'Mark'}</span>
                            </button>
                          )}

                          {currentRole === 'admin' && item.rawRecord && (
                            <div className="flex items-center gap-1">
                              <button
                                type="button"
                                onClick={() => {
                                  setEditingHw({ isOpen: true, item: item.rawRecord! });
                                  setHwSubject(item.rawRecord!.subjectId);
                                  setHwAssignment(item.rawRecord!.assignment);
                                  setHwDueDate(item.rawRecord!.dueDate || 'غداً');
                                  setHwPages(item.rawRecord!.pages || item.pageNumber);
                                  setHwInstructions(item.rawRecord!.instructions || '');
                                }}
                                className="p-1 text-slate-400 hover:text-slate-700 hover:bg-slate-100 rounded cursor-pointer"
                                title="Edit Homework"
                              >
                                <Edit2 className="w-3 h-3" />
                              </button>
                              <button
                                type="button"
                                onClick={() => handleDeleteHw(item.id)}
                                className="p-1 text-slate-400 hover:text-red-700 hover:bg-red-50 rounded cursor-pointer"
                                title="Delete Homework"
                              >
                                <Trash2 className="w-3 h-3" />
                              </button>
                            </div>
                          )}
                          {currentRole === 'admin' && !item.rawRecord && (
                            <div className="flex items-center gap-1">
                              <button type="button" onClick={() => editCardNote(item.subjectId, 'homeworkNote', item.homeworkText)} className="p-1 text-slate-400 hover:text-rose-700 hover:bg-rose-50 rounded" title="كتابة Homework"><Edit2 className="w-3 h-3" /></button>
                              <button type="button" onClick={() => startCardVoice(item.subjectId, 'homeworkNote')} className={`p-1 rounded ${activeCardVoice === `${item.subjectId}-homeworkNote-${selectedFollowUpDay}` ? 'text-red-600 bg-red-50 animate-pulse' : 'text-slate-400 hover:text-rose-700 hover:bg-rose-50'}`} title="إضافة Homework بالصوت">{activeCardVoice === `${item.subjectId}-homeworkNote-${selectedFollowUpDay}` ? <MicOff className="w-3 h-3" /> : <Mic className="w-3 h-3" />}</button>
                              <button type="button" onClick={() => deleteCardNote(item.subjectId, 'homeworkNote')} className="p-1 text-slate-400 hover:text-red-700 hover:bg-red-50 rounded" title="حذف Homework"><Trash2 className="w-3 h-3" /></button>
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          </div>

          {/* ================= BOX 2: Classwork ================= */}
          <div className="bg-white rounded-3xl border-2 border-sky-200/90 shadow-xs flex flex-col overflow-hidden">
            <div className="bg-sky-50/80 p-4 border-b border-sky-100 flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-xl bg-sky-100 text-sky-700 flex items-center justify-center font-bold">
                  <BookOpen className="w-4 h-4" />
                </div>
                <h3 className="font-black text-sm text-sky-950 flex items-center gap-1.5">
                  <span>Classwork</span>
                  <span className="text-xs font-bold text-sky-600 bg-sky-100/80 px-2 py-0.5 rounded-full">
                    {cwCount}
                  </span>
                </h3>
              </div>

              {currentRole === 'admin' && (
                <button
                  id="admin-add-cw-btn"
                  type="button"
                  onClick={() => {
                    setEditingCw({ isOpen: true });
                    setCwSubject(SUBJECTS[0].id);
                    setCwTitle('');
                    setCwDetails('');
                    setCwPages('');
                  }}
                  className="flex items-center gap-1 bg-white hover:bg-sky-100 text-sky-800 font-bold px-2.5 py-1 rounded-lg text-xs shadow-2xs transition-colors border border-sky-200 cursor-pointer"
                >
                  <Plus className="w-3.5 h-3.5" />
                  <span>Add Classwork</span>
                </button>
              )}
            </div>

            {/* Classwork Items List */}
            <div className="p-4 space-y-3 flex-1 bg-sky-50/10 min-h-[220px]">
              {classworkItems.length === 0 ? (
                <div className="bg-white rounded-2xl p-6 text-center text-xs text-slate-400 border border-slate-100">
                  No periods scheduled for today.
                </div>
              ) : (
                classworkItems.map((cw) => (
                  <div
                    key={cw.id}
                    className="bg-white rounded-2xl p-3.5 border border-slate-200/80 shadow-2xs hover:border-sky-300 transition-all group"
                  >
                    <div className="flex items-center justify-between mb-1.5">
                      <div className="flex items-center gap-2">
                        <span className="bg-sky-100 text-sky-900 border border-sky-200 rounded-lg px-2 py-1 text-[11px] font-black">
                          الحصة {cw.periodNum}
                        </span>
                              <div>
                          <div className="flex items-center gap-1.5">
                            <div className="text-xs font-black text-slate-900">{cw.subjectName}</div>
                            {cw.links.map((url: string, linkIndex: number) => (
                              <a key={`${url}-${linkIndex}`} href={url} target="_blank" rel="noreferrer" title="Open Weekly Plan link" className="inline-flex items-center justify-center w-5 h-5 rounded-md bg-sky-100 text-sky-700 hover:bg-sky-600 hover:text-white transition-colors">
                                <LinkIcon className="w-3 h-3" />
                              </a>
                            ))}
                          </div>
                          <div className="text-[10px] text-slate-500">{cw.time}</div>
                        </div>
                      </div>
                      {currentRole === 'admin' && (
                        <div className="flex items-center gap-1 opacity-80 group-hover:opacity-100 transition-opacity">
                          <button type="button" onClick={() => editCardNote(cw.subjectId, 'classworkNote', cw.lessonTopic)} className="p-1 text-slate-500 hover:text-sky-700 hover:bg-sky-50 rounded-md" title="كتابة Classwork"><Edit2 className="w-3.5 h-3.5" /></button>
                          <button type="button" onClick={() => startCardVoice(cw.subjectId, 'classworkNote')} className={`p-1 rounded-md ${activeCardVoice === `${cw.subjectId}-classworkNote-${selectedFollowUpDay}` ? 'text-red-600 bg-red-50 animate-pulse' : 'text-slate-500 hover:text-sky-700 hover:bg-sky-50'}`} title="إضافة Classwork بالصوت">{activeCardVoice === `${cw.subjectId}-classworkNote-${selectedFollowUpDay}` ? <MicOff className="w-3.5 h-3.5" /> : <Mic className="w-3.5 h-3.5" />}</button>
                          <button type="button" onClick={() => deleteCardNote(cw.subjectId, 'classworkNote')} className="p-1 text-slate-500 hover:text-red-700 hover:bg-red-50 rounded-md" title="حذف Classwork"><Trash2 className="w-3.5 h-3.5" /></button>
                          {cw.existingCw && <>
                          <button
                            type="button"
                            onClick={() => {
                              setEditingCw({ isOpen: true, item: cw.existingCw });
                              setCwSubject(cw.existingCw.subjectId);
                              setCwTitle(cw.existingCw.lessonTitle);
                              setCwDetails(cw.existingCw.details);
                              setCwPages(cw.existingCw.pages || '');
                            }}
                            className="p-1 text-slate-500 hover:text-sky-700 hover:bg-sky-50 rounded-md cursor-pointer"
                            title="Edit"
                          >
                            <Edit2 className="w-3.5 h-3.5" />
                          </button>
                          <button
                            type="button"
                            onClick={() => handleDeleteCw(cw.existingCw.id)}
                            className="p-1 text-slate-500 hover:text-red-700 hover:bg-red-50 rounded-md cursor-pointer"
                            title="Delete"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                          </>}
                        </div>
                      )}
                    </div>

                    <div className="text-xs font-bold text-slate-800 space-y-1.5">
                      <span className="text-slate-900 leading-snug">{cw.lessonTopic || 'لم يُضاف Classwork بعد'}</span>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>

          {/* ================= BOX 3: Tomorrow (المربع الكبير بإطار خارجي أخضر هادئ يحوي كل تجهيزات الغد) ================= */}
          <div className="bg-emerald-50/25 rounded-3xl border-2 border-emerald-400 shadow-sm flex flex-col overflow-hidden">
            {/* Header with Tomorrow English Title and Day Selector */}
            <div className="bg-emerald-100/70 p-4 border-b border-emerald-200 flex flex-wrap items-center justify-between gap-2">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-xl bg-emerald-600 text-white flex items-center justify-center font-bold shadow-2xs">
                  <Package className="w-4 h-4" />
                </div>
                <h3 className="font-black text-sm text-emerald-950 flex items-center gap-1.5">
                  <span>Tomorrow</span>
                  <span className="text-xs font-bold text-emerald-800 bg-white/80 px-2 py-0.5 rounded-full border border-emerald-300">
                    {tomorrowPeriods.length}
                  </span>
                </h3>
              </div>

              {/* Day Selector for Tomorrow */}
              <div className="flex items-center gap-1 bg-white/80 p-1 rounded-xl border border-emerald-200">
                {(['الأحد', 'الإثنين', 'الثلاثاء', 'الأربعاء', 'الخميس'] as const).map((day, index) => (
                  <button
                    key={day}
                    type="button"
                    onClick={() => setSelectedTomorrowDay(day)}
                    className={`px-2 py-0.5 text-[11px] font-bold rounded-lg transition-colors cursor-pointer ${
                      selectedTomorrowDay === day
                        ? 'bg-emerald-600 text-white shadow-2xs'
                        : 'text-emerald-800 hover:bg-emerald-100'
                    }`}
                  >
                    {['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday'][index]}
                  </button>
                ))}
              </div>
            </div>

            {/* Everything for Tomorrow is inside this calm green frame */}
            <div className="p-4 space-y-4 flex-1 flex flex-col justify-between">
              <div className="space-y-3">
                {/* Bag Progress & Quick Actions */}
                <div className="bg-white/90 rounded-2xl p-3 border border-emerald-200 flex items-center justify-between gap-2 flex-wrap text-xs shadow-2xs">
                  <div className="font-bold text-emerald-950 flex items-center gap-1.5">
                    <span>🎒</span>
                    <span>School Bag ({packedTomorrowCount}/{tomorrowPeriods.length})</span>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <button
                      type="button"
                      onClick={packAllTomorrowPeriods}
                      className="flex items-center gap-1 px-2.5 py-1 bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-[11px] rounded-lg transition-colors cursor-pointer shadow-2xs"
                    >
                      <Check className="w-3 h-3" />
                      <span>Pack All ✓</span>
                    </button>
                    <button
                      type="button"
                      onClick={resetTomorrowBag}
                      className="flex items-center gap-1 px-2.5 py-1 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-[11px] rounded-lg transition-colors cursor-pointer"
                    >
                      <RotateCcw className="w-3 h-3" />
                      <span>Reset</span>
                    </button>
                  </div>
                </div>

                {/* Tomorrow Periods Matrix */}
                <div className="space-y-2">
                  {tomorrowPeriods.length === 0 ? (
                    <div className="bg-white rounded-2xl p-6 text-center text-xs text-slate-400 border border-emerald-100">
                      No periods scheduled for this day.
                    </div>
                  ) : (
                    tomorrowPeriods.map((period) => {
                      const isPeriodPacked = !!packedPeriods[period.id];
                      const tomorrowPlan = weekPlans.find((plan) => plan.subjectId === period.subjectId);
                      const tomorrowDayContent = getDayPlanContent(tomorrowPlan, selectedTomorrowDay, period.subjectId);
                      return (
                        <div
                          key={period.id}
                          className={`bg-white rounded-2xl p-2.5 sm:p-3 border transition-all shadow-2xs flex items-center justify-between gap-3 ${
                            isPeriodPacked
                              ? 'border-emerald-400 bg-emerald-50/40'
                              : 'border-emerald-200/70 hover:border-emerald-400'
                          }`}
                        >
                          <div className="flex items-center gap-2.5 min-w-0">
                            <div
                              className={`w-7 h-7 rounded-lg flex items-center justify-center font-black text-xs shrink-0 ${
                                isPeriodPacked ? 'bg-emerald-600 text-white' : 'bg-emerald-100 text-emerald-800'
                              }`}
                            >
                              {period.periodNum}
                            </div>
                          <div className="min-w-0">
                              <div className="flex items-center gap-1.5 flex-wrap">
                                <SubjectBadge subjectId={period.subjectId} size="sm" />
                              </div>
                              {tomorrowDayContent?.tomorrowNote && (
                                <div className="text-[10px] text-slate-600 mt-1 leading-relaxed">{tomorrowDayContent.tomorrowNote}</div>
                              )}
                            </div>
                            {currentRole === 'admin' && <div className="flex items-center gap-1 mt-1">
                              <button type="button" onClick={() => editCardNote(period.subjectId, 'tomorrowNote', tomorrowDayContent?.tomorrowNote || '', selectedTomorrowDay)} className="p-1 text-slate-400 hover:text-emerald-700 hover:bg-emerald-50 rounded" title="كتابة Tomorrow"><Edit2 className="w-3 h-3" /></button>
                              <button type="button" onClick={() => startCardVoice(period.subjectId, 'tomorrowNote', selectedTomorrowDay)} className={`p-1 rounded ${activeCardVoice === `${period.subjectId}-tomorrowNote-${selectedTomorrowDay}` ? 'text-red-600 bg-red-50 animate-pulse' : 'text-slate-400 hover:text-emerald-700 hover:bg-emerald-50'}`} title="إضافة Tomorrow بالصوت">{activeCardVoice === `${period.subjectId}-tomorrowNote-${selectedTomorrowDay}` ? <MicOff className="w-3 h-3" /> : <Mic className="w-3 h-3" />}</button>
                              <button type="button" onClick={() => deleteCardNote(period.subjectId, 'tomorrowNote', selectedTomorrowDay)} className="p-1 text-slate-400 hover:text-red-700 hover:bg-red-50 rounded" title="حذف Tomorrow"><Trash2 className="w-3 h-3" /></button>
                            </div>}
                          </div>

                          <button
                            type="button"
                            onClick={() => togglePeriodPacked(period.id)}
                            className={`flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-[11px] font-bold transition-all shrink-0 cursor-pointer ${
                              isPeriodPacked
                                ? 'bg-emerald-600 text-white shadow-2xs'
                                : 'bg-white hover:bg-emerald-50 text-emerald-800 border border-emerald-200'
                            }`}
                          >
                            {isPeriodPacked ? (
                              <CheckCircle2 className="w-3.5 h-3.5 text-emerald-200" />
                            ) : (
                              <Circle className="w-3.5 h-3.5 text-slate-400" />
                            )}
                            <span>{isPeriodPacked ? 'Packed ✓' : 'Pack'}</span>
                          </button>
                        </div>
                      );
                    })
                  )}
                </div>
              </div>

              {/* Additional tomorrow preparation notes */}
              {weeklyPlanNotes.length > 0 && (
                <div className="mt-4 pt-3 border-t border-emerald-200/80 bg-white/90 border border-emerald-200 rounded-2xl p-3 space-y-2 shadow-2xs">
                  <div className="flex items-center gap-1.5 text-xs font-black text-emerald-950">
                    <AlertCircle className="w-4 h-4 text-emerald-700 shrink-0" />
                    <span>Tomorrow&apos;s Preparation:</span>
                  </div>
                  <div className="space-y-1.5">
                    {weeklyPlanNotes.map((noteItem) => (
                      <div
                        key={noteItem.id}
                        className="bg-emerald-50/60 rounded-xl p-2 border border-emerald-200/70 text-[11px] text-slate-800 flex items-start gap-2"
                      >
                        <SubjectBadge subjectId={noteItem.subjectId} size="xs" />
                        <p className="leading-relaxed font-medium flex-1">
                          {noteItem.note}
                        </p>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      ) : (
    /* ================= VIEW MODE 2: EXACT OFFICIAL SHEET TABLE FORMAT ================= */
    <div className="p-4 sm:p-6 bg-white overflow-x-auto rounded-3xl border-2 border-slate-200 shadow-xs">
      <div className="text-center mb-4 pb-3 border-b border-slate-200">
        <h4 className="font-black text-slate-900 text-base">
          مدارس النيل المصرية الدولية - فرع المنيا (Nile Egyptian Schools)
        </h4>
        <p className="text-xs text-slate-600 font-semibold mt-1">
          سجل المتابعة اليومية الرسمي للصف الثاني الابتدائي • فصل {selectedClass}
        </p>
      </div>

      <table className="w-full border-collapse border-2 border-slate-300 text-right text-xs">
        <thead>
          <tr className="bg-slate-800 text-white font-black text-center">
            <th className="border-2 border-slate-400 p-2.5 w-36">المادة الدراسية</th>
            <th className="border-2 border-slate-400 p-2.5">ما تم تدريسه داخل الفصل (Classwork)</th>
            <th className="border-2 border-slate-400 p-2.5">الواجبات المنزلية المطلوبة (Homework)</th>
            <th className="border-2 border-slate-400 p-2.5 w-72">تجهيزات ومستلزمات الغد (الكتب والكشاكيل)</th>
          </tr>
        </thead>
        <tbody>
          {Array.from(
            new Set([
              ...currentRecord.classwork.map((c) => c.subjectId),
              ...currentRecord.homework.map((h) => h.subjectId)
            ])
          ).map((subId, idx) => {
            const cw = currentRecord.classwork.find((c) => c.subjectId === subId);
            const hw = currentRecord.homework.find((h) => h.subjectId === subId);
            const kit = SUBJECT_PACKING_KIT[subId] || {
              book: 'كتاب المادة',
              notebook: 'كشكول الحصة',
              tools: 'الأدوات المقررة'
            };
            const isDone = hw ? completedHwMap[hw.id] : false;

            return (
              <tr
                key={subId}
                className={`hover:bg-slate-50 transition-colors ${idx % 2 === 0 ? 'bg-white' : 'bg-slate-50/50'}`}
              >
                {/* Subject Column */}
                <td className="border-2 border-slate-300 p-3 align-top font-bold">
                  <SubjectBadge subjectId={subId} size="md" />
                </td>

                {/* Classwork Column */}
                <td className="border-2 border-slate-300 p-3 align-top">
                  {cw ? (
                    <div className="space-y-1">
                      <p className="font-bold text-slate-900">{cw.lessonTitle}</p>
                      <p className="text-slate-600 leading-relaxed text-[11px]">{cw.details}</p>
                      {cw.pages && (
                        <span className="inline-block bg-sky-50 text-sky-800 text-[10px] font-bold px-2 py-0.5 rounded-md border border-sky-200 mt-1">
                          {cw.pages}
                        </span>
                      )}
                    </div>
                  ) : (
                    <span className="text-slate-400 italic text-[11px]">- لا يوجد رصد للحصة -</span>
                  )}
                </td>

                {/* Homework Column */}
                <td className="border-2 border-slate-300 p-3 align-top">
                  {hw ? (
                    <div className="space-y-1">
                      <div className="flex items-center justify-between gap-1 flex-wrap mb-1">
                        <p className={`font-bold text-slate-900 ${isDone ? 'line-through text-slate-400' : ''}`}>
                          {hw.assignment}
                        </p>
                        {hw.dueDate && (
                          <span className="bg-amber-100 text-amber-900 text-[10px] font-bold px-2 py-0.5 rounded-md">
                            تسليم: {hw.dueDate}
                          </span>
                        )}
                      </div>

                        {hw.pages && (
                          <p className="text-[10px] text-slate-600 font-semibold">{hw.pages}</p>
                        )}

                      {currentRole === 'student' && (
                        <button
                          type="button"
                          onClick={() => onToggleHwCompletion(hw.id)}
                          className={`mt-2 flex items-center gap-1.5 text-[11px] font-bold px-2.5 py-1 rounded-lg transition-colors ${
                            isDone
                              ? 'bg-emerald-600 text-white'
                              : 'bg-slate-100 text-slate-700 hover:bg-emerald-50'
                          }`}
                        >
                          {isDone ? <CheckCircle2 className="w-3.5 h-3.5" /> : <Circle className="w-3.5 h-3.5" />}
                          <span>{isDone ? 'تم الحل بنجاح ✓' : 'تأشير إتمام الواجب'}</span>
                        </button>
                      )}
                    </div>
                  ) : (
                    <span className="text-slate-400 italic text-[11px]">- لا يوجد واجب منزلي -</span>
                  )}
                </td>

                {/* Tomorrow Kit Column */}
                <td className="border-2 border-slate-300 p-3 align-top">
                  <div className="space-y-1 text-[11px]">
                    <div className="flex items-center gap-1.5 text-slate-700">
                      <span className="font-bold text-slate-900">📚 الكتاب:</span>
                      <span>{kit.book}</span>
                    </div>
                    <div className="flex items-center gap-1.5 text-slate-700">
                      <span className="font-bold text-slate-900">📓 الكشكول:</span>
                      <span>{kit.notebook}</span>
                    </div>
                    <div className="flex items-center gap-1.5 text-slate-700">
                      <span className="font-bold text-slate-900">✏️ الأدوات:</span>
                      <span>{kit.tools}</span>
                    </div>
                  </div>
                </td>
              </tr>
            );
          })}
        </tbody>
        <tfoot>
          <tr className="bg-slate-100 font-bold text-slate-700 text-center border-t-2 border-slate-300">
            <td colSpan={4} className="p-3 text-xs">
              <div className="flex flex-wrap items-center justify-around gap-4">
                <div>توقيع المعلم المختص: ..............................</div>
                <div>توقيع ولي الأمر: ..............................</div>
                <div>اعتماد إدارة مدرسة النيل بالمنيا: [ختم رسمي متاح]</div>
              </div>
            </td>
          </tr>
        </tfoot>
      </table>
    </div>
  )}

      {/* ================= ADMIN MODALS ================= */}

      {/* Classwork Modal */}
      {editingCw.isOpen && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-2xl max-w-lg w-full p-6 shadow-xl border border-slate-200">
            <h3 className="text-base font-black text-slate-900 mb-4">
              {editingCw.item ? 'تعديل Classwork' : 'إضافة Classwork'}
            </h3>
            <form onSubmit={handleSaveCw} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">المادة الدراسية:</label>
                <select
                  value={cwSubject}
                  onChange={(e) => setCwSubject(e.target.value)}
                  className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 text-sm focus:outline-hidden focus:ring-2 focus:ring-sky-500"
                >
                  {SUBJECTS.map((s) => (
                    <option key={s.id} value={s.id}>
                      {s.nameEn} ({s.nameAr})
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">عنوان الدرس / الموضوع:</label>
                <input
                  type="text"
                  placeholder="مثال: الجمع بإعادة التسمية أو Phonics: Long a"
                  value={cwTitle}
                  onChange={(e) => setCwTitle(e.target.value)}
                  className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 text-sm focus:outline-hidden focus:ring-2 focus:ring-sky-500"
                  required
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">تفاصيل ما تم شرحه وحله داخل الفصل:</label>
                <textarea
                  placeholder="اكتب شرحاً مختصراً لما تم تنفيذه في الحصة مع الطلاب..."
                  value={cwDetails}
                  onChange={(e) => setCwDetails(e.target.value)}
                  rows={3}
                  className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 text-sm focus:outline-hidden focus:ring-2 focus:ring-sky-500"
                ></textarea>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">الصفحات بالكتاب أو الكشكول (اختياري):</label>
                <input
                  type="text"
                  placeholder="مثال: كتاب التلميذ ص 36 و 37"
                  value={cwPages}
                  onChange={(e) => setCwPages(e.target.value)}
                  className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 text-sm focus:outline-hidden focus:ring-2 focus:ring-sky-500"
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setEditingCw({ isOpen: false })}
                  className="px-4 py-2 text-sm text-slate-600 hover:bg-slate-100 rounded-xl"
                >
                  إلغاء
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 text-sm bg-sky-600 hover:bg-sky-700 text-white font-bold rounded-xl shadow-xs"
                >
                  حفظ في المتابعة
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Homework Modal */}
      {editingHw.isOpen && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-2xl max-w-lg w-full p-6 shadow-xl border border-slate-200">
            <h3 className="text-base font-black text-slate-900 mb-4">
              {editingHw.item ? 'تعديل Homework' : 'إضافة Homework'}
            </h3>
            <form onSubmit={handleSaveHw} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">المادة الدراسية:</label>
                <select
                  value={hwSubject}
                  onChange={(e) => setHwSubject(e.target.value)}
                  className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 text-sm focus:outline-hidden focus:ring-2 focus:ring-amber-500"
                >
                  {SUBJECTS.map((s) => (
                    <option key={s.id} value={s.id}>
                      {s.nameEn} ({s.nameAr})
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">المطلوب في الواجب:</label>
                <textarea
                  placeholder="مثال: حل التدريبات 1 إلى 5 في كراسة الأنشطة صفحة 38..."
                  value={hwAssignment}
                  onChange={(e) => setHwAssignment(e.target.value)}
                  rows={3}
                  className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 text-sm focus:outline-hidden focus:ring-2 focus:ring-amber-500"
                  required
                ></textarea>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">موعد التسليم:</label>
                  <input
                    type="text"
                    placeholder="مثال: غداً الخميس أو الأحد القادم"
                    value={hwDueDate}
                    onChange={(e) => setHwDueDate(e.target.value)}
                    className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 text-sm focus:outline-hidden focus:ring-2 focus:ring-amber-500"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">الصفحات / المرجع:</label>
                  <input
                    type="text"
                    placeholder="مثال: ص 38 بالكتاب"
                    value={hwPages}
                    onChange={(e) => setHwPages(e.target.value)}
                    className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 text-sm focus:outline-hidden focus:ring-2 focus:ring-amber-500"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">ملاحظات وإرشادات للحل (اختياري):</label>
                <input
                  type="text"
                  placeholder="مثال: الرجاء كتابة خطوات الحل بخط واضح"
                  value={hwInstructions}
                  onChange={(e) => setHwInstructions(e.target.value)}
                  className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 text-sm focus:outline-hidden focus:ring-2 focus:ring-amber-500"
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setEditingHw({ isOpen: false })}
                  className="px-4 py-2 text-sm text-slate-600 hover:bg-slate-100 rounded-xl"
                >
                  إلغاء
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 text-sm bg-amber-600 hover:bg-amber-700 text-white font-bold rounded-xl shadow-xs"
                >
                  حفظ الواجب
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Tomorrow Preparation Modal */}
      {editingPrep.isOpen && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-2xl max-w-lg w-full p-6 shadow-xl border border-slate-200">
            <h3 className="text-base font-black text-slate-900 mb-4">
              {editingPrep.item ? 'تعديل تجهيزات الغد' : 'إضافة مستلزمات وتجهيزات للغد'}
            </h3>
            <form onSubmit={handleSavePrep} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">المادة المرتبطة (اختياري):</label>
                <select
                  value={prepSubject}
                  onChange={(e) => setPrepSubject(e.target.value)}
                  className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 text-sm focus:outline-hidden focus:ring-2 focus:ring-emerald-500"
                >
                  <option value="">بدون مادة محددة (عام / كل المواد)</option>
                  {SUBJECTS.map((s) => (
                    <option key={s.id} value={s.id}>
                      {s.nameEn} ({s.nameAr})
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">المطلوب تجهيزه أو إحضاره:</label>
                <textarea
                  placeholder="مثال: إحضار كشكول الساينس ومسطرة، أو ارتداء الزي الرياضي لحصة الـ PE..."
                  value={prepItem}
                  onChange={(e) => setPrepItem(e.target.value)}
                  rows={3}
                  className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 text-sm focus:outline-hidden focus:ring-2 focus:ring-emerald-500"
                  required
                ></textarea>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">تصنيف المستلزم:</label>
                  <select
                    value={prepCategory}
                    onChange={(e) => setPrepCategory(e.target.value as any)}
                    className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 text-sm focus:outline-hidden focus:ring-2 focus:ring-emerald-500"
                  >
                    <option value="books">كتب وكشاكيل</option>
                    <option value="tools">أدوات ومقلمة ورسم</option>
                    <option value="clothes">زي مدرسي / رياضي</option>
                    <option value="general">عام / تعليمات إضافية</option>
                  </select>
                </div>

                <div className="flex items-center pt-6">
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={prepImportant}
                      onChange={(e) => setPrepImportant(e.target.checked)}
                      className="w-4 h-4 rounded text-emerald-600 focus:ring-emerald-500"
                    />
                    <span className="text-xs font-bold text-red-700">تنبيه هام ومستعجل</span>
                  </label>
                </div>
              </div>

              <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setEditingPrep({ isOpen: false })}
                  className="px-4 py-2 text-sm text-slate-600 hover:bg-slate-100 rounded-xl"
                >
                  إلغاء
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 text-sm bg-emerald-600 hover:bg-emerald-700 text-white font-bold rounded-xl shadow-xs"
                >
                  حفظ التجهيز
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

    </div>
  );
};
