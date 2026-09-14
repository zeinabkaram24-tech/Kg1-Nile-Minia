import React, { useState, useEffect, useRef } from 'react';
import {
  X,
  Printer,
  Download,
  ExternalLink,
  FileText,
  AlertCircle,
  Loader2,
  ZoomIn,
  ZoomOut,
  RotateCcw,
  Eye,
} from 'lucide-react';
import { MaterialItem } from '../types';
import { getMaterialBlob } from '../utils/materialsDb';
import { downloadPdfItem, formatBytes } from '../utils/materialsStorage';
import { getPdfDocument } from '../utils/pdfSetup';

interface PdfViewerModalProps {
  isOpen: boolean;
  onClose: () => void;
  item: MaterialItem | null;
}

// Sub-component to render individual PDF page to high-DPI HTML5 Canvas
const PdfPageCanvas: React.FC<{
  pdfDoc: any;
  pageNumber: number;
  zoom: number;
  containerWidth: number;
}> = ({ pdfDoc, pageNumber, zoom, containerWidth }) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [isRendering, setIsRendering] = useState<boolean>(true);
  const [pageSize, setPageSize] = useState<{ width: number; height: number } | null>(null);

  useEffect(() => {
    let isCancelled = false;
    let renderTask: any = null;

    const renderPage = async () => {
      try {
        setIsRendering(true);
        const page = await pdfDoc.getPage(pageNumber);
        if (isCancelled) return;

        const canvas = canvasRef.current;
        if (!canvas) return;

        // Base 1.0 viewport to calculate aspect ratio
        const baseViewport = page.getViewport({ scale: 1.0 });

        // Calculate responsive scale to fit mobile screen width cleanly
        const availableWidth = containerWidth > 100 ? Math.min(containerWidth - 32, 920) : 600;
        const fitScale = availableWidth / baseViewport.width;
        const finalScale = Math.max(0.4, fitScale * zoom);

        const viewport = page.getViewport({ scale: finalScale });
        setPageSize({ width: viewport.width, height: viewport.height });

        // High-DPI handling (cap pixelRatio at 2.0 to conserve mobile RAM while keeping text sharp)
        const pixelRatio = Math.min(window.devicePixelRatio || 1, 2);
        canvas.width = Math.floor(viewport.width * pixelRatio);
        canvas.height = Math.floor(viewport.height * pixelRatio);
        canvas.style.width = `${Math.floor(viewport.width)}px`;
        canvas.style.height = `${Math.floor(viewport.height)}px`;

        const ctx = canvas.getContext('2d');
        if (!ctx) return;

        const transform = pixelRatio !== 1 ? [pixelRatio, 0, 0, pixelRatio, 0, 0] : undefined;

        renderTask = page.render({
          canvasContext: ctx,
          viewport: viewport,
          transform: transform,
        });

        await renderTask.promise;
        if (!isCancelled) {
          setIsRendering(false);
        }
      } catch (err: any) {
        if (err?.name !== 'RenderingCancelledException') {
          console.warn(`Error rendering page ${pageNumber}:`, err);
        }
      }
    };

    renderPage();

    return () => {
      isCancelled = true;
      if (renderTask) {
        try {
          renderTask.cancel();
        } catch {}
      }
    };
  }, [pdfDoc, pageNumber, zoom, containerWidth]);

  return (
    <div className="flex flex-col items-center mb-6 last:mb-2 w-full">
      <div className="flex items-center justify-between w-full max-w-2xl px-2 mb-1.5 text-[11px] font-bold text-slate-400 select-none">
        <span>صفحة {pageNumber}</span>
      </div>
      <div className="relative bg-white shadow-xl rounded-xl overflow-hidden border border-slate-200/80 transition-shadow">
        {isRendering && !pageSize && (
          <div className="w-[300px] sm:w-[480px] h-[400px] sm:h-[650px] bg-slate-100 flex items-center justify-center animate-pulse">
            <Loader2 className="w-7 h-7 text-indigo-500 animate-spin" />
          </div>
        )}
        <canvas ref={canvasRef} className="block mx-auto max-w-full" />
      </div>
    </div>
  );
};

export const PdfViewerModal: React.FC<PdfViewerModalProps> = ({
  isOpen,
  onClose,
  item,
}) => {
  const [pdfDoc, setPdfDoc] = useState<any | null>(null);
  const [numPages, setNumPages] = useState<number>(0);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [zoom, setZoom] = useState<number>(1.0);
  const [isImage, setIsImage] = useState<boolean>(false);
  const [imageUrl, setImageUrl] = useState<string | null>(null);
  const [containerWidth, setContainerWidth] = useState<number>(600);
  const [driveEmbedUrl, setDriveEmbedUrl] = useState<string | null>(null);

  const containerRef = useRef<HTMLDivElement>(null);

  // Measure container width for responsive canvas scaling
  useEffect(() => {
    if (!isOpen) return;

    const updateWidth = () => {
      if (containerRef.current) {
        setContainerWidth(containerRef.current.clientWidth);
      }
    };

    updateWidth();
    const observer = new ResizeObserver(updateWidth);
    if (containerRef.current) {
      observer.observe(containerRef.current);
    }

    window.addEventListener('resize', updateWidth);
    return () => {
      observer.disconnect();
      window.removeEventListener('resize', updateWidth);
    };
  }, [isOpen]);

  // Load and parse document
  useEffect(() => {
    let isCancelled = false;

    const loadDocument = async () => {
      if (!isOpen || !item) {
        setPdfDoc(null);
        setNumPages(0);
        setIsLoading(false);
        setLoadError(null);
        setIsImage(false);
        setImageUrl(null);
        setDriveEmbedUrl(null);
        setZoom(1.0);
        return;
      }

      setIsLoading(true);
      setLoadError(null);
      setPdfDoc(null);
      setNumPages(0);
      setIsImage(false);
      setImageUrl(null);
      setDriveEmbedUrl(null);
      setZoom(1.0);

      try {
        // 1. Check if it's a Google Drive link
        if (item.fileUrl && (item.fileUrl.includes('drive.google.com') || item.fileUrl.includes('docs.google.com'))) {
          const driveMatch = item.fileUrl.match(/drive\.google\.com\/(?:file\/d\/|open\?id=)([a-zA-Z0-9_-]+)/);
          if (driveMatch && driveMatch[1]) {
            setDriveEmbedUrl(`https://drive.google.com/file/d/${driveMatch[1]}/preview`);
            setIsLoading(false);
            return;
          }
        }

        // 2. Check if file is an image
        const isImgFile =
          item.fileName?.match(/\.(png|jpe?g|webp|gif|svg)$/i) ||
          (item.fileData && item.fileData.startsWith('data:image/'));

        if (isImgFile) {
          setIsImage(true);
          if (item.fileData) {
            setImageUrl(item.fileData);
            setIsLoading(false);
            return;
          }
          const blob = await getMaterialBlob(item.id);
          if (blob) {
            setImageUrl(URL.createObjectURL(blob));
            setIsLoading(false);
            return;
          }
          if (item.fileUrl) {
            setImageUrl(item.fileUrl);
            setIsLoading(false);
            return;
          }
        }

        // 3. Retrieve binary data for PDF (Uint8Array)
        let bytes: Uint8Array | null = null;

        // A. From IndexedDB
        try {
          const blob = await getMaterialBlob(item.id);
          if (blob) {
            const buffer = await blob.arrayBuffer();
            bytes = new Uint8Array(buffer);
          }
        } catch (dbErr) {
          console.warn('Could not read blob from IndexedDB:', dbErr);
        }

        // B. From Base64 fileData
        if (!bytes && item.fileData) {
          try {
            const base64Data = item.fileData.includes(',')
              ? item.fileData.split(',')[1]
              : item.fileData;
            const binaryString = atob(base64Data);
            const len = binaryString.length;
            bytes = new Uint8Array(len);
            for (let i = 0; i < len; i++) {
              bytes[i] = binaryString.charCodeAt(i);
            }
          } catch (b64Err) {
            console.warn('Failed to parse base64 fileData:', b64Err);
          }
        }

        // C. From fileUrl fetch
        if (!bytes && item.fileUrl) {
          try {
            const res = await fetch(item.fileUrl);
            if (res.ok) {
              const buffer = await res.arrayBuffer();
              bytes = new Uint8Array(buffer);
            }
          } catch (fetchErr) {
            console.warn('Failed to fetch fileUrl:', fetchErr);
          }
        }

        if (isCancelled) return;

        if (!bytes || bytes.length === 0) {
          // If no binary data found, check if direct fileUrl can be opened
          if (item.fileUrl) {
            window.open(item.fileUrl, '_blank');
            onClose();
            return;
          }
          setLoadError('تعذر العثور على بيانات ملف الـ PDF للعرض.');
          setIsLoading(false);
          return;
        }

        // 4. Load with PDF.js
        const doc = await getPdfDocument(bytes);
        if (isCancelled) return;

        setPdfDoc(doc);
        setNumPages(doc.numPages);
        setIsLoading(false);
      } catch (err: any) {
        console.error('Error loading PDF document:', err);
        if (!isCancelled) {
          setLoadError('حدث خطأ أثناء فتح ملف الـ PDF. يمكنك تحميل الملف مباشرة.');
          setIsLoading(false);
        }
      }
    };

    loadDocument();

    return () => {
      isCancelled = true;
    };
  }, [isOpen, item]);

  // Handle ESC key
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isOpen) {
        onClose();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  if (!isOpen || !item) return null;

  const fileName = item.fileName || item.title || 'ملف PDF';
  const fileSizeStr =
    typeof item.fileSize === 'number'
      ? formatBytes(item.fileSize)
      : item.fileSize || '';

  const handleZoomIn = () => setZoom((prev) => Math.min(prev + 0.25, 2.5));
  const handleZoomOut = () => setZoom((prev) => Math.max(prev - 0.25, 0.5));
  const handleResetZoom = () => setZoom(1.0);

  const handlePrint = () => {
    window.print();
  };

  const handleDownload = () => {
    downloadPdfItem(item);
  };

  const handleOpenExternal = () => {
    if (item.fileUrl) {
      window.open(item.fileUrl, '_blank');
    } else {
      downloadPdfItem(item);
    }
  };

  return (
    <div
      className="fixed inset-0 z-[100] flex items-center justify-center p-1 sm:p-4 bg-slate-950/85 backdrop-blur-sm animate-in fade-in duration-200"
      dir="rtl"
    >
      <div
        className="bg-slate-900 rounded-2xl sm:rounded-3xl w-full max-w-5xl h-[96vh] sm:h-[92vh] shadow-2xl border border-slate-700/80 flex flex-col overflow-hidden text-slate-100"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Top Header Bar */}
        <div className="bg-slate-900 text-white px-3 sm:px-6 py-2.5 sm:py-3.5 flex items-center justify-between gap-2 sm:gap-3 border-b border-slate-800 shrink-0">
          <div className="flex items-center gap-2 sm:gap-3 min-w-0">
            <div className="w-8 h-8 sm:w-10 sm:h-10 rounded-xl bg-amber-500/20 text-amber-400 flex items-center justify-center border border-amber-500/30 shrink-0">
              <FileText className="w-4 h-4 sm:w-5 sm:h-5" />
            </div>
            <div className="min-w-0">
              <div className="flex items-center gap-1.5 sm:gap-2 flex-wrap">
                <h3 className="text-xs sm:text-base font-black text-white truncate max-w-[150px] sm:max-w-md" title={fileName}>
                  {fileName}
                </h3>
                <span className="px-1.5 sm:px-2 py-0.5 rounded-full text-[9px] sm:text-[10px] font-extrabold bg-indigo-500/20 text-indigo-300 border border-indigo-500/30">
                  Topic {item.block || 1} • {item.section || 'General'}
                </span>
                {item.classId && item.classId !== 'ALL' && (
                  <span className="px-1.5 sm:px-2 py-0.5 rounded-full text-[9px] sm:text-[10px] font-extrabold bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">
                    {item.classId}
                  </span>
                )}
              </div>
              <div className="text-[10px] sm:text-[11px] text-slate-400 font-semibold mt-0.5 flex items-center gap-1.5">
                <span>معاينة الشيت المرفوع</span>
                {numPages > 0 && (
                  <>
                    <span>•</span>
                    <span className="text-amber-400 font-bold">{numPages} {numPages === 1 ? 'صفحة' : 'صفحات'}</span>
                  </>
                )}
                {fileSizeStr && (
                  <>
                    <span>•</span>
                    <span>{fileSizeStr}</span>
                  </>
                )}
              </div>
            </div>
          </div>

          {/* Action Toolbar */}
          <div className="flex items-center gap-1 sm:gap-2 shrink-0">
            {/* Zoom Controls (visible when PDF is loaded) */}
            {numPages > 0 && (
              <div className="hidden sm:flex items-center bg-slate-800 rounded-xl p-1 border border-slate-700">
                <button
                  type="button"
                  onClick={handleZoomOut}
                  disabled={zoom <= 0.5}
                  className="p-1.5 text-slate-300 hover:text-white disabled:opacity-30 rounded-lg hover:bg-slate-700 transition-colors"
                  title="تصغير (-)"
                >
                  <ZoomOut className="w-3.5 h-3.5" />
                </button>
                <button
                  type="button"
                  onClick={handleResetZoom}
                  className="px-2 text-[11px] font-bold text-slate-300 hover:text-white"
                  title="إعادة ضبط الحجم"
                >
                  {Math.round(zoom * 100)}%
                </button>
                <button
                  type="button"
                  onClick={handleZoomIn}
                  disabled={zoom >= 2.5}
                  className="p-1.5 text-slate-300 hover:text-white disabled:opacity-30 rounded-lg hover:bg-slate-700 transition-colors"
                  title="تكبير (+)"
                >
                  <ZoomIn className="w-3.5 h-3.5" />
                </button>
              </div>
            )}

            {/* Download button */}
            <button
              type="button"
              id="pdf-preview-download-btn"
              onClick={handleDownload}
              className="px-2.5 sm:px-3 py-1.5 sm:py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold transition-colors flex items-center gap-1.5 cursor-pointer shadow-2xs"
              title="تحميل الملف على جهازك"
            >
              <Download className="w-3.5 h-3.5" />
              <span className="hidden md:inline">تحميل</span>
            </button>

            {/* Print button */}
            <button
              type="button"
              id="pdf-preview-print-btn"
              onClick={handlePrint}
              className="p-2 sm:px-3 sm:py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 hover:text-white text-xs font-bold transition-colors flex items-center gap-1.5 border border-slate-700 cursor-pointer"
              title="طباعة الشيت"
            >
              <Printer className="w-3.5 h-3.5 text-slate-300" />
              <span className="hidden md:inline">طباعة</span>
            </button>

            {/* Close Button */}
            <button
              type="button"
              id="pdf-preview-close-btn"
              onClick={onClose}
              className="p-2 sm:p-2 rounded-xl bg-rose-500/15 hover:bg-rose-500/30 text-rose-300 hover:text-rose-100 text-xs font-bold transition-colors border border-rose-500/40 cursor-pointer ms-0.5"
              title="إغلاق المعاينة"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Mobile Zoom Floating Bar */}
        {numPages > 0 && (
          <div className="sm:hidden bg-slate-800/90 backdrop-blur-xs border-b border-slate-700/80 px-3 py-1.5 flex items-center justify-between text-xs shrink-0">
            <span className="text-[11px] text-slate-300 font-semibold">
              عدد الصفحات: <b className="text-amber-400">{numPages}</b>
            </span>
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={handleZoomOut}
                disabled={zoom <= 0.5}
                className="px-2 py-1 bg-slate-700 text-slate-200 rounded-md text-xs font-bold"
              >
                -
              </button>
              <span className="text-[11px] font-bold text-slate-200">{Math.round(zoom * 100)}%</span>
              <button
                type="button"
                onClick={handleZoomIn}
                disabled={zoom >= 2.5}
                className="px-2 py-1 bg-slate-700 text-slate-200 rounded-md text-xs font-bold"
              >
                +
              </button>
              <button
                type="button"
                onClick={handleResetZoom}
                className="p-1 text-slate-400 hover:text-white"
                title="إعادة ضبط"
              >
                <RotateCcw className="w-3 h-3" />
              </button>
            </div>
          </div>
        )}

        {/* Main Viewer Body (Canvas / Image / Drive) */}
        <div
          ref={containerRef}
          className="flex-1 bg-slate-950/90 relative overflow-y-auto overflow-x-auto p-2 sm:p-6 flex flex-col items-center"
          style={{ WebkitOverflowScrolling: 'touch' }}
        >
          {/* Loading Indicator */}
          {isLoading && (
            <div className="flex flex-col items-center justify-center p-12 my-auto text-center space-y-3">
              <Loader2 className="w-10 h-10 text-amber-400 animate-spin" />
              <p className="text-sm font-bold text-slate-200">جاري تحميل وتجهيز صفحات الـ PDF للعرض فوراً...</p>
              <p className="text-xs text-slate-400">يعمل بكفاءة عالية على جميع أجهزة الموبايل والكمبيوتر</p>
            </div>
          )}

          {/* Error Message */}
          {loadError && !isLoading && (
            <div className="max-w-md p-6 bg-slate-900 rounded-2xl shadow-xl border border-slate-700 text-center space-y-3 m-auto">
              <div className="w-12 h-12 rounded-full bg-rose-500/20 text-rose-400 flex items-center justify-center mx-auto border border-rose-500/30">
                <AlertCircle className="w-6 h-6" />
              </div>
              <h4 className="text-base font-black text-white">تعذر عرض المعاينة المباشرة</h4>
              <p className="text-xs text-slate-300 font-medium leading-relaxed">
                {loadError}
              </p>
              <div className="pt-2 flex justify-center gap-2">
                <button
                  type="button"
                  onClick={handleDownload}
                  className="px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold transition-colors inline-flex items-center gap-2 cursor-pointer shadow-sm"
                >
                  <Download className="w-3.5 h-3.5" />
                  <span>تحميل الملف الآن</span>
                </button>
                <button
                  type="button"
                  onClick={onClose}
                  className="px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-bold transition-colors cursor-pointer border border-slate-700"
                >
                  إغلاق
                </button>
              </div>
            </div>
          )}

          {/* Google Drive Embed */}
          {driveEmbedUrl && !isLoading && !loadError && (
            <div className="w-full h-full min-h-[500px] rounded-xl overflow-hidden border border-slate-700 bg-white">
              <iframe
                src={driveEmbedUrl}
                className="w-full h-full border-0"
                title={fileName}
                allow="autoplay"
              />
            </div>
          )}

          {/* Direct Image Rendering */}
          {isImage && imageUrl && !isLoading && !loadError && (
            <div className="my-auto flex flex-col items-center max-w-full">
              <img
                src={imageUrl}
                alt={fileName}
                className="max-w-full max-h-[80vh] rounded-xl shadow-2xl border border-slate-700 object-contain"
                style={{ transform: `scale(${zoom})`, transformOrigin: 'center top', transition: 'transform 0.15s ease-out' }}
              />
            </div>
          )}

          {/* HTML5 Canvas Rendered PDF Pages (Sequential continuous scroll) */}
          {pdfDoc && numPages > 0 && !isLoading && !loadError && (
            <div className="w-full flex flex-col items-center space-y-4 max-w-3xl">
              {Array.from({ length: numPages }, (_, idx) => idx + 1).map((pageNum) => (
                <PdfPageCanvas
                  key={`page-${pageNum}`}
                  pdfDoc={pdfDoc}
                  pageNumber={pageNum}
                  zoom={zoom}
                  containerWidth={containerWidth}
                />
              ))}
            </div>
          )}
        </div>

        {/* Bottom Helper Bar */}
        <div className="bg-slate-900 border-t border-slate-800 px-4 py-2 flex items-center justify-between text-xs text-slate-400 shrink-0">
          <div className="flex items-center gap-2 font-medium text-[11px] sm:text-xs">
            <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse"></span>
            <span>عرض متوافق 100% مع الموبايل والتابلت</span>
          </div>
          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={handleDownload}
              className="text-[11px] text-amber-400 hover:text-amber-300 font-bold flex items-center gap-1"
            >
              <Download className="w-3 h-3" />
              <span>تحميل نسخة</span>
            </button>
            <button
              type="button"
              onClick={onClose}
              className="text-xs font-bold text-slate-300 hover:text-white cursor-pointer"
            >
              إغلاق المعاينة
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

