import React, { useState } from 'react';
import { PlanTask, Subject } from '../types';
import { SubjectIcon } from './SubjectIcon';
import { TaskTypeBadge } from './SubjectBadge';
import { playChimeSound, triggerTaskDoneConfetti } from '../utils/celebration';
import { extractFirstUrl, getLinkActionLabel, getFriendlyDomain, isVideoUrl } from '../utils/urlHelper';
import { Edit3, Trash2, BookOpen, Clock, Check, Circle, StickyNote, CheckCircle2, X, ExternalLink, PlayCircle, Headphones } from 'lucide-react';

interface TaskCardProps {
  task: PlanTask;
  subject?: Subject;
  onToggleDone: (taskId: string) => void;
  onEdit: (task: PlanTask) => void;
  onDelete: (taskId: string) => void;
  onSavePersonalNote?: (taskId: string, note: string) => void;
  compact?: boolean;
  isVisitor?: boolean;
}

export const TaskCard: React.FC<TaskCardProps> = ({
  task,
  subject,
  onToggleDone,
  onEdit,
  onDelete,
  onSavePersonalNote,
  compact = false,
  isVisitor = false,
}) => {
  const [isEditingNote, setIsEditingNote] = useState(false);
  const [noteText, setNoteText] = useState(task.personalNotes || '');

  // Detect any direct or embedded URL
  const activeLinkUrl = task.linkUrl || extractFirstUrl(task.details) || extractFirstUrl(task.notes) || extractFirstUrl(task.title);
  const linkLabel = activeLinkUrl ? getLinkActionLabel(activeLinkUrl, task.linkTitle) : '';
  const domain = activeLinkUrl ? getFriendlyDomain(activeLinkUrl) : '';
  const isVideo = activeLinkUrl ? isVideoUrl(activeLinkUrl) : false;
  const isListeningWatchingTask =
    task.title.includes('استماع / مشاهدة الرابط التالي') ||
    task.title.startsWith('استماع / مشاهدة');

  const handleToggle = (e: React.MouseEvent) => {
    e.stopPropagation();
    const nextState = !task.isDone;
    if (nextState) {
      triggerTaskDoneConfetti();
      playChimeSound(true);
    } else {
      playChimeSound(false);
    }
    onToggleDone(task.id);
  };

  const handleSaveNote = (e: React.FormEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (onSavePersonalNote) {
      onSavePersonalNote(task.id, noteText);
    }
    setIsEditingNote(false);
  };

  const iconBg = subject?.color.lightBg || 'bg-indigo-50';
  const iconColor = subject?.color.text || 'text-indigo-600';
  const borderColor = subject?.color.border || 'border-slate-100';

  return (
    <div
      id={`task-card-${task.id}`}
      className={`relative rounded-2xl border transition-all duration-200 flex flex-col sm:flex-row sm:items-center justify-between gap-4 group shadow-xs ${
        compact ? 'p-3.5 sm:p-4' : 'p-4 sm:p-5'
      } ${
        task.isDone
          ? 'bg-emerald-50/30 border-emerald-300 hover:border-emerald-400'
          : 'bg-white border-slate-200 hover:border-indigo-300'
      }`}
    >
      {/* Subject Icon & Task Details */}
      <div className="flex items-start sm:items-center gap-3.5 sm:gap-4 flex-1 min-w-0">
        <div
          className={`w-11 h-11 sm:w-13 sm:h-13 rounded-2xl flex items-center justify-center shrink-0 border ${iconBg} ${iconColor} ${borderColor} shadow-2xs group-hover:scale-105 transition-transform`}
        >
          <SubjectIcon name={subject?.iconName || 'BookOpen'} className="w-5 h-5 sm:w-6 sm:h-6 stroke-[2]" />
        </div>

        <div className="flex-1 min-w-0">
          <div className="flex flex-wrap items-center gap-1.5 sm:gap-2 mb-1">
            {subject && (
              <span className="text-[12px] font-bold text-slate-800 font-sans">
                {subject.nameEn || subject.nameAr}
              </span>
            )}
            {task.period !== undefined && (
              <span className="inline-flex items-center gap-1 text-[11px] font-bold px-2 py-0.5 rounded-md bg-indigo-50 text-indigo-800 border border-indigo-200 font-sans">
                <span>الحصة {task.period}</span>
                <span className="text-indigo-500 text-[10px] font-mono">P{task.period}</span>
              </span>
            )}
            <TaskTypeBadge type={task.type} />
            {isListeningWatchingTask && (
              <span className="inline-flex items-center gap-1 text-[11px] font-bold px-2 py-0.5 rounded-md bg-rose-50 text-rose-700 border border-rose-200/80">
                <Headphones className="w-3 h-3 text-rose-500" />
                <span>استماع ومتابعة</span>
              </span>
            )}
            {task.pages && (
              <span className="inline-flex items-center gap-1 text-[11px] text-slate-600 bg-slate-100 px-2 py-0.5 rounded-md font-mono font-medium">
                <BookOpen className="w-3 h-3 text-slate-400" />
                <span>{task.pages}</span>
              </span>
            )}
          </div>

          <h3
            className={`font-bold text-sm sm:text-base leading-snug transition-colors ${
              task.isDone
                ? 'text-slate-500 line-through decoration-emerald-500/70'
                : 'text-slate-900'
            }`}
          >
            {task.title}
          </h3>

          {task.details && (
            <p
              className={`text-xs sm:text-sm mt-1 leading-relaxed ${
                task.isDone ? 'line-through text-slate-400' : 'text-slate-600'
              }`}
            >
              {task.details}
            </p>
          )}

          {/* Prominent Clickable Link / Video / Platform Button */}
          {activeLinkUrl && (
            <div className="mt-2.5">
              <a
                href={activeLinkUrl.startsWith('http') ? activeLinkUrl : `https://${activeLinkUrl}`}
                target="_blank"
                rel="noopener noreferrer"
                onClick={(e) => e.stopPropagation()}
                className={`inline-flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs font-bold transition-all duration-150 group/link active:scale-98 cursor-pointer shadow-2xs hover:shadow-xs ${
                  isListeningWatchingTask
                    ? 'bg-rose-600 hover:bg-rose-700 text-white shadow-rose-200'
                    : 'bg-indigo-50 hover:bg-indigo-100 text-indigo-700 border border-indigo-200/90'
                }`}
                title={`فتح الرابط في تبويب جديد (${activeLinkUrl})`}
              >
                {isVideo ? (
                  <PlayCircle className={`w-4 h-4 shrink-0 group-hover/link:scale-110 transition-transform ${
                    isListeningWatchingTask ? 'text-white fill-white/20' : 'text-rose-600 fill-rose-100'
                  }`} />
                ) : isListeningWatchingTask ? (
                  <Headphones className="w-3.5 h-3.5 text-white shrink-0 group-hover/link:scale-110 transition-transform" />
                ) : (
                  <ExternalLink className="w-3.5 h-3.5 text-indigo-600 shrink-0 group-hover/link:translate-x-0.5 transition-transform" />
                )}
                <span>{isListeningWatchingTask ? 'فتح واستماع / مشاهدة الرابط في تبويب جديد ↗' : linkLabel}</span>
                {domain && (
                  <span className={`text-[10px] font-mono font-medium dir-ltr px-1.5 py-0.5 rounded ${
                    isListeningWatchingTask ? 'bg-rose-800/80 text-rose-100' : 'bg-white text-indigo-600/80 border border-indigo-200/60'
                  }`}>
                    {domain}
                  </span>
                )}
              </a>
            </div>
          )}

          {task.isDone && task.completedAt && (
            <div className="mt-1 flex items-center gap-1 text-[11px] text-emerald-600 font-mono font-medium">
              <Clock className="w-3 h-3" />
              <span>
                Done at {new Date(task.completedAt).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' })}
              </span>
            </div>
          )}

          {/* User Role: Personal Note Display & Inline Editor */}
          {task.personalNotes && !isEditingNote && (
            <div className="mt-2 flex items-start gap-1.5 p-2 rounded-xl bg-amber-50/80 border border-amber-200/70 text-xs text-amber-900">
              <StickyNote className="w-3.5 h-3.5 text-amber-600 shrink-0 mt-0.5" />
              <div className="flex-1">
                <span className="font-bold ml-1 text-amber-800">ملاحظتي الشخصية (جهازي فقط):</span>
                <span>{task.personalNotes}</span>
              </div>
              <button
                type="button"
                onClick={() => setIsEditingNote(true)}
                className="text-[11px] text-amber-700 hover:text-amber-900 underline font-medium"
              >
                تعديل
              </button>
            </div>
          )}

          {isEditingNote && (
            <form onSubmit={handleSaveNote} className="mt-2.5 flex items-center gap-2 p-2 rounded-xl bg-slate-50 border border-indigo-200">
              <StickyNote className="w-4 h-4 text-indigo-600 shrink-0" />
              <input
                type="text"
                value={noteText}
                onChange={(e) => setNoteText(e.target.value)}
                placeholder="اكتب ملاحظتك الخاصة (تُحفظ في جهازك فقط)..."
                className="flex-1 text-xs bg-white px-2.5 py-1.5 rounded-lg border border-slate-200 focus:outline-none focus:ring-1 focus:ring-indigo-500"
                autoFocus
              />
              <button
                type="submit"
                className="px-2.5 py-1 text-xs font-bold rounded-lg bg-indigo-600 text-white hover:bg-indigo-700 flex items-center gap-1 shrink-0"
              >
                <CheckCircle2 className="w-3.5 h-3.5" />
                <span>حفظ</span>
              </button>
              <button
                type="button"
                onClick={() => setIsEditingNote(false)}
                className="p-1 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-200 shrink-0"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            </form>
          )}
        </div>
      </div>

      {/* Action Controls & Done in English */}
      <div className="flex items-center justify-between sm:justify-end gap-2.5 sm:gap-3 shrink-0 pt-2 sm:pt-0 border-t sm:border-t-0 border-slate-100">
        {!isVisitor && (
          <div className="flex items-center gap-1">
            {!task.personalNotes && (
              <button
                type="button"
                id={`note-task-${task.id}`}
                onClick={(e) => {
                  e.stopPropagation();
                  setIsEditingNote(true);
                }}
                className="p-1.5 rounded-lg text-slate-400 hover:text-amber-600 hover:bg-amber-50 transition-colors"
                title="إضافة ملاحظة شخصية (في جهازي فقط)"
              >
                <StickyNote className="w-4 h-4" />
              </button>
            )}
            <button
              type="button"
              id={`edit-task-${task.id}`}
              onClick={(e) => {
                e.stopPropagation();
                onEdit(task);
              }}
              className="p-1.5 rounded-lg text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 transition-colors"
              title="تعديل المهمة"
            >
              <Edit3 className="w-4 h-4" />
            </button>
            <button
              type="button"
              id={`delete-task-${task.id}`}
              onClick={(e) => {
                e.stopPropagation();
                onDelete(task.id);
              }}
              className="p-1.5 rounded-lg text-slate-400 hover:text-rose-600 hover:bg-rose-50 transition-colors"
              title="حذف المهمة"
            >
              <Trash2 className="w-4 h-4" />
            </button>
          </div>
        )}

        {/* English "Done" button per user requirement */}
        <button
          type="button"
          id={`toggle-task-${task.id}`}
          onClick={handleToggle}
          className={`px-3.5 py-1.5 rounded-full text-xs font-bold font-sans flex items-center gap-1.5 transition-all duration-150 active:scale-95 shadow-2xs ${
            task.isDone
              ? 'bg-emerald-600 hover:bg-emerald-700 text-white border border-emerald-600'
              : 'bg-white hover:bg-slate-50 text-slate-600 hover:text-emerald-700 border border-slate-300'
          }`}
          title={task.isDone ? 'Mark as Not Done' : 'Mark as Done'}
          aria-label={task.isDone ? 'Done' : 'Mark as Done'}
        >
          {task.isDone ? (
            <>
              <Check className="w-4 h-4 stroke-[2.5]" />
              <span>Done</span>
            </>
          ) : (
            <>
              <Circle className="w-3.5 h-3.5 text-slate-400" />
              <span>Mark Done</span>
            </>
          )}
        </button>
      </div>
    </div>
  );
};
