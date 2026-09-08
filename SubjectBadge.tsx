import React from 'react';
import { Subject, TaskType } from '../types';
import { SubjectIcon } from './SubjectIcon';
import { BookOpen, FileCheck, Pencil, Award, PackageCheck, ListTodo, GraduationCap } from 'lucide-react';

interface SubjectBadgeProps {
  subject?: Subject;
  size?: 'sm' | 'md' | 'lg';
}

export const SubjectBadge: React.FC<SubjectBadgeProps> = ({ subject, size = 'md' }) => {
  if (!subject) return null;

  const sizeClasses = {
    sm: 'text-xs px-2 py-0.5 gap-1.5',
    md: 'text-xs md:text-sm px-2.5 py-1 gap-2 font-semibold',
    lg: 'text-sm md:text-base px-3 py-1.5 gap-2.5 font-bold',
  };

  return (
    <span
      className={`inline-flex items-center rounded-full border shadow-2xs transition-colors ${subject.color.lightBg} ${subject.color.text} ${subject.color.border} ${sizeClasses[size]}`}
    >
      <span className={`w-2 h-2 rounded-full ${subject.color.bg}`} />
      <SubjectIcon name={subject.iconName} className="w-3.5 h-3.5" />
      <span>{subject.nameEn || subject.nameAr}</span>
    </span>
  );
};

export const TaskTypeBadge: React.FC<{ type: TaskType }> = ({ type }) => {
  switch (type) {
    case 'classwork':
      return (
        <span className="inline-flex items-center gap-1 text-[11px] px-2 py-0.5 rounded-md bg-blue-50 text-blue-700 border border-blue-200 font-semibold font-sans">
          <GraduationCap className="w-3 h-3 text-blue-600" />
          <span>Classwork</span>
        </span>
      );
    case 'homework':
      return (
        <span className="inline-flex items-center gap-1 text-[11px] px-2 py-0.5 rounded-md bg-amber-50 text-amber-800 border border-amber-200 font-semibold font-sans">
          <FileCheck className="w-3 h-3 text-amber-600" />
          <span>Homework</span>
        </span>
      );
    case 'dictation':
      return (
        <span className="inline-flex items-center gap-1 text-[11px] px-2 py-0.5 rounded-md bg-purple-50 text-purple-800 border border-purple-200 font-semibold font-sans">
          <Pencil className="w-3 h-3 text-purple-600" />
          <span>Dictation / Spelling</span>
        </span>
      );
    case 'study':
      return (
        <span className="inline-flex items-center gap-1 text-[11px] px-2 py-0.5 rounded-md bg-sky-50 text-sky-800 border border-sky-200 font-semibold font-sans">
          <BookOpen className="w-3 h-3 text-sky-600" />
          <span>Study / Revision</span>
        </span>
      );
    case 'quiz':
      return (
        <span className="inline-flex items-center gap-1 text-[11px] px-2 py-0.5 rounded-md bg-rose-50 text-rose-800 border border-rose-200 font-semibold font-sans">
          <Award className="w-3 h-3 text-rose-600" />
          <span>Quiz / Test</span>
        </span>
      );
    case 'supplies':
      return (
        <span className="inline-flex items-center gap-1 text-[11px] px-2 py-0.5 rounded-md bg-emerald-50 text-emerald-800 border border-emerald-200 font-semibold font-sans">
          <PackageCheck className="w-3 h-3 text-emerald-600" />
          <span>Supplies / Tools</span>
        </span>
      );
    default:
      return (
        <span className="inline-flex items-center gap-1 text-[11px] px-2 py-0.5 rounded-md bg-slate-50 text-slate-700 border border-slate-200 font-semibold font-sans">
          <ListTodo className="w-3 h-3 text-slate-500" />
          <span>Task</span>
        </span>
      );
  }
};
