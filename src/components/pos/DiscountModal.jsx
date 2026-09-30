import React, { useState } from "react";
import Modal from "../common/Modal";
import { ShieldCheck, Percent, DollarSign, AlertCircle, User, Lock, Eye, EyeOff } from "lucide-react";
import { authorizeDiscount } from "../../services/api";
import { useAuth } from "../../context/AuthContext";

const DiscountModal = ({ isOpen, onClose, subtotal, onApplyDiscount }) => {
  const { token, user } = useAuth();
  const [discountType, setDiscountType] = useState("percentage");
  const [value, setValue] = useState("");
  const [reason, setReason] = useState("");
  const [managerUsername, setManagerUsername] = useState("");
  const [managerPassword, setManagerPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState("");
  const [isAuthorizing, setIsAuthorizing] = useState(false);

  const reset = () => {
    setValue(""); setReason(""); setManagerUsername("");
    setManagerPassword(""); setError(""); setShowPassword(false);
  };

  const handleClose = () => { reset(); onClose(); };

  const handleApply = async (e) => {
    e.preventDefault();
    setError("");

    const numValue = Number(value);
    if (isNaN(numValue) || numValue <= 0) {
      setError("Please enter a valid discount value greater than 0.");
      return;
    }
    if (discountType === "percentage" && numValue > 100) {
      setError("Percentage discount cannot exceed 100%.");
      return;
    }
    if (discountType === "fixed" && numValue > subtotal) {
      setError(`Fixed discount (₹${numValue}) cannot exceed subtotal (₹${subtotal}).`);
      return;
    }
    if (!managerUsername.trim()) {
      setError("Manager username is required.");
      return;
    }
    if (!managerPassword.trim()) {
      setError("Manager password is required.");
      return;
    }

    setIsAuthorizing(true);
    try {
      const result = await authorizeDiscount(managerUsername.trim(), managerPassword, token);

      const discountAmount =
        discountType === "percentage"
          ? Math.round((subtotal * numValue) / 100)
          : numValue;

      onApplyDiscount({
        type: discountType,
        value: numValue,
        amount: discountAmount,
        reason: reason.trim() || "Customer Promotion",
        managerAuthorized: true,
        managerName: result.manager_name,
        managerUsername: managerUsername.trim(),
        managerPassword: managerPassword  // passed to backend on order creation
      });

      reset();
      onClose();
    } catch (err) {
      setError(err.message || "Manager authorization failed.");
    } finally {
      setIsAuthorizing(false);
    }
  };

  return (
    <Modal isOpen={isOpen} onClose={handleClose} title="Apply Manager Discount">
      <form onSubmit={handleApply} className="space-y-4 text-xs font-medium text-slate-700">
        {/* Notice */}
        <div className="p-3 rounded-xl bg-amber-50 border border-amber-200/80 text-[11px] text-amber-900 flex items-start gap-2">
          <ShieldCheck className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
          <span>
            Discounts require <strong>manager authorization</strong>. A cashier cannot authorize their own discount.
          </span>
        </div>

        {error && (
          <div className="p-3 rounded-xl bg-rose-50 border border-rose-200 text-rose-800 text-xs font-bold flex items-center gap-2">
            <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" />
            <span>{error}</span>
          </div>
        )}

        {/* Discount Type */}
        <div>
          <label className="block text-slate-600 font-bold mb-1.5 uppercase tracking-wider text-[10px]">
            Discount Type
          </label>
          <div className="grid grid-cols-2 gap-3">
            {[
              { type: "percentage", label: "Percentage (%)", icon: Percent },
              { type: "fixed", label: "Fixed Amount (₹)", icon: DollarSign }
            ].map(({ type, label, icon: Icon }) => (
              <button
                key={type}
                type="button"
                onClick={() => { setDiscountType(type); setError(""); }}
                className={`py-2.5 px-3 rounded-xl font-bold flex items-center justify-center gap-2 border transition-all ${
                  discountType === type
                    ? "bg-slate-900 text-amber-400 border-slate-900 shadow-sm"
                    : "bg-white text-slate-600 border-slate-200 hover:bg-slate-50"
                }`}
              >
                <Icon className="w-4 h-4" />
                <span>{label}</span>
              </button>
            ))}
          </div>
        </div>

        {/* Value */}
        <div>
          <label className="block text-slate-600 font-bold mb-1">
            {discountType === "percentage" ? "Discount Percentage (%) *" : "Discount Amount (₹) *"}
          </label>
          <input
            type="number"
            required
            min="0"
            max={discountType === "percentage" ? 100 : subtotal}
            step="any"
            placeholder={discountType === "percentage" ? "e.g. 10" : `Max ₹${subtotal}`}
            value={value}
            onChange={(e) => { setValue(e.target.value); setError(""); }}
            className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 focus:outline-none focus:border-amber-500 text-sm font-semibold"
          />
        </div>

        {/* Reason */}
        <div>
          <label className="block text-slate-600 font-bold mb-1">Reason / Note</label>
          <input
            type="text"
            placeholder="e.g. Customer promotion / Staff discount"
            value={reason}
            onChange={(e) => setReason(e.target.value)}
            className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 focus:outline-none focus:border-amber-500 text-sm"
          />
        </div>

        {/* Manager Authorization */}
        <div className="p-3.5 rounded-xl border border-slate-200 bg-slate-50 space-y-3">
          <div className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">
            Manager Authorization
          </div>
          <div>
            <label className="block text-slate-600 font-bold mb-1">Manager Username *</label>
            <div className="relative">
              <User className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate-400" />
              <input
                type="text"
                placeholder="Enter manager username"
                value={managerUsername}
                onChange={(e) => { setManagerUsername(e.target.value); setError(""); }}
                className="w-full pl-9 pr-3.5 py-2.5 rounded-xl border border-slate-200 focus:outline-none focus:border-amber-500 text-sm font-mono bg-white"
              />
            </div>
          </div>
          <div>
            <label className="block text-slate-600 font-bold mb-1">Manager Password *</label>
            <div className="relative">
              <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate-400" />
              <input
                type={showPassword ? "text" : "password"}
                placeholder="Enter manager password"
                value={managerPassword}
                onChange={(e) => { setManagerPassword(e.target.value); setError(""); }}
                className="w-full pl-9 pr-10 py-2.5 rounded-xl border border-slate-200 focus:outline-none focus:border-amber-500 text-sm font-mono bg-white"
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
        </div>

        {/* Buttons */}
        <div className="pt-3 border-t border-slate-100 flex justify-end gap-3">
          <button
            type="button"
            onClick={handleClose}
            className="px-4 py-2.5 rounded-xl border border-slate-200 font-bold hover:bg-slate-100 text-slate-700"
          >
            Cancel
          </button>
          <button
            type="submit"
            disabled={isAuthorizing}
            className="px-5 py-2.5 rounded-xl bg-amber-500 hover:bg-amber-600 text-slate-950 font-extrabold shadow-md shadow-amber-500/20 disabled:opacity-60"
          >
            {isAuthorizing ? "Authorizing..." : "Apply Discount"}
          </button>
        </div>
      </form>
    </Modal>
  );
};

export default DiscountModal;
