import { ClassId, ParsedWeeklyPlanResponse } from '../types';
import {
  smartParseWeeklyPlan,
  cleanAndValidatePlanResult,
} from '../utils/smartWeeklyPlanParser';

export async function parseWeeklyPlanWithAI(
  planText: string,
  classId: ClassId,
  subjectHint?: string
): Promise<ParsedWeeklyPlanResponse> {
  try {
    const response = await fetch('/api/parse-weekly-plan', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ planText, classId, subjectHint }),
    });

    if (!response.ok) {
      throw new Error(`Server returned ${response.status}`);
    }

    const data = await response.json();
    const validated = cleanAndValidatePlanResult(
      {
        classwork: Array.isArray(data.classwork) ? data.classwork : [],
        homework: Array.isArray(data.homework) ? data.homework : [],
        tomorrowNotes: Array.isArray(data.tomorrowNotes) ? data.tomorrowNotes : [],
      },
      classId,
      subjectHint
    );

    // If server returned zero or empty, fall back to smart local parser
    if (validated.classwork.length === 0 && validated.homework.length === 0) {
      return smartParseWeeklyPlan(planText, classId, subjectHint);
    }

    return validated;
  } catch (err) {
    console.warn('Network call failed, using smart client parser fallback:', err);
    return smartParseWeeklyPlan(planText, classId, subjectHint);
  }
}

