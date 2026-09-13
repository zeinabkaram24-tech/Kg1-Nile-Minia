import React, { useState, useEffect } from 'react';
import {
  X,
  FolderOpen,
  ArrowLeft,
  ChevronRight,
  FileText,
  Calendar,
  Eye,
  Printer,
  Download,
} from 'lucide-react';
import { ClassId, MaterialItem } from '../types';
import {
  getAllMaterials,
  subscribeToMaterials,
  formatBytes,
  openPdfItem,
  printPdfItem,
  downloadPdfItem,
} from '../utils/materialsStorage';

interface MaterialsModalProps {
  isOpen: boolean;
  onClose: () => void;
  currentClass: ClassId;
  currentBlock: number;
  currentWeek: number;
}

export const MaterialsModal: React.FC<MaterialsModalProps> = ({
  isOpen,
  onClose,
  currentClass,
}) => {
  const [selectedBlock, setSelectedBlock] = useState<number | null>(null);
  const [selectedSection, setSelectedSection] = useState<string | null>(null);
  const [materials, setMaterials] = useState<MaterialItem[]>([]);

  // Load materials from storage
  const loadMaterials = async () => {
    const all = await getAllMaterials();
    setMaterials(all);
  };

  useEffect(() => {
    if (isOpen) {
      loadMaterials();
    }
  }, [isOpen]);

  useEffect(() => {
    const unsub = subscribeToMaterials(() => {
      loadMaterials();
    });
    return () => unsub();
  }, []);

  if (!isOpen) return null;

  const handleClose = () => {
    setSelectedBlock(null);
    setSelectedSection(null);
    onClose();
  };

  // Helper to open PDF directly in new tab (no extra steps/modals)
  const handlePreview = (item: MaterialItem) => {
    openPdfItem(item);
  };

  // Helper to trigger Print
  const handlePrint = (item: MaterialItem) => {
    printPdfItem(item);
  };

  // Helper to trigger Download
  const handleDownload = (item: MaterialItem) => {
    downloadPdfItem(item);
  };

  const blocks = [1, 2, 3, 4];
  const weeks = [1, 2, 3, 4];

  // Filter items for current selection
  const currentSectionMaterials = materials.filter(
    (item) =>
      item.block === selectedBlock &&
      item.section === selectedSection &&
      (!item.classId || item.classId === 'ALL' || item.classId === currentClass)
  );

  return (
    <>
      <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-900/60 backdrop-blur-xs">
        <div
          className="bg-white rounded-3xl max-w-xl w-full p-5 sm:p-7 shadow-2xl border border-slate-100 flex flex-col max-h-[90vh] animate-in fade-in zoom-in-95 duration-150"
          dir="ltr"
        >
          {/* Header */}
          <div className="flex items-center justify-between pb-4 border-b border-slate-100">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-2xl bg-amber-50 text-amber-700 flex items-center justify-center border border-amber-200/80 shadow-2xs">
                <FolderOpen className="w-5 h-5" />
              </div>
              <div>
                <div className="flex items-center gap-1.5 text-xs font-bold text-slate-400">
                  <span className="text-amber-700 font-extrabold">
                    {currentClass === 'KG1A'
                      ? 'KG 1 A'
                      : currentClass === 'KG1B'
                      ? 'KG 1 B'
                      : currentClass === 'KG1C'
                      ? 'KG 1 C'
                      : currentClass === 'KG1D'
                      ? 'KG 1 D'
                      : currentClass === 'KG1E'
                      ? 'KG 1 E'
                      : currentClass}
                  </span>
                  {selectedBlock && (
                    <>
                      <span>/</span>
                      <span className="text-slate-600 font-black">Topic {selectedBlock}</span>
                    </>
                  )}
                  {selectedSection && (
                    <>
                      <span>/</span>
                      <span className="text-slate-900 font-black">{selectedSection}</span>
                    </>
                  )}
                </div>
                <h3 className="text-lg font-black text-slate-900 leading-tight">
                  Materials
                </h3>
              </div>
            </div>
            <button
              id="close-materials-btn"
              onClick={handleClose}
              className="w-8 h-8 rounded-full bg-slate-100 hover:bg-slate-200 text-slate-500 hover:text-slate-800 flex items-center justify-center transition-colors cursor-pointer"
              title="Close"
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          {/* Modal Body */}
          <div className="py-4 overflow-y-auto flex-1 space-y-3">
            {/* LEVEL 1: Topic Selection (Topic 1, Topic 2, Topic 3, Topic 4) */}
            {selectedBlock === null && (
              <div className="space-y-2.5">
                <p className="text-xs font-bold text-slate-500 mb-2" dir="rtl">
                  اختر الـ Topic المطلوب لعرض ملفاته:
                </p>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                  {blocks.map((b) => (
                    <button
                      key={b}
                      id={`select-block-${b}-btn`}
                      onClick={() => {
                        setSelectedBlock(b);
                        setSelectedSection(null);
                      }}
                      className="p-4 rounded-2xl border border-slate-200 hover:border-amber-400 bg-white hover:bg-amber-50/40 text-left transition-all flex items-center justify-between group cursor-pointer shadow-2xs"
                    >
                      <div className="flex items-center gap-3">
                        <div className="w-9 h-9 rounded-xl bg-amber-100/70 text-amber-800 font-black text-sm flex items-center justify-center border border-amber-200/80 group-hover:scale-105 transition-transform">
                          {b}
                        </div>
                        <div>
                          <h4 className="text-sm font-black text-slate-900 group-hover:text-amber-950">
                            Topic {b}
                          </h4>
                          <span className="text-[11px] font-semibold text-slate-400">
                            Main sheet & Weeks
                          </span>
                        </div>
                      </div>
                      <ChevronRight className="w-4 h-4 text-slate-300 group-hover:text-amber-600 transition-colors" />
                    </button>
                  ))}
                </div>
              </div>
            )}

            {/* LEVEL 2: Inside a Topic -> Main sheet + Week 1, 2, 3, 4 */}
            {selectedBlock !== null && selectedSection === null && (
              <div className="space-y-3">
                {/* Back to Topics button */}
                <div className="flex items-center justify-between">
                  <button
                    id="back-to-blocks-btn"
                    onClick={() => setSelectedBlock(null)}
                    className="inline-flex items-center gap-1.5 text-xs font-black text-amber-800 hover:text-amber-950 bg-amber-50 hover:bg-amber-100 px-3 py-1.5 rounded-xl border border-amber-200/80 transition-colors cursor-pointer"
                  >
                    <ArrowLeft className="w-3.5 h-3.5" />
                    <span>Back to Topics</span>
                  </button>
                  <span className="text-xs font-black text-slate-700 bg-slate-100 px-2.5 py-1 rounded-lg">
                    Topic {selectedBlock}
                  </span>
                </div>

                {/* Items: Main sheet first, followed by Weeks */}
                <div className="space-y-2 pt-1">
                  {/* Main sheet Card */}
                  <button
                    id="select-main-sheet-btn"
                    onClick={() => setSelectedSection('Main sheet')}
                    className="w-full p-3.5 rounded-2xl border-2 border-indigo-200 bg-indigo-50/40 hover:bg-indigo-50 hover:border-indigo-400 text-left transition-all flex items-center justify-between group cursor-pointer shadow-2xs"
                  >
                    <div className="flex items-center gap-3">
                      <div className="w-9 h-9 rounded-xl bg-indigo-600 text-white flex items-center justify-center shadow-2xs group-hover:scale-105 transition-transform">
                        <FileText className="w-4 h-4" />
                      </div>
                      <div>
                        <h4 className="text-sm font-black text-indigo-950">
                          Main sheet
                        </h4>
                        <span className="text-[11px] font-bold text-indigo-700">
                          Topic {selectedBlock} Overview & Schedule
                        </span>
                      </div>
                    </div>
                    <ChevronRight className="w-4 h-4 text-indigo-400 group-hover:text-indigo-700 transition-colors" />
                  </button>

                  {/* Weeks Cards */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 pt-1">
                    {weeks.map((w) => (
                      <button
                        key={w}
                        id={`select-week-${w}-btn`}
                        onClick={() => setSelectedSection(`Week ${w}`)}
                        className="p-3.5 rounded-2xl border border-slate-200 hover:border-amber-400 bg-white hover:bg-amber-50/40 text-left transition-all flex items-center justify-between group cursor-pointer shadow-2xs"
                      >
                        <div className="flex items-center gap-2.5">
                          <div className="w-8 h-8 rounded-xl bg-amber-50 text-amber-800 font-black text-xs flex items-center justify-center border border-amber-200 group-hover:scale-105 transition-transform">
                            <Calendar className="w-3.5 h-3.5 text-amber-700" />
                          </div>
                          <div>
                            <h4 className="text-sm font-black text-slate-900 group-hover:text-amber-950">
                              Week {w}
                            </h4>
                            <span className="text-[10px] font-semibold text-slate-400">
                              Materials & Worksheets
                            </span>
                          </div>
                        </div>
                        <ChevronRight className="w-4 h-4 text-slate-300 group-hover:text-amber-600 transition-colors" />
                      </button>
                    ))}
                  </div>
                </div>
              </div>
            )}

            {/* LEVEL 3: Section Content (Uploaded PDF files with the 3 buttons) */}
            {selectedBlock !== null && selectedSection !== null && (
              <div className="space-y-4">
                {/* Back to Topic sections */}
                <div className="flex items-center justify-between">
                  <button
                    id="back-to-sections-btn"
                    onClick={() => setSelectedSection(null)}
                    className="inline-flex items-center gap-1.5 text-xs font-black text-amber-800 hover:text-amber-950 bg-amber-50 hover:bg-amber-100 px-3 py-1.5 rounded-xl border border-amber-200/80 transition-colors cursor-pointer"
                  >
                    <ArrowLeft className="w-3.5 h-3.5" />
                    <span>Back to Topic {selectedBlock}</span>
                  </button>
                  <span className="text-xs font-black text-indigo-900 bg-indigo-50 border border-indigo-200 px-2.5 py-1 rounded-lg">
                    {selectedSection}
                  </span>
                </div>

                {/* If files exist, render them with the 3 buttons underneath */}
                {currentSectionMaterials.length > 0 ? (
                  <div className="space-y-3 pt-1">
                    {currentSectionMaterials.map((file) => (
                      <div
                        key={file.id}
                        className="bg-white border-2 border-slate-200 hover:border-amber-300 rounded-2xl p-4 shadow-2xs space-y-3 transition-all"
                      >
                        {/* File Details */}
                        <div className="flex items-center gap-3">
                          <div className="w-10 h-10 rounded-xl bg-rose-50 border border-rose-200 text-rose-600 flex items-center justify-center shrink-0">
                            <FileText className="w-5 h-5" />
                          </div>
                          <div className="min-w-0 flex-1">
                            <h4 className="text-sm font-black text-slate-900 truncate">
                              {file.fileName}
                            </h4>
                            <div className="flex items-center gap-2 text-[11px] text-slate-400 font-semibold mt-0.5">
                              <span>{formatBytes(file.fileSize)}</span>
                              <span>•</span>
                              <span>PDF</span>
                              {file.classId && file.classId !== 'ALL' && (
                                <>
                                  <span>•</span>
                                  <span className="text-indigo-600 font-bold">{file.classId}</span>
                                </>
                              )}
                            </div>
                          </div>
                        </div>

                        {/* The 3 requested buttons underneath the file */}
                        <div className="pt-2 border-t border-slate-100 grid grid-cols-3 gap-2">
                          {/* 1. زرار معاينة */}
                          <button
                            type="button"
                            id={`preview-btn-${file.id}`}
                            onClick={() => handlePreview(file)}
                            className="py-2 px-3 rounded-xl bg-indigo-50 hover:bg-indigo-100/90 text-indigo-900 font-black text-xs border border-indigo-200 flex items-center justify-center gap-1.5 transition-colors cursor-pointer"
                          >
                            <Eye className="w-3.5 h-3.5 text-indigo-600" />
                            <span>معاينة</span>
                          </button>

                          {/* 2. زرار طباعة */}
                          <button
                            type="button"
                            id={`print-btn-${file.id}`}
                            onClick={() => handlePrint(file)}
                            className="py-2 px-3 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-800 font-black text-xs border border-slate-200 flex items-center justify-center gap-1.5 transition-colors cursor-pointer"
                          >
                            <Printer className="w-3.5 h-3.5 text-slate-600" />
                            <span>طباعة</span>
                          </button>

                          {/* 3. زرار تحميل */}
                          <button
                            type="button"
                            id={`download-btn-${file.id}`}
                            onClick={() => handleDownload(file)}
                            className="py-2 px-3 rounded-xl bg-emerald-50 hover:bg-emerald-100 text-emerald-900 font-black text-xs border border-emerald-200 flex items-center justify-center gap-1.5 transition-colors cursor-pointer"
                          >
                            <Download className="w-3.5 h-3.5 text-emerald-600" />
                            <span>تحميل</span>
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  /* Empty state placeholder when no PDF uploaded yet */
                  <div className="py-8 px-4 bg-slate-50/80 rounded-2xl border-2 border-dashed border-slate-200 text-center space-y-3">
                    <div className="w-12 h-12 rounded-2xl bg-white text-slate-400 flex items-center justify-center mx-auto shadow-2xs border border-slate-200">
                      <FileText className="w-6 h-6 text-amber-500" />
                    </div>
                    <div>
                      <h4 className="text-sm font-black text-slate-800">
                        Block {selectedBlock} • {selectedSection}
                      </h4>
                      <p className="text-xs text-slate-500 font-semibold mt-1" dir="rtl">
                        لا يوجد ملف PDF مضاف في هذا القسم حتى الآن. يمكن للآدمن رفع الملف عبر لوحة الأدمن (Admin Panel).
                      </p>
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Footer */}
          <div className="pt-3 border-t border-slate-100 flex items-center justify-end">
            <button
              id="done-materials-btn"
              onClick={handleClose}
              className="py-2 px-5 bg-slate-900 hover:bg-slate-800 text-white font-bold text-xs rounded-xl transition-colors cursor-pointer shadow-sm"
            >
              Done
            </button>
          </div>
        </div>
      </div>
    </>
  );
};
