import React from 'react';
import {
  BookOpen,
  Feather,
  Calculator,
  FlaskConical,
  Compass,
  Languages,
  Laptop,
  Palette,
  Music2,
  Activity,
  Heart,
  Bookmark,
  FileText
} from 'lucide-react';
import { SUBJECTS } from '../data/initialData';
import { SubjectInfo } from '../types';

export const getSubjectInfo = (subjectId?: string): SubjectInfo => {
  const found = SUBJECTS.find((s) => s.id === subjectId);
  if (found) return found;
  return {
    id: subjectId || 'general',
    nameAr: subjectId || 'عام',
    nameEn: 'General',
    color: 'bg-slate-100 text-slate-700',
    textColor: 'text-slate-700',
    borderColor: 'border-slate-200',
    iconName: 'Bookmark'
  };
};

export const RenderSubjectIcon: React.FC<{ iconName: string; className?: string }> = ({
  iconName,
  className = 'w-4 h-4'
}) => {
  switch (iconName) {
    case 'BookOpen':
      return <BookOpen className={className} />;
    case 'Feather':
      return <Feather className={className} />;
    case 'Calculator':
      return <Calculator className={className} />;
    case 'FlaskConical':
      return <FlaskConical className={className} />;
    case 'Compass':
      return <Compass className={className} />;
    case 'Languages':
      return <Languages className={className} />;
    case 'Laptop':
      return <Laptop className={className} />;
    case 'Palette':
      return <Palette className={className} />;
    case 'Music2':
      return <Music2 className={className} />;
    case 'Activity':
      return <Activity className={className} />;
    case 'Heart':
      return <Heart className={className} />;
    case 'FileText':
      return <FileText className={className} />;
    default:
      return <Bookmark className={className} />;
  }
};

interface SubjectBadgeProps {
  subjectId: string;
  showIcon?: boolean;
  size?: 'sm' | 'md' | 'lg';
}

export const SubjectBadge: React.FC<SubjectBadgeProps> = ({
  subjectId,
  showIcon = true,
  size = 'md'
}) => {
  const sub = getSubjectInfo(subjectId);

  const sizeClasses = {
    sm: 'text-xs px-2 py-0.5 gap-1',
    md: 'text-xs px-2.5 py-1 gap-1.5 font-medium',
    lg: 'text-sm px-3 py-1.5 gap-2 font-semibold'
  }[size];

  return (
    <span
      className={`inline-flex items-center rounded-lg border ${sub.borderColor} ${sub.color} ${sizeClasses}`}
    >
      {showIcon && <RenderSubjectIcon iconName={sub.iconName} className={size === 'sm' ? 'w-3 h-3' : 'w-3.5 h-3.5'} />}
      <span className="font-semibold">{sub.nameEn}</span>
    </span>
  );
};
