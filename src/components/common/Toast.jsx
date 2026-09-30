import React from "react";
import { CheckCircle2, AlertCircle, Info, X } from "lucide-react";

const Toast = ({ toast, onClose }) => {
  const { type, message } = toast;

  const icons = {
    success: <CheckCircle2 className="w-5 h-5 text-emerald-400 shrink-0" />,
    error: <AlertCircle className="w-5 h-5 text-rose-400 shrink-0" />,
    warning: <AlertCircle className="w-5 h-5 text-amber-400 shrink-0" />,
    info: <Info className="w-5 h-5 text-indigo-400 shrink-0" />
  };

  const borders = {
    success: "border-emerald-500/30 bg-emerald-950/90 text-emerald-100",
    error: "border-rose-500/30 bg-rose-950/90 text-rose-100",
    warning: "border-amber-500/30 bg-amber-950/90 text-amber-100",
    info: "border-slate-700 bg-slate-900/95 text-slate-100"
  };

  return (
    <div
      className={`pointer-events-auto flex items-center justify-between gap-3 px-4 py-3 rounded-xl border shadow-xl backdrop-blur-md transition-all duration-300 transform translate-y-0 ${
        borders[type] || borders.info
      }`}
    >
      <div className="flex items-center gap-3">
        {icons[type] || icons.info}
        <span className="text-sm font-medium leading-tight">{message}</span>
      </div>
      <button
        onClick={onClose}
        className="text-slate-400 hover:text-slate-200 p-1 rounded-lg hover:bg-white/10 transition-colors"
      >
        <X className="w-4 h-4" />
      </button>
    </div>
  );
};

export default Toast;
