import { getDocument, GlobalWorkerOptions } from 'pdfjs-dist';
import pdfWorker from 'pdfjs-dist/build/pdf.worker.min.mjs?url';

GlobalWorkerOptions.workerSrc = pdfWorker;

export interface ExtractedPlan {
  subject?: string;
  classwork: string;
  homework: string;
  rawText?: string;
}

const CLASSWORK_HEADER = /(?:class\s*work|classwork|what\s+we\s+learned|تم\s*تدريسه|ما\s*تم\s*تدريسه|نشاط\s*اليوم|الصف|الفصل)\s*[:：\-–]?/i;
const HOMEWORK_HEADER = /(?:home\s*work|homework|assignment|واجب(?:ات)?|الواجب(?:ات)?|hw)\s*[:：\-–]?/i;
const SECTION_HEADER = /(?:class\s*work|classwork|what\s+we\s+learned|تم\s*تدريسه|ما\s*تم\s*تدريسه|نشاط\s*اليوم|الصف|الفصل|home\s*work|homework|assignment|واجب(?:ات)?|الواجب(?:ات)?|hw|notes?|الملاحظات|session|الحصة)\s*[:：\-–]?/i;

const clean = (value: string) => value.replace(/\s+/g, ' ').trim();

const sectionAfter = (text: string, header: RegExp, fallback: string) => {
  const match = header.exec(text);
  if (!match) return fallback;
  const start = match.index + match[0].length;
  const remainder = text.slice(start);
  const next = remainder.search(SECTION_HEADER);
  return clean(remainder.slice(0, next >= 0 ? next : remainder.length)) || fallback;
};

export async function parseWeeklyPlanPDF(fileOrUrl: File | string): Promise<ExtractedPlan> {
  const arrayBuffer = typeof fileOrUrl === 'string'
    ? await (await fetch(fileOrUrl)).arrayBuffer()
    : await fileOrUrl.arrayBuffer();

  const pdf = await getDocument({ data: new Uint8Array(arrayBuffer) }).promise;
  const pages: string[] = [];
  for (let pageNumber = 1; pageNumber <= pdf.numPages; pageNumber += 1) {
    const page = await pdf.getPage(pageNumber);
    const textContent = await page.getTextContent();
    pages.push(textContent.items
      .map((item) => ('str' in item ? item.str : ''))
      .filter(Boolean)
      .join(' '));
  }

  const rawText = pages.join('\n').trim();
  const subject = rawText.match(/(?:subject|المادة)\s*[:：\-–]?\s*([^\n]+)/i)?.[1]?.trim();
  return {
    subject,
    classwork: sectionAfter(rawText, CLASSWORK_HEADER, rawText.slice(0, 200) || 'لا يوجد كلاس وورك مستخرج تلقائياً'),
    homework: sectionAfter(rawText, HOMEWORK_HEADER, 'لم يتم العثور على واجب مستخرج تلقائياً'),
    rawText
  };
}
