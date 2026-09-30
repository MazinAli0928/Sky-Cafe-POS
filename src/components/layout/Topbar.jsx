import React, { useState, useEffect } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { Printer, Calendar, Clock, LogOut, ShieldCheck, ShieldAlert, ChevronDown, KeyRound } from "lucide-react";
import { useSettings } from "../../context/SettingsContext";
import { useAuth } from "../../context/AuthContext";
import { useToast } from "../../context/ToastContext";
import ChangePasswordModal from "../users/ChangePasswordModal";

const pageTitles = {
  "/": "Dashboard",
  "/pos": "Point of Sale",
  "/orders": "Orders History",
  "/products": "Products Management",
  "/categories": "Categories",
  "/reports": "Sales & Performance Reports",
  "/settings": "System Settings",
  "/users": "User Management"
};

const Topbar = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const { settings } = useSettings();
  const { user, logout } = useAuth();
  const { addToast } = useToast();
  const [currentTime, setCurrentTime] = useState(new Date());
  const [showUserMenu, setShowUserMenu] = useState(false);
  const [showChangePasswordModal, setShowChangePasswordModal] = useState(false);

  useEffect(() => {
    const timer = setInterval(() => setCurrentTime(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);

  const pageTitle = pageTitles[location.pathname] || "Point of Sale";

  const printerStatus = settings.printer?.status || "Ready";
  const printerStatusStyles = {
    Ready: "bg-emerald-500/10 text-emerald-600 border-emerald-500/20",
    Warning: "bg-amber-500/10 text-amber-600 border-amber-500/20",
    Offline: "bg-rose-500/10 text-rose-600 border-rose-500/20"
  };

  const formattedDate = currentTime.toLocaleDateString("en-IN", {
    day: "2-digit", month: "short", year: "numeric"
  });

  const formattedTime = currentTime.toLocaleTimeString("en-US", {
    hour: "2-digit", minute: "2-digit", second: "2-digit", hour12: true
  });

  const handleLogout = () => {
    logout();
    addToast("Logged out successfully", "info");
    navigate("/login", { replace: true });
  };

  const isManager = user?.role === "MANAGER";
  const initials = user?.name
    ? user.name.split(" ").map((n) => n[0]).join("").toUpperCase().slice(0, 2)
    : "?";

  return (
    <>
      <header className="h-16 bg-white border-b border-slate-200 px-6 flex items-center justify-between shrink-0 shadow-sm z-10">
        {/* Left Title */}
        <div className="flex items-center gap-3">
          <h2 className="text-xl font-bold text-slate-800 tracking-tight">{pageTitle}</h2>
        </div>

        {/* Right Actions */}
        <div className="flex items-center gap-3 text-xs font-medium text-slate-600">
          {/* Date */}
          <div className="hidden sm:flex items-center gap-2 px-3 py-1.5 rounded-lg bg-slate-100/80 text-slate-600 border border-slate-200/60">
            <Calendar className="w-3.5 h-3.5 text-slate-400" />
            <span>{formattedDate}</span>
          </div>

          {/* Live Clock */}
          <div className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-slate-100/80 text-slate-700 font-mono border border-slate-200/60 min-w-[100px] justify-center">
            <Clock className="w-3.5 h-3.5 text-amber-500" />
            <span>{formattedTime}</span>
          </div>

          {/* Printer Status Badge */}
          <div
            className={`flex items-center gap-2 px-3 py-1.5 rounded-full border text-xs font-semibold ${
              printerStatusStyles[printerStatus] || printerStatusStyles.Ready
            }`}
          >
            <span
              className={`w-2 h-2 rounded-full animate-pulse ${
                printerStatus === "Ready" ? "bg-emerald-500"
                : printerStatus === "Warning" ? "bg-amber-500"
                : "bg-rose-500"
              }`}
            />
            <Printer className="w-3.5 h-3.5" />
            <span>Printer {printerStatus}</span>
          </div>

          {/* User Profile Dropdown */}
          <div className="relative pl-2 border-l border-slate-200">
            <button
              onClick={() => setShowUserMenu((prev) => !prev)}
              className="flex items-center gap-2 px-2 py-1 rounded-lg hover:bg-slate-100 transition-colors"
            >
              <div className="w-7 h-7 rounded-lg bg-amber-500/15 text-amber-700 flex items-center justify-center font-bold text-xs border border-amber-500/20">
                {initials}
              </div>
              <div className="hidden md:block text-left">
                <div className="text-xs font-bold text-slate-800 leading-tight">{user?.name || "..."}</div>
                <div className="text-[10px] text-slate-500 flex items-center gap-1">
                  {isManager
                    ? <><ShieldCheck className="w-2.5 h-2.5 text-amber-500" /> Manager</>
                    : <><ShieldAlert className="w-2.5 h-2.5 text-slate-400" /> Cashier</>
                  }
                </div>
              </div>
              <ChevronDown className="w-3.5 h-3.5 text-slate-400" />
            </button>

            {showUserMenu && (
              <div className="absolute right-0 top-full mt-1 w-48 bg-white border border-slate-200 rounded-xl shadow-lg py-1.5 z-50">
                <div className="px-3 py-2 border-b border-slate-100">
                  <div className="text-xs font-bold text-slate-800">{user?.name}</div>
                  <div className="text-[11px] text-slate-500 font-mono">@{user?.username}</div>
                </div>
                <button
                  onClick={() => {
                    setShowUserMenu(false);
                    setShowChangePasswordModal(true);
                  }}
                  className="w-full px-3 py-2 text-left text-xs font-semibold text-slate-700 hover:bg-slate-50 flex items-center gap-2 transition-colors border-b border-slate-100"
                >
                  <KeyRound className="w-3.5 h-3.5 text-slate-500" />
                  Change Password
                </button>
                <button
                  onClick={handleLogout}
                  className="w-full px-3 py-2 text-left text-xs font-semibold text-rose-600 hover:bg-rose-50 flex items-center gap-2 transition-colors"
                >
                  <LogOut className="w-3.5 h-3.5" />
                  Sign Out
                </button>
              </div>
            )}
          </div>
        </div>
      </header>

      {/* Change Password Modal */}
      <ChangePasswordModal
        isOpen={showChangePasswordModal}
        onClose={() => setShowChangePasswordModal(false)}
      />
    </>
  );
};

export default Topbar;
