import React, { useState } from 'react';
import {
  Sparkles,
  X,
  FileText,
  Check,
  AlertCircle,
  Loader2,
  BookOpen,
  CheckSquare,
  RefreshCw,
  Copy,
} from 'lucide-react';
import { ClassId, ClassworkEntry, HomeworkEntry, ParsedWeeklyPlanResponse } from '../types';
import { parseWeeklyPlanWithAI } from '../services/aiClassifier';
import { SUBJECT_METADATA } from '../data/timetables';

interface WeeklyPlanModalProps {
  isOpen: boolean;
  onClose: () => void;
  currentClass: ClassId;
  currentBlock?: number;
  currentWeek?: number;
  onApplyPlan: (classwork: ClassworkEntry[], homework: HomeworkEntry[]) => void;
}

const SAMPLE_WEEKLY_PLAN = `KG 1 Weekly Plan - Nile Egyptian International School

Sunday:
- French: Unité 1 Salutations. CW: Manuel p. 6-8. HW: None
- Mathematics: Place Value up to 100 with base-ten blocks. CW: Student Book p. 14-17. HW: Practice Book p. 11 exercises 1-8 (Due Monday)
- Arabic: درس أنا أستطيع. CW: كتاب التلميذ ص 12-15. HW: كتابة الفقرة الأولى في كشكول الواجب (Due Tuesday)
- Science: Habitats & Living Things. CW: Learner's Book p. 18-21. HW: Workbook p. 15
- English: Unit 1 Back to School (Phonics short a & e). CW: Pupil's Book p. 10-13. HW: Activity Book p. 8 (Due Monday)

Monday:
- PE: Agility ladder & ball bouncing. Bring sports shoes!
- English: Story Time The Kind Rabbit. CW: Pupil's Book p. 14-15. HW: Copybook sentences
- Mathematics: Comparing numbers with <, >, =. CW: Student Book p. 18-20. HW: Practice Book p. 12 (Due Tuesday)
- Arabic: أسماء الإشارة (هذا وهذه). CW: كتاب المدرسة ص 16. HW: حل التدريب 3

Tuesday:
- Social Studies: My Community and Neighborhood. CW: Book p. 8-11. HW: Draw 3 places in notebook (Due Wednesday)
- Mathematics: Skip counting by 2s and 5s. CW: Student Book p. 22-24. HW: Sheet 4
- Arts: Primary colors & watercolor painting. Bring sketch and watercolor set!
- Religion: سورة الفلق وحفظ الآيات الكريمة. HW: حفظ السورة للتسميع (Urgent Quiz)
- French: L'alphabet français A à H. CW: Cahier p. 11. HW: Cahier d'activités p. 7
- English: Sight words & sentence building. CW: Workbook p. 16. HW: Practice spelling list

Wednesday:
- English: Comprehension Animal Friends. CW: Pupil's Book p. 18. HW: Study 10 spelling words for Thursday Quiz (Urgent)
- Science: Plant parts & functions (roots, stems, leaves). CW: Learner's Book p. 24. HW: Workbook p. 19
- Mathematics: Even and odd numbers. CW: Student Book p. 28. HW: Practice Book p. 14
- Arabic: التاء المربوطة والمفتوحة. CW: ص 22. HW: إملاء كلمات التدريب

Thursday:
- English: Weekly Spelling Bee & Dictation Quiz!
- Mathematics: Weekly review & word problems.
- Arabic: نشيد وطني الجميل وحفظ 3 أبيات.
- Science: Germinating seeds experiment. Bring plastic cup & cotton.`;

export const WeeklyPlanModal: React.FC<WeeklyPlanModalProps> = ({
  isOpen,
  onClose,
  currentClass,
  onApplyPlan,
}) => {
  const [planText, setPlanText] = useState('');
  const [isProcessing, setIsProcessing] = useState(false);
  const [parsedResult, setParsedResult] = useState<ParsedWeeklyPlanResponse | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  if (!isOpen) return null;

  const handleClassify = async () => {
    if (!planText.trim()) {
      setErrorMsg('Please paste or type the weekly plan text first.');
      return;
    }
    setErrorMsg(null);
    setIsProcessing(true);

    try {
      const result = await parseWeeklyPlanWithAI(planText, currentClass);
      setParsedResult(result);
    } catch (err: any) {
      setErrorMsg('Classification encountered an issue, but local rules were applied.');
    } finally {
      setIsProcessing(false);
    }
  };

  const handleApply = () => {
    if (!parsedResult) return;

    // Convert parsed items to full entries with IDs
    const finalClasswork: ClassworkEntry[] = parsedResult.classwork.map((cw, idx) => ({
      id: `cw-imported-${Date.now()}-${idx}`,
      classId: currentClass,
      day: cw.day || 'Sunday',
      period: cw.period || (idx % 6) + 1,
      subject: cw.subject || 'English',
      title: cw.title || 'Lesson',
      details: cw.details,
      pages: cw.pages,
      completed: false,
    }));

    const finalHomework: HomeworkEntry[] = parsedResult.homework.map((hw, idx) => ({
      id: `hw-imported-${Date.now()}-${idx}`,
      classId: currentClass,
      assignedDay: hw.assignedDay || 'Sunday',
      dueDay: hw.dueDay || 'Monday',
      subject: hw.subject || 'English',
      task: hw.task || 'Homework task',
      details: hw.details,
      pages: hw.pages,
      completed: false,
      priority: hw.priority || 'normal',
    }));

    onApplyPlan(finalClasswork, finalHomework);
    onClose();
  };

  return (
    <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-xs flex items-center justify-center p-4 z-50 overflow-y-auto">
      <div className="bg-white rounded-2xl max-w-2xl w-full p-6 shadow-2xl border border-slate-200 my-8">
        {/* Modal Header */}
        <div className="flex items-center justify-between pb-4 border-b border-slate-200">
          <div className="flex items-center gap-2">
            <div className="w-10 h-10 rounded-xl bg-indigo-50 text-indigo-600 flex items-center justify-center">
              <Sparkles className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-lg font-bold text-slate-900">
                Weekly Plan Smart Classifier
              </h3>
              <p className="text-xs text-slate-500">
                Input your school weekly plan to auto-sort into Classwork, Homework & Tomorrow
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-1 text-slate-400 hover:text-slate-600 rounded-lg"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Modal Body */}
        <div className="py-4 space-y-4">
          <div>
            <div className="flex items-center justify-between mb-1.5">
              <label className="text-xs font-bold text-slate-700">
                Paste Weekly Plan (English, Arabic, or School Text):
              </label>
              <button
                type="button"
                onClick={() => setPlanText(SAMPLE_WEEKLY_PLAN)}
                className="text-xs text-indigo-600 hover:text-indigo-700 font-semibold inline-flex items-center gap-1"
              >
                <Copy className="w-3.5 h-3.5" />
                Fill Sample Grade 2 Plan
              </button>
            </div>

            <textarea
              rows={8}
              value={planText}
              onChange={(e) => setPlanText(e.target.value)}
              placeholder="Paste your weekly plan here... For example:
Sunday:
- Math: Classwork pages 14-17. Homework page 11 (Due Monday)
- English: Phonics short a and e. Homework activity book p. 8
- Arabic: درس أنا أستطيع، كتابة الفقرة الأولى في كشكول الواجب"
              className="w-full text-xs sm:text-sm p-3 font-mono bg-slate-50 rounded-xl border border-slate-300 focus:outline-hidden focus:ring-2 focus:ring-indigo-500"
            />
          </div>

          {errorMsg && (
            <div className="p-3 rounded-xl bg-amber-50 border border-amber-200 text-amber-800 text-xs flex items-center gap-2">
              <AlertCircle className="w-4 h-4 shrink-0 text-amber-600" />
              <span>{errorMsg}</span>
            </div>
          )}

          {/* Action button */}
          <div className="flex items-center justify-between">
            <button
              onClick={handleClassify}
              disabled={isProcessing}
              className="px-5 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 disabled:bg-indigo-400 text-white text-xs sm:text-sm font-bold shadow-xs inline-flex items-center gap-2 transition-all"
            >
              {isProcessing ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  <span>Classifying Plan...</span>
                </>
              ) : (
                <>
                  <Sparkles className="w-4 h-4" />
                  <span>Categorize & Extract Tasks</span>
                </>
              )}
            </button>

            {planText && (
              <button
                onClick={() => {
                  setPlanText('');
                  setParsedResult(null);
                }}
                className="text-xs text-slate-400 hover:text-slate-600"
              >
                Clear text
              </button>
            )}
          </div>

          {/* Parsed Result Preview */}
          {parsedResult && (
            <div className="mt-4 p-4 rounded-xl border border-indigo-100 bg-indigo-50/50 space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-indigo-900 uppercase tracking-wider">
                  Classification Preview
                </span>
                <span className="text-xs font-semibold text-indigo-700 bg-white px-2 py-0.5 rounded-full border border-indigo-200">
                  Target: {currentClass}
                </span>
              </div>

              <div className="grid grid-cols-2 gap-3 text-xs">
                <div className="bg-white p-3 rounded-lg border border-indigo-100">
                  <div className="flex items-center gap-1.5 font-bold text-slate-800 mb-1">
                    <BookOpen className="w-4 h-4 text-indigo-600" />
                    <span>Classwork Lessons</span>
                  </div>
                  <div className="text-xl font-black text-indigo-700">
                    {parsedResult.classwork.length} items
                  </div>
                  <div className="text-[11px] text-slate-500 mt-1">
                    Organized across Sunday to Thursday periods.
                  </div>
                </div>

                <div className="bg-white p-3 rounded-lg border border-indigo-100">
                  <div className="flex items-center gap-1.5 font-bold text-slate-800 mb-1">
                    <CheckSquare className="w-4 h-4 text-emerald-600" />
                    <span>Homework Assignments</span>
                  </div>
                  <div className="text-xl font-black text-emerald-700">
                    {parsedResult.homework.length} items
                  </div>
                  <div className="text-[11px] text-slate-500 mt-1">
                    Linked to due days & priority flags.
                  </div>
                </div>
              </div>

              <div className="pt-2">
                <button
                  onClick={handleApply}
                  className="w-full py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-sm shadow-xs transition-colors flex items-center justify-center gap-2"
                >
                  <Check className="w-4 h-4" />
                  <span>Apply to {currentClass} Planner</span>
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
