import React, { createContext, useContext, useState, useEffect, useCallback } from "react";
import { login as apiLogin, getCurrentUser } from "../services/api";

const AuthContext = createContext(null);

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [token, setToken] = useState(() => localStorage.getItem("cafe_pos_token"));
  const [isLoading, setIsLoading] = useState(true); // true while validating stored token

  // On mount, validate the stored token by calling /auth/me
  useEffect(() => {
    const validateToken = async () => {
      const storedToken = localStorage.getItem("cafe_pos_token");
      if (!storedToken) {
        setIsLoading(false);
        return;
      }
      try {
        const userData = await getCurrentUser(storedToken);
        setUser(userData);
        setToken(storedToken);
      } catch {
        // Token is expired or invalid — clear it
        localStorage.removeItem("cafe_pos_token");
        setToken(null);
        setUser(null);
      } finally {
        setIsLoading(false);
      }
    };
    validateToken();
  }, []);

  const login = useCallback(async (username, password) => {
    const data = await apiLogin(username, password);
    localStorage.setItem("cafe_pos_token", data.access_token);
    setToken(data.access_token);
    setUser(data.user);
    return data.user;
  }, []);

  const logout = useCallback(() => {
    localStorage.removeItem("cafe_pos_token");
    setToken(null);
    setUser(null);
  }, []);

  const isManager = user?.role === "MANAGER";
  const isCashier = user?.role === "CASHIER";

  return (
    <AuthContext.Provider value={{ user, token, isLoading, isManager, isCashier, login, logout }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) throw new Error("useAuth must be used within an AuthProvider");
  return context;
};
