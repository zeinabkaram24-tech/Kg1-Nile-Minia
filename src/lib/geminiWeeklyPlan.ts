import { GoogleGenAI, Type } from '@google/genai';
import { useMemo, useState } from 'react';

export interface WeeklyPlanRow {
  day: string;
  subject: string;
  classWork: string;
  homeWork: string;
  notes: string;
}

export interface WeeklyPlanExtraction {
  items: WeeklyPlanRow[];
}

export type WeeklyPlanMimeType = 'application/pdf' | 'image/png' | 'image/jpeg' | 'image/webp';

/** JSON schema returned by Gemini for every uploaded weekly-plan document. */
export const WEEKLY_PLAN_RESPONSE_SCHEMA = {
  type: Type.OBJECT,
  properties: {
    items: {
      type: Type.ARRAY,
      items: {
        type: Type.OBJECT,
        properties: {
          day: { type: Type.STRING, description: 'Day name exactly as visible in the document.' },
          subject: { type: Type.STRING, description: 'Subject name exactly as visible in the document.' },
          classWork: { type: Type.STRING, description: 'Classwork or lesson content. Empty string when absent.' },
          homeWork: { type: Type.STRING, description: 'Homework content. Empty string when absent.' },
          notes: { type: Type.STRING, description: 'Other notes, materials, pages, or preparation. Empty string when absent.' }
        },
        required: ['day', 'subject', 'classWork', 'homeWork', 'notes'],
        propertyOrdering: ['day', 'subject', 'classWork', 'homeWork', 'notes']
      }
    }
  },
  required: ['items'],
  propertyOrdering: ['items']
} as const;

function getGeminiClient(): GoogleGenAI {
  const apiKey = import.meta.env.VITE_GEMINI_API_KEY || import.meta.env.GEMINI_API_KEY;
  if (!apiKey) {
    throw new Error('Missing VITE_GEMINI_API_KEY. Add it to .env.local before analyzing a file.');
  }
  return new GoogleGenAI({ apiKey });
}

function stripDataUrl(base64: string): string {
  return base64.includes(',') ? base64.slice(base64.indexOf(',') + 1) : base64;
}

/**
 * Sends a PDF or Base64 image to Gemini 2.5 Flash and returns strict structured JSON.
 * The browser client requires the API key to be supplied through VITE_GEMINI_API_KEY.
 */
export async function extractWeeklyPlanWithGemini(
  fileBase64: string,
  mimeType: WeeklyPlanMimeType
): Promise<WeeklyPlanExtraction> {
  const ai = getGeminiClient();
  const response = await ai.models.generateContent({
    model: 'gemini-2.5-flash',
    contents: [{
      role: 'user',
      parts: [
        {
          text: [
            'Read the uploaded weekly school plan carefully.',
            'Return one item for every visible subject/day combination.',
            'Preserve the original language (Arabic or English).',
            'Do not invent missing values; use an empty string.',
            'Return exactly three classified fields for every row: classWork, homeWork, and notes (the Tomorrow field).',
            'Put lesson explanations in classWork, assignments in homeWork, and notes such as tomorrow preparation, materials, pages, or reminders in notes.',
            'Copy the visible text faithfully; do not summarize, translate, or invent content.'
          ].join(' ')
        },
        { inlineData: { data: stripDataUrl(fileBase64), mimeType } }
      ]
    }],
    config: {
      responseMimeType: 'application/json',
      responseSchema: WEEKLY_PLAN_RESPONSE_SCHEMA,
      temperature: 0
    }
  });

  const text = response.text?.trim();
  if (!text) throw new Error('Gemini returned an empty extraction response.');
  const parsed = JSON.parse(text) as WeeklyPlanExtraction;
  return {
    items: (parsed.items || []).map((item) => ({
      day: String(item.day || '').trim(),
      subject: String(item.subject || '').trim(),
      classWork: String(item.classWork || '').trim(),
      homeWork: String(item.homeWork || '').trim(),
      notes: String(item.notes || '').trim()
    }))
  };
}

/** Returns rows for the next school day relative to the supplied date. */
export function getTomorrowPlan(items: WeeklyPlanRow[], today = new Date()): WeeklyPlanRow[] {
  const schoolDays = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday'];
  const arabicDays = ['الأحد', 'الإثنين', 'الثلاثاء', 'الأربعاء', 'الخميس'];
  const dayIndex = today.getDay();
  const tomorrowIndex = schoolDays.indexOf(schoolDays[dayIndex]) >= 0
    ? (schoolDays.indexOf(schoolDays[dayIndex]) + 1) % schoolDays.length
    : 0;
  const targets = [schoolDays[tomorrowIndex].toLowerCase(), arabicDays[tomorrowIndex]];
  return items.filter((item) => targets.some((target) => item.day.toLowerCase().includes(target.toLowerCase())));
}

export function splitWeeklyPlanForState(items: WeeklyPlanRow[]) {
  return {
    classWork: items.filter((item) => item.classWork.trim()),
    homeWork: items.filter((item) => item.homeWork.trim()),
    notes: items.filter((item) => item.notes.trim())
  };
}

export function useWeeklyPlanGemini() {
  const [items, setItems] = useState<WeeklyPlanRow[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [sourceFileName, setSourceFileName] = useState<string | null>(null);

  const analyzeFile = async (file: File) => {
    setLoading(true);
    setError(null);
    try {
      const result = await extractWeeklyPlanFromFile(file);
      setItems(result.items);
      setSourceFileName(file.name);
      return result.items;
    } catch (cause) {
      const message = cause instanceof Error ? cause.message : 'Could not analyze the weekly plan.';
      setError(message);
      throw cause;
    } finally {
      setLoading(false);
    }
  };

  const tomorrow = useMemo(() => getTomorrowPlan(items), [items]);
  const sections = useMemo(() => splitWeeklyPlanForState(items), [items]);

  return { items, setItems, sections, tomorrow, loading, error, sourceFileName, analyzeFile };
}

export async function extractWeeklyPlanFromFile(file: File): Promise<WeeklyPlanExtraction> {
  const base64 = await new Promise<string>((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result));
    reader.onerror = () => reject(reader.error || new Error('Could not read file.'));
    reader.readAsDataURL(file);
  });
  const mimeType = (file.type || 'application/pdf') as WeeklyPlanMimeType;
  return extractWeeklyPlanWithGemini(base64, mimeType);
}

export default extractWeeklyPlanWithGemini;
