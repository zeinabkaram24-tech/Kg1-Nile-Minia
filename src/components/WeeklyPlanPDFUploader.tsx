import React, { useState } from 'react';
import { FileText, Loader2, Upload } from 'lucide-react';
import { extractWeeklyPlanFromFile, WeeklyPlanExtraction } from '../lib/geminiWeeklyPlan';

interface Props {
  onPlanParsed: (data: WeeklyPlanExtraction) => void;
}

export const WeeklyPlanPDFUploader: React.FC<Props> = ({ onPlanParsed }) => {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleFileChange = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;
    setLoading(true);
    setError(null);
    try {
      onPlanParsed(await extractWeeklyPlanFromFile(file));
      event.target.value = '';
    } catch (err) {
      console.error('PDF Parse Error:', err);
      setError('حدث خطأ أثناء تحليل ملف الـ PDF. تأكد من أن الملف سليم ويحتوي على نص قابل للقراءة.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="p-4 border-2 border-dashed border-indigo-300 rounded-2xl bg-indigo-50/50">
      <div className="flex items-center gap-2 text-indigo-900 mb-1">
        <FileText className="w-4 h-4" />
        <h3 className="text-sm font-black">رفع وتحليل Weekly Plan PDF</h3>
      </div>
      <p className="text-[11px] text-indigo-700 mb-3">يقرأ Gemini الملف كما هو ويصنف كل صف إلى Classwork وHomework وTomorrow/Notes تلقائياً.</p>
      <label className={`inline-flex items-center gap-2 px-3 py-2 rounded-xl text-xs font-bold text-white ${loading ? 'bg-indigo-300' : 'bg-indigo-600 hover:bg-indigo-700 cursor-pointer'} transition-colors`}>
        {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Upload className="w-4 h-4" />}
        <span>{loading ? 'جاري تحليل الملف...' : 'اختيار ملف PDF'}</span>
        <input type="file" accept="application/pdf" onChange={handleFileChange} disabled={loading} className="sr-only" />
      </label>
      {error && <div className="mt-3 text-xs font-semibold text-red-600">{error}</div>}
    </div>
  );
};
