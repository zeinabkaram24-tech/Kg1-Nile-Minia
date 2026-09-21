import mammoth from 'mammoth';
import { getDocument, GlobalWorkerOptions } from 'pdfjs-dist';
import pdfWorker from 'pdfjs-dist/build/pdf.worker.min.mjs?url';
import { extractTextFromPdf } from './timetableParser';

GlobalWorkerOptions.workerSrc = pdfWorker;

export const WEEKLY_PLAN_PARSER_VERSION = 9;

export interface WeeklyPlanDayContent {
  classworkNote?: string;
  homeworkNote?: string;
  tomorrowNote?: string;
}

export interface WeeklyPlanExtractedContent {
  extractedText: string;
  classworkNote?: string;
  homeworkNote?: string;
  tomorrowNote?: string;
  dayContent: Record<string, WeeklyPlanDayContent>;
}

const DAY_NAMES = [
  { ar: 'الأحد', aliases: ['الأحد', 'الاحد', 'sunday', 'sun'] },
  { ar: 'الإثنين', aliases: ['الإثنين', 'الاثنين', 'monday', 'mon'] },
  { ar: 'الثلاثاء', aliases: ['الثلاثاء', 'tuesday', 'tue'] },
  { ar: 'الأربعاء', aliases: ['الأربعاء', 'الاربعاء', 'wednesday', 'wed'] },
  { ar: 'الخميس', aliases: ['الخميس', 'thursday', 'thu'] }
];

const HEADER_PATTERNS = {
  homework: /(?:h\s*o\s*m\s*e\s*w\s*o\s*r\s*k|home\s*work|assignment|واجب(?:ات)?|الواجب(?:ات)?|hw)\s*[:：\-–]?/i,
  tomorrow: /(?:t\s*o\s*m\s*o\s*r\s*r\s*o\s*w(?:['’]s)?|next\s*day|preparation|what\s*to\s*bring|please\s+bring|\bbring\b|school\s*bag|notes?|materials?\s*(?:needed|required)|تجهيزات\s*(?:الغد|لبكرة)|مستلزمات\s*(?:الغد|لبكرة)|ملاحظات(?:\s*الغد)?|يرجى\s*إحضار|إحضار|احضار|غدًا|غدا|اليوم\s*التالي)\s*[:：\-–]?/i,
  // Do not match generic words such as "lesson" or "session": they often
  // occur in the PDF title and caused the title/details to be misclassified.
  classwork: /(?:c\s*l\s*a\s*s\s*s\s*w\s*o\s*r\s*k|class\s*work|what\s+we\s+learned|تم\s*تدريسه|ما\s*تم\s*تدريسه|نشاط\s*اليوم)\s*[:：\-–]?/i
};

const ALL_HEADERS = Object.values(HEADER_PATTERNS);

/**
 * PDF text items are not returned in visual reading order. The reference
 * project first groups items by their Y coordinate and rebuilds visual rows;
 * this is the important part of its script, not the uploaded PDF itself.
 */
async function extractWeeklyPlanPdfRows(dataUrl: string): Promise<string> {
  const raw = dataUrl.split(',')[1] || dataUrl;
  const bytes = Uint8Array.from(atob(raw), (char) => char.charCodeAt(0));
  const pdf = await getDocument({ data: bytes }).promise;
  const pages: string[] = [];

  for (let pageNumber = 1; pageNumber <= pdf.numPages; pageNumber += 1) {
    const page = await pdf.getPage(pageNumber);
    const content = await page.getTextContent();
    const rows = new Map<number, Array<{ x: number; text: string }>>();
    for (const item of content.items as Array<{ str?: string; transform?: number[] }>) {
      if (!item.str?.trim()) continue;
      const y = Math.round(item.transform?.[5] ?? 0);
      const x = item.transform?.[4] ?? 0;
      const row = rows.get(y) || [];
      row.push({ x, text: item.str.trim() });
      rows.set(y, row);
    }
    pages.push([...rows.entries()]
      .sort((a, b) => b[0] - a[0])
      .map(([, parts]) => parts.sort((a, b) => a.x - b.x).map((part) => part.text).join(' ').trim())
      .filter(Boolean)
      .join('\n'));
  }
  return pages.join('\n').trim();
}

async function extractOcrText(image: HTMLCanvasElement | string): Promise<string> {
  const { recognize } = await import('tesseract.js');
  const result = await recognize(image, 'eng+ara', { logger: () => undefined });
  return result.data.text || '';
}

async function extractWeeklyPlanOcr(dataUrl: string): Promise<string> {
  const raw = dataUrl.split(',')[1] || dataUrl;
  const pdf = await getDocument({ data: Uint8Array.from(atob(raw), (char) => char.charCodeAt(0)) }).promise;
  const pages: string[] = [];
  for (let pageNumber = 1; pageNumber <= pdf.numPages; pageNumber += 1) {
    const page = await pdf.getPage(pageNumber);
    const viewport = page.getViewport({ scale: 1.8 });
    const canvas = document.createElement('canvas');
    canvas.width = Math.ceil(viewport.width);
    canvas.height = Math.ceil(viewport.height);
    const context = canvas.getContext('2d');
    if (!context) continue;
    await page.render({ canvas, canvasContext: context, viewport }).promise;
    pages.push(await extractOcrText(canvas));
  }
  return pages.join('\n');
}

function normalize(text: string): string {
  return text
    .replace(/\u0000/g, ' ')
    .replace(/\r\n?/g, '\n')
    .replace(/[\u200e\u200f]/g, '')
    .trim();
}

function clean(value: string): string | undefined {
  const result = value.replace(/[ \t]+/g, ' ').replace(/\n{3,}/g, '\n\n').trim();
  return result || undefined;
}

function findHeader(text: string, pattern: RegExp): RegExpExecArray | null {
  const flags = pattern.flags.includes('g') ? pattern.flags : `${pattern.flags}g`;
  return new RegExp(pattern.source, flags).exec(text);
}

function classify(text: string): WeeklyPlanDayContent {
  const found = Object.entries(HEADER_PATTERNS)
    .map(([kind, pattern]) => {
      const match = findHeader(text, pattern);
      return match ? { kind: kind as keyof WeeklyPlanDayContent, index: match.index, end: match.index + match[0].length } : null;
    })
    .filter((item): item is { kind: keyof WeeklyPlanDayContent; index: number; end: number } => Boolean(item))
    .sort((a, b) => a.index - b.index);

  const result: WeeklyPlanDayContent = {};
  found.forEach((header, index) => {
    const next = found[index + 1]?.index ?? text.length;
    const content = clean(text.slice(header.end, next));
    if (content) result[header.kind] = content;
  });

  // Never use the entire document as classwork. A PDF commonly starts with a
  // title such as "Weekly Lesson Plan"; treating that title as the lesson is
  // precisely the misleading behaviour this parser must avoid.
  return result;
}

function dayFromAlias(value: string) {
  const normalized = value.toLowerCase().replace(/[.:：\-–]/g, '').trim();
  return DAY_NAMES.find((day) => day.aliases.some((alias) => alias.toLowerCase() === normalized));
}

function splitByDay(text: string): Record<string, WeeklyPlanDayContent> {
  const result: Record<string, WeeklyPlanDayContent> = {};
  const lines = text.split('\n');
  const sections: Array<{ day: string; start: number; end: number }> = [];
  lines.forEach((line, index) => {
    const match = line.match(/^\s*(الأحد|الاحد|الإثنين|الاثنين|الثلاثاء|الأربعاء|الاربعاء|الخميس|Sunday|Sun|Monday|Mon|Tuesday|Tue|Wednesday|Wed|Thursday|Thu)\s*(?:[:：\-–]|$)/i);
    const day = match ? dayFromAlias(match[1]) : undefined;
    if (day) sections.push({ day: day.ar, start: index, end: lines.length });
  });
  sections.forEach((section, index) => {
    section.end = sections[index + 1]?.start ?? lines.length;
    const dayLines = lines.slice(section.start + 1, section.end);
    const dayText = dayLines.join('\n');
    const content = classify(dayText);
    if (content.classworkNote || content.homeworkNote || content.tomorrowNote) result[section.day] = content;

    // Structured row support: when a table export contains several subjects
    // under one day, keep each subject block separately instead of merging it
    // into one day's text. Keys are consumed as `${day}|${subjectId}`.
    const subjectPatterns: Array<[string, RegExp]> = [
      ['math', /\bmath(?:ematics)?\b|رياضيات|حساب/i],
      ['english', /\benglish\b|انجليزي|إنجليزي|connect/i],
      ['science', /\bscience\b|علوم|discover/i],
      ['arabic', /\barabic\b|عربي|لغة عربية/i],
      ['french', /\bfrench\b|français|فرنسي|فرنساوي/i],
      ['social_studies', /social\s*studies|دراسات اجتماعية/i],
      ['religion', /religion|islamic|دين|تربية دينية/i],
      ['ict', /\bict\b|computer|حاسب|تكنولوجيا/i],
      ['arts', /\bart\b|رسم|فنية/i],
      ['music', /\bmusic\b|موسيقى/i],
      ['pe', /\bpe\b|physical education|رياضة|بدنية/i]
    ];
    let subjectId: string | undefined;
    let subjectStart = 0;
    dayLines.forEach((line, lineIndex) => {
      const detected = subjectPatterns.find(([, pattern]) => pattern.test(line))?.[0];
      if (!detected || detected === subjectId) return;
      if (subjectId) {
        const subjectContent = classify(dayLines.slice(subjectStart, lineIndex).join('\n'));
        if (subjectContent.classworkNote || subjectContent.homeworkNote || subjectContent.tomorrowNote) {
          result[`${section.day}|${subjectId}`] = subjectContent;
        }
      }
      subjectId = detected;
      subjectStart = lineIndex;
    });
    if (subjectId) {
      const subjectContent = classify(dayLines.slice(subjectStart).join('\n'));
      if (subjectContent.classworkNote || subjectContent.homeworkNote || subjectContent.tomorrowNote) {
        result[`${section.day}|${subjectId}`] = subjectContent;
      }
    }
  });
  return result;
}

/**
 * The Minia school template is a real table whose cells are interleaved by
 * PDF extraction. Recover its rows from the stable day/date anchors and the
 * column markers that appear in this template.
 */
function parseMiniaTable(text: string): Record<string, WeeklyPlanDayContent> | undefined {
  if (!/The\s+Weekly\s+Plan/i.test(text) || !/Resources\s*\/\s*Materials/i.test(text)) return undefined;
  const result: Record<string, WeeklyPlanDayContent> = {};
  const starts = [...text.matchAll(/\b(Sunday|Monday|Tuesday|Wednesday|Thursday)\b/gi)];
  starts.forEach((start, index) => {
    const day = start[1].toLowerCase();
    const dayKey = DAY_NAMES.find((item) => item.aliases.includes(day))?.ar;
    if (!dayKey) return;
    const rowText = text.slice(start.index || 0, starts[index + 1]?.index || text.length);
    const body = rowText
      .replace(/^(?:Sunday|Monday|Tuesday|Wednesday|Thursday)\s+/i, '')
      .replace(/^\d{1,2}\\\d{1,2}\\\d{4}/, ' ')
      .replace(/\s+/g, ' ')
      .trim();
    const content: WeeklyPlanDayContent = {};
    const classwork = body.match(/(Maths?\s*-\s*Grade\s*2[\s\S]*?Sheet\s*1\s*-\s*Main)/i)?.[1];
    const homework = body.match(/(Page\s+\d+(?:\s+\d+)?(?:\s+Q\.\s*\d+\s+only)?)/i)?.[1];
    const notes = body.match(/(Please\s+bring[\s\S]*)$/i)?.[1];
    if (classwork) content.classworkNote = clean(classwork.replace(/\s+/g, ' '));
    if (homework) content.homeworkNote = clean(homework.replace(/\s+/g, ' '));
    if (notes) content.tomorrowNote = clean(notes.replace(/\s+/g, ' '));
    if (content.classworkNote || content.homeworkNote || content.tomorrowNote) result[dayKey] = content;
  });
  return Object.keys(result).length > 0 ? result : undefined;
}

export function parseWeeklyPlanText(text: string): WeeklyPlanExtractedContent {
  const normalized = normalize(text);
  const overall = classify(normalized);
  const tableContent = parseMiniaTable(normalized);
  return {
    extractedText: normalized,
    classworkNote: overall.classworkNote,
    homeworkNote: overall.homeworkNote,
    tomorrowNote: overall.tomorrowNote,
    dayContent: tableContent || splitByDay(normalized)
  };
}

function dataUrlToArrayBuffer(dataUrl: string): ArrayBuffer {
  const raw = dataUrl.split(',')[1] || dataUrl;
  const binary = atob(raw);
  const bytes = Uint8Array.from(binary, (char) => char.charCodeAt(0));
  return bytes.buffer;
}

function dataUrlToText(dataUrl: string): string {
  const comma = dataUrl.indexOf(',');
  const header = comma >= 0 ? dataUrl.slice(0, comma) : '';
  const raw = comma >= 0 ? dataUrl.slice(comma + 1) : dataUrl;
  if (/;base64/i.test(header)) {
    return new TextDecoder().decode(Uint8Array.from(atob(raw), (char) => char.charCodeAt(0)));
  }
  return decodeURIComponent(raw);
}

function htmlToReadableText(html: string): string {
  // Preserve table rows and paragraphs before stripping markup so the same
  // day/header parser works for HTML exports as it does for PDF rows.
  const withBreaks = html
    .replace(/<\/(?:tr|p|div|li|h[1-6])\s*>/gi, '\n')
    .replace(/<br\s*\/?>/gi, '\n');
  if (typeof DOMParser !== 'undefined') {
    const doc = new DOMParser().parseFromString(withBreaks, 'text/html');
    return doc.body.textContent || '';
  }
  return withBreaks.replace(/<[^>]+>/g, ' ');
}

export async function extractWeeklyPlanText(dataUrl: string, fileType?: string): Promise<string> {
  const mime = dataUrl.match(/^data:([^;,]+)/i)?.[1]?.toLowerCase() || '';
  if (fileType === 'text' || fileType === 'txt' || mime.startsWith('text/plain')) {
    return normalize(dataUrlToText(dataUrl));
  }
  if (fileType === 'html' || fileType === 'htm' || mime.includes('html')) {
    return normalize(htmlToReadableText(dataUrlToText(dataUrl)));
  }
  if (fileType === 'image' || mime.startsWith('image/')) {
    return normalize(await extractOcrText(dataUrl));
  }
  if (fileType === 'word' || fileType === 'doc' || /word|document|msword/i.test(dataUrl.slice(0, 100))) {
    const result = await mammoth.extractRawText({ arrayBuffer: dataUrlToArrayBuffer(dataUrl) });
    return normalize(result.value);
  }
  try {
    const rowsText = await extractWeeklyPlanPdfRows(dataUrl);
    // Scanned PDFs have no meaningful text layer. Keep the existing OCR
    // fallback for those files.
    if (rowsText.length >= 40) return rowsText;
    const fallbackText = await extractTextFromPdf(dataUrl);
    if (fallbackText.trim().length >= 40) return fallbackText;
    return normalize(await extractWeeklyPlanOcr(dataUrl));
  } catch {
    try {
      const fallbackText = await extractTextFromPdf(dataUrl);
      return fallbackText.trim().length >= 40 ? fallbackText : normalize(await extractWeeklyPlanOcr(dataUrl));
    } catch {
      return '';
    }
  }
}

export function buildClassworkFromWeeklyPlan(plan: { classworkNote?: string; unitOrTheme: string }): string {
  // A plan title is metadata, not classwork. Never manufacture a lesson from
  // the file name or unit title when the source has no explicit classwork.
  return plan.classworkNote?.trim() || '';
}
