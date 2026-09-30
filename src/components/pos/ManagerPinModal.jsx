import React, { useState } from "react";
import Modal from "../common/Modal";
import { ShieldAlert, AlertCircle, User, Lock, Eye, EyeOff } from "lucide-react";
import { authorizeDiscount } from "../../services/api";
import { useAuth } from "../../context/AuthContext";

const ManagerAuthModal = ({ isOpen, onClose, onConfirm, title = "Manager Authorization Required", message }) => {
  const { token } = useAuth();
  const [managerUsername, setManagerUsername] = useState("");
  const [managerPassword, setManagerPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState("");
  const [isLoading, setIsLoading] = useState(false);

  const reset = () => {
    setManagerUsername(""); setManagerPassword(""); setError(""); setShowPassword(false);
  };

  const handleClose = () => { reset(); onClose(); };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!managerUsername.trim() || !managerPassword.trim()) {
      setError("Manager username and password are required.");
      return;
    }

    setIsLoading(true);
    try {
      const result = await authorizeDiscount(managerUsername.trim(), managerPassword, token);
      onConfirm({ managerName: result.manager_name, managerId: result.manager_id });
      reset();
      onClose();
    } catch (err) {
      setError(err.message || "Authorization failed. Invalid credentials.");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Modal isOpen={isOpen} onClose={handleClose} title={title}>
      <form onSubmit={handleSubmit} className="space-y-4 text-xs font-medium text-slate-700">
        <div className="p-3 rounded-xl bg-amber-50 border border-amber-200/80 text-amber-900 flex items-start gap-2.5">
          <ShieldAlert className="w-5 h-5 text-amber-600 shrink-0 mt-0.5" />
          <p className="leading-relaxed font-semibold">
            {message || "Please enter manager credentials to confirm this action."}
          </p>
        </div>

        {error && (
          <div className="p-3 rounded-xl bg-rose-50 border border-rose-200 text-rose-800 text-xs font-bold flex items-center gap-2">
            <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" />
            <span>{error}</span>
          </div>
        )}

        <div>
          <label className="block text-slate-600 font-bold mb-1">Manager Username *</label>
          <div className="relative">
            <User className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate-400" />
            <input
              type="text"
              autoFocus
              placeholder="Manager username"
              value={managerUsername}
              onChange={(e) => { setManagerUsername(e.target.value); setError(""); }}
              className="w-full pl-9 pr-3.5 py-2.5 rounded-xl border border-slate-200 focus:outline-none focus:border-amber-500 text-sm font-mono"
            />
          </div>
        </div>

        <div>
          <label className="block text-slate-600 font-bold mb-1">Manager Password *</label>
          <div className="relative">
            <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate-400" />
            <input
              type={showPassword ? "text" : "password"}
              placeholder="Manager password"
              value={managerPassword}
              onChange={(e) => { setManagerPassword(e.target.value); setError(""); }}
              className="w-full pl-9 pr-10 py-2.5 rounded-xl border border-slate-200 focus:outline-none focus:border-amber-500 text-sm font-mono"
            />
            <button
              type="button"
              onClick={() => setShowPassword(!showPassword)}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
            >
              {showPassword ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
            </button>
          </div>
        </div>

        <div className="pt-4 border-t border-slate-100 flex justify-end gap-3">
          <button
            type="button"
            onClick={handleClose}
            className="px-4 py-2.5 rounded-xl border border-slate-200 font-bold hover:bg-slate-100 text-slate-700"
          >
            Cancel
          </button>
          <button
            type="submit"
            disabled={isLoading}
            className="px-5 py-2.5 rounded-xl bg-slate-900 hover:bg-slate-800 text-white font-extrabold shadow-md disabled:opacity-60"
          >
            {isLoading ? "Verifying..." : "Authorize & Confirm"}
          </button>
        </div>
      </form>
    </Modal>
  );
};

export default ManagerAuthModal;
