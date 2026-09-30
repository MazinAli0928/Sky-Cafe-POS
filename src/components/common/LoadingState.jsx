import React from "react";

const LoadingState = ({ count = 6, type = "grid" }) => {
  if (type === "grid") {
    return (
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4 animate-pulse">
        {Array.from({ length: count }).map((_, i) => (
          <div key={i} className="bg-slate-200/70 h-36 rounded-2xl p-4 flex flex-col justify-between">
            <div className="space-y-2">
              <div className="h-4 bg-slate-300 rounded-md w-3/4" />
              <div className="h-3 bg-slate-300 rounded-md w-1/2" />
            </div>
            <div className="flex justify-between items-center">
              <div className="h-5 bg-slate-300 rounded-md w-1/3" />
              <div className="h-8 w-8 bg-slate-300 rounded-xl" />
            </div>
          </div>
        ))}
      </div>
    );
  }

  return (
    <div className="space-y-3 animate-pulse">
      {Array.from({ length: count }).map((_, i) => (
        <div key={i} className="h-12 bg-slate-200/70 rounded-xl w-full" />
      ))}
    </div>
  );
};

export default LoadingState;
