import React, { useState, useEffect } from 'react';
import { X, Download, ExternalLink, Printer, FileText, Maximize2, Loader2, Layers, Monitor } from 'lucide-react';
import {
  MaterialItem,
  formatBytes,
  downloadPdfItem,
  printPdfItem,
  getPdfViewableUrl,
  getMaterialBlobUrl,
} from '../utils/materialsStorage';
import { PdfCanvasViewer } from './PdfCanvasViewer';

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
  const [isMobile, setIsMobile] = useState(false);
  const [viewerMode, setViewerMode] = useState<'canvas' | 'native'>('canvas');

  // Detect mobile
  useEffect(() => {
    const checkMobile = () => {
      const mobile =
        window.innerWidth < 768 ||
        /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);
      setIsMobile(mobile);
      if (mobile) {
        setViewerMode('canvas');
      }
    };
    checkMobile();
    window.addEventListener('resize', checkMobile);
    return () => window.removeEventListener('resize', checkMobile);
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
      className="fixed inset-0 z-50 flex items-center justify-center p-1 sm:p-4 bg-slate-950/80 backdrop-blur-xs animate-in fade-in duration-150"
    >
      <div
        id="pdf-viewer-modal-container"
        className={`bg-white rounded-2xl sm:rounded-3xl shadow-2xl border border-slate-200 flex flex-col transition-all overflow-hidden ${
          isFullscreen ? 'w-full h-full rounded-none' : 'w-full max-w-5xl h-[95vh] sm:h-[92vh]'
        }`}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-3.5 sm:px-6 py-3 border-b border-slate-200 bg-slate-50/95 shrink-0 gap-2 sm:gap-3">
          <div className="flex items-center gap-2.5 sm:gap-3 min-w-0">
            <div className="w-8 h-8 sm:w-9 sm:h-9 rounded-xl bg-rose-100 text-rose-600 flex items-center justify-center border border-rose-200 shrink-0">
              <FileText className="w-4 h-4 sm:w-5 sm:h-5" />
            </div>
            <div className="min-w-0">
              <h3 className="text-xs sm:text-base font-black text-slate-900 truncate" title={fileTitle}>
                {fileTitle}
              </h3>
              <div className="flex items-center gap-2 text-[10px] sm:text-[11px] text-slate-500 font-semibold">
                <span className="px-1.5 py-0.2 rounded bg-rose-50 text-rose-700 font-bold border border-rose-200/60">
                  PDF
                </span>
                {activeItem?.fileSize ? <span>• {formatBytes(activeItem.fileSize)}</span> : null}
                <span className="hidden sm:inline">• بالتنسيق الأصلي</span>
              </div>
            </div>
          </div>

          {/* Action buttons */}
          <div className="flex items-center gap-1 sm:gap-2 shrink-0">
            {/* Desktop mode switch (only on desktop) */}
            {!isMobile && (
              <div className="hidden md:flex items-center bg-slate-200/80 p-0.5 rounded-xl border border-slate-300 text-xs">
                <button
                  type="button"
                  onClick={() => setViewerMode('canvas')}
                  className={`px-2.5 py-1 rounded-lg font-black text-[11px] flex items-center gap-1 transition-all cursor-pointer ${
                    viewerMode === 'canvas'
                      ? 'bg-white text-indigo-950 shadow-xs'
                      : 'text-slate-600 hover:text-slate-900'
                  }`}
                  title="عرض صفحات المستند مباشرة"
                >
                  <Layers className="w-3 h-3 text-indigo-600" />
                  <span>عرض الصفحات</span>
                </button>
                <button
                  type="button"
                  onClick={() => setViewerMode('native')}
                  className={`px-2.5 py-1 rounded-lg font-black text-[11px] flex items-center gap-1 transition-all cursor-pointer ${
                    viewerMode === 'native'
                      ? 'bg-white text-indigo-950 shadow-xs'
                      : 'text-slate-600 hover:text-slate-900'
                  }`}
                  title="عارض المتصفح الافتراضي"
                >
                  <Monitor className="w-3 h-3 text-slate-600" />
                  <span>عارض المتصفح</span>
                </button>
              </div>
            )}

            {/* Download */}
            <button
              id="pdf-modal-download-btn"
              type="button"
              onClick={handleDownload}
              className="inline-flex items-center gap-1 sm:gap-1.5 px-2.5 sm:px-3 py-1.5 rounded-xl bg-emerald-50 hover:bg-emerald-100 text-emerald-900 border border-emerald-300 text-xs font-black transition-colors cursor-pointer"
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
              className="inline-flex items-center gap-1 sm:gap-1.5 px-2.5 sm:px-3 py-1.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-800 border border-slate-300 text-xs font-black transition-colors cursor-pointer"
              title="طباعة الملف"
            >
              <Printer className="w-3.5 h-3.5 text-slate-600" />
              <span className="hidden sm:inline">طباعة</span>
            </button>

            {/* Open in new tab (desktop) */}
            <button
              id="pdf-modal-external-link"
              type="button"
              onClick={handleOpenNewTab}
              className="hidden sm:inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-indigo-50 hover:bg-indigo-100 text-indigo-950 border border-indigo-200 text-xs font-black transition-colors cursor-pointer"
              title="فتح في نافذة مستقلة"
            >
              <ExternalLink className="w-3.5 h-3.5 text-indigo-700" />
              <span>نافذة جديدة</span>
            </button>

            {/* Fullscreen toggle */}
            <button
              id="pdf-modal-fullscreen-btn"
              type="button"
              onClick={() => setIsFullscreen(!isFullscreen)}
              className="hidden sm:block p-1.5 rounded-xl text-slate-500 hover:text-slate-900 hover:bg-slate-200/80 transition-colors cursor-pointer"
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

        {/* PDF Viewer Body */}
        <div className="flex-1 bg-slate-100 relative min-h-0 overflow-hidden flex flex-col">
          {isLoadingBlob ? (
            <div className="flex-1 flex flex-col items-center justify-center p-8 bg-slate-50 text-center gap-3">
              <Loader2 className="w-10 h-10 text-indigo-600 animate-spin" />
              <p className="text-sm font-black text-slate-800">جاري عرض وتجهيز المستند مباشرة...</p>
              <span className="text-xs text-slate-400 font-semibold">{fileTitle}</span>
            </div>
          ) : viewerMode === 'canvas' || isMobile ? (
            /* Direct In-App High-DPI Page Viewer (Works 100% on Mobile & Desktop!) */
            <PdfCanvasViewer
              fileData={activeItem?.fileData}
              blobUrl={effectiveDisplayUrl}
              fileName={fileTitle}
            />
          ) : (
            /* Desktop Native Browser PDF plugin */
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
              />
            </object>
          )}
        </div>
      </div>
    </div>
  );
};
