import React, { useState, useRef, useEffect } from "react";
import { NavLink, useLocation, useNavigate } from "react-router-dom";
import {
  LayoutDashboard, ShoppingBag, Receipt, Package, Grid,
  BarChart3, Settings, LogOut, Coffee, UserCheck, Users, ChevronDown
} from "lucide-react";
import { useSettings } from "../../context/SettingsContext";
import { useAuth } from "../../context/AuthContext";
import { useToast } from "../../context/ToastContext";

const ALL_NAV_ITEMS = [
  { label: "Dashboard", path: "/", icon: LayoutDashboard, roles: ["MANAGER", "CASHIER"] },
  { label: "POS", path: "/pos", icon: ShoppingBag, badge: "POS", roles: ["MANAGER", "CASHIER"] },
  { label: "Orders", path: "/orders", icon: Receipt, roles: ["MANAGER", "CASHIER"] },
  { label: "Products", path: "/products", icon: Package, roles: ["MANAGER"] },
  { label: "Categories", path: "/categories", icon: Grid, roles: ["MANAGER"] },
  { label: "Reports", path: "/reports", icon: BarChart3, roles: ["MANAGER", "CASHIER"] },
  { label: "Settings", path: "/settings", icon: Settings, roles: ["MANAGER"] },
  { label: "Users", path: "/users", icon: Users, roles: ["MANAGER"] }
];

const Sidebar = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const { settings } = useSettings();
  const { user, logout, isManager } = useAuth();
  const { addToast } = useToast();

  const handleLogout = () => {
    logout();
    addToast("Logged out successfully", "info");
    navigate("/login", { replace: true });
  };

  // Filter nav items by role
  const navItems = ALL_NAV_ITEMS.filter((item) =>
    user ? item.roles.includes(user.role) : false
  );

  const initials = user?.name
    ? user.name.split(" ").map((n) => n[0]).join("").toUpperCase().slice(0, 2)
    : "??";

  return (
    <aside className="w-64 bg-slate-900 text-slate-300 flex flex-col border-r border-slate-800 shrink-0 select-none">
      {/* Brand Header */}
      <div className="p-5 border-b border-slate-800/80 flex items-center gap-3">
        <div className="w-10 h-10 rounded-xl bg-slate-800 border border-slate-700/80 p-1 flex items-center justify-center shrink-0 overflow-hidden">
          <img
            src="/logo-white.png"
            alt="Sky Cafe Logo"
            className="w-full h-full object-contain"
          />
        </div>
        <div className="overflow-hidden">
          <h1 className="font-bold text-white text-base tracking-wide leading-tight truncate">
            {settings.cafeInfo.name || "SKY CAFE"}
          </h1>
          <span className="text-[11px] font-semibold tracking-wider text-amber-500 uppercase">
            {settings.cafeInfo.tagline || "MYSORE"}
          </span>
        </div>
      </div>

      {/* Navigation */}
      <nav className="flex-1 px-3 py-4 space-y-1.5 overflow-y-auto">
        {navItems.map((item) => {
          const Icon = item.icon;
          const isActive = location.pathname === item.path;

          return (
            <NavLink
              key={item.path}
              to={item.path}
              className={`flex items-center justify-between px-3.5 py-2.5 rounded-xl text-sm font-medium transition-all duration-150 ${
                isActive
                  ? "bg-amber-500 text-slate-950 font-semibold shadow-md shadow-amber-500/10"
                  : "text-slate-400 hover:text-slate-100 hover:bg-slate-800/60"
              }`}
            >
              <div className="flex items-center gap-3">
                <Icon className={`w-5 h-5 ${isActive ? "text-slate-950" : "text-slate-400"}`} />
                <span>{item.label}</span>
              </div>
              {item.badge && (
                <span
                  className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                    isActive
                      ? "bg-slate-950 text-amber-400"
                      : "bg-amber-500/10 text-amber-400 border border-amber-500/20"
                  }`}
                >
                  {item.badge}
                </span>
              )}
            </NavLink>
          );
        })}
      </nav>

      {/* Bottom User Profile */}
      <div className="p-3 border-t border-slate-800/80 bg-slate-950/40">
        <div className="flex items-center justify-between p-2 rounded-xl bg-slate-800/40 border border-slate-800/60">
          <div className="flex items-center gap-3 min-w-0">
            <div className="w-9 h-9 rounded-lg bg-amber-500/20 flex items-center justify-center text-amber-400 font-bold text-sm shrink-0">
              {initials}
            </div>
            <div className="overflow-hidden">
              <div className="text-xs font-semibold text-slate-100 truncate flex items-center gap-1">
                {user?.name || "Unknown"}
                <UserCheck className="w-3 h-3 text-emerald-400 inline shrink-0" />
              </div>
              <div className="text-[11px] text-slate-400 truncate">
                {user?.role === "MANAGER" ? "Manager" : "Cashier"}
              </div>
            </div>
          </div>
          <button
            onClick={handleLogout}
            title="Logout"
            className="p-1.5 text-slate-400 hover:text-rose-400 hover:bg-slate-800 rounded-lg transition-colors shrink-0"
          >
            <LogOut className="w-4 h-4" />
          </button>
        </div>
      </div>
    </aside>
  );
};

export default Sidebar;
