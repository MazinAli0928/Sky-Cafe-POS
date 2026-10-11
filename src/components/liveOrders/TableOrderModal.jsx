import React, { useState, useEffect, useMemo } from "react";
import {
  Search,
  Plus,
  Minus,
  Trash2,
  X,
  CreditCard,
  ShoppingBag,
  Clock,
  ArrowRight,
  Save,
  CheckCircle2,
  XCircle
} from "lucide-react";
import {
  getProducts,
  getCategories,
  addItemsToLiveOrder,
  updateLiveOrderItem,
  removeLiveOrderItem,
  updateLiveOrderStatus,
  getLiveOrder
} from "../../services/api";
import { useToast } from "../../context/ToastContext";
import Modal from "../common/Modal";

const TableOrderModal = ({
  isOpen,
  onClose,
  orderId,
  tableNo,
  tableName,
  onProceedCheckout,
  onCancelOrderClick
}) => {
  const { addToast } = useToast();

  const [order, setOrder] = useState(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  // Product catalog states
  const [products, setProducts] = useState([]);
  const [categories, setCategories] = useState([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [activeCategory, setActiveCategory] = useState("All");

  // Pending additions cart before user clicks "Save / Add to Bill"
  const [pendingItems, setPendingItems] = useState({});

  // 1. Fetch live order details and products
  const fetchOrderData = async () => {
    if (!orderId) return;
    try {
      const data = await getLiveOrder(orderId);
      setOrder(data);
    } catch (err) {
      addToast(err.message || "Failed to load order", "error");
    }
  };

  useEffect(() => {
    if (isOpen && orderId) {
      setLoading(true);
      Promise.all([
        getLiveOrder(orderId),
        getProducts({ is_available: true }),
        getCategories()
      ])
        .then(([ordData, prodData, catData]) => {
          setOrder(ordData);
          setProducts(prodData || []);
          const activeCats = (catData || []).filter((c) => c.is_active);
          setCategories([{ id: "all", name: "All" }, ...activeCats]);
        })
        .catch((err) => {
          addToast(err.message || "Error loading table order", "error");
        })
        .finally(() => {
          setLoading(false);
          setPendingItems({});
        });
    }
  }, [isOpen, orderId]);

  // Filter products by search and category
  const filteredProducts = useMemo(() => {
    return products.filter((p) => {
      const matchesSearch =
        p.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        (p.category_name && p.category_name.toLowerCase().includes(searchQuery.toLowerCase()));
      const matchesCategory =
        activeCategory === "All" || p.category_name === activeCategory;
      return matchesSearch && matchesCategory;
    });
  }, [products, searchQuery, activeCategory]);

  // 2. Add / increment item to pending addition list
  const handleStageProduct = (product) => {
    setPendingItems((prev) => {
      const currentQty = prev[product.id]?.quantity || 0;
      return {
        ...prev,
        [product.id]: {
          product_id: product.id,
          product_name: product.name,
          unit_price: product.price,
          quantity: currentQty + 1
        }
      };
    });
  };

  const handleStageDelta = (productId, delta) => {
    setPendingItems((prev) => {
      const existing = prev[productId];
      if (!existing) return prev;
      const newQty = existing.quantity + delta;
      if (newQty <= 0) {
        const copy = { ...prev };
        delete copy[productId];
        return copy;
      }
      return {
        ...prev,
        [productId]: { ...existing, quantity: newQty }
      };
    });
  };

  // 3. Commit staged items to backend SQLite order
  const handleSaveStagedItems = async () => {
    const itemsList = Object.values(pendingItems);
    if (itemsList.length === 0) return;

    setSaving(true);
    try {
      const updatedOrder = await addItemsToLiveOrder(orderId, itemsList);
      setOrder(updatedOrder);
      setPendingItems({});
      addToast("Items added to table bill", "success");
    } catch (err) {
      addToast(err.message || "Failed to add items", "error");
    } finally {
      setSaving(false);
    }
  };

  // 4. Modify quantity of existing item on the order
  const handleUpdateItemQuantity = async (itemId, newQty) => {
    try {
      const updated = await updateLiveOrderItem(orderId, itemId, { quantity: newQty });
      setOrder(updated);
      addToast("Updated quantity", "success");
    } catch (err) {
      addToast(err.message || "Failed to update item", "error");
    }
  };

  // 5. Remove item from order
  const handleRemoveItem = async (itemId) => {
    try {
      const updated = await removeLiveOrderItem(orderId, itemId);
      setOrder(updated);
      addToast("Item removed from bill", "info");
    } catch (err) {
      addToast(err.message || "Failed to remove item", "error");
    }
  };

  // 6. Toggle Ready for Checkout status
  const handleToggleReady = async () => {
    if (!order) return;
    const nextStatus = order.status === "READY_FOR_CHECKOUT" ? "OPEN" : "READY_FOR_CHECKOUT";
    try {
      const updated = await updateLiveOrderStatus(orderId, nextStatus);
      setOrder(updated);
      addToast(
        nextStatus === "READY_FOR_CHECKOUT"
          ? "Table marked Ready for Checkout"
          : "Table marked Open",
        "info"
      );
    } catch (err) {
      addToast(err.message || "Failed to update status", "error");
    }
  };

  if (!isOpen) return null;

  const stagedCount = Object.values(pendingItems).reduce((sum, i) => sum + i.quantity, 0);
  const stagedSubtotal = Object.values(pendingItems).reduce(
    (sum, i) => sum + i.quantity * i.unit_price,
    0
  );

  return (
    <Modal isOpen={isOpen} onClose={onClose} maxWidth="max-w-6xl" title="">
      <div className="flex flex-col h-[85vh] w-full overflow-hidden">
        {/* Header Bar */}
        <div className="px-6 py-4 bg-slate-900 text-white flex items-center justify-between border-b border-slate-800 shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-amber-500 text-slate-950 flex items-center justify-center font-black text-base">
              {tableNo}
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="font-extrabold text-base tracking-wide text-white">
                  {tableName || `Table ${tableNo}`}
                </h3>
                <span
                  className={`text-[10px] font-bold px-2.5 py-0.5 rounded-full ${
                    order?.status === "READY_FOR_CHECKOUT"
                      ? "bg-amber-500 text-slate-950 animate-pulse font-extrabold"
                      : "bg-emerald-500/20 text-emerald-400 border border-emerald-500/30"
                  }`}
                >
                  {order?.status === "READY_FOR_CHECKOUT" ? "Ready for Bill" : "Open Order"}
                </span>
              </div>
              <p className="text-xs text-slate-400 mt-0.5">
                Staff: {order?.opened_by_name || order?.cashier_name || "Staff"} • Ref: #{order?.bill_no}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={handleToggleReady}
              className={`px-3 py-2 rounded-xl text-xs font-bold transition-all border ${
                order?.status === "READY_FOR_CHECKOUT"
                  ? "bg-amber-500 text-slate-950 border-amber-400"
                  : "bg-slate-800 text-slate-300 border-slate-700 hover:bg-slate-700"
              }`}
            >
              {order?.status === "READY_FOR_CHECKOUT" ? "Mark in Progress" : "Mark Ready to Pay"}
            </button>
            <button
              onClick={() => onCancelOrderClick(orderId)}
              className="p-2 text-rose-400 hover:bg-rose-500/10 rounded-xl transition-colors"
              title="Void / Cancel Table Order"
            >
              <XCircle className="w-5 h-5" />
            </button>
            <button
              onClick={onClose}
              className="p-2 text-slate-400 hover:text-white rounded-xl transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Modal Split View: Side-by-side layout */}
        <div className="flex-1 flex flex-row overflow-hidden min-h-0">
          {/* LEFT: Product Catalogue */}
          <div className="flex-1 min-w-0 flex flex-col p-4 bg-slate-50 border-r border-slate-200 overflow-y-auto">
            {/* Search & Categories */}
            <div className="space-y-3 mb-4">
              <div className="relative">
                <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  placeholder="Search products to add..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full pl-9 pr-4 py-2 text-xs bg-white border border-slate-200 rounded-xl focus:outline-hidden focus:ring-2 focus:ring-amber-500"
                />
              </div>

              {/* Category Pills */}
              <div className="flex items-center gap-1.5 overflow-x-auto pb-1 scrollbar-none">
                {categories.map((cat) => (
                  <button
                    key={cat.id}
                    onClick={() => setActiveCategory(cat.name)}
                    className={`px-3 py-1.5 rounded-lg text-xs font-semibold whitespace-nowrap transition-all ${
                      activeCategory === cat.name
                        ? "bg-slate-900 text-white"
                        : "bg-white text-slate-600 border border-slate-200 hover:bg-slate-100"
                    }`}
                  >
                    {cat.name}
                  </button>
                ))}
              </div>
            </div>

            {/* Product Grid */}
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-2.5 overflow-y-auto pr-1">
              {filteredProducts.map((prod) => {
                const stagedQty = pendingItems[prod.id]?.quantity || 0;
                return (
                  <div
                    key={prod.id}
                    onClick={() => handleStageProduct(prod)}
                    className={`p-3 rounded-xl border bg-white cursor-pointer select-none transition-all hover:shadow-xs hover:border-amber-400 flex flex-col justify-between ${
                      stagedQty > 0 ? "border-amber-400 ring-1 ring-amber-400/40 bg-amber-50/20" : "border-slate-200"
                    }`}
                  >
                    <div>
                      <div className="text-xs font-bold text-slate-800 line-clamp-1">{prod.name}</div>
                      <span className="text-[10px] text-slate-400">{prod.category_name}</span>
                    </div>

                    <div className="flex items-center justify-between mt-3">
                      <span className="text-xs font-extrabold text-slate-900">₹{prod.price}</span>
                      <div className="flex items-center gap-1">
                        {stagedQty > 0 && (
                          <span className="w-5 h-5 rounded-md bg-amber-500 text-slate-950 font-black text-[10px] flex items-center justify-center">
                            +{stagedQty}
                          </span>
                        )}
                        <span className="w-6 h-6 rounded-lg bg-slate-100 hover:bg-amber-500 hover:text-slate-950 text-slate-700 flex items-center justify-center transition-colors">
                          <Plus className="w-3.5 h-3.5" />
                        </span>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* RIGHT: Active Order Items & Running Total */}
          <div className="w-80 sm:w-96 shrink-0 flex flex-col bg-white overflow-hidden">
            {/* Staged Items Alert Bar (if items were clicked) */}
            {stagedCount > 0 && (
              <div className="p-3 bg-amber-50 border-b border-amber-200 flex items-center justify-between">
                <div>
                  <span className="text-xs font-bold text-amber-900">{stagedCount} new items selected</span>
                  <div className="text-[11px] text-amber-700">+ ₹{stagedSubtotal.toFixed(2)}</div>
                </div>
                <button
                  onClick={handleSaveStagedItems}
                  disabled={saving}
                  className="px-3 py-1.5 rounded-lg bg-amber-500 hover:bg-amber-600 text-slate-950 font-bold text-xs flex items-center gap-1 shadow-xs transition-colors"
                >
                  <Save className="w-3.5 h-3.5" />
                  <span>{saving ? "Saving..." : "Save to Bill"}</span>
                </button>
              </div>
            )}

            {/* Saved Items Header */}
            <div className="p-4 border-b border-slate-100 flex items-center justify-between bg-slate-50/50">
              <span className="text-xs font-bold text-slate-700 uppercase tracking-wider">
                Current Table Bill ({order?.items?.length || 0} lines)
              </span>
              <span className="text-xs font-bold text-slate-500">
                {order?.items?.reduce((s, i) => s + i.quantity, 0) || 0} Total Items
              </span>
            </div>

            {/* Items List */}
            <div className="flex-1 overflow-y-auto p-4 divide-y divide-slate-100">
              {(!order?.items || order.items.length === 0) ? (
                <div className="py-12 text-center">
                  <ShoppingBag className="w-10 h-10 text-slate-300 mx-auto mb-2" />
                  <p className="text-xs font-bold text-slate-600">No items on this table yet</p>
                  <p className="text-[11px] text-slate-400 mt-1">Select items on the left to add</p>
                </div>
              ) : (
                order.items.map((item) => (
                  <div key={item.id} className="py-3 first:pt-0 last:pb-0 flex items-center justify-between gap-2">
                    <div className="min-w-0 flex-1">
                      <div className="text-xs font-bold text-slate-800 truncate">{item.product_name}</div>
                      <div className="text-[11px] text-slate-400">₹{item.unit_price} each</div>
                    </div>

                    {/* Quantity Controls */}
                    <div className="flex items-center gap-1.5 shrink-0">
                      <button
                        onClick={() => handleUpdateItemQuantity(item.id, item.quantity - 1)}
                        className="w-6 h-6 rounded-md bg-slate-100 hover:bg-slate-200 text-slate-700 flex items-center justify-center transition-colors"
                      >
                        <Minus className="w-3 h-3" />
                      </button>
                      <span className="w-7 text-center font-bold text-xs text-slate-800">
                        {item.quantity}
                      </span>
                      <button
                        onClick={() => handleUpdateItemQuantity(item.id, item.quantity + 1)}
                        className="w-6 h-6 rounded-md bg-slate-100 hover:bg-slate-200 text-slate-700 flex items-center justify-center transition-colors"
                      >
                        <Plus className="w-3 h-3" />
                      </button>
                    </div>

                    {/* Line Total & Remove */}
                    <div className="text-right min-w-[65px] shrink-0">
                      <div className="text-xs font-extrabold text-slate-900">
                        ₹{item.total_price.toFixed(2)}
                      </div>
                      <button
                        onClick={() => handleRemoveItem(item.id)}
                        className="text-[10px] text-rose-500 hover:underline mt-0.5"
                      >
                        Delete
                      </button>
                    </div>
                  </div>
                ))
              )}
            </div>

            {/* Bill Summary & Action Footer */}
            <div className="p-4 bg-slate-50 border-t border-slate-200 space-y-3">
              <div className="space-y-1.5 text-xs">
                <div className="flex justify-between text-slate-600">
                  <span>Subtotal:</span>
                  <span className="font-semibold text-slate-800">₹{order?.subtotal?.toFixed(2) || "0.00"}</span>
                </div>
                {order?.discount_amount > 0 && (
                  <div className="flex justify-between text-emerald-600 font-semibold">
                    <span>Discount:</span>
                    <span>-₹{order.discount_amount.toFixed(2)}</span>
                  </div>
                )}
                {order?.tax > 0 && (
                  <div className="flex justify-between text-slate-600">
                    <span>Tax:</span>
                    <span>₹{order.tax.toFixed(2)}</span>
                  </div>
                )}
                <div className="flex justify-between text-sm font-black text-slate-950 pt-2 border-t border-slate-200">
                  <span>Payable Total:</span>
                  <span className="text-amber-600 text-base">₹{order?.total?.toFixed(2) || "0.00"}</span>
                </div>
              </div>

              {/* Checkout & Close Buttons */}
              <div className="flex items-center gap-2 pt-1">
                <button
                  onClick={onClose}
                  className="flex-1 py-2.5 rounded-xl border border-slate-200 hover:bg-slate-100 font-bold text-xs text-slate-700 transition-colors"
                >
                  Close & Keep Open
                </button>
                <button
                  onClick={() => onProceedCheckout(orderId)}
                  disabled={!order?.items || order.items.length === 0}
                  className="flex-1 py-2.5 rounded-xl bg-amber-500 hover:bg-amber-600 disabled:opacity-40 text-slate-950 font-black text-xs shadow-xs transition-all flex items-center justify-center gap-1.5"
                >
                  <span>Pay & Checkout</span>
                  <ArrowRight className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </Modal>
  );
};

export default TableOrderModal;
