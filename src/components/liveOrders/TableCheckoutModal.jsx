import React, { useState, useEffect } from "react";
import {
  Banknote,
  QrCode,
  CreditCard,
  Printer,
  ShieldAlert,
  Tag,
  CheckCircle2,
  X,
  AlertTriangle
} from "lucide-react";
import {
  getLiveOrder,
  checkoutLiveOrder,
  printOrderReceipt
} from "../../services/api";
import { printThermalReceipt } from "../../services/bluetoothPrinter";
import { useSettings } from "../../context/SettingsContext";
import { useToast } from "../../context/ToastContext";
import Modal from "../common/Modal";
import DiscountModal from "../pos/DiscountModal";

const TableCheckoutModal = ({
  isOpen,
  onClose,
  orderId,
  tableNo,
  tableName,
  onCheckoutSuccess
}) => {
  const { settings } = useSettings();
  const { addToast } = useToast();

  const [order, setOrder] = useState(null);
  const [loading, setLoading] = useState(true);
  const [checkingOut, setCheckingOut] = useState(false);

  const [paymentMethod, setPaymentMethod] = useState("UPI");
  const [taxRate, setTaxRate] = useState(0);

  // Discount state
  const [discountData, setDiscountData] = useState(null);
  const [isDiscountModalOpen, setIsDiscountModalOpen] = useState(false);

  useEffect(() => {
    if (isOpen && orderId) {
      setLoading(true);
      getLiveOrder(orderId)
        .then((data) => {
          setOrder(data);
          setDiscountData(null);
        })
        .catch((err) => {
          addToast(err.message || "Failed to load order details", "error");
        })
        .finally(() => setLoading(false));
    }
  }, [isOpen, orderId]);

  if (!isOpen || !order) return null;

  const subtotal = order.subtotal || 0;

  // Compute calculated discount
  let calculatedDiscount = 0;
  if (discountData && discountData.value > 0) {
    if (discountData.type === "percentage") {
      calculatedDiscount = Math.round((subtotal * discountData.value) / 100);
    } else {
      calculatedDiscount = Math.min(discountData.value, subtotal);
    }
  }

  const taxableAmount = Math.max(0, subtotal - calculatedDiscount);
  const calculatedTax = Math.round((taxableAmount * taxRate) / 100);
  const finalTotal = taxableAmount + calculatedTax;

  const handleApplyDiscount = (dPayload) => {
    setDiscountData(dPayload);
    addToast(
      `Manager discount (${dPayload.type === "percentage" ? `${dPayload.value}%` : `₹${dPayload.value}`}) applied`,
      "success"
    );
  };

  const handleRemoveDiscount = () => {
    setDiscountData(null);
    addToast("Discount removed", "info");
  };

  const handleConfirmCheckout = async () => {
    if (checkingOut) return;
    setCheckingOut(true);

    try {
      const payload = {
        payment_method: paymentMethod,
        discount: discountData
          ? {
              type: discountData.type,
              value: discountData.value,
              reason: discountData.reason || "Table Discount",
              manager_username: discountData.manager_username,
              manager_password: discountData.manager_password
            }
          : null,
        tax_rate: taxRate
      };

      const completedOrder = await checkoutLiveOrder(orderId, payload);
      addToast(
        `Table ${tableNo} checked out! Bill #${completedOrder.bill_no} generated.`,
        "success"
      );

      // Attempt thermal print via backend or Web Bluetooth fallback
      try {
        await printOrderReceipt(completedOrder.id);
      } catch (printErr) {
        console.warn("Backend print error, trying Web Bluetooth:", printErr);
        try {
          await printThermalReceipt(completedOrder, settings);
        } catch (btErr) {
          addToast("Bill saved! Thermal printer not reachable.", "warning");
        }
      }

      onCheckoutSuccess(completedOrder);
      onClose();
    } catch (err) {
      addToast(err.message || "Checkout failed", "error");
    } finally {
      setCheckingOut(false);
    }
  };

  return (
    <>
      <Modal isOpen={isOpen} onClose={onClose} size="lg" title="">
        <div className="flex flex-col -m-6 max-h-[90vh] overflow-hidden">
          {/* Header */}
          <div className="px-6 py-4 bg-slate-900 text-white flex items-center justify-between border-b border-slate-800">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-amber-500 text-slate-950 flex items-center justify-center font-black text-base">
                {tableNo}
              </div>
              <div>
                <h3 className="font-extrabold text-base tracking-wide text-white">
                  Checkout — {tableName || `Table ${tableNo}`}
                </h3>
                <p className="text-xs text-slate-400 mt-0.5">
                  Confirm payment and generate final tax invoice
                </p>
              </div>
            </div>
            <button
              onClick={onClose}
              className="p-2 text-slate-400 hover:text-white rounded-xl transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* Modal Body */}
          <div className="p-6 space-y-5 overflow-y-auto">
            {/* Items Summary Table */}
            <div>
              <h4 className="text-xs font-bold text-slate-700 uppercase tracking-wider mb-2">
                Order Items ({order.items.length})
              </h4>
              <div className="border border-slate-200 rounded-xl divide-y divide-slate-100 max-h-48 overflow-y-auto">
                {order.items.map((item) => (
                  <div
                    key={item.id}
                    className="px-3.5 py-2.5 flex items-center justify-between text-xs"
                  >
                    <div>
                      <span className="font-bold text-slate-800">{item.product_name}</span>
                      <span className="text-slate-400 ml-2">× {item.quantity}</span>
                    </div>
                    <span className="font-extrabold text-slate-900">
                      ₹{item.total_price.toFixed(2)}
                    </span>
                  </div>
                ))}
              </div>
            </div>

            {/* Discount & Bill Breakdown */}
            <div className="p-4 bg-slate-50 border border-slate-200 rounded-xl space-y-2.5 text-xs">
              <div className="flex justify-between text-slate-600">
                <span>Subtotal:</span>
                <span className="font-bold text-slate-800">₹{subtotal.toFixed(2)}</span>
              </div>

              {/* Discount Row */}
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <span className="text-slate-600">Discount:</span>
                  {discountData ? (
                    <button
                      onClick={handleRemoveDiscount}
                      className="text-[10px] text-rose-500 font-bold hover:underline"
                    >
                      (Remove)
                    </button>
                  ) : (
                    <button
                      onClick={() => setIsDiscountModalOpen(true)}
                      className="text-[10px] text-amber-600 font-bold hover:underline flex items-center gap-1"
                    >
                      <Tag className="w-3 h-3" />
                      Apply Manager Discount
                    </button>
                  )}
                </div>
                <span className="font-bold text-emerald-600">
                  {calculatedDiscount > 0 ? `-₹${calculatedDiscount.toFixed(2)}` : "₹0.00"}
                </span>
              </div>

              <div className="flex justify-between text-slate-600">
                <span>Tax:</span>
                <span className="font-bold text-slate-800">₹{calculatedTax.toFixed(2)}</span>
              </div>

              <div className="pt-2 border-t border-slate-200 flex justify-between items-baseline">
                <span className="font-extrabold text-sm text-slate-900">Final Payable:</span>
                <span className="text-xl font-black text-amber-600">
                  ₹{finalTotal.toFixed(2)}
                </span>
              </div>
            </div>

            {/* Payment Method Selector */}
            <div>
              <h4 className="text-xs font-bold text-slate-700 uppercase tracking-wider mb-2">
                Payment Method
              </h4>
              <div className="grid grid-cols-3 gap-3">
                {[
                  { id: "UPI", label: "UPI", icon: QrCode, color: "text-emerald-600" },
                  { id: "CASH", label: "Cash", icon: Banknote, color: "text-amber-600" },
                  { id: "CARD", label: "Card", icon: CreditCard, color: "text-indigo-600" }
                ].map((m) => {
                  const Icon = m.icon;
                  const isSelected = paymentMethod === m.id;
                  return (
                    <button
                      key={m.id}
                      type="button"
                      onClick={() => setPaymentMethod(m.id)}
                      className={`p-3 rounded-xl border flex flex-col items-center justify-center gap-1.5 font-bold text-xs transition-all ${
                        isSelected
                          ? "border-amber-500 bg-amber-500/10 text-slate-950 ring-2 ring-amber-500/30"
                          : "border-slate-200 bg-white text-slate-600 hover:bg-slate-50"
                      }`}
                    >
                      <Icon className={`w-5 h-5 ${m.color}`} />
                      <span>{m.label}</span>
                    </button>
                  );
                })}
              </div>
            </div>
          </div>

          {/* Footer Action */}
          <div className="p-5 bg-slate-50 border-t border-slate-200 flex items-center justify-end gap-3">
            <button
              onClick={onClose}
              disabled={checkingOut}
              className="px-4 py-2.5 rounded-xl border border-slate-200 font-bold text-xs text-slate-700 hover:bg-slate-100 transition-colors"
            >
              Cancel
            </button>
            <button
              onClick={handleConfirmCheckout}
              disabled={checkingOut}
              className="px-6 py-2.5 rounded-xl bg-amber-500 hover:bg-amber-600 text-slate-950 font-black text-xs shadow-md shadow-amber-500/20 transition-all flex items-center gap-2"
            >
              <Printer className="w-4 h-4 stroke-[2.5]" />
              <span>{checkingOut ? "Finalizing Payment..." : "Confirm & Print Bill"}</span>
            </button>
          </div>
        </div>
      </Modal>

      {/* Discount Authorization Modal */}
      <DiscountModal
        isOpen={isDiscountModalOpen}
        onClose={() => setIsDiscountModalOpen(false)}
        onApplyDiscount={handleApplyDiscount}
        subtotal={subtotal}
      />
    </>
  );
};

export default TableCheckoutModal;
