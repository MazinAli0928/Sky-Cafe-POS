import React, { createContext, useContext, useState, useMemo } from "react";
import { useToast } from "./ToastContext";
import { createOrder, getOrders } from "../services/api";

const CartContext = createContext(null);

export const CartProvider = ({ children }) => {
  const { addToast } = useToast();

  // Orders are now fetched from the API. We keep a local list for the current session.
  const [orders, setOrders] = useState([]);

  const [cartItems, setCartItems] = useState([]);
  const [paymentMethod, setPaymentMethod] = useState("UPI");

  // Manager Discount State
  const [discountData, setDiscountData] = useState(null);
  const [tax, setTax] = useState(0);

  const addToCart = (product) => {
    setCartItems((prev) => {
      const existingIndex = prev.findIndex((item) => item.id === product.id);
      if (existingIndex > -1) {
        const updated = [...prev];
        const newQty = updated[existingIndex].quantity + 1;
        updated[existingIndex] = {
          ...updated[existingIndex],
          quantity: newQty,
          total: newQty * updated[existingIndex].price
        };
        return updated;
      }
      return [
        ...prev,
        {
          id: product.id,
          name: product.name,
          price: product.price,
          quantity: 1,
          total: product.price
        }
      ];
    });
    addToast(`Added "${product.name}" to order`, "success");
  };

  const updateQuantity = (id, delta) => {
    setCartItems((prev) =>
      prev
        .map((item) => {
          if (item.id === id) {
            const newQty = item.quantity + delta;
            if (newQty <= 0) return null;
            return { ...item, quantity: newQty, total: newQty * item.price };
          }
          return item;
        })
        .filter(Boolean)
    );
  };

  const removeFromCart = (id) => {
    const targetItem = cartItems.find((i) => i.id === id);
    setCartItems((prev) => prev.filter((item) => item.id !== id));
    if (targetItem) addToast(`Removed "${targetItem.name}"`, "info");
  };

  const clearCart = () => {
    if (cartItems.length === 0) return;
    setCartItems([]);
    setDiscountData(null);
    setTax(0);
    addToast("Order cleared", "info");
  };

  const subtotal = useMemo(
    () => cartItems.reduce((acc, item) => acc + item.price * item.quantity, 0),
    [cartItems]
  );

  const calculatedDiscountAmount = useMemo(() => {
    if (!discountData) return 0;
    if (discountData.type === "percentage") {
      return Math.round((subtotal * discountData.value) / 100);
    }
    return Math.min(discountData.value, subtotal);
  }, [subtotal, discountData]);

  const total = useMemo(() => {
    const calc = subtotal - calculatedDiscountAmount + tax;
    return calc < 0 ? 0 : calc;
  }, [subtotal, calculatedDiscountAmount, tax]);

  const applyDiscount = (discountPayload) => {
    setDiscountData(discountPayload);
    const label =
      discountPayload.type === "percentage"
        ? `${discountPayload.value}%`
        : `₹${discountPayload.value}`;
    addToast(`Manager Discount (${label}) applied!`, "success");
  };

  const removeDiscount = () => {
    setDiscountData(null);
    addToast("Discount removed successfully", "info");
  };

  /**
   * placeOrder — sends the order to the backend API.
   * Token is read from localStorage automatically inside api.js request().
   * Returns the created order on success, null on failure.
   */
  const placeOrder = async () => {
    if (cartItems.length === 0) {
      addToast("Cannot print bill: Cart is empty", "warning");
      return null;
    }

    try {
      const orderPayload = {
        items: cartItems.map((item) => ({
          product_id: typeof item.id === "number" ? item.id : null,
          product_name: item.name,
          quantity: item.quantity,
          unit_price: item.price
        })),
        payment_method: paymentMethod,
        tax_rate: 0,
        discount: discountData
          ? {
              type: discountData.type,
              value: discountData.value,
              reason: discountData.reason || "Customer Promotion",
              // Pass manager credentials for backend validation
              manager_username: discountData.managerUsername || null,
              manager_password: discountData.managerPassword || null,
              manager_authorized: true
            }
          : undefined
      };

      const serverOrder = await createOrder(orderPayload);

      // Map server response to frontend shape
      const now = new Date();
      const mappedOrder = {
        id: serverOrder.id,
        billNo: serverOrder.bill_no,
        bill_no: serverOrder.bill_no,
        date: now.toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" }),
        time: now.toLocaleTimeString("en-IN", { hour: "2-digit", minute: "2-digit" }),
        dateTime: now.toLocaleString("en-IN"),
        items: serverOrder.items.map((i) => ({
          id: i.product_id || i.id,
          name: i.product_name,
          price: i.unit_price,
          quantity: i.quantity,
          total: i.total_price
        })),
        itemCount: serverOrder.items.reduce((acc, i) => acc + i.quantity, 0),
        subtotal: serverOrder.subtotal,
        discount: serverOrder.discount_amount,
        discountAmount: serverOrder.discount_amount,
        discountType: serverOrder.discount_type,
        discountValue: serverOrder.discount_value,
        discountReason: serverOrder.discount_reason,
        managerAuthorized: serverOrder.manager_authorized,
        managerName: serverOrder.manager_name,
        cashierName: serverOrder.cashier_name,
        tax: serverOrder.tax,
        total: serverOrder.total,
        paymentMethod: serverOrder.payment_method,
        status: serverOrder.status
      };

      // Add to local orders list (prepend)
      setOrders((prev) => [mappedOrder, ...prev]);

      // Clear cart
      setCartItems([]);
      setDiscountData(null);
      setTax(0);

      addToast(`Bill #${mappedOrder.billNo} generated successfully!`, "success");
      return mappedOrder;
    } catch (err) {
      addToast(`Order failed: ${err.message}`, "error");
      return null;
    }
  };

  return (
    <CartContext.Provider
      value={{
        cartItems,
        addToCart,
        updateQuantity,
        removeFromCart,
        clearCart,
        paymentMethod,
        setPaymentMethod,
        subtotal,
        discountData,
        calculatedDiscountAmount,
        applyDiscount,
        removeDiscount,
        tax,
        setTax,
        total,
        placeOrder,
        orders,
        setOrders
      }}
    >
      {children}
    </CartContext.Provider>
  );
};

export const useCart = () => {
  const context = useContext(CartContext);
  if (!context) throw new Error("useCart must be used within a CartProvider");
  return context;
};
