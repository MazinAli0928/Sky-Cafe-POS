// src/pages/OrdersPage.jsx
import React, { useState, useEffect, useCallback } from "react";
import { Search, Printer, Eye, RefreshCw, Filter } from "lucide-react";
import DataTable from "../components/common/DataTable";
import StatusBadge from "../components/common/StatusBadge";
import OrderDetailsModal from "../components/orders/OrderDetailsModal";
import LoadingState from "../components/common/LoadingState";
import ErrorState from "../components/common/ErrorState";
import { useToast } from "../context/ToastContext";
import { useSettings } from "../context/SettingsContext";
import { getOrders, printOrderReceipt, cancelOrder } from "../services/api";
import { printThermalReceipt } from "../services/bluetoothPrinter";

const POLL_INTERVAL_MS = 5000;

const formatDate = (dateStr) => {
  if (!dateStr) return { date: "—", time: "—" };
  const d = new Date(dateStr);
  return {
    date: d.toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" }),
    time: d.toLocaleTimeString("en-IN", { hour: "2-digit", minute: "2-digit" })
  };
};

const mapServerOrder = (o) => {
  const { date, time } = formatDate(o.created_at);
  return {
    id: o.id,
    billNo: o.bill_no,
    tableNo: o.table_no,
    orderType: o.order_type,
    date,
    time,
    items: (o.items || []).map((i) => ({
      id: i.product_id,
      name: i.product_name,
      price: i.unit_price,
      quantity: i.quantity,
      total: i.total_price
    })),
    itemCount: (o.items || []).reduce((acc, i) => acc + i.quantity, 0),
    subtotal: o.subtotal,
    discount: o.discount_amount,
    discountAmount: o.discount_amount,
    discountType: o.discount_type,
    discountValue: o.discount_value,
    discountReason: o.discount_reason,
    managerAuthorized: o.manager_authorized,
    managerName: o.manager_name,
    cashierName: o.cashier_name,
    tax: o.tax,
    total: o.total,
    paymentMethod: o.payment_method,
    status: o.status
  };
};

const OrdersPage = () => {
  const { settings } = useSettings();
  const { addToast } = useToast();
  const [orders, setOrders] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [error, setError] = useState(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState("ALL");
  const [selectedOrder, setSelectedOrder] = useState(null);
  const [isModalOpen, setIsModalOpen] = useState(false);

  const loadOrders = useCallback(async (showFullLoader = false) => {
    try {
      if (showFullLoader) {
        setIsLoading(true);
      } else {
        setIsRefreshing(true);
      }
      setError(null);
      const data = await getOrders();
      // Only include completed / billed orders (exclude active in-progress table drafts)
      const completedOrders = (data || []).filter(
        (o) => o.status !== "OPEN" && o.status !== "READY_FOR_CHECKOUT"
      );
      setOrders(completedOrders.map(mapServerOrder));
    } catch (err) {
      if (showFullLoader) {
        setError(err.message);
      }
      console.error("Failed to load orders:", err);
    } finally {
      setIsLoading(false);
      setIsRefreshing(false);
    }
  }, []);

  // Initial load
  useEffect(() => {
    loadOrders(true);
  }, [loadOrders]);

  // Periodic polling for real-time order updates
  useEffect(() => {
    const timer = setInterval(() => {
      loadOrders(false);
    }, POLL_INTERVAL_MS);
    return () => clearInterval(timer);
  }, [loadOrders]);

  const handleViewOrder = (order) => {
    setSelectedOrder(order);
    setIsModalOpen(true);
  };

  const handlePrintReceipt = async (order) => {
    try {
      addToast(`Printing bill receipt #${order.billNo || order.bill_no}...`, "info");
      await printOrderReceipt(order.id);
      addToast(`Receipt printed on COM8 for Bill #${order.billNo || order.bill_no}`, "success");
    } catch (err) {
      console.warn("Backend print failed, falling back to Web Bluetooth:", err);
      try {
        await printThermalReceipt(order, settings);
        addToast(`Receipt printed via Bluetooth for Bill #${order.billNo || order.bill_no}`, "success");
      } catch (btErr) {
        addToast(`Print failed: ${err.message}`, "error");
      }
    }
  };

  const handleCancelOrder = async (orderId) => {
    try {
      await cancelOrder(orderId);
      addToast(`Order #${orderId} has been cancelled/voided successfully.`, "info");
      await loadOrders(false);
    } catch (err) {
      addToast(`Failed to cancel order: ${err.message}`, "error");
    }
  };

  const filteredOrders = orders.filter((o) => {
    // Status filter
    if (statusFilter !== "ALL" && o.status !== statusFilter) {
      return false;
    }
    // Search query filter
    const query = searchQuery.trim().toLowerCase();
    if (!query) return true;

    return (
      (o.billNo || "").toLowerCase().includes(query) ||
      (o.paymentMethod || "").toLowerCase().includes(query) ||
      (o.cashierName || "").toLowerCase().includes(query) ||
      (o.date || "").toLowerCase().includes(query) ||
      (o.tableNo ? `table ${o.tableNo}` : "").toLowerCase().includes(query)
    );
  });

  const columns = [
    {
      header: "Bill Number",
      accessor: "billNo",
      render: (row) => (
        <div className="flex items-center gap-2">
          <span className="font-extrabold text-amber-600 font-mono text-sm">#{row.billNo}</span>
          {row.tableNo ? (
            <span className="px-1.5 py-0.5 rounded text-[10px] font-bold bg-amber-100 text-amber-800 border border-amber-200">
              T{row.tableNo}
            </span>
          ) : null}
        </div>
      )
    },
    {
      header: "Date & Time",
      accessor: "date",
      render: (row) => (
        <div>
          <div className="font-semibold text-slate-800">{row.date}</div>
          <div className="text-xs text-slate-400 font-mono">{row.time}</div>
        </div>
      )
    },
    {
      header: "Items Summary",
      accessor: "items",
      render: (row) => (
        <div>
          <span className="font-bold text-slate-800">{row.itemCount || row.items.length} items</span>
          <div className="text-xs text-slate-400 truncate max-w-[200px]">
            {row.items.map((i) => `${i.quantity}x ${i.name}`).join(", ")}
          </div>
        </div>
      )
    },
    {
      header: "Cashier",
      accessor: "cashierName",
      render: (row) => (
        <span className="text-xs text-slate-600 font-medium">{row.cashierName || "—"}</span>
      )
    },
    {
      header: "Total Amount",
      accessor: "total",
      render: (row) => <span className="font-extrabold text-slate-900 text-sm">₹{row.total}</span>
    },
    {
      header: "Payment",
      accessor: "paymentMethod",
      render: (row) => (
        <span className="font-bold text-xs text-slate-700 bg-slate-100 px-2.5 py-1 rounded-lg border border-slate-200">
          {row.paymentMethod}
        </span>
      )
    },
    {
      header: "Status",
      accessor: "status",
      render: (row) => <StatusBadge status={row.status} />
    },
    {
      header: "Actions",
      align: "right",
      render: (row) => (
        <div className="flex items-center justify-end gap-2">
          <button
            title="View details"
            onClick={() => handleViewOrder(row)}
            className="p-1.5 text-slate-500 hover:text-amber-600 hover:bg-amber-50 rounded-lg transition-colors flex items-center gap-1 font-semibold text-xs"
          >
            <Eye className="w-4 h-4" />
            <span>View</span>
          </button>
          <button
            title="Print receipt"
            onClick={() => handlePrintReceipt(row)}
            className="p-1.5 text-slate-500 hover:text-slate-900 hover:bg-slate-100 rounded-lg transition-colors flex items-center gap-1 font-semibold text-xs"
          >
            <Printer className="w-4 h-4" />
            <span>Print</span>
          </button>
        </div>
      )
    }
  ];

  return (
    <div className="p-6 space-y-6 max-w-7xl mx-auto">
      {/* Header & Search */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-extrabold text-slate-800 tracking-tight">Orders History</h2>
          <p className="text-xs text-slate-400">Complete archive of generated customer billing bills</p>
        </div>

        <div className="flex items-center gap-3 w-full sm:w-auto">
          {/* Status Filter Pills */}
          <div className="flex items-center bg-slate-100 p-1 rounded-xl border border-slate-200">
            {["ALL", "Paid", "Cancelled"].map((status) => (
              <button
                key={status}
                onClick={() => setStatusFilter(status)}
                className={`px-3 py-1 rounded-lg text-xs font-bold transition-all ${
                  statusFilter === status
                    ? "bg-white text-slate-900 shadow-sm"
                    : "text-slate-500 hover:text-slate-800"
                }`}
              >
                {status === "ALL" ? "All Orders" : status}
              </button>
            ))}
          </div>

          <div className="relative flex-1 sm:w-64">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              placeholder="Search bill #, cashier, payment..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-9 pr-3 py-2 bg-white border border-slate-200 rounded-xl text-xs font-medium focus:outline-none focus:border-amber-500 shadow-sm"
            />
          </div>
          <button
            onClick={() => loadOrders(false)}
            title="Refresh orders"
            className="p-2 rounded-xl bg-white border border-slate-200 text-slate-600 hover:bg-slate-50 transition-colors shadow-sm"
          >
            <RefreshCw className={`w-4 h-4 ${isRefreshing ? "animate-spin text-amber-500" : ""}`} />
          </button>
        </div>
      </div>

      {/* Orders Table */}
      {isLoading ? (
        <LoadingState message="Loading orders..." />
      ) : error ? (
        <ErrorState message={error} onRetry={() => loadOrders(true)} />
      ) : (
        <DataTable
          columns={columns}
          data={filteredOrders}
          emptyMessage="No Orders Found"
          emptySubtext="Processed transactions and completed table checkouts will appear in this history list."
        />
      )}

      {/* Order Details Modal */}
      <OrderDetailsModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        order={selectedOrder}
        onCancelOrder={handleCancelOrder}
      />
    </div>
  );
};

export default OrdersPage;
