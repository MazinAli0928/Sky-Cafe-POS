import React from "react";
import { Users, Clock, ShoppingBag, ArrowRight, CheckCircle2, AlertCircle } from "lucide-react";

const TableCard = ({ table, onOpenTable, onViewOrder, onCheckout }) => {
  const isAvailable = table.status === "AVAILABLE";
  const isReady = table.status === "READY_FOR_CHECKOUT";
  const isOccupied = table.status === "OCCUPIED";

  // Calculate elapsed time from opened_at
  const getElapsedString = (openedAtStr) => {
    if (!openedAtStr) return "";
    try {
      const opened = new Date(openedAtStr);
      const now = new Date();
      const diffMins = Math.max(0, Math.floor((now - opened) / 60000));
      if (diffMins < 60) return `${diffMins} min ago`;
      const hrs = Math.floor(diffMins / 60);
      const remainingMins = diffMins % 60;
      return `${hrs}h ${remainingMins}m ago`;
    } catch {
      return "";
    }
  };

  return (
    <div
      className={`rounded-2xl border transition-all duration-200 flex flex-col justify-between p-4.5 select-none ${
        isAvailable
          ? "bg-white border-slate-200/90 hover:border-amber-400/80 hover:shadow-md"
          : isReady
          ? "bg-amber-50/40 border-amber-300 shadow-sm ring-1 ring-amber-400/30"
          : "bg-slate-900 border-slate-800 text-slate-100 shadow-sm"
      }`}
    >
      {/* Card Header: Table Name & Status Badge */}
      <div className="flex items-center justify-between gap-2 mb-3">
        <div className="flex items-center gap-2">
          <div
            className={`w-9 h-9 rounded-xl flex items-center justify-center font-black text-sm tracking-wide ${
              isAvailable
                ? "bg-slate-100 text-slate-700"
                : isReady
                ? "bg-amber-500 text-slate-950 font-extrabold"
                : "bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 font-bold"
            }`}
          >
            {table.table_no}
          </div>
          <div>
            <h4
              className={`font-extrabold text-sm tracking-wide leading-tight ${
                isAvailable ? "text-slate-800" : isReady ? "text-amber-900" : "text-white"
              }`}
            >
              {table.table_name}
            </h4>
            <span
              className={`text-[10px] font-semibold tracking-wider uppercase ${
                isAvailable ? "text-slate-400" : isReady ? "text-amber-700" : "text-slate-400"
              }`}
            >
              {table.status.replace(/_/g, " ")}
            </span>
          </div>
        </div>

        {/* Live Status indicator pill */}
        <span
          className={`text-[10px] font-bold px-2.5 py-1 rounded-full flex items-center gap-1 ${
            isAvailable
              ? "bg-slate-100 text-slate-500 border border-slate-200"
              : isReady
              ? "bg-amber-500 text-slate-950 animate-pulse font-extrabold shadow-xs"
              : "bg-emerald-500/10 text-emerald-400 border border-emerald-500/30"
          }`}
        >
          <span
            className={`w-1.5 h-1.5 rounded-full ${
              isAvailable ? "bg-slate-400" : isReady ? "bg-slate-950" : "bg-emerald-400"
            }`}
          />
          {isAvailable ? "Available" : isReady ? "Ready to Pay" : "Occupied"}
        </span>
      </div>

      {/* Card Body: Order stats or Available placeholder */}
      {isAvailable ? (
        <div className="py-6 flex flex-col items-center justify-center text-center">
          <div className="w-10 h-10 rounded-full bg-slate-50 border border-slate-200/80 flex items-center justify-center text-slate-400 mb-2">
            <Users className="w-5 h-5" />
          </div>
          <span className="text-xs font-semibold text-slate-500">Table is empty</span>
          <p className="text-[11px] text-slate-400 mt-0.5">Click Open Table to seat guests</p>
        </div>
      ) : (
        <div className="py-2.5 space-y-2.5 my-auto">
          {/* Running Total & Items */}
          <div className="flex items-baseline justify-between">
            <span className={`text-xs font-medium ${isReady ? "text-amber-800" : "text-slate-400"}`}>
              Running Total
            </span>
            <span
              className={`text-lg font-black tracking-tight ${
                isReady ? "text-amber-950" : "text-amber-400"
              }`}
            >
              ₹{table.active_order?.total_amount?.toFixed(2) || "0.00"}
            </span>
          </div>

          {/* Quick Details Chips */}
          <div className="flex items-center justify-between text-[11px] pt-2 border-t border-dashed border-slate-700/60">
            <div className={`flex items-center gap-1.5 ${isReady ? "text-amber-800" : "text-slate-400"}`}>
              <ShoppingBag className="w-3.5 h-3.5" />
              <span className="font-semibold">{table.active_order?.items_count || 0} items</span>
            </div>
            <div className={`flex items-center gap-1.5 ${isReady ? "text-amber-800" : "text-slate-400"}`}>
              <Clock className="w-3.5 h-3.5" />
              <span>{getElapsedString(table.active_order?.opened_at)}</span>
            </div>
          </div>

          {/* Handling Staff */}
          {table.active_order?.opened_by_name && (
            <div
              className={`text-[10px] truncate ${
                isReady ? "text-amber-700" : "text-slate-500"
              }`}
            >
              Staff: <span className="font-medium text-slate-300">{table.active_order.opened_by_name}</span>
            </div>
          )}
        </div>
      )}

      {/* Card Footer: Action Buttons */}
      <div className="mt-3 pt-3 border-t border-slate-200/60 flex items-center gap-2">
        {isAvailable ? (
          <button
            onClick={() => onOpenTable(table.table_no)}
            className="w-full py-2.5 rounded-xl bg-amber-500 hover:bg-amber-600 text-slate-950 font-bold text-xs shadow-xs hover:shadow-md transition-all flex items-center justify-center gap-1.5"
          >
            <span>Open Table</span>
            <ArrowRight className="w-3.5 h-3.5" />
          </button>
        ) : (
          <>
            <button
              onClick={() => onViewOrder(table.active_order.order_id)}
              className={`flex-1 py-2 px-3 rounded-xl font-bold text-xs transition-colors border ${
                isReady
                  ? "bg-white border-amber-300 text-amber-900 hover:bg-amber-100/50"
                  : "bg-slate-800 border-slate-700 text-slate-200 hover:bg-slate-700"
              }`}
            >
              View / Add
            </button>
            <button
              onClick={() => onCheckout(table.active_order.order_id)}
              className="py-2 px-3.5 rounded-xl bg-amber-500 hover:bg-amber-600 text-slate-950 font-extrabold text-xs shadow-xs transition-all flex items-center gap-1 shrink-0"
            >
              <span>Checkout</span>
            </button>
          </>
        )}
      </div>
    </div>
  );
};

export default TableCard;
