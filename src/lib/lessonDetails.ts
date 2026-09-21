import { WeeklyPlanItem } from '../types';

export interface LessonDetails {
  classwork: string;
  homework: string;
  pdfUrl: string | null;
}

/**
 * Returns the classwork, homework, and PDF attachment for one lesson.
 *
 * The compact integration fields are preferred, while the existing persisted
 * fields are used as a fallback for plans created by older app versions.
 */
export const getLessonDetails = (
  weeklyPlans: WeeklyPlanItem[],
  day: string,
  subject: string,
  weekNumber: number
): LessonDetails => {
  const currentPlan = weeklyPlans.find(
    (plan) =>
      plan.weekNumber === weekNumber &&
      plan.day === day &&
      plan.subject === subject
  );

  return {
    classwork: currentPlan?.classwork || currentPlan?.classworkNote || 'لا يوجد كلاس وورك مدخل',
    homework: currentPlan?.homework || currentPlan?.homeworkNote || 'لا يوجد هوم وورك',
    pdfUrl: currentPlan?.pdfUrl || currentPlan?.fileDataUrl || null
  };
};
