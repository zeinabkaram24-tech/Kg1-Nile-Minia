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
  RotateCw,
} from 'lucide-react';
import { MaterialItem } from '../types';
import { getMaterialBlob } from '../utils/materialsDb';
import { dataUrlToBlob, downloadPdfItem, formatBytes } from '../utils/materialsStorage';

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
  const [pdfUrl, setPdfUrl] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const iframeRef = useRef<HTMLIFrameElement>(null);

  useEffect(() => {
    let activeUrl: string | null = null;

    const resolvePdfUrl = async () => {
      if (!isOpen || !item) {
        setPdfUrl(null);
        setIsLoading(false);
        setLoadError(null);
        return;
      }

      setIsLoading(true);
      setLoadError(null);

      try {
        // 1. Try to get Blob from IndexedDB
        let blob: Blob | null = null;
        try {
          blob = await getMaterialBlob(item.id);
        } catch (e) {
          console.warn('Could not load blob from IndexedDB:', e);
        }

        // 2. If no blob from DB, construct from fileData
        if (!blob && item.fileData) {
          try {
            if (item.fileData.startsWith('data:')) {
              blob = dataUrlToBlob(item.fileData);
            }
          } catch (e) {
            console.warn('Failed to convert fileData to blob:', e);
          }
        }

        if (blob) {
          activeUrl = URL.createObjectURL(blob);
          setPdfUrl(activeUrl);
          setIsLoading(false);
          return;
        }

        // 3. If fileUrl exists
        if (item.fileUrl) {
          setPdfUrl(item.fileUrl);
          setIsLoading(false);
          return;
        }

        // 4. Raw fileData fallback (direct data URI)
        if (item.fileData && item.fileData.startsWith('data:application/pdf')) {
          setPdfUrl(item.fileData);
          setIsLoading(false);
          return;
        }

        setLoadError('تعذر العثور على بيانات ملف الـ PDF للعرض.');
        setIsLoading(false);
      } catch (err) {
        console.error('Error preparing PDF preview:', err);
        setLoadError('حدث خطأ أثناء تحميل ملف الـ PDF.');
        setIsLoading(false);
      }
    };

    resolvePdfUrl();

    return () => {
      if (activeUrl) {
        URL.revokeObjectURL(activeUrl);
      }
    };
  }, [isOpen, item]);

  // Handle ESC key to close
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

  const handlePrint = () => {
    if (iframeRef.current && iframeRef.current.contentWindow) {
      try {
        iframeRef.current.contentWindow.focus();
        iframeRef.current.contentWindow.print();
        return;
      } catch (e) {
        console.warn('Iframe print failed, attempting fallback', e);
      }
    }
    if (pdfUrl) {
      const w = window.open(pdfUrl, '_blank');
      if (w) {
        setTimeout(() => {
          w.focus();
          w.print();
        }, 500);
      }
    }
  };

  const handleDownload = () => {
    downloadPdfItem(item);
  };

  const handleOpenExternal = () => {
    if (pdfUrl) {
      window.open(pdfUrl, '_blank');
    }
  };

  return (
    <div
      className="fixed inset-0 z-[100] flex items-center justify-center p-2 sm:p-4 bg-slate-950/85 backdrop-blur-sm animate-in fade-in duration-200"
      dir="rtl"
    >
      <div
        className="bg-white rounded-3xl w-full max-w-5xl h-[92vh] max-h-[95vh] shadow-2xl border border-slate-200 flex flex-col overflow-hidden text-slate-800"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Top Header Bar */}
        <div className="bg-slate-900 text-white px-4 sm:px-6 py-3.5 flex items-center justify-between gap-3 border-b border-slate-800 shrink-0">
          <div className="flex items-center gap-3 min-w-0">
            <div className="w-10 h-10 rounded-xl bg-amber-500/20 text-amber-400 flex items-center justify-center border border-amber-500/30 shrink-0">
              <FileText className="w-5 h-5" />
            </div>
            <div className="min-w-0">
              <div className="flex items-center gap-2 flex-wrap">
                <h3 className="text-sm sm:text-base font-black text-white truncate max-w-[240px] sm:max-w-md" title={fileName}>
                  {fileName}
                </h3>
                <span className="px-2 py-0.5 rounded-full text-[10px] font-extrabold bg-indigo-500/20 text-indigo-300 border border-indigo-500/30">
                  Topic {item.block || 1} • {item.section || 'General'}
                </span>
                {item.classId && item.classId !== 'ALL' && (
                  <span className="px-2 py-0.5 rounded-full text-[10px] font-extrabold bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">
                    {item.classId}
                  </span>
                )}
              </div>
              <div className="text-[11px] text-slate-400 font-semibold mt-0.5">
                <span>معاينة الشيت المرفوع</span>
                {fileSizeStr && (
                  <>
                    <span className="mx-1.5">•</span>
                    <span>{fileSizeStr}</span>
                  </>
                )}
              </div>
            </div>
          </div>

          {/* Action Buttons */}
          <div className="flex items-center gap-1.5 sm:gap-2 shrink-0">
            {/* Print button */}
            <button
              type="button"
              id="pdf-preview-print-btn"
              onClick={handlePrint}
              className="px-3 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 hover:text-white text-xs font-bold transition-colors flex items-center gap-1.5 border border-slate-700 cursor-pointer shadow-2xs"
              title="طباعة الشيت"
            >
              <Printer className="w-3.5 h-3.5 text-slate-300" />
              <span className="hidden sm:inline">طباعة</span>
            </button>

            {/* Download button */}
            <button
              type="button"
              id="pdf-preview-download-btn"
              onClick={handleDownload}
              className="px-3 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold transition-colors flex items-center gap-1.5 cursor-pointer shadow-2xs"
              title="تحميل الملف على جهازك"
            >
              <Download className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">تحميل</span>
            </button>

            {/* Open in new tab button */}
            {pdfUrl && (
              <button
                type="button"
                id="pdf-preview-external-btn"
                onClick={handleOpenExternal}
                className="p-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white text-xs font-bold transition-colors border border-slate-700 cursor-pointer"
                title="فتح في نافذة مستقلة"
              >
                <ExternalLink className="w-4 h-4" />
              </button>
            )}

            {/* Close Button */}
            <button
              type="button"
              id="pdf-preview-close-btn"
              onClick={onClose}
              className="p-2 rounded-xl bg-rose-500/10 hover:bg-rose-500/20 text-rose-300 hover:text-rose-100 text-xs font-bold transition-colors border border-rose-500/30 cursor-pointer ms-1"
              title="إغلاق المعاينة (Esc)"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Viewer Content Area */}
        <div className="flex-1 bg-slate-100 relative overflow-hidden flex items-center justify-center">
          {isLoading && (
            <div className="flex flex-col items-center justify-center p-8 text-center space-y-3">
              <Loader2 className="w-8 h-8 text-indigo-600 animate-spin" />
              <p className="text-sm font-bold text-slate-700">جاري تجهيز وعرض ملف الـ PDF...</p>
            </div>
          )}

          {loadError && !isLoading && (
            <div className="max-w-md p-6 bg-white rounded-2xl shadow-md border border-slate-200 text-center space-y-3 m-4">
              <div className="w-12 h-12 rounded-full bg-rose-100 text-rose-600 flex items-center justify-center mx-auto">
                <AlertCircle className="w-6 h-6" />
              </div>
              <h4 className="text-base font-black text-slate-900">تعذر عرض المعاينة المباشرة</h4>
              <p className="text-xs text-slate-600 font-medium leading-relaxed">
                {loadError}
              </p>
              <div className="pt-2 flex justify-center gap-2">
                <button
                  type="button"
                  onClick={handleDownload}
                  className="px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold transition-colors inline-flex items-center gap-2 cursor-pointer shadow-sm"
                >
                  <Download className="w-3.5 h-3.5" />
                  <span>تحميل الملف الآن</span>
                </button>
                <button
                  type="button"
                  onClick={onClose}
                  className="px-4 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold transition-colors cursor-pointer"
                >
                  إغلاق
                </button>
              </div>
            </div>
          )}

          {pdfUrl && !isLoading && !loadError && (
            <object
              data={`${pdfUrl}#toolbar=1&navpanes=0`}
              type="application/pdf"
              className="w-full h-full border-0"
            >
              <iframe
                ref={iframeRef}
                src={`${pdfUrl}#toolbar=1&navpanes=0`}
                className="w-full h-full border-0"
                title={fileName}
              >
                <div className="flex flex-col items-center justify-center h-full p-6 text-center">
                  <FileText className="w-12 h-12 text-slate-400 mb-2" />
                  <p className="text-sm font-bold text-slate-700 mb-3">
                    المتصفح لا يدعم العرض المباشر داخل الصفحة، يمكنك تحميل الملف أو فتحه في تبويب مستقل:
                  </p>
                  <button
                    type="button"
                    onClick={handleDownload}
                    className="px-4 py-2 bg-indigo-600 text-white rounded-xl text-xs font-bold hover:bg-indigo-700 cursor-pointer"
                  >
                    تحميل الـ PDF
                  </button>
                </div>
              </iframe>
            </object>
          )}
        </div>

        {/* Bottom Helper Bar */}
        <div className="bg-slate-50 border-t border-slate-200 px-4 py-2.5 flex items-center justify-between text-xs text-slate-500 shrink-0">
          <div className="flex items-center gap-2 font-medium">
            <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
            <span>معاينة كاملة بجودة وتنسيق الملف الأصلي</span>
          </div>
          <div className="flex items-center gap-3">
            <span className="text-[11px] text-slate-400 hidden sm:inline">
              اضغط Esc للإغلاق في أي وقت
            </span>
            <button
              type="button"
              onClick={onClose}
              className="text-xs font-bold text-slate-700 hover:text-slate-900 cursor-pointer"
            >
              إغلاق المعاينة
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
