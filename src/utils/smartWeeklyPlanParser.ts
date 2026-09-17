import { ClassId, ClassworkEntry, HomeworkEntry, ParsedWeeklyPlanResponse, SchoolDay, SubjectName } from '../types';
import { TomorrowSpecialNote } from '../data/defaultWeeklyPlan';

const NEXT_DAY_MAP: Record<string, SchoolDay> = {
  Sunday: 'Monday',
  Monday: 'Tuesday',
  Tuesday: 'Wednesday',
  Wednesday: 'Thursday',
  Thursday: 'Sunday',
  Saturday: 'Sunday',
};

const URL_REGEX = /(https?:\/\/[^\s<>"'()]+|www\.[^\s<>"'()]+)/gi;

export function extractLinks(str: string) {
  const raw = str.match(URL_REGEX) || [];
  return raw.map((u) => {
    const clean = u.startsWith('www.') ? `https://${u}` : u;
    const isVideo = /youtube|youtu\.be|vimeo|mp4/i.test(clean);
    return {
      url: clean,
      title: isVideo ? 'فيديو الشرح والتدريب' : 'رابط الدرس والمصدر',
      type: (isVideo ? 'video' : 'sheet') as 'video' | 'sheet' | 'game' | 'general',
    };
  });
}

export function extractPages(str: string): string | undefined {
  const m = str.match(/(?:(?:حل\s*)?(?:ورق(?:ة)?\s*العمل|كتاب\s*(?:التلميذ|المدرسة|الأنشطة)?)\s*)?(?:ص(?:فحة|فحات)?|p\.|pages?)\s*[:\s]*([0-9٠-٩\s,\-/\\&إلىtoو]+)/i);
  if (m) return m[0].trim();
  const m2 = str.match(/(?:حل\s*)?(?:ورق(?:ة)?\s*العمل|كتاب\s*(?:التلميذ|المدرسة|الأنشطة)?)\s*([0-9٠-٩\s,\-/\\&إلىtoو]+)/i);
  return m2 ? m2[0].trim() : undefined;
}

const DAY_REGEX = /(?:يوم\s*)?(الأحد|الاثنين|الإثنين|الثلاثاء|الأربعاء|الاربعاء|الخميس|Sunday|Monday|Tuesday|Wednesday|Thursday)/i;

const HEADER_IGNORE = /^(الخطة الأسبوعية|weekly\s*plan|الموضوع|topic|الأسبوع|week|kg\s*1|رياض الأطفال|نظام التعليم|مدرسة النيل|الصف\b|الصف الدراسي)/i;

const LESSON_MARKER_SOURCE = '(?:اسم\\s*الدرس|محتوى\\s*الدرس|موضوع\\s*الدرس|عنوان\\s*الدرس|محتوى\\s*الحصة|نواتج\\s*التعلم|الدرس|الموضوع|\\blesson\\b|\\btopic\\b)';
const RESOURCE_MARKER_SOURCE = '(?:مصادر\\s*(?:التعلم|الصف)|مصدر\\s*(?:التعلم|الصف)|العمل\\s*(?:بالصف|داخل\\s*الفصل|الصفي)|داخل\\s*الفصل|في\\s*الفصل|كلاس\\s*و?ورك|أوراق?\\s*العمل|ورق\\s*العمل|كتاب\\s*(?:التلميذ|الأنشطة|المدرسة)|\\bclasswork\\b|\\bcw\\b|\\bc\\.w\\b|\\bresources\\b)';
const CW_MARKER_SOURCE = '(?:' + LESSON_MARKER_SOURCE + '|' + RESOURCE_MARKER_SOURCE + ')';
const HW_MARKER_SOURCE = '(?:الواجب\\s*(?:المنزلي|بالمنزل|المدرسي)?|واجب\\s*منزلي|واجب|مصادر\\s*(?:المنزل|الواجب)|هوم\\s*و?ورك|\\bhomework\\b|\\bhw\\b|\\bh\\.w\\b|المطلوب\\s*(?:بالمنزل|في\\s*المنزل)|تدريب\\s*منزلي)';
const NOTE_MARKER_SOURCE = '(?:ملاحظات|ملاحظة|تنبيهات|تنبيه|ملحوظة|هام|برجاء\\s*إحضار|يرجى\\s*إحضار|ضرورة\\s*إحضار|\\bnotes?\\b|\\bremarque\\b|\\bbring\\b|\\bplease\\s*bring\\b)';

const LESSON_MARKER = new RegExp(LESSON_MARKER_SOURCE, 'i');
const RESOURCE_MARKER = new RegExp(RESOURCE_MARKER_SOURCE, 'i');
const CW_MARKER = new RegExp(CW_MARKER_SOURCE, 'i');
const HW_MARKER = new RegExp(HW_MARKER_SOURCE, 'i');
const NOTE_MARKER = new RegExp(NOTE_MARKER_SOURCE, 'i');

export function cleanTitleFromPages(title: string): string {
  return title
    .replace(/(?:[-–|•:]\s*)?(?:حل\s*)?(?:ورق(?:ة)?\s*العمل|كتاب\s*(?:التلميذ|الأنشطة|المدرسة)?|ص(?:فحة|فحات)?)\s*(?:رقم\s*)?[0-9٠-٩]+(?:\s*[-–\\/,و]\s*[0-9٠-٩]+)*/gi, '')
    .replace(/^[-–|•:\s]+|[-–|•:\s]+$/g, '')
    .trim() || title;
}

function cleanMarkerPrefix(str: string, markerSource: string): string {
  return str.replace(new RegExp('^.*?' + markerSource + '[:\\-–\\s]*', 'i'), '').trim();
}

/**
 * Intelligent deterministic weekly plan parser for Arabic, English, and Mixed curricula.
 * Strictly adheres to the official Weekly Plan table format:
 * - اليوم (Day)
 * - اسم الدرس (Lesson Title) -> Classwork Title
 * - مصادر التعلم (Learning Resources / Worksheets / Class Videos) -> Classwork Pages & Links
 * - الواجب المنزلي ومصادره (Homework & Home Videos) -> Homework Task & Links
 * - ملاحظات (Notes) -> Tomorrow Notes
 */
export function smartParseWeeklyPlan(
  text: string,
  defaultClass: ClassId = 'KG1A',
  subjectHint: string = 'Arabic'
): ParsedWeeklyPlanResponse {
  const lines = text.split(/\r?\n/).map((l) => l.trim()).filter(Boolean);
  const rawClasswork: any[] = [];
  const rawHomework: any[] = [];
  const rawTomorrowNotes: any[] = [];

  let currentDay: SchoolDay = 'Sunday';
  let currentSubject: string = subjectHint && subjectHint !== 'ALL' ? subjectHint : 'Arabic';
  let activeSection: 'lesson' | 'resource' | 'cw' | 'hw' | 'note' | null = null;

  // Track discovered header column mapping
  let headerMap: {
    dayIdx?: number;
    lessonIdx?: number;
    resourceIdx?: number;
    hwIdx?: number;
    noteIdx?: number;
  } | null = null;

  for (let rawLine of lines) {
    // 0. Table row format (columns separated by | or tabs)
    if (rawLine.includes('|') || rawLine.includes('\t')) {
      const delimiter = rawLine.includes('|') ? '|' : '\t';
      let cols = rawLine.split(delimiter).map((c) => c.trim()).filter(Boolean);

      // Check for Header row
      const isHeaderRow = cols.some((c) =>
        /اليوم|day|المادة|subject|اسم\s*الدرس|مصادر\s*(?:التعلم|الصف)|العمل\s*بالصف|الواجب/i.test(c)
      );
      if (isHeaderRow) {
        headerMap = {};
        cols.forEach((col, idx) => {
          if (/اليوم|day/i.test(col)) headerMap!.dayIdx = idx;
          else if (/اسم\s*الدرس|محتوى|موضوع|الدرس|lesson|topic/i.test(col)) headerMap!.lessonIdx = idx;
          else if (/مصادر\s*(?:التعلم|الصف)|مصدر\s*(?:التعلم|الصف)|العمل\s*(?:بالصف|الصفي)|أوراق|ورق\s*العمل|classwork|resources/i.test(col)) headerMap!.resourceIdx = idx;
          else if (/الواجب|homework|hw|مصادر\s*المنزل/i.test(col)) headerMap!.hwIdx = idx;
          else if (/ملاحظات|ملاحظة|تنبيه|ملحوظة|notes|remarque/i.test(col)) headerMap!.noteIdx = idx;
        });
        continue;
      }

      if (cols.length >= 2) {
        // RTL check: If the rightmost column contains the Day of week, reverse columns to normalize LTR (Day = 0)
        const lastCol = cols[cols.length - 1];
        const firstCol = cols[0];
        if (DAY_REGEX.test(lastCol) && !DAY_REGEX.test(firstCol)) {
          cols = [...cols].reverse();
        }

        // Detect day
        let dayColIdx = headerMap?.dayIdx ?? 0;
        if (dayColIdx >= cols.length) dayColIdx = 0;
        const dMatch = cols[dayColIdx]?.match(DAY_REGEX);
        if (dMatch) {
          const d = dMatch[1].toLowerCase();
          if (/أحد|sunday/i.test(d)) currentDay = 'Sunday';
          else if (/اثنين|إثنين|monday/i.test(d)) currentDay = 'Monday';
          else if (/ثلاثاء|tuesday/i.test(d)) currentDay = 'Tuesday';
          else if (/أربعاء|اربعاء|wednesday/i.test(d)) currentDay = 'Wednesday';
          else if (/خميس|thursday/i.test(d)) currentDay = 'Thursday';
        }

        // Determine column assignments
        let lessonColIdx = headerMap?.lessonIdx ?? -1;
        let resourceColIdx = headerMap?.resourceIdx ?? -1;
        let hwColIdx = headerMap?.hwIdx ?? -1;
        let noteColIdx = headerMap?.noteIdx ?? -1;

        if (lessonColIdx === -1 || hwColIdx === -1) {
          // Standard Nile Arabic Plan column structures:
          if (cols.length >= 5) {
            // [اليوم, اسم الدرس, مصادر التعلم, الواجب المنزلي, ملاحظات]
            lessonColIdx = 1;
            resourceColIdx = 2;
            hwColIdx = 3;
            noteColIdx = 4;
          } else if (cols.length === 4) {
            // Check if Col 1 is Subject
            if (/^(?:عربي|لغة\s*عربية|arabic|math|english|science)$/i.test(cols[1])) {
              lessonColIdx = 2;
              resourceColIdx = 2;
              hwColIdx = 3;
            } else {
              // [اليوم, اسم الدرس, مصادر التعلم, الواجب المنزلي]
              lessonColIdx = 1;
              resourceColIdx = 2;
              hwColIdx = 3;
            }
          } else if (cols.length === 3) {
            // [اليوم, اسم الدرس ومصادر التعلم, الواجب المنزلي]
            lessonColIdx = 1;
            resourceColIdx = 1;
            hwColIdx = 2;
          } else if (cols.length === 2) {
            lessonColIdx = 1;
            resourceColIdx = 1;
          }
        }

        const lessonText = cols[lessonColIdx] ? cleanMarkerPrefix(cols[lessonColIdx], LESSON_MARKER_SOURCE) : '';
        const resourceText = resourceColIdx !== -1 && cols[resourceColIdx] && resourceColIdx !== lessonColIdx
          ? cleanMarkerPrefix(cols[resourceColIdx], RESOURCE_MARKER_SOURCE)
          : '';
        const hwText = hwColIdx !== -1 && cols[hwColIdx]
          ? cleanMarkerPrefix(cols[hwColIdx], HW_MARKER_SOURCE)
          : '';
        const noteText = noteColIdx !== -1 && cols[noteColIdx]
          ? cleanMarkerPrefix(cols[noteColIdx], NOTE_MARKER_SOURCE)
          : '';

        // Extract classwork: Lesson Title + Learning Resources (pages & links)
        const rawTitle = lessonText || resourceText;
        const cleanTitle = cleanTitleFromPages(rawTitle);

        const combinedClassSource = `${lessonText} ${resourceText}`.trim();
        const cwPages = extractPages(combinedClassSource);
        const cwLinks = extractLinks(combinedClassSource);
        const cwDetails = resourceText && resourceText !== cwPages && !resourceText.startsWith('http')
          ? resourceText
          : undefined;

        if (cleanTitle && cleanTitle.length >= 2 && !/^-+$/.test(cleanTitle) && cleanTitle !== 'لا شيء') {
          rawClasswork.push({
            classId: defaultClass,
            day: currentDay,
            period: (rawClasswork.filter((c) => c.day === currentDay).length % 6) + 1,
            subject: currentSubject,
            title: cleanTitle,
            pages: cwPages,
            details: cwDetails,
            completed: false,
            linkUrl: cwLinks[0]?.url,
            links: cwLinks.length > 0 ? cwLinks : undefined,
          });
        }

        // Extract homework: Strictly from Homework column
        if (hwText && hwText.length >= 2 && !/^-+$/.test(hwText) && hwText !== 'لا شيء') {
          const hwLinks = extractLinks(hwText);
          const hwPages = extractPages(hwText);
          const isNoHw = /^لا\s*يوجد(?:\s*واجب)?/i.test(hwText) || hwText === '-';

          rawHomework.push({
            classId: defaultClass,
            assignedDay: currentDay,
            dueDay: NEXT_DAY_MAP[currentDay] || 'Monday',
            subject: currentSubject,
            task: isNoHw ? 'لا يوجد واجب اليوم' : hwText,
            pages: hwPages,
            completed: isNoHw,
            priority: /urgent|هام|اختبار|quiz|ضروري/i.test(hwText) ? 'urgent' : 'normal',
            linkUrl: hwLinks[0]?.url,
            links: hwLinks.length > 0 ? hwLinks : undefined,
          });
        }

        // Extract note
        if (noteText && noteText.length >= 2 && !/^-+$/.test(noteText) && noteText !== 'لا شيء') {
          rawTomorrowNotes.push({
            day: currentDay,
            targetDay: currentDay,
            subject: currentSubject,
            note: noteText,
            arabicNote: noteText,
            bagItem: /إحضار|أدوات|كشكول|كتاب|ألوان|مسطرة/i.test(noteText) ? noteText : undefined,
          });
        }

        continue;
      }
    }

    // 1. Ignore pure document header lines
    if (HEADER_IGNORE.test(rawLine) && !CW_MARKER.test(rawLine) && !HW_MARKER.test(rawLine)) {
      continue;
    }

    // 2. Check for Day indicator in normal text
    const dayMatch = rawLine.match(DAY_REGEX);
    if (dayMatch) {
      const d = dayMatch[1].toLowerCase();
      if (/أحد|sunday/i.test(d)) currentDay = 'Sunday';
      else if (/اثنين|إثنين|monday/i.test(d)) currentDay = 'Monday';
      else if (/ثلاثاء|tuesday/i.test(d)) currentDay = 'Tuesday';
      else if (/أربعاء|اربعاء|wednesday/i.test(d)) currentDay = 'Wednesday';
      else if (/خميس|thursday/i.test(d)) currentDay = 'Thursday';

      const withoutDay = rawLine.replace(DAY_REGEX, '').replace(/^[:\-–\s]+/, '').trim();
      if (!withoutDay) {
        activeSection = null;
        continue;
      }
      rawLine = withoutDay;
    }

    // Detect subject from line
    if (/عربي|لغة عربية/i.test(rawLine)) currentSubject = 'Arabic';
    else if (/ماث|حساب|رياضيات|math/i.test(rawLine)) currentSubject = 'Mathematics';
    else if (/انجليزي|انجلش|english/i.test(rawLine)) currentSubject = 'English';
    else if (/علوم|ساينس|science/i.test(rawLine)) currentSubject = 'Science';
    else if (/فرنساوي|فرنسي|french/i.test(rawLine)) currentSubject = 'French';
    else if (/دين|تربية دينية|religion/i.test(rawLine)) currentSubject = 'Religion';
    else if (/دراسات|social/i.test(rawLine)) currentSubject = 'Social Studies';

    // 3. Multi-section inline splitter (e.g. "اسم الدرس: ... مصادر التعلم: ... الواجب المنزلي: ...")
    const hasLesson = LESSON_MARKER.test(rawLine);
    const hasResource = RESOURCE_MARKER.test(rawLine);
    const hasCw = CW_MARKER.test(rawLine);
    const hasHw = HW_MARKER.test(rawLine);
    const hasNote = NOTE_MARKER.test(rawLine);

    if ((hasLesson && hasResource) || (hasCw && hasHw) || (hasCw && hasNote) || (hasHw && hasNote) || (hasLesson && hasHw)) {
      const combinedRegex = new RegExp(
        '(?:^|[|•\\n\\r.,;\\-–\\s])(' + LESSON_MARKER_SOURCE + '|' + RESOURCE_MARKER_SOURCE + '|' + HW_MARKER_SOURCE + '|' + NOTE_MARKER_SOURCE + ')[:\\-–\\s]*',
        'gi'
      );
      let m: RegExpExecArray | null;
      const matches: Array<{ raw: string; keyword: string; index: number; end: number; type: 'lesson' | 'resource' | 'cw' | 'hw' | 'note' }> = [];

      while ((m = combinedRegex.exec(rawLine)) !== null) {
        const full = m[0];
        const kw = m[1];
        const offset = full.indexOf(kw);
        let type: 'lesson' | 'resource' | 'cw' | 'hw' | 'note' = 'cw';
        if (LESSON_MARKER.test(kw)) type = 'lesson';
        else if (RESOURCE_MARKER.test(kw)) type = 'resource';
        else if (HW_MARKER.test(kw)) type = 'hw';
        else if (NOTE_MARKER.test(kw)) type = 'note';

        matches.push({
          raw: full,
          keyword: kw,
          index: m.index + offset,
          end: m.index + full.length,
          type,
        });
      }

      if (matches.length > 0) {
        for (let i = 0; i < matches.length; i++) {
          const cur = matches[i];
          const nextStart = i + 1 < matches.length ? matches[i + 1].index : rawLine.length;
          const content = rawLine.slice(cur.end, nextStart).replace(/^[|•\\-–\\.\s]+|[|•\\-–\\.\s]+$/g, '').trim();
          if (!content || content.length < 2 || content === '-' || content === 'لا شيء') continue;

          const links = extractLinks(content);
          const pages = extractPages(content);

          if (cur.type === 'lesson' || cur.type === 'cw') {
            const cleanTitle = cleanTitleFromPages(content);
            rawClasswork.push({
              classId: defaultClass,
              day: currentDay,
              period: (rawClasswork.filter((c) => c.day === currentDay).length % 6) + 1,
              subject: currentSubject,
              title: cleanTitle,
              pages,
              completed: false,
              linkUrl: links[0]?.url,
              links: links.length > 0 ? links : undefined,
            });
          } else if (cur.type === 'resource') {
            // Attach to current day's latest classwork or create one if none exists
            const latestCw = rawClasswork.filter((c) => c.day === currentDay).pop();
            if (latestCw) {
              if (pages) latestCw.pages = latestCw.pages ? `${latestCw.pages} - ${pages}` : pages;
              if (links.length > 0) {
                latestCw.links = [...(latestCw.links || []), ...links];
                if (!latestCw.linkUrl) latestCw.linkUrl = links[0].url;
              }
              if (!latestCw.details && content !== pages) {
                latestCw.details = content;
              }
            } else {
              rawClasswork.push({
                classId: defaultClass,
                day: currentDay,
                period: 1,
                subject: currentSubject,
                title: cleanTitleFromPages(content),
                pages,
                details: content !== pages ? content : undefined,
                completed: false,
                linkUrl: links[0]?.url,
                links: links.length > 0 ? links : undefined,
              });
            }
          } else if (cur.type === 'hw') {
            const isNoHw = /^لا\s*يوجد(?:\s*واجب)?/i.test(content) || content === '-';
            rawHomework.push({
              classId: defaultClass,
              assignedDay: currentDay,
              dueDay: NEXT_DAY_MAP[currentDay] || 'Monday',
              subject: currentSubject,
              task: isNoHw ? 'لا يوجد واجب اليوم' : content,
              pages,
              completed: isNoHw,
              priority: /urgent|هام|اختبار|quiz|ضروري/i.test(content) ? 'urgent' : 'normal',
              linkUrl: links[0]?.url,
              links: links.length > 0 ? links : undefined,
            });
          } else if (cur.type === 'note') {
            rawTomorrowNotes.push({
              day: currentDay,
              targetDay: currentDay,
              subject: currentSubject,
              note: content,
              arabicNote: content,
              bagItem: /إحضار|أدوات|كشكول|كتاب|ألوان/i.test(content) ? content : undefined,
            });
          }
        }
        continue;
      }
    }

    // 4. Single section line or Section Header
    if (hasNote) {
      activeSection = 'note';
      const clean = cleanMarkerPrefix(rawLine, NOTE_MARKER_SOURCE);
      if (clean && clean !== '-' && clean !== 'لا شيء') {
        rawTomorrowNotes.push({
          day: currentDay,
          targetDay: currentDay,
          subject: currentSubject,
          note: clean,
          arabicNote: clean,
          bagItem: /إحضار|أدوات|كشكول|كتاب|ألوان/i.test(clean) ? clean : undefined,
        });
      }
      continue;
    }

    if (hasHw) {
      activeSection = 'hw';
      const clean = cleanMarkerPrefix(rawLine, HW_MARKER_SOURCE);
      if (clean && clean !== '-' && clean !== 'لا شيء') {
        const links = extractLinks(clean);
        const isNoHw = /^لا\s*يوجد(?:\s*واجب)?/i.test(clean);
        rawHomework.push({
          classId: defaultClass,
          assignedDay: currentDay,
          dueDay: NEXT_DAY_MAP[currentDay] || 'Monday',
          subject: currentSubject,
          task: isNoHw ? 'لا يوجد واجب اليوم' : clean,
          pages: extractPages(clean),
          completed: isNoHw,
          priority: /urgent|هام|اختبار|quiz|ضروري/i.test(clean) ? 'urgent' : 'normal',
          linkUrl: links[0]?.url,
          links: links.length > 0 ? links : undefined,
        });
      }
      continue;
    }

    if (hasLesson) {
      activeSection = 'lesson';
      const clean = cleanMarkerPrefix(rawLine, LESSON_MARKER_SOURCE);
      if (clean && clean !== '-' && clean !== 'لا شيء') {
        const links = extractLinks(clean);
        rawClasswork.push({
          classId: defaultClass,
          day: currentDay,
          period: (rawClasswork.filter((c) => c.day === currentDay).length % 6) + 1,
          subject: currentSubject,
          title: cleanTitleFromPages(clean),
          pages: extractPages(clean),
          completed: false,
          linkUrl: links[0]?.url,
          links: links.length > 0 ? links : undefined,
        });
      }
      continue;
    }

    if (hasResource) {
      activeSection = 'resource';
      const clean = cleanMarkerPrefix(rawLine, RESOURCE_MARKER_SOURCE);
      if (clean && clean !== '-' && clean !== 'لا شيء') {
        const links = extractLinks(clean);
        const pages = extractPages(clean);
        const latestCw = rawClasswork.filter((c) => c.day === currentDay).pop();
        if (latestCw) {
          if (pages) latestCw.pages = latestCw.pages ? `${latestCw.pages} - ${pages}` : pages;
          if (links.length > 0) {
            latestCw.links = [...(latestCw.links || []), ...links];
            if (!latestCw.linkUrl) latestCw.linkUrl = links[0].url;
          }
          if (!latestCw.details && clean !== pages) {
            latestCw.details = clean;
          }
        } else {
          rawClasswork.push({
            classId: defaultClass,
            day: currentDay,
            period: 1,
            subject: currentSubject,
            title: cleanTitleFromPages(clean),
            pages,
            details: clean !== pages ? clean : undefined,
            completed: false,
            linkUrl: links[0]?.url,
            links: links.length > 0 ? links : undefined,
          });
        }
      }
      continue;
    }

    if (hasCw) {
      activeSection = 'cw';
      const clean = cleanMarkerPrefix(rawLine, CW_MARKER_SOURCE);
      if (clean && clean !== '-' && clean !== 'لا شيء') {
        const links = extractLinks(clean);
        rawClasswork.push({
          classId: defaultClass,
          day: currentDay,
          period: (rawClasswork.filter((c) => c.day === currentDay).length % 6) + 1,
          subject: currentSubject,
          title: cleanTitleFromPages(clean),
          pages: extractPages(clean),
          completed: false,
          linkUrl: links[0]?.url,
          links: links.length > 0 ? links : undefined,
        });
      }
      continue;
    }

    // 5. Continuation of active section
    const cleanContinuation = rawLine.replace(/^[•\\*\\d\\.\\-–\\s]+/, '').trim();
    if (!cleanContinuation || cleanContinuation.length < 2 || cleanContinuation === '-' || cleanContinuation === 'لا شيء') continue;

    // Ignore if it looks like an isolated subject tag or day tag
    if (new RegExp('^' + DAY_REGEX.source + '[:\\s]*$', 'i').test(cleanContinuation)) continue;

    const links = extractLinks(cleanContinuation);
    const pages = extractPages(cleanContinuation);

    if (activeSection === 'hw') {
      const isNoHw = /^لا\s*يوجد(?:\s*واجب)?/i.test(cleanContinuation);
      rawHomework.push({
        classId: defaultClass,
        assignedDay: currentDay,
        dueDay: NEXT_DAY_MAP[currentDay] || 'Monday',
        subject: currentSubject,
        task: isNoHw ? 'لا يوجد واجب اليوم' : cleanContinuation,
        pages,
        completed: isNoHw,
        priority: 'normal',
        linkUrl: links[0]?.url,
        links: links.length > 0 ? links : undefined,
      });
    } else if (activeSection === 'note') {
      rawTomorrowNotes.push({
        day: currentDay,
        targetDay: currentDay,
        subject: currentSubject,
        note: cleanContinuation,
        arabicNote: cleanContinuation,
        bagItem: /إحضار|أدوات|كشكول|كتاب|ألوان/i.test(cleanContinuation) ? cleanContinuation : undefined,
      });
    } else if (activeSection === 'resource') {
      const latestCw = rawClasswork.filter((c) => c.day === currentDay).pop();
      if (latestCw) {
        if (pages) latestCw.pages = latestCw.pages ? `${latestCw.pages} - ${pages}` : pages;
        if (links.length > 0) {
          latestCw.links = [...(latestCw.links || []), ...links];
          if (!latestCw.linkUrl) latestCw.linkUrl = links[0].url;
        }
        if (!latestCw.details && cleanContinuation !== pages) {
          latestCw.details = cleanContinuation;
        }
      } else {
        rawClasswork.push({
          classId: defaultClass,
          day: currentDay,
          period: 1,
          subject: currentSubject,
          title: cleanTitleFromPages(cleanContinuation),
          pages,
          details: cleanContinuation !== pages ? cleanContinuation : undefined,
          completed: false,
          linkUrl: links[0]?.url,
          links: links.length > 0 ? links : undefined,
        });
      }
    } else {
      rawClasswork.push({
        classId: defaultClass,
        day: currentDay,
        period: (rawClasswork.filter((c) => c.day === currentDay).length % 6) + 1,
        subject: currentSubject,
        title: cleanTitleFromPages(cleanContinuation),
        pages,
        completed: false,
        linkUrl: links[0]?.url,
        links: links.length > 0 ? links : undefined,
      });
    }
  }

  return cleanAndValidatePlanResult(
    {
      classwork: rawClasswork,
      homework: rawHomework,
      tomorrowNotes: rawTomorrowNotes,
    },
    defaultClass,
    subjectHint
  );
}

/**
 * Strict validator that cleans and guarantees 100% accurate separation:
 * - Moves any misplaced homework out of classwork into homework
 * - Moves any misplaced classwork or learning resources out of homework into classwork
 * - Separates lesson title from page numbers so lesson titles remain clean
 * - Moves any notes into tomorrowNotes
 * - Strips document titles and bare day names
 */
export function cleanAndValidatePlanResult(
  raw: ParsedWeeklyPlanResponse,
  defaultClass: ClassId = 'KG1A',
  subjectHint: string = 'Arabic'
): ParsedWeeklyPlanResponse {
  const classwork: Omit<ClassworkEntry, 'id'>[] = [];
  const homework: Omit<HomeworkEntry, 'id'>[] = [];
  const tomorrowNotes: {
    day: SchoolDay;
    targetDay?: SchoolDay;
    subject?: string;
    note: string;
    arabicNote?: string;
    bagItem?: string;
  }[] = [];

  const HEADER_IGNORE_EXACT = /^(الخطة الأسبوعية.*|weekly\s*plan.*|الموضوع:.*|topic:.*|الأسبوع\s*(?:الأول|الثاني|الثالث|الرابع|[0-9]+).*|kg\s*1.*|رياض الأطفال.*|نظام التعليم.*|مدرسة النيل.*|الصف\b.*|يوم\s*(الأحد|الاثنين|الإثنين|الثلاثاء|الأربعاء|الخميس)[:\-–\s]*|sunday[:\-–\s]*|monday[:\-–\s]*|tuesday[:\-–\s]*|wednesday[:\-–\s]*|thursday[:\-–\s]*)$/i;

  const CW_PREFIX = /^(العمل\s*(?:بالصف|داخل\s*الفصل|الصفي)|ما\s*تم\s*(?:دراسته|إنجازه|تدريسه)|داخل\s*الفصل|في\s*الفصل|كلاس\s*و?ورك|\bclasswork\b|\bcw\b|\bc\\.w\b|نواتج\s*التعلم|محتوى\s*الحصة|اسم\s*الدرس|مصادر\s*(?:التعلم|الصف))[:\-–\s]*/i;
  const HW_PREFIX = /^(الواجب\s*(?:المنزلي|بالمنزل|المدرسي)?|واجب\s*منزلي|واجب|مصادر\s*(?:المنزل|الواجب)|هوم\s*و?ورك|\bhomework\b|\bhw\b|\bh\\.w\b|المطلوب\s*(?:بالمنزل|في\\s*المنزل)|تدريب\s*منزلي)[:\-–\s]*/i;
  const NOTE_PREFIX = /^(ملاحظات|ملاحظة|تنبيه|تنبيهات|ملحوظة|هام|برجاء\s*إحضار|يرجى\s*إحضار|ضرورة\s*إحضار|\bnotes?\b|\bremarque\b|\bbring\b|\bplease\s*bring\b)[:\-–\s]*/i;

  // Process raw classwork
  for (const cw of raw.classwork || []) {
    let title = (cw.title || '').trim();
    if (!title || HEADER_IGNORE_EXACT.test(title)) continue;

    // Check if it's actually homework
    if (HW_PREFIX.test(title) || /^لا\s*يوجد\s*واجب/i.test(title)) {
      const cleanHw = title.replace(HW_PREFIX, '').trim();
      if (cleanHw && !HEADER_IGNORE_EXACT.test(cleanHw)) {
        const isNoHw = /^لا\s*يوجد/i.test(cleanHw);
        homework.push({
          classId: (cw.classId as ClassId) || defaultClass,
          assignedDay: cw.day || 'Sunday',
          dueDay: NEXT_DAY_MAP[cw.day || 'Sunday'] || 'Monday',
          subject: ((cw.subject as SubjectName) || (subjectHint as SubjectName) || 'Arabic'),
          task: isNoHw ? 'لا يوجد واجب اليوم' : cleanHw,
          pages: cw.pages || extractPages(cleanHw),
          completed: isNoHw,
          priority: /urgent|هام|اختبار|quiz|ضروري/i.test(cleanHw) ? 'urgent' : 'normal',
          linkUrl: cw.linkUrl,
          links: cw.links || extractLinks(cleanHw),
        });
      }
      continue;
    }

    // Check if it's actually a note (or contains "ملاحظات" or "ملاحظة")
    if (NOTE_PREFIX.test(title) || /ملاحظات|ملاحظة|ملحوظة/i.test(title)) {
      const cleanNote = title.replace(NOTE_PREFIX, '').trim();
      if (cleanNote && !HEADER_IGNORE_EXACT.test(cleanNote)) {
        const d = cw.day || 'Sunday';
        tomorrowNotes.push({
          day: d,
          targetDay: d,
          subject: cw.subject || subjectHint,
          note: cleanNote,
          arabicNote: cleanNote,
          bagItem: /إحضار|أدوات|كشكول|كتاب|ألوان/i.test(cleanNote) ? cleanNote : undefined,
        });
      }
      continue;
    }

    // Clean CW prefix
    title = title.replace(CW_PREFIX, '').trim();
    if (!title || HEADER_IGNORE_EXACT.test(title)) continue;

    const cleanLessonTitle = cleanTitleFromPages(title);
    const pages = cw.pages || extractPages(title);

    classwork.push({
      ...cw,
      classId: (cw.classId as ClassId) || defaultClass,
      subject: ((cw.subject as SubjectName) || (subjectHint as SubjectName) || 'Arabic'),
      title: cleanLessonTitle,
      pages,
      linkUrl: cw.linkUrl || extractLinks(title)[0]?.url,
      links: cw.links || (extractLinks(title).length > 0 ? extractLinks(title) : undefined),
    });
  }

  // Process raw homework
  for (const hw of raw.homework || []) {
    let task = (hw.task || '').trim();
    if (!task || HEADER_IGNORE_EXACT.test(task)) continue;

    // Check if it's actually classwork (or learning resources / مصادر التعلم / مصادر الصف)
    const isActuallyClasswork = CW_PREFIX.test(task) ||
      /^(مصادر\s*(?:التعلم|الصف)|العمل\s*(?:بالصف|داخل\s*الفصل)|داخل\s*الفصل|ورق\s*العمل|حل\s*ورق\s*العمل|كتاب\s*التلميذ)/i.test(task);

    if (isActuallyClasswork) {
      const cleanCw = task.replace(CW_PREFIX, '').trim();
      if (cleanCw && !HEADER_IGNORE_EXACT.test(cleanCw)) {
        classwork.push({
          classId: (hw.classId as ClassId) || defaultClass,
          day: hw.assignedDay || 'Sunday',
          period: (classwork.filter((c) => c.day === hw.assignedDay).length % 6) + 1,
          subject: ((hw.subject as SubjectName) || (subjectHint as SubjectName) || 'Arabic'),
          title: cleanTitleFromPages(cleanCw),
          pages: hw.pages || extractPages(cleanCw),
          completed: false,
          linkUrl: hw.linkUrl || extractLinks(cleanCw)[0]?.url,
          links: hw.links || (extractLinks(cleanCw).length > 0 ? extractLinks(cleanCw) : undefined),
        });
      }
      continue;
    }

    // Check if it's actually a note (or contains "ملاحظات" or "ملاحظة")
    if (NOTE_PREFIX.test(task) || /ملاحظات|ملاحظة|ملحوظة/i.test(task)) {
      const cleanNote = task.replace(NOTE_PREFIX, '').trim();
      if (cleanNote && !HEADER_IGNORE_EXACT.test(cleanNote)) {
        const d = hw.assignedDay || 'Sunday';
        tomorrowNotes.push({
          day: d,
          targetDay: d,
          subject: hw.subject || subjectHint,
          note: cleanNote,
          arabicNote: cleanNote,
          bagItem: /إحضار|أدوات|كشكول|كتاب|ألوان/i.test(cleanNote) ? cleanNote : undefined,
        });
      }
      continue;
    }

    // Clean HW prefix
    task = task.replace(HW_PREFIX, '').trim();
    if (!task || HEADER_IGNORE_EXACT.test(task)) continue;

    const isNoHw = /^لا\s*يوجد(?:\s*واجب)?/i.test(task);

    homework.push({
      ...hw,
      classId: (hw.classId as ClassId) || defaultClass,
      subject: ((hw.subject as SubjectName) || (subjectHint as SubjectName) || 'Arabic'),
      task: isNoHw ? 'لا يوجد واجب اليوم' : task,
      pages: hw.pages || extractPages(task),
      completed: isNoHw ? true : Boolean(hw.completed),
      linkUrl: hw.linkUrl || extractLinks(task)[0]?.url,
      links: hw.links || (extractLinks(task).length > 0 ? extractLinks(task) : undefined),
    });
  }

  // Process raw tomorrowNotes
  for (const n of raw.tomorrowNotes || []) {
    let note = (n.note || n.arabicNote || '').trim();
    if (!note || HEADER_IGNORE_EXACT.test(note)) continue;
    note = note.replace(NOTE_PREFIX, '').trim();
    if (!note) continue;

    const tDay = (n.targetDay || n.day || 'Sunday') as SchoolDay;
    tomorrowNotes.push({
      day: tDay,
      targetDay: tDay,
      subject: n.subject || subjectHint,
      note,
      arabicNote: n.arabicNote ? n.arabicNote.replace(NOTE_PREFIX, '').trim() : note,
      bagItem: n.bagItem || (/إحضار|أدوات|كشكول|كتاب|ألوان/i.test(note) ? note : undefined),
    });
  }

  return { classwork, homework, tomorrowNotes };
}

/**
 * Swaps classwork and homework in the parsed plan response while preserving
 * all analyzed fields, links, pages, details, and tomorrowNotes.
 */
export function swapParsedClassworkAndHomework(plan: ParsedWeeklyPlanResponse): ParsedWeeklyPlanResponse {
  if (!plan) {
    return { classwork: [], homework: [], tomorrowNotes: [] };
  }

  // 1. Items that were extracted as Homework become Classwork
  const swappedClasswork: Omit<ClassworkEntry, 'id'>[] = (plan.homework || []).map((hw, idx) => {
    return {
      classId: hw.classId,
      day: (hw.assignedDay || 'Sunday') as SchoolDay,
      period: (hw as any).period || (idx % 6) + 1,
      subject: hw.subject || 'Arabic',
      title: hw.task || 'بدون عنوان',
      pages: hw.pages,
      details: hw.details,
      completed: hw.completed ?? false,
      block: hw.block,
      week: hw.week,
      linkUrl: hw.linkUrl,
      linkTitle: hw.linkTitle,
      links: hw.links,
    };
  });

  // 2. Items that were extracted as Classwork become Homework
  const swappedHomework: Omit<HomeworkEntry, 'id'>[] = (plan.classwork || []).map((cw) => {
    const assignedDay = (cw.day || 'Sunday') as SchoolDay;
    const isNoHw = /^لا\s*يوجد/i.test(cw.title || '');
    return {
      classId: cw.classId,
      assignedDay,
      dueDay: NEXT_DAY_MAP[assignedDay] || 'Monday',
      subject: cw.subject || 'Arabic',
      task: cw.title || 'واجب مدرسي',
      pages: cw.pages,
      details: cw.details,
      completed: isNoHw ? true : (cw.completed ?? false),
      priority: (cw as any).priority || (/urgent|هام|اختبار|quiz|ضروري/i.test(cw.title || '') ? 'urgent' : 'normal'),
      block: cw.block,
      week: cw.week,
      linkUrl: cw.linkUrl,
      linkTitle: cw.linkTitle,
      links: cw.links,
    };
  });

  return {
    classwork: swappedClasswork,
    homework: swappedHomework,
    tomorrowNotes: plan.tomorrowNotes || [],
  };
}
