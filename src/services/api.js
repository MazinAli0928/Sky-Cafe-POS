const API_BASE_URL = import.meta.env.VITE_API_URL || "http://localhost:8000";

// ─────────────────────────────────────────────────────────────
// Core request helper
// ─────────────────────────────────────────────────────────────
async function request(endpoint, options = {}, token = null) {
  const url = `${API_BASE_URL}/api${endpoint}`;

  // Attach Bearer token if provided or found in localStorage
  const authToken = token || localStorage.getItem("cafe_pos_token");
  const authHeader = authToken ? { Authorization: `Bearer ${authToken}` } : {};

  const config = {
    headers: {
      "Content-Type": "application/json",
      ...authHeader,
      ...options.headers
    },
    ...options
  };

  try {
    const response = await fetch(url, config);
    const contentType = response.headers.get("content-type");
    let data;

    if (contentType && contentType.includes("application/json")) {
      data = await response.json();
    } else {
      data = await response.text();
    }

    if (!response.ok) {
      // Handle 401 — token expired during session
      if (response.status === 401) {
        localStorage.removeItem("cafe_pos_token");
        window.dispatchEvent(new Event("cafe_pos_unauthorized"));
      }
      const errorMessage =
        (typeof data === "object" && data?.detail) ||
        (typeof data === "string" && data) ||
        `Request failed with status ${response.status}`;
      throw new Error(errorMessage);
    }

    return data;
  } catch (error) {
    if (error.name === "TypeError" && error.message.includes("fetch")) {
      throw new Error("Unable to connect to the POS server. Please check backend connection.");
    }
    throw error;
  }
}

// ─────────────────────────────────────────────────────────────
// Health API
// ─────────────────────────────────────────────────────────────
export const fetchHealth = () => request("/health");

// ─────────────────────────────────────────────────────────────
// Auth API
// ─────────────────────────────────────────────────────────────
export const login = (username, password) =>
  request("/auth/login", {
    method: "POST",
    body: JSON.stringify({ username, password })
  });

export const getCurrentUser = (token) => request("/auth/me", {}, token);

export const changePassword = (currentPassword, newPassword, confirmPassword) =>
  request("/auth/change-password", {
    method: "POST",
    body: JSON.stringify({
      current_password: currentPassword,
      new_password: newPassword,
      confirm_password: confirmPassword
    })
  });

// ─────────────────────────────────────────────────────────────
// Users API (manager only)
// ─────────────────────────────────────────────────────────────
export const getUsers = (token) => request("/users", {}, token);

export const createUser = (userData, token) =>
  request("/users", { method: "POST", body: JSON.stringify(userData) }, token);

export const updateUser = (id, userData, token) =>
  request(`/users/${id}`, { method: "PUT", body: JSON.stringify(userData) }, token);

export const deactivateUser = (id, token) =>
  request(`/users/${id}`, { method: "DELETE" }, token);

// ─────────────────────────────────────────────────────────────
// Discounts API
// ─────────────────────────────────────────────────────────────
export const authorizeDiscount = (managerUsername, managerPassword, token) =>
  request(
    "/discounts/authorize",
    {
      method: "POST",
      body: JSON.stringify({
        manager_username: managerUsername,
        manager_password: managerPassword
      })
    },
    token
  );

// ─────────────────────────────────────────────────────────────
// Products API
// ─────────────────────────────────────────────────────────────
export const getProducts = (params = {}) => {
  const query = new URLSearchParams();
  if (params.search) query.append("search", params.search);
  if (params.category_id) query.append("category_id", params.category_id);
  if (params.is_available !== undefined && params.is_available !== null) {
    query.append("is_available", params.is_available);
  }
  const queryString = query.toString() ? `?${query.toString()}` : "";
  return request(`/products${queryString}`);
};

export const getProductById = (id) => request(`/products/${id}`);

export const createProduct = (productData, token) =>
  request("/products", { method: "POST", body: JSON.stringify(productData) }, token);

export const updateProduct = (id, productData, token) =>
  request(`/products/${id}`, { method: "PUT", body: JSON.stringify(productData) }, token);

export const deleteProduct = (id, token) =>
  request(`/products/${id}`, { method: "DELETE" }, token);

export const toggleProductAvailability = (id, token) =>
  request(`/products/${id}/status`, { method: "PATCH" }, token);

// ─────────────────────────────────────────────────────────────
// Categories API
// ─────────────────────────────────────────────────────────────
export const getCategories = () => request("/categories");

export const getCategoryById = (id) => request(`/categories/${id}`);

export const createCategory = (categoryData, token) =>
  request("/categories", { method: "POST", body: JSON.stringify(categoryData) }, token);

export const updateCategory = (id, categoryData, token) =>
  request(`/categories/${id}`, { method: "PUT", body: JSON.stringify(categoryData) }, token);

export const deleteCategory = (id, token) =>
  request(`/categories/${id}`, { method: "DELETE" }, token);

export const toggleCategoryStatus = (id, token) =>
  request(`/categories/${id}/status`, { method: "PATCH" }, token);

// ─────────────────────────────────────────────────────────────
// Settings API
// ─────────────────────────────────────────────────────────────
export const getSettings = () => request("/settings");

export const updateSettings = (settingsData, token) =>
  request("/settings", { method: "PUT", body: JSON.stringify(settingsData) }, token);

// ─────────────────────────────────────────────────────────────
// Orders API
// ─────────────────────────────────────────────────────────────
export const getOrders = (token) => request("/orders", {}, token);

export const createOrder = (orderData, token) =>
  request("/orders", { method: "POST", body: JSON.stringify(orderData) }, token);

export const cancelOrder = (orderId, token) =>
  request(`/orders/${orderId}/cancel`, { method: "POST" }, token);

// ─────────────────────────────────────────────────────────────
// Analytics & Reports API
// ─────────────────────────────────────────────────────────────
export const getDashboardAnalytics = (range = "7days", startDate = null, endDate = null, token = null) => {
  const query = new URLSearchParams({ range });
  if (startDate) query.append("start_date", startDate);
  if (endDate) query.append("end_date", endDate);
  return request(`/analytics/dashboard?${query.toString()}`, {}, token);
};

export const getSalesReport = (range = "today", startDate = null, endDate = null, token = null) => {
  const query = new URLSearchParams({ range });
  if (startDate) query.append("start_date", startDate);
  if (endDate) query.append("end_date", endDate);
  return request(`/analytics/reports/sales?${query.toString()}`, {}, token);
};

export const getDiscountReport = (range = "today", startDate = null, endDate = null, token = null) => {
  const query = new URLSearchParams({ range });
  if (startDate) query.append("start_date", startDate);
  if (endDate) query.append("end_date", endDate);
  return request(`/analytics/reports/discounts?${query.toString()}`, {}, token);
};

export const getProductReport = (range = "today", sortBy = "quantity", startDate = null, endDate = null, token = null) => {
  const query = new URLSearchParams({ range, sort_by: sortBy });
  if (startDate) query.append("start_date", startDate);
  if (endDate) query.append("end_date", endDate);
  return request(`/analytics/reports/products?${query.toString()}`, {}, token);
};

export const getVoidsReport = (range = "today", startDate = null, endDate = null, token = null) => {
  const query = new URLSearchParams({ range });
  if (startDate) query.append("start_date", startDate);
  if (endDate) query.append("end_date", endDate);
  return request(`/analytics/reports/voids?${query.toString()}`, {}, token);
};

// ─────────────────────────────────────────────────────────────
// Backup API (Manager only)
// ─────────────────────────────────────────────────────────────
export const createBackup = (token) =>
  request("/backup", { method: "POST" }, token);

export const listBackups = (token) =>
  request("/backup", { method: "GET" }, token);

// ─────────────────────────────────────────────────────────────
// Printer API (ESC/POS Portable Bluetooth SPP)
// ─────────────────────────────────────────────────────────────
export const getPrinterStatus = () => request("/printer/status");

export const getComPorts = () => request("/printer/ports");

export const detectPrinter = () => request("/printer/detect", { method: "POST" });

export const testPrinter = () => request("/printer/test", { method: "POST" });

export const printOrderReceipt = (orderId) =>
  request(`/printer/print/${orderId}`, { method: "POST" });
