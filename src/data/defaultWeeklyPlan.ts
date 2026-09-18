import { ClassId, SchoolDay, ClassworkEntry, HomeworkEntry, TomorrowSpecialNote } from '../types';

export type { TomorrowSpecialNote };
export type { TomorrowSpecialNote as SpecialTeacherNote };

/**
 * Parent Notice exactly from the Arabic Weekly Plan:
 * "ضرورة استماع الطفل لروابط الفيديوهات المرسلة لتنمية مهارة الاستماع لدى الطفل."
 */
const KG1_CLASSES: ClassId[] = ['KG1A', 'KG1B', 'KG1C', 'KG1D', 'KG1E'];

export const SPECIAL_TEACHER_NOTES: TomorrowSpecialNote[] = [];

/**
 * Weekly Plan Classwork
 * Topic: ما أروعني | Week 1: 13/9/2026 - 17/9/2026
 * Strictly matching the Arabic Weekly Plan document with zero additions.
 */
export const WEEK1_CLASSWORK: ClassworkEntry[] = KG1_CLASSES.flatMap((cls) => [
  // Sunday (الأحد 13/9/2026)
  {
    id: `cw-${cls.toLowerCase()}-sun-ar`,
    classId: cls,
    day: 'Sunday',
    period: 1,
    subject: 'Arabic',
    title: 'استقبال الأطفال والتعرف على حجرة الدراسة والمدرسة',
    completed: false,
    block: 1,
    week: 1,
  },

  // Monday (الإثنين 14/9/2026)
  {
    id: `cw-${cls.toLowerCase()}-mon-ar`,
    classId: cls,
    day: 'Monday',
    period: 1,
    subject: 'Arabic',
    title: 'أستقبال الأطفال\nالعودة إلى المدرسة',
    completed: false,
    block: 1,
    week: 1,
  },

  // Tuesday (الثلاثاء 15/9/2026)
  {
    id: `cw-${cls.toLowerCase()}-tue-ar`,
    classId: cls,
    day: 'Tuesday',
    period: 1,
    subject: 'Arabic',
    title: 'التعرف على الروتين اليومي\nالتعرف على أنواع الخطوط',
    pages: 'حل ورق العمل ص 3 \\ 4 \\ 5',
    completed: false,
    block: 1,
    week: 1,
    links: [
      {
        url: 'https://youtu.be/yPKU5pjBgts?si=y2boOfPVrrTyeLuz',
        title: 'https://youtu.be/yPKU5pjBgts?si=y2boOfPVrrTyeLuz',
        type: 'video',
      },
      {
        url: 'https://youtu.be/WP8wRNwZmCo?si=OytpY8mViq_V2-Rl',
        title: 'https://youtu.be/WP8wRNwZmCo?si=OytpY8mViq_V2-Rl',
        type: 'video',
      },
    ],
  },

  // Wednesday (الأربعاء 16/9/2026) - Period 5
  {
    id: `cw-${cls.toLowerCase()}-wed-ar`,
    classId: cls,
    day: 'Wednesday',
    period: 5,
    subject: 'Arabic',
    title: 'التعرف على القواعد الصفية و التعرف على حجرات المدرسة',
    pages: 'حل ورق العمل ص 6',
    completed: false,
    block: 1,
    week: 1,
    links: [
      {
        url: 'https://youtu.be/5kU7OcIX7BY?si=7xef9jFupDxvBBt0',
        title: 'https://youtu.be/5kU7OcIX7BY?si=7xef9jFupDxvBBt0',
        type: 'video',
      },
      {
        url: 'https://youtu.be/TCiQ8F2xdvQ?si=Ib5Sq_w_0n0QzFCZ',
        title: 'https://youtu.be/TCiQ8F2xdvQ?si=Ib5Sq_w_0n0QzFCZ',
        type: 'video',
      },
    ],
  },

  // Thursday (الخميس 17/9/2026)
  {
    id: `cw-${cls.toLowerCase()}-thu-ar`,
    classId: cls,
    day: 'Thursday',
    period: 1,
    subject: 'Arabic',
    title: 'التعرف على الرقم 1',
    pages: 'حل ورق العمل ص 7',
    completed: false,
    block: 1,
    week: 1,
    links: [
      {
        url: 'https://youtu.be/ocwAHmoHkMk?si=d8Is97zI_9gzfiws',
        title: 'https://youtu.be/ocwAHmoHkMk?si=d8Is97zI_9gzfiws',
        type: 'video',
      },
    ],
  },
]);

/**
 * Weekly Plan Homework
 * Topic: ما أروعني | Week 1: 14/9/2026 - 17/9/2026
 * Strictly from the "الواجب المنزلي" column of the Arabic Weekly Plan.
 * Only the YouTube links without page numbers or extra text.
 */
export const WEEK1_BASE_HOMEWORK: HomeworkEntry[] = KG1_CLASSES.flatMap((cls) => [
  // Tuesday Homework (واجب يوم الثلاثاء 15/9)
  {
    id: `hw-${cls.toLowerCase()}-tue-ar`,
    classId: cls,
    assignedDay: 'Tuesday',
    dueDay: 'Wednesday',
    subject: 'Arabic',
    task: 'https://youtu.be/WP8wRNwZmCo?si=OytpY8mViq_V2-Rl',
    completed: false,
    priority: 'normal',
    block: 1,
    week: 1,
    linkUrl: 'https://youtu.be/WP8wRNwZmCo?si=OytpY8mViq_V2-Rl',
    linkTitle: 'https://youtu.be/WP8wRNwZmCo?si=OytpY8mViq_V2-Rl',
    links: [
      {
        url: 'https://youtu.be/WP8wRNwZmCo?si=OytpY8mViq_V2-Rl',
        title: 'https://youtu.be/WP8wRNwZmCo?si=OytpY8mViq_V2-Rl',
        type: 'video',
      },
    ],
  },

  // Wednesday Homework (واجب يوم الأربعاء 16/9)
  {
    id: `hw-${cls.toLowerCase()}-wed-ar`,
    classId: cls,
    assignedDay: 'Wednesday',
    dueDay: 'Thursday',
    subject: 'Arabic',
    task: 'https://youtu.be/5kU7OcIX7BY?si=7xef9jFupDxvBBt0',
    completed: false,
    priority: 'normal',
    block: 1,
    week: 1,
    linkUrl: 'https://youtu.be/5kU7OcIX7BY?si=7xef9jFupDxvBBt0',
    linkTitle: 'https://youtu.be/5kU7OcIX7BY?si=7xef9jFupDxvBBt0',
    links: [
      {
        url: 'https://youtu.be/5kU7OcIX7BY?si=7xef9jFupDxvBBt0',
        title: 'https://youtu.be/5kU7OcIX7BY?si=7xef9jFupDxvBBt0',
        type: 'video',
      },
    ],
  },

  // Thursday Homework (واجب يوم الخميس 17/9)
  {
    id: `hw-${cls.toLowerCase()}-thu-ar`,
    classId: cls,
    assignedDay: 'Thursday',
    dueDay: 'Sunday',
    subject: 'Arabic',
    task: 'https://youtu.be/ocwAHmoHkMk?si=d8Is97zI_9gzfiws',
    completed: false,
    priority: 'normal',
    block: 1,
    week: 1,
    linkUrl: 'https://youtu.be/ocwAHmoHkMk?si=d8Is97zI_9gzfiws',
    linkTitle: 'https://youtu.be/ocwAHmoHkMk?si=d8Is97zI_9gzfiws',
    links: [
      {
        url: 'https://youtu.be/ocwAHmoHkMk?si=d8Is97zI_9gzfiws',
        title: 'https://youtu.be/ocwAHmoHkMk?si=d8Is97zI_9gzfiws',
        type: 'video',
      },
    ],
  },
]);

import { WEEK2_CLASSWORK, ALL_LINK_AND_WEEK2_HOMEWORK } from './week2Plan';

export const INITIAL_CLASSWORK: ClassworkEntry[] = [...WEEK1_CLASSWORK, ...WEEK2_CLASSWORK];
export const INITIAL_HOMEWORK: HomeworkEntry[] = [...WEEK1_BASE_HOMEWORK, ...ALL_LINK_AND_WEEK2_HOMEWORK];

