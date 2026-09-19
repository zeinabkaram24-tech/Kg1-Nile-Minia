import { jsPDF } from 'jspdf';
import * as fs from 'fs';
import * as path from 'path';

const UPLOADS_DIR = path.join(process.cwd(), 'data', 'uploads');
const MATERIALS_FILE = path.join(process.cwd(), 'data', 'materials_store.json');

if (!fs.existsSync(UPLOADS_DIR)) {
  fs.mkdirSync(UPLOADS_DIR, { recursive: true });
}

function drawPageTemplate(
  doc: jsPDF,
  title: string,
  subject: 'English' | 'Arabic',
  pageNo: number,
  objective: string,
  isHomework: boolean
) {
  // Page background and border
  doc.setDrawColor(46, 125, 50); // Green theme from school headers
  doc.setLineWidth(1);
  doc.rect(5, 5, 200, 287); // Page boundary

  // Top header box
  doc.setDrawColor(0);
  doc.setFillColor(232, 245, 233); // Light green
  doc.rect(10, 10, 190, 25, 'FD');

  // School name & logo placeholder
  doc.setTextColor(27, 94, 32);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(11);
  
  if (subject === 'Arabic') {
    doc.text('مدارس النيل المصرية الدولية - Nile Egyptian International Schools', 15, 16);
    doc.setFontSize(10);
    doc.text(`الصف: روضة 1 (KG1) | المادة: اللغة العربية | الواجب: ${isHomework ? 'منزلي' : 'صفي'}`, 15, 22);
    doc.text(`الموضوع الأول (ما أروعني) | ناتج التعلم: ${objective}`, 15, 28);
  } else {
    doc.text('Nile Egyptian International Schools (NEIS)', 15, 16);
    doc.setFontSize(10);
    doc.text(`Grade: KG1 | Subject: English L. | Type: ${isHomework ? 'Homework' : 'Classwork'}`, 15, 22);
    doc.text(`Topic 1: Marvellous me! | Objective: ${objective}`, 15, 28);
  }

  // Student Name line
  doc.setDrawColor(180);
  doc.line(130, 31, 195, 31);
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(9);
  doc.setTextColor(100);
  doc.text(subject === 'Arabic' ? 'اسم الطالب: .......................................' : 'Student Name: .......................................', 125, 22);

  // Footer
  doc.setDrawColor(200);
  doc.line(10, 282, 200, 282);
  doc.setFontSize(8);
  doc.setTextColor(120);
  doc.text('Nile Egyptian International Schools - KG1 Teachers Team', 15, 287);
  doc.text(`Page ${pageNo}`, 185, 287);
}

function generatePDF(
  fileName: string,
  subject: 'English' | 'Arabic',
  isHomework: boolean,
  pages: { objective: string; instruction: string; content?: string[] }[]
): { id: string; fileName: string; fileSize: number; fileUrl: string } {
  const doc = new jsPDF();
  const matId = `mat_${Date.now()}_${Math.random().toString(36).substr(2, 5)}`;

  // Cover Page
  doc.setFillColor(34, 112, 63); // Rich green cover background
  doc.rect(5, 5, 200, 287, 'F');
  
  // Decorative white box
  doc.setFillColor(255, 255, 255);
  doc.rect(12, 12, 186, 273, 'F');
  
  // Title
  doc.setTextColor(34, 112, 63);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(24);
  
  if (subject === 'Arabic') {
    doc.text('مدارس النيل المصرية الدولية', 105, 50, { align: 'center' });
    doc.setFontSize(20);
    doc.text('رياض الأطفال - روضة 1', 105, 65, { align: 'center' });
    doc.setFontSize(28);
    doc.text(isHomework ? 'الموضوع الأول: ما أروعني' : 'الموضوع الأول: ما أروعني', 105, 95, { align: 'center' });
    doc.setFontSize(22);
    doc.text(isHomework ? 'دفتر الواجبات المنزلية (PDF)' : 'دفتر الأنشطة الصفية (PDF)', 105, 115, { align: 'center' });
  } else {
    doc.text('Nile Egyptian Schools', 105, 50, { align: 'center' });
    doc.setFontSize(20);
    doc.text('Kindergarten - KG1', 105, 65, { align: 'center' });
    doc.setFontSize(28);
    doc.text('Topic 1: Marvelous Me!', 105, 95, { align: 'center' });
    doc.setFontSize(22);
    doc.text(isHomework ? 'Homework Worksheets (PDF)' : 'Classwork Worksheets (PDF)', 105, 115, { align: 'center' });
  }

  // Draw some fun icons/shapes on the cover
  doc.setDrawColor(255, 193, 7); // Gold
  doc.setFillColor(255, 236, 179);
  doc.setLineWidth(1.5);
  doc.rect(75, 140, 60, 60, 'FD'); // Central frame

  doc.setTextColor(50);
  doc.setFontSize(14);
  doc.setFont('helvetica', 'bold');
  doc.text(subject === 'Arabic' ? 'الاسم: .......................................' : 'Name: .......................................', 105, 220, { align: 'center' });
  doc.text(subject === 'Arabic' ? 'الفصل: .......................................' : 'Class: .......................................', 105, 235, { align: 'center' });

  doc.setFontSize(10);
  doc.setFont('helvetica', 'normal');
  doc.text('Prepared by KG1 Department Teachers Team', 105, 265, { align: 'center' });

  // Add pages
  pages.forEach((p, idx) => {
    doc.addPage();
    const pageNo = idx + 2;
    drawPageTemplate(doc, fileName, subject, pageNo, p.objective, isHomework);

    // Write instructions
    doc.setTextColor(33, 33, 33);
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(14);
    
    // Check if Arabic to align right
    if (subject === 'Arabic') {
      doc.text(p.instruction, 190, 55, { align: 'right' });
    } else {
      doc.text(p.instruction, 15, 55);
    }

    // Interactive Box / Graphics placeholders
    doc.setDrawColor(180);
    doc.setLineWidth(0.5);
    doc.setFillColor(250, 250, 250);
    doc.rect(15, 65, 180, 160, 'FD');

    // Draw educational guide lines/circles in the worksheet box
    doc.setDrawColor(120, 120, 255);
    doc.setLineWidth(0.8);
    
    if (p.instruction.toLowerCase().includes('trace') || p.instruction.includes('تتبع')) {
      // Draw dashed tracing guides
      doc.setLineDashPattern([2, 2], 0);
      doc.line(30, 100, 180, 100);
      doc.line(30, 130, 180, 130);
      doc.line(30, 160, 180, 160);
      doc.line(30, 190, 180, 190);
      doc.setLineDashPattern([], 0); // reset
      
      doc.setFontSize(12);
      doc.setTextColor(150);
      doc.text('................... [ Tracing Line Guide ] ...................', 105, 145, { align: 'center' });
    } else if (p.instruction.toLowerCase().includes('color') || p.instruction.includes('لون')) {
      // Draw fun shapes to color
      doc.setFillColor(255, 255, 255);
      doc.circle(60, 140, 25, 'FD');
      doc.circle(150, 140, 25, 'FD');
      doc.setFontSize(12);
      doc.setTextColor(100);
      doc.text('[ Color Me ]', 60, 142, { align: 'center' });
      doc.text('[ Color Me ]', 150, 142, { align: 'center' });
    } else if (p.instruction.toLowerCase().includes('match') || p.instruction.includes('صل')) {
      // Draw match items
      doc.rect(30, 90, 40, 25);
      doc.rect(140, 90, 40, 25);
      doc.rect(30, 160, 40, 25);
      doc.rect(140, 160, 40, 25);
      doc.circle(85, 102, 3);
      doc.circle(125, 102, 3);
      doc.circle(85, 172, 3);
      doc.circle(125, 172, 3);
      
      doc.setFontSize(10);
      doc.setTextColor(120);
      doc.text('Item A', 50, 105, { align: 'center' });
      doc.text('Match A', 160, 105, { align: 'center' });
      doc.text('Item B', 50, 175, { align: 'center' });
      doc.text('Match B', 160, 175, { align: 'center' });
    } else {
      // Generic exercise box
      doc.setFontSize(12);
      doc.setTextColor(140);
      doc.text('[ High-Quality Interactive Kindergarten Activity Box ]', 105, 145, { align: 'center' });
    }

    // Detailed content checklist at bottom of activity box
    if (p.content && p.content.length > 0) {
      doc.setFillColor(245, 245, 245);
      doc.rect(20, 235, 170, 35, 'F');
      doc.setFontSize(9);
      doc.setTextColor(80);
      doc.setFont('helvetica', 'normal');
      p.content.forEach((itemText, cIdx) => {
        doc.text(`- ${itemText}`, 25, 243 + (cIdx * 7));
      });
    }
  });

  const filePath = path.join(UPLOADS_DIR, `${matId}.pdf`);
  const pdfBytes = doc.output('arraybuffer');
  fs.writeFileSync(filePath, Buffer.from(pdfBytes));

  const fileSize = fs.statSync(filePath).size;
  return {
    id: matId,
    fileName,
    fileSize,
    fileUrl: `/api/materials/pdf/${matId}`
  };
}

// 1. English Homework Pages (28 pages total, including cover)
const engHwPages = [
  { objective: 'Develop Motor Skills', instruction: '1. Trace the broken lines to develop motor control:' },
  { objective: 'Identify and trace number 1', instruction: '2. Color the number 1 then trace it correctly:' },
  { objective: 'Identify body parts', instruction: '3. If you are a girl, cut and stick the body part pictures:' },
  { objective: 'Identify body parts', instruction: '4. If you are a boy, cut and stick the body part pictures:' },
  { objective: 'Identify classroom rules', instruction: '5. Practice our classroom rules (Looking Eyes, Listening Ears, Quiet Voices):' },
  { objective: 'Develop Motor Skills', instruction: '6. Trace the curvy and zigzag broken lines:' },
  { objective: 'Identify school supplies', instruction: '7. Circle all the school supplies on the page:' },
  { objective: 'Identify body parts', instruction: '8. Ask and identify body parts (Head, Ear, Eye, Nose, Mouth, Teeth):' },
  { objective: 'Develop Motor Skills', instruction: '9. Trace lines to help baby animals find their mothers:' },
  { objective: 'Identify and trace number 2', instruction: '10. Let\'s learn the number two. Trace the number 2:' },
  { objective: 'Identify body parts', instruction: '11. Match same body parts with corresponding circles:' },
  { objective: 'Differentiate spotty and stripy', instruction: '12. Colour the mum\'s spots and the daddy\'s stripes:' },
  { objective: 'Distinguish tall and short', instruction: '13. Circle the object in each box that is short:' },
  { objective: 'Sort spotty and stripy', instruction: '14. Cut and paste the gifts into spotty or stripy boxes:' },
  { objective: 'Classify objects by length', instruction: '15. Check the box next to pictures that show something tall/short:' },
  { objective: 'Differentiate BIG and SMALL', instruction: '16. Circle all the "big" size items on the page:' },
  { objective: 'Identify and trace /s/ sound', instruction: '17. Color the objects starting with /s/ sound then trace letter s:' },
  { objective: 'Compare shapes by size', instruction: '18. Circle the smaller object in each group:' },
  { objective: 'Recognize and trace number 3', instruction: '19. Trace and color number 3:' },
  { objective: 'Classify objects by length', instruction: '20. Choose and match the right answer (Tall or Short):' },
  { objective: 'Differentiate LONG and SHORT', instruction: '21. Tick the long object in each pair:' },
  { objective: 'Develop Motor Skills', instruction: '22. Trace lines to help baby animals find their mothers:' },
  { objective: 'Recognize /a/ sound', instruction: '23. Identify words starting with /a/ sound and practice writing /a/:' },
  { objective: 'Match colours', instruction: '24. Draw lines from the color word to their pictures:' },
  { objective: 'Identify home corners', instruction: '25. House: Cut and stick furniture in the right rooms:' },
  { objective: 'Recognize number 4', instruction: '26. Write and circle number 4:' },
  { objective: 'Match shapes to columns', instruction: '27. Cut and paste the pictures under the right shape (Circle, Square, Triangle, Rectangle):' }
];

// 2. English Classwork Pages (21 pages total, including cover)
const engCwPages = [
  { objective: 'Develop fine motor skills', instruction: '1. Trace the lines, then colour the images:' },
  { objective: 'Identify number 1', instruction: '2. Color, count, and trace number 1:' },
  { objective: 'Identify number 1', instruction: '3. Trace number 1, color 1 box, circle all 1s:' },
  { objective: 'Differentiate spotty and stripy', instruction: '4. Decorate dress with spots & t-shirt with stripes:' },
  { objective: 'Recognize school items', instruction: '5. What is in my bag? Cut and paste school items:' },
  { objective: 'Develop motor skills', instruction: '6. Trace over the patterns (straight, slant, loops):' },
  { objective: 'Identify number 2', instruction: '7. Trace number 2, circle groups with two items:' },
  { objective: 'Identify /s/ sound', instruction: '8. Practice writing /s/ sound, circle pictures starting with /s/:' },
  { objective: 'Sort items by length', instruction: '9. Select and color the picture that is tall or short:' },
  { objective: 'Identify /a/ sound', instruction: '10. Practice writing /a/ sound, circle pictures starting with /a/:' },
  { objective: 'Differentiate big and small', instruction: '11. Circle the big objects (benches, drums, ducks):' },
  { objective: 'Develop motor skills', instruction: '12. Trace the lines (curves, waves, zigzags):' },
  { objective: 'Recognize number 3', instruction: '13. Let\'s learn number 3. Trace and color 3 boxes:' },
  { objective: 'Sort objects by length', instruction: '14. Circle the long object, circle the short objects:' },
  { objective: 'Identify home rooms', instruction: '15. Circle the right furniture for each room (Kitchen, Bathroom, Living Room):' },
  { objective: 'Recognize number 4', instruction: '16. Color, trace and write number 4, color 4 candles:' },
  { objective: 'Develop fine motor skills', instruction: '17. Trace the lines from fruit to fruit:' },
  { objective: 'Identify 2D shapes', instruction: '18. Match each shape to its corresponding object:' },
  { objective: 'Recognize body parts', instruction: '19. Form the body using pre-cut body parts:' },
  { objective: 'Blank/Teachers page', instruction: '20. Evaluation sheet and performance record:' }
];

// 3. Arabic Classwork Pages (20 pages total, including cover)
const araCwPages = [
  { objective: 'تدريبات سير على النقاط', instruction: '١. هيا نرسم نقاط الفراولة وتتبع نقاط الأمطار:' },
  { objective: 'تدريبات سير على النقاط', instruction: '٢. تتبع النقاط لعمل خط مستقيم أفقي ومائل:' },
  { objective: 'تدريبات سير على النقاط', instruction: '٣. ساعد الأرنب في القفز وتتبع النقاط:' },
  { objective: 'القواعد الصفية والسلوكيات', instruction: '٤. صل وميز بين السلوك الصحيح والسلوك الخاطئ في الفصل:' },
  { objective: 'تمييز وكتابة الرقم واحد', instruction: '٥. الرقم واحد: تتبع النقاط ثم لون الرقم واحد وارسم زهرة واحدة:' },
  { objective: 'تدريبات سير على النقاط', instruction: '٦. تتبع النقاط لتنمية عضلات اليد الدقيقة:' },
  { objective: 'تدريبات سير على النقاط', instruction: '٧. تتبع خطوط الطيور والنحل للوصول لبيوتها:' },
  { objective: 'تمييز الحواس الخمسة', instruction: '٨. صل حاسة السمع بما يناسبها من منبه وجرس وعصفور:' },
  { objective: 'تمييز وكتابة الهمزة', instruction: '٩. الهمزة: لون الهمزة ثم تتبع النقاط لكتابة الهمزة:' },
  { objective: 'تمييز وكتابة حرف الألف', instruction: '١٠. ابحث ثم لون حرف الألف وتتبع النقاط لكتابة الألف:' },
  { objective: 'ربط الحرف بالصور', instruction: '١١. صل حرف الألف بالصور الخاصة به واكتب الحرف المناسب:' },
  { objective: 'تمييز وكتابة العدد اثنان', instruction: '١٢. العدد اثنان: عد واكتب الرقم وصل بالمدلول:' },
  { objective: 'حاسة البصر', instruction: '١٣. صل حاسة البصر بما يناسبها من نظارة وقوس قزح وكتاب ممتع:' },
  { objective: 'حاسة اللمس', instruction: '١٤. صل حاسة اللمس بما يناسبها من صبار ناعم وخشن ووسادة:' },
  { objective: 'حرف الباء', instruction: '١٥. لون البيضة التي تحتوي على حرف الباء وتتبع النقاط لكتابته:' },
  { objective: 'تمييز حرف الباء', instruction: '١٦. ضع دائرة حول الحرف المناسب ولون الصور الخاصة بحرف الباء:' },
  { objective: 'حاسة الشم والتذوق', instruction: '١٧. صل كل حاسة بما يناسبها (شم الزهور وتذوق الآيس كريم):' },
  { objective: 'الحواس الخمسة', instruction: '١٨. صل كل حاسة من الحواس بالصورة المناسبة لها لتنشيط الذهن:' },
  { objective: 'الحواس الخمسة', instruction: '١٩. اختر الحاسة المناسبة لكل نشاط من الأنشطة اليومية:' }
];

// 4. Arabic Homework Pages (19 pages total, including cover)
const araHwPages = [
  { objective: 'تدريبات سير على النقاط', instruction: '١. تتبع النقاط لمساعدة الأطفال في ركوب الدراجات والسيارات:' },
  { objective: 'تدريبات سير على النقاط', instruction: '٢. تتبع النقاط لمساعدة السيارة للوصول إلى المنزل الجميل:' },
  { objective: 'أجزاء الجسم الخارجية', instruction: '٣. قص ثم الصق أجزاء الجسم الخارجية في مكانها المناسب:' },
  { objective: 'أجزاء الوجه', instruction: '٤. ارسم أجزاء الوجه (العين، الأنف، الفم، الأذن) بدقة:' },
  { objective: 'حاسة السمع', instruction: '٥. لون الصور المناسبة لحاسة السمع (المنبه، الجرس، العصفور):' },
  { objective: 'الهمزة', instruction: '٦. تتبع النقاط واكتب الهمزة لتعليم طفلك كتابتها:' },
  { objective: 'حرف الألف', instruction: '٧. تتبع النقاط لكتابة حرف الألف الجميل بالتوجيه الصحيح:' },
  { objective: 'حرف الألف والكلمات', instruction: '٨. اكتب الحرف المناسب للصورة وصل حرف الألف بالكلمات:' },
  { objective: 'العدد اثنان', instruction: '٩. العدد اثنان: صل العدد بمدلوله ثم اكتبه في المربعات:' },
  { objective: 'حاسة البصر', instruction: '١٠. قص ثم الصق الصور المناسبة لحاسة البصر:' },
  { objective: 'حاسة اللمس', instruction: '١١. لون الصور الخاصة بحاسة اللمس والنعومة والخشونة:' },
  { objective: 'أجزاء الوجه والحواس', instruction: '١٢. قص ثم الصق أجزاء الوجه والحواس في مكانها المناسب:' },
  { objective: 'حرف الباء', instruction: '١٣. تتبع النقاط لكتابة حرف الباء بالتوجيهات الصحيحة:' },
  { objective: 'حرف الباء وصوره', instruction: '١٤. اكتب الحرف المناسب للصورة وصل حرف الباء بالبالونات:' },
  { objective: 'حاسة الشم والتذوق', instruction: '١٥. لون حاسة الشم والتذوق بألوانك المفضلة والجميلة:' },
  { objective: 'الحواس الخمسة والربط', instruction: '١٦. قص ثم الصق كل حاسة من الحواس في مكانها المناسب:' },
  { objective: 'حاسة اللمس (ساخن وبارد)', instruction: '١٧. قص ثم الصق الأجسام الساخنة والأجسام الباردة في الجدول:' },
  { objective: 'الحواس الخمسة', instruction: '١٨. اختر الحاسة المناسبة لكل صورة من الصور التوضيحية:' }
];

console.log('Generating English Homework Worksheets (28 pages)...');
const mat1 = generatePDF('English-KG1-Topic1-Homework.pdf', 'English', true, engHwPages);

console.log('Generating English Classwork Worksheets (21 pages)...');
const mat2 = generatePDF('English-KG1-Topic1-Classwork.pdf', 'English', false, engCwPages);

console.log('Generating Arabic Classwork Worksheets (20 pages)...');
const mat3 = generatePDF('Arabic-KG1-Topic1-Classwork.pdf', 'Arabic', false, araCwPages);

console.log('Generating Arabic Homework Worksheets (19 pages)...');
const mat4 = generatePDF('Arabic-KG1-Topic1-Homework.pdf', 'Arabic', true, araHwPages);

// Add to materials store
let existing: any[] = [];
if (fs.existsSync(MATERIALS_FILE)) {
  try {
    existing = JSON.parse(fs.readFileSync(MATERIALS_FILE, 'utf-8'));
  } catch {}
}

const newItems = [
  {
    id: mat3.id,
    fileName: mat3.fileName,
    fileSize: mat3.fileSize,
    fileData: null,
    fileUrl: mat3.fileUrl,
    block: 1,
    section: 'Main sheet',
    classId: 'ALL',
    title: 'اللغة العربية - ورق عمل صفي - الموضوع الأول ما أروعني',
    category: 'main_sheets',
    notes: 'أوراق العمل الصفية للموضوع الأول ما أروعني لمرحلة رياض الأطفال روضة 1',
    uploadedAt: new Date().toISOString()
  },
  {
    id: mat4.id,
    fileName: mat4.fileName,
    fileSize: mat4.fileSize,
    fileData: null,
    fileUrl: mat4.fileUrl,
    block: 1,
    section: 'Main sheet',
    classId: 'ALL',
    title: 'اللغة العربية - واجب منزلي - الموضوع الأول ما أروعني',
    category: 'main_sheets',
    notes: 'أوراق الواجبات المنزلية للموضوع الأول ما أروعني لمرحلة رياض الأطفال روضة 1',
    uploadedAt: new Date().toISOString()
  },
  {
    id: mat2.id,
    fileName: mat2.fileName,
    fileSize: mat2.fileSize,
    fileData: null,
    fileUrl: mat2.fileUrl,
    block: 1,
    section: 'Main sheet',
    classId: 'ALL',
    title: 'English - Classwork Worksheets - Topic 1 (Marvelous Me)',
    category: 'main_sheets',
    notes: 'English Classwork worksheets for Topic 1 Marvelous Me! Grade KG1',
    uploadedAt: new Date().toISOString()
  },
  {
    id: mat1.id,
    fileName: mat1.fileName,
    fileSize: mat1.fileSize,
    fileData: null,
    fileUrl: mat1.fileUrl,
    block: 1,
    section: 'Main sheet',
    classId: 'ALL',
    title: 'English - Homework Worksheets - Topic 1 (Marvelous Me)',
    category: 'main_sheets',
    notes: 'English Homework worksheets for Topic 1 Marvelous Me! Grade KG1',
    uploadedAt: new Date().toISOString()
  }
];

// Prepend new items to display first, filter duplicates
const combined = [...newItems, ...existing.filter((item) => !newItems.some((n) => n.fileName === item.fileName))];
fs.writeFileSync(MATERIALS_FILE, JSON.stringify(combined, null, 2), 'utf-8');

console.log('Successfully generated and registered all 4 worksheets in materials store!');
