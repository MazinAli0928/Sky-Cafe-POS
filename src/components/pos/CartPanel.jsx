import React, { useState } from "react";
import {
  Plus,
  Minus,
  Trash2,
  Printer,
  RefreshCw,
  ShoppingBag,
  Banknote,
  QrCode,
  CreditCard,
  Tag,
  ShieldAlert,
  X
} from "lucide-react";
import { useCart } from "../../context/CartContext";
import { useSettings } from "../../context/SettingsContext";
import { useToast } from "../../context/ToastContext";
import { printOrderReceipt } from "../../services/api";
import { printThermalReceipt } from "../../services/bluetoothPrinter";
import DiscountModal from "./DiscountModal";
import ManagerAuthModal from "./ManagerPinModal";

const CartPanel = ({ onPrintSuccess }) => {
  const { settings } = useSettings();
  const { addToast } = useToast();
  const {
    cartItems,
    updateQuantity,
    removeFromCart,
    clearCart,
    paymentMethod,
    setPaymentMethod,
    subtotal,
    discountData,
    calculatedDiscountAmount,
    removeDiscount,
    applyDiscount,
    tax,
    total,
    currentBillNo,
    placeOrder
  } = useCart();

  const [isDiscountModalOpen, setIsDiscountModalOpen] = useState(false);
  const [isRemoveAuthModalOpen, setIsRemoveAuthModalOpen] = useState(false);
  const [isPrinting, setIsPrinting] = useState(false);

  const handlePrint = async () => {
    if (isPrinting) return;
    setIsPrinting(true);
    try {
      const newOrder = await placeOrder();
      if (newOrder) {
        // Primary: Backend COM8 ESC/POS Printer
        try {
          await printOrderReceipt(newOrder.id);
          addToast(`Receipt printed on COM8 for Bill #${newOrder.billNo || newOrder.bill_no}`, "success");
        } catch (backendPrintErr) {
          console.warn("Backend COM8 print failed, trying Web Bluetooth fallback:", backendPrintErr);
          // Fallback to Web Bluetooth printer
          try {
            await printThermalReceipt(newOrder, settings);
          } catch (btErr) {
            addToast(`Printer warning: ${backendPrintErr.message}`, "warning");
          }
        }

        if (onPrintSuccess) {
          onPrintSuccess(newOrder);
        }
      }
    } finally {
      setIsPrinting(false);
    }
  };

  const handleRemoveDiscountConfirmed = () => {
    removeDiscount();
  };

  return (
    <aside className="w-full lg:w-96 bg-white border-l border-slate-200 flex flex-col h-full shrink-0 shadow-sm z-10 select-none">
      {/* Panel Header */}
      <div className="p-4 border-b border-slate-200 bg-slate-50/70 flex items-center justify-between">
        <div>
          <h3 className="font-extrabold text-slate-800 text-sm tracking-wide uppercase">
            Current Order
          </h3>
          <div className="flex items-center gap-2 text-xs text-slate-500 mt-0.5">
            <span className="font-bold text-amber-600">Bill #{currentBillNo}</span>
            <span>•</span>
            <span>20 Sep 2026</span>
          </div>
        </div>
        <button
          onClick={clearCart}
          disabled={cartItems.length === 0}
          title="Clear Order"
          className="p-2 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-xl transition-colors disabled:opacity-30 disabled:hover:bg-transparent disabled:hover:text-slate-400"
        >
          <RefreshCw className="w-4 h-4" />
        </button>
      </div>

      {/* Cart Items List */}
      <div className="flex-1 overflow-y-auto p-4 space-y-3 divide-y divide-slate-100">
        {cartItems.length === 0 ? (
          <div className="h-full flex flex-col items-center justify-center text-center py-12">
            <div className="w-14 h-14 rounded-2xl bg-amber-50 border border-amber-200/60 flex items-center justify-center text-amber-500 mb-3">
              <ShoppingBag className="w-7 h-7" />
            </div>
            <h4 className="text-sm font-bold text-slate-700">Order Cart Empty</h4>
            <p className="text-xs text-slate-400 max-w-[200px] mt-1">
              Select products from menu to add to order bill.
            </p>
          </div>
        ) : (
          cartItems.map((item) => (
            <div key={item.id} className="pt-3 first:pt-0 flex items-center justify-between gap-3">
              {/* Product Info */}
              <div className="flex-1 min-w-0">
                <h4 className="text-sm font-bold text-slate-800 truncate">{item.name}</h4>
                <div className="text-xs text-slate-500 font-medium">
                  {item.quantity} × ₹{item.price}
                </div>
              </div>

              {/* Quantity Controls */}
              <div className="flex items-center gap-1.5 bg-slate-100 p-1 rounded-xl border border-slate-200/80">
                <button
                  onClick={() => updateQuantity(item.id, -1)}
                  className="w-6 h-6 rounded-lg bg-white text-slate-700 hover:bg-slate-200 flex items-center justify-center shadow-xs transition-colors"
                >
                  <Minus className="w-3 h-3 stroke-[2.5]" />
                </button>
                <span className="w-6 text-center text-xs font-bold text-slate-800">
                  {item.quantity}
                </span>
                <button
                  onClick={() => updateQuantity(item.id, 1)}
                  className="w-6 h-6 rounded-lg bg-white text-slate-700 hover:bg-slate-200 flex items-center justify-center shadow-xs transition-colors"
                >
                  <Plus className="w-3 h-3 stroke-[2.5]" />
                </button>
              </div>

              {/* Total & Remove */}
              <div className="text-right min-w-[65px]">
                <div className="text-sm font-extrabold text-slate-900">₹{item.total}</div>
                <button
                  onClick={() => removeFromCart(item.id)}
                  className="text-[10px] text-rose-500 hover:text-rose-700 font-medium inline-flex items-center gap-0.5 mt-0.5"
                >
                  <Trash2 className="w-3 h-3" />
                  <span>Remove</span>
                </button>
              </div>
            </div>
          ))
        )}
      </div>

      {/* Order Summary & Manager Discount Section */}
      <div className="p-4 border-t border-slate-200 bg-slate-50/50 space-y-4">
        <div className="space-y-2 text-xs text-slate-600 font-medium">
          {/* Subtotal */}
          <div className="flex justify-between">
            <span>Subtotal</span>
            <span className="font-semibold text-slate-800">₹{subtotal}</span>
          </div>

          {/* Manager Discount Row */}
          <div className="flex items-center justify-between py-1 border-y border-dashed border-slate-200/80">
            <div className="flex items-center gap-1.5">
              <Tag className="w-3.5 h-3.5 text-amber-600" />
              <span className="font-bold text-slate-700">Discount</span>
              {discountData && (
                <span className="text-[10px] font-extrabold px-1.5 py-0.5 rounded bg-amber-100 text-amber-800 border border-amber-200">
                  {discountData.type === "percentage" ? `${discountData.value}%` : `₹${discountData.value}`}
                </span>
              )}
            </div>

            {discountData ? (
              <div className="flex items-center gap-2">
                <span className="font-extrabold text-emerald-600">-₹{calculatedDiscountAmount}</span>
                <button
                  onClick={() => setIsRemoveAuthModalOpen(true)}
                  className="text-[10px] font-bold text-rose-600 hover:text-rose-800 bg-rose-50 hover:bg-rose-100 px-1.5 py-0.5 rounded border border-rose-200 flex items-center gap-0.5"
                  title="Remove Manager Discount"
                >
                  <X className="w-3 h-3" />
                  <span>Remove</span>
                </button>
              </div>
            ) : (
              <button
                onClick={() => setIsDiscountModalOpen(true)}
                disabled={cartItems.length === 0}
                className="text-xs font-extrabold text-amber-600 hover:text-amber-700 hover:underline flex items-center gap-1 disabled:opacity-40 disabled:no-underline"
              >
                <span>+ Add Discount</span>
              </button>
            )}
          </div>

          {/* Tax */}
          <div className="flex justify-between">
            <span>Tax (GST)</span>
            <span>₹{tax}</span>
          </div>

          {/* Prominent TOTAL */}
          <div className="border-t border-slate-300 pt-2 flex justify-between items-baseline">
            <span className="text-sm font-extrabold text-slate-900 uppercase">TOTAL</span>
            <span className="text-2xl font-black text-amber-600">₹{total}</span>
          </div>
        </div>

        {/* Payment Method Selector */}
        <div className="space-y-1.5">
          <label className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">
            Payment Method
          </label>
          <div className="grid grid-cols-3 gap-2">
            {[
              { key: "CASH", label: "CASH", icon: Banknote },
              { key: "UPI", label: "UPI", icon: QrCode },
              { key: "CARD", label: "CARD", icon: CreditCard }
            ].map(({ key, label, icon: Icon }) => (
              <button
                key={key}
                onClick={() => setPaymentMethod(key)}
                className={`py-2 px-1 rounded-xl text-xs font-bold flex flex-col items-center gap-1 transition-all border ${
                  paymentMethod === key
                    ? "bg-slate-900 text-amber-400 border-slate-900 shadow-sm"
                    : "bg-white text-slate-600 border-slate-200 hover:bg-slate-100"
                }`}
              >
                <Icon className="w-4 h-4" />
                <span>{label}</span>
              </button>
            ))}
          </div>
        </div>

        {/* Action Buttons */}
        <div className="space-y-2 pt-1">
          <button
            onClick={handlePrint}
            disabled={cartItems.length === 0 || isPrinting}
            className="w-full py-3.5 px-4 rounded-xl bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-600 hover:to-amber-700 text-slate-950 font-black text-sm tracking-wide shadow-lg shadow-amber-500/20 flex items-center justify-center gap-2 transition-all duration-200 disabled:opacity-40 disabled:cursor-not-allowed disabled:shadow-none"
          >
            <Printer className="w-5 h-5 stroke-[2.5]" />
            <span>{isPrinting ? "PROCESSING..." : "PRINT BILL"}</span>
          </button>

          <button
            onClick={clearCart}
            disabled={cartItems.length === 0}
            className="w-full py-2 px-4 rounded-xl bg-white hover:bg-rose-50 text-slate-600 hover:text-rose-600 font-bold text-xs border border-slate-200 transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
          >
            CLEAR ORDER
          </button>
        </div>
      </div>

      {/* Apply Discount Modal */}
      <DiscountModal
        isOpen={isDiscountModalOpen}
        onClose={() => setIsDiscountModalOpen(false)}
        subtotal={subtotal}
        onApplyDiscount={applyDiscount}
      />

      {/* Remove Discount Authorization Modal */}
      <ManagerAuthModal
        isOpen={isRemoveAuthModalOpen}
        onClose={() => setIsRemoveAuthModalOpen(false)}
        onConfirm={handleRemoveDiscountConfirmed}
        title="Authorize Discount Removal"
        message="Please enter Manager credentials to remove the applied discount."
      />
    </aside>
  );
};

export default CartPanel;
