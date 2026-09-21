import React from 'react';
import {
  Calculator,
  BookOpen,
  Languages,
  FlaskConical,
  Globe,
  Sparkles,
  Laptop,
  Palette,
  Music,
  Dumbbell,
  Bookmark,
} from 'lucide-react';
import { SubjectName } from '../types';

interface SubjectIconProps {
  subject: SubjectName;
  className?: string;
  size?: number;
}

export const SubjectIcon: React.FC<SubjectIconProps> = ({
  subject,
  className = 'w-5 h-5',
  size = 20,
}) => {
  switch (subject) {
    case 'Mathematics':
      return <Calculator className={`text-sky-600 ${className}`} size={size} />;
    case 'English':
      return <BookOpen className={`text-indigo-600 ${className}`} size={size} />;
    case 'Arabic':
      return <Languages className={`text-emerald-600 ${className}`} size={size} />;
    case 'Science':
      return <FlaskConical className={`text-teal-600 ${className}`} size={size} />;
    case 'Social Studies':
      return <Globe className={`text-amber-600 ${className}`} size={size} />;
    case 'French':
      return <Bookmark className={`text-blue-600 ${className}`} size={size} />;
    case 'Religion':
      return <Sparkles className={`text-violet-600 ${className}`} size={size} />;
    case 'ICT':
      return <Laptop className={`text-cyan-600 ${className}`} size={size} />;
    case 'Arts':
    case 'Art':
    case 'art':
      return <Palette className={`text-rose-500 ${className}`} size={size} />;
    case 'Music':
      return <Music className={`text-fuchsia-600 ${className}`} size={size} />;
    case 'PE':
      return <Dumbbell className={`text-orange-500 ${className}`} size={size} />;
    default:
      return <BookOpen className={`text-slate-600 ${className}`} size={size} />;
  }
};
