import React, { useState, useEffect } from 'react';
import { X, Download, ExternalLink, Printer, FileText, Maximize2 } from 'lucide-react';
import { MaterialItem, formatBytes, downloadPdfItem, printPdfItem } from '../utils/materialsStorage';

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
  const [activeTitle, setActiveTitle] = useState<string>('');
  const [isFullscreen, setIsFullscreen] = useState(false);

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
        const url = detail.storageUrl || detail.linkUrl || (detail.id ? `/api/materials/${detail.id}/file` : '');
        setActiveUrl(url || '');
        setActiveTitle(detail.fileName || 'ملف PDF مرفق.pdf');
        setActiveItem(detail);
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
      const url = propItem.storageUrl || propItem.linkUrl || (propItem.id ? `/api/materials/${propItem.id}/file` : '');
      if (url) setActiveUrl(url);
    }
  }, [propIsOpen, propPdfUrl, propFileName, propItem]);

  const isOpen = propIsOpen !== undefined ? propIsOpen : internalOpen;

  const handleClose = () => {
    setInternalOpen(false);
    if (propOnClose) propOnClose();
  };

  if (!isOpen || !activeUrl) return null;

  const fileTitle = activeTitle || activeItem?.fileName || 'ملف PDF مرفق.pdf';

  const handleDownload = () => {
    if (activeItem) {
      downloadPdfItem(activeItem);
    } else {
      const a = document.createElement('a');
      a.href = activeUrl;
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
      const a = window.open(activeUrl, '_blank');
      a?.focus();
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
                <span>• معاينة المستند المرفق</span>
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
            <a
              id="pdf-modal-external-link"
              href={activeUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-indigo-50 hover:bg-indigo-100 text-indigo-950 border border-indigo-200 text-xs font-black transition-colors"
              title="فتح في تبويب مستقل"
            >
              <ExternalLink className="w-3.5 h-3.5 text-indigo-700" />
              <span className="hidden sm:inline">تبويب جديد</span>
            </a>

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

        {/* PDF Viewer Body */}
        <div className="flex-1 bg-slate-100 relative min-h-0 overflow-hidden flex flex-col">
          <iframe
            id="pdf-modal-iframe"
            src={activeUrl}
            title={fileTitle}
            className="w-full h-full border-0 bg-white"
          />

          {/* Bottom helper toolbar */}
          <div className="py-2 px-4 bg-white border-t border-slate-200 flex items-center justify-between text-xs text-slate-600 shrink-0 flex-wrap gap-2">
            <span>
              إذا لم يظهر المستند تلقائياً في متصفحك، يمكنك{' '}
              <button
                onClick={handleDownload}
                className="text-indigo-600 hover:underline font-bold"
              >
                النقر هنا لتحميله
              </button>{' '}
              أو{' '}
              <a
                href={activeUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="text-indigo-600 hover:underline font-bold"
              >
                فتحه في تبويب جديد
              </a>
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
