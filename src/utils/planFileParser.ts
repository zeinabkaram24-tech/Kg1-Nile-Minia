import * as XLSX from 'xlsx';

/** Extracts readable rows from common weekly-plan file formats. */
export async function extractWeeklyPlanText(file: File): Promise<string> {
  const name = file.name.toLowerCase();
  const buffer = await file.arrayBuffer();

  if (name.endsWith('.xlsx') || name.endsWith('.xls') || name.endsWith('.csv')) {
    const workbook = XLSX.read(buffer, { type: 'array', cellDates: true });
    return normalizeWeeklyPlanDigits(workbook.SheetNames.map((sheetName) => {
      const sheet = workbook.Sheets[sheetName];
      return XLSX.utils.sheet_to_csv(sheet, { FS: '\t', RS: '\n', blankrows: false });
    }).join('\n'));
  }

  if (name.endsWith('.docx')) {
    const mammoth = await import('mammoth');
    const result = await mammoth.extractRawText({ arrayBuffer: buffer });
    return normalizeWeeklyPlanDigits(result.value);
  }

  if (name.endsWith('.pdf')) {
    const pdfjs = await import('pdfjs-dist/legacy/build/pdf.mjs');
    const pdf = await pdfjs.getDocument({ data: new Uint8Array(buffer) }).promise;
    const pages: string[] = [];
    for (let pageNumber = 1; pageNumber <= pdf.numPages; pageNumber += 1) {
      const page = await pdf.getPage(pageNumber);
      const content = await page.getTextContent();
      const rows = new Map<number, string[]>();
      for (const item of content.items as Array<{ str?: string; transform?: number[] }>) {
        if (!item.str) continue;
        const y = Math.round(item.transform?.[5] ?? 0);
        const row = rows.get(y) || [];
        row.push(item.str);
        rows.set(y, row);
      }
      pages.push([...rows.entries()]
        .sort((a, b) => b[0] - a[0])
        .map(([, parts]) => parts.join(' ').trim())
        .filter(Boolean)
        .join('\n'));
    }
    return normalizeWeeklyPlanDigits(pages.join('\n'));
  }

  return normalizeWeeklyPlanDigits(await file.text());
}

/** Normalize Arabic/Persian digits so page extraction works for Arabic PDFs. */
export function normalizeWeeklyPlanDigits(text: string): string {
  return text.replace(/[٠-٩۰-۹]/g, (digit) => {
    const arabic = '٠١٢٣٤٥٦٧٨٩';
    const persian = '۰۱۲۳۴۵۶۷۸۹';
    const index = arabic.indexOf(digit);
    if (index >= 0) return String(index);
    const persianIndex = persian.indexOf(digit);
    return persianIndex >= 0 ? String(persianIndex) : digit;
  });
}
