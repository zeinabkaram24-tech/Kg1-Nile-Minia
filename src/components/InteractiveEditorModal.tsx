import React, { useState, useEffect, useRef } from 'react';
import { X, Upload, Link2, FileText, Sparkles, BookOpen, ExternalLink, Calendar, HelpCircle, Mic, MicOff, Loader2 } from 'lucide-react';
import { ClassId, SchoolDay, SubjectName, ClassworkEntry, HomeworkEntry, TomorrowSpecialNote } from '../types';
import { NEXT_SCHOOL_DAY } from '../data/timetables';

interface InteractiveEditorModalProps {
  isOpen: boolean;
  onClose: () => void;
  mode: 'add' | 'edit';
  itemType: 'classwork' | 'homework' | 'tomorrow';
  initialData?: any; // could be ClassworkEntry, HomeworkEntry, or TomorrowSpecialNote
  currentClass: ClassId;
  currentBlock: number;
  currentWeek: number;
  selectedDay: SchoolDay;
  onSave: (type: 'classwork' | 'homework' | 'tomorrow', data: any) => void;
}

const DAYS: SchoolDay[] = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Saturday'];
const CLASSES: (ClassId | 'ALL')[] = ['KG1A', 'KG1B', 'KG1C', 'KG1D', 'KG1E', 'ALL'];
const SUBJECTS: SubjectName[] = [
  'Arabic',
  'English',
];

export const InteractiveEditorModal: React.FC<InteractiveEditorModalProps> = ({
  isOpen,
  onClose,
  mode,
  itemType,
  initialData,
  currentClass,
  currentBlock,
  currentWeek,
  selectedDay,
  onSave,
}) => {
  // State variables for form
  const [classId, setClassId] = useState<ClassId | 'ALL'>('KG1A');
  const [subject, setSubject] = useState<SubjectName>('Arabic');
  const [block, setBlock] = useState<number>(1);
  const [week, setWeek] = useState<number>(2);
  
  // Specific fields
  const [title, setTitle] = useState('');
  const [details, setDetails] = useState('');
  const [pages, setPages] = useState('');
  const [day, setDay] = useState<SchoolDay>('Sunday');
  const [period, setPeriod] = useState<number>(1);
  
  // Homework fields
  const [assignedDay, setAssignedDay] = useState<SchoolDay>('Sunday');
  const [dueDay, setDueDay] = useState<SchoolDay>('Monday');
  const [priority, setPriority] = useState<'normal' | 'urgent'>('normal');

  // Tomorrow notes fields
  const [arabicNote, setArabicNote] = useState('');
  const [bagItem, setBagItem] = useState('');
  const [isQuiz, setIsQuiz] = useState(false);
  const [targetDay, setTargetDay] = useState<SchoolDay>('Sunday');

  // Attachment fields
  const [linkUrl, setLinkUrl] = useState('');
  const [linkTitle, setLinkTitle] = useState('');
  const [fileBase64, setFileBase64] = useState('');
  const [fileName, setFileName] = useState('');
  const [uploadProgress, setUploadProgress] = useState(false);

  // Voice Recognition & Audio Recording states
  const [isRecording, setIsRecording] = useState(false);
  const [recordingTarget, setRecordingTarget] = useState<string | null>(null);
  const [recordingSeconds, setRecordingSeconds] = useState(0);
  const [globalTranscript, setGlobalTranscript] = useState('');
  const [isParsingGlobal, setIsParsingGlobal] = useState(false);
  const [recognitionError, setRecognitionError] = useState<string | null>(null);
  const [manualVoiceCommand, setManualVoiceCommand] = useState('');
  const hasInitializedRef = useRef(false);

  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);
  const streamRef = useRef<MediaStream | null>(null);
  const timerRef = useRef<any>(null);
  const speechRecognitionRef = useRef<any>(null);

  // Helper to cleanup any active stream / timer
  const cleanupRecording = () => {
    if (timerRef.current) {
      clearInterval(timerRef.current);
      timerRef.current = null;
    }
    if (speechRecognitionRef.current) {
      try {
        speechRecognitionRef.current.stop();
      } catch {}
      speechRecognitionRef.current = null;
    }
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((track) => {
        try {
          track.stop();
        } catch {}
      });
      streamRef.current = null;
    }
    setIsRecording(false);
    setRecordingTarget(null);
    setRecordingSeconds(0);
  };

  // Cleanup on close or unmount
  useEffect(() => {
    if (!isOpen) {
      cleanupRecording();
    }
  }, [isOpen]);

  // Initialize form with initialData or defaults whenever modal opens or item changes
  useEffect(() => {
    if (isOpen) {
      if (mode === 'edit' && initialData) {
        setClassId(initialData.classId || currentClass);
        setSubject(initialData.subject || 'Arabic');
        setBlock(initialData.block || currentBlock);
        setWeek(initialData.week || currentWeek);
        setLinkUrl(initialData.linkUrl || '');
        setLinkTitle(initialData.linkTitle || '');
        setFileBase64(initialData.pdfUrl || '');
        setFileName(initialData.pdfUrl ? 'الملف المرفق الحالي 📄' : '');

        if (itemType === 'classwork') {
          setTitle(initialData.title || '');
          setDetails(initialData.details || '');
          setPages(initialData.pages || '');
          setDay(initialData.day || selectedDay);
          setPeriod(initialData.period || 1);
        } else if (itemType === 'homework') {
          setTitle(initialData.task || '');
          setDetails(initialData.details || '');
          setPages(initialData.pages || '');
          setAssignedDay(initialData.assignedDay || selectedDay);
          setDueDay(initialData.dueDay || 'Monday');
          setPriority(initialData.priority || 'normal');
        } else if (itemType === 'tomorrow') {
          setArabicNote(initialData.arabicNote || initialData.note || '');
          setBagItem(initialData.bagItem || '');
          setIsQuiz(initialData.isQuiz || initialData.categoryType === 'quiz' || false);
          setTargetDay(initialData.targetDay || selectedDay);
        }
      } else {
        // Defaults for Add Mode
        setClassId(initialData?.classId || currentClass);
        setSubject(initialData?.subject || 'Arabic');
        setBlock(initialData?.block || currentBlock);
        setWeek(initialData?.week || currentWeek);
        setTitle(initialData?.title || '');
        setDetails(initialData?.details || '');
        setPages(initialData?.pages || '');
        setDay(initialData?.day || (selectedDay === 'Saturday' ? 'Sunday' : selectedDay));
        setPeriod(initialData?.period || 1);
        setAssignedDay(initialData?.assignedDay || (selectedDay === 'Saturday' ? 'Sunday' : selectedDay));
        
        // set next day for due day
        const dayOrder: SchoolDay[] = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Saturday'];
        const currentIdx = dayOrder.indexOf(initialData?.day || selectedDay);
        const nextDayVal = dayOrder[(currentIdx + 1) % dayOrder.length];
        setDueDay(initialData?.dueDay || nextDayVal);
        setPriority(initialData?.priority || 'normal');

        setArabicNote(initialData?.arabicNote || initialData?.note || '');
        setBagItem(initialData?.bagItem || '');
        setIsQuiz(initialData?.isQuiz || false);
        setTargetDay(
          initialData?.targetDay ||
            (itemType === 'tomorrow'
              ? NEXT_SCHOOL_DAY[selectedDay] || 'Sunday'
              : selectedDay === 'Saturday'
              ? 'Sunday'
              : selectedDay)
        );
        
        setLinkUrl(initialData?.linkUrl || '');
        setLinkTitle(initialData?.linkTitle || '');
        setFileBase64(initialData?.pdfUrl || '');
        setFileName('');
      }
    } else {
      cleanupRecording();
      setManualVoiceCommand('');
      setGlobalTranscript('');
      setRecognitionError(null);
    }
  }, [isOpen, mode, itemType, initialData, currentClass, currentBlock, currentWeek, selectedDay]);

  // Close on Escape key press
  useEffect(() => {
    if (!isOpen) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onClose();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  // Voice recognition instance setup helper for live transcription preview
  const getSpeechRecognition = () => {
    return (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
  };

  const blobToBase64 = (blob: Blob): Promise<string> => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onloadend = () => {
        resolve(reader.result as string);
      };
      reader.onerror = reject;
      reader.readAsDataURL(blob);
    });
  };

  const applyParsedData = (data: any) => {
    if (!data) return;
    if (data.subject) setSubject(data.subject);
    if (data.classId) setClassId(data.classId);
    if (data.block) setBlock(Number(data.block));
    if (data.week) setWeek(Number(data.week));

    if (itemType === 'classwork') {
      if (data.title) setTitle(data.title);
      if (data.details) setDetails(data.details);
      if (data.pages) setPages(data.pages);
      if (data.day) setDay(data.day);
      if (data.period) setPeriod(Number(data.period));
    } else if (itemType === 'homework') {
      if (data.title) setTitle(data.title);
      if (data.task) setTitle(data.task);
      if (data.details) setDetails(data.details);
      if (data.pages) setPages(data.pages);
      if (data.assignedDay) setAssignedDay(data.assignedDay);
      if (data.dueDay) setDueDay(data.dueDay);
      if (data.priority) setPriority(data.priority);
    } else if (itemType === 'tomorrow') {
      if (data.arabicNote) setArabicNote(data.arabicNote);
      if (data.note) setArabicNote(data.note);
      if (data.bagItem) setBagItem(data.bagItem);
      if (data.isQuiz !== undefined) setIsQuiz(!!data.isQuiz);
      if (data.targetDay) setTargetDay(data.targetDay);
    }
  };

  const parseVoiceCommandWithGemini = async (text: string) => {
    if (!text || !text.trim()) return;
    setIsParsingGlobal(true);
    setRecognitionError(null);
    try {
      const response = await fetch('/api/parse-voice-command', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          command: text,
          itemType,
          currentClass,
          currentBlock,
          currentWeek,
          selectedDay,
        }),
      });

      const res = await response.json();
      if (res.success && res.data) {
        applyParsedData(res.data);
        setGlobalTranscript(text);
        setManualVoiceCommand('');
      } else {
        if (itemType === 'tomorrow') {
          setArabicNote(text);
        } else {
          setTitle(text);
        }
      }
    } catch (err) {
      console.error('Error parsing voice command:', err);
      if (itemType === 'tomorrow') {
        setArabicNote(text);
      } else {
        setTitle(text);
      }
    } finally {
      setIsParsingGlobal(false);
    }
  };

  const processRecordedAudio = async (
    blob: Blob,
    mimeType: string,
    target: string,
    currentValue?: string,
    setter?: (val: string) => void
  ) => {
    try {
      const base64Audio = await blobToBase64(blob);

      if (target === 'global') {
        setIsParsingGlobal(true);
        setRecognitionError(null);
        const response = await fetch('/api/parse-voice-audio', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            audioBase64: base64Audio,
            mimeType,
            itemType,
            currentClass,
            currentBlock,
            currentWeek,
            selectedDay,
          }),
        });

        const res = await response.json();
        if (res.success && res.data) {
          applyParsedData(res.data);
          if (res.transcript) {
            setGlobalTranscript(res.transcript);
          }
        } else if (res.transcript) {
          setGlobalTranscript(res.transcript);
          await parseVoiceCommandWithGemini(res.transcript);
        } else {
          setRecognitionError('تعذر تحليل التسجيل الصوتي بدقة، يرجى المحاولة والتحدث بوضوح.');
        }
      } else {
        // Field dictation transcription
        const response = await fetch('/api/transcribe-audio', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            audioBase64: base64Audio,
            mimeType,
          }),
        });

        const res = await response.json();
        if (res.success && res.transcript && setter) {
          const text = res.transcript.trim();
          setter(currentValue ? `${currentValue} ${text}` : text);
        }
      }
    } catch (err: any) {
      console.error('Audio processing error:', err);
      setRecognitionError('حدث خطأ أثناء الاتصال بخدمة الذكاء الاصطناعي لمعالجة الصوت.');
    } finally {
      if (target === 'global') {
        setIsParsingGlobal(false);
      }
    }
  };

  const startVoiceRecording = async (
    target: 'global' | string,
    currentValue?: string,
    setter?: (val: string) => void
  ) => {
    // If clicking on active recording -> STOP it!
    if (isRecording) {
      if (mediaRecorderRef.current && mediaRecorderRef.current.state !== 'inactive') {
        mediaRecorderRef.current.stop();
      } else {
        cleanupRecording();
      }
      return;
    }

    setRecognitionError(null);
    if (target === 'global') {
      setGlobalTranscript('');
    }

    // Check mediaDevices support
    if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
      setRecognitionError('متصفحك لا يدعم تسجيل الصوت المباشر عبر الميكروفون. يمكنك كتابة الأمر في المربع أدناه وتطبيقه بالذكاء الاصطناعي.');
      return;
    }

    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      streamRef.current = stream;
      audioChunksRef.current = [];

      let mimeType = 'audio/webm';
      if (typeof MediaRecorder !== 'undefined') {
        if (MediaRecorder.isTypeSupported('audio/webm;codecs=opus')) {
          mimeType = 'audio/webm;codecs=opus';
        } else if (MediaRecorder.isTypeSupported('audio/webm')) {
          mimeType = 'audio/webm';
        } else if (MediaRecorder.isTypeSupported('audio/mp4')) {
          mimeType = 'audio/mp4';
        } else if (MediaRecorder.isTypeSupported('audio/aac')) {
          mimeType = 'audio/aac';
        }
      }

      const mediaRecorder = new MediaRecorder(stream, mimeType ? { mimeType } : undefined);
      mediaRecorderRef.current = mediaRecorder;

      mediaRecorder.ondataavailable = (event) => {
        if (event.data && event.data.size > 0) {
          audioChunksRef.current.push(event.data);
        }
      };

      mediaRecorder.onstop = async () => {
        const finalMime = mediaRecorder.mimeType || mimeType || 'audio/webm';
        const audioBlob = new Blob(audioChunksRef.current, { type: finalMime });
        cleanupRecording();
        if (audioBlob.size > 0) {
          await processRecordedAudio(audioBlob, finalMime, target, currentValue, setter);
        }
      };

      mediaRecorder.start(250);
      setIsRecording(true);
      setRecordingTarget(target);
      setRecordingSeconds(0);

      // Start timer
      timerRef.current = setInterval(() => {
        setRecordingSeconds((prev) => {
          if (prev >= 20) {
            // Auto stop after 20 seconds
            if (mediaRecorderRef.current && mediaRecorderRef.current.state !== 'inactive') {
              mediaRecorderRef.current.stop();
            }
            return prev;
          }
          return prev + 1;
        });
      }, 1000);

      // Try parallel SpeechRecognition for live visual preview if supported
      const SpeechRecognitionClass = getSpeechRecognition();
      if (SpeechRecognitionClass) {
        try {
          const rec = new SpeechRecognitionClass();
          rec.continuous = true;
          rec.interimResults = true;
          rec.lang = 'ar-EG';
          rec.onresult = (e: any) => {
            const transcript = Array.from(e.results)
              .map((r: any) => r[0].transcript)
              .join(' ');
            if (target === 'global') {
              setGlobalTranscript(transcript);
            }
          };
          speechRecognitionRef.current = rec;
          rec.start();
        } catch {}
      }
    } catch (err: any) {
      console.warn('Microphone permission / access error:', err);
      cleanupRecording();
      if (err.name === 'NotAllowedError' || err.name === 'PermissionDeniedError') {
        setRecognitionError('يرجى السماح بصلاحية استخدام الميكروفون للموقع من إعدادات المتصفح، أو استخدم المربع أدناه لكتابة الأمر وتطبيقه بالذكاء الاصطناعي.');
      } else {
        setRecognitionError('تعذر تشغيل الميكروفون. يمكنك كتابة التعديل أو الأمر في المربع أدناه وتطبيقه بالذكاء الاصطناعي.');
      }
    }
  };

  // Handle file selection and convert to Base64 (supporting PDF, Word docs, etc.)
  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setUploadProgress(true);
    setFileName(file.name);

    const reader = new FileReader();
    reader.onload = (event) => {
      if (event.target?.result) {
        setFileBase64(event.target.result as string);
      }
      setUploadProgress(false);
    };
    reader.onerror = () => {
      alert('خطأ في قراءة وتحميل الملف، يرجى المحاولة مرة أخرى.');
      setUploadProgress(false);
    };
    reader.readAsDataURL(file);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    const baseData: any = {
      id: mode === 'edit' && initialData?.id ? initialData.id : `${itemType}-${Date.now()}`,
      classId: classId === 'ALL' ? 'ALL' : (classId || currentClass),
      subject,
      block,
      week,
      linkUrl: linkUrl.trim() || undefined,
      linkTitle: linkTitle.trim() || (linkUrl ? 'رابط إلكتروني 🔗' : undefined),
      pdfUrl: fileBase64 || undefined,
    };

    if (itemType === 'classwork') {
      if (!title.trim()) {
        alert('يرجى إدخال عنوان الحصة الدراسية.');
        return;
      }
      onSave('classwork', {
        ...baseData,
        title: title.trim(),
        details: details.trim() || undefined,
        pages: pages.trim() || undefined,
        day,
        period,
        completed: mode === 'edit' && initialData?.completed !== undefined ? initialData.completed : false,
      });
    } else if (itemType === 'homework') {
      if (!title.trim()) {
        alert('يرجى إدخال تفاصيل الواجب المنزلي.');
        return;
      }
      onSave('homework', {
        ...baseData,
        task: title.trim(),
        details: details.trim() || undefined,
        pages: pages.trim() || undefined,
        assignedDay,
        dueDay,
        priority,
        completed: mode === 'edit' && initialData?.completed !== undefined ? initialData.completed : false,
      });
    } else if (itemType === 'tomorrow') {
      if (!arabicNote.trim()) {
        alert('يرجى إدخال نص التنبيه أو الملاحظة.');
        return;
      }
      onSave('tomorrow', {
        ...baseData,
        note: arabicNote.trim(),
        arabicNote: arabicNote.trim(),
        bagItem: bagItem.trim() || undefined,
        isQuiz,
        categoryType: isQuiz ? 'quiz' : 'note',
        targetDay,
      });
    }

    onClose();
  };

  if (!isOpen) return null;

  return (
    <div 
      onClick={(e) => {
        if (e.target === e.currentTarget) {
          onClose();
        }
      }}
      className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-900/60 backdrop-blur-xs overflow-y-auto"
    >
      <div 
        className="bg-white rounded-3xl max-w-lg w-full p-5 sm:p-6 shadow-2xl border border-slate-100 flex flex-col max-h-[95vh] animate-in fade-in zoom-in-95 duration-150"
        dir="rtl"
      >
        {/* Header */}
        <div className="flex items-center justify-between pb-4 border-b border-slate-100">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-indigo-50 text-indigo-700 flex items-center justify-center border border-indigo-200">
              <Sparkles className="w-4 h-4" />
            </div>
            <div>
              <h3 className="text-base font-black text-slate-950">
                {mode === 'add' ? '➕ إضافة محتوى جديد تفاعلي' : '✏️ تعديل المحتوى مباشرة'}
              </h3>
              <p className="text-[11px] font-bold text-slate-400">
                نوع المحتوى الحالي: {itemType === 'classwork' ? 'حصة صفية (Classwork)' : itemType === 'homework' ? 'واجب منزلي (Homework)' : 'تنبيه غد / اختبار (Tomorrow Notes)'}
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="w-8 h-8 rounded-full bg-slate-100 hover:bg-slate-200 text-slate-500 hover:text-slate-800 flex items-center justify-center transition-colors cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Form Body */}
        <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto py-3.5 space-y-4">
          
          {/* Quick Selection: Subject, Block, Week, Class */}
          <div className="grid grid-cols-2 gap-2.5 bg-slate-50 p-3 rounded-2xl border border-slate-200">
            <div>
              <label className="block text-[11px] font-black text-slate-600 mb-1">المادة الدراسية:</label>
              <select
                value={subject}
                onChange={(e) => setSubject(e.target.value as SubjectName)}
                className="w-full text-xs font-bold p-2 bg-white border border-slate-200 rounded-xl focus:border-indigo-400 focus:ring-1 focus:ring-indigo-400"
              >
                {SUBJECTS.map((sub) => (
                  <option key={sub} value={sub}>{sub}</option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-[11px] font-black text-slate-600 mb-1">الفصل المستهدف:</label>
              <select
                value={classId}
                onChange={(e) => setClassId(e.target.value as ClassId | 'ALL')}
                className="w-full text-xs font-bold p-2 bg-white border border-slate-200 rounded-xl focus:border-indigo-400"
              >
                {CLASSES.map((cls) => (
                  <option key={cls} value={cls}>{cls}</option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-[11px] font-black text-slate-600 mb-1">الـ Block:</label>
              <select
                value={block}
                onChange={(e) => setBlock(Number(e.target.value))}
                className="w-full text-xs font-bold p-2 bg-white border border-slate-200 rounded-xl focus:border-indigo-400"
              >
                {[1, 2, 3, 4].map((b) => (
                  <option key={b} value={b}>Block {b}</option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-[11px] font-black text-slate-600 mb-1">الأسبوع الدراسـي:</label>
              <select
                value={week}
                onChange={(e) => setWeek(Number(e.target.value))}
                className="w-full text-xs font-bold p-2 bg-white border border-slate-200 rounded-xl focus:border-indigo-400"
              >
                {[1, 2, 3, 4].map((w) => (
                  <option key={w} value={w}>الأسبوع {w}</option>
                ))}
              </select>
            </div>
          </div>

          {/* Global AI Voice Smart Assistant Card */}
          <div className="bg-gradient-to-br from-indigo-50/70 to-indigo-100/50 p-4 rounded-2xl border border-indigo-200/80 shadow-xs space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <span className="text-base">🎙️</span>
                <span className="text-xs font-black text-indigo-950">المساعد الصوتي الذكي (AI Voice Smart Assistant)</span>
              </div>
              <span className="text-[10px] bg-indigo-200/80 text-indigo-900 px-2.5 py-0.5 rounded-full font-black animate-pulse">شغال الآن ✨</span>
            </div>
            
            <p className="text-[11px] text-slate-600 font-bold leading-relaxed">
              انقر على الميكروفون وتحدث بصوتك مباشرة بالأمر الكامل، أو اكتب نص الأمر أدناه وسيقوم الذكاء الاصطناعي بتعبئة كافة الخيارات تلقائياً! (مثال: "ضيف واجب رياضيات صفحة 12 لكلاس بي الأسبوع التالت").
            </p>

            {/* Voice record button */}
            <div>
              <button
                type="button"
                onClick={() => startVoiceRecording('global')}
                disabled={isParsingGlobal}
                className={`w-full py-3 px-4 rounded-xl font-black text-xs flex items-center justify-center gap-2.5 transition-all shadow-xs cursor-pointer ${
                  isRecording && recordingTarget === 'global'
                    ? 'bg-rose-600 text-white animate-pulse shadow-rose-200 shadow-md ring-2 ring-rose-400'
                    : isParsingGlobal
                    ? 'bg-indigo-50 text-indigo-600 border border-indigo-200'
                    : 'bg-indigo-600 hover:bg-indigo-700 text-white hover:scale-[1.01]'
                }`}
              >
                {isRecording && recordingTarget === 'global' ? (
                  <>
                    <MicOff className="w-4 h-4 animate-bounce text-white" />
                    <span>جاري التسجيل الصوتي ({recordingSeconds} ثوانٍ) - انقر هنا للإيقاف والتحليل ⏹️</span>
                  </>
                ) : isParsingGlobal ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin text-indigo-600" />
                    <span>جاري تحليل الصوت وتعبئة البيانات بالذكاء الاصطناعي...</span>
                  </>
                ) : (
                  <>
                    <Mic className="w-4 h-4" />
                    <span>انقر وابدأ التحدث بالأمر الصوتي الذكي 🎙️</span>
                  </>
                )}
              </button>
            </div>

            {/* Direct text input alternative for instant reliability */}
            <div className="flex items-center gap-2 pt-1 border-t border-indigo-100">
              <input
                type="text"
                value={manualVoiceCommand}
                onChange={(e) => setManualVoiceCommand(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') {
                    e.preventDefault();
                    parseVoiceCommandWithGemini(manualVoiceCommand);
                  }
                }}
                placeholder="أو اكتب الأمر هنا (مثال: واجب عربي صفحة 47 لكلاس A)..."
                className="flex-1 text-xs p-2.5 bg-white border border-indigo-200 rounded-xl focus:border-indigo-500 font-bold placeholder:text-slate-400"
              />
              <button
                type="button"
                disabled={!manualVoiceCommand.trim() || isParsingGlobal}
                onClick={() => parseVoiceCommandWithGemini(manualVoiceCommand)}
                className="px-3.5 py-2.5 bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 text-white rounded-xl text-xs font-black shrink-0 cursor-pointer flex items-center gap-1"
              >
                <span>تطبيق بالذكاء الاصطناعي</span>
                <Sparkles className="w-3 h-3" />
              </button>
            </div>

            {globalTranscript && (
              <div className="bg-white/90 p-2.5 rounded-xl border border-indigo-100 text-[11px] font-bold text-slate-700">
                <span className="font-black text-indigo-950 block mb-0.5">ما تم فهمه من الصوت:</span>
                <span className="text-slate-600 italic">"{globalTranscript}"</span>
              </div>
            )}

            {recognitionError && (
              <div className="p-2.5 bg-rose-50 border border-rose-200 rounded-xl text-[11px] font-bold text-rose-700 leading-snug">
                ⚠️ {recognitionError}
              </div>
            )}
          </div>

          {/* Form fields based on itemType */}
          {itemType === 'classwork' && (
            <div className="space-y-3.5">
              <div className="grid grid-cols-2 gap-2.5">
                <div>
                  <label className="block text-[11px] font-black text-slate-600 mb-1">يوم الحصة:</label>
                  <select
                    value={day}
                    onChange={(e) => setDay(e.target.value as SchoolDay)}
                    className="w-full text-xs font-bold p-2 bg-white border border-slate-200 rounded-xl focus:border-indigo-400"
                  >
                    {DAYS.map((d) => (
                      <option key={d} value={d}>{d}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-[11px] font-black text-slate-600 mb-1">رقم الحصة (1 - 8):</label>
                  <input
                    type="number"
                    min="1"
                    max="8"
                    value={period}
                    onChange={(e) => setPeriod(Number(e.target.value))}
                    className="w-full text-xs font-bold p-2 bg-white border border-slate-200 rounded-xl focus:border-indigo-400"
                  />
                </div>
              </div>

              <div>
                <div className="flex items-center justify-between mb-1">
                  <label className="block text-[11px] font-black text-slate-600">عنوان الدرس الرئيسي:</label>
                  <button
                    type="button"
                    onClick={() => startVoiceRecording('title', title, setTitle)}
                    className={`p-1 px-2 rounded-lg text-[10px] font-black flex items-center gap-1 transition-all cursor-pointer ${
                      isRecording && recordingTarget === 'title'
                        ? 'bg-rose-100 text-rose-700 animate-pulse border border-rose-300'
                        : 'text-slate-500 hover:text-indigo-600 hover:bg-slate-100'
                    }`}
                  >
                    <Mic className="w-3 h-3" />
                    <span>{isRecording && recordingTarget === 'title' ? `جاري التسجيل (${recordingSeconds} ث)... انقر للإيقاف ⏹️` : 'إملاء صوتي 🎙️'}</span>
                  </button>
                </div>
                <input
                  type="text"
                  placeholder="مثال: درس الطرح مع إعادة التسمية"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  className="w-full text-xs font-bold p-2.5 bg-white border border-slate-200 rounded-xl focus:border-indigo-400"
                />
              </div>

              <div>
                <div className="flex items-center justify-between mb-1">
                  <label className="block text-[11px] font-black text-slate-600">شرح/تفاصيل إضافية للدرس:</label>
                  <button
                    type="button"
                    onClick={() => startVoiceRecording('details', details, setDetails)}
                    className={`p-1 px-2 rounded-lg text-[10px] font-black flex items-center gap-1 transition-all cursor-pointer ${
                      isRecording && recordingTarget === 'details'
                        ? 'bg-rose-100 text-rose-700 animate-pulse border border-rose-300'
                        : 'text-slate-500 hover:text-indigo-600 hover:bg-slate-100'
                    }`}
                  >
                    <Mic className="w-3 h-3" />
                    <span>{isRecording && recordingTarget === 'details' ? `جاري التسجيل (${recordingSeconds} ث)... انقر للإيقاف ⏹️` : 'إملاء صوتي 🎙️'}</span>
                  </button>
                </div>
                <textarea
                  placeholder="اكتب هنا تفاصيل الحصة، المهارات المطلوبة، أو الأهداف..."
                  value={details}
                  onChange={(e) => setDetails(e.target.value)}
                  className="w-full text-xs font-bold p-2.5 bg-white border border-slate-200 rounded-xl focus:border-indigo-400 h-20 resize-none"
                />
              </div>

              <div>
                <div className="flex items-center justify-between mb-1">
                  <label className="block text-[11px] font-black text-slate-600">أرقام الصفحات في كتاب الطالب / البوكليت (اختياري):</label>
                  <button
                    type="button"
                    onClick={() => startVoiceRecording('pages', pages, setPages)}
                    className={`p-1 px-2 rounded-lg text-[10px] font-black flex items-center gap-1 transition-all cursor-pointer ${
                      isRecording && recordingTarget === 'pages'
                        ? 'bg-rose-100 text-rose-700 animate-pulse border border-rose-300'
                        : 'text-slate-500 hover:text-indigo-600 hover:bg-slate-100'
                    }`}
                  >
                    <Mic className="w-3 h-3" />
                    <span>{isRecording && recordingTarget === 'pages' ? `جاري التسجيل (${recordingSeconds} ث)... انقر للإيقاف ⏹️` : 'إملاء صوتي 🎙️'}</span>
                  </button>
                </div>
                <input
                  type="text"
                  placeholder="مثال: ص 34 - 36"
                  value={pages}
                  onChange={(e) => setPages(e.target.value)}
                  className="w-full text-xs font-bold p-2 bg-white border border-slate-200 rounded-xl focus:border-indigo-400"
                />
              </div>
            </div>
          )}

          {itemType === 'homework' && (
            <div className="space-y-3.5">
              <div className="grid grid-cols-2 gap-2.5">
                <div>
                  <label className="block text-[11px] font-black text-slate-600 mb-1">تاريخ التكليف (Assigned):</label>
                  <select
                    value={assignedDay}
                    onChange={(e) => setAssignedDay(e.target.value as SchoolDay)}
                    className="w-full text-xs font-bold p-2 bg-white border border-slate-200 rounded-xl focus:border-indigo-400"
                  >
                    {DAYS.map((d) => (
                      <option key={d} value={d}>{d}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-[11px] font-black text-slate-600 mb-1">تاريخ التسليم (Due):</label>
                  <select
                    value={dueDay}
                    onChange={(e) => setDueDay(e.target.value as SchoolDay)}
                    className="w-full text-xs font-bold p-2 bg-white border border-slate-200 rounded-xl focus:border-indigo-400"
                  >
                    {DAYS.map((d) => (
                      <option key={d} value={d}>{d}</option>
                    ))}
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-[11px] font-black text-slate-600 mb-1">أهمية الواجب (الأولوية):</label>
                <div className="flex gap-4">
                  <label className="inline-flex items-center gap-1.5 text-xs font-bold text-slate-700 cursor-pointer">
                    <input
                      type="radio"
                      name="priority"
                      checked={priority === 'normal'}
                      onChange={() => setPriority('normal')}
                      className="text-indigo-600 focus:ring-indigo-400"
                    />
                    <span>عادي (Normal)</span>
                  </label>
                  <label className="inline-flex items-center gap-1.5 text-xs font-bold text-rose-700 cursor-pointer">
                    <input
                      type="radio"
                      name="priority"
                      checked={priority === 'urgent'}
                      onChange={() => setPriority('urgent')}
                      className="text-rose-600 focus:ring-rose-400"
                    />
                    <span>🚨 عاجل وهام جداً (Urgent)</span>
                  </label>
                </div>
              </div>

              <div>
                <div className="flex items-center justify-between mb-1">
                  <label className="block text-[11px] font-black text-slate-600">محتوى وتفاصيل الواجب المطلوب:</label>
                  <button
                    type="button"
                    onClick={() => startVoiceRecording('title', title, setTitle)}
                    className={`p-1 px-2 rounded-lg text-[10px] font-black flex items-center gap-1 transition-all cursor-pointer ${
                      isRecording && recordingTarget === 'title'
                        ? 'bg-rose-100 text-rose-700 animate-pulse border border-rose-300'
                        : 'text-slate-500 hover:text-indigo-600 hover:bg-slate-100'
                    }`}
                  >
                    <Mic className="w-3 h-3" />
                    <span>{isRecording && recordingTarget === 'title' ? `جاري التسجيل (${recordingSeconds} ث)... انقر للإيقاف ⏹️` : 'إملاء صوتي 🎙️'}</span>
                  </button>
                </div>
                <input
                  type="text"
                  placeholder="مثال: حل صفحة 43 كاملة بالدفتر"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  className="w-full text-xs font-bold p-2.5 bg-white border border-slate-200 rounded-xl focus:border-indigo-400"
                />
              </div>

              <div>
                <div className="flex items-center justify-between mb-1">
                  <label className="block text-[11px] font-black text-slate-600">أرقام صفحات الواجب أو تفاصيل إضافية (اختياري):</label>
                  <button
                    type="button"
                    onClick={() => startVoiceRecording('pages', pages, setPages)}
                    className={`p-1 px-2 rounded-lg text-[10px] font-black flex items-center gap-1 transition-all cursor-pointer ${
                      isRecording && recordingTarget === 'pages'
                        ? 'bg-rose-100 text-rose-700 animate-pulse border border-rose-300'
                        : 'text-slate-500 hover:text-indigo-600 hover:bg-slate-100'
                    }`}
                  >
                    <Mic className="w-3 h-3" />
                    <span>{isRecording && recordingTarget === 'pages' ? `جاري التسجيل (${recordingSeconds} ث)... انقر للإيقاف ⏹️` : 'إملاء صوتي 🎙️'}</span>
                  </button>
                </div>
                <input
                  type="text"
                  placeholder="مثال: كتاب الطالب ص 43 - 44"
                  value={pages}
                  onChange={(e) => setPages(e.target.value)}
                  className="w-full text-xs font-bold p-2 bg-white border border-slate-200 rounded-xl focus:border-indigo-400"
                />
              </div>

              <div>
                <div className="flex items-center justify-between mb-1">
                  <label className="block text-[11px] font-black text-slate-600">إرشادات حل الواجب للطلاب وأولياء الأمور:</label>
                  <button
                    type="button"
                    onClick={() => startVoiceRecording('details', details, setDetails)}
                    className={`p-1 px-2 rounded-lg text-[10px] font-black flex items-center gap-1 transition-all cursor-pointer ${
                      isRecording && recordingTarget === 'details'
                        ? 'bg-rose-100 text-rose-700 animate-pulse border border-rose-300'
                        : 'text-slate-500 hover:text-indigo-600 hover:bg-slate-100'
                    }`}
                  >
                    <Mic className="w-3 h-3" />
                    <span>{isRecording && recordingTarget === 'details' ? `جاري التسجيل (${recordingSeconds} ث)... انقر للإيقاف ⏹️` : 'إملاء صوتي 🎙️'}</span>
                  </button>
                </div>
                <textarea
                  placeholder="أكتب أي تفاصيل إضافية أو إرشادات لتسليم الواجب للمدرسة..."
                  value={details}
                  onChange={(e) => setDetails(e.target.value)}
                  className="w-full text-xs font-bold p-2.5 bg-white border border-slate-200 rounded-xl focus:border-indigo-400 h-16 resize-none"
                />
              </div>
            </div>
          )}

          {itemType === 'tomorrow' && (
            <div className="space-y-3.5">
              <div>
                <label className="block text-[11px] font-black text-slate-600 mb-1">الملاحظة تتبع ليوم (تاريخ التجهيز):</label>
                <select
                  value={targetDay}
                  onChange={(e) => setTargetDay(e.target.value as SchoolDay)}
                  className="w-full text-xs font-bold p-2 bg-white border border-slate-200 rounded-xl focus:border-indigo-400"
                >
                  {DAYS.map((d) => (
                    <option key={d} value={d}>{d}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-[11px] font-black text-slate-600 mb-1">طبيعة التنبيه:</label>
                <label className="inline-flex items-center gap-1.5 text-xs font-bold text-slate-700 bg-rose-50 border border-rose-200/60 p-2.5 rounded-xl cursor-pointer w-full">
                  <input
                    type="checkbox"
                    checked={isQuiz}
                    onChange={(e) => setIsQuiz(e.target.checked)}
                    className="rounded text-rose-600 focus:ring-rose-400 w-4 h-4"
                  />
                  <div>
                    <span className="font-black text-rose-950">🚨 تحديد كـ "اختبار / كويز / إملاء غداً"</span>
                    <span className="block text-[10px] text-slate-400 font-semibold mt-0.5">يعمل على تمييز التنبيه بلون أحمر لافت وتحذير الطلاب تلقائياً</span>
                  </div>
                </label>
              </div>

              <div>
                <div className="flex items-center justify-between mb-1">
                  <label className="block text-[11px] font-black text-slate-600">نص التنبيه والملاحظة (بالعربية):</label>
                  <button
                    type="button"
                    onClick={() => startVoiceRecording('arabicNote', arabicNote, setArabicNote)}
                    className={`p-1 px-2 rounded-lg text-[10px] font-black flex items-center gap-1 transition-all cursor-pointer ${
                      isRecording && recordingTarget === 'arabicNote'
                        ? 'bg-rose-100 text-rose-700 animate-pulse border border-rose-300'
                        : 'text-slate-500 hover:text-indigo-600 hover:bg-slate-100'
                    }`}
                  >
                    <Mic className="w-3 h-3" />
                    <span>{isRecording && recordingTarget === 'arabicNote' ? `جاري التسجيل (${recordingSeconds} ث)... انقر للإيقاف ⏹️` : 'إملاء صوتي 🎙️'}</span>
                  </button>
                </div>
                <textarea
                  placeholder="مثال: يرجى إحضار الألوان الخشبية غداً، أو: إملاء درس عائلتي غداً بجميع الصفوف."
                  value={arabicNote}
                  onChange={(e) => setArabicNote(e.target.value)}
                  className="w-full text-xs font-bold p-2.5 bg-white border border-slate-200 rounded-xl focus:border-indigo-400 h-20 resize-none"
                />
              </div>

              <div>
                <div className="flex items-center justify-between mb-1">
                  <label className="block text-[11px] font-black text-slate-600">الأدوات والحقيبة المدرسية المطلوبة (اختياري):</label>
                  <button
                    type="button"
                    onClick={() => startVoiceRecording('bagItem', bagItem, setBagItem)}
                    className={`p-1 px-2 rounded-lg text-[10px] font-black flex items-center gap-1 transition-all cursor-pointer ${
                      isRecording && recordingTarget === 'bagItem'
                        ? 'bg-rose-100 text-rose-700 animate-pulse border border-rose-300'
                        : 'text-slate-500 hover:text-indigo-600 hover:bg-slate-100'
                    }`}
                  >
                    <Mic className="w-3 h-3" />
                    <span>{isRecording && recordingTarget === 'bagItem' ? `جاري التسجيل (${recordingSeconds} ث)... انقر للإيقاف ⏹️` : 'إملاء صوتي 🎙️'}</span>
                  </button>
                </div>
                <input
                  type="text"
                  placeholder="مثال: كتاب الطالب + الدفتر الصغير + ألوان"
                  value={bagItem}
                  onChange={(e) => setBagItem(e.target.value)}
                  className="w-full text-xs font-bold p-2 bg-white border border-slate-200 rounded-xl focus:border-indigo-400"
                />
              </div>
            </div>
          )}

          {/* Attachments Section: File (PDF, Word, Doc, PNG) or Link */}
          <div className="border-t border-slate-100 pt-3.5 space-y-3">
            <h4 className="text-xs font-black text-indigo-900 flex items-center gap-1.5">
              <Link2 className="w-4 h-4 text-indigo-600" />
              <span>المرفقات ووسائط التعلم (ملفات PDF, Word, روابط خارجية)</span>
            </h4>

            {/* Link inputs */}
            <div className="grid grid-cols-2 gap-2.5">
              <div>
                <label className="block text-[10px] font-black text-slate-500 mb-1">رابط إلكتروني مرفق (URL):</label>
                <input
                  type="url"
                  placeholder="https://example.com/..."
                  value={linkUrl}
                  onChange={(e) => setLinkUrl(e.target.value)}
                  className="w-full text-[11px] font-bold p-2 bg-white border border-slate-200 rounded-xl focus:border-indigo-400"
                />
              </div>
              <div>
                <label className="block text-[10px] font-black text-slate-500 mb-1">اسم الرابط المرفق:</label>
                <input
                  type="text"
                  placeholder="مثال: فيديو شرح الدرس 📺"
                  value={linkTitle}
                  onChange={(e) => setLinkTitle(e.target.value)}
                  className="w-full text-[11px] font-bold p-2 bg-white border border-slate-200 rounded-xl focus:border-indigo-400"
                />
              </div>
            </div>

            {/* File Upload Zone */}
            <div>
              <label className="block text-[10px] font-black text-slate-500 mb-1">تحميل ملف مرفق (PDF, Word, صور، إلخ):</label>
              <div className="border-2 border-dashed border-slate-200 hover:border-indigo-400 rounded-2xl p-4 bg-slate-50 hover:bg-indigo-50/20 text-center transition-all relative cursor-pointer group">
                <input
                  type="file"
                  id="modal-attachment-upload"
                  onChange={handleFileChange}
                  className="absolute inset-0 opacity-0 cursor-pointer w-full h-full"
                  accept=".pdf,.doc,.docx,.xls,.xlsx,.ppt,.pptx,.png,.jpg,.jpeg,.gif"
                />
                <div className="flex flex-col items-center justify-center space-y-1">
                  <div className="w-8 h-8 rounded-full bg-indigo-100 text-indigo-700 flex items-center justify-center group-hover:scale-110 transition-transform">
                    <Upload className="w-4 h-4 text-indigo-600" />
                  </div>
                  <div className="text-xs font-black text-slate-700">
                    {uploadProgress ? 'جاري رفع وتجهيز الملف...' : 'اسحب الملف هنا أو انقر للتصفح 📂'}
                  </div>
                  <div className="text-[10px] text-slate-400 font-bold">
                    يدعم ملفات Word, PDF, شيتات العمل، والصور
                  </div>
                </div>
              </div>
              {fileName && (
                <div className="mt-2 p-2 bg-indigo-50 text-indigo-950 rounded-xl border border-indigo-200 text-xs font-black flex items-center justify-between">
                  <div className="flex items-center gap-1.5 min-w-0">
                    <FileText className="w-4 h-4 text-indigo-600 shrink-0" />
                    <span className="truncate">{fileName}</span>
                  </div>
                  <button
                    type="button"
                    onClick={() => {
                      setFileBase64('');
                      setFileName('');
                    }}
                    className="text-rose-600 hover:text-rose-800 font-black cursor-pointer text-[10px]"
                  >
                    حذف ❌
                  </button>
                </div>
              )}
            </div>
          </div>

          {/* Action Buttons */}
          <div className="pt-4 border-t border-slate-100 flex items-center justify-end gap-2.5">
            <button
              type="button"
              onClick={onClose}
              className="py-2.5 px-4 bg-slate-100 hover:bg-slate-200 text-slate-700 font-black text-xs rounded-xl transition-all cursor-pointer"
            >
              إلغاء
            </button>
            <button
              type="submit"
              disabled={uploadProgress}
              className="py-2.5 px-6 bg-indigo-600 hover:bg-indigo-700 text-white font-black text-xs rounded-xl shadow-xs transition-all cursor-pointer flex items-center gap-1.5 hover:scale-[1.02]"
            >
              {uploadProgress ? 'جاري التحميل...' : 'حفظ ونشر التغييرات 💾'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
