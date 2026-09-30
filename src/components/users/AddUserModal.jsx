import React, { useState, useEffect } from "react";
import Modal from "../common/Modal";
import { ShieldCheck, ShieldAlert, AlertCircle, Eye, EyeOff } from "lucide-react";

const ROLES = [
  { value: "CASHIER", label: "Cashier", icon: ShieldAlert, description: "POS, Orders view only" },
  { value: "MANAGER", label: "Manager", icon: ShieldCheck, description: "Full access to all features" }
];

const AddUserModal = ({ isOpen, onClose, onSave, editingUser }) => {
  const isEdit = !!editingUser;

  const [form, setForm] = useState({
    name: "",
    username: "",
    password: "",
    confirmPassword: "",
    role: "CASHIER"
  });
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    if (editingUser) {
      setForm({
        name: editingUser.name,
        username: editingUser.username,
        password: "",
        confirmPassword: "",
        role: editingUser.role
      });
    } else {
      setForm({ name: "", username: "", password: "", confirmPassword: "", role: "CASHIER" });
    }
    setError("");
  }, [editingUser, isOpen]);

  const handleChange = (field, value) => {
    setForm((prev) => ({ ...prev, [field]: value }));
    setError("");
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");

    if (!form.name.trim()) { setError("Full name is required."); return; }
    if (!form.username.trim()) { setError("Username is required."); return; }
    if (!isEdit && !form.password.trim()) { setError("Password is required for new users."); return; }
    if (!isEdit && form.password.length < 6) { setError("Password must be at least 6 characters."); return; }
    if (form.password && form.password !== form.confirmPassword) {
      setError("Password and confirmation password do not match.");
      return;
    }

    setIsSubmitting(true);
    try {
      const payload = {
        name: form.name.trim(),
        username: form.username.trim().toLowerCase(),
        role: form.role
      };
      if (form.password.trim()) {
        payload.password = form.password;
      }
      await onSave(payload);
      onClose();
    } catch (err) {
      setError(err.message || "Failed to save user.");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} title={isEdit ? `Edit User (${editingUser.username})` : "Add New User"}>
      <form onSubmit={handleSubmit} className="space-y-4 text-sm">
        {error && (
          <div className="flex items-center gap-2 p-3 rounded-xl bg-rose-50 border border-rose-200 text-rose-800 font-semibold">
            <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" />
            <span>{error}</span>
          </div>
        )}

        {/* Full Name */}
        <div>
          <label className="block text-slate-600 font-bold mb-1">Full Name *</label>
          <input
            type="text"
            placeholder="e.g. Ravi Kumar"
            value={form.name}
            onChange={(e) => handleChange("name", e.target.value)}
            className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 focus:outline-none focus:border-amber-500 font-medium"
          />
        </div>

        {/* Username */}
        <div>
          <label className="block text-slate-600 font-bold mb-1">Username *</label>
          <input
            type="text"
            placeholder="e.g. ravi_cashier"
            value={form.username}
            onChange={(e) => handleChange("username", e.target.value.toLowerCase().replace(/\s/g, "_"))}
            className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 focus:outline-none focus:border-amber-500 font-mono"
          />
          <p className="text-[11px] text-slate-400 mt-1">Lowercase letters, numbers, underscore only.</p>
        </div>

        {/* Password */}
        <div>
          <label className="block text-slate-600 font-bold mb-1">
            {isEdit ? "New Password (leave blank to keep current)" : "Password *"}
          </label>
          <div className="relative">
            <input
              type={showPassword ? "text" : "password"}
              placeholder={isEdit ? "•••••• (unchanged)" : "Min. 6 characters"}
              value={form.password}
              onChange={(e) => handleChange("password", e.target.value)}
              className="w-full px-3.5 pr-10 py-2.5 rounded-xl border border-slate-200 focus:outline-none focus:border-amber-500 font-mono"
            />
            <button
              type="button"
              onClick={() => setShowPassword(!showPassword)}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
            >
              {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
            </button>
          </div>
        </div>

        {/* Confirm Password */}
        {(form.password || !isEdit) && (
          <div>
            <label className="block text-slate-600 font-bold mb-1">Confirm Password *</label>
            <input
              type={showPassword ? "text" : "password"}
              placeholder="Re-enter password"
              value={form.confirmPassword}
              onChange={(e) => handleChange("confirmPassword", e.target.value)}
              className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 focus:outline-none focus:border-amber-500 font-mono"
            />
          </div>
        )}

        {/* Role selector */}
        <div>
          <label className="block text-slate-600 font-bold mb-2">Role *</label>
          <div className="grid grid-cols-2 gap-3">
            {ROLES.map(({ value, label, icon: Icon, description }) => (
              <button
                key={value}
                type="button"
                onClick={() => handleChange("role", value)}
                className={`p-3.5 rounded-xl border-2 text-left transition-all ${
                  form.role === value
                    ? "border-amber-500 bg-amber-50"
                    : "border-slate-200 hover:border-slate-300"
                }`}
              >
                <Icon className={`w-4 h-4 mb-1.5 ${form.role === value ? "text-amber-600" : "text-slate-400"}`} />
                <div className={`font-bold text-sm ${form.role === value ? "text-slate-900" : "text-slate-700"}`}>
                  {label}
                </div>
                <div className="text-[11px] text-slate-400 mt-0.5">{description}</div>
              </button>
            ))}
          </div>
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
            className="px-5 py-2.5 rounded-xl bg-amber-500 hover:bg-amber-600 text-slate-950 font-extrabold shadow-sm disabled:opacity-60"
          >
            {isSubmitting ? "Saving..." : isEdit ? "Save Changes" : "Create User"}
          </button>
        </div>
      </form>
    </Modal>
  );
};

export default AddUserModal;
