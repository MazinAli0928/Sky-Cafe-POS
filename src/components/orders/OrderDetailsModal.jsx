import React, { useState } from "react";
import Modal from "../common/Modal";
import ReceiptPreview from "../common/ReceiptPreview";
import StatusBadge from "../common/StatusBadge";
import ConfirmModal from "../common/ConfirmModal";
import { Printer, ShieldCheck, Tag, XCircle } from "lucide-react";
import { useAuth } from "../../context/AuthContext";
import { useSettings } from "../../context/SettingsContext";
import { useToast } from "../../context/ToastContext";
import { printOrderReceipt } from "../../services/api";
import { printThermalReceipt } from "../../services/bluetoothPrinter";

const OrderDetailsModal = ({ isOpen, onClose, order, onCancelOrder }) => {
  const { isManager } = useAuth();
  const { settings } = useSettings();
  const { addToast } = useToast();
  const [showConfirmVoid, setShowConfirmVoid] = useState(false);
  const [isVoiding, setIsVoiding] = useState(false);

  if (!order) return null;

  const handlePrintAgain = async () => {
    try {
      addToast(`Re-printing receipt for Bill #${order.billNo || order.bill_no}...`, "info");
      await printOrderReceipt(order.id);
      addToast(`Receipt printed on COM8 for Bill #${order.billNo || order.bill_no}`, "success");
    } catch (err) {
      console.warn("Backend print failed, falling back to Web Bluetooth:", err);
      try {
        await printThermalReceipt(order, settings);
      } catch (btErr) {
        addToast(`Print failed: ${err.message}`, "error");
      }
    }
  };

  const handleConfirmCancel = async () => {
    if (!onCancelOrder) return;
    setIsVoiding(true);
    try {
      await onCancelOrder(order.id);
      setShowConfirmVoid(false);
      onClose();
    } finally {
      setIsVoiding(false);
    }
  };

  const discountAmount = order.discountAmount ?? order.discount ?? 0;

  return (
    <>
      <Modal
        isOpen={isOpen}
        onClose={onClose}
        title={`Bill #${order.billNo} Details`}
        maxWidth="max-w-4xl"
      >
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
          {/* Left Side: Order Information Breakdown (col-span-7) */}
          <div className="lg:col-span-7 space-y-4 text-xs font-medium min-w-0">
            {/* Header Metadata */}
            <div className="p-4 rounded-xl bg-slate-50 border border-slate-200/80 space-y-2">
              <div className="flex justify-between items-center">
                <span className="text-slate-500">Bill Number</span>
                <span className="font-extrabold text-sm text-slate-800">#{order.billNo}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500">Date & Time</span>
                <span className="font-semibold text-slate-700">
                  {order.date} at {order.time}
                </span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-slate-500">Status</span>
                <StatusBadge status={order.status || "Paid"} />
              </div>
              <div className="flex justify-between items-center">
                <span className="text-slate-500">Cashier</span>
                <span className="font-bold text-slate-800">{order.cashierName || "System"}</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-slate-500">Payment Method</span>
                <span className="font-bold text-amber-600 bg-amber-50 px-2.5 py-1 rounded-md border border-amber-200">
                  {order.paymentMethod}
                </span>
              </div>
            </div>

            {/* Items Summary Table */}
            <div className="space-y-2">
              <h4 className="font-bold text-slate-700 text-xs uppercase tracking-wider flex items-center justify-between">
                <span>Order Items ({order.items.length})</span>
              </h4>
              <div className="border border-slate-200 rounded-xl overflow-hidden divide-y divide-slate-100 bg-white">
                {order.items.map((item, idx) => {
                  const unitPrice = item.price || (item.total / item.quantity);
                  const itemTotal = item.total || (item.price * item.quantity);
                  return (
                    <div key={idx} className="p-3 flex items-center justify-between gap-3">
                      <div className="min-w-0 flex-1">
                        <div className="font-bold text-slate-800 truncate">{item.name}</div>
                        <div className="text-slate-500 text-[11px]">
                          {item.quantity} × ₹{unitPrice}
                        </div>
                      </div>
                      <div className="font-extrabold text-slate-900 shrink-0">
                        ₹{itemTotal}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Financial Summary & Manager Discount Breakdown */}
            <div className="p-4 rounded-xl bg-slate-100/80 border border-slate-200 space-y-2">
              <div className="flex justify-between text-slate-600">
                <span>Subtotal</span>
                <span className="font-semibold text-slate-800">₹{order.subtotal}</span>
              </div>

              {/* Discount Section Details */}
              {discountAmount > 0 && (
                <div className="p-2.5 rounded-lg bg-emerald-50 border border-emerald-200/80 space-y-1 text-[11px]">
                  <div className="flex justify-between text-emerald-800 font-bold">
                    <div className="flex items-center gap-1">
                      <Tag className="w-3.5 h-3.5 text-emerald-600" />
                      <span>
                        Discount {order.discountType === "percentage" ? `(${order.discountValue}%)` : "(Fixed)"}
                      </span>
                    </div>
                    <span>-₹{discountAmount}</span>
                  </div>
                  {order.discountReason && (
                    <div className="text-slate-500 text-[10px]">
                      Reason: <span className="font-medium text-slate-700">{order.discountReason}</span>
                    </div>
                  )}
                  {order.managerAuthorized && (
                    <div className="text-emerald-700 font-semibold text-[10px] flex items-center gap-1 pt-0.5">
                      <ShieldCheck className="w-3 h-3 text-emerald-600" />
                      <span>Authorized by: {order.managerName || "Manager"}</span>
                    </div>
                  )}
                </div>
              )}

              {order.tax > 0 && (
                <div className="flex justify-between text-slate-600">
                  <span>Tax</span>
                  <span>₹{order.tax}</span>
                </div>
              )}

              <div className="flex justify-between font-extrabold text-base text-slate-900 pt-2 border-t border-slate-300">
                <span>TOTAL PAID</span>
                <span className="text-amber-600">₹{order.total}</span>
              </div>
            </div>
          </div>

          {/* Right Side: Thermal Receipt Preview (col-span-5) */}
          <div className="lg:col-span-5 flex flex-col items-center justify-start min-w-0 w-full">
            <ReceiptPreview order={order} />
          </div>
        </div>

        {/* Footer Modal Actions */}
        <div className="mt-6 pt-4 border-t border-slate-100 flex items-center justify-between gap-3 shrink-0">
          <div>
            {isManager && order.status !== "Cancelled" && (
              <button
                onClick={() => setShowConfirmVoid(true)}
                className="px-3.5 py-2.5 rounded-xl border border-rose-200 text-rose-600 bg-rose-50 hover:bg-rose-100 font-bold text-xs flex items-center gap-1.5 transition-colors"
              >
                <XCircle className="w-4 h-4" />
                <span>Cancel / Void Order</span>
              </button>
            )}
          </div>

          <div className="flex items-center gap-3">
            <button
              onClick={onClose}
              className="px-4 py-2.5 rounded-xl border border-slate-200 text-slate-700 hover:bg-slate-100 font-bold text-xs transition-colors"
            >
              Close
            </button>
            <button
              onClick={handlePrintAgain}
              className="px-5 py-2.5 rounded-xl bg-amber-500 hover:bg-amber-600 text-slate-950 font-extrabold text-xs shadow-md shadow-amber-500/20 flex items-center gap-2 transition-colors"
            >
              <Printer className="w-4 h-4 stroke-[2.5]" />
              <span>Print Again</span>
            </button>
          </div>
        </div>
      </Modal>

      <ConfirmModal
        isOpen={showConfirmVoid}
        onClose={() => setShowConfirmVoid(false)}
        onConfirm={handleConfirmCancel}
        title="Void / Cancel Order"
        message={`Are you sure you want to cancel Bill #${order.billNo}? This action will mark the transaction as Cancelled in database reports.`}
        confirmLabel={isVoiding ? "Cancelling..." : "Confirm Void"}
        isDangerous
      />
    </>
  );
};

export default OrderDetailsModal;
