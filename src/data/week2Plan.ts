import { ClassId, SchoolDay, ClassworkEntry, HomeworkEntry } from '../types';
import { TomorrowSpecialNote } from './defaultWeeklyPlan';

const KG1_CLASSES: ClassId[] = ['KG1A', 'KG1B', 'KG1C', 'KG1D', 'KG1E'];

/**
 * Tomorrow Notes for Week 2 (Topic 1: Marvelous me | 20/9/2026 - 24/9/2026)
 * English - Mrs. Naglaa El kady & Arabic - أماني سعد كامل
 */
export const WEEK2_SPECIAL_NOTES: TomorrowSpecialNote[] = KG1_CLASSES.flatMap((cls) => [
  // Sunday 20/9/2026
  {
    classId: cls,
    targetDay: 'Sunday',
    subject: 'English',
    note: 'Carpet time: Introduction to "A First Book all About you" and songs',
    arabicNote: 'وقت السجادة (Carpet time): إحضار كتاب اللغة الإنجليزية والاستعداد لأنشطة التعارف وقصة All about you',
    bagItem: 'English Pupil Book & Activity Book',
    block: 1,
    week: 2,
  },
  {
    classId: cls,
    targetDay: 'Sunday',
    subject: 'Arabic',
    note: 'التعرف على أنواع الخطوط وحل أوراق العمل ص 8\\9',
    arabicNote: 'نشاط التعرف على أنواع الخطوط وحل أوراق العمل ص 8 و 9',
    bagItem: 'كشكول وأوراق عمل اللغة العربية',
    block: 1,
    week: 2,
  },

  // Monday 21/9/2026
  {
    classId: cls,
    targetDay: 'Monday',
    subject: 'English',
    note: 'Carpet time: Paint a face activity & Introduce number 2',
    arabicNote: 'نشاط تلوين ملامح الوجه في مكانها الصحيح والتعرف على رقم 2 (Introduce number 2)',
    bagItem: 'English Activity Book & Colors',
    block: 1,
    week: 2,
  },
  {
    classId: cls,
    targetDay: 'Monday',
    subject: 'Arabic',
    note: 'التعرف على أجزاء الجسم وحل أوراق العمل',
    arabicNote: 'نشاط التعرف على أجزاء الجسم وحل أوراق العمل ص 4',
    bagItem: 'كشكول وأوراق عمل اللغة العربية',
    block: 1,
    week: 2,
  },

  // Tuesday 22/9/2026
  {
    classId: cls,
    targetDay: 'Tuesday',
    subject: 'English',
    note: 'Talk about school items & clothing labels in English',
    arabicNote: 'الحديث عن أدوات المدرسة وقراءة بطاقات الملابس بالإنجليزية والالتزام بالتعليمات في المساحات المفتوحة',
    bagItem: 'Pencil Case & English Booklet',
    block: 1,
    week: 2,
  },
  {
    classId: cls,
    targetDay: 'Tuesday',
    subject: 'Arabic',
    note: 'التعرف على أجزاء الوجه وحل أوراق العمل',
    arabicNote: 'نشاط التعرف على أجزاء الوجه وحل أوراق العمل ص 5',
    bagItem: 'كشكول وأوراق عمل اللغة العربية',
    block: 1,
    week: 2,
  },

  // Wednesday 23/9/2026
  {
    classId: cls,
    targetDay: 'Wednesday',
    subject: 'English',
    note: 'Daily visual timetable, Red colour & Circle, Tallest/shortest teddy sheet',
    arabicNote: 'نشاط اللون الأحمر والدائرة وحل ورقة عمل الأطول والأقصر (Teddy sheet)',
    bagItem: 'English Activity Sheet & Red Crayon',
    block: 1,
    week: 2,
  },
  {
    classId: cls,
    targetDay: 'Wednesday',
    subject: 'Arabic',
    note: 'التعرف على حاسة السمع والحواس الخمسة',
    arabicNote: 'نشاط الحواس الخمسة وحاسة السمع وحل ورقة العمل ص 10',
    bagItem: 'كشكول وأوراق عمل اللغة العربية',
    block: 1,
    week: 2,
  },

  // Thursday 24/9/2026
  {
    classId: cls,
    targetDay: 'Thursday',
    subject: 'English',
    note: 'Counting games & matching children names to photographs',
    arabicNote: 'أنشطة العد أثناء اللعب ومطابقة أسماء الأطفال بصورهم الشخصية',
    bagItem: 'Child Photograph (صورة شخصية للطفل)',
    block: 1,
    week: 2,
  },
  {
    classId: cls,
    targetDay: 'Thursday',
    subject: 'Arabic',
    note: 'التعرف على الهمزة وكتابتها وحل أوراق العمل ص 11',
    arabicNote: 'نشاط التعرف على الهمزة وطريقة كتابتها وحل ورقة العمل ص 11 (ملاحظة لولي الأمر: ضرورة استماع الطفل لروابط الفيديوهات المرسلة لتنمية مهارة الاستماع)',
    bagItem: 'كشكول وأوراق عمل اللغة العربية',
    block: 1,
    week: 2,
  },
]);

/**
 * Week 2 Classwork
 * Grade: KG 1 (A, B, C, D, E)
 * Topic: Marvelous me (ما أروعني) | Week 2: 20/9/2026 - 24/9/2026
 */
export const WEEK2_CLASSWORK: ClassworkEntry[] = KG1_CLASSES.flatMap((cls) => [
  // Sunday 20/9/2026
  {
    id: `cw-${cls.toLowerCase()}-w2-sun-en`,
    classId: cls,
    day: 'Sunday',
    period: 1,
    subject: 'English',
    title: "1- A First Book all About you' by Judy Hindley\n2- Wash clothes\n3- I am a little teapot",
    pages: 'P 2, 3, 5, 8',
    completed: false,
    block: 1,
    week: 2,
    links: [
      {
        url: 'https://www.youtube.com/watch?v=Druv9MPXRl4',
        title: 'All about you story',
        type: 'video',
      },
      {
        url: 'https://www.youtube.com/watch?v=tlwwKOaml0s',
        title: "A First Book all About you' by Judy Hindley",
        type: 'video',
      },
      {
        url: 'https://www.youtube.com/watch?v=Q_EwuVHDb5U',
        title: 'Clothes video',
        type: 'video',
      },
    ],
  },
  {
    id: `cw-${cls.toLowerCase()}-w2-sun-ar`,
    classId: cls,
    day: 'Sunday',
    period: 2,
    subject: 'Arabic',
    title: 'التعرف على أنواع الخطوط',
    pages: 'أوراق العمل ص 8\\9',
    completed: false,
    block: 1,
    week: 2,
    links: [
      {
        url: 'https://youtu.be/2vqZmpnTjbI?si=Zuqi9taDp61lTBEh',
        title: 'التعرف على أنواع الخطوط',
        type: 'video',
      },
    ],
  },

  // Monday 21/9/2026
  {
    id: `cw-${cls.toLowerCase()}-w2-mon-en`,
    classId: cls,
    day: 'Monday',
    period: 1,
    subject: 'English',
    title: '1- Paint a face that has features in the correct position\n2- My mum and dad make me laugh\n3- Introduce number 2',
    completed: false,
    block: 1,
    week: 2,
    links: [
      {
        url: 'https://www.youtube.com/watch?v=h2Ss3mIXWQ',
        title: "Face features' song",
        type: 'video',
      },
      {
        url: 'https://www.youtube.com/watch?v=rnssmovN9o8',
        title: 'Number 2',
        type: 'video',
      },
    ],
  },
  {
    id: `cw-${cls.toLowerCase()}-w2-mon-ar`,
    classId: cls,
    day: 'Monday',
    period: 2,
    subject: 'Arabic',
    title: 'التعرف على أجزاء الجسم',
    completed: false,
    block: 1,
    week: 2,
    links: [
      {
        url: 'https://youtu.be/LdZBsrpGB-o?si=CBRJridZU7zjGErk',
        title: 'أغنية أجزاء الجسم للأطفال',
        type: 'video',
      },
      {
        url: 'https://youtu.be/VBjlmwF99OI?si=mu-sQSJF4t4fA0CN',
        title: 'فيديو تفاعلي عن أعضاء الجسم',
        type: 'video',
      },
    ],
  },

  // Tuesday 22/9/2026
  {
    id: `cw-${cls.toLowerCase()}-w2-tue-en`,
    classId: cls,
    day: 'Tuesday',
    period: 1,
    subject: 'English',
    title: '1- Talk about school items\n2- Obey instructions in a large open area\n3- Identify familiar items of clothing and read the labels in English',
    completed: false,
    block: 1,
    week: 2,
    links: [
      {
        url: 'https://www.youtube.com/watch?v=g7kK989HiRQ',
        title: 'School items',
        type: 'video',
      },
    ],
  },
  {
    id: `cw-${cls.toLowerCase()}-w2-tue-ar`,
    classId: cls,
    day: 'Tuesday',
    period: 2,
    subject: 'Arabic',
    title: 'التعرف على أجزاء الوجه وملامحه',
    completed: false,
    block: 1,
    week: 2,
    links: [
      {
        url: 'https://youtu.be/n2PMY58-Sfk?si=Rk0eC3O83ToLKj5H',
        title: 'فيديو التعرف على ملامح وأجزاء الوجه',
        type: 'video',
      },
    ],
  },

  // Wednesday 23/9/2026
  {
    id: `cw-${cls.toLowerCase()}-w2-wed-en`,
    classId: cls,
    day: 'Wednesday',
    period: 1,
    subject: 'English',
    title: "Daily visual timetable\n1- Circle & red\n2- Choose the tallest/shortest (teddy) sheet\n3- Choose biggest and smallest animal in maisy's bed time\n4- Use every opportunity to count when playing in the kindergarten",
    pages: 'Choose the tallest/shortest (teddy) sheet',
    completed: false,
    block: 1,
    week: 2,
    links: [
      {
        url: 'https://www.youtube.com/watch?v=gtNQnClufBo',
        title: 'Red colour red',
        type: 'video',
      },
      {
        url: 'https://www.youtube.com/watch?v=YRWbpsREIVU',
        title: 'Circle song',
        type: 'video',
      },
      {
        url: 'https://www.youtube.com/watch?v=9rr-TezVmCA',
        title: 'Tall and short',
        type: 'video',
      },
      {
        url: 'https://www.youtube.com/watch?v=JjKhSyUVFBI',
        title: 'Story / Bedtime video',
        type: 'video',
      },
      {
        url: 'https://www.youtube.com/watch?v=HkkYaj0m6cg',
        title: 'Numbers and counting songs (Part 1)',
        type: 'video',
      },
      {
        url: 'https://www.youtube.com/watch?v=QyK4aqld7Qc',
        title: 'Numbers and counting songs (Part 2)',
        type: 'video',
      },
    ],
  },
  {
    id: `cw-${cls.toLowerCase()}-w2-wed-ar`,
    classId: cls,
    day: 'Wednesday',
    period: 2,
    subject: 'Arabic',
    title: 'التعرف على الحواس الخمسة (حاسة السمع)',
    pages: 'أوراق العمل ص 10',
    completed: false,
    block: 1,
    week: 2,
    links: [
      {
        url: 'https://youtu.be/anpYAJqggiJs?si=rsyFtGFEG6PB0E-G',
        title: 'أغنية الحواس الخمسة للأطفال',
        type: 'video',
      },
      {
        url: 'https://youtu.be/GOtZ7z9vym8?si=QHvDAFNUYpKtz65B',
        title: 'فيديو تعليمي عن حاسة السمع',
        type: 'video',
      },
    ],
  },

  // Thursday 24/9/2026
  {
    id: `cw-${cls.toLowerCase()}-w2-thu-en`,
    classId: cls,
    day: 'Thursday',
    period: 1,
    subject: 'English',
    title: '1- Use every opportunity to count when playing in the kindergarten with the children\n2- Match their names to their photograph',
    completed: false,
    block: 1,
    week: 2,
    links: [
      {
        url: 'https://www.youtube.com/watch?v=HkkYaj0m6cg',
        title: 'Numbers and counting songs (Part 1)',
        type: 'video',
      },
      {
        url: 'https://www.youtube.com/watch?v=QyK4aqld7Qc',
        title: 'Numbers and counting songs (Part 2)',
        type: 'video',
      },
    ],
  },
  {
    id: `cw-${cls.toLowerCase()}-w2-thu-ar`,
    classId: cls,
    day: 'Thursday',
    period: 2,
    subject: 'Arabic',
    title: 'التعرف على حرف الهمزة وطريقة كتابته ورسمه',
    pages: 'أوراق العمل ص 11',
    completed: false,
    block: 1,
    week: 2,
    links: [
      {
        url: 'https://youtu.be/JAQzXgCOip0?si=-LHhR3A84dQe66di',
        title: 'فيديو تعليمي تفاعلي لحرف الهمزة',
        type: 'video',
      },
    ],
  },
]);

/**
 * Week 2 Homework
 * Grade: KG 1 (A, B, C, D, E)
 * Topic: Marvelous me (ما أروعني) | Week 2: 20/9/2026 - 24/9/2026
 */
export const ALL_LINK_AND_WEEK2_HOMEWORK: HomeworkEntry[] = KG1_CLASSES.flatMap((cls) => [
  // Sunday 20/9/2026 Homework
  {
    id: `hw-${cls.toLowerCase()}-w2-sun-en`,
    classId: cls,
    assignedDay: 'Sunday',
    dueDay: 'Monday',
    subject: 'English',
    task: 'حل ص 1، 2، 3 أو 4، 7 من كتاب الواجب (Pages: P 1, 2, 3 or 4, 7)',
    pages: 'P 1, 2, 3 or 4, 7',
    completed: false,
    priority: 'normal',
    block: 1,
    week: 2,
    linkUrl: 'https://www.youtube.com/watch?v=Druv9MPXRl4',
    linkTitle: 'All about you story',
    links: [
      {
        url: 'https://www.youtube.com/watch?v=Druv9MPXRl4',
        title: '1- All about you story',
        type: 'video',
      },
      {
        url: 'https://www.youtube.com/watch?v=tlwwKOaml0s',
        title: "2- A First Book all About you' by Judy Hindley",
        type: 'video',
      },
      {
        url: 'https://www.youtube.com/watch?v=Q_EwuVHDb5U',
        title: '3- Clothes video',
        type: 'video',
      },
    ],
  },
  {
    id: `hw-${cls.toLowerCase()}-w2-sun-ar`,
    classId: cls,
    assignedDay: 'Sunday',
    dueDay: 'Monday',
    subject: 'Arabic',
    task: 'حل ورقة العمل ص 3 من ملزمة الواجبات',
    pages: 'ورقة العمل ص 3',
    completed: false,
    priority: 'normal',
    block: 1,
    week: 2,
    linkUrl: 'https://youtu.be/2vqZmpnTjbI?si=Zuqi9taDp61lTBEh',
    linkTitle: 'التعرف على أنواع الخطوط',
    links: [
      {
        url: 'https://youtu.be/2vqZmpnTjbI?si=Zuqi9taDp61lTBEh',
        title: 'فيديو أنواع الخطوط والتمرين عليها',
        type: 'video',
      },
    ],
  },

  // Monday 21/9/2026 Homework
  {
    id: `hw-${cls.toLowerCase()}-w2-mon-en`,
    classId: cls,
    assignedDay: 'Monday',
    dueDay: 'Tuesday',
    subject: 'English',
    task: 'استماع ومشاهدة أغنية ملامح الوجه ورقم 2 (Face features song & Number 2)',
    completed: false,
    priority: 'normal',
    block: 1,
    week: 2,
    linkUrl: 'https://www.youtube.com/watch?v=h2Ss3mIXWQ',
    linkTitle: "Face features' song",
    links: [
      {
        url: 'https://www.youtube.com/watch?v=h2Ss3mIXWQ',
        title: "1- Face features' song",
        type: 'video',
      },
      {
        url: 'https://www.youtube.com/watch?v=rnssmovN9o8',
        title: '2- Number 2',
        type: 'video',
      },
    ],
  },
  {
    id: `hw-${cls.toLowerCase()}-w2-mon-ar`,
    classId: cls,
    assignedDay: 'Monday',
    dueDay: 'Tuesday',
    subject: 'Arabic',
    task: 'حل ورقة العمل ص 4 من ملزمة الواجبات',
    pages: 'ورقة العمل ص 4',
    completed: false,
    priority: 'normal',
    block: 1,
    week: 2,
    linkUrl: 'https://youtu.be/LdZBsrpGB-o?si=CBRJridZU7zjGErk',
    linkTitle: 'أغنية أجزاء الجسم للأطفال',
    links: [
      {
        url: 'https://youtu.be/LdZBsrpGB-o?si=CBRJridZU7zjGErk',
        title: 'فيديو أجزاء الجسم التفاعلي',
        type: 'video',
      },
    ],
  },

  // Tuesday 22/9/2026 Homework
  {
    id: `hw-${cls.toLowerCase()}-w2-tue-en`,
    classId: cls,
    assignedDay: 'Tuesday',
    dueDay: 'Wednesday',
    subject: 'English',
    task: 'مشاهدة فيديو أدوات المدرسة باللغة الإنجليزية (School items video)',
    completed: false,
    priority: 'normal',
    block: 1,
    week: 2,
    linkUrl: 'https://www.youtube.com/watch?v=g7kK989HiRQ',
    linkTitle: 'School items video',
    links: [
      {
        url: 'https://www.youtube.com/watch?v=g7kK989HiRQ',
        title: '1- School items video',
        type: 'video',
      },
    ],
  },
  {
    id: `hw-${cls.toLowerCase()}-w2-tue-ar`,
    classId: cls,
    assignedDay: 'Tuesday',
    dueDay: 'Wednesday',
    subject: 'Arabic',
    task: 'حل ورقة العمل ص 5 من ملزمة الواجبات',
    pages: 'ورقة العمل ص 5',
    completed: false,
    priority: 'normal',
    block: 1,
    week: 2,
    linkUrl: 'https://youtu.be/n2PMY58-Sfk?si=Rk0eC3O83ToLKj5H',
    linkTitle: 'أجزاء الوجه ملامحه',
    links: [
      {
        url: 'https://youtu.be/n2PMY58-Sfk?si=Rk0eC3O83ToLKj5H',
        title: 'فيديو ملامح الوجه للطفل',
        type: 'video',
      },
    ],
  },

  // Wednesday 23/9/2026 Homework
  {
    id: `hw-${cls.toLowerCase()}-w2-wed-en`,
    classId: cls,
    assignedDay: 'Wednesday',
    dueDay: 'Thursday',
    subject: 'English',
    task: 'مشاهدة فيديوهات الألوان والأشكال والقصة وأغاني العد (Red colour, Circle song, Tall/Short, Counting songs)',
    completed: false,
    priority: 'normal',
    block: 1,
    week: 2,
    linkUrl: 'https://www.youtube.com/watch?v=gtNQnClufBo',
    linkTitle: 'Red colour red & Circle song',
    links: [
      {
        url: 'https://www.youtube.com/watch?v=gtNQnClufBo',
        title: '1- Red colour red',
        type: 'video',
      },
      {
        url: 'https://www.youtube.com/watch?v=YRWbpsREIVU',
        title: '2- Circle song',
        type: 'video',
      },
      {
        url: 'https://www.youtube.com/watch?v=9rr-TezVmCA',
        title: '3- Tall and short',
        type: 'video',
      },
      {
        url: 'https://www.youtube.com/watch?v=JjKhSyUVFBI',
        title: '4- Bedtime story video',
        type: 'video',
      },
      {
        url: 'https://www.youtube.com/watch?v=HkkYaj0m6cg',
        title: '5- Numbers and counting songs (Part 1)',
        type: 'video',
      },
      {
        url: 'https://www.youtube.com/watch?v=QyK4aqld7Qc',
        title: '6- Numbers and counting songs (Part 2)',
        type: 'video',
      },
    ],
  },
  {
    id: `hw-${cls.toLowerCase()}-w2-wed-ar`,
    classId: cls,
    assignedDay: 'Wednesday',
    dueDay: 'Thursday',
    subject: 'Arabic',
    task: 'حل ورقة العمل ص 6 من ملزمة الواجبات والمشاهدة والتفاعل لتنمية حاسة السمع',
    pages: 'ورقة العمل ص 6',
    completed: false,
    priority: 'normal',
    block: 1,
    week: 2,
    linkUrl: 'https://youtu.be/GOtZ7z9vym?si=QHvDAFNUYpKTz65B78',
    linkTitle: 'أغنية الحواس للأطفال',
    links: [
      {
        url: 'https://youtu.be/GOtZ7z9vym?si=QHvDAFNUYpKTz65B78',
        title: 'فيديو تفاعلي للتعرف على الأصوات وحاسة السمع',
        type: 'video',
      },
    ],
  },

  // Thursday 24/9/2026 Homework
  {
    id: `hw-${cls.toLowerCase()}-w2-thu-en`,
    classId: cls,
    assignedDay: 'Thursday',
    dueDay: 'Sunday',
    subject: 'English',
    task: 'مراجعة أرقام وأغاني العد بالإنجليزية (Numbers and counting songs)',
    completed: false,
    priority: 'normal',
    block: 1,
    week: 2,
    linkUrl: 'https://www.youtube.com/watch?v=HkkYaj0m6cg',
    linkTitle: 'Numbers and counting songs',
    links: [
      {
        url: 'https://www.youtube.com/watch?v=HkkYaj0m6cg',
        title: '1- Numbers and counting songs (Part 1)',
        type: 'video',
      },
      {
        url: 'https://www.youtube.com/watch?v=QyK4aqld7Qc',
        title: '2- Numbers and counting songs (Part 2)',
        type: 'video',
      },
    ],
  },
  {
    id: `hw-${cls.toLowerCase()}-w2-thu-ar`,
    classId: cls,
    assignedDay: 'Thursday',
    dueDay: 'Sunday',
    subject: 'Arabic',
    task: 'حل ورقة العمل ص 7 من ملزمة الواجبات وكتابة الهمزة بخط جميل',
    pages: 'ورقة العمل ص 7',
    completed: false,
    priority: 'normal',
    block: 1,
    week: 2,
    linkUrl: 'https://youtu.be/JAQzXgCOip0?si=-LHhR3A84dQe66di',
    linkTitle: 'كتابة حرف الهمزة',
    links: [
      {
        url: 'https://youtu.be/JAQzXgCOip0?si=-LHhR3A84dQe66di',
        title: 'فيديو ممتع لتعليم كتابة الهمزة للأطفال',
        type: 'video',
      },
    ],
  },
]);
