import { MaterialItem } from '../types';
import { getMaterialBlob } from './materialsDb';

// Convert base64 data URL to Blob
function dataUrlToBlob(dataUrl: string): Blob {
  const parts = dataUrl.split(',');
  const mime = parts[0].match(/:(.*?);/)?.[1] || 'application/pdf';
  const bstr = atob(parts[1]);
  let n = bstr.length;
  const u8arr = new Uint8Array(n);
  while (n--) {
    u8arr[n] = bstr.charCodeAt(n);
  }
  return new Blob([u8arr], { type: mime });
}

// Generate curriculum-aligned exercises if sheet has no question items
function getDefaultSubjectExercises(subjectId: string, title: string): string[] {
  const lower = subjectId.toLowerCase();
  if (lower.includes('science')) {
    return [
      'سؤال 1 (Science): Classify each into Living or Non-Living: (Cat - Rock - Plant - Plastic Bottle - Bird). Write your answer with reasons.',
      'سؤال 2 (Science): Name the main parts of a plant and write the function of: (Roots - Stem - Leaves).',
      'سؤال 3 (Science): What do living things need to survive? (List 4 basic needs).',
      'سؤال 4 (Science): Compare between animals that have fur and animals that have feathers. Give two examples of each.',
      'سؤال 5 (Science): Match each animal to its habitat: (Camel, Fish, Polar Bear, Monkey) -> (Ocean, Desert, Forest, Arctic).',
    ];
  }
  if (lower.includes('math')) {
    return [
      'سؤال 1 (Math): Write the value and place value of the underlined digit: 7<u>4</u>, <u>5</u>9, <u>8</u>0.',
      'سؤال 2 (Math): Solve the addition & subtraction problems: 35 + 27 = [   ],  64 - 28 = [   ],  50 + 49 = [   ].',
      'سؤال 3 (Math): Complete the number pattern: 10, 20, 30, [   ], [   ], [   ].',
      'سؤال 4 (Math): Ahmed has 38 marbles. His friend gave him 15 more. How many marbles does Ahmed have in all?',
      'سؤال 5 (Math): Identify the 2D shapes: (Triangle - Square - Rectangle - Circle) and write how many sides and vertices each has.',
    ];
  }
  if (lower.includes('english')) {
    return [
      'سؤال 1 (English): Read the sentence and circle the NOUN: "The clever boy found a little puppy in the garden."',
      'سؤال 2 (English): Choose the correct verb: (She / plays / play / playing) tennis every Friday.',
      'سؤال 3 (English): Complete with (a / an): [   ] apple, [   ] elephant, [   ] school bag, [   ] umbrella.',
      'سؤال 4 (English): Write two complete sentences describing what you did in school today.',
      'سؤال 5 (English): Phonics practice - Match words with the same vowel sound: (Cake, Tree, Boat) -> (Rain, Sea, Coat).',
    ];
  }
  if (lower.includes('arabic') || lower.includes('عربي')) {
    return [
      'السؤال الأول (لغة عربية): صنف الكلمات الآتية في الجدول: (مدرسة - يكتب - في - عصفور - إلى - قرأ): [اسم - فعل - حرف].',
      'السؤال الثاني (لغة عربية): حلل الكلمات الآتية إلى مقاطع صوتية: (الْمَدْرَسَةُ - كِتَابٌ - الشَّمْسُ).',
      'السؤال الثالث (لغة عربية): حدد نوع اللام (شمسية أم قمرية): (القلم - التلميذ - المعلم - الصباح).',
      'السؤال الرابع (لغة عربية): ضع اسم الإشارة المناسب (هذا - هذه - هؤلاء): [   ] ولد مجتهد، [   ] فتاة نشيطة، [   ] تلاميذ أذكياء.',
      'السؤال الخامس (لغة عربية): اكتب الجملة الآتية بخط النسخ الجميل: "العِلْمُ يَرْفَعُ بَيْتًا لَا عِمَادَ لَهُ".',
    ];
  }
  if (lower.includes('social') || lower.includes('دراسات')) {
    return [
      'سؤال 1 (Social Studies): حدد الاتجاهات الأصلية الأربعة: (الشمال - الجنوب - الشرق - الغرب).',
      'سؤال 2 (Social Studies): صنف وسائل المواصلات إلى: (برية - بحرية - جوية): [القطار، السفينة، الطائرة، الحافلة].',
      'سؤال 3 (Social Studies): ما هي واجباتنا للحفاظ على نظافة بيئتنا ومدرستنا؟',
      'سؤال 4 (Social Studies): اذكر أهمية نهر النيل لمصر والمصريين.',
    ];
  }
  if (lower.includes('ict') || lower.includes('computer')) {
    return [
      'سؤال 1 (ICT): What is the QWERTY keyboard layout? Why are keys arranged this way?',
      'سؤال 2 (ICT): Identify the functions of keys: (Enter - Space Bar - Shift - Backspace - Caps Lock).',
      'سؤال 3 (ICT): Explain the difference between Touch Typing and Hunt-and-peck typing.',
      'سؤال 4 (ICT): Name 3 shortcuts in Microsoft Word (e.g., Ctrl+S, Ctrl+C, Ctrl+V) and what they do.',
    ];
  }

  // Generic worksheet questions
  return [
    `السؤال الأول (${title}): المفاهيم والمصطلحات الأساسية - اذكر المفهوم العلمي أو القاعدة الرئيسية للشيت.`,
    `السؤال الثاني (${title}): تدريب تطبيقي - استخرج الإجابة الصحيحة واكتب التفسير في الأسطر المخصصة أدناه.`,
    `السؤال الثالث (${title}): حل المشكلات والمسائل المرتبطة بمحتوى الدرس.`,
    `السؤال الرابع (${title}): سؤال الفهم والملاحظة والتفكير الناقد.`,
    `السؤال الخامس (${title}): خلاصة التدريب وتقييم التلميذ الذاتي لما تعلمه.`,
  ];
}

// Generate the printable A4 PDF/HTML sheet content
export function generateSheetHtml(item: MaterialItem, subjectNameAr: string): string {
  const exercises =
    item.contentPreview?.items && item.contentPreview.items.length > 0
      ? item.contentPreview.items
      : getDefaultSubjectExercises(item.subjectId, item.title);

  const isRtl =
    item.subjectId.toLowerCase().includes('arabic') ||
    item.subjectId.toLowerCase().includes('social') ||
    /[\u0600-\u06FF]/.test(item.title);

  const questionsHtml = exercises
    .map((q, idx) => {
      return `
      <div class="question-card">
        <div class="question-header">
          <span class="q-badge">سؤال ${idx + 1}</span>
          <span class="q-pts">(درجتان)</span>
        </div>
        <div class="q-text">${escapeHtml(q)}</div>
        <div class="answer-space">
          <div class="answer-line"></div>
          <div class="answer-line"></div>
          <div class="answer-line"></div>
        </div>
        <div class="check-box-wrap">
          <label><input type="checkbox" /> تم حل السؤال ومراجعته</label>
        </div>
      </div>
    `;
    })
    .join('');

  return `
<!DOCTYPE html>
<html dir="${isRtl ? 'rtl' : 'ltr'}" lang="${isRtl ? 'ar' : 'en'}">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>${escapeHtml(item.title)} - Nile Egyptian International Schools</title>
  <link rel="preconnect" href="https://fonts.googleapis.com">
  <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
  <link href="https://fonts.googleapis.com/css2?family=Cairo:wght@400;600;700;800;900&family=Plus+Jakarta+Sans:wght@500;700;800&display=swap" rel="stylesheet">
  <style>
    :root {
      --primary: #1e3a8a;
      --secondary: #4338ca;
      --accent: #2563eb;
      --border: #cbd5e1;
      --text: #0f172a;
    }
    * {
      box-sizing: border-box;
      margin: 0;
      padding: 0;
    }
    body {
      font-family: 'Cairo', 'Plus Jakarta Sans', -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
      background: #f1f5f9;
      color: var(--text);
      line-height: 1.6;
      -webkit-font-smoothing: antialiased;
    }

    /* Floating action toolbar (hidden on print) */
    .toolbar {
      position: sticky;
      top: 0;
      z-index: 100;
      background: #0f172a;
      color: white;
      padding: 12px 24px;
      display: flex;
      align-items: center;
      justify-content: space-between;
      gap: 16px;
      box-shadow: 0 4px 12px rgba(0,0,0,0.15);
    }
    .toolbar-info {
      display: flex;
      align-items: center;
      gap: 12px;
      font-size: 13px;
    }
    .toolbar-actions {
      display: flex;
      align-items: center;
      gap: 10px;
    }
    .btn {
      display: inline-flex;
      align-items: center;
      gap: 8px;
      padding: 8px 18px;
      border-radius: 10px;
      font-weight: 700;
      font-size: 13px;
      cursor: pointer;
      border: none;
      transition: all 0.2s;
    }
    .btn-print {
      background: #2563eb;
      color: white;
    }
    .btn-print:hover {
      background: #1d4ed8;
      transform: translateY(-1px);
    }
    .btn-close {
      background: #334155;
      color: white;
    }
    .btn-close:hover {
      background: #475569;
    }

    /* Main A4 Document Container */
    .sheet-wrapper {
      max-width: 820px;
      margin: 28px auto 40px;
      padding: 0 16px;
    }
    .sheet-page {
      background: white;
      border: 1px solid var(--border);
      border-radius: 16px;
      padding: 40px 48px;
      box-shadow: 0 10px 25px -5px rgba(0, 0, 0, 0.05);
      position: relative;
    }

    /* School Header */
    .school-header {
      border-bottom: 2.5px solid var(--primary);
      padding-bottom: 16px;
      margin-bottom: 20px;
      display: flex;
      align-items: center;
      justify-content: space-between;
      gap: 16px;
    }
    .school-title {
      font-size: 17px;
      font-weight: 900;
      color: var(--primary);
      line-height: 1.3;
    }
    .school-sub {
      font-size: 12px;
      font-weight: 700;
      color: #64748b;
      margin-top: 4px;
    }
    .school-badge-box {
      text-align: center;
      padding: 6px 14px;
      background: #eff6ff;
      border: 1px solid #bfdbfe;
      border-radius: 10px;
      color: #1e40af;
      font-weight: 800;
      font-size: 12px;
      white-space: nowrap;
    }

    /* Student info box */
    .student-info-grid {
      display: grid;
      grid-template-columns: 2fr 1fr 1.2fr 0.8fr;
      gap: 12px;
      background: #f8fafc;
      border: 1px solid #e2e8f0;
      border-radius: 12px;
      padding: 12px 16px;
      margin-bottom: 24px;
      font-size: 13px;
      font-weight: 700;
    }
    .info-item {
      display: flex;
      align-items: center;
      gap: 6px;
    }
    .info-label {
      color: #64748b;
      font-weight: 600;
      font-size: 12px;
      white-space: nowrap;
    }
    .info-line {
      flex: 1;
      border-bottom: 1.5px dotted #94a3b8;
      min-height: 18px;
    }

    /* Sheet Title Banner */
    .sheet-title-banner {
      background: linear-gradient(135deg, #1e3a8a 0%, #3730a3 100%);
      color: white;
      padding: 16px 20px;
      border-radius: 12px;
      margin-bottom: 24px;
      display: flex;
      align-items: center;
      justify-content: space-between;
      gap: 16px;
    }
    .sheet-title-text {
      font-size: 20px;
      font-weight: 900;
      line-height: 1.3;
    }
    .sheet-tags {
      display: flex;
      align-items: center;
      gap: 8px;
      flex-wrap: wrap;
    }
    .tag {
      padding: 4px 10px;
      background: rgba(255,255,255,0.18);
      border-radius: 8px;
      font-size: 11px;
      font-weight: 800;
      border: 1px solid rgba(255,255,255,0.25);
    }

    /* Notes / Instruction Callout */
    .instruction-callout {
      background: #fefce8;
      border: 1px solid #fef08a;
      border-right: 4px solid #ca8a04;
      border-radius: 10px;
      padding: 12px 16px;
      margin-bottom: 24px;
      font-size: 12.5px;
      color: #854d0e;
      font-weight: 600;
    }

    /* Question Cards */
    .questions-container {
      display: flex;
      flex-direction: column;
      gap: 18px;
    }
    .question-card {
      background: white;
      border: 1px solid #e2e8f0;
      border-radius: 12px;
      padding: 16px 20px;
      page-break-inside: avoid;
    }
    .question-header {
      display: flex;
      align-items: center;
      justify-content: space-between;
      margin-bottom: 10px;
    }
    .q-badge {
      display: inline-block;
      padding: 3px 10px;
      background: #eff6ff;
      color: #1e40af;
      border: 1px solid #bfdbfe;
      border-radius: 6px;
      font-weight: 800;
      font-size: 12px;
    }
    .q-pts {
      font-size: 11px;
      color: #94a3b8;
      font-weight: 700;
    }
    .q-text {
      font-size: 14.5px;
      font-weight: 700;
      color: #0f172a;
      margin-bottom: 14px;
      line-height: 1.6;
    }
    .answer-space {
      display: flex;
      flex-direction: column;
      gap: 12px;
      margin: 12px 0 10px;
    }
    .answer-line {
      border-bottom: 1.5px dotted #94a3b8;
      height: 16px;
    }
    .check-box-wrap {
      font-size: 11px;
      color: #64748b;
      margin-top: 8px;
      display: flex;
      align-items: center;
      gap: 6px;
    }

    /* Footer */
    .sheet-footer {
      margin-top: 32px;
      padding-top: 14px;
      border-top: 1.5px solid #e2e8f0;
      display: flex;
      align-items: center;
      justify-content: space-between;
      font-size: 11px;
      color: #94a3b8;
      font-weight: 700;
    }

    /* Print Optimization Rules */
    @media print {
      body {
        background: white !important;
        color: black !important;
        font-size: 12pt;
      }
      .toolbar {
        display: none !important;
      }
      .sheet-wrapper {
        max-width: 100% !important;
        margin: 0 !important;
        padding: 0 !important;
      }
      .sheet-page {
        border: none !important;
        box-shadow: none !important;
        padding: 0 !important;
        border-radius: 0 !important;
      }
      .question-card {
        border: 1px solid #cbd5e1 !important;
        break-inside: avoid;
        page-break-inside: avoid;
        margin-bottom: 16px !important;
      }
      .sheet-title-banner {
        background: #1e3a8a !important;
        color: white !important;
        -webkit-print-color-adjust: exact;
        print-color-adjust: exact;
      }
      .answer-line {
        border-bottom: 1.5px dotted #64748b !important;
      }
      .check-box-wrap {
        display: none !important;
      }
      @page {
        size: A4 portrait;
        margin: 15mm 12mm 15mm 12mm;
      }
    }
  </style>
</head>
<body>

  <!-- Sticky Actions Bar -->
  <div class="toolbar">
    <div class="toolbar-info">
      <strong>📄 ${escapeHtml(item.title)}</strong>
      <span>•</span>
      <span>${escapeHtml(subjectNameAr)}</span>
      <span>•</span>
      <span>جاهز للطباعة والحفظ كـ PDF</span>
    </div>
    <div class="toolbar-actions">
      <button type="button" class="btn btn-print" onclick="window.print()">
        🖨️ طباعة الشيت (PDF)
      </button>
      <button type="button" class="btn btn-close" onclick="window.close()">
        ✕ إغلاق التبويب
      </button>
    </div>
  </div>

  <div class="sheet-wrapper">
    <div class="sheet-page">
      
      <!-- School Official Header -->
      <div class="school-header">
        <div>
          <div class="school-title">مدارس النيل المصرية الدولية</div>
          <div class="school-sub">Nile Egyptian International Schools • Grade 2</div>
        </div>
        <div class="school-badge-box">
          عام 2025 / 2026<br/>
          Block ${item.blockNumber} • ${escapeHtml(item.categoryLabel || item.category)}
        </div>
      </div>

      <!-- Student Details Box -->
      <div class="student-info-grid">
        <div class="info-item">
          <span class="info-label">اسم الطالب:</span>
          <div class="info-line"></div>
        </div>
        <div class="info-item">
          <span class="info-label">الفصل:</span>
          <span>Grade 2 ( &nbsp;&nbsp;&nbsp;&nbsp; )</span>
        </div>
        <div class="info-item">
          <span class="info-label">المادة:</span>
          <span>${escapeHtml(subjectNameAr)}</span>
        </div>
        <div class="info-item">
          <span class="info-label">الدرجة:</span>
          <span>[ &nbsp;&nbsp;&nbsp; / 20 ]</span>
        </div>
      </div>

      <!-- Sheet Title Banner -->
      <div class="sheet-title-banner">
        <div>
          <h1 class="sheet-title-text">${escapeHtml(item.title)}</h1>
          ${item.unitTitle ? `<div style="font-size: 13px; opacity: 0.9; margin-top: 4px;">${escapeHtml(item.unitTitle)}</div>` : ''}
        </div>
        <div class="sheet-tags">
          <span class="tag">Block ${item.blockNumber}</span>
          <span class="tag">${escapeHtml(item.categoryLabel || item.category)}</span>
          ${item.pageCount ? `<span class="tag">${item.pageCount} صفحة</span>` : ''}
        </div>
      </div>

      <!-- Instruction Callout -->
      <div class="instruction-callout">
        <strong>📌 تعليمات الشيت:</strong> أجب عن جميع الأسئلة الآتية بخط واضح ومرتب، مع مراعاة القراءة المتأنية قبل كتابة الإجابة.
        ${item.notes ? `<div style="margin-top: 6px; font-weight: 500;">ملاحظة خاصة: ${escapeHtml(item.notes)}</div>` : ''}
      </div>

      <!-- Questions List -->
      <div class="questions-container">
        ${questionsHtml}
      </div>

      <!-- Footer -->
      <div class="sheet-footer">
        <span>مدارس النيل المصرية الدولية • Nile Egyptian International Schools</span>
        <span>ورقة عمل وشيت تدريبي معتمد • الصف الثاني الابتدائي</span>
        <span>Page 1 of 1</span>
      </div>

    </div>
  </div>

  <script>
    // Prompt to print or hotkey
    window.addEventListener('keydown', function(e) {
      if ((e.ctrlKey || e.metaKey) && e.key === 'p') {
        e.preventDefault();
        window.print();
      }
    });
  </script>
</body>
</html>
  `;
}

function escapeHtml(str: string): string {
  if (!str) return '';
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}

/**
 * Opens the sheet in a new tab as a complete PDF / printable worksheet.
 * Guaranteed to never get blocked by opening 'about:blank' synchronously on click.
 */
export async function openMaterialSheetInNewTab(
  item: MaterialItem,
  subjectNameAr: string
): Promise<void> {
  // If item is a direct online URL (Google Drive, OneDrive, cloud link):
  // Directly open target URL without writing temporary document to prevent any cross-origin restrictions
  if (item.fileUrl && (item.fileUrl.startsWith('http://') || item.fileUrl.startsWith('https://'))) {
    let targetUrl = item.fileUrl;
    // Format Google Drive links to /view for best full-page native document viewing
    const driveMatch = item.fileUrl.match(/drive\.google\.com\/(?:file\/d\/|open\?id=)([a-zA-Z0-9_-]+)/);
    if (driveMatch && driveMatch[1]) {
      targetUrl = `https://drive.google.com/file/d/${driveMatch[1]}/view`;
    }
    window.open(targetUrl, '_blank', 'noopener,noreferrer');
    return;
  }

  // CRITICAL: Open window synchronously during the user click gesture!
  // This prevents browser popup blockers from suppressing the new tab.
  const newTab = window.open('about:blank', '_blank');

  if (!newTab) {
    alert('تم حظر فتح التبويب الجديد من المتصفح. يرجى السماح بالنوافذ المنبثقة (Allow Popups) في المتصفح.');
    return;
  }

  // Show a temporary clean loading message while resolving any binary blob
  newTab.document.write(`
    <!DOCTYPE html>
    <html dir="rtl">
    <head>
      <meta charset="utf-8" />
      <title>جاري فتح الشيت PDF...</title>
      <style>
        body { font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif; display: flex; align-items: center; justify-content: center; height: 100vh; margin: 0; background: #f8fafc; color: #1e3a8a; text-align: center; }
        .spinner { width: 44px; height: 44px; border: 4px solid #cbd5e1; border-top-color: #2563eb; border-radius: 50%; animation: spin 0.8s linear infinite; margin: 0 auto 16px; }
        @keyframes spin { to { transform: rotate(360deg); } }
      </style>
    </head>
    <body>
      <div>
        <div class="spinner"></div>
        <h2>جاري تجهيز وفتح شيت PDF...</h2>
        <p style="color: #64748b; font-size: 14px; margin-top: 6px;">${escapeHtml(item.title)}</p>
      </div>
    </body>
    </html>
  `);

  try {
    // 2. PRIMARY LOCAL METHOD: Retrieve exact binary from IndexedDB
    const storedBlob = await getMaterialBlob(item.id);
    if (storedBlob) {
      const isPdf =
        !storedBlob.type ||
        storedBlob.type === 'application/pdf' ||
        (item.fileName && item.fileName.toLowerCase().endsWith('.pdf'));
      const mime = isPdf ? 'application/pdf' : (storedBlob.type || 'application/pdf');
      const pdfBlob = new Blob([storedBlob], { type: mime });
      const blobUrl = URL.createObjectURL(pdfBlob);
      newTab.location.href = blobUrl;
      return;
    }

    // 3. SERVER FILE ENDPOINT: Direct server path to the uploaded file
    if (item.fileName || (item.fileUrl && item.fileUrl.startsWith('/api/'))) {
      const candidateUrl = item.fileUrl || `/api/materials/file/${encodeURIComponent(item.fileName || '')}`;
      newTab.location.href = candidateUrl;
      return;
    }

    // 4. Base64 fileData
    if (item.fileData) {
      const pdfBlob = dataUrlToBlob(item.fileData);
      const blobUrl = URL.createObjectURL(pdfBlob);
      newTab.location.href = blobUrl;
      return;
    }

    // 5. Printable worksheet fallback only if absolutely no file or link is attached
    const fullHtml = generateSheetHtml(item, subjectNameAr);
    newTab.document.open();
    newTab.document.write(fullHtml);
    newTab.document.close();
  } catch (err) {
    console.error('Failed to open sheet in new tab:', err);
    const fullHtml = generateSheetHtml(item, subjectNameAr);
    newTab.document.open();
    newTab.document.write(fullHtml);
    newTab.document.close();
  }
}

/**
 * Downloads the exact uploaded file onto the user's device (phone, tablet, computer)
 * completely untransformed with 100% original binary and layout intact.
 */
export async function downloadMaterialSheet(item: MaterialItem): Promise<void> {
  try {
    const filename = item.fileName || `${item.title}.pdf`;

    // 1. Direct Online URL: If link is Google Drive or public file
    if (item.fileUrl && (item.fileUrl.startsWith('http://') || item.fileUrl.startsWith('https://'))) {
      // Check if it's a Google Drive link to convert to direct download URL
      let downloadUrl = item.fileUrl;
      const driveMatch = item.fileUrl.match(/drive\.google\.com\/(?:file\/d\/|open\?id=|uc\?id=)([a-zA-Z0-9_-]+)/);
      if (driveMatch && driveMatch[1]) {
        downloadUrl = `https://drive.google.com/uc?export=download&id=${driveMatch[1]}`;
      }

      // Use an anchor tag with target="_blank" and download attribute
      // This reliably triggers the download without popup blocker suppression
      const a = document.createElement('a');
      a.href = downloadUrl;
      a.target = '_blank';
      a.rel = 'noopener noreferrer';
      a.download = filename;
      document.body.appendChild(a);
      a.click();
      setTimeout(() => {
        if (document.body.contains(a)) document.body.removeChild(a);
      }, 3000);
      return;
    }

    // 2. If stored as a binary Blob in IndexedDB (exact original uploaded file)
    try {
      const storedBlob = await getMaterialBlob(item.id);
      if (storedBlob) {
        const isPdf =
          !storedBlob.type ||
          storedBlob.type === 'application/pdf' ||
          filename.toLowerCase().endsWith('.pdf');
        const mime = isPdf ? 'application/pdf' : (storedBlob.type || 'application/octet-stream');
        const blob = new Blob([storedBlob], { type: mime });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = filename;
        document.body.appendChild(a);
        a.click();
        setTimeout(() => {
          if (document.body.contains(a)) document.body.removeChild(a);
          URL.revokeObjectURL(url);
        }, 60000);
        return;
      }
    } catch (blobErr) {
      console.warn('Could not read blob from IndexedDB:', blobErr);
    }

    // 3. Direct server download endpoint (fetches binary stream for 100% reliable download)
    const serverFileName =
      item.fileName ||
      (item.fileUrl?.startsWith('/api/materials/file/')
        ? decodeURIComponent(item.fileUrl.replace('/api/materials/file/', ''))
        : undefined);

    if (serverFileName) {
      try {
        const serverDownloadUrl = `/api/materials/download/${encodeURIComponent(serverFileName)}`;
        const res = await fetch(serverDownloadUrl);
        if (res.ok) {
          const blob = await res.blob();
          const url = URL.createObjectURL(blob);
          const a = document.createElement('a');
          a.href = url;
          a.download = filename;
          document.body.appendChild(a);
          a.click();
          setTimeout(() => {
            if (document.body.contains(a)) document.body.removeChild(a);
            URL.revokeObjectURL(url);
          }, 60000);
          return;
        }
      } catch (err) {
        console.warn('Direct fetch download error, using anchor fallback:', err);
      }

      // Fallback anchor navigation
      const a = document.createElement('a');
      a.href = `/api/materials/download/${encodeURIComponent(serverFileName)}`;
      a.download = filename;
      document.body.appendChild(a);
      a.click();
      setTimeout(() => {
        if (document.body.contains(a)) document.body.removeChild(a);
      }, 3000);
      return;
    }

    // 4. Base64 fileData (local & instant)
    if (item.fileData) {
      const blob = dataUrlToBlob(item.fileData);
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = filename;
      document.body.appendChild(a);
      a.click();
      setTimeout(() => {
        if (document.body.contains(a)) document.body.removeChild(a);
        URL.revokeObjectURL(url);
      }, 60000);
      return;
    }

    // 5. Default template download fallback
    const fullHtml = generateSheetHtml(item, item.subjectId);
    const blob = new Blob([fullHtml], { type: 'text/html;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${item.title}.html`;
    document.body.appendChild(a);
    a.click();
    setTimeout(() => {
      if (document.body.contains(a)) document.body.removeChild(a);
      URL.revokeObjectURL(url);
    }, 60000);
  } catch (err) {
    console.error('Error downloading material file:', err);
    alert('حدث خطأ أثناء تحميل الملف، يرجى المحاولة مرة أخرى.');
  }
}

/**
 * Directly prints the sheet or opens the PDF print window.
 */
export async function printMaterialSheet(
  item: MaterialItem,
  subjectNameAr: string
): Promise<void> {
  // Open synchronously inside the click handler so popup blockers do not
  // suppress the print tab while IndexedDB/server data is being resolved.
  const printWin = window.open('about:blank', '_blank');
  if (!printWin) {
    alert('تم حظر فتح نافذة الطباعة. يرجى السماح بالنوافذ المنبثقة لهذا الموقع.');
    return;
  }
  printWin.document.write('<!doctype html><title>جاري تجهيز الملف للطباعة...</title><p style="font-family:sans-serif;text-align:center;margin-top:20vh">جاري تجهيز الملف للطباعة...</p>');
  printWin.document.close();

  const navigateAndPrint = (url: string, revoke?: () => void) => {
    let printed = false;
    const printOnce = () => {
      if (printed) return;
      printed = true;
      printWin.focus();
      // Give the browser PDF viewer a moment to finish rendering before the
      // native print dialog is opened.
      window.setTimeout(() => printWin.print(), 250);
      if (revoke) window.setTimeout(revoke, 60_000);
    };
    printWin.addEventListener('load', printOnce, { once: true });
    printWin.location.href = url;
    // Some embedded PDF viewers do not dispatch load reliably.
    window.setTimeout(printOnce, 1800);
  };

  try {
    if (item.fileName) {
      const serverUrl = `/api/materials/file/${encodeURIComponent(item.fileName)}`;
      try {
        const check = await fetch(serverUrl, { method: 'HEAD' });
        if (check.ok) {
          navigateAndPrint(serverUrl);
          return;
        }
      } catch {
        // Fallback
      }
    }

    const storedBlob = await getMaterialBlob(item.id);
    if (storedBlob) {
      const isPdf =
        !storedBlob.type ||
        storedBlob.type === 'application/pdf' ||
        (item.fileName && item.fileName.toLowerCase().endsWith('.pdf'));
      const mime = isPdf ? 'application/pdf' : (storedBlob.type || 'application/pdf');
      const blob = new Blob([storedBlob], { type: mime });
      const blobUrl = URL.createObjectURL(blob);
      navigateAndPrint(blobUrl, () => URL.revokeObjectURL(blobUrl));
      return;
    }

    if (item.fileData) {
      const blob = dataUrlToBlob(item.fileData);
      const blobUrl = URL.createObjectURL(blob);
      navigateAndPrint(blobUrl, () => URL.revokeObjectURL(blobUrl));
      return;
    }

    if (item.fileUrl && item.fileUrl.startsWith('http')) {
      navigateAndPrint(item.fileUrl);
      return;
    }

    // Printable HTML fallback
    const fullHtml = generateSheetHtml(item, subjectNameAr);
    printWin.document.open();
    printWin.document.write(fullHtml);
    printWin.document.close();
    printWin.onload = () => window.setTimeout(() => printWin.print(), 500);
  } catch (err) {
    console.error('Error printing material sheet:', err);
    printWin.close();
  }
}

/**
 * Returns a readable Object URL for embedding the exact PDF inside an iframe.
 */
export async function getMaterialFileUrl(item: MaterialItem): Promise<string | null> {
  try {
    // 1. Prioritize IndexedDB blob (100% reliable locally, offline, and on static hosts like Vercel)
    const storedBlob = await getMaterialBlob(item.id);
    if (storedBlob) {
      const isPdf =
        !storedBlob.type ||
        storedBlob.type === 'application/pdf' ||
        (item.fileName && item.fileName.toLowerCase().endsWith('.pdf'));
      const mime = isPdf ? 'application/pdf' : (storedBlob.type || 'application/pdf');
      return URL.createObjectURL(new Blob([storedBlob], { type: mime }));
    }

    // 2. Base64 fallback if stored
    if (item.fileData) {
      return URL.createObjectURL(dataUrlToBlob(item.fileData));
    }

    // 3. Candidate server URL or external URL
    const candidateUrl =
      item.fileUrl ||
      (item.fileName ? `/api/materials/file/${encodeURIComponent(item.fileName)}` : null);

    if (candidateUrl) {
      // If external full URL (e.g. https://...), return directly
      if (candidateUrl.startsWith('http://') || candidateUrl.startsWith('https://')) {
        // For Google Drive links, convert /view or /edit to /preview for safe iframe embedding!
        const driveMatch = candidateUrl.match(/drive\.google\.com\/(?:file\/d\/|open\?id=)([a-zA-Z0-9_-]+)/);
        if (driveMatch && driveMatch[1]) {
          return `https://drive.google.com/file/d/${driveMatch[1]}/preview`;
        }
        return candidateUrl;
      }

      // If relative server URL, test with HEAD request to verify file is reachable and not 404
      try {
        const testRes = await fetch(candidateUrl, { method: 'HEAD' });
        if (testRes.ok) {
          return candidateUrl;
        }
        console.warn(`File URL ${candidateUrl} returned ${testRes.status}. Avoiding broken iframe.`);
      } catch (headErr) {
        console.warn(`Could not verify candidate file URL ${candidateUrl}:`, headErr);
      }
    }
  } catch (err) {
    console.warn('Could not resolve material file URL:', err);
  }
  return null;
}
