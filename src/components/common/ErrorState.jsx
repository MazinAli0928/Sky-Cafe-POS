import React from "react";
import { ServerOff, RefreshCw } from "lucide-react";

const ErrorState = ({
  title = "Unable to connect to the POS server",
  subtitle = "Please ensure the backend FastAPI service is running on http://localhost:8000",
  onRetry
}) => {
  return (
    <div className="flex flex-col items-center justify-center py-16 px-6 text-center border-2 border-dashed border-rose-200 rounded-3xl bg-rose-50/50 my-6">
      <div className="w-14 h-14 rounded-2xl bg-rose-100 text-rose-600 flex items-center justify-center mb-4 shadow-sm">
        <ServerOff className="w-7 h-7" />
      </div>
      <h3 className="text-lg font-bold text-slate-800">{title}</h3>
      <p className="text-xs text-slate-500 max-w-md mt-1.5 leading-relaxed">{subtitle}</p>

      {onRetry && (
        <button
          onClick={onRetry}
          className="mt-5 px-5 py-2.5 bg-slate-900 hover:bg-slate-800 text-white font-bold text-xs rounded-xl shadow-md flex items-center gap-2 transition-colors"
        >
          <RefreshCw className="w-4 h-4" />
          <span>Retry Connection</span>
        </button>
      )}
    </div>
  );
};

export default ErrorState;
