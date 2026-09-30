import React from "react";
import { Plus, Check } from "lucide-react";

const ProductCard = ({ product, onAddToCart, isInCart }) => {
  const { name, price, category, isAvailable, badge } = product;

  return (
    <button
      onClick={() => isAvailable && onAddToCart(product)}
      disabled={!isAvailable}
      className={`group relative text-left bg-white p-4 rounded-2xl border transition-all duration-200 flex flex-col justify-between h-40 select-none ${
        !isAvailable
          ? "opacity-50 cursor-not-allowed border-slate-200 bg-slate-50"
          : isInCart
          ? "border-amber-500 ring-2 ring-amber-500/20 shadow-md bg-amber-500/5"
          : "border-slate-200/90 hover:border-amber-500/60 hover:shadow-lg hover:-translate-y-0.5"
      }`}
    >
      {/* Top Header Badge */}
      <div className="flex items-center justify-between gap-2 w-full">
        <span className="text-[11px] font-semibold tracking-wide text-slate-400 uppercase">
          {category}
        </span>
        {badge && (
          <span className="text-[10px] font-extrabold px-2 py-0.5 rounded-full bg-amber-500/10 text-amber-600 border border-amber-500/20">
            {badge}
          </span>
        )}
      </div>

      {/* Middle Product Name */}
      <div className="my-1">
        <h3 className="font-bold text-slate-800 text-base leading-snug group-hover:text-amber-600 transition-colors line-clamp-2">
          {name}
        </h3>
      </div>

      {/* Bottom Price & Add Action */}
      <div className="flex items-center justify-between w-full pt-2 border-t border-slate-100">
        <div className="text-lg font-extrabold text-slate-900">
          ₹{price}
        </div>

        <div
          className={`w-9 h-9 rounded-xl flex items-center justify-center transition-all duration-200 ${
            isInCart
              ? "bg-amber-500 text-slate-950 shadow-md shadow-amber-500/20"
              : "bg-slate-100 text-slate-700 group-hover:bg-amber-500 group-hover:text-slate-950"
          }`}
        >
          {isInCart ? <Check className="w-5 h-5 stroke-[2.5]" /> : <Plus className="w-5 h-5 stroke-[2.5]" />}
        </div>
      </div>
    </button>
  );
};

export default ProductCard;
