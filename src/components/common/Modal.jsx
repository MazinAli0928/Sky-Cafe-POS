import React, { useEffect } from "react";
import { X } from "lucide-react";

const Modal = ({
  isOpen,
  onClose,
  title,
  children,
  maxWidth = "max-w-md",
  size = null
}) => {
  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.key === "Escape") onClose();
    };
    if (isOpen) {
      document.body.style.overflow = "hidden";
      window.addEventListener("keydown", handleKeyDown);
    }
    return () => {
      document.body.style.overflow = "unset";
      window.removeEventListener("keydown", handleKeyDown);
    };
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  // Resolve size mapping
  let widthClass = maxWidth;
  if (size === "sm") widthClass = "max-w-sm";
  else if (size === "md") widthClass = "max-w-md";
  else if (size === "lg") widthClass = "max-w-3xl";
  else if (size === "xl") widthClass = "max-w-5xl";
  else if (size === "full") widthClass = "max-w-7xl";

  const showHeader = title !== undefined && title !== null && title !== "";

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-6 bg-slate-950/70 backdrop-blur-xs animate-in fade-in duration-200">
      <div
        className={`bg-white rounded-2xl shadow-2xl border border-slate-200 w-full ${widthClass} overflow-hidden transform transition-all duration-200 flex flex-col`}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Modal Header */}
        {showHeader && (
          <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between bg-slate-50/50 shrink-0">
            <h3 className="text-lg font-bold text-slate-800 tracking-tight">{title}</h3>
            <button
              onClick={onClose}
              className="p-1.5 text-slate-400 hover:text-slate-600 hover:bg-slate-200/60 rounded-lg transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        )}

        {/* Modal Body */}
        <div className={showHeader ? "p-6 max-h-[80vh] overflow-y-auto" : "p-0 overflow-hidden flex-1"}>
          {children}
        </div>
      </div>
    </div>
  );
};

export default Modal;
