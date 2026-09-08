import type { PlanTask, Subject, DayOfWeek, GradeSection, TaskType } from '../types';

/**
 * URL Detection & Link Helper for Weekly Plan Tasks
 * Automatically identifies URLs in task titles, details, notes, etc.
 * Formats them as clickable actions with domain awareness and video/sheet tags.
 */

const URL_REGEX = /(https?:\/\/[^\s<>"'()]+|www\.[^\s<>"'()]+)/gi;

/**
 * Extracts the first URL found in a text string.
 */
export function extractFirstUrl(text?: string): string | undefined {
  if (!text) return undefined;
  const match = text.match(URL_REGEX);
  if (!match || match.length === 0) return undefined;

  let url = match[0];
  // Clean trailing punctuation
  url = url.replace(/[.,;:!?)]+$/, '');
  if (url.startsWith('www.')) {
    url = `https://${url}`;
  }
  return url;
}

/**
 * Extracts all URLs found in a text string.
 */
export function extractAllUrls(text?: string): string[] {
  if (!text) return [];
  const matches = text.match(URL_REGEX);
  if (!matches) return [];

  return matches.map((raw) => {
    let url = raw.replace(/[.,;:!?)]+$/, '');
    if (url.startsWith('www.')) {
      url = `https://${url}`;
    }
    return url;
  });
}

/**
 * Returns a human-friendly domain name (e.g. "youtube.com", "drive.google.com").
 */
export function getFriendlyDomain(url: string): string {
  try {
    const parsed = new URL(url.startsWith('http') ? url : `https://${url}`);
    return parsed.hostname.replace(/^www\./, '');
  } catch {
    return 'الرابط';
  }
}

/**
 * Checks if a URL points to video content.
 */
export function isVideoUrl(url: string): boolean {
  const lower = url.toLowerCase();
  return (
    lower.includes('youtube.com') ||
    lower.includes('youtu.be') ||
    lower.includes('vimeo.com') ||
    lower.includes('tiktok.com') ||
    lower.includes('/video/') ||
    lower.endsWith('.mp4')
  );
}

/**
 * Checks if a URL points to an audio / listenable resource.
 */
export function isAudioUrl(url: string): boolean {
  const lower = url.toLowerCase();
  return (
    lower.includes('soundcloud.com') ||
    lower.includes('spotify.com') ||
    lower.includes('/audio/') ||
    lower.endsWith('.mp3') ||
    lower.endsWith('.wav')
  );
}

/**
 * Checks if a URL points to a document / PDF / drive sheet.
 */
export function isDocumentUrl(url: string): boolean {
  const lower = url.toLowerCase();
  return (
    lower.includes('drive.google.com') ||
    lower.includes('docs.google.com') ||
    lower.includes('dropbox.com') ||
    lower.endsWith('.pdf') ||
    lower.endsWith('.doc') ||
    lower.endsWith('.docx')
  );
}

/**
 * Returns a prominent, engaging button label for the link.
 */
export function getLinkActionLabel(url: string, customTitle?: string): string {
  if (customTitle && customTitle.trim()) {
    return customTitle.trim();
  }

  if (isVideoUrl(url)) {
    return 'مشاهدة الفيديو والشرح في تبويب جديد 🎥 ↗';
  }
  if (isAudioUrl(url)) {
    return 'استماع التسجيل الصوتي في تبويب جديد 🎧 ↗';
  }
  if (isDocumentUrl(url)) {
    return 'فتح الملف / الشيت في تبويب جديد 📄 ↗';
  }

  const lower = url.toLowerCase();
  if (lower.includes('kahoot') || lower.includes('quizlet') || lower.includes('wordwall') || lower.includes('padlet')) {
    return 'فتح النشاط التفاعلي واللعبة في تبويب جديد 🎮 ↗';
  }

  return 'فتح واستماع / مشاهدة الرابط في تبويب جديد 🔗 ↗';
}

/**
 * Automatically inspects weekly plan tasks:
 * If any text or explanation contains a URL (URL / Link):
 * - It creates a separate distinct task in the daily tasks checklist:
 *   'استماع / مشاهدة الرابط التالي: [اسم المادة أو الدرس]'
 * - With a direct clickable button (target="_blank") in the task.
 */
export function processTasksAndExtractLinkTasks(tasks: PlanTask[], subjects?: Subject[]): PlanTask[] {
  if (!tasks || !Array.isArray(tasks)) return [];

  const subjectMap = new Map<string, string>();
  if (subjects) {
    subjects.forEach((s) => {
      subjectMap.set(s.id, s.nameEn || s.nameAr);
    });
  }

  const result: PlanTask[] = [];
  const existingLinkKeys = new Set<string>();

  // 1. First pass: record already existing link tasks
  tasks.forEach((t) => {
    const url = t.linkUrl || extractFirstUrl(t.details) || extractFirstUrl(t.notes) || extractFirstUrl(t.title);
    if (url && (t.title.includes('استماع / مشاهدة الرابط التالي') || t.title.startsWith('استماع / مشاهدة'))) {
      existingLinkKeys.add(`${t.day}-${url.toLowerCase()}`);
    }
  });

  // 2. Second pass: process all tasks
  tasks.forEach((task) => {
    // If this is already an explicit link task
    if (task.title.includes('استماع / مشاهدة الرابط التالي') || task.title.startsWith('استماع / مشاهدة')) {
      const url = task.linkUrl || extractFirstUrl(task.title) || extractFirstUrl(task.details) || extractFirstUrl(task.notes);
      result.push({
        ...task,
        linkUrl: url || task.linkUrl,
        linkTitle: task.linkTitle || 'فتح واستماع / مشاهدة الرابط ↗',
      });
      return;
    }

    // Find all URLs inside this task
    const urlsInDetails = extractAllUrls(task.details);
    const urlsInNotes = extractAllUrls(task.notes);
    const urlsInTitle = extractAllUrls(task.title);
    const directUrl = task.linkUrl ? [task.linkUrl] : [];

    const allUrls = Array.from(new Set([...directUrl, ...urlsInTitle, ...urlsInDetails, ...urlsInNotes]));

    if (allUrls.length === 0) {
      result.push(task);
      return;
    }

    // Determine subject name
    const subjectName = subjectMap.get(task.subjectId) || (task.subjectId ? task.subjectId.toUpperCase() : 'المادة');

    // Clean title from the raw URL
    let cleanedTitle = task.title;
    allUrls.forEach((u) => {
      cleanedTitle = cleanedTitle.replace(u, '').replace(/(?:رابط|link|فيديو|video|url)[:\s-]*/gi, '').trim();
    });

    const lessonTitle = cleanedTitle.length > 2 ? cleanedTitle : subjectName;
    const hasSubstantiveTask = cleanedTitle.length > 2 || (task.pages && task.pages.length > 0);

    // Keep the main task if it had substantive non-link content (e.g. homework, pages)
    if (hasSubstantiveTask) {
      result.push({
        ...task,
        title: cleanedTitle || task.title,
      });
    }

    // Create a separate distinct task for each URL
    allUrls.forEach((url, idx) => {
      const linkKey = `${task.day}-${url.toLowerCase()}`;
      if (existingLinkKeys.has(linkKey)) return;
      existingLinkKeys.add(linkKey);

      const linkTaskTitle = `استماع / مشاهدة الرابط التالي: ${lessonTitle}`;
      const isVid = isVideoUrl(url);
      const isAud = isAudioUrl(url);
      const actionLabel = isVid
        ? 'مشاهدة الفيديو والشرح ↗'
        : isAud
        ? 'استماع التسجيل الصوتي ↗'
        : 'فتح واستماع / مشاهدة الرابط ↗';

      result.push({
        id: `link-task-${task.id || Date.now()}-${idx}`,
        day: task.day,
        subjectId: task.subjectId,
        section: task.section,
        period: task.period,
        type: 'study',
        title: linkTaskTitle,
        details: task.details ? `رابط متابعة وشرح: ${url}` : `رابط تفاعلي لشرح ومتابعة الدرس: ${url}`,
        linkUrl: url,
        linkTitle: actionLabel,
        isDone: false,
        createdAt: Date.now(),
      });
    });
  });

  return result;
}

/**
 * Parses raw text lines from a Weekly Plan, identifying days, subjects, tasks,
 * and automatically extracting any URLs into separate actionable tasks.
 */
export function parseWeeklyPlanTextWithLinks(
  rawText: string,
  defaultDay: DayOfWeek,
  subjects: Subject[],
  targetSection?: GradeSection
): PlanTask[] {
  if (!rawText || !rawText.trim()) return [];

  // Normalize common table exports while preserving the original row text.
  // This keeps every cell/detail available to the student instead of reducing
  // a row to only the first detected phrase.
  const lines = rawText
    .replace(/\r/g, '')
    .split('\n')
    .flatMap((line) => line.includes('\t') ? [line, ...line.split('\t').filter(Boolean)] : [line])
    .map((l) => l.trim())
    .filter(Boolean);
  const tasks: PlanTask[] = [];
  let currentDay = defaultDay;

  lines.forEach((line, index) => {
    const lower = line.toLowerCase();

    // Check for day change
    if (lower.includes('الأحد') || lower.includes('sunday')) currentDay = 'sunday';
    else if (lower.includes('الإثنين') || lower.includes('الاثنين') || lower.includes('monday')) currentDay = 'monday';
    else if (lower.includes('الثلاثاء') || lower.includes('tuesday')) currentDay = 'tuesday';
    else if (lower.includes('الأربعاء') || lower.includes('الاربعاء') || lower.includes('wednesday')) currentDay = 'wednesday';
    else if (lower.includes('الخميس') || lower.includes('thursday')) currentDay = 'thursday';
    else if (lower.includes('الجمعة') || lower.includes('friday')) currentDay = 'friday';

    const isDayOnlyHeader = /^(الأحد|الاحد|الإثنين|الاثنين|الثلاثاء|الأربعاء|الاربعاء|الخميس|الجمعة|sunday|monday|tuesday|wednesday|thursday|friday)\s*[:：-]?$/i.test(line);
    if (isDayOnlyHeader) return;

    // Match Subject
    let matchedSubject = subjects.find((s) => s.id === 'math');
    if (lower.includes('math') || lower.includes('رياضيات') || lower.includes('حساب')) {
      matchedSubject = subjects.find((s) => s.id === 'math');
    } else if (lower.includes('english') || lower.includes('انجليزي') || lower.includes('إنجليزي') || lower.includes('connect')) {
      matchedSubject = subjects.find((s) => s.id === 'english');
    } else if (lower.includes('science') || lower.includes('علوم') || lower.includes('discover')) {
      matchedSubject = subjects.find((s) => s.id === 'science');
    } else if (lower.includes('français') || lower.includes('francais') || lower.includes('french') || lower.includes('فرنساوي') || lower.includes('فرنسي')) {
      matchedSubject = subjects.find((s) => s.id === 'french');
    } else if (lower.includes('arabic') || lower.includes('عربي') || lower.includes('لغة عربية')) {
      matchedSubject = subjects.find((s) => s.id === 'arabic');
    } else if (lower.includes('social') || lower.includes('دراسات')) {
      matchedSubject = subjects.find((s) => s.id === 'social_studies');
    } else if (lower.includes('دين') || lower.includes('religion') || lower.includes('تربية دينية') || lower.includes('islamic')) {
      matchedSubject = subjects.find((s) => s.id === 'religion');
    } else if (lower.includes('ict') || lower.includes('computer') || lower.includes('حاسب') || lower.includes('تكنولوجيا')) {
      matchedSubject = subjects.find((s) => s.id === 'ict');
    } else if (lower.includes('art') || lower.includes('رسم') || lower.includes('فنية')) {
      matchedSubject = subjects.find((s) => s.id === 'arts');
    } else if (lower.includes('music') || lower.includes('موسيقى')) {
      matchedSubject = subjects.find((s) => s.id === 'music');
    } else if (lower.includes('pe') || lower.includes('رياضة') || lower.includes('بدنية')) {
      matchedSubject = subjects.find((s) => s.id === 'pe');
    }

    // Task Type
    let taskType: TaskType = 'homework';
    if (lower.includes('إملاء') || lower.includes('املاء') || lower.includes('spelling') || lower.includes('dictation')) {
      taskType = 'dictation';
    } else if (lower.includes('مذاكرة') || lower.includes('حفظ') || lower.includes('study') || lower.includes('قراءة')) {
      taskType = 'study';
    } else if (lower.includes('كويز') || lower.includes('امتحان') || lower.includes('quiz') || lower.includes('test')) {
      taskType = 'quiz';
    } else if (lower.includes('أدوات') || lower.includes('احضار') || lower.includes('supplies')) {
      taskType = 'supplies';
    } else if (lower.includes('classwork') || lower.includes('شرح') || lower.includes('داخل الفصل')) {
      taskType = 'classwork';
    }

    // Extract pages
    const pageMatch = line.match(/(?:p\.|page|صفحة|ص|pages)\s*([0-9\u0660-\u0669]+(?:\s*[-–toإلى]\s*[0-9\u0660-\u0669]+)?)/i);
    const pages = pageMatch ? pageMatch[0] : undefined;

    // Check for URLs
    const urls = extractAllUrls(line);

    // Clean only the structural prefix; keep the complete source row in details.
    let title = line;
    const colonIndex = line.indexOf(':');
    if (colonIndex > -1 && colonIndex < 80) {
      title = line.slice(colonIndex + 1).trim();
    } else {
      const columns = line.split(/\t|\s{2,}|\s*[|]\s*/).map((part) => part.trim()).filter(Boolean);
      if (columns.length > 1) title = columns.slice(1).join(' — ');
    }

    const looksLikeHeader = /^(الخطة|weekly plan|day|اليوم|المادة|subject)\b/i.test(title);
    if (title.length > 2 && !looksLikeHeader) {
      tasks.push({
        id: `raw-task-${Date.now()}-${index}`,
        day: currentDay,
        subjectId: matchedSubject?.id || 'math',
        section: targetSection,
        type: taskType,
        title,
        pages,
        linkUrl: urls[0] || undefined,
        // Preserve the complete original row so no homework/revision cell is lost.
        details: urls.length > 0
          ? `${line}\nرابط مرفق: ${urls.join(', ')}`
          : line,
        isDone: false,
        createdAt: Date.now(),
      });
    }
  });

  return processTasksAndExtractLinkTasks(tasks, subjects);
}

