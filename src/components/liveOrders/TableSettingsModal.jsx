import React, { useState } from "react";
import { X, Settings, Check } from "lucide-react";
import { updateTableConfig } from "../../services/api";
import { useToast } from "../../context/ToastContext";
import Modal from "../common/Modal";

const TableSettingsModal = ({ isOpen, onClose, currentCount = 12, currentPrefix = "T-", onSaved }) => {
  const { addToast } = useToast();
  const [tableCount, setTableCount] = useState(currentCount);
  const [tablePrefix, setTablePrefix] = useState(currentPrefix);
  const [saving, setSaving] = useState(false);

  const handleSave = async (e) => {
    e.preventDefault();
    if (tableCount < 1 || tableCount > 100) {
      addToast("Table count must be between 1 and 100", "error");
      return;
    }

    setSaving(true);
    try {
      await updateTableConfig({
        table_count: parseInt(tableCount, 10),
        table_prefix: tablePrefix.trim() || "T-"
      });
      addToast("Table configuration saved successfully", "success");
      onSaved();
      onClose();
    } catch (err) {
      addToast(err.message || "Failed to save table settings", "error");
    } finally {
      setSaving(false);
    }
  };

  if (!isOpen) return null;

  return (
    <Modal isOpen={isOpen} onClose={onClose} size="sm" title="Configure Cafe Tables">
      <form onSubmit={handleSave} className="space-y-4 pt-2">
        <p className="text-xs text-slate-500">
          Configure the total number of physical dining tables and their display prefix.
        </p>

        <div>
          <label className="block text-xs font-bold text-slate-700 mb-1">
            Table Prefix
          </label>
          <input
            type="text"
            maxLength={10}
            value={tablePrefix}
            onChange={(e) => setTablePrefix(e.target.value)}
            placeholder="e.g. T- or Table "
            className="w-full px-3 py-2 text-xs border border-slate-200 rounded-xl focus:outline-hidden focus:ring-2 focus:ring-amber-500"
          />
          <span className="text-[10px] text-slate-400 mt-0.5 block">
            Preview: {tablePrefix}1, {tablePrefix}2...
          </span>
        </div>

        <div>
          <label className="block text-xs font-bold text-slate-700 mb-1">
            Total Number of Tables
          </label>
          <input
            type="number"
            min={1}
            max={100}
            value={tableCount}
            onChange={(e) => setTableCount(e.target.value)}
            className="w-full px-3 py-2 text-xs border border-slate-200 rounded-xl focus:outline-hidden focus:ring-2 focus:ring-amber-500"
          />
          <span className="text-[10px] text-slate-400 mt-0.5 block">
            Supports 1 to 100 cafe tables.
          </span>
        </div>

        <div className="flex justify-end gap-2 pt-3 border-t border-slate-100">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 rounded-xl border border-slate-200 text-xs font-bold text-slate-700 hover:bg-slate-50 transition-colors"
          >
            Cancel
          </button>
          <button
            type="submit"
            disabled={saving}
            className="px-5 py-2 rounded-xl bg-amber-500 hover:bg-amber-600 text-slate-950 text-xs font-extrabold shadow-xs transition-colors flex items-center gap-1.5"
          >
            <Check className="w-3.5 h-3.5" />
            <span>{saving ? "Saving..." : "Save Settings"}</span>
          </button>
        </div>
      </form>
    </Modal>
  );
};

export default TableSettingsModal;
