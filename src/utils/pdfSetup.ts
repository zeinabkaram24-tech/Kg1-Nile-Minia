import * as pdfjsLib from 'pdfjs-dist';

// Worker URL on same-origin (served by our Express / Vite static route)
const getLocalWorkerSrc = (): string => {
  if (typeof window !== 'undefined') {
    return '/pdf.worker.min.mjs';
  }
  return `https://unpkg.com/pdfjs-dist@${pdfjsLib.version || '6.3.289'}/build/pdf.worker.min.mjs`;
};

// Initialize worker source immediately if in browser
if (typeof window !== 'undefined' && pdfjsLib.GlobalWorkerOptions) {
  try {
    pdfjsLib.GlobalWorkerOptions.workerSrc = getLocalWorkerSrc();
  } catch (err) {
    console.warn('Failed to set initial pdfjs workerSrc:', err);
  }
}

export async function getPdfDocument(data: Uint8Array) {
  if (typeof window !== 'undefined' && pdfjsLib.GlobalWorkerOptions) {
    pdfjsLib.GlobalWorkerOptions.workerSrc = getLocalWorkerSrc();
  }

  const cdnFallbackSrc = `https://unpkg.com/pdfjs-dist@${pdfjsLib.version || '6.3.289'}/build/pdf.worker.min.mjs`;

  try {
    const loadingTask = pdfjsLib.getDocument({
      data,
      cMapUrl: `https://unpkg.com/pdfjs-dist@${pdfjsLib.version || '6.3.289'}/cmaps/`,
      cMapPacked: true,
      standardFontDataUrl: `https://unpkg.com/pdfjs-dist@${pdfjsLib.version || '6.3.289'}/standard_fonts/`,
    });
    return await loadingTask.promise;
  } catch (primaryErr: any) {
    console.warn('Primary PDF load failed, trying CDN worker fallback:', primaryErr);
    if (typeof window !== 'undefined' && pdfjsLib.GlobalWorkerOptions) {
      pdfjsLib.GlobalWorkerOptions.workerSrc = cdnFallbackSrc;
    }
    const fallbackTask = pdfjsLib.getDocument({
      data,
      cMapUrl: `https://unpkg.com/pdfjs-dist@${pdfjsLib.version || '6.3.289'}/cmaps/`,
      cMapPacked: true,
      standardFontDataUrl: `https://unpkg.com/pdfjs-dist@${pdfjsLib.version || '6.3.289'}/standard_fonts/`,
    });
    return await fallbackTask.promise;
  }
}

export { pdfjsLib };
