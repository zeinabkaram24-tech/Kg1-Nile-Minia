import React from 'react';
import { FileText, Eye, Download, ExternalLink } from 'lucide-react';
import {
  formatBytes,
  openPdfItem,
  downloadPdfItem,
  resolveMaterialItem,
  MaterialItem,
} from '../utils/materialsStorage';

interface AttachmentPdfCardProps {
  id?: string;
  pdfUrl?: string;
  fileName?: string;
  subject?: string;
  label?: string;
  className?: string;
}

export const AttachmentPdfCard: React.FC<AttachmentPdfCardProps> = ({
  id,
  pdfUrl,
  fileName,
  subject,
  className = '',
}) => {
  const item: MaterialItem = resolveMaterialItem(pdfUrl, fileName);

  return (
    <div
      id={id || `attachment-card-${item.id}`}
      className={`bg-slate-50 hover:bg-slate-100/80 border border-slate-300 rounded-xl p-3 shadow-2xs transition-all flex items-center justify-between gap-3 flex-wrap sm:flex-nowrap ${className}`}
    >
      {/* File Details: Exact File Name with PDF Icon */}
      <div
        onClick={() => openPdfItem(item)}
        className="flex items-center gap-2.5 min-w-0 flex-1 cursor-pointer group"
        title={`فتح ${item.fileName}`}
      >
        <div className="w-9 h-9 rounded-lg bg-rose-100 border border-rose-200 text-rose-600 flex items-center justify-center shrink-0 group-hover:scale-105 transition-transform">
          <FileText className="w-5 h-5" />
        </div>
        <div className="min-w-0 flex-1">
          <div className="text-xs sm:text-sm font-black text-slate-900 truncate group-hover:text-indigo-700 transition-colors" dir="ltr">
            {item.fileName}
          </div>
          <div className="flex items-center gap-2 text-[11px] text-slate-500 font-semibold mt-0.5">
            <span className="font-bold text-rose-600">PDF</span>
            <span>•</span>
            <span>{formatBytes(typeof item.fileSize === 'number' ? item.fileSize : Number(item.fileSize) || 0)}</span>
            {subject && (
              <>
                <span>•</span>
                <span className="text-slate-700 font-bold">{subject}</span>
              </>
            )}
          </div>
        </div>
      </div>

      {/* Action Buttons */}
      <div className="flex items-center gap-1.5 shrink-0">
        {/* Open & View PDF in In-App Modal */}
        <button
          type="button"
          id={`view-attach-${item.id}`}
          onClick={(e) => {
            e.stopPropagation();
            openPdfItem(item);
          }}
          className="py-1.5 px-3 rounded-lg bg-indigo-600 hover:bg-indigo-700 text-white font-black text-xs flex items-center gap-1.5 transition-all cursor-pointer shadow-2xs active:scale-95"
          title="فتح وعرض المستند داخل التطبيق"
        >
          <Eye className="w-3.5 h-3.5" />
          <span>عرض الشيت</span>
        </button>

        {/* Download Button */}
        <button
          type="button"
          id={`download-attach-${item.id}`}
          onClick={(e) => {
            e.stopPropagation();
            downloadPdfItem(item);
          }}
          className="p-1.5 rounded-lg bg-white hover:bg-slate-200 text-slate-700 border border-slate-300 transition-colors cursor-pointer"
          title="تحميل الملف للجهاز"
        >
          <Download className="w-3.5 h-3.5" />
        </button>

        {/* External Link */}
        <a
          id={`external-attach-${item.id}`}
          href={item.storageUrl || item.linkUrl || `/materials/${item.fileName}`}
          target="_blank"
          rel="noopener noreferrer"
          className="p-1.5 rounded-lg bg-white hover:bg-slate-200 text-slate-700 border border-slate-300 transition-colors"
          title="فتح في تبويب مستقل"
        >
          <ExternalLink className="w-3.5 h-3.5 text-slate-600" />
        </a>
      </div>
    </div>
  );
};
