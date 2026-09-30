import React from "react";
import { Navigate, useLocation } from "react-router-dom";
import { useAuth } from "../../context/AuthContext";

/**
 * ProtectedRoute — Wraps a route element with auth + role checks.
 *
 * Props:
 *   children    — the protected page component
 *   requiredRole — "MANAGER" | "CASHIER" | undefined (any authenticated user)
 */
const ProtectedRoute = ({ children, requiredRole }) => {
  const { user, isLoading } = useAuth();
  const location = useLocation();

  // While validating stored token, render nothing (avoid flash of login screen)
  if (isLoading) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center">
        <div className="w-8 h-8 border-4 border-amber-500 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  // Not authenticated — send to login
  if (!user) {
    return <Navigate to="/login" state={{ from: location }} replace />;
  }

  // Role check — MANAGER can access everything; CASHIER is blocked from manager-only routes
  if (requiredRole === "MANAGER" && user.role !== "MANAGER") {
    return <Navigate to="/" replace />;
  }

  return children;
};

export default ProtectedRoute;
