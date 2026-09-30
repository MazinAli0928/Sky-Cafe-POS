import React from "react";
import Modal from "./Modal";
import { AlertTriangle } from "lucide-react";

const ConfirmModal = ({ isOpen, onClose, onConfirm, title, message, confirmText = "Delete", isDanger = true }) => {
  return (
    <Modal isOpen={isOpen} onClose={onClose} title={title || "Confirm Action"}>
      <div className="space-y-4 text-xs font-medium">
        <div className="flex items-start gap-3 p-3.5 rounded-xl bg-amber-50 border border-amber-200/80 text-amber-900">
          <AlertTriangle className="w-5 h-5 text-amber-600 shrink-0 mt-0.5" />
          <p className="leading-relaxed font-semibold">{message}</p>
        </div>

        <div className="pt-3 border-t border-slate-100 flex justify-end gap-3">
          <button
            onClick={onClose}
            className="px-4 py-2 rounded-xl border border-slate-200 text-slate-700 font-bold hover:bg-slate-100"
          >
            Cancel
          </button>
          <button
            onClick={() => {
              onConfirm();
              onClose();
            }}
            className={`px-5 py-2 rounded-xl text-white font-extrabold shadow-md transition-colors ${
              isDanger ? "bg-rose-600 hover:bg-rose-700 shadow-rose-600/20" : "bg-amber-500 hover:bg-amber-600 text-slate-950"
            }`}
          >
            {confirmText}
          </button>
        </div>
      </div>
    </Modal>
  );
};

export default ConfirmModal;
