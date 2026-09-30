import React from "react";

const StatCard = ({ title, value, subtext, icon: Icon, trend, color = "amber" }) => {
  const colorMap = {
    amber: "bg-amber-500/10 text-amber-600 border-amber-500/20",
    emerald: "bg-emerald-500/10 text-emerald-600 border-emerald-500/20",
    indigo: "bg-indigo-500/10 text-indigo-600 border-indigo-500/20",
    rose: "bg-rose-500/10 text-rose-600 border-rose-500/20"
  };

  return (
    <div className="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-xs hover:shadow-md transition-all duration-200 flex items-center justify-between">
      <div className="space-y-1">
        <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider">{title}</p>
        <h3 className="text-2xl font-extrabold text-slate-900 tracking-tight">{value}</h3>
        {subtext && <p className="text-xs text-slate-400 font-medium">{subtext}</p>}
        {trend && (
          <div className="flex items-center gap-1 text-xs font-bold text-emerald-600 pt-0.5">
            <span>↑ {trend}</span>
            <span className="text-slate-400 font-normal">vs last week</span>
          </div>
        )}
      </div>

      {Icon && (
        <div className={`p-3.5 rounded-xl border ${colorMap[color] || colorMap.amber}`}>
          <Icon className="w-6 h-6 stroke-[2]" />
        </div>
      )}
    </div>
  );
};

export default StatCard;
