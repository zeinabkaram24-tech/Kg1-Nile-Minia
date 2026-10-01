import React, { useState, useEffect, useRef } from 'react';
import * as pdfjsLib from 'pdfjs-dist';
import workerUrl from 'pdfjs-dist/build/pdf.worker.min.mjs?url';
import { ZoomIn, ZoomOut, RotateCcw, Loader2, AlertCircle } from 'lucide-react';

if (typeof window !== 'undefined' && !pdfjsLib.GlobalWorkerOptions.workerSrc) {
  pdfjsLib.GlobalWorkerOptions.workerSrc = workerUrl;
}

interface PdfCanvasViewerProps {
  fileData?: string; // base64 or data: URL
  blobUrl?: string;
  fileName?: string;
}

interface PageData {
  pageNumber: number;
  width: number;
  height: number;
}

export const PdfCanvasViewer: React.FC<PdfCanvasViewerProps> = ({
  fileData,
  blobUrl,
  fileName,
}) => {
  const [pdfDoc, setPdfDoc] = useState<pdfjsLib.PDFDocumentProxy | null>(null);
  const [numPages, setNumPages] = useState<number>(0);
  const [zoom, setZoom] = useState<number>(1.0);
  const [loading, setLoading] = useState<boolean>(true);
  const [loadingError, setLoadingError] = useState<string | null>(null);
  const [renderedPages, setRenderedPages] = useState<Set<number>>(new Set());

  const containerRef = useRef<HTMLDivElement>(null);
  const canvasRefs = useRef<Map<number, HTMLCanvasElement>>(new Map());

  // 1. Load PDF document
  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setLoadingError(null);
    setRenderedPages(new Set());

    const loadDoc = async () => {
      try {
        let source: any = null;

        if (fileData && fileData.includes(',')) {
          const base64 = fileData.split(',')[1];
          const binaryStr = atob(base64);
          const bytes = new Uint8Array(binaryStr.length);
          for (let i = 0; i < binaryStr.length; i++) {
            bytes[i] = binaryStr.charCodeAt(i);
          }
          source = { data: bytes };
        } else if (fileData && fileData.startsWith('http')) {
          source = { url: fileData };
        } else if (blobUrl) {
          source = { url: blobUrl };
        } else {
          throw new Error('لا توجد بيانات صالحة لملف الـ PDF');
        }

        const task = pdfjsLib.getDocument(source);
        const doc = await task.promise;

        if (!cancelled) {
          setPdfDoc(doc);
          setNumPages(doc.numPages);
          setLoading(false);
        }
      } catch (err: any) {
        console.error('PdfCanvasViewer load error:', err);
        if (!cancelled) {
          setLoadingError(err.message || 'تعذر تحميل صفحات المستند');
          setLoading(false);
        }
      }
    };

    loadDoc();

    return () => {
      cancelled = true;
    };
  }, [fileData, blobUrl]);

  // 2. Render all pages with crisp High-DPI canvas
  useEffect(() => {
    if (!pdfDoc || numPages === 0) return;

    let cancelled = false;

    const renderAll = async () => {
      for (let pageNum = 1; pageNum <= numPages; pageNum++) {
        if (cancelled) break;
        const canvas = canvasRefs.current.get(pageNum);
        if (!canvas) continue;

        try {
          const page = await pdfDoc.getPage(pageNum);
          if (cancelled) break;

          // Determine scale: Fit to container width on mobile or responsive desktop
          const containerWidth = containerRef.current?.clientWidth || window.innerWidth;
          // Target page width roughly 92% of container on mobile, or max 800px on desktop
          const baseViewport = page.getViewport({ scale: 1.0 });
          const targetWidth = Math.min(containerWidth - 32, 850);
          const fitScale = targetWidth > 100 ? (targetWidth / baseViewport.width) : 1.0;
          const currentScale = fitScale * zoom;

          const viewport = page.getViewport({ scale: currentScale });
          const dpr = Math.min(window.devicePixelRatio || 1.5, 2.0); // Retina sharpness capped for performance

          canvas.width = Math.floor(viewport.width * dpr);
          canvas.height = Math.floor(viewport.height * dpr);
          canvas.style.width = `${Math.floor(viewport.width)}px`;
          canvas.style.height = `${Math.floor(viewport.height)}px`;

          const ctx = canvas.getContext('2d');
          if (ctx) {
            ctx.scale(dpr, dpr);
            const renderContext = {
              canvasContext: ctx,
              viewport: viewport,
            };
            await page.render(renderContext as any).promise;
            if (!cancelled) {
              setRenderedPages((prev) => new Set(prev).add(pageNum));
            }
          }
        } catch (pageErr) {
          console.warn(`Error rendering page ${pageNum}:`, pageErr);
        }
      }
    };

    renderAll();

    return () => {
      cancelled = true;
    };
  }, [pdfDoc, numPages, zoom]);

  const handleZoomIn = () => setZoom((z) => Math.min(z + 0.25, 2.5));
  const handleZoomOut = () => setZoom((z) => Math.max(z - 0.25, 0.6));
  const handleResetZoom = () => setZoom(1.0);

  if (loading) {
    return (
      <div className="flex-1 flex flex-col items-center justify-center p-8 bg-slate-50 text-center gap-3">
        <Loader2 className="w-10 h-10 text-indigo-600 animate-spin" />
        <p className="text-sm font-black text-slate-800">جاري عرض وتجهيز صفحات المستند مباشرة...</p>
        <span className="text-xs text-slate-400 font-semibold">{fileName}</span>
      </div>
    );
  }

  if (loadingError) {
    return (
      <div className="flex-1 flex flex-col items-center justify-center p-8 bg-slate-50 text-center gap-3">
        <AlertCircle className="w-10 h-10 text-rose-500" />
        <p className="text-sm font-black text-slate-800">تعذر عرض الملف مباشرة داخل الصفحة</p>
        <p className="text-xs text-slate-500 max-w-sm">{loadingError}</p>
        {blobUrl && (
          <a
            href={blobUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="mt-2 px-6 py-2.5 bg-indigo-600 text-white rounded-xl font-bold text-xs shadow-md"
          >
            فتح الملف في عارض خارجي
          </a>
        )}
      </div>
    );
  }

  return (
    <div className="flex-1 flex flex-col bg-slate-200/80 overflow-hidden relative">
      {/* Sticky Top Toolbar for Zoom & Page count */}
      <div className="py-2 px-4 bg-white/95 backdrop-blur-xs border-b border-slate-200 flex items-center justify-between gap-3 shrink-0 text-xs shadow-2xs z-10">
        <div className="flex items-center gap-2 text-slate-700 font-bold">
          <span className="px-2 py-0.5 rounded-md bg-indigo-50 text-indigo-900 border border-indigo-200 text-[11px] font-black">
            {numPages} صفحة
          </span>
          <span className="hidden sm:inline text-slate-400">• تصفح مستمر</span>
        </div>

        {/* Zoom Controls */}
        <div className="flex items-center gap-1.5 bg-slate-100 p-1 rounded-xl border border-slate-200">
          <button
            type="button"
            onClick={handleZoomOut}
            disabled={zoom <= 0.6}
            className="p-1.5 rounded-lg hover:bg-white text-slate-700 disabled:opacity-40 transition-colors cursor-pointer"
            title="تصغير"
          >
            <ZoomOut className="w-3.5 h-3.5" />
          </button>
          <span className="px-1.5 text-[11px] font-black text-slate-700 min-w-[42px] text-center">
            {Math.round(zoom * 100)}%
          </span>
          <button
            type="button"
            onClick={handleZoomIn}
            disabled={zoom >= 2.5}
            className="p-1.5 rounded-lg hover:bg-white text-slate-700 disabled:opacity-40 transition-colors cursor-pointer"
            title="تكبير"
          >
            <ZoomIn className="w-3.5 h-3.5" />
          </button>
          {zoom !== 1.0 && (
            <button
              type="button"
              onClick={handleResetZoom}
              className="p-1.5 rounded-lg hover:bg-white text-indigo-600 transition-colors cursor-pointer"
              title="إعادة الحجم الافتراضي"
            >
              <RotateCcw className="w-3.5 h-3.5" />
            </button>
          )}
        </div>
      </div>

      {/* Pages Container - Smooth Continuous Scroll */}
      <div
        ref={containerRef}
        className="flex-1 overflow-y-auto p-3 sm:p-6 space-y-6 flex flex-col items-center"
      >
        {Array.from({ length: numPages }, (_, i) => i + 1).map((pageNum) => (
          <div
            key={pageNum}
            className="flex flex-col items-center shadow-lg rounded-xl overflow-hidden bg-white border border-slate-300 relative group transition-all"
          >
            {/* Page Header Badge */}
            <div className="w-full py-1 px-3 bg-slate-100/90 border-b border-slate-200 flex items-center justify-between text-[11px] font-bold text-slate-500">
              <span>صفحة {pageNum} من {numPages}</span>
            </div>

            {/* Canvas */}
            <canvas
              ref={(el) => {
                if (el) canvasRefs.current.set(pageNum, el);
                else canvasRefs.current.delete(pageNum);
              }}
              className="block bg-white"
            />
          </div>
        ))}
      </div>
    </div>
  );
};
