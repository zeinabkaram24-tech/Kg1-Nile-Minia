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

/**
 * Sends a PDF or Base64 image to the server-side Gemini proxy endpoint and returns structured JSON.
 */
export async function extractWeeklyPlanWithGemini(
  fileBase64: string,
  mimeType: WeeklyPlanMimeType
): Promise<WeeklyPlanExtraction> {
  const response = await fetch('/api/extract-weekly-plan', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ fileBase64, mimeType }),
  });

  if (!response.ok) {
    const errData = await response.json().catch(() => ({}));
    throw new Error(errData.error || `Failed to extract plan: ${response.statusText}`);
  }

  const data = await response.json();
  return {
    items: (data.items || []).map((item: any) => ({
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
