import { SchoolDay } from '../types';

export interface AcademicDateInfo {
  day: SchoolDay;
  topic: number;
  week: number;
  dayNumber: number;
  month: number;
  formattedDate: string;
  dayNameAr: string;
  topicNameAr: string;
  weekNameAr: string;
}

/**
 * Returns auto-detected day, topic, and week based on the current real-world calendar date.
 * Allows the application to open directly to today's actual date (e.g. Monday 21st, Topic 1, Week 2).
 */
export function getAutoDetectedToday(customDate?: Date): AcademicDateInfo {
  const date = customDate || new Date();
  const dayOfWeek = date.getDay(); // 0 = Sun, 1 = Mon, 2 = Tue, 3 = Wed, 4 = Thu, 5 = Fri, 6 = Sat
  const d = date.getDate();
  const m = date.getMonth() + 1; // 1-indexed (9 = Sept, 10 = Oct, etc.)

  // Map day of week to school days (Friday & Saturday map to Sunday)
  let day: SchoolDay = 'Sunday';
  if (dayOfWeek === 1) day = 'Monday';
  else if (dayOfWeek === 2) day = 'Tuesday';
  else if (dayOfWeek === 3) day = 'Wednesday';
  else if (dayOfWeek === 4) day = 'Thursday';
  else day = 'Sunday';

  const dayNamesAr: Record<SchoolDay, string> = {
    Sunday: 'الأحد',
    Monday: 'الاثنين',
    Tuesday: 'الثلاثاء',
    Wednesday: 'الأربعاء',
    Thursday: 'الخميس',
    Saturday: 'السبت',
  };

  // Academic Calendar mapping for Topic & Week (Nile International School Term 1)
  let topic = 1;
  let week = 2; // Default baseline for current September period

  if (m === 9) {
    topic = 1;
    if (d < 20) {
      week = 1; // 13/9 - 19/9
    } else if (d <= 26) {
      week = 2; // 20/9 - 26/9 (Today is 21/9 -> Topic 1 Week 2)
    } else {
      week = 3; // 27/9 - 30/9
    }
  } else if (m === 10) {
    if (d <= 3) {
      topic = 1;
      week = 3; // 1/10 - 3/10
    } else if (d <= 10) {
      topic = 1;
      week = 4; // 4/10 - 10/10
    } else if (d <= 17) {
      topic = 2;
      week = 1; // 11/10 - 17/10
    } else if (d <= 24) {
      topic = 2;
      week = 2; // 18/10 - 24/10
    } else {
      topic = 2;
      week = 3; // 25/10 - 31/10
    }
  } else if (m === 11) {
    if (d <= 7) {
      topic = 2;
      week = 4; // 1/11 - 7/11
    } else if (d <= 14) {
      topic = 3;
      week = 1; // 8/11 - 14/11
    } else if (d <= 21) {
      topic = 3;
      week = 2; // 15/11 - 21/11
    } else if (d <= 28) {
      topic = 3;
      week = 3; // 22/11 - 28/11
    } else {
      topic = 3;
      week = 4; // 29/11 - 30/11
    }
  } else if (m >= 12) {
    if (d <= 5) {
      topic = 3;
      week = 4;
    } else if (d <= 12) {
      topic = 4;
      week = 1;
    } else if (d <= 19) {
      topic = 4;
      week = 2;
    } else if (d <= 26) {
      topic = 4;
      week = 3;
    } else {
      topic = 4;
      week = 4;
    }
  }

  return {
    day,
    topic,
    week,
    dayNumber: d,
    month: m,
    formattedDate: `${d}/${m}`,
    dayNameAr: dayNamesAr[day] || 'الأحد',
    topicNameAr: `توبيك ${topic}`,
    weekNameAr: `أسبوع ${week}`,
  };
}
