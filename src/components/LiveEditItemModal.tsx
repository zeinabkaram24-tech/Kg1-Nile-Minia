import React, { useState, useEffect } from 'react';
import { X, Check, Trash2, Plus, ExternalLink, Sparkles, BookOpen, CheckSquare, Briefcase } from 'lucide-react';
import { ClassId, SchoolDay, SubjectName, ClassworkEntry, HomeworkEntry, TomorrowSpecialNote, PlanLink } from '../types';
import { SCHOOL_DAYS } from '../data/timetables';

const ALL_SUBJECTS: SubjectName[] = [
  'Arabic',
  'English',
  'Mathematics',
  'Science',
  'Social Studies',
  'Religion',
  'French',
  'ICT',
  'Arts',
  'Music',
  'PE',
];

const ARABIC_DAYS: Record<SchoolDay, string> = {
  Saturday: 'السبت',
  Sunday: 'الأحد',
  Monday: 'الإثنين',
  Tuesday: 'الثلاثاء',
  Wednesday: 'الأربعاء',
  Thursday: 'الخميس',
};

const ARABIC_SUBJECT_NAMES: Record<SubjectName, string> = {
  Arabic: 'اللغة العربية (Arabic)',
  English: 'اللغة الإنجليزية (English)',
  Mathematics: 'الرياضيات (Mathematics)',
  Science: 'العلوم (Science)',
  'Social Studies': 'الدراسات الاجتماعية (Social Studies)',
  Religion: 'التربية الدينية (Religion)',
  French: 'اللغة الفرنسية (French)',
  ICT: 'تكنولوجيا المعلومات (ICT)',
  Arts: 'التربية الفنية (Arts)',
  Music: 'التربية الموسيقية (Music)',
  PE: 'التربية الرياضية (PE)',
};

export type LiveEditModeType = 'classwork' | 'homework' | 'tomorrow_note';

interface LiveEditItemModalProps {
  isOpen: boolean;
  onClose: () => void;
  type: LiveEditModeType;
  item?: ClassworkEntry | HomeworkEntry | TomorrowSpecialNote | null;
  currentClass: ClassId;
  selectedDay: SchoolDay;
  currentBlock: number;
  currentWeek: number;
  onSaveClasswork?: (entry: ClassworkEntry) => void;
  onSaveHomework?: (entry: HomeworkEntry) => void;
  onSaveTomorrowNote?: (note: TomorrowSpecialNote, originalIndex?: number) => void;
  originalIndex?: number;
}

export const LiveEditItemModal: React.FC<LiveEditItemModalProps> = ({
  isOpen,
  onClose,
  type,
  item,
  currentClass,
  selectedDay,
  currentBlock,
  currentWeek,
  onSaveClasswork,
  onSaveHomework,
  onSaveTomorrowNote,
  originalIndex,
}) => {
  // Form State
  const [subject, setSubject] = useState<SubjectName>('Arabic');
  const [day, setDay] = useState<SchoolDay>(selectedDay);
  const [dueDay, setDueDay] = useState<SchoolDay>(selectedDay);
  const [period, setPeriod] = useState<number>(1);
  const [title, setTitle] = useState<string>('');
  const [pages, setPages] = useState<string>('');
  const [details, setDetails] = useState<string>('');
  const [taskText, setTaskText] = useState<string>('');
  const [noteText, setNoteText] = useState<string>('');
  const [bagItem, setBagItem] = useState<string>('');
  const [linksText, setLinksText] = useState<string>('');

  useEffect(() => {
    if (!isOpen) return;

    if (type === 'classwork') {
      const cw = item as ClassworkEntry | undefined;
      if (cw) {
        setSubject((cw.subject as SubjectName) || 'Arabic');
        setDay(cw.day || selectedDay);
        setPeriod(cw.period || 1);
        setTitle(cw.title || '');
        setPages(cw.pages || '');
        setDetails(cw.details || '');
        const urls = (cw.links || []).map((l) => l.url).filter(Boolean);
        if (cw.linkUrl && !urls.includes(cw.linkUrl)) urls.push(cw.linkUrl);
        setLinksText(urls.join('\n'));
      } else {
        setSubject('Arabic');
        setDay(selectedDay);
        setPeriod(1);
        setTitle('');
        setPages('');
        setDetails('');
        setLinksText('');
      }
    } else if (type === 'homework') {
      const hw = item as HomeworkEntry | undefined;
      if (hw) {
        setSubject((hw.subject as SubjectName) || 'Arabic');
        setDay(hw.assignedDay || selectedDay);
        setDueDay(hw.dueDay || selectedDay);
        setTaskText(hw.task || '');
        setPages(hw.pages || '');
        setDetails(hw.details || '');
        const urls = (hw.links || []).map((l) => l.url).filter(Boolean);
        if (hw.linkUrl && !urls.includes(hw.linkUrl)) urls.push(hw.linkUrl);
        setLinksText(urls.join('\n'));
      } else {
        setSubject('Arabic');
        setDay(selectedDay);
        setDueDay(selectedDay);
        setTaskText('');
        setPages('');
        setDetails('');
        setLinksText('');
      }
    } else if (type === 'tomorrow_note') {
      const note = item as TomorrowSpecialNote | undefined;
      if (note) {
        setSubject((note.subject as SubjectName) || 'Arabic');
        setDay(note.targetDay || selectedDay);
        setNoteText(note.arabicNote || note.note || '');
        setBagItem(note.bagItem || '');
      } else {
        setSubject('Arabic');
        setDay(selectedDay);
        setNoteText('');
        setBagItem('');
      }
    }
  }, [isOpen, item, type, selectedDay]);

  if (!isOpen) return null;

  const parseLinks = (): PlanLink[] => {
    return linksText
      .split('\n')
      .map((l) => l.trim())
      .filter((l) => l.startsWith('http://') || l.startsWith('https://'))
      .map((url) => ({
        url,
        title: url.includes('youtu') ? 'فيديو يوتيوب' : 'رابط دراسي',
        type: url.includes('youtu') ? 'video' : 'sheet',
      }));
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    if (type === 'classwork') {
      if (!title.trim()) return;
      const links = parseLinks();
      const entryId = (item as ClassworkEntry)?.id || `cw-${currentClass.toLowerCase()}-${Date.now()}`;
      const entry: ClassworkEntry = {
        id: entryId,
        classId: currentClass,
        day,
        period,
        subject,
        title: title.trim(),
        pages: pages.trim() || undefined,
        details: details.trim() || undefined,
        completed: (item as ClassworkEntry)?.completed || false,
        block: currentBlock,
        week: currentWeek,
        links: links.length > 0 ? links : undefined,
        linkUrl: links.length > 0 ? links[0].url : undefined,
        linkTitle: links.length > 0 ? links[0].title : undefined,
      };
      if (onSaveClasswork) onSaveClasswork(entry);
    } else if (type === 'homework') {
      if (!taskText.trim() && !pages.trim() && linksText.trim() === '') return;
      const links = parseLinks();
      const finalTask = taskText.trim() || (links.length > 0 ? links[0].url : pages.trim() || 'واجب مدرسي');
      const entryId = (item as HomeworkEntry)?.id || `hw-${currentClass.toLowerCase()}-${Date.now()}`;
      const entry: HomeworkEntry = {
        id: entryId,
        classId: currentClass,
        assignedDay: day,
        dueDay,
        subject,
        task: finalTask,
        pages: pages.trim() || undefined,
        details: details.trim() || undefined,
        completed: (item as HomeworkEntry)?.completed || false,
        priority: 'normal',
        block: currentBlock,
        week: currentWeek,
        links: links.length > 0 ? links : undefined,
        linkUrl: links.length > 0 ? links[0].url : undefined,
        linkTitle: links.length > 0 ? links[0].title : undefined,
      };
      if (onSaveHomework) onSaveHomework(entry);
    } else if (type === 'tomorrow_note') {
      if (!noteText.trim() && !bagItem.trim()) return;
      const note: TomorrowSpecialNote = {
        classId: currentClass,
        targetDay: day,
        subject,
        note: noteText.trim(),
        arabicNote: noteText.trim(),
        bagItem: bagItem.trim() || undefined,
        block: currentBlock,
        week: currentWeek,
      };
      if (onSaveTomorrowNote) onSaveTomorrowNote(note, originalIndex);
    }

    onClose();
  };

  const isEditing = Boolean(item);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-900/60 backdrop-blur-xs animate-fade-in">
      <div
        className="bg-white rounded-3xl shadow-2xl border border-slate-200 max-w-lg w-full p-5 sm:p-6 relative max-h-[92vh] flex flex-col"
        dir="rtl"
      >
        {/* Header */}
        <div className="flex items-center justify-between pb-3.5 border-b border-slate-100">
          <div className="flex items-center gap-2.5">
            <div className="w-10 h-10 rounded-2xl bg-indigo-600 text-white flex items-center justify-center shadow-xs">
              {type === 'classwork' ? (
                <BookOpen className="w-5 h-5" />
              ) : type === 'homework' ? (
                <CheckSquare className="w-5 h-5" />
              ) : (
                <Briefcase className="w-5 h-5" />
              )}
            </div>
            <div>
              <h3 className="text-base sm:text-lg font-black text-slate-900">
                {isEditing ? 'تعديل' : 'إضافة'}{' '}
                {type === 'classwork'
                  ? 'درس (Classwork)'
                  : type === 'homework'
                  ? 'واجب (Homework)'
                  : 'ملاحظة للغد (Tomorrow Note)'}
              </h3>
              <p className="text-xs text-slate-500 font-bold">
                {currentClass} • Topic {currentBlock} • Week {currentWeek}
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-xl text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="py-4 overflow-y-auto flex-1 space-y-4">
          {/* Subject & Day row */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-black text-slate-700 mb-1">المادة (Subject)</label>
              <select
                value={subject}
                onChange={(e) => setSubject(e.target.value as SubjectName)}
                className="w-full px-3 py-2 text-xs font-bold rounded-xl border border-slate-300 bg-slate-50 focus:bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500 transition-all"
              >
                {ALL_SUBJECTS.map((s) => (
                  <option key={s} value={s}>
                    {ARABIC_SUBJECT_NAMES[s] || s}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-xs font-black text-slate-700 mb-1">
                {type === 'tomorrow_note' ? 'ليوم الغد المستهدف' : 'يوم الحصة / الواجب'}
              </label>
              <select
                value={day}
                onChange={(e) => setDay(e.target.value as SchoolDay)}
                className="w-full px-3 py-2 text-xs font-bold rounded-xl border border-slate-300 bg-slate-50 focus:bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500 transition-all"
              >
                {SCHOOL_DAYS.map((d) => (
                  <option key={d} value={d}>
                    {ARABIC_DAYS[d]} ({d})
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* If Homework: Due Day */}
          {type === 'homework' && (
            <div>
              <label className="block text-xs font-black text-slate-700 mb-1">يوم التسليم (Due Day)</label>
              <select
                value={dueDay}
                onChange={(e) => setDueDay(e.target.value as SchoolDay)}
                className="w-full px-3 py-2 text-xs font-bold rounded-xl border border-slate-300 bg-slate-50 focus:bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500 transition-all"
              >
                {SCHOOL_DAYS.map((d) => (
                  <option key={d} value={d}>
                    {ARABIC_DAYS[d]} ({d})
                  </option>
                ))}
              </select>
            </div>
          )}

          {/* If Classwork: Period */}
          {type === 'classwork' && (
            <div>
              <label className="block text-xs font-black text-slate-700 mb-1">رقم الحصة (Period)</label>
              <select
                value={period}
                onChange={(e) => setPeriod(Number(e.target.value))}
                className="w-full px-3 py-2 text-xs font-bold rounded-xl border border-slate-300 bg-slate-50 focus:bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500 transition-all"
              >
                {[1, 2, 3, 4, 5, 6].map((p) => (
                  <option key={p} value={p}>
                    الحصة {p}
                  </option>
                ))}
              </select>
            </div>
          )}

          {/* Main Title / Task / Note */}
          {type === 'classwork' && (
            <div>
              <label className="block text-xs font-black text-slate-700 mb-1">
                عنوان الدرس / المحتوى الفصلي <span className="text-rose-500">*</span>
              </label>
              <textarea
                rows={3}
                required
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="مثال: التعرف على حرف الباء، أنشطة الاستماع والمحادثة..."
                className="w-full px-3 py-2 text-xs font-bold rounded-xl border border-slate-300 focus:outline-none focus:ring-2 focus:ring-indigo-500 leading-relaxed"
              />
            </div>
          )}

          {type === 'homework' && (
            <div>
              <label className="block text-xs font-black text-slate-700 mb-1">
                الواجب المنزلي (نص الواجب أو رابط الفيديو) <span className="text-rose-500">*</span>
              </label>
              <textarea
                rows={3}
                required
                value={taskText}
                onChange={(e) => setTaskText(e.target.value)}
                placeholder="مثال: حل صفحة 5 في كراسة الأنشطة أو رابط فيديو يوتيوب..."
                className="w-full px-3 py-2 text-xs font-bold rounded-xl border border-slate-300 focus:outline-none focus:ring-2 focus:ring-indigo-500 leading-relaxed"
              />
            </div>
          )}

          {type === 'tomorrow_note' && (
            <>
              <div>
                <label className="block text-xs font-black text-slate-700 mb-1">
                  نص الملاحظة أو التنبيه <span className="text-rose-500">*</span>
                </label>
                <textarea
                  rows={3}
                  required
                  value={noteText}
                  onChange={(e) => setNoteText(e.target.value)}
                  placeholder="مثال: إحضار كراسة الرسم والألوان للنشاط الصفي..."
                  className="w-full px-3 py-2 text-xs font-bold rounded-xl border border-slate-300 focus:outline-none focus:ring-2 focus:ring-indigo-500 leading-relaxed"
                />
              </div>

              <div>
                <label className="block text-xs font-black text-slate-700 mb-1">الأدوات المطلوبة للحقيبة (اختياري)</label>
                <input
                  type="text"
                  value={bagItem}
                  onChange={(e) => setBagItem(e.target.value)}
                  placeholder="مثال: كراسة الرسم + علبة ألوان خشبية"
                  className="w-full px-3 py-2 text-xs font-bold rounded-xl border border-slate-300 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                />
              </div>
            </>
          )}

          {/* Pages (For Classwork and Homework) */}
          {(type === 'classwork' || type === 'homework') && (
            <div>
              <label className="block text-xs font-black text-slate-700 mb-1">
                الصفحات أو ورق العمل (Pages / Sheet) (اختياري)
              </label>
              <input
                type="text"
                value={pages}
                onChange={(e) => setPages(e.target.value)}
                placeholder="مثال: ص 3 \ 4 \ 5 أو Choose the tallest/shortest sheet"
                className="w-full px-3 py-2 text-xs font-bold rounded-xl border border-slate-300 focus:outline-none focus:ring-2 focus:ring-indigo-500"
              />
            </div>
          )}

          {/* Video Links (For Classwork and Homework) */}
          {(type === 'classwork' || type === 'homework') && (
            <div>
              <label className="block text-xs font-black text-slate-700 mb-1">
                روابط الفيديوهات أو الأنشطة (رابط بكل سطر) (اختياري)
              </label>
              <textarea
                rows={2}
                value={linksText}
                onChange={(e) => setLinksText(e.target.value)}
                placeholder="https://youtu.be/...\nhttps://..."
                className="w-full px-3 py-2 text-xs font-mono rounded-xl border border-slate-300 focus:outline-none focus:ring-2 focus:ring-indigo-500 text-left"
                dir="ltr"
              />
            </div>
          )}

          {/* Actions */}
          <div className="pt-3 border-t border-slate-100 flex items-center justify-end gap-2">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-xs font-bold text-slate-600 bg-slate-100 hover:bg-slate-200 rounded-xl transition-colors cursor-pointer"
            >
              إلغاء
            </button>
            <button
              type="submit"
              className="px-5 py-2 text-xs font-black text-white bg-indigo-600 hover:bg-indigo-700 rounded-xl shadow-xs transition-colors flex items-center gap-1.5 cursor-pointer"
            >
              <Check className="w-4 h-4" />
              <span>{isEditing ? 'حفظ التعديلات' : 'إضافة الآن'}</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
