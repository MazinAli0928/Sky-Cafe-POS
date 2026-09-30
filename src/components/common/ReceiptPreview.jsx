import React from "react";
import { Coffee } from "lucide-react";
import { useSettings } from "../../context/SettingsContext";

const ReceiptPreview = ({ order, customWidth }) => {
  const { settings } = useSettings();
  const widthOption = customWidth || settings.receipt.paperWidth || "80mm";

  // 58mm ≈ 240px width, 80mm ≈ 320px width
  const cardWidthClass = widthOption === "58mm" ? "w-[250px]" : "w-[330px]";

  const cafeName = settings.cafeInfo.name || "YOUR CAFE";
  const address = settings.cafeInfo.address || "Bengaluru, Karnataka";
  const phone = settings.cafeInfo.phone || "+91 98765 43210";
  const gstin = settings.cafeInfo.gstin || "29ABCDE1234F1Z5";
  const footerMessage = settings.receipt.footerMessage || "Thank you! Please visit again.";

  const billNo = order?.billNo || "1024";
  const date = order?.date || "20 Sep 2026";
  const time = order?.time || "14:32";
  const items = order?.items || [
    { name: "Chicken Strips", quantity: 2, price: 149, total: 298 },
    { name: "French Fries", quantity: 1, price: 99, total: 99 }
  ];

  const subtotal = order?.subtotal ?? items.reduce((a, i) => a + (i.total || i.price * i.quantity), 0);
  const discountAmount = order?.discountAmount ?? order?.discount ?? 0;
  const tax = order?.tax ?? 0;
  const total = order?.total ?? (subtotal - discountAmount + tax);
  const paymentMethod = order?.paymentMethod || "UPI";

  return (
    <div className="flex flex-col items-center justify-start p-4 bg-slate-900 rounded-2xl shadow-inner border border-slate-800 w-full max-w-full overflow-hidden select-none">
      <div className="text-[11px] text-slate-400 font-semibold mb-2.5 flex items-center gap-1.5 shrink-0">
        <span className="w-2 h-2 rounded-full bg-amber-400 animate-pulse" />
        <span>Thermal Receipt Preview ({widthOption})</span>
      </div>

      {/* Thermal Receipt Paper Card — height: auto to naturally expand vertically without clipping */}
      <div
        className={`${cardWidthClass} bg-white text-slate-900 p-4 sm:p-5 rounded-md shadow-2xl font-mono text-xs border border-slate-200 transition-all duration-300 leading-tight shrink-0 h-auto overflow-visible select-text`}
      >
        {/* Section 1: Logo & Header */}
        <div className="text-center space-y-1 pb-3 border-b border-dashed border-slate-300">
          <div className="font-extrabold text-sm tracking-wider uppercase text-slate-950">{cafeName}</div>

          {settings.receipt.showLogo && (
            <div className="my-2 flex justify-center">
              <img
                src="/logo.png"
                alt="Sky Cafe Logo"
                className="h-16 max-w-[150px] object-contain"
                onError={(e) => {
                  e.target.onerror = null;
                  e.target.style.display = "none";
                }}
              />
            </div>
          )}

          {settings.receipt.showAddress && (
            <div className="text-[10px] text-slate-600 px-1 break-words">{address}</div>
          )}

          {settings.receipt.showPhone && (
            <div className="text-[10px] text-slate-600">Ph: {phone}</div>
          )}

          {settings.receipt.showGst && gstin && (
            <div className="text-[10px] text-slate-500">GSTIN: {gstin}</div>
          )}
        </div>

        {/* Section 2: Bill Metadata */}
        <div className="py-2.5 border-b border-dashed border-slate-300 space-y-1 text-[11px]">
          <div className="flex justify-between">
            <span className="text-slate-500">Bill No:</span>
            <span className="font-bold text-slate-950">#{billNo}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-slate-500">Date:</span>
            <span>{date}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-slate-500">Time:</span>
            <span>{time}</span>
          </div>
        </div>

        {/* Section 3: 4-Column Aligned Receipt Item Table (ITEM, QTY, PRICE, AMOUNT) */}
        <div className="py-2.5 border-b border-dashed border-slate-300 space-y-2">
          {/* Table Header */}
          <div className="grid grid-cols-12 gap-1 font-bold text-[9px] text-slate-500 border-b border-slate-200 pb-1 uppercase tracking-wider">
            <span className="col-span-5">ITEM</span>
            <span className="col-span-2 text-center">QTY</span>
            <span className="col-span-2 text-right">PRICE</span>
            <span className="col-span-3 text-right">AMOUNT</span>
          </div>

          {/* Table Rows — Item name wraps gracefully without overlapping columns */}
          {items.map((item, idx) => {
            const itemPrice = item.price || (item.total / item.quantity);
            const itemAmount = item.total || (item.price * item.quantity);
            return (
              <div key={idx} className="grid grid-cols-12 gap-1 items-start text-[10px] leading-tight font-medium">
                <div className="col-span-5 font-semibold text-slate-900 break-words pr-1">
                  {item.name}
                </div>
                <div className="col-span-2 text-center text-slate-700">
                  {item.quantity}
                </div>
                <div className="col-span-2 text-right text-slate-600">
                  ₹{itemPrice}
                </div>
                <div className="col-span-3 text-right font-bold text-slate-950">
                  ₹{itemAmount}
                </div>
              </div>
            );
          })}
        </div>

        {/* Section 4: Totals Breakdown */}
        <div className="py-2.5 border-b border-dashed border-slate-300 space-y-1 text-[11px]">
          <div className="flex justify-between text-slate-600">
            <span>Subtotal</span>
            <span>₹{subtotal}</span>
          </div>

          {/* Discount Line — Only shown if discount > 0 */}
          {discountAmount > 0 && (
            <div className="flex justify-between text-emerald-600 font-semibold">
              <span>
                Discount {order?.discountType === "percentage" ? `(${order?.discountValue}%)` : ""}
              </span>
              <span>-₹{discountAmount}</span>
            </div>
          )}

          {tax > 0 && (
            <div className="flex justify-between text-slate-600">
              <span>Tax</span>
              <span>₹{tax}</span>
            </div>
          )}

          <div className="flex justify-between font-extrabold text-xs text-slate-950 pt-1.5 border-t border-slate-300">
            <span>TOTAL</span>
            <span>₹{total}</span>
          </div>
        </div>

        {/* Section 5: Payment & Footer Message */}
        <div className="pt-3 text-center space-y-2">
          <div className="text-[11px] font-semibold text-slate-700">
            Payment: <span className="uppercase text-amber-600 font-bold">{paymentMethod}</span>
          </div>
          <div className="text-[10px] font-bold tracking-widest text-slate-600 uppercase pt-2 border-t border-dashed border-slate-200 break-words">
            {footerMessage}
          </div>
        </div>
      </div>
    </div>
  );
};

export default ReceiptPreview;
