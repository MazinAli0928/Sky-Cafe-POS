import React, { useState } from "react";
import Modal from "../common/Modal";
import { KeyRound, Eye, EyeOff, AlertCircle, CheckCircle2 } from "lucide-react";
import { changePassword } from "../../services/api";
import { useAuth } from "../../context/AuthContext";
import { useToast } from "../../context/ToastContext";

const ChangePasswordModal = ({ isOpen, onClose }) => {
  const { logout } = useAuth();
  const { addToast } = useToast();

  const [form, setForm] = useState({
    currentPassword: "",
    newPassword: "",
    confirmPassword: ""
  });
  const [showCurrent, setShowCurrent] = useState(false);
  const [showNew, setShowNew] = useState(false);
  const [error, setError] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleChange = (field, value) => {
    setForm((prev) => ({ ...prev, [field]: value }));
    setError("");
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");

    if (!form.currentPassword) {
      setError("Please enter your current password.");
      return;
    }
    if (!form.newPassword || form.newPassword.length < 6) {
      setError("New password must be at least 6 characters.");
      return;
    }
    if (form.newPassword !== form.confirmPassword) {
      setError("New password and confirm password do not match.");
      return;
    }

    setIsSubmitting(true);
    try {
      await changePassword(form.currentPassword, form.newPassword, form.confirmPassword);
      addToast("Password changed successfully! Please log in again.", "success");
      onClose();
      // Invalidate session and require login again
      setTimeout(() => {
        logout();
      }, 1000);
    } catch (err) {
      setError(err.message || "Failed to change password.");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Change My Password">
      <form onSubmit={handleSubmit} className="space-y-4 text-sm">
        {error && (
          <div className="flex items-center gap-2 p-3 rounded-xl bg-rose-50 border border-rose-200 text-rose-800 font-semibold">
            <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" />
            <span>{error}</span>
          </div>
        )}

        <div className="p-3 rounded-xl bg-slate-50 border border-slate-200/80 text-xs text-slate-600">
          Changing your password will log you out of your current session. You will need to log in again with your new password.
        </div>

        {/* Current Password */}
        <div>
          <label className="block text-slate-600 font-bold mb-1">Current Password *</label>
          <div className="relative">
            <input
              type={showCurrent ? "text" : "password"}
              placeholder="Enter current password"
              value={form.currentPassword}
              onChange={(e) => handleChange("currentPassword", e.target.value)}
              className="w-full px-3.5 pr-10 py-2.5 rounded-xl border border-slate-200 focus:outline-none focus:border-amber-500 font-mono"
            />
            <button
              type="button"
              onClick={() => setShowCurrent(!showCurrent)}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
            >
              {showCurrent ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
            </button>
          </div>
        </div>

        {/* New Password */}
        <div>
          <label className="block text-slate-600 font-bold mb-1">New Password *</label>
          <div className="relative">
            <input
              type={showNew ? "text" : "password"}
              placeholder="Min. 6 characters"
              value={form.newPassword}
              onChange={(e) => handleChange("newPassword", e.target.value)}
              className="w-full px-3.5 pr-10 py-2.5 rounded-xl border border-slate-200 focus:outline-none focus:border-amber-500 font-mono"
            />
            <button
              type="button"
              onClick={() => setShowNew(!showNew)}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
            >
              {showNew ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
            </button>
          </div>
        </div>

        {/* Confirm New Password */}
        <div>
          <label className="block text-slate-600 font-bold mb-1">Confirm New Password *</label>
          <input
            type={showNew ? "text" : "password"}
            placeholder="Re-enter new password"
            value={form.confirmPassword}
            onChange={(e) => handleChange("confirmPassword", e.target.value)}
            className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 focus:outline-none focus:border-amber-500 font-mono"
          />
        </div>

        {/* Buttons */}
        <div className="pt-3 border-t border-slate-100 flex justify-end gap-3">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2.5 rounded-xl border border-slate-200 font-bold hover:bg-slate-100 text-slate-700"
          >
            Cancel
          </button>
          <button
            type="submit"
            disabled={isSubmitting}
            className="px-5 py-2.5 rounded-xl bg-amber-500 hover:bg-amber-600 text-slate-950 font-extrabold shadow-sm disabled:opacity-60 flex items-center gap-1.5"
          >
            <KeyRound className="w-4 h-4" />
            <span>{isSubmitting ? "Updating..." : "Update Password"}</span>
          </button>
        </div>
      </form>
    </Modal>
  );
};

export default ChangePasswordModal;
