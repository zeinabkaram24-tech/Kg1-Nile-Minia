import React, { useState, useEffect } from 'react';
import {
  X,
  Printer,
  Download,
  ExternalLink,
  Maximize2,
  Minimize2,
  FileText,
  AlertCircle,
  Loader2,
  Share2,
} from 'lucide-react';
import { MaterialItem } from '../types';
import { dataUrlToBlob, downloadPdfItem, printPdfItem, formatBytes } from '../utils/materialsStorage';

interface PdfViewerModalProps {
  isOpen: boolean;
  onClose: () => void;
  item: MaterialItem | null;
}

export const PdfViewerModal: React.FC<PdfViewerModalProps> = ({
  isOpen,
  onClose,
  item,
}) => {
  const [blobUrl, setBlobUrl] = useState<string | null>(null);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);

  useEffect(() => {
    if (!isOpen || !item) {
      if (blobUrl) {
        URL.revokeObjectURL(blobUrl);
        setBlobUrl(null);
      }
      setIsLoading(false);
      setLoadError(null);
      setIsFullscreen(false);
      return;
    }

    setIsLoading(true);
    setLoadError(null);

    try {
      // 1. If base64 fileData exists, convert to blob URL
      if (item.fileData && item.fileData.startsWith('data:')) {
        const blob = dataUrlToBlob(item.fileData);
        const url = URL.createObjectURL(blob);
        setBlobUrl(url);
        setIsLoading(false);
        return;
      }

      // 2. If fileUrl exists (e.g. /api/materials/file/... or https://...)
      if (item.fileUrl) {
        setBlobUrl(item.fileUrl);
        setIsLoading(false);
        return;
      }

      // 3. If fileName exists, fallback to server URL
      if (item.fileName) {
        const candidate = `/api/materials/file/${encodeURIComponent(item.fileName)}`;
        setBlobUrl(candidate);
        setIsLoading(false);
        return;
      }

      setLoadError('لا توجد بيانات متاحة لهذا الملف لعرضها.');
      setIsLoading(false);
    } catch (err) {
      console.error('Error preparing PDF for viewer:', err);
      setLoadError('حدث خطأ أثناء تجهيز الملف للعرض.');
      setIsLoading(false);
    }

    return () => {
      if (blobUrl && blobUrl.startsWith('blob:')) {
        URL.revokeObjectURL(blobUrl);
      }
    };
  }, [isOpen, item]);

  if (!isOpen || !item) return null;

  const displayName = item.fileName || item.title || 'مستند PDF';
  const effectiveUrl = blobUrl || item.fileUrl || '';

  const handlePrint = () => {
    printPdfItem(item);
  };

  const handleDownload = () => {
    downloadPdfItem(item);
  };

  const handleOpenInNewTab = () => {
    if (effectiveUrl) {
      window.open(effectiveUrl, '_blank', 'noopener,noreferrer');
    }
  };

  const toggleFullscreen = () => {
    setIsFullscreen((prev) => !prev);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-2 sm:p-4 bg-slate-950/80 backdrop-blur-sm animate-in fade-in duration-150">
      <div
        className={`bg-white rounded-2xl sm:rounded-3xl shadow-2xl border border-slate-200 flex flex-col overflow-hidden transition-all duration-200 ${
          isFullscreen
            ? 'w-full h-full max-w-none max-h-none rounded-none'
            : 'w-full max-w-5xl h-[92vh] max-h-[900px]'
        }`}
      >
        {/* Modal Header */}
        <div className="flex items-center justify-between px-3 sm:px-5 py-3 border-b border-slate-200 bg-slate-50/90 shrink-0 gap-2">
          {/* File Info */}
          <div className="flex items-center gap-2.5 min-w-0">
            <div className="w-9 h-9 rounded-xl bg-rose-50 text-rose-600 border border-rose-200 flex items-center justify-center shrink-0">
              <FileText className="w-5 h-5" />
            </div>
            <div className="min-w-0">
              <h3 className="text-xs sm:text-sm font-black text-slate-900 truncate max-w-[200px] sm:max-w-md" title={displayName}>
                {displayName}
              </h3>
              <div className="flex items-center gap-1.5 text-[11px] text-slate-500 font-semibold">
                {item.block && (
                  <span className="bg-amber-100/80 text-amber-900 px-1.5 py-0.5 rounded text-[10px] font-bold">
                    Topic {item.block}
                  </span>
                )}
                {item.section && (
                  <span className="text-slate-600 font-bold">
                    • {item.section}
                  </span>
                )}
                {item.fileSize ? (
                  <span className="text-slate-400">
                    • {typeof item.fileSize === 'number' ? formatBytes(item.fileSize) : item.fileSize}
                  </span>
                ) : null}
              </div>
            </div>
          </div>

          {/* Actions Bar */}
          <div className="flex items-center gap-1 sm:gap-1.5 shrink-0">
            {/* Print Button */}
            <button
              type="button"
              onClick={handlePrint}
              className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-800 text-xs font-black transition-colors cursor-pointer"
              title="طباعة الملف"
            >
              <Printer className="w-3.5 h-3.5 text-slate-600" />
              <span className="hidden sm:inline">طباعة</span>
            </button>

            {/* Download Button */}
            <button
              type="button"
              onClick={handleDownload}
              className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-xl bg-emerald-50 hover:bg-emerald-100 text-emerald-900 text-xs font-black border border-emerald-200 transition-colors cursor-pointer"
              title="تحميل الملف للجهاز"
            >
              <Download className="w-3.5 h-3.5 text-emerald-600" />
              <span className="hidden sm:inline">تحميل</span>
            </button>

            {/* Open in new tab button */}
            {effectiveUrl && (
              <button
                type="button"
                onClick={handleOpenInNewTab}
                className="inline-flex items-center gap-1 px-2 py-1.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-black transition-colors cursor-pointer"
                title="فتح في نافذة جديدة"
              >
                <ExternalLink className="w-3.5 h-3.5" />
              </button>
            )}

            {/* Toggle Fullscreen */}
            <button
              type="button"
              onClick={toggleFullscreen}
              className="hidden sm:inline-flex items-center justify-center w-8 h-8 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 transition-colors cursor-pointer"
              title={isFullscreen ? 'تصغير الشاشة' : 'تكبير الشاشة'}
            >
              {isFullscreen ? <Minimize2 className="w-4 h-4" /> : <Maximize2 className="w-4 h-4" />}
            </button>

            {/* Close Button */}
            <button
              type="button"
              onClick={onClose}
              className="w-8 h-8 rounded-xl bg-slate-200/80 hover:bg-rose-100 hover:text-rose-700 text-slate-700 flex items-center justify-center transition-colors cursor-pointer ms-1"
              title="إغلاق العارض"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Modal Body: The PDF viewer iframe / object */}
        <div className="flex-1 bg-slate-800 relative flex items-center justify-center overflow-hidden">
          {isLoading && (
            <div className="absolute inset-0 bg-slate-900/50 flex flex-col items-center justify-center text-white gap-2 z-10">
              <Loader2 className="w-7 h-7 animate-spin text-amber-400" />
              <span className="text-xs font-bold">جاري فتح وتجهيز المستند...</span>
            </div>
          )}

          {loadError ? (
            <div className="max-w-md p-6 bg-white rounded-2xl text-center space-y-3 m-4 shadow-xl">
              <div className="w-12 h-12 rounded-2xl bg-rose-50 text-rose-600 flex items-center justify-center mx-auto">
                <AlertCircle className="w-6 h-6" />
              </div>
              <h4 className="text-sm font-black text-slate-900">{loadError}</h4>
              <p className="text-xs text-slate-500 font-semibold leading-relaxed">
                يمكنك تحميل الملف مباشرة واستعراضه على جهازك بدون مشاكل.
              </p>
              <div className="flex items-center justify-center gap-2 pt-2">
                <button
                  type="button"
                  onClick={handleDownload}
                  className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold flex items-center gap-1.5 shadow-sm transition-colors cursor-pointer"
                >
                  <Download className="w-3.5 h-3.5" />
                  <span>تحميل الملف الآن</span>
                </button>
              </div>
            </div>
          ) : effectiveUrl ? (
            <div className="w-full h-full flex flex-col">
              <object
                data={`${effectiveUrl}#toolbar=1&navpanes=0&scrollbar=1`}
                type="application/pdf"
                className="w-full h-full flex-1"
                onLoad={() => setIsLoading(false)}
              >
                {/* Fallback iframe inside object for maximum browser compatibility */}
                <iframe
                  src={`${effectiveUrl}#toolbar=1`}
                  title={displayName}
                  className="w-full h-full border-0 flex-1"
                  onLoad={() => setIsLoading(false)}
                />
              </object>

              {/* Mobile friendly action strip for devices where iframe PDF plugins are limited */}
              <div className="bg-slate-900/90 text-slate-300 py-2 px-4 text-xs flex items-center justify-between shrink-0 border-t border-slate-700 sm:hidden">
                <span className="truncate max-w-[160px] text-[11px]">{displayName}</span>
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={handleDownload}
                    className="px-2.5 py-1 bg-emerald-600 text-white rounded-lg text-[11px] font-bold flex items-center gap-1"
                  >
                    <Download className="w-3 h-3" />
                    <span>تحميل</span>
                  </button>
                  <button
                    type="button"
                    onClick={handleOpenInNewTab}
                    className="px-2.5 py-1 bg-slate-700 text-white rounded-lg text-[11px] font-bold flex items-center gap-1"
                  >
                    <ExternalLink className="w-3 h-3" />
                    <span>فتح</span>
                  </button>
                </div>
              </div>
            </div>
          ) : null}
        </div>
      </div>
    </div>
  );
};
