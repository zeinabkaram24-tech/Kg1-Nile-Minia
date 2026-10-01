import React, { useState, useEffect } from 'react';
import { X, Download, ExternalLink, Printer, FileText, Maximize2, Loader2 } from 'lucide-react';
import {
  MaterialItem,
  formatBytes,
  downloadPdfItem,
  printPdfItem,
  getPdfViewableUrl,
  getMaterialBlobUrl,
} from '../utils/materialsStorage';

interface PdfViewerModalProps {
  isOpen?: boolean;
  onClose?: () => void;
  pdfUrl?: string | null;
  fileName?: string;
  item?: MaterialItem | null;
}

export const PdfViewerModal: React.FC<PdfViewerModalProps> = ({
  isOpen: propIsOpen,
  onClose: propOnClose,
  pdfUrl: propPdfUrl,
  fileName: propFileName,
  item: propItem,
}) => {
  const [internalOpen, setInternalOpen] = useState(false);
  const [activeItem, setActiveItem] = useState<MaterialItem | null>(null);
  const [activeUrl, setActiveUrl] = useState<string>('');
  const [blobUrl, setBlobUrl] = useState<string>('');
  const [activeTitle, setActiveTitle] = useState<string>('');
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [isLoadingBlob, setIsLoadingBlob] = useState(false);
  const [isMobile, setIsMobile] = useState<boolean>(() => {
    if (typeof window === 'undefined') return false;
    return (
      window.innerWidth < 768 ||
      /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent)
    );
  });

  useEffect(() => {
    const handleResize = () => {
      setIsMobile(
        window.innerWidth < 768 ||
        /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent)
      );
    };
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  // Listen to global open_pdf_viewer_modal custom events
  useEffect(() => {
    const handleOpenEvent = (e: CustomEvent<any>) => {
      const detail = e.detail;
      if (!detail) return;

      if (typeof detail === 'string') {
        setActiveUrl(detail);
        const name = detail.split('/').pop()?.split('?')[0] || 'مستند PDF';
        setActiveTitle(name);
        setActiveItem(null);
      } else if (detail && typeof detail === 'object') {
        setActiveTitle(detail.fileName || 'ملف PDF مرفق.pdf');
        setActiveItem(detail);
        const fallbackUrl = detail.viewableUrl || getPdfViewableUrl(detail) || (detail.id ? `/api/materials/${detail.id}/file` : '');
        setActiveUrl(fallbackUrl || '');
      }
      setInternalOpen(true);
    };

    window.addEventListener('open_pdf_viewer_modal' as any, handleOpenEvent);
    return () => {
      window.removeEventListener('open_pdf_viewer_modal' as any, handleOpenEvent);
    };
  }, []);

  // Sync props if provided
  useEffect(() => {
    if (propIsOpen !== undefined) {
      setInternalOpen(propIsOpen);
    }
    if (propPdfUrl) {
      setActiveUrl(propPdfUrl);
    }
    if (propFileName) {
      setActiveTitle(propFileName);
    }
    if (propItem) {
      setActiveItem(propItem);
      if (propItem.fileName) setActiveTitle(propItem.fileName);
      const url = (propItem as any).viewableUrl || getPdfViewableUrl(propItem) || (propItem.id ? `/api/materials/${propItem.id}/file` : '');
      if (url) setActiveUrl(url);
    }
  }, [propIsOpen, propPdfUrl, propFileName, propItem]);

  // Generate in-memory Blob URL for active item to prevent ANY app routing reloads
  useEffect(() => {
    if (!activeItem) return;
    let cancelled = false;
    setIsLoadingBlob(true);

    getMaterialBlobUrl(activeItem)
      .then((url) => {
        if (!cancelled && url) {
          setBlobUrl(url);
          setActiveUrl(url);
          setIsLoadingBlob(false);
        }
      })
      .catch((err) => {
        console.warn('Error creating material blob url:', err);
        if (!cancelled) {
          setIsLoadingBlob(false);
        }
      });

    return () => {
      cancelled = true;
    };
  }, [activeItem]);

  const isOpen = propIsOpen !== undefined ? propIsOpen : internalOpen;

  const handleClose = () => {
    setInternalOpen(false);
    if (propOnClose) propOnClose();
  };

  if (!isOpen || (!activeUrl && !isLoadingBlob)) return null;

  const fileTitle = activeTitle || activeItem?.fileName || 'ملف PDF مرفق.pdf';
  const effectiveDisplayUrl = blobUrl || activeUrl;

  const handleDownload = () => {
    if (activeItem) {
      downloadPdfItem(activeItem);
    } else {
      const a = document.createElement('a');
      a.href = effectiveDisplayUrl;
      a.download = fileTitle;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
    }
  };

  const handlePrint = () => {
    if (activeItem) {
      printPdfItem(activeItem);
    } else {
      const a = window.open(effectiveDisplayUrl, '_blank');
      a?.focus();
    }
  };

  const handleOpenNewTab = () => {
    if (effectiveDisplayUrl) {
      window.open(effectiveDisplayUrl, '_blank');
    }
  };

  return (
    <div
      id="pdf-viewer-modal-backdrop"
      className="fixed inset-0 z-50 flex items-center justify-center p-2 sm:p-4 bg-slate-950/75 backdrop-blur-xs animate-in fade-in duration-150"
    >
      <div
        id="pdf-viewer-modal-container"
        className={`bg-white rounded-3xl shadow-2xl border border-slate-200 flex flex-col transition-all overflow-hidden ${
          isFullscreen ? 'w-full h-full rounded-none' : 'w-full max-w-5xl h-[92vh]'
        }`}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-4 sm:px-6 py-3.5 border-b border-slate-200 bg-slate-50/90 shrink-0 gap-3">
          <div className="flex items-center gap-3 min-w-0">
            <div className="w-9 h-9 rounded-xl bg-rose-100 text-rose-600 flex items-center justify-center border border-rose-200 shrink-0">
              <FileText className="w-5 h-5" />
            </div>
            <div className="min-w-0">
              <h3 className="text-sm sm:text-base font-black text-slate-900 truncate" title={fileTitle}>
                {fileTitle}
              </h3>
              <div className="flex items-center gap-2 text-[11px] text-slate-500 font-semibold">
                <span className="px-1.5 py-0.5 rounded bg-rose-50 text-rose-700 font-bold border border-rose-200/60">
                  PDF
                </span>
                {activeItem?.fileSize ? <span>• {formatBytes(activeItem.fileSize)}</span> : null}
                <span>• بالتنسيق الأصلي للمستند</span>
              </div>
            </div>
          </div>

          {/* Action buttons */}
          <div className="flex items-center gap-1.5 sm:gap-2 shrink-0">
            {/* Download */}
            <button
              id="pdf-modal-download-btn"
              type="button"
              onClick={handleDownload}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-emerald-50 hover:bg-emerald-100 text-emerald-900 border border-emerald-300 text-xs font-black transition-colors cursor-pointer"
              title="تحميل الملف للجهاز"
            >
              <Download className="w-3.5 h-3.5 text-emerald-700" />
              <span className="hidden sm:inline">تحميل</span>
            </button>

            {/* Print */}
            <button
              id="pdf-modal-print-btn"
              type="button"
              onClick={handlePrint}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-800 border border-slate-300 text-xs font-black transition-colors cursor-pointer"
              title="طباعة الملف"
            >
              <Printer className="w-3.5 h-3.5 text-slate-600" />
              <span className="hidden sm:inline">طباعة</span>
            </button>

            {/* Open in new tab */}
            <button
              id="pdf-modal-external-link"
              type="button"
              onClick={handleOpenNewTab}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-indigo-50 hover:bg-indigo-100 text-indigo-950 border border-indigo-200 text-xs font-black transition-colors cursor-pointer"
              title="فتح في تبويب مستقل"
            >
              <ExternalLink className="w-3.5 h-3.5 text-indigo-700" />
              <span className="hidden sm:inline">تبويب جديد</span>
            </button>

            {/* Fullscreen toggle */}
            <button
              id="pdf-modal-fullscreen-btn"
              type="button"
              onClick={() => setIsFullscreen(!isFullscreen)}
              className="p-1.5 rounded-xl text-slate-500 hover:text-slate-900 hover:bg-slate-200/80 transition-colors cursor-pointer"
              title={isFullscreen ? 'تصغير' : 'ملء الشاشة'}
            >
              <Maximize2 className="w-4 h-4" />
            </button>

            {/* Close */}
            <button
              id="pdf-modal-close-btn"
              type="button"
              onClick={handleClose}
              className="p-1.5 rounded-xl text-slate-500 hover:text-rose-600 hover:bg-rose-50 border border-transparent hover:border-rose-200 transition-colors cursor-pointer"
              title="إغلاق النافذة"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Quick Access Desktop Banner (hidden on mobile) */}
        <div className="hidden sm:flex py-2.5 px-4 bg-gradient-to-r from-indigo-50 via-slate-50 to-blue-50 border-b border-indigo-100 items-center justify-between gap-3 shrink-0">
          <div className="flex items-center gap-2 text-indigo-950 font-bold text-xs truncate">
            <FileText className="w-4 h-4 text-indigo-600 shrink-0" />
            <span className="truncate">معاينة الملف بتنسيقه الأصلي بالكامل:</span>
          </div>
          <button
            type="button"
            onClick={handleOpenNewTab}
            className="px-3.5 py-1.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 active:bg-indigo-800 text-white font-black text-xs shadow-xs flex items-center gap-1.5 transition-all shrink-0 cursor-pointer"
          >
            <ExternalLink className="w-3.5 h-3.5" />
            <span>عرض في نافذة مستقلة ↗</span>
          </button>
        </div>

        {/* PDF Viewer Body */}
        <div className="flex-1 bg-slate-100 relative min-h-0 overflow-hidden flex flex-col">
          {isLoadingBlob ? (
            <div className="flex-1 flex flex-col items-center justify-center p-8 bg-white text-center gap-3">
              <Loader2 className="w-10 h-10 text-indigo-600 animate-spin" />
              <p className="text-sm font-black text-slate-800">جاري فتح وتجهيز المستند بالتنسيق الأصلي...</p>
              <span className="text-xs text-slate-400 font-semibold">{fileTitle}</span>
            </div>
          ) : isMobile ? (
            /* Dedicated Mobile View: Clean white centered page with the purple button */
            <div className="flex-1 flex flex-col items-center justify-center p-6 bg-white text-center animate-in fade-in duration-150">
              <div className="w-16 h-16 rounded-2xl bg-indigo-50 text-indigo-600 flex items-center justify-center border border-indigo-100 shadow-xs mb-4">
                <FileText className="w-8 h-8" />
              </div>

              <h4 className="text-base font-black text-slate-900 max-w-xs mb-1.5 leading-snug px-2" dir="auto">
                {fileTitle}
              </h4>

              <div className="flex items-center justify-center gap-2 text-xs text-slate-500 font-semibold mb-8">
                <span className="px-2 py-0.5 rounded-md bg-rose-50 text-rose-700 font-bold border border-rose-200/60">
                  PDF
                </span>
                {activeItem?.fileSize ? <span>• {formatBytes(activeItem.fileSize)}</span> : null}
                <span>• بالتنسيق الأصلي</span>
              </div>

              {/* Purple button directly in the center of the white page */}
              <div className="w-full max-w-xs space-y-3">
                <a
                  href={effectiveDisplayUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  onClick={(e) => {
                    if (!effectiveDisplayUrl) {
                      e.preventDefault();
                      handleOpenNewTab();
                    }
                  }}
                  className="w-full py-4 px-6 rounded-2xl bg-indigo-600 hover:bg-indigo-700 active:bg-indigo-800 text-white font-black text-sm shadow-lg shadow-indigo-600/30 flex items-center justify-center gap-2.5 transition-all cursor-pointer"
                >
                  <ExternalLink className="w-5 h-5 text-indigo-100" />
                  <span>عرض في نافذة مستقلة ↗</span>
                </a>

                {/* Secondary download option */}
                <button
                  type="button"
                  onClick={handleDownload}
                  className="w-full py-3 px-5 rounded-2xl bg-slate-50 hover:bg-slate-100 active:bg-slate-200 text-slate-700 border border-slate-200 font-black text-xs flex items-center justify-center gap-2 transition-colors cursor-pointer"
                >
                  <Download className="w-4 h-4 text-emerald-600" />
                  <span>تحميل المستند للجهاز</span>
                </button>
              </div>
            </div>
          ) : (
            /* Desktop / Laptop Direct Object Embed */
            <object
              data={effectiveDisplayUrl}
              type="application/pdf"
              className="w-full h-full border-0 bg-white"
            >
              <iframe
                id="pdf-modal-iframe"
                src={effectiveDisplayUrl}
                title={fileTitle}
                className="w-full h-full border-0 bg-white"
              >
                <div className="flex flex-col items-center justify-center p-8 text-center h-full gap-4 bg-white">
                  <FileText className="w-12 h-12 text-slate-400" />
                  <div>
                    <h4 className="font-black text-slate-800 text-base mb-1">{fileTitle}</h4>
                    <p className="text-xs text-slate-500 font-semibold max-w-sm">
                      يمكنك فتح الملف في نافذة مستقلة لعرضه بتنسيقه الأصلي بالكامل.
                    </p>
                  </div>
                  <div className="flex items-center gap-2">
                    <a
                      href={effectiveDisplayUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="px-5 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-black text-xs shadow-md cursor-pointer flex items-center gap-2"
                    >
                      <ExternalLink className="w-4 h-4" />
                      <span>عرض في نافذة مستقلة ↗</span>
                    </a>
                    <button
                      type="button"
                      onClick={handleDownload}
                      className="px-5 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-black text-xs shadow-md cursor-pointer flex items-center gap-2"
                    >
                      <Download className="w-4 h-4" />
                      <span>تحميل</span>
                    </button>
                  </div>
                </div>
              </iframe>
            </object>
          )}

          {/* Bottom helper toolbar (hidden on mobile) */}
          <div className="hidden sm:flex py-2 px-4 bg-white border-t border-slate-200 items-center justify-between text-xs text-slate-600 shrink-0 flex-wrap gap-2">
            <span>
              إذا لم يظهر المستند تلقائياً، يمكنك{' '}
              <button
                onClick={handleDownload}
                className="text-indigo-600 hover:underline font-bold cursor-pointer"
              >
                النقر هنا لتحميله
              </button>{' '}
              أو{' '}
              <button
                onClick={handleOpenNewTab}
                className="text-indigo-600 hover:underline font-bold cursor-pointer"
              >
                فتحه في نافذة مستقلة
              </button>
              .
            </span>
            <span className="text-[11px] text-slate-400 font-bold">
              {fileTitle}
            </span>
          </div>
        </div>
      </div>
    </div>
  );
};
