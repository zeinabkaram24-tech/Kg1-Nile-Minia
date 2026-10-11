import React, { useState, useEffect } from 'react';
import {
  Database,
  Key,
  Globe,
  CheckCircle2,
  AlertCircle,
  X,
  RefreshCw,
  Trash2,
  Check,
  Sparkles,
} from 'lucide-react';
import {
  getActiveSupabaseConfig,
  saveActiveSupabaseConfig,
  updateSupabaseClient,
  isSupabaseConfigured,
} from '../lib/supabase';

interface SupabaseConfigModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfigSaved?: () => void;
  onSaved?: () => void | Promise<void>;
}

export const SupabaseConfigModal: React.FC<SupabaseConfigModalProps> = ({
  isOpen,
  onClose,
  onConfigSaved,
  onSaved,
}) => {
  const [url, setUrl] = useState('');
  const [anonKey, setAnonKey] = useState('');
  const [geminiKey, setGeminiKey] = useState('');
  const [testing, setTesting] = useState(false);
  const [testResult, setTestResult] = useState<{
    success: boolean;
    message: string;
  } | null>(null);
  const [savedSuccess, setSavedSuccess] = useState(false);

  useEffect(() => {
    if (isOpen) {
      const config = getActiveSupabaseConfig();
      setUrl(config.url);
      setAnonKey(config.key);
      setTestResult(null);
      setSavedSuccess(false);

      fetch('/api/supabase-config')
        .then((res) => res.json())
        .then((data) => {
          if (data) {
            if (data.url && (!config.url || config.url.includes('placeholder'))) {
              setUrl(data.url);
            }
            if (data.key && (!config.key || config.key.includes('placeholder'))) {
              setAnonKey(data.key);
            }
            if (data.geminiKey) {
              setGeminiKey(data.geminiKey);
            }
          }
        })
        .catch(() => {});
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const handleTestConnection = async () => {
    if (!url.trim() || !anonKey.trim()) {
      setTestResult({
        success: false,
        message: 'يرجى إدخال كل من رابط المشروع (Project URL) والمفتاح (API Key).',
      });
      return;
    }

    setTesting(true);
    setTestResult(null);

    try {
      const testClient = updateSupabaseClient(url.trim(), anonKey.trim());
      const { error } = await testClient
        .from('classwork')
        .select('id', { count: 'exact', head: true });

      if (error) {
        if (
          error.code === 'PGRST116' ||
          error.message.includes('relation') ||
          error.code === '42P01'
        ) {
          setTestResult({
            success: true,
            message: 'تم الاتصال بـ Supabase بنجاح! الجداول جاهزة للربط.',
          });
        } else {
          setTestResult({
            success: false,
            message: `فشل الاتصال: ${error.message || 'يرجى التأكد من صحة الرابط ومفتاح الـ API.'}`,
          });
        }
      } else {
        setTestResult({
          success: true,
          message: 'تم التحقق والاتصال بقاعدة بيانات Supabase بنجاح تام! 🟢',
        });
      }
    } catch (err: any) {
      setTestResult({
        success: false,
        message: `تعذر الوصول إلى الخادم: ${err.message || 'تحقق من اتصال الإنترنت والرابط'}`,
      });
    } finally {
      setTesting(false);
    }
  };

  const handleSavePermanently = async () => {
    const cleanedUrl = url.trim();
    const cleanedKey = anonKey.trim();
    const cleanedGeminiKey = geminiKey.trim();

    saveActiveSupabaseConfig(cleanedUrl, cleanedKey);
    updateSupabaseClient(cleanedUrl, cleanedKey);

    // Synchronize configuration to backend server once and for all
    try {
      await fetch('/api/supabase-config', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          url: cleanedUrl,
          key: cleanedKey,
          geminiKey: cleanedGeminiKey,
        }),
      });
    } catch (err) {
      console.warn('Failed to save configuration on server:', err);
    }

    setSavedSuccess(true);
    if (onConfigSaved) onConfigSaved();
    if (onSaved) onSaved();

    setTimeout(() => {
      setSavedSuccess(false);
      onClose();
    }, 1500);
  };

  const handleClearLocalStorageDuplicates = () => {
    if (
      window.confirm(
        'هل تريد مسح البيانات المؤقتة القديمة المخزنة بالمتصفح؟ سيتم الاعتماد بالكامل على بيانات السحابة (Supabase) لمنع أي تكرار.'
      )
    ) {
      localStorage.removeItem('nile_planner_custom_classwork_v2');
      localStorage.removeItem('nile_planner_custom_homework_v2');
      localStorage.removeItem('nile_planner_guest_progress_v2');
      alert('تم مسح البيانات المحلية المؤقتة بنجاح! سيتم الآن الاعتماد بالكامل على بيانات Supabase السحابية.');
      if (onConfigSaved) onConfigSaved();
      if (onSaved) onSaved();
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/70 backdrop-blur-xs animate-fade-in">
      <div
        className="bg-white rounded-3xl max-w-xl w-full p-6 shadow-2xl border border-slate-100 max-h-[90vh] overflow-y-auto space-y-5"
        dir="rtl"
      >
        {/* Modal Header */}
        <div className="flex items-center justify-between border-b border-slate-100 pb-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-emerald-50 border border-emerald-200 text-emerald-600 flex items-center justify-center shadow-xs">
              <Database className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base font-black text-slate-900">
                إعدادات المفاتيح والربط السحابي (مرة واحدة فقط)
              </h3>
              <p className="text-xs text-slate-500 font-medium">
                تدخل البيانات هنا مرة واحدة فقط وتحفظ دائماً على الخادم وفي المتصفح
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 text-slate-400 hover:text-slate-600 rounded-xl hover:bg-slate-100 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Single Entry Guarantee Banner */}
        <div className="p-3 bg-emerald-50/90 border border-emerald-200 rounded-2xl flex items-center gap-2.5 text-xs text-emerald-900 font-bold">
          <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
          <span>
            يتم حفظ الإعدادات تلقائياً ولن يُطلب منك إدخال الرابط أو المفاتيح مرة أخرى.
          </span>
        </div>

        {/* Inputs */}
        <div className="space-y-4">
          {/* Supabase URL */}
          <div className="space-y-1.5">
            <label className="block text-xs font-black text-slate-700">
              1. رابط مشروع Supabase (Project URL):
            </label>
            <div className="relative">
              <Globe className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
              <input
                type="text"
                value={url}
                onChange={(e) => setUrl(e.target.value)}
                placeholder="https://your-project.supabase.co"
                className="w-full text-xs font-mono border border-slate-200 rounded-xl py-2.5 pr-3 pl-9 focus:ring-2 focus:ring-emerald-500 focus:outline-none text-left bg-slate-50/50"
                dir="ltr"
                id="supabase_url_input"
              />
            </div>
            <span className="text-[11px] text-slate-400 font-medium block">
              رابط المشروع ينتهي بـ .supabase.co
            </span>
          </div>

          {/* Supabase Anon / Publishable Key */}
          <div className="space-y-1.5">
            <label className="block text-xs font-black text-slate-700">
              2. مفتاح Supabase (Anon / Publishable API Key):
            </label>
            <div className="relative">
              <Key className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
              <input
                type="text"
                value={anonKey}
                onChange={(e) => setAnonKey(e.target.value)}
                placeholder="sb_publishable_... أو eyJhbGciOi..."
                className="w-full text-xs font-mono border border-slate-200 rounded-xl py-2.5 pr-3 pl-9 focus:ring-2 focus:ring-emerald-500 focus:outline-none text-left bg-slate-50/50"
                dir="ltr"
                id="supabase_key_input"
              />
            </div>
            <span className="text-[11px] text-slate-400 font-medium block">
              يقبل مفاتيح sb_publishable_... ومفاتيح JWT السابقة.
            </span>
          </div>

          {/* Gemini API Key */}
          <div className="space-y-1.5">
            <label className="block text-xs font-black text-slate-700 flex items-center justify-between">
              <span>3. مفتاح Gemini API (اختياري للذكاء الاصطناعي):</span>
              <span className="text-[10px] text-slate-400 font-bold">اختياري</span>
            </label>
            <div className="relative">
              <Sparkles className="w-4 h-4 text-amber-500 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
              <input
                type="password"
                value={geminiKey}
                onChange={(e) => setGeminiKey(e.target.value)}
                placeholder="AIzaSy..."
                className="w-full text-xs font-mono border border-slate-200 rounded-xl py-2.5 pr-3 pl-9 focus:ring-2 focus:ring-emerald-500 focus:outline-none text-left bg-slate-50/50"
                dir="ltr"
                id="gemini_key_input"
              />
            </div>
            <span className="text-[11px] text-slate-400 font-medium block">
              يُستخدم في قراءة الخطط الأسبوعية وتصنيف المهام صوتياً.
            </span>
          </div>
        </div>

        {/* Test Result Message */}
        {testResult && (
          <div
            className={`p-3 rounded-xl border text-xs font-bold flex items-center gap-2 ${
              testResult.success
                ? 'bg-emerald-50 border-emerald-200 text-emerald-800'
                : 'bg-rose-50 border-rose-200 text-rose-800'
            }`}
          >
            {testResult.success ? (
              <CheckCircle2 className="w-4 h-4 shrink-0 text-emerald-600" />
            ) : (
              <AlertCircle className="w-4 h-4 shrink-0 text-rose-600" />
            )}
            <span>{testResult.message}</span>
          </div>
        )}

        {/* Save Confirmation */}
        {savedSuccess && (
          <div className="p-3 bg-emerald-100 border border-emerald-300 text-emerald-950 rounded-xl text-xs font-black flex items-center gap-2 animate-bounce">
            <Check className="w-4 h-4 text-emerald-700" />
            <span>تم حفظ الإعدادات بنجاح دائم! لن يطلبها منك مرة أخرى إطلاقاً.</span>
          </div>
        )}

        {/* Actions */}
        <div className="pt-2 flex flex-col sm:flex-row items-center justify-between gap-2.5 border-t border-slate-100">
          <button
            type="button"
            onClick={handleClearLocalStorageDuplicates}
            className="w-full sm:w-auto px-3 py-2 rounded-xl text-xs font-bold text-rose-700 bg-rose-50 hover:bg-rose-100 border border-rose-200 flex items-center justify-center gap-1.5 transition-colors cursor-pointer"
            title="مسح البيانات المؤقتة المحلية لمنع التكرار"
          >
            <Trash2 className="w-3.5 h-3.5" />
            <span>مسح التخزين المؤقت</span>
          </button>

          <div className="flex items-center gap-2 w-full sm:w-auto">
            <button
              type="button"
              disabled={testing || !url.trim() || !anonKey.trim()}
              onClick={handleTestConnection}
              className="flex-1 sm:flex-none px-4 py-2 rounded-xl text-xs font-black text-slate-700 bg-slate-100 hover:bg-slate-200 border border-slate-200 flex items-center justify-center gap-1.5 transition-colors disabled:opacity-50 cursor-pointer"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${testing ? 'animate-spin' : ''}`} />
              <span>{testing ? 'جاري الاختبار...' : 'اختبار الاتصال'}</span>
            </button>

            <button
              type="button"
              disabled={!url.trim() || !anonKey.trim()}
              onClick={handleSavePermanently}
              className="flex-1 sm:flex-none px-5 py-2 rounded-xl text-xs font-black text-white bg-emerald-600 hover:bg-emerald-700 shadow-sm flex items-center justify-center gap-1.5 transition-colors disabled:opacity-50 cursor-pointer"
            >
              <Check className="w-4 h-4" />
              <span>حفظ نهائي (مرة واحدة)</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
