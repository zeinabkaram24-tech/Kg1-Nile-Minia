import { ClassId, ParsedWeeklyPlanResponse } from '../types';

export async function parseWeeklyPlanWithAI(
  planText: string,
  classId: ClassId
): Promise<ParsedWeeklyPlanResponse> {
  try {
    const response = await fetch('/api/parse-weekly-plan', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ planText, classId }),
    });

    if (!response.ok) {
      throw new Error(`Server returned ${response.status}`);
    }

    const data = await response.json();
    return {
      classwork: Array.isArray(data.classwork) ? data.classwork : [],
      homework: Array.isArray(data.homework) ? data.homework : [],
      tomorrowNotes: Array.isArray(data.tomorrowNotes) ? data.tomorrowNotes : [],
    };
  } catch (err) {
    console.warn('Network call failed, using client parser fallback:', err);
    // Client-side quick parser
    return fallbackClientParser(planText, classId);
  }
}

function fallbackClientParser(text: string, classId: ClassId): ParsedWeeklyPlanResponse {
  const lines = text.split('\n').map((l) => l.trim()).filter(Boolean);
  const classwork: any[] = [];
  const homework: any[] = [];
  const tomorrowNotes: any[] = [];
  let currentDay = 'Sunday';
  let currentSubject = 'English';

  const URL_REGEX = /(https?:\/\/[^\s<>"'()]+|www\.[^\s<>"'()]+)/gi;

  const days = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday'];
  const subjects = [
    'Mathematics',
    'English',
    'Arabic',
    'Science',
    'Social Studies',
    'French',
    'Religion',
    'ICT',
    'Arts',
    'Music',
    'PE',
  ];

  for (const line of lines) {
    for (const d of days) {
      if (new RegExp(`^#*\\s*${d}`, 'i').test(line) || new RegExp(`\\b${d}\\b`, 'i').test(line)) {
        currentDay = d;
      }
    }
    if (/الأحد/i.test(line)) currentDay = 'Sunday';
    else if (/الاثنين|الإثنين/i.test(line)) currentDay = 'Monday';
    else if (/الثلاثاء/i.test(line)) currentDay = 'Tuesday';
    else if (/الأربعاء|الاربعاء/i.test(line)) currentDay = 'Wednesday';
    else if (/الخميس/i.test(line)) currentDay = 'Thursday';

    for (const s of subjects) {
      if (new RegExp(`\\b${s}\\b`, 'i').test(line)) currentSubject = s;
    }
    if (/عربي|لغة عربية/i.test(line)) currentSubject = 'Arabic';
    else if (/ماث|حساب|رياضيات|math/i.test(line)) currentSubject = 'Mathematics';
    else if (/انجليزي|انجلش|english/i.test(line)) currentSubject = 'English';
    else if (/علوم|ساينس|science/i.test(line)) currentSubject = 'Science';
    else if (/دراسات|social/i.test(line)) currentSubject = 'Social Studies';
    else if (/فرنساوي|فرنسي|french/i.test(line)) currentSubject = 'French';
    else if (/دين|تربية دينية|religion/i.test(line)) currentSubject = 'Religion';
    else if (/حاسب|تكنولوجيا|ict/i.test(line)) currentSubject = 'ICT';
    else if (/رسم|فنية|art/i.test(line)) currentSubject = 'Arts';
    else if (/موسيقى|music/i.test(line)) currentSubject = 'Music';
    else if (/ألعاب|رياضية|pe/i.test(line)) currentSubject = 'PE';

    // Extract links
    const rawUrls = line.match(URL_REGEX) || [];
    const links = rawUrls.map((u) => {
      const cleanUrl = u.startsWith('www.') ? `https://${u}` : u;
      const isVideo = /youtube|youtu\.be|vimeo|mp4/i.test(cleanUrl);
      return {
        url: cleanUrl,
        title: isVideo ? 'فيديو الشرح / التدريب' : 'رابط الدرس والمصدر',
        type: isVideo ? ('video' as const) : ('sheet' as const),
      };
    });
    const linkUrl = links.length > 0 ? links[0].url : undefined;

    // Identify Notes / Tomorrow indicators (Arabic & English)
    const isNote = /^(notes?|ملاحظات|ملاحظة|تنبيه|remarque|bring|please\s+bring|إحضار|برجاء|ضرورة)[:\-–\s]*/i.test(line) ||
                   /\b(notes?|ملاحظات|ملاحظة|تنبيه|remarque)\b/i.test(line);

    const isHw = /hw|homework|واجب|h\.w/i.test(line);
    const clean = line.replace(/^(hw|cw|h\.w|c\.w|homework|classwork|واجب|حصة|notes?|ملاحظات|ملاحظة|تنبيه|remarque)[:\-–\s]*/i, '').trim();

    if (isNote) {
      tomorrowNotes.push({
        day: currentDay as any,
        subject: currentSubject,
        note: clean || line,
        arabicNote: clean || line,
        bagItem: /bring|إحضار|أدوات|كشكول|كتاب|ألوان|sketch/i.test(line) ? clean : undefined,
      });
    } else if (isHw) {
      const nextDayMap: Record<string, string> = {
        Sunday: 'Monday',
        Monday: 'Tuesday',
        Tuesday: 'Wednesday',
        Wednesday: 'Thursday',
        Thursday: 'Sunday',
      };
      homework.push({
        classId,
        assignedDay: currentDay as any,
        dueDay: (nextDayMap[currentDay] || 'Monday') as any,
        subject: currentSubject as any,
        task: clean || line,
        completed: false,
        priority: /urgent|هام|اختبار|quiz/i.test(line) ? 'urgent' : 'normal',
        linkUrl,
        links: links.length > 0 ? links : undefined,
      });
    } else if (clean.length > 3) {
      classwork.push({
        classId,
        day: currentDay as any,
        period: (classwork.length % 6) + 1,
        subject: currentSubject as any,
        title: clean,
        completed: false,
        linkUrl,
        links: links.length > 0 ? links : undefined,
      });
    }
  }

  return { classwork, homework, tomorrowNotes };
}
