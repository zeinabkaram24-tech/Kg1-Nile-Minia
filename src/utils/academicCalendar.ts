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
 * Every time the user opens or refreshes the application:
 * - On school days (Sunday, Monday, Tuesday, Wednesday, Thursday): Opens directly to that exact day in the current week.
 * - On weekends (Friday & Saturday): Since the previous school week is finished, advances immediately to the NEW upcoming week,
 *   defaulting to 'Sunday' (the first day of lessons in the new week).
 */
export function getAutoDetectedToday(customDate?: Date): AcademicDateInfo {
  const date = customDate || new Date();
  const dayOfWeek = date.getDay(); // 0 = Sun, 1 = Mon, 2 = Tue, 3 = Wed, 4 = Thu, 5 = Fri, 6 = Sat
  const d = date.getDate();
  const m = date.getMonth() + 1; // 1-indexed (9 = Sept, 10 = Oct, etc.)

  // Map day of week to school days:
  // On Friday (5) & Saturday (6): Weekend! Transitions directly to Sunday of the new upcoming week
  let day: SchoolDay = 'Sunday';
  if (dayOfWeek === 1) day = 'Monday';
  else if (dayOfWeek === 2) day = 'Tuesday';
  else if (dayOfWeek === 3) day = 'Wednesday';
  else if (dayOfWeek === 4) day = 'Thursday';
  else day = 'Sunday'; // Friday, Saturday, Sunday

  const dayNamesAr: Record<SchoolDay, string> = {
    Sunday: 'الأحد',
    Monday: 'الاثنين',
    Tuesday: 'الثلاثاء',
    Wednesday: 'الأربعاء',
    Thursday: 'الخميس',
    Saturday: 'السبت',
  };

  // Academic Calendar mapping for Topic & Week (Nile International School - Term 1)
  // Each academic week starts on Friday (prepping the new week over the weekend) through Thursday:
  let topic = 1;
  let week = 1;

  if (m === 9) {
    topic = 1;
    if (d < 18) {
      week = 1; // 13/9 - 17/9
    } else if (d < 25) {
      week = 2; // 18/9 - 24/9 (starts Friday 18/9)
    } else {
      week = 3; // 25/9 - 30/9 (starts Friday 25/9)
    }
  } else if (m === 10) {
    if (d === 1) {
      topic = 1;
      week = 3; // Thursday 1/10 of Week 3
    } else if (d < 9) {
      topic = 1;
      week = 4; // 2/10 - 8/10 (starts Friday 2/10)
    } else if (d < 16) {
      topic = 2;
      week = 1; // 9/10 - 15/10 (starts Friday 9/10)
    } else if (d < 23) {
      topic = 2;
      week = 2; // 16/10 - 22/10 (starts Friday 16/10)
    } else if (d < 30) {
      topic = 2;
      week = 3; // 23/10 - 29/10 (starts Friday 23/10)
    } else {
      topic = 2;
      week = 4; // 30/10 - 31/10 (starts Friday 30/10)
    }
  } else if (m === 11) {
    if (d <= 5) {
      topic = 2;
      week = 4; // 1/11 - 5/11 (ends Thursday 5/11)
    } else if (d < 13) {
      topic = 3;
      week = 1; // 6/11 - 12/11 (starts Friday 6/11)
    } else if (d < 20) {
      topic = 3;
      week = 2; // 13/11 - 19/11 (starts Friday 13/11)
    } else if (d < 27) {
      topic = 3;
      week = 3; // 20/11 - 26/11 (starts Friday 20/11)
    } else {
      topic = 3;
      week = 4; // 27/11 - 30/11 (starts Friday 27/11)
    }
  } else if (m === 12) {
    if (d <= 3) {
      topic = 3;
      week = 4; // 1/12 - 3/12 (ends Thursday 3/12)
    } else if (d < 11) {
      topic = 4;
      week = 1; // 4/12 - 10/12 (starts Friday 4/12)
    } else if (d < 18) {
      topic = 4;
      week = 2; // 11/12 - 17/12 (starts Friday 11/12)
    } else if (d < 25) {
      topic = 4;
      week = 3; // 18/12 - 24/12 (starts Friday 18/12)
    } else {
      topic = 4;
      week = 4; // 25/12 - 31/12 (starts Friday 25/12)
    }
  } else {
    // Default fallback
    topic = 1;
    week = 3;
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
