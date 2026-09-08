import React, { useState, useEffect } from 'react';
import {
  FolderOpen,
  FileText,
  BookOpen,
  Search,
  Check,
  X,
  Sparkles,
  Calendar,
  AlertCircle,
  Eye,
  Download,
  Printer,
  CheckCircle2,
  ExternalLink,
} from 'lucide-react';
import { MaterialItem, Subject, GradeSection } from '../types';
import { DEFAULT_SUBJECTS } from '../data/defaultData';
import { SubjectIcon } from './SubjectIcon';
import { getSavedMaterials, syncMaterialsFromServer } from '../utils/materialsStorage';
import {
  openMaterialSheetInNewTab,
  downloadMaterialSheet,
  printMaterialSheet,
  getMaterialFileUrl,
} from '../utils/sheetPdfViewer';

interface MaterialsModalProps {
  isOpen: boolean;
  onClose: () => void;
  subjects?: Subject[];
  currentSection?: GradeSection;
  isAdmin?: boolean;
}

type TabCategory = 'main_sheets' | 'week1' | 'week2' | 'week3' | 'all';

export const MaterialsModal: React.FC<MaterialsModalProps> = ({
  isOpen,
  onClose,
  subjects = DEFAULT_SUBJECTS,
}) => {
  // Filter out religion completely as requested
  const activeSubjects = subjects.filter((s) => s.id !== 'religion');

  const [materials, setMaterials] = useState<MaterialItem[]>([]);
  const [selectedBlock] = useState<number>(1);
  const [activeCategory, setActiveCategory] = useState<TabCategory>('main_sheets');
  const [selectedSubjectId, setSelectedSubjectId] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState<string>('');

  // In-app sheet content viewer
  const [viewingSheet, setViewingSheet] = useState<MaterialItem | null>(null);
  const [viewingFileUrl, setViewingFileUrl] = useState<string | null>(null);
  const [isResolvingUrl, setIsResolvingUrl] = useState<boolean>(false);
  const [solvedExercises, setSolvedExercises] = useState<Record<string, boolean>>({});

  // Load the local cache immediately, then hydrate it from the shared server
  // store so students/visitors see the same admin-uploaded materials.
  useEffect(() => {
    if (!isOpen) return;
    let active = true;
    setMaterials(getSavedMaterials());
    syncMaterialsFromServer().then((serverMaterials) => {
      if (active) setMaterials(serverMaterials);
    });
    const refresh = () => {
      if (active) syncMaterialsFromServer().then((next) => active && setMaterials(next));
    };
    window.addEventListener('focus', refresh);
    window.addEventListener('storage', refresh);
    return () => {
      active = false;
      window.removeEventListener('focus', refresh);
      window.removeEventListener('storage', refresh);
    };
  }, [isOpen]);

  // Resolve file URL for viewingSheet safely after verifying it exists
  useEffect(() => {
    let isMounted = true;
    if (viewingSheet) {
      setViewingFileUrl(null);
      setIsResolvingUrl(true);
      getMaterialFileUrl(viewingSheet)
        .then((url) => {
          if (isMounted) {
            setViewingFileUrl(url);
            setIsResolvingUrl(false);
          }
        })
        .catch(() => {
          if (isMounted) {
            setViewingFileUrl(null);
            setIsResolvingUrl(false);
          }
        });
    } else {
      setViewingFileUrl(null);
      setIsResolvingUrl(false);
    }
    return () => {
      isMounted = false;
    };
  }, [viewingSheet]);

  if (!isOpen) return null;

  const getSubjectName = (subjectId: string) => {
    const s = activeSubjects.find((sub) => sub.id === subjectId);
    return s ? (s.nameEn || s.nameAr) : subjectId;
  };

  const getSubjectObj = (subjectId: string) => {
    return activeSubjects.find((sub) => sub.id === subjectId);
  };

  const handleOpenSheetInNewTab = (item: MaterialItem) => {
    openMaterialSheetInNewTab(item, getSubjectName(item.subjectId));
  };

  const handleDownloadSheet = (item: MaterialItem) => {
    downloadMaterialSheet(item);
  };

  const handlePrintSheet = (item: MaterialItem) => {
    printMaterialSheet(item, getSubjectName(item.subjectId));
  };

  const toggleSolved = (key: string) => {
    setSolvedExercises((prev) => ({
      ...prev,
      [key]: !prev[key],
    }));
  };

  // Filter materials
  const filteredMaterials = materials.filter((m) => {
    // Exclude religion items
    if (m.subjectId === 'religion') return false;

    // 1. Block filter
    if (m.blockNumber !== selectedBlock) return false;

    // 2. Category filter
    if (activeCategory !== 'all' && m.category !== activeCategory) {
      return false;
    }

    // 3. Subject filter
    if (selectedSubjectId !== 'all' && m.subjectId !== selectedSubjectId) {
      return false;
    }

    // 4. Search query
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase().trim();
      const matchTitle = m.title.toLowerCase().includes(q);
      const matchNotes = m.notes ? m.notes.toLowerCase().includes(q) : false;
      const matchSubject = getSubjectName(m.subjectId).toLowerCase().includes(q);
      if (!matchTitle && !matchNotes && !matchSubject) return false;
    }

    return true;
  });

  // Counts
  const block1Materials = materials.filter((m) => m.blockNumber === 1 && m.subjectId !== 'religion');
  const mainSheetsCount = block1Materials.filter((m) => m.category === 'main_sheets').length;
  const week1Count = block1Materials.filter((m) => m.category === 'week1').length;
  const week2Count = block1Materials.filter((m) => m.category === 'week2').length;
  const week3Count = block1Materials.filter((m) => m.category === 'week3').length;

  return (
    <div className="fixed inset-0 z-50 bg-slate-950/60 backdrop-blur-xs flex items-center justify-center p-2 sm:p-4 overflow-hidden">
      <div className="bg-white rounded-3xl w-full max-w-5xl h-[92vh] max-h-[900px] shadow-2xl border border-slate-200 flex flex-col overflow-hidden text-right animate-scaleUp">
        
        {/* Header - View Only Mode */}
        <div className="p-4 sm:p-5 bg-gradient-to-r from-slate-900 via-indigo-950 to-slate-900 text-white flex items-center justify-between border-b border-indigo-900/50">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-indigo-500/20 border border-indigo-400/30 flex items-center justify-center text-indigo-300">
              <FolderOpen className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-lg font-black text-white">Materials (الماتيريال والمستندات)</h3>
                <span className="text-[11px] font-bold px-2 py-0.5 rounded-full bg-indigo-500/30 text-indigo-200 border border-indigo-400/30">
                  Block {selectedBlock}
                </span>
                <span className="text-[11px] font-bold px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 border border-emerald-400/30 flex items-center gap-1">
                  <Eye className="w-3 h-3" />
                  <span>عرض فقط</span>
                </span>
              </div>
              <p className="text-xs text-slate-300 mt-0.5">
                تصفح ومراجعة الشيتات والأسئلة الرسمية المعتمدة لجميع المواد (عرض وتصفح فقط)
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <div className="hidden sm:flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-white/10 text-slate-200 text-xs font-bold border border-white/10">
              <Eye className="w-3.5 h-3.5 text-emerald-400" />
              <span>وضع العرض فقط (View Only)</span>
            </div>

            <button
              type="button"
              onClick={onClose}
              className="w-9 h-9 rounded-xl bg-white/10 hover:bg-white/20 text-slate-300 hover:text-white flex items-center justify-center transition-colors cursor-pointer"
              title="إغلاق"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Top Control Bar: Blocks & Categories */}
        <div className="bg-slate-50 border-b border-slate-200 p-3 sm:px-6 flex flex-col sm:flex-row items-center justify-between gap-3">
          
          {/* Main Category Tabs */}
          <div className="flex items-center gap-1.5 w-full sm:w-auto overflow-x-auto select-none py-0.5">
            <button
              type="button"
              onClick={() => setActiveCategory('main_sheets')}
              className={`px-3 py-1.5 rounded-xl font-bold text-xs flex items-center gap-1.5 transition-all shrink-0 cursor-pointer ${
                activeCategory === 'main_sheets'
                  ? 'bg-indigo-600 text-white shadow-xs'
                  : 'bg-white text-slate-700 hover:bg-slate-100 border border-slate-200'
              }`}
            >
              <BookOpen className="w-3.5 h-3.5" />
              <span>Main Sheets (Block 1)</span>
              <span className={`text-[10px] px-1.5 py-0.2 rounded-full ${
                activeCategory === 'main_sheets' ? 'bg-indigo-800 text-indigo-100' : 'bg-slate-100 text-slate-600'
              }`}>
                {mainSheetsCount}
              </span>
            </button>

            <button
              type="button"
              onClick={() => setActiveCategory('week1')}
              className={`px-3 py-1.5 rounded-xl font-bold text-xs flex items-center gap-1.5 transition-all shrink-0 cursor-pointer ${
                activeCategory === 'week1'
                  ? 'bg-amber-600 text-white shadow-xs'
                  : 'bg-white text-slate-700 hover:bg-slate-100 border border-slate-200'
              }`}
            >
              <Calendar className="w-3.5 h-3.5" />
              <span>Week 1</span>
              <span className={`text-[10px] px-1.5 py-0.2 rounded-full ${
                activeCategory === 'week1' ? 'bg-amber-800 text-amber-100' : 'bg-slate-100 text-slate-600'
              }`}>
                {week1Count}
              </span>
            </button>

            <button
              type="button"
              onClick={() => setActiveCategory('week2')}
              className={`px-3 py-1.5 rounded-xl font-bold text-xs flex items-center gap-1.5 transition-all shrink-0 cursor-pointer ${
                activeCategory === 'week2'
                  ? 'bg-purple-600 text-white shadow-xs'
                  : 'bg-white text-slate-700 hover:bg-slate-100 border border-slate-200'
              }`}
            >
              <Calendar className="w-3.5 h-3.5" />
              <span>Week 2</span>
              <span className={`text-[10px] px-1.5 py-0.2 rounded-full ${
                activeCategory === 'week2' ? 'bg-purple-800 text-purple-100' : 'bg-slate-100 text-slate-600'
              }`}>
                {week2Count}
              </span>
            </button>

            <button
              type="button"
              onClick={() => setActiveCategory('week3')}
              className={`px-3 py-1.5 rounded-xl font-bold text-xs flex items-center gap-1.5 transition-all shrink-0 cursor-pointer ${
                activeCategory === 'week3'
                  ? 'bg-emerald-600 text-white shadow-xs'
                  : 'bg-white text-slate-700 hover:bg-slate-100 border border-slate-200'
              }`}
            >
              <Calendar className="w-3.5 h-3.5" />
              <span>Week 3</span>
              <span className={`text-[10px] px-1.5 py-0.2 rounded-full ${
                activeCategory === 'week3' ? 'bg-emerald-800 text-emerald-100' : 'bg-slate-100 text-slate-600'
              }`}>
                {week3Count}
              </span>
            </button>

            <button
              type="button"
              onClick={() => setActiveCategory('all')}
              className={`px-2.5 py-1.5 rounded-xl font-bold text-xs transition-all shrink-0 cursor-pointer ${
                activeCategory === 'all'
                  ? 'bg-slate-800 text-white'
                  : 'bg-white text-slate-600 hover:bg-slate-100 border border-slate-200'
              }`}
            >
              All ({block1Materials.length})
            </button>
          </div>

          {/* Search Box */}
          <div className="relative w-full sm:w-64 shrink-0">
            <Search className="w-3.5 h-3.5 text-slate-400 absolute right-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="بحث في الشيتات والأسئلة..."
              className="w-full pl-3 pr-8 py-1.5 text-xs bg-white rounded-xl border border-slate-200 focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 outline-hidden font-bold"
            />
            {searchQuery && (
              <button
                type="button"
                onClick={() => setSearchQuery('')}
                className="absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
              >
                <X className="w-3 h-3" />
              </button>
            )}
          </div>
        </div>

        {/* Subject Filter Pills */}
        <div className="px-4 py-2.5 bg-white border-b border-slate-100 flex items-center gap-1.5 overflow-x-auto select-none">
          <span className="text-[11px] font-bold text-slate-400 shrink-0">المادة:</span>
          <button
            type="button"
            onClick={() => setSelectedSubjectId('all')}
            className={`px-2.5 py-1 rounded-lg text-xs font-bold transition-all shrink-0 cursor-pointer ${
              selectedSubjectId === 'all'
                ? 'bg-slate-800 text-white'
                : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
            }`}
          >
            جميع المواد
          </button>
          {activeSubjects.map((sub) => {
            const countForSub = materials.filter(
              (m) => m.blockNumber === selectedBlock && m.subjectId === sub.id
            ).length;
            if (countForSub === 0 && selectedSubjectId !== sub.id) return null;

            return (
              <button
                key={sub.id}
                type="button"
                onClick={() => setSelectedSubjectId(sub.id)}
                className={`px-2.5 py-1 rounded-lg text-xs font-bold transition-all shrink-0 flex items-center gap-1.5 cursor-pointer ${
                  selectedSubjectId === sub.id
                    ? `${sub.color.bg} text-white shadow-xs`
                    : 'bg-slate-100 hover:bg-slate-200 text-slate-700'
                }`}
              >
                <SubjectIcon iconName={sub.iconName} className="w-3.5 h-3.5" />
                <span>{sub.nameAr}</span>
                <span className="text-[10px] opacity-75 font-mono">({countForSub})</span>
              </button>
            );
          })}
        </div>

        {/* Content Body - strictly view only */}
        <div className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-4">
          
          {/* Week 1 Notice banner when week1 is active and empty */}
          {activeCategory === 'week1' && week1Count === 0 && (
            <div className="bg-amber-50/70 rounded-2xl border border-amber-200 p-5 text-right space-y-2">
              <div className="flex items-center gap-2 text-amber-800 font-bold text-sm">
                <AlertCircle className="w-5 h-5 text-amber-600 shrink-0" />
                <span>ماتيريال (Week 1)</span>
              </div>
              <p className="text-xs sm:text-sm text-slate-600 leading-relaxed">
                لم يتم إدراج شيتات مخصصة لـ Week 1 حتى الآن. وعند اعتماد ورفع أي شيت جديد من قِبل إدارة المدرسة/الأدمن سيظهر هنا تلقائياً.
              </p>
            </div>
          )}

          {/* Week 2 Notice banner when week2 is active and empty */}
          {activeCategory === 'week2' && week2Count === 0 && (
            <div className="bg-purple-50/70 rounded-2xl border border-purple-200 p-5 text-right space-y-2">
              <div className="flex items-center gap-2 text-purple-800 font-bold text-sm">
                <Calendar className="w-5 h-5 text-purple-600 shrink-0" />
                <span>ماتيريال (Week 2)</span>
              </div>
              <p className="text-xs sm:text-sm text-slate-600 leading-relaxed">
                قسم شيتات وماتيريال Week 2 مخصص لعرض شيتات الأسبوع فور قيام المشرف برفعها.
              </p>
            </div>
          )}

          {/* Materials Grid */}
          {filteredMaterials.length === 0 ? (
            <div className="p-12 text-center bg-slate-50 rounded-3xl border border-slate-200 text-slate-500 text-xs sm:text-sm space-y-2">
              <FolderOpen className="w-8 h-8 text-slate-400 mx-auto" />
              <p className="font-bold text-slate-700">لا توجد شيتات متاحة في هذا القسم حالياً</p>
              <p className="text-slate-400 text-xs">
                يتم رفع وتحديث الشيتات والماتيريال حصرياً بواسطة المشرف العام (الأدمن).
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5">
              {filteredMaterials.map((item) => {
                const subObj = getSubjectObj(item.subjectId);
                const isMainSheet = item.category === 'main_sheets';

                const displayCategoryLabel =
                  item.category === 'main_sheets' || item.categoryLabel === 'الشيتات الرئيسية'
                    ? 'Main Sheets'
                    : item.category === 'week1' || item.categoryLabel === 'ويك 1'
                    ? 'Week 1'
                    : item.category === 'week2' || item.categoryLabel === 'ويك 2'
                    ? 'Week 2'
                    : item.category === 'week3' || item.categoryLabel === 'ويك 3'
                    ? 'Week 3'
                    : item.categoryLabel || item.category;

                return (
                  <div
                    key={item.id}
                    onClick={() => setViewingSheet(item)}
                    className="bg-white rounded-2xl border border-slate-200 hover:border-indigo-400 p-4 shadow-2xs hover:shadow-md transition-all flex flex-col justify-between group cursor-pointer"
                  >
                    <div>
                      {/* Top badges */}
                      <div className="flex items-center justify-between gap-2 mb-2.5">
                        <div className="flex items-center gap-2 flex-wrap">
                          {subObj ? (
                            <span
                              className={`text-[11px] font-bold px-2.5 py-1 rounded-lg ${subObj.color.lightBg} ${subObj.color.text} border ${subObj.color.border} flex items-center gap-1.5`}
                            >
                              <SubjectIcon iconName={subObj.iconName} className="w-3.5 h-3.5" />
                              <span>{subObj.nameAr}</span>
                            </span>
                          ) : (
                            <span className="text-[11px] font-bold px-2 py-0.5 rounded-md bg-slate-100 text-slate-700">
                              {item.subjectId}
                            </span>
                          )}

                          <span
                            className={`text-[10px] font-bold px-2 py-0.5 rounded-md ${
                              isMainSheet
                                ? 'bg-blue-50 text-blue-700 border border-blue-200'
                                : 'bg-purple-50 text-purple-700 border border-purple-200'
                            }`}
                          >
                            {displayCategoryLabel}
                          </span>

                          {item.pageCount && (
                            <span className="text-[10px] font-bold px-1.5 py-0.5 rounded-md bg-amber-50 text-amber-700 border border-amber-200">
                              {item.pageCount} صفحة
                            </span>
                          )}

                          {item.unitTitle && (
                            <span className="text-[10px] font-bold px-1.5 py-0.5 rounded-md bg-slate-100 text-slate-700 border border-slate-200 truncate max-w-[140px]">
                              {item.unitTitle}
                            </span>
                          )}
                        </div>
                      </div>

                      {/* Title */}
                      <h4 className="text-sm font-black text-slate-900 group-hover:text-indigo-900 transition-colors leading-snug">
                        {item.title}
                      </h4>

                      {/* File Name Tag */}
                      {item.fileName && (
                        <div className="mt-2 text-[11px] text-slate-400 font-mono flex items-center gap-1">
                          <FileText className="w-3 h-3 text-slate-400" />
                          <span className="truncate max-w-[280px]">{item.fileName}</span>
                        </div>
                      )}
                    </div>

                    {/* Bottom Actions */}
                    <div className="mt-3.5 pt-3 border-t border-slate-100 flex items-center justify-between gap-2">
                      <span className="text-[10px] text-slate-400 font-medium">
                        {new Date(item.createdAt).toLocaleDateString('ar-EG', {
                          month: 'short',
                          day: 'numeric',
                        })}
                      </span>

                      <div className="flex items-center gap-1.5">
                        {/* 1. Eye Button: Opens in modal viewer */}
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            setViewingSheet(item);
                          }}
                          className="px-3 py-1.5 rounded-xl bg-indigo-50 hover:bg-indigo-100 text-indigo-700 hover:text-indigo-800 transition-all cursor-pointer border border-indigo-200 active:scale-95 flex items-center gap-1.5 shadow-2xs text-xs font-bold"
                          title="عرض الشيت الأصلي بنفس التنسيق"
                        >
                          <Eye className="w-3.5 h-3.5" />
                          <span>عرض</span>
                        </button>

                        {/* 2. Download Button: Downloads exact file */}
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            handleDownloadSheet(item);
                          }}
                          className="px-3 py-1.5 rounded-xl bg-emerald-50 hover:bg-emerald-100 text-emerald-700 hover:text-emerald-800 transition-all cursor-pointer border border-emerald-200 active:scale-95 flex items-center gap-1.5 shadow-2xs text-xs font-bold"
                          title="تنزيل الشيت على جهازك بالتنسيق الأصلي"
                        >
                          <Download className="w-3.5 h-3.5" />
                          <span>تنزيل</span>
                        </button>

                        {/* 3. Open in New Tab Button */}
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            handleOpenSheetInNewTab(item);
                          }}
                          className="p-1.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 transition-all cursor-pointer border border-slate-200 active:scale-95 flex items-center justify-center shadow-2xs"
                          title="فتح الرابط / الملف الأصلي في نافذة مستقلة"
                        >
                          <ExternalLink className="w-4 h-4" />
                        </button>

                        {/* 4. Print Button: Prints the sheet */}
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            handlePrintSheet(item);
                          }}
                          className="p-1.5 rounded-xl bg-slate-50 hover:bg-slate-100 text-slate-700 hover:text-indigo-700 transition-all cursor-pointer border border-slate-200 active:scale-95 flex items-center justify-center shadow-2xs"
                          title="طباعة الشيت"
                        >
                          <Printer className="w-4 h-4" />
                        </button>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Footer - Pure View Only */}
        <div className="p-4 bg-slate-50 border-t border-slate-200 flex flex-col sm:flex-row items-center justify-between gap-3 text-xs text-slate-600">
          <div className="flex items-center gap-2">
            <Sparkles className="w-4 h-4 text-indigo-500 shrink-0" />
            <span>
              قسم الماتيريال والشيتات الرسمية لطلاب Grade 2 • يتم عرض وتحميل الملفات بنفس التنسيق والألوان والصيغة الأصلية.
            </span>
          </div>
          <div className="flex items-center gap-2 shrink-0">
            <button
              type="button"
              onClick={onClose}
              className="px-6 py-2 rounded-xl bg-slate-900 hover:bg-slate-800 text-white font-bold transition-colors cursor-pointer text-xs shadow-xs"
            >
              إغلاق
            </button>
          </div>
        </div>

      </div>

      {/* ========================================================================= */}
      {/* MODAL 2: SHEET CONTENT VIEWER (Direct view of real sheet exercises)       */}
      {/* ========================================================================= */}
      {viewingSheet && (
        <div className="fixed inset-0 z-60 bg-slate-950/75 backdrop-blur-xs flex items-center justify-center p-2 sm:p-4 overflow-hidden">
          <div className="bg-white rounded-3xl w-full max-w-4xl h-[90vh] max-h-[850px] shadow-2xl border border-slate-200 flex flex-col overflow-hidden text-right animate-scaleUp">
            
            {/* Viewer Header */}
            <div className="p-4 sm:p-5 bg-gradient-to-r from-blue-900 via-indigo-900 to-slate-900 text-white flex items-center justify-between border-b border-indigo-800">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-2xl bg-white/10 border border-white/20 flex items-center justify-center text-white">
                  <BookOpen className="w-5 h-5" />
                </div>
                <div>
                  <div className="flex items-center gap-2 flex-wrap">
                    <h3 className="text-base sm:text-lg font-black text-white">{viewingSheet.title}</h3>
                    {viewingSheet.pageCount && (
                      <span className="text-[11px] font-bold px-2 py-0.5 rounded-md bg-amber-400/20 text-amber-300 border border-amber-300/30">
                        {viewingSheet.pageCount} صفحة
                      </span>
                    )}
                    <span className="text-[10px] font-bold px-2 py-0.5 rounded-md bg-emerald-400/20 text-emerald-300 border border-emerald-300/30 flex items-center gap-1">
                      <Eye className="w-2.5 h-2.5" />
                      <span>عرض فقط</span>
                    </span>
                  </div>
                  <p className="text-xs text-indigo-200 mt-0.5">
                    {getSubjectName(viewingSheet.subjectId)} • Block {viewingSheet.blockNumber} •{' '}
                    {viewingSheet.unitTitle || viewingSheet.categoryLabel || viewingSheet.category}
                  </p>
                </div>
              </div>

              {/* Buttons in Modal Header */}
              <div className="flex items-center gap-2 shrink-0">
                {/* Download Button */}
                <button
                  type="button"
                  onClick={() => handleDownloadSheet(viewingSheet)}
                  className="px-3 py-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold transition-colors cursor-pointer flex items-center gap-1.5 shadow-2xs"
                  title="تنزيل الشيت على جهازك بالتنسيق الأصلي"
                >
                  <Download className="w-3.5 h-3.5" />
                  <span className="hidden sm:inline">تنزيل</span>
                </button>

                {/* 1. Open in Full Window Button */}
                <button
                  type="button"
                  onClick={() => {
                    if (viewingFileUrl) {
                      window.open(viewingFileUrl, '_blank');
                    } else {
                      handleOpenSheetInNewTab(viewingSheet);
                    }
                  }}
                  className="px-3 py-1.5 rounded-xl bg-white/20 hover:bg-white/30 text-white text-xs font-bold transition-colors cursor-pointer flex items-center gap-1.5 shadow-2xs"
                  title="فتح الملف الأصلي في نافذة مستقلة كاملة"
                >
                  <ExternalLink className="w-3.5 h-3.5" />
                  <span className="hidden sm:inline">نافذة مستقلة</span>
                </button>

                {/* 2. Print Button: Prints sheet */}
                <button
                  type="button"
                  onClick={() => handlePrintSheet(viewingSheet)}
                  className="p-2 rounded-xl bg-white/15 hover:bg-white/25 text-white transition-colors cursor-pointer flex items-center justify-center"
                  title="طباعة الشيت"
                >
                  <Printer className="w-4 h-4" />
                </button>

                {/* Close X */}
                <button
                  type="button"
                  onClick={() => setViewingSheet(null)}
                  className="w-8 h-8 rounded-xl bg-white/10 hover:bg-white/20 text-slate-300 hover:text-white flex items-center justify-center transition-colors cursor-pointer"
                  title="إغلاق"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
            </div>

            {/* Viewer Body */}
            <div className="flex-1 overflow-y-auto p-3 sm:p-5 space-y-4 bg-slate-900">
              {isResolvingUrl ? (
                <div className="w-full h-[72vh] sm:h-[76vh] rounded-2xl flex flex-col items-center justify-center border border-slate-800 bg-slate-950 text-slate-400 space-y-3">
                  <div className="w-8 h-8 border-3 border-indigo-500 border-t-transparent rounded-full animate-spin" />
                  <p className="text-xs font-bold text-slate-300">جاري فتح وتجهيز الشيت بالتنسيق الأصلي...</p>
                </div>
              ) : viewingFileUrl ? (
                <div className="w-full h-[72vh] sm:h-[76vh] rounded-2xl overflow-hidden border border-slate-700 bg-slate-950 shadow-inner">
                  <iframe
                    src={viewingFileUrl}
                    title={viewingSheet.title}
                    className="w-full h-full border-none"
                  />
                </div>
              ) : (
                <>
                  {/* Sheet Metadata Banner */}
                  <div className="bg-white rounded-2xl border border-slate-200 p-4 shadow-2xs flex flex-wrap items-center justify-between gap-3">
                    <div className="flex items-center gap-2 flex-wrap text-xs text-slate-700 font-bold">
                      <span className="text-indigo-700 bg-indigo-50 px-2.5 py-1 rounded-lg border border-indigo-100">
                        مدارس النيل المصرية الدولية (Nile Schools)
                      </span>
                      <span className="bg-slate-100 px-2.5 py-1 rounded-lg text-slate-600">
                        Grade 2 - Block {viewingSheet.blockNumber}
                      </span>
                      {viewingSheet.fileName && (
                        <span className="font-mono text-[11px] text-slate-500 bg-slate-100 px-2.5 py-1 rounded-lg">
                          {viewingSheet.fileName}
                        </span>
                      )}
                    </div>

                    <div className="text-xs text-slate-500 font-medium">
                      تمارين وأسئلة الشيت الرسمية
                    </div>
                  </div>

                  {/* Exercises / Topics List */}
                  {viewingSheet.contentPreview?.items && viewingSheet.contentPreview.items.length > 0 ? (
                    <div className="space-y-3">
                      {viewingSheet.contentPreview.items.map((itemText, idx) => {
                        const exerciseKey = `${viewingSheet.id}-q-${idx}`;
                        const isSolved = !!solvedExercises[exerciseKey];

                        return (
                          <div
                            key={exerciseKey}
                            className={`bg-white rounded-2xl border transition-all p-4 shadow-2xs flex items-start justify-between gap-3 ${
                              isSolved ? 'border-emerald-300 bg-emerald-50/20' : 'border-slate-200 hover:border-indigo-300'
                            }`}
                          >
                            <div className="space-y-1.5 flex-1">
                              <div className="flex items-center gap-2">
                                <span className="text-xs font-black px-2 py-0.5 rounded-md bg-indigo-50 text-indigo-700 border border-indigo-200">
                                  فقرة / سؤال {idx + 1}
                                </span>
                                {isSolved && (
                                  <span className="text-[10px] font-bold px-2 py-0.5 rounded-md bg-emerald-100 text-emerald-800 flex items-center gap-1">
                                    <CheckCircle2 className="w-3 h-3" />
                                    <span>تمت المذاكرة / الحل</span>
                                  </span>
                                )}
                              </div>
                              <p className="text-xs sm:text-sm text-slate-800 leading-relaxed font-medium">
                                {itemText}
                              </p>
                            </div>

                            <button
                              type="button"
                              onClick={() => toggleSolved(exerciseKey)}
                              className={`p-2 rounded-xl border transition-all cursor-pointer shrink-0 ${
                                isSolved
                                  ? 'bg-emerald-600 text-white border-emerald-600 shadow-xs'
                                  : 'bg-white text-slate-400 hover:text-slate-600 border-slate-200 hover:bg-slate-50'
                              }`}
                              title={isSolved ? 'إلغاء علامة الحل' : 'تحديد كتم الحل'}
                            >
                              <Check className="w-4 h-4" />
                            </button>
                          </div>
                        );
                      })}
                    </div>
                  ) : (
                    <div className="p-8 text-center bg-white rounded-2xl border border-slate-200 text-slate-600">
                      <p className="text-sm font-bold">{viewingSheet.notes || 'الشيت جاهز للحل والمذاكرة.'}</p>
                    </div>
                  )}
                </>
              )}
            </div>

            {/* Viewer Footer - 3 Dedicated Buttons */}
            <div className="p-4 bg-white border-t border-slate-200 flex items-center justify-between gap-3">
              <button
                type="button"
                onClick={() => setViewingSheet(null)}
                className="px-5 py-2 rounded-xl bg-slate-900 hover:bg-slate-800 text-white font-bold text-xs transition-colors cursor-pointer"
              >
                رجوع لقائمة الماتيريال
              </button>

              <div className="flex items-center gap-2">
                {/* 1. Eye Button */}
                <button
                  type="button"
                  onClick={() => handleOpenSheetInNewTab(viewingSheet)}
                  className="px-3.5 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs flex items-center gap-1.5 transition-colors cursor-pointer shadow-xs"
                  title="عرض في صفحة التبويب (PDF)"
                >
                  <Eye className="w-4 h-4" />
                  <span>عرض في تبويب جديد</span>
                </button>

                {/* 2. Print Button */}
                <button
                  type="button"
                  onClick={() => handlePrintSheet(viewingSheet)}
                  className="px-3.5 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs flex items-center gap-1.5 transition-colors cursor-pointer border border-slate-200"
                  title="طباعة الشيت"
                >
                  <Printer className="w-4 h-4" />
                  <span>طباعة الشيت</span>
                </button>
              </div>
            </div>

          </div>
        </div>
      )}
    </div>
  );
};
