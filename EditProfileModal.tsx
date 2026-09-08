import React, { useState } from 'react';
import { StudentProfile } from '../types';
import { X, User } from 'lucide-react';

interface EditProfileModalProps {
  isOpen: boolean;
  onClose: () => void;
  student: StudentProfile;
  onSave: (updated: StudentProfile) => void;
}

export const EditProfileModal: React.FC<EditProfileModalProps> = ({
  isOpen,
  onClose,
  student,
  onSave,
}) => {
  const [name, setName] = useState(student.name);
  const [grade, setGrade] = useState(student.grade);
  const [schoolName, setSchoolName] = useState(student.schoolName);
  const [branch, setBranch] = useState(student.branch);

  if (!isOpen) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSave({
      ...student,
      name: name.trim() || 'فصل G2B',
      grade: grade.trim() || 'Grade 2 - B',
      schoolName: schoolName.trim() || 'Nile Egyptian International Schools',
      branch: branch.trim() || 'Minia Branch',
    });
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 bg-slate-900/50 backdrop-blur-xs flex items-center justify-center p-4">
      <div className="bg-white rounded-3xl p-6 sm:p-7 w-full max-w-md shadow-2xl border border-slate-100">
        <div className="flex items-center justify-between pb-4 border-b border-slate-100">
          <div className="flex items-center gap-2">
            <div className="w-9 h-9 rounded-xl bg-indigo-100 text-indigo-700 flex items-center justify-center">
              <User className="w-5 h-5" />
            </div>
            <h3 className="text-lg font-black text-slate-900">
              بيانات الفصل والطالب
            </h3>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1.5 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-100"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="mt-4 space-y-4">
          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1">
              اسم الطالب / الفصل:
            </label>
            <input
              type="text"
              required
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="مثال: زياد / طالب G2B"
              className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 focus:outline-hidden focus:ring-2 focus:ring-indigo-500 text-sm font-bold text-slate-900"
            />
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1">
              الفصل الدراسي (Grade):
            </label>
            <input
              type="text"
              required
              value={grade}
              onChange={(e) => setGrade(e.target.value)}
              placeholder="Grade 2 - B"
              className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 focus:outline-hidden focus:ring-2 focus:ring-indigo-500 text-sm font-bold text-slate-900 font-sans"
            />
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1">
              المدرسة:
            </label>
            <input
              type="text"
              value={schoolName}
              onChange={(e) => setSchoolName(e.target.value)}
              placeholder="Nile Egyptian International Schools"
              className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 focus:outline-hidden focus:ring-2 focus:ring-indigo-500 text-sm font-medium text-slate-900"
            />
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1">
              الفرع:
            </label>
            <input
              type="text"
              value={branch}
              onChange={(e) => setBranch(e.target.value)}
              placeholder="Minia Branch (فرع المنيا)"
              className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 focus:outline-hidden focus:ring-2 focus:ring-indigo-500 text-sm font-medium text-slate-900"
            />
          </div>

          <div className="pt-4 border-t border-slate-100 flex items-center justify-end gap-2.5">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 rounded-full text-xs font-semibold text-slate-600 hover:bg-slate-100"
            >
              إلغاء
            </button>
            <button
              type="submit"
              className="px-6 py-2 rounded-full text-xs font-bold bg-indigo-600 hover:bg-indigo-700 text-white shadow-sm transition-all"
            >
              حفظ
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
