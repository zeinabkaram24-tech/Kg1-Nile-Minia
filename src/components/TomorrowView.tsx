import React, { useState, useEffect, useMemo } from 'react';
import { Sparkles, BookOpen, ExternalLink, Pencil, Trash, Plus, AlertTriangle } from 'lucide-react';
import { ClassId, SchoolDay, PeriodSlot, TomorrowSpecialNote, HomeworkEntry, ClassworkEntry } from '../types';
import {
  CLASS_TIMETABLES,
  NEXT_SCHOOL_DAY,
  SUBJECT_METADATA,
  hasClassTimetable,
} from '../data/timetables';
import { SPECIAL_TEACHER_NOTES } from '../data/defaultWeeklyPlan';
import { WEEK2_SPECIAL_NOTES } from '../data/week2Plan';
import { SubjectIcon } from './SubjectIcon';
import { getTomorrowNotesForDay, subscribeToTomorrowNotes, getDeletedTomorrowNoteIds, getDeletedTomorrowNoteIdsSync, saveDeletedTomorrowNoteId } from '../utils/tomorrowNotesStorage';
import { AttachmentPdfCard } from './AttachmentPdfCard';

interface TomorrowViewProps {
  currentClass: ClassId;
  selectedDay: SchoolDay;
  currentBlock?: number;
  currentWeek?: number;
  homeworkList?: HomeworkEntry[];
  classworkList?: ClassworkEntry[];
  isAdminEditMode?: boolean;
  onAddTomorrowNote?: (prefilled?: Partial<TomorrowSpecialNote>) => void;
  onEditTomorrowNote?: (entry: TomorrowSpecialNote) => void;
  onDeleteTomorrowNote?: (id: string) => void;
}

const ARABIC_DAY_NAMES: Record<SchoolDay, string> = {
  Saturday: 'السبت',
  Sunday: 'الأحد',
  Monday: 'الإثنين',
  Tuesday: 'الثلاثاء',
  Wednesday: 'الأربعاء',
  Thursday: 'الخميس',
};

export const TomorrowView: React.FC<TomorrowViewProps> = ({
  currentClass,
  selectedDay,
  currentBlock = 1,
  currentWeek = 2,
  homeworkList = [],
  classworkList = [],
  isAdminEditMode = false,
  onAddTomorrowNote,
  onEditTomorrowNote,
  onDeleteTomorrowNote,
}) => {
  // Tomorrow's target day based on the active selected day
  const tomorrowDay: SchoolDay = NEXT_SCHOOL_DAY[selectedDay] || 'Sunday';

  // Tomorrow's timetable periods (the 8 periods)
  const targetPeriods: PeriodSlot[] = CLASS_TIMETABLES?.[currentClass]?.[tomorrowDay] || [];

  // Helper to determine whether an item is a Quiz or Test
  const isQuizOrTest = (n: TomorrowSpecialNote) => {
    if (!n) return false;
    if (n.subject === 'Social Studies') return false;
    const text = ((n.note || '') + ' ' + (n.arabicNote || '')).toLowerCase();
    
    // Explicitly exclude any homework, homework submissions, tools, or materials tasks
    if (
      text.includes('واجب') ||
      text.includes('هوم ورك') ||
      text.includes('هومورك') ||
      text.includes('تسليم') ||
      text.includes('submission') ||
      text.includes('homework') ||
      text.includes('tools') ||
      text.includes('أدوات') ||
      text.includes('حقيبة') ||
      text.includes('كشكول') ||
      text.includes('bag') ||
      text.includes('sheet') ||
      text.includes('شيت')
    ) {
      return false;
    }

    if (n.isQuiz || n.categoryType === 'quiz') return true;
    return /quiz|test|اختبار|امتحان|كويز|إملاء|dictation|تسميع|تقييم/.test(text);
  };

  // User mandate: strictly remove any fabricated math supplies notes (whiteboard, 100 chart, markers, etc.)
  const isFabricatedMathNote = (n: TomorrowSpecialNote) => {
    if (!n) return false;
    const text = ((n.note || '') + ' ' + (n.arabicNote || '') + ' ' + (n.bagItem || '')).toLowerCase();
    return (
      text.includes('white board') ||
      text.includes('whiteboard') ||
      text.includes('سبورة بيضاء') ||
      text.includes('100 chart') ||
      text.includes('مخطط المائة') ||
      text.includes('مخطط الـ 100') ||
      (text.includes('كشكول الماث') && !n.isQuiz)
    );
  };

  // Notes from weekly plan for tomorrow (only teacher instructions / tools / bag items / quizzes, strictly excluding plain homework)
  const isDisallowedTomorrowItem = (n: TomorrowSpecialNote) => {
    if (!n) return true;
    if (tomorrowDay === 'Saturday') return true;
    // User or admin manually added notes or special tn- notes must always be displayed
    if (n.isCustom || (n.id && (n.id.includes('manual') || n.id.includes('tomorrow-') || n.id.includes('note-') || n.id.includes('tn-') || n.id.includes('custom')))) {
      return false;
    }
    if (isFabricatedMathNote(n)) return true;

    // Filter out community notes / "مجتمع الصف الثاني"
    const lowerText = ((n.note || '') + ' ' + (n.arabicNote || '') + ' ' + (n.bagItem || '')).toLowerCase();
    if (
      lowerText.includes('مجتمع الصف الثاني') ||
      lowerText.includes('مجتمع الصف الدراسي') ||
      lowerText.includes('مجتمع')
    ) {
      return true;
    }

    // These rules ONLY apply when we are in Week 3 for Grade 2
    if (currentWeek === 3 && (currentClass.startsWith('G2') || (n.classId && n.classId.startsWith('G2')))) {
      // Strict Mathematics/Math rule: Completely disallow Maths notes/alerts/submissions on any day
      if (n.subject === 'Mathematics' || n.subject === 'Math') {
        return true;
      }

      // Strict English rule: ONLY allow dictation ("dictation" or "إملاء" or "ديكتيشن") on Monday (Sunday looked ahead), completely block all other English notes/alerts/submissions on any day
      if (n.subject === 'English') {
        const fullText = ((n.note || '') + ' ' + (n.arabicNote || '')).toLowerCase();
        const isDictation = fullText.includes('dictation') || fullText.includes('إملاء') || fullText.includes('ديكتيشن');
        if ((tomorrowDay === 'Monday' || tomorrowDay === 'Sunday') && isDictation) {
          // Allowed!
        } else if (isDictation) {
          // Allowed!
        } else {
          return true; // Disallowed
        }
      }

      // Strict Arabic rule: ONLY allow dictation ("إملاء") notes for Arabic, disallow any other Arabic notes
      if (n.subject === 'Arabic') {
        const fullText = ((n.note || '') + ' ' + (n.arabicNote || '')).toLowerCase();
        const isDictation = fullText.includes('إملاء') || fullText.includes('dictation') || fullText.includes('تسميع');
        if (!isDictation) {
          return true;
        }
      }

      // Explicit user rule: Delete / disallow Science booklet submission for G2C on Monday
      if (
        (currentClass === 'G2C' || n.classId === 'G2C') &&
        (tomorrowDay === 'Monday' || n.targetDay === 'Monday') &&
        n.subject === 'Science' &&
        ((n.note || '').includes('بوكلت') || (n.arabicNote || '').includes('بوكلت') || (n.id || '').includes('hw-submit'))
      ) {
        return true;
      }

      // Strict user rule for Sunday (Saturday-Tomorrow view):
      // Allow quizzes, tests, French, Social Studies, or notes with materials
      if (tomorrowDay === 'Sunday') {
        const isQuiz = isQuizOrTest(n);
        const fullText = ((n.note || '') + ' ' + (n.arabicNote || '')).toLowerCase();
        const isFrench = n.subject === 'French';
        const isSocialStudiesSubmission =
          n.subject === 'Social Studies' &&
          (currentClass === 'G2A' || currentClass === 'G2C') &&
          (fullText.includes('تسليم') || fullText.includes('submission') || fullText.includes('واجب'));
        const hasBagItem = !!n.bagItem;

        if (!isQuiz && !isFrench && !isSocialStudiesSubmission && !hasBagItem) {
          return true; // Disallowed
        }
      }
    }

    if (isQuizOrTest(n) || n.bagItem) return false;
    const lower = ((n.note || '') + ' ' + (n.arabicNote || '')).toLowerCase().trim();
    if (lower.includes('تسليم') || lower.includes('submission') || lower.includes('استلام') || lower.includes('شيت') || lower.includes('sheet')) return false;
    return lower.startsWith('hw:') || lower.startsWith('homework:') || lower.startsWith('واجب:');
  };

  // Support both currentWeek and previous week if applicable
  const effectiveWeek = tomorrowDay === 'Sunday' && currentWeek > 1 ? currentWeek - 1 : currentWeek;

  // Synchronous initialization for deleted note IDs to prevent initial frame flickering
  const [deletedNoteIds, setDeletedNoteIds] = useState<string[]>(() => getDeletedTomorrowNoteIdsSync());

  const getSemanticKey = (n: TomorrowSpecialNote): string => {
    const normSubject = (n.subject || '').trim().toLowerCase();
    const text = (n.arabicNote || n.note || '').toLowerCase().replace(/[🚨📝🎒]/g, '').trim();

    // 1. Social studies homework submission
    if (normSubject.includes('social') || normSubject.includes('دراسات')) {
      if (text.includes('واجب') || text.includes('تسليم') || text.includes('شيت')) {
        return `social-hw-submission-${n.targetDay}`;
      }
    }

    // 2. Science booklet submission or tools
    if (normSubject.includes('science') || normSubject.includes('علوم') || normSubject.includes('ساينس')) {
      if (text.includes('بوكلت') || text.includes('بوكليت') || text.includes('تسليم') || text.includes('تجميع') || n.id?.includes('hw-submit')) {
        return `science-booklet-submission-${n.targetDay}`;
      }
      if (text.includes('أدوات') || text.includes('tools') || text.includes('خيط') || text.includes('كروشيه')) {
        return `science-tools-${n.targetDay}`;
      }
    }

    // 3. French Quiz
    if (normSubject.includes('french') || normSubject.includes('فرنش') || normSubject.includes('فرنسي')) {
      if (text.includes('quiz') || text.includes('كويز') || text.includes('اختبار')) {
        return `french-quiz-${n.targetDay}`;
      }
    }

    // 4. Arabic specific tasks
    if (normSubject.includes('arabic') || normSubject.includes('عربي')) {
      if (text.includes('إملاء') || text.includes('dictation')) {
        return `arabic-dictation-${n.targetDay}`;
      }
      if (text.includes('تسميع') || text.includes('آيات') || text.includes('recitation')) {
        return `arabic-recitation-${n.targetDay}`;
      }
      if (text.includes('مهنة أبي') || text.includes('نص استماع')) {
        return `arabic-listening-${n.targetDay}`;
      }
      if (text.includes('المكتبة') || text.includes('مكتبة')) {
        return `arabic-library-${n.targetDay}`;
      }
    }

    // 5. Mathematics tests
    if (normSubject.includes('math') || normSubject.includes('رياضيات')) {
      if (text.includes('test') || text.includes('اختبار') || text.includes('unit 1')) {
        return `math-test-${n.targetDay}`;
      }
    }

    // Default: group by subject and normalized first words
    const cleanWordSeq = text.replace(/[^a-z0-9\u0600-\u06FF]/gi, ' ').split(/\s+/).filter(Boolean).slice(0, 4).join('-');
    return `${normSubject}-${cleanWordSeq || n.id || 'note'}-${n.targetDay}`;
  };

  const handleDeleteTomorrowNote = (noteOrId: TomorrowSpecialNote | string) => {
    const note = typeof noteOrId === 'object' ? noteOrId : tomorrowNotes.find((n) => n.id === noteOrId);
    const noteId = typeof noteOrId === 'string' ? noteOrId : noteOrId?.id;
    const semKey = note ? getSemanticKey(note) : '';
    const idsToDelete = [noteId, ...(note?.linkedIds || []), semKey].filter(Boolean) as string[];

    setDeletedNoteIds((prev) => Array.from(new Set([...prev, ...idsToDelete])));
    setTomorrowNotes((prev) =>
      prev.filter((n) => {
        if (noteId && n.id === noteId) return false;
        if (note?.linkedIds && n.id && note.linkedIds.includes(n.id)) return false;
        if (semKey && getSemanticKey(n) === semKey) return false;
        return true;
      })
    );

    idsToDelete.forEach((id) => {
      saveDeletedTomorrowNoteId(id).catch(() => {});
      onDeleteTomorrowNote?.(id);
    });
  };

  const [tomorrowNotes, setTomorrowNotes] = useState<TomorrowSpecialNote[]>(() => {
    const base =
      currentBlock === 1 && (currentWeek === 2 || effectiveWeek === 2)
        ? WEEK2_SPECIAL_NOTES.filter(
            (n) => (n.classId === currentClass || (n.classId as any) === 'ALL') && n.targetDay === tomorrowDay
          )
        : currentBlock === 1 && (currentWeek === 1 || effectiveWeek === 1)
        ? SPECIAL_TEACHER_NOTES.filter(
            (n) =>
              (n.classId === currentClass || (n.classId as any) === 'ALL') &&
              n.targetDay === tomorrowDay &&
              (n.week === 1 || !n.week)
          )
        : [];

    return base.filter((n) => !isDisallowedTomorrowItem(n));
  });

  useEffect(() => {
    let isMounted = true;
    const loadNotes = async () => {
      try {
        const [deletedIds, notes] = await Promise.all([
          getDeletedTomorrowNoteIds(),
          getTomorrowNotesForDay(
            currentBlock,
            currentWeek,
            currentClass,
            tomorrowDay
          )
        ]);
        if (isMounted) {
          setDeletedNoteIds((prev) => Array.from(new Set([...prev, ...deletedIds])));
          setTomorrowNotes(notes.filter((n) => !isDisallowedTomorrowItem(n)));
        }
      } catch (err) {
        console.warn('Error loading tomorrow notes:', err);
      }
    };

    loadNotes();
    const unsubscribe = subscribeToTomorrowNotes(loadNotes);
    return () => {
      isMounted = false;
      unsubscribe();
    };
  }, [currentBlock, currentWeek, currentClass, tomorrowDay]);

  const getNoteDisplayArabic = (n: TomorrowSpecialNote) => {
    if (!n) return '';
    const fullText = ((n.note || '') + ' ' + (n.arabicNote || '')).toLowerCase();
    const isEnglish = n.subject === 'English' || fullText.includes('english');
    const isDictation = fullText.includes('dictation') || fullText.includes('ديكتيشن') || fullText.includes('إملاء');
    if (isEnglish && isDictation) {
      return 'ديكتيشن';
    }
    // Always respect user-edited or custom note text directly, cleaning out any appended English text
    let display = (n.arabicNote && n.arabicNote.trim()) ? n.arabicNote.trim() : (n.note && n.note.trim()) ? n.note.trim() : '';
    display = display.replace(/Required Materials:.*$/i, '').replace(/Required:.*$/i, '').replace(/\(Tools:.*$/i, '').trim();
    return display;
  };

  const getNoteDisplayBagItem = (n: TomorrowSpecialNote) => {
    if (!n) return '';
    const fullText = ((n.note || '') + ' ' + (n.arabicNote || '')).toLowerCase();
    if (fullText.includes('dictation') || fullText.includes('ديكتيشن') || fullText.includes('إملاء')) {
      return '';
    }
    let item = n.bagItem || '';
    if (item.includes('Colored sheets') || item.includes('colored sheets') || item.includes('chrochet') || item.includes('crochet')) {
      if (item.includes('بوكليت') || item.includes('Booklet') || item.includes('Workbook') || item.includes('كتاب')) {
        return 'بوكليت الساينس، أدوات الساينس المطلوبة (ورق ملون بألوان مختلفة، صمغ، ألوان خشبية، وخيط كروشيه)';
      }
      return 'ورق ملون بألوان مختلفة، صمغ، ألوان خشبية، وخيط كروشيه';
    }
    if (item.includes('Workbook') || item.includes('Booklet')) {
      return item.replace(/Science Workbook \/ Booklet/gi, 'كتاب أو بوكليت الساينس')
                 .replace(/Booklet/gi, 'بوكليت')
                 .replace(/Workbook/gi, 'كتاب التمارين');
    }
    return item;
  };

  const getNoteBadgeInfo = (note: TomorrowSpecialNote) => {
    if (!note) {
      return {
        label: 'ملاحظات',
        badgeClass: 'bg-blue-100 text-blue-950 font-black',
        cardClass: 'bg-slate-50 border border-slate-200 shadow-2xs',
        subjectName: '',
        isAlert: false,
      };
    }
    const quiz = isQuizOrTest(note);
    const fullText = ((note.note || '') + ' ' + (note.arabicNote || '')).toLowerCase();
    const isDictation = fullText.includes('إملاء') || fullText.includes('dictation') || fullText.includes('ديكتيشن') || fullText.includes('تسميع');
    const isArabic = note.subject === 'Arabic' || fullText.includes('عربي') || fullText.includes('عربية');
    const isEnglish = note.subject === 'English' || fullText.includes('english');

    // Is it a homework submission task?
    const isSubmission =
      fullText.includes('تسليم') ||
      fullText.includes('submission') ||
      fullText.includes('استلام') ||
      fullText.includes('واجب') ||
      fullText.includes('homework') ||
      fullText.includes('hw:');

    // Arabic translation helper for subject names
    const getArabicSubjectName = (subj: string) => {
      const s = subj.toLowerCase();
      if (s.includes('science') || s.includes('ساينس') || s.includes('علوم')) return 'الساينس (Science)';
      if (s.includes('social') || s.includes('دراسات')) return 'الدراسات الاجتماعية';
      if (s.includes('math') || s.includes('رياضيات')) return 'الماث (Math)';
      if (s.includes('french') || s.includes('فرنش')) return 'اللغة الفرنسية';
      if (s.includes('arabic') || s.includes('عربي')) return 'اللغة العربية';
      if (s.includes('religion') || s.includes('دين')) return 'التربية الدينية';
      if (s.includes('ict') || s.includes('تكنولوجيا')) return 'ICT';
      if (s.includes('art') || s.includes('رسم')) return 'التربية الفنية';
      if (s.includes('music') || s.includes('موسيقى')) return 'الموسيقى';
      return subj;
    };

    const arabName = getArabicSubjectName(note.subject);

    if (isSubmission) {
      return {
        label: 'تسليم هوم ورك 📋',
        badgeClass: 'bg-indigo-600 text-white font-black shadow-2xs px-2 sm:px-2.5 py-0.5 sm:py-1 rounded-lg text-[10px] sm:text-[11px]',
        cardClass: 'bg-indigo-50/70 border-2 border-indigo-300 text-indigo-950 font-bold shadow-2xs',
        subjectName: arabName,
        isAlert: false,
      };
    }

    if (quiz) {
      // User directive: Arabic dictation is strictly 'إملاء' (NO 'Dictation'), English dictation is 'Dictation' / 'ديكتيشن'
      let label = '🚨 اختبار';
      if (isDictation) {
        label = isArabic ? '✍️ إملاء كشكول الطالب' : isEnglish ? '🚨 ديكتيشن' : '✍️ إملاء كشكول الطالب';
      } else if (note.subject === 'French') {
        label = '🇫🇷 كويز فرنسي';
      } else if (note.subject === 'Mathematics' || note.subject === 'Math') {
        label = '📐 اختبار رياضيات';
      } else if (fullText.includes('quiz') || fullText.includes('كويز')) {
        label = '🚨 كويز';
      }

      return {
        label,
        badgeClass: 'bg-rose-600 text-white font-black shadow-xs',
        cardClass: 'bg-rose-50 border-2 border-rose-500 text-rose-950 font-bold shadow-xs',
        subjectName: isEnglish ? 'English' : arabName,
        isAlert: true,
      };
    }

    if (note.subject === 'French') {
      return {
        label: 'Remarque',
        badgeClass: 'bg-purple-100 text-purple-950 font-black',
        cardClass: 'bg-purple-50/50 border border-purple-200/80 shadow-2xs',
        subjectName: 'French',
        isAlert: false,
      };
    }
    if (note.subject === 'Social Studies') {
      return {
        label: 'ملاحظات',
        badgeClass: 'bg-amber-100 text-amber-950 font-black border border-amber-300',
        cardClass: 'bg-amber-50/80 border-2 border-amber-300/90 shadow-2xs text-amber-950',
        subjectName: 'الدراسات الاجتماعية',
        isAlert: false,
      };
    }
    if (note.subject === 'Arabic') {
      return {
        label: 'ملاحظات',
        badgeClass: 'bg-emerald-100 text-emerald-950 font-black',
        cardClass: 'bg-emerald-50/40 border border-emerald-200/80 shadow-2xs',
        subjectName: 'اللغة العربية',
        isAlert: false,
      };
    }
    return {
      label: 'ملاحظات',
      badgeClass: 'bg-blue-100 text-blue-950 font-black',
      cardClass: 'bg-slate-50 border border-slate-200 shadow-2xs',
      subjectName: arabName,
      isAlert: false,
    };
  };

  // Automatically link and synchronize tests/quizzes/dictations and homework submissions from homework and classwork
  const linkedAlerts = useMemo<TomorrowSpecialNote[]>(() => {
    const alerts: TomorrowSpecialNote[] = [];
    const checkText = (txt: string) => {
      return /quiz|test|اختبار|امتحان|كويز|إملاء|dictation|تسميع|تقييم/.test((txt || '').toLowerCase());
    };

    // 1. Linked from Homework:
    homeworkList.forEach((h) => {
      if (h.classId !== currentClass && (h.classId as any) !== 'ALL') return;
      if (h.week && h.week !== currentWeek) return;

      const fullText = `${h.task} ${h.details || ''} ${h.subject}`;
      const isForTomorrow = h.dueDay === tomorrowDay || h.assignedDay === tomorrowDay;
      const hwAlertId = `linked-hw-${h.id}`;
      const hwDueAlertId = `linked-hw-due-${h.id}`;
      if (deletedNoteIds.includes(hwAlertId) || deletedNoteIds.includes(hwDueAlertId)) return;

      // A) Tests, quizzes, dictations
      if (isForTomorrow && checkText(fullText)) {
        alerts.push({
          id: hwAlertId,
          classId: currentClass,
          targetDay: tomorrowDay,
          subject: h.subject,
          note: h.task,
          arabicNote: h.details ? `${h.task} (${h.details})` : h.task,
          bagItem: h.pages || undefined,
          isQuiz: true,
          categoryType: 'quiz',
          block: currentBlock,
          week: currentWeek,
          pdfUrl: h.pdfUrl,
        });
      }
      // B) Due for submission tomorrow (e.g. Social Studies homework sheet due on Sunday for 2A & 2C)
      else if (h.dueDay === tomorrowDay) {
        const isSocial = h.subject === 'Social Studies';
        const isScience = h.subject === 'Science';
        alerts.push({
          id: hwDueAlertId,
          classId: currentClass,
          targetDay: tomorrowDay,
          subject: h.subject,
          note: isSocial
            ? 'تسليم واجب الدراسات الاجتماعية (أول حصة في الأسبوع)'
            : isScience
            ? 'تسليم بوكلت الـ science'
            : `تسليم واجب ${h.subject}: ${h.task}`,
          arabicNote: isSocial
            ? 'تذكير: تجهيز وتسليم واجب الدراسات الاجتماعية (شيت الواجب المنزلي) في أول حصة في الأسبوع'
            : isScience
            ? 'تسليم بوكلت الـ science'
            : (h.details ? `تذكير: تسليم الواجب غداً (${h.details})` : `تذكير: تسليم واجب ${h.subject} غداً`),
          bagItem: isSocial ? 'شيت واجب الدراسات الاجتماعية المرفق' : isScience ? 'بوكليت الـ science' : (h.pages || undefined),
          isQuiz: false,
          categoryType: 'note',
          block: currentBlock,
          week: currentWeek,
          pdfUrl: h.pdfUrl,
        });
      }
    });

    // 2. Linked from Classwork:
    // If any classwork on tomorrowDay mentions a test/quiz/dictation
    classworkList.forEach((cw) => {
      if (cw.classId !== currentClass && (cw.classId as any) !== 'ALL') return;
      if (cw.day !== tomorrowDay) return;
      if (cw.week && cw.week !== currentWeek) return;
      const cwAlertId = `linked-cw-${cw.id}`;
      if (deletedNoteIds.includes(cwAlertId)) return;

      const fullText = `${cw.title} ${cw.details || ''} ${cw.subject}`;
      if (checkText(fullText)) {
        alerts.push({
          id: cwAlertId,
          classId: currentClass,
          targetDay: tomorrowDay,
          subject: cw.subject,
          note: cw.title,
          arabicNote: cw.details ? `${cw.title} (${cw.details})` : cw.title,
          bagItem: cw.pages || undefined,
          isQuiz: true,
          categoryType: 'quiz',
          block: currentBlock,
          week: currentWeek,
        });
      }
    });

    return alerts;
  }, [homeworkList, classworkList, currentClass, tomorrowDay, currentWeek, currentBlock]);

  // Merge tomorrowNotes with linkedAlerts without duplicates
  const mergedNotes = useMemo<TomorrowSpecialNote[]>(() => {
    if (tomorrowDay === 'Saturday') {
      return [];
    }

    const map = new Map<string, TomorrowSpecialNote>();
    let hasArabicDictation = false;

    const addOrMergeNote = (n: TomorrowSpecialNote, isHighPriority: boolean = false) => {
      if (isDisallowedTomorrowItem(n)) return;
      const semKey = getSemanticKey(n);

      // Check if this note, its IDs, or its semantic key is deleted
      const noteIds = [n.id, ...(n.linkedIds || [])].filter(Boolean) as string[];
      if (noteIds.some((id) => deletedNoteIds.includes(id)) || deletedNoteIds.includes(semKey)) {
        return;
      }

      const isArabic = n.subject === 'Arabic';
      const text = ((n.note || '') + ' ' + (n.arabicNote || '')).toLowerCase();
      const isDictation = text.includes('إملاء') || text.includes('dictation') || text.includes('تسميع');
      if (isArabic && isDictation) {
        if (hasArabicDictation && !map.has(semKey)) return; // Strict rule: dictation is ONE task per day
        hasArabicDictation = true;
      }

      if (map.has(semKey)) {
        const existing = map.get(semKey)!;
        // Merge them cleanly without duplicating:
        const merged: TomorrowSpecialNote = {
          ...existing,
          ...(isHighPriority ? n : {}),
          id: (isHighPriority && n.id) ? n.id : existing.id || n.id,
          pdfUrl: existing.pdfUrl || n.pdfUrl,
          bagItem: existing.bagItem || n.bagItem,
          linkUrl: existing.linkUrl || n.linkUrl,
          linkTitle: existing.linkTitle || n.linkTitle,
          arabicNote: isHighPriority && n.arabicNote ? n.arabicNote : (existing.arabicNote || n.arabicNote),
          note: isHighPriority && n.note ? n.note : (existing.note || n.note),
          linkedIds: Array.from(new Set([...(existing.linkedIds || []), ...(n.linkedIds || []), existing.id, n.id].filter(Boolean) as string[])),
        };
        map.set(semKey, merged);
      } else {
        map.set(semKey, {
          ...n,
          linkedIds: n.id ? [n.id] : [],
        });
      }
    };

    // Process linked alerts first
    linkedAlerts.forEach((la) => {
      addOrMergeNote(la, false);
    });

    // Custom or stored notes take precedence and enrich
    tomorrowNotes.forEach((n) => {
      addOrMergeNote(n, true);
    });

    return Array.from(map.values()).filter((n) => !isDisallowedTomorrowItem(n));
  }, [tomorrowNotes, linkedAlerts, deletedNoteIds, tomorrowDay, currentClass, currentBlock, currentWeek]);

  // Prioritize quizzes and tests to appear first in the notes list
  const sortedNotes = useMemo(() => {
    return [...mergedNotes].sort((a, b) => {
      const aQuiz = isQuizOrTest(a) ? 1 : 0;
      const bQuiz = isQuizOrTest(b) ? 1 : 0;
      return bQuiz - aQuiz;
    });
  }, [mergedNotes]);

  if (!hasClassTimetable(currentClass) && !isAdminEditMode) {
    return (
      <div className="bg-white rounded-2xl border border-slate-200 p-8 sm:p-12 text-center shadow-xs space-y-3">
        <div className="w-14 h-14 rounded-2xl bg-amber-50 text-amber-500 flex items-center justify-center mx-auto mb-2 border border-amber-100">
          <Sparkles className="w-7 h-7" />
        </div>
        <h3 className="text-base sm:text-lg font-black text-slate-800">
          لم يتم إدخال جدول الحصص لفصل {currentClass} بعد
        </h3>
        <p className="text-xs sm:text-sm text-slate-500 max-w-md mx-auto leading-relaxed">
          هذا الفصل فارغ حالياً ولم يتم رفع أو اعتماد جدول الحصص الخاص به. سيتم تفعيل تحضيرات وتنبيهات الغد تلقائياً بمجرد إدخال الجدول.
        </p>
      </div>
    );
  }

  if (tomorrowDay === 'Saturday') {
    return (
      <div className="bg-white rounded-3xl border border-slate-200 p-8 shadow-2xs text-center space-y-3">
        <div className="w-16 h-16 rounded-full bg-emerald-50 text-emerald-600 flex items-center justify-center mx-auto border border-emerald-100">
          <Sparkles className="w-8 h-8" />
        </div>
        <h3 className="text-lg font-black text-slate-800">عطلة نهاية الأسبوع السعيدة 🎉</h3>
        <p className="text-sm text-slate-500 font-bold max-w-md mx-auto leading-relaxed">
          يوم السبت عطلة رسمية. لا توجد حصص دراسية، واجبات منزلية، أو تنبيهات مجدولة للغد السبت. استمتع بيومك!
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* First: 2x4 Grid of Subject Blocks (8 periods) - جدول حصص الغد أولاً */}
      <div className="bg-white rounded-2xl border border-slate-200 p-3.5 sm:p-4 shadow-2xs space-y-3">
        <div className="flex items-center justify-between pb-1 border-b border-slate-100">
          <span className="text-sm font-black text-slate-900">
            جدول حصص الغد — يوم {ARABIC_DAY_NAMES[tomorrowDay]} ({tomorrowDay})
          </span>
          <span className="text-xs text-indigo-900 font-bold bg-indigo-50 px-2 py-0.5 rounded-md border border-indigo-200">
            {currentClass} • 8 حصص
          </span>
        </div>

        {targetPeriods.length === 0 ? (
          <div className="p-6 text-center text-slate-400">
            <BookOpen className="w-6 h-6 mx-auto mb-1 text-slate-300" />
            <p className="text-xs font-bold">لا توجد حصص مسجلة ليوم {ARABIC_DAY_NAMES[tomorrowDay]}</p>
          </div>
        ) : (
          /* 2x4 Grid: 4 columns on desktop/tablet, 2 columns on mobile, exactly 8 blocks */
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
            {targetPeriods.map((slot) => {
              const meta = SUBJECT_METADATA[slot.subject];
              return (
                <div
                  key={slot.period}
                  className={`p-3 rounded-xl border flex items-center justify-center gap-2 text-center shadow-2xs transition-all ${
                    meta?.badgeBg || 'bg-slate-100 text-slate-900 border-slate-300'
                  }`}
                >
                  <SubjectIcon subject={slot.subject} className="w-4 h-4 shrink-0" />
                  <span className="font-black text-xs sm:text-sm truncate">
                    {slot.subject}
                  </span>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Second: Block for Notes Underneath (ملاحظات وتحذيرات حصص الغد - كويزات واختبارات باللون الأحمر) */}
      <div className="bg-white rounded-2xl border border-slate-200 p-3.5 sm:p-4 shadow-2xs space-y-3">
        <div className="flex items-center justify-between pb-1 border-b border-slate-100 flex-wrap gap-2">
          <div className="flex items-center gap-2 text-amber-950 font-black text-xs sm:text-sm">
            <Sparkles className="w-4 h-4 text-amber-600 shrink-0" />
            <span>الملاحظات والإنذارات ليوم {ARABIC_DAY_NAMES[tomorrowDay]} ({tomorrowDay})</span>
          </div>
          {isAdminEditMode && onAddTomorrowNote && (
            <button
              onClick={() => onAddTomorrowNote({ targetDay: tomorrowDay })}
              className="inline-flex items-center gap-1 px-3 py-1 bg-emerald-600 hover:bg-emerald-700 text-white text-[11px] font-black rounded-lg transition-all shadow-xs cursor-pointer"
            >
              <Plus className="w-3 h-3 text-emerald-100" />
              <span>➕ إضافة ملاحظة للغد</span>
            </button>
          )}
        </div>

        {sortedNotes.length === 0 ? (
          <div className="py-4 px-3 rounded-xl bg-slate-50 border border-dashed border-slate-200 text-center">
            <p className="text-xs text-slate-400 font-semibold">
              لا توجد ملاحظات خاصة مسجلة ليوم {ARABIC_DAY_NAMES[tomorrowDay]} في الخطة الأسبوعية
            </p>
          </div>
        ) : (
          <div className="space-y-2.5">
            {sortedNotes.map((note, idx) => {
              const badgeInfo = getNoteBadgeInfo(note);
              return (
                <div
                  key={note.id || `${note.subject}-${note.targetDay}-${idx}`}
                  className={`rounded-2xl p-3.5 sm:p-4 transition-all space-y-2 text-xs ${badgeInfo.cardClass}`}
                >
                  <div className="flex items-start justify-between gap-3 text-slate-900">
                    <div className="flex items-start gap-2.5 flex-1">
                      <span className={`px-2.5 py-1 rounded-lg text-[11px] shrink-0 ${badgeInfo.badgeClass}`}>
                        {badgeInfo.label} • {badgeInfo.subjectName}
                      </span>
                      <span className={`leading-relaxed text-xs sm:text-sm ${badgeInfo.isAlert ? 'font-black text-rose-950' : 'font-bold text-slate-900'}`}>
                        {getNoteDisplayArabic(note)}
                      </span>
                    </div>
                    {isAdminEditMode && (
                      <div className="flex items-center gap-1 shrink-0">
                        <button
                          onClick={() => onEditTomorrowNote?.(note)}
                          className="p-1 bg-amber-50 hover:bg-amber-100 text-amber-700 border border-amber-300 rounded-md transition-colors cursor-pointer"
                          title="تعديل الملاحظة"
                        >
                          <Pencil className="w-3 h-3" />
                        </button>
                        <button
                          onClick={() => {
                            handleDeleteTomorrowNote(note);
                          }}
                          className="p-1 bg-rose-50 hover:bg-rose-100 text-rose-700 border border-rose-300 rounded-md transition-colors cursor-pointer"
                          title="حذف الملاحظة"
                        >
                          <Trash className="w-3 h-3" />
                        </button>
                      </div>
                    )}
                  </div>
                  {getNoteDisplayBagItem(note) &&
                    !(
                      ((note.note || '') + ' ' + (note.arabicNote || '')).toLowerCase().includes('إملاء') ||
                      ((note.note || '') + ' ' + (note.arabicNote || '')).toLowerCase().includes('dictation')
                    ) && (
                    <div className={`text-[11px] font-semibold px-2.5 py-1 rounded-lg inline-block ${
                      badgeInfo.isAlert
                        ? 'text-rose-900 bg-white border border-rose-200'
                        : 'text-amber-950 bg-white border border-amber-200/90'
                    }`}>
                      الأدوات المطلوبة: {getNoteDisplayBagItem(note)}
                    </div>
                  )}
                  {(() => {
                    const noteLinks: { title: string; url: string }[] = [];
                    if (note.links && Array.isArray(note.links) && note.links.length > 0) {
                      noteLinks.push(...note.links);
                    } else if (note.linkUrl) {
                      noteLinks.push({ title: note.linkTitle || 'رابط مرفق 🔗', url: note.linkUrl });
                    }
                    if (noteLinks.length === 0) return null;
                    return (
                      <div className="pt-1 flex flex-wrap gap-1.5">
                        {noteLinks.map((lnk, lIdx) => (
                          <a
                            key={lIdx}
                            href={lnk.url}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="inline-flex items-center gap-1.5 px-2 py-1 rounded-lg text-[10px] sm:text-xs font-black bg-blue-50 text-blue-950 border border-blue-200 hover:bg-blue-100 transition-colors shadow-2xs"
                          >
                            <ExternalLink className="w-3 h-3 text-blue-700" />
                            <span>{lnk.title}</span>
                          </a>
                        ))}
                      </div>
                    );
                  })()}
                  {note.pdfUrl && (
                    <div className="pt-2">
                      <AttachmentPdfCard
                        pdfUrl={note.pdfUrl}
                        subject={note.subject}
                        label="مرفق التنبيه"
                      />
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
};
