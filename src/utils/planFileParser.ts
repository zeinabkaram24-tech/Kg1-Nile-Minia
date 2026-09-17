import { getPdfDocument } from './pdfSetup';

/** Extracts readable rows from common weekly-plan file formats. */
export async function extractWeeklyPlanText(file: File): Promise<string> {
  const name = file.name.toLowerCase();
  const buffer = await file.arrayBuffer();

  if (name.endsWith('.csv') || name.endsWith('.txt')) {
    return normalizeWeeklyPlanDigits(await file.text());
  }

  if (name.endsWith('.pdf')) {
    const pdf = await getPdfDocument(new Uint8Array(buffer));
    const pages: string[] = [];
    for (let pageNumber = 1; pageNumber <= pdf.numPages; pageNumber += 1) {
      const page = await pdf.getPage(pageNumber);
      const content = await page.getTextContent();
      
      // Bucket by approximate line (4px tolerance) to keep table row cells together
      const rows = new Map<number, Array<{ x: number; text: string }>>();
      for (const item of content.items as Array<{ str?: string; transform?: number[] }>) {
        if (!item.str || !item.str.trim()) continue;
        const rawY = item.transform?.[5] ?? 0;
        const x = item.transform?.[4] ?? 0;
        const bucketY = Math.round(rawY / 4) * 4;
        const row = rows.get(bucketY) || [];
        row.push({ x, text: item.str });
        rows.set(bucketY, row);
      }

      // Sort rows top-to-bottom (higher Y to lower Y in PDF coordinates)
      const sortedBuckets = [...rows.entries()].sort((a, b) => b[0] - a[0]);
      
      const pageLines: string[] = [];
      for (const [, items] of sortedBuckets) {
        // Sort items inside row by X coordinate
        items.sort((a, b) => a.x - b.x);

        let rowText = '';
        for (let i = 0; i < items.length; i++) {
          const it = items[i];
          if (i > 0) {
            const prev = items[i - 1];
            // Approximate gap between items. If gap > 20 pt, treat as table column separation
            const estimatedPrevEnd = prev.x + Math.max(prev.text.length * 4.5, 10);
            const gap = it.x - estimatedPrevEnd;
            if (gap > 20) {
              rowText += ' | ';
            } else {
              rowText += ' ';
            }
          }
          rowText += it.text;
        }

        const lineText = rowText.trim();
        if (lineText) {
          pageLines.push(lineText);
        }
      }

      pages.push(pageLines.join('\n'));
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
