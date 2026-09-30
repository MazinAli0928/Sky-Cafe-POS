import React from "react";

const CategoryTabs = ({ categories, activeCategory, onSelectCategory }) => {
  return (
    <div className="flex items-center gap-2 overflow-x-auto pb-2 scrollbar-none select-none">
      {categories.map((cat) => {
        const isActive = activeCategory === cat.name;
        return (
          <button
            key={cat.id}
            onClick={() => onSelectCategory(cat.name)}
            className={`px-4 py-2 rounded-xl text-xs font-bold transition-all duration-150 whitespace-nowrap flex items-center gap-2 border ${
              isActive
                ? "bg-slate-900 text-amber-400 border-slate-900 shadow-md"
                : "bg-white text-slate-600 border-slate-200 hover:bg-slate-100 hover:text-slate-900"
            }`}
          >
            <span>{cat.name}</span>
            {cat.count !== undefined && (
              <span
                className={`px-1.5 py-0.5 rounded-md text-[10px] ${
                  isActive ? "bg-amber-400/20 text-amber-300" : "bg-slate-100 text-slate-400"
                }`}
              >
                {cat.count}
              </span>
            )}
          </button>
        );
      })}
    </div>
  );
};

export default CategoryTabs;
