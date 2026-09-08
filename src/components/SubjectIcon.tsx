import React from 'react';
import {
  BookOpen,
  Calculator,
  Compass,
  Feather,
  Globe,
  HeartHandshake,
  Laptop,
  Palette,
  Sparkles,
  Award,
  Music,
  CheckCircle2,
  Clock,
  FileText,
  Bookmark,
  Calendar,
  LucideIcon,
} from 'lucide-react';

interface SubjectIconProps {
  name: string;
  className?: string;
  size?: number;
}

const ICON_MAP: Record<string, LucideIcon> = {
  Calculator,
  BookOpen,
  Feather,
  Compass,
  HeartHandshake,
  Globe,
  Palette,
  Laptop,
  Sparkles,
  Award,
  Music,
  CheckCircle2,
  Clock,
  FileText,
  Bookmark,
  Calendar,
};

export const SubjectIcon: React.FC<SubjectIconProps> = ({ name, className = 'w-5 h-5', size = 20 }) => {
  const IconComponent = ICON_MAP[name] || BookOpen;
  return <IconComponent className={className} size={size} />;
};
