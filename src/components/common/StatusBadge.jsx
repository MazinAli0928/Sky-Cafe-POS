import React from "react";

const StatusBadge = ({ status }) => {
  const styles = {
    Available: "bg-emerald-50 text-emerald-700 border-emerald-200",
    "Out of Stock": "bg-rose-50 text-rose-700 border-rose-200",
    Paid: "bg-emerald-50 text-emerald-700 border-emerald-200",
    Refunded: "bg-amber-50 text-amber-700 border-amber-200",
    Pending: "bg-indigo-50 text-indigo-700 border-indigo-200",
    Active: "bg-emerald-50 text-emerald-700 border-emerald-200",
    Inactive: "bg-slate-100 text-slate-600 border-slate-200"
  };

  return (
    <span
      className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-semibold border ${
        styles[status] || styles.Active
      }`}
    >
      <span className="w-1.5 h-1.5 rounded-full bg-current" />
      {status}
    </span>
  );
};

export default StatusBadge;
