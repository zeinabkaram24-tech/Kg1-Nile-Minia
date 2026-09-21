import { getDocument, GlobalWorkerOptions } from 'pdfjs-dist';
import pdfWorker from 'pdfjs-dist/build/pdf.worker.min.mjs?url';
import { PeriodSlot, DaySchedule, SchoolClass } from '../types';
import { PERIOD_TIMES } from '../data/initialData';
import { createWorker } from 'tesseract.js';

GlobalWorkerOptions.workerSrc = pdfWorker;

const DAY_NAMES = [
  { ar: 'الأحد' as const, en: 'Sunday', aliases: ['الأحد', 'الاحد', 'sunday', 'sun'] },
  { ar: 'الإثنين' as const, en: 'Monday', aliases: ['الإثنين', 'الاثنين', 'monday', 'mon'] },
  { ar: 'الثلاثاء' as const, en: 'Tuesday', aliases: ['الثلاثاء', 'tuesday', 'tue'] },
  { ar: 'الأربعاء' as const, en: 'Wednesday', aliases: ['الأربعاء', 'الاربعاء', 'wednesday', 'wed'] },
  { ar: 'الخميس' as const, en: 'Thursday', aliases: ['الخميس', 'thursday', 'thu'] },
];

const SUBJECT_KEYWORDS: Record<string, string[]> = {
  english: ['english', 'انجليزي', 'إنجليزي', 'انجلش', 'لغة إنجليزية', 'لغة انجليزية', 'eng'],
  math: ['math', 'ماث', 'رياضيات', 'حساب', 'mathematics'],
  science: ['science', 'ساينس', 'علوم', 'sci'],
  arabic: ['arabic', 'عربي', 'لغة عربية', 'لغه عربيه', 'تواصل'],
  social: ['social', 'دراسات', 'دراسات اجتماعية', 'سوشيال'],
  french: ['french', 'فرنساوي', 'فرنسي', 'لغة فرنسية', 'français', 'francais'],
  ict: ['ict', 'حاسب', 'كمبيوتر', 'تكنولوجيا', 'computer'],
  art: ['art', 'رسم', 'تربية فنية', 'فنية'],
  pe: ['pe', 'رياضة', 'تربية بدنية', 'العاب', 'ألعاب', 'gym'],
  ethics: ['ethics', 'دين', 'تربية دينية', 'قيم', 'religion'],
  music: ['music', 'موسيقى', 'موسيقة'],
};


function identifySubject(token: string): string | null {
  const value = token.toLowerCase().trim();
  return Object.entries(SUBJECT_KEYWORDS).find(([, words]) => words.some((word) => value.includes(word)))?.[0] || null;
}

export interface ParseTimetableResult { days: DaySchedule[]; slotsCount: number; extractedTextPreview?: string; }

/** Extracts text for the interactive grid; the original PDF bytes are kept untouched and displayed separately. */
export async function extractTextFromPdf(dataUrl: string): Promise<string> {
  const raw = dataUrl.split(',')[1] || dataUrl;
  const bytes = Uint8Array.from(atob(raw), (char) => char.charCodeAt(0));
  const pdf = await getDocument({ data: bytes }).promise;
  const pages: string[] = [];
  for (let pageNumber = 1; pageNumber <= pdf.numPages; pageNumber += 1) {
    const page = await pdf.getPage(pageNumber);
    const content = await page.getTextContent();
    pages.push((content.items as Array<{ str?: string }>).map((item) => item.str || '').filter(Boolean).join('\n'));
  }
  const extracted = pages.join('\n').trim();
  if (extracted.length >= 80) return extracted;

  // Scanned PDFs have no text layer. Render each page and OCR it so Weekly Plan
  // files still produce usable Classwork, Homework, and Tomorrow content.
  const worker = await createWorker('eng+ara');
  try {
    const ocrPages: string[] = [];
    for (let pageNumber = 1; pageNumber <= pdf.numPages; pageNumber += 1) {
      const page = await pdf.getPage(pageNumber);
      const viewport = page.getViewport({ scale: 1.8 });
      const canvas = document.createElement('canvas');
      canvas.width = Math.ceil(viewport.width);
      canvas.height = Math.ceil(viewport.height);
      const context = canvas.getContext('2d');
      if (!context) continue;
      await page.render({ canvasContext: context, canvas, viewport }).promise;
      const result = await worker.recognize(canvas);
      ocrPages.push(result.data.text);
    }
    return ocrPages.join('\n').trim();
  } finally {
    await worker.terminate();
  }
}

function classSection(text: string, classId: SchoolClass): string {
  const pattern = /(?:class|فصل)\s*([2][abc])/gi;
  const matches = [...text.matchAll(pattern)];
  if (matches.length < 2) return text;
  const index = matches.findIndex((match) => match[1].toUpperCase() === classId);
  if (index < 0) return text;
  const start = matches[index].index || 0;
  const end = index + 1 < matches.length ? (matches[index + 1].index || text.length) : text.length;
  return text.slice(start, end);
}

export function parseTimetableFromText(text: string, classId: SchoolClass): ParseTimetableResult {
  const parsed: Record<string, PeriodSlot[]> = { 'الأحد': [], 'الإثنين': [], 'الثلاثاء': [], 'الأربعاء': [], 'الخميس': [] };
  let currentDay: keyof typeof parsed | null = null;
  const lines = classSection(text, classId)
    .split(/\r?\n|(?=الأحد|الاحد|الإثنين|الاثنين|الثلاثاء|الأربعاء|الاربعاء|الخميس|Sunday|Monday|Tuesday|Wednesday|Thursday)/i)
    .map((line) => line.replace(/\s+/g, ' ').trim()).filter(Boolean);

  for (const line of lines) {
    const day = DAY_NAMES.find((item) => item.aliases.some((alias) => line.toLowerCase().includes(alias.toLowerCase())));
    if (day) currentDay = day.ar;
    if (!currentDay) continue;
    const tokens = line.split(/[,;\t|:/]+|\s{2,}/).map((token) => token.trim()).filter(Boolean);
    for (const token of tokens) {
      const subjectId = identifySubject(token);
      if (!subjectId || parsed[currentDay].length >= PERIOD_TIMES.length) continue;
      const period = PERIOD_TIMES[parsed[currentDay].length];
      parsed[currentDay].push({
        id: `pdf-${classId.toLowerCase()}-${currentDay}-${period.periodNum}-${Date.now().toString(36)}`,
        periodNum: period.periodNum, time: period.time, subjectId,
        room: `Class ${classId}`
      });
    }
  }

  const days = DAY_NAMES.map((day) => ({ dayNameAr: day.ar, dayNameEn: day.en, periods: parsed[day.ar] }))
    .filter((day) => day.periods.length > 0);
  return { days, slotsCount: days.reduce((sum, day) => sum + day.periods.length, 0), extractedTextPreview: text.slice(0, 1000) };
}

export async function parseUploadedTimetable(dataUrl: string, classId: SchoolClass, fileType: string): Promise<ParseTimetableResult> {
  if (fileType === 'pdf') return parseTimetableFromText(await extractTextFromPdf(dataUrl), classId);
  if (fileType !== 'image') return { days: [], slotsCount: 0 };

  const worker = await createWorker('eng+ara');
  try {
    const result = await worker.recognize(dataUrl);
    return parseTimetableFromText(result.data.text, classId);
  } finally {
    await worker.terminate();
  }
}

export function createDefaultScheduleFromSubjects(): DaySchedule[] { return []; }
export { identifySubject };
void createDefaultScheduleFromSubjects;
