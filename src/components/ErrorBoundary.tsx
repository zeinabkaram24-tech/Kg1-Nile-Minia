import React, { Component, ErrorInfo, ReactNode } from 'react';
import { AlertTriangle, RefreshCw, Copy, Check, Trash2 } from 'lucide-react';

interface Props {
  children: ReactNode;
}

interface State {
  hasError: boolean;
  error: Error | null;
  errorInfo: ErrorInfo | null;
  copied: boolean;
}

export class ErrorBoundary extends Component<Props, State> {
  state: State = {
    hasError: false,
    error: null,
    errorInfo: null,
    copied: false,
  };
  declare props: Readonly<Props>;
  declare setState: (state: Partial<State> | ((prevState: Readonly<State>) => Partial<State>), callback?: () => void) => void;

  constructor(props: Props) {
    super(props);
  }

  static getDerivedStateFromError(error: Error): Partial<State> {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error('[ErrorBoundary caught an error]:', error, errorInfo);
    this.setState({
      error,
      errorInfo,
    });
  }

  componentDidMount() {
    window.addEventListener('unhandledrejection', this.handleUnhandledRejection);
  }

  componentWillUnmount() {
    window.removeEventListener('unhandledrejection', this.handleUnhandledRejection);
  }

  handleUnhandledRejection = (event: PromiseRejectionEvent) => {
    // Prevent unhandled promise rejections (e.g. background network sync, analytics, visitor pings)
    // from triggering fatal console errors or breaking the application.
    if (event) {
      event.preventDefault?.();
    }
  };

  handleReload = () => {
    window.location.reload();
  };

  handleResetCacheAndReload = () => {
    try {
      localStorage.clear();
      sessionStorage.clear();
    } catch {}
    window.location.reload();
  };

  handleCopyError = () => {
    const { error, errorInfo } = this.state;
    const errorText = `Error: ${error?.name}: ${error?.message}\n\nStack:\n${error?.stack || 'N/A'}\n\nComponent Stack:\n${errorInfo?.componentStack || 'N/A'}\n\nUser Agent: ${navigator.userAgent}`;
    
    if (navigator.clipboard?.writeText) {
      navigator.clipboard.writeText(errorText).then(() => {
        this.setState({ copied: true });
        setTimeout(() => this.setState({ copied: false }), 2000);
      });
    } else {
      // Fallback
      const textArea = document.createElement('textarea');
      textArea.value = errorText;
      document.body.appendChild(textArea);
      textArea.select();
      try {
        document.execCommand('copy');
        this.setState({ copied: true });
        setTimeout(() => this.setState({ copied: false }), 2000);
      } catch {}
      document.body.removeChild(textArea);
    }
  };

  handleTryRecover = () => {
    this.setState({
      hasError: false,
      error: null,
      errorInfo: null,
    });
  };

  render() {
    if (this.state.hasError) {
      const errorMessage = this.state.error?.message || 'Unknown error occurred';
      const errorStack = this.state.error?.stack || '';
      const componentStack = this.state.errorInfo?.componentStack || '';

      return (
        <div className="min-h-screen bg-slate-900 text-slate-100 flex flex-col items-center justify-center p-4 sm:p-6 font-sans">
          <div className="w-full max-w-2xl bg-slate-800/90 border border-red-500/40 rounded-2xl p-6 sm:p-8 shadow-2xl backdrop-blur-md">
            {/* Header */}
            <div className="flex items-center gap-3.5 mb-4 text-red-400">
              <div className="p-3 bg-red-500/10 rounded-xl border border-red-500/30">
                <AlertTriangle className="w-7 h-7 text-red-400" />
              </div>
              <div>
                <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-white">
                  عذراً، حدث خطأ غير متوقع
                </h1>
                <p className="text-xs sm:text-sm text-slate-400">
                  Application Error (iOS / Safari Safe Screen)
                </p>
              </div>
            </div>

            <p className="text-sm text-slate-300 mb-4 leading-relaxed">
              حدث خطأ أثناء تحميل أو تشغيل الصفحة. تم إيقاف الصفحة البيضاء وعرض تفاصيل الخطأ أدناه لمساعدتك:
            </p>

            {/* Error Message Box */}
            <div className="mb-4 bg-slate-950/80 rounded-xl p-4 border border-red-900/50">
              <span className="text-xs uppercase font-mono tracking-wider text-red-400 block mb-1 font-semibold">
                {this.state.error?.name || 'Error'}:
              </span>
              <p className="text-sm sm:text-base font-mono text-red-200 break-words whitespace-pre-wrap selection:bg-red-800">
                {errorMessage}
              </p>
            </div>

            {/* Collapsible Details */}
            {(errorStack || componentStack) && (
              <details className="mb-6 group">
                <summary className="text-xs font-medium text-slate-400 cursor-pointer hover:text-slate-200 transition-colors py-1 flex items-center justify-between">
                  <span>عرض التفاصيل التقنية (Technical Stack Trace)</span>
                  <span className="text-[10px] bg-slate-700/60 px-2 py-0.5 rounded text-slate-300">
                    انقر للإظهار / الإخفاء
                  </span>
                </summary>
                <div className="mt-2 bg-slate-950/90 rounded-lg p-3 border border-slate-700/50 max-h-48 overflow-y-auto text-[11px] font-mono text-slate-400 leading-normal select-all">
                  {errorStack && (
                    <div className="mb-2">
                      <strong className="text-slate-300 block mb-1">Stack:</strong>
                      {errorStack}
                    </div>
                  )}
                  {componentStack && (
                    <div>
                      <strong className="text-slate-300 block mb-1">Component Stack:</strong>
                      {componentStack}
                    </div>
                  )}
                </div>
              </details>
            )}

            {/* Action Buttons */}
            <div className="flex flex-wrap gap-2.5 pt-2 border-t border-slate-700/60">
              <button
                onClick={this.handleReload}
                className="flex-1 min-w-[130px] flex items-center justify-center gap-2 px-4 py-2.5 bg-blue-600 hover:bg-blue-500 active:scale-[0.98] text-white rounded-xl text-sm font-semibold transition-all shadow-md cursor-pointer"
              >
                <RefreshCw className="w-4 h-4" />
                <span>إعادة تحميل</span>
              </button>

              <button
                onClick={this.handleTryRecover}
                className="flex-1 min-w-[130px] flex items-center justify-center gap-2 px-4 py-2.5 bg-slate-700 hover:bg-slate-600 active:scale-[0.98] text-slate-100 rounded-xl text-sm font-medium transition-all cursor-pointer"
              >
                <span>المحاولة مجدداً</span>
              </button>

              <button
                onClick={this.handleCopyError}
                className="flex items-center justify-center gap-2 px-3.5 py-2.5 bg-slate-800 hover:bg-slate-700 border border-slate-600/70 text-slate-300 hover:text-white rounded-xl text-sm transition-all cursor-pointer"
                title="نسخ تفاصيل الخطأ"
              >
                {this.state.copied ? (
                  <>
                    <Check className="w-4 h-4 text-emerald-400" />
                    <span className="text-xs text-emerald-400">تم النسخ</span>
                  </>
                ) : (
                  <>
                    <Copy className="w-4 h-4" />
                    <span className="text-xs">نسخ الخطأ</span>
                  </>
                )}
              </button>

              <button
                onClick={this.handleResetCacheAndReload}
                className="flex items-center justify-center gap-1.5 px-3 py-2.5 bg-red-950/40 hover:bg-red-900/60 border border-red-800/40 text-red-300 rounded-xl text-xs transition-all cursor-pointer ml-auto"
                title="مسح البيانات المخزنة محلياً وإعادة التحميل إذا كان الخطأ بسبب بيانات تالفة"
              >
                <Trash2 className="w-3.5 h-3.5" />
                <span>مسح الذاكرة وإعادة الضبط</span>
              </button>
            </div>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}
