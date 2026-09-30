import React from "react";
import { Outlet } from "react-router-dom";
import Sidebar from "./Sidebar";
import Topbar from "./Topbar";

const MainLayout = () => {
  return (
    <div className="flex h-screen w-screen bg-slate-50 overflow-hidden font-sans text-slate-800 antialiased">
      {/* Sidebar Navigation */}
      <Sidebar />

      {/* Main Content View Container */}
      <div className="flex-1 flex flex-col min-w-0 h-full overflow-hidden">
        <Topbar />
        <main className="flex-1 overflow-y-auto min-h-0 bg-slate-50/50">
          <Outlet />
        </main>
      </div>
    </div>
  );
};

export default MainLayout;
