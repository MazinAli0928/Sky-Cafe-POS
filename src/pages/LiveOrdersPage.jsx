import React, { useState, useEffect, useCallback, useMemo } from "react";
import {
  UtensilsCrossed,
  Search,
  RefreshCw,
  SlidersHorizontal,
  CheckCircle2,
  Users,
  AlertCircle,
  Plus
} from "lucide-react";
import {
  getTables,
  openTableOrder,
  cancelLiveOrder
} from "../services/api";
import { useAuth } from "../context/AuthContext";
import { useToast } from "../context/ToastContext";
import TableCard from "../components/liveOrders/TableCard";
import TableOrderModal from "../components/liveOrders/TableOrderModal";
import TableCheckoutModal from "../components/liveOrders/TableCheckoutModal";
import TableSettingsModal from "../components/liveOrders/TableSettingsModal";
import OrderDetailsModal from "../components/orders/OrderDetailsModal";
import ManagerPinModal from "../components/pos/ManagerPinModal";
import LoadingState from "../components/common/LoadingState";
import ErrorState from "../components/common/ErrorState";

const POLL_INTERVAL_MS = 5000; // 5s live sync

const LiveOrdersPage = () => {
  const { user, isManager } = useAuth();
  const { addToast } = useToast();

  const [tables, setTables] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // Search & Filter state
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState("ALL"); // "ALL" | "AVAILABLE" | "OCCUPIED" | "READY_FOR_CHECKOUT"

  // Active Modals state
  const [selectedOrderId, setSelectedOrderId] = useState(null);
  const [selectedTable, setSelectedTable] = useState(null);
  const [isOrderModalOpen, setIsOrderModalOpen] = useState(false);
  const [isCheckoutModalOpen, setIsCheckoutModalOpen] = useState(false);
  const [isSettingsModalOpen, setIsSettingsModalOpen] = useState(false);

  // Completed Order Receipt Modal
  const [completedOrderForReceipt, setCompletedOrderForReceipt] = useState(null);
  const [isReceiptModalOpen, setIsReceiptModalOpen] = useState(false);

  // Cancellation state
  const [cancellingOrderId, setCancellingOrderId] = useState(null);
  const [isCancelPinModalOpen, setIsCancelPinModalOpen] = useState(false);

  // 1. Fetch tables status
  const fetchTablesData = useCallback(async (isSilent = false) => {
    if (!isSilent) setLoading(true);
    setError(null);
    try {
      const data = await getTables();
      setTables(data || []);
    } catch (err) {
      if (!isSilent) setError(err.message);
    } finally {
      if (!isSilent) setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchTablesData(false);
    const interval = setInterval(() => {
      fetchTablesData(true);
    }, POLL_INTERVAL_MS);
    return () => clearInterval(interval);
  }, [fetchTablesData]);

  // Filtered tables
  const filteredTables = useMemo(() => {
    return tables.filter((t) => {
      const matchesSearch =
        t.table_name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        String(t.table_no).includes(searchQuery);

      const matchesStatus =
        statusFilter === "ALL" ||
        (statusFilter === "AVAILABLE" && t.status === "AVAILABLE") ||
        (statusFilter === "OCCUPIED" && t.status === "OCCUPIED") ||
        (statusFilter === "READY_FOR_CHECKOUT" && t.status === "READY_FOR_CHECKOUT");

      return matchesSearch && matchesStatus;
    });
  }, [tables, searchQuery, statusFilter]);

  // Overall stats
  const stats = useMemo(() => {
    const total = tables.length;
    const occupied = tables.filter((t) => t.status === "OCCUPIED").length;
    const ready = tables.filter((t) => t.status === "READY_FOR_CHECKOUT").length;
    const available = tables.filter((t) => t.status === "AVAILABLE").length;
    const runningRevenue = tables.reduce(
      (sum, t) => sum + (t.active_order?.total_amount || 0),
      0
    );
    return { total, occupied, ready, available, runningRevenue };
  }, [tables]);

  // 2. Open an available table
  const handleOpenTable = async (tableNo) => {
    try {
      const order = await openTableOrder(tableNo);
      addToast(`Table ${tableNo} opened!`, "success");
      await fetchTablesData(true);
      const tableObj = tables.find((t) => t.table_no === tableNo);
      setSelectedOrderId(order.id);
      setSelectedTable(tableObj || { table_no: tableNo, table_name: `Table ${tableNo}` });
      setIsOrderModalOpen(true);
    } catch (err) {
      addToast(err.message || "Failed to open table", "error");
    }
  };

  // 3. View / edit an occupied table order
  const handleViewOrder = (orderId) => {
    const tableObj = tables.find((t) => t.active_order?.order_id === orderId);
    setSelectedOrderId(orderId);
    setSelectedTable(tableObj);
    setIsOrderModalOpen(true);
  };

  // 4. Open Checkout Modal
  const handleOpenCheckout = (orderId) => {
    const tableObj = tables.find((t) => t.active_order?.order_id === orderId);
    setSelectedOrderId(orderId);
    setSelectedTable(tableObj);
    setIsOrderModalOpen(false);
    setIsCheckoutModalOpen(true);
  };

  // 5. Checkout completion
  const handleCheckoutSuccess = (completedOrder) => {
    fetchTablesData(true);
    setCompletedOrderForReceipt(completedOrder);
    setIsReceiptModalOpen(true);
  };

  // 6. Void / Cancel live order
  const handleRequestCancelOrder = (orderId) => {
    setCancellingOrderId(orderId);
    if (isManager) {
      // Direct manager confirmation
      if (window.confirm("Are you sure you want to cancel and void this live table order?")) {
        executeCancelOrder(orderId);
      }
    } else {
      // Prompt manager PIN modal for cashiers
      setIsCancelPinModalOpen(true);
    }
  };

  const executeCancelOrder = async (orderId, managerUsername = null, managerPassword = null) => {
    try {
      await cancelLiveOrder(orderId, {
        manager_username: managerUsername,
        manager_password: managerPassword
      });
      addToast("Live table order cancelled. Table is now available.", "info");
      setIsOrderModalOpen(false);
      setIsCancelPinModalOpen(false);
      setCancellingOrderId(null);
      fetchTablesData(true);
    } catch (err) {
      addToast(err.message || "Failed to cancel order", "error");
    }
  };

  return (
    <div className="flex-1 flex flex-col p-6 space-y-6 overflow-y-auto">
      {/* Page Title & Top Stats Banner */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2.5">
            <div className="w-10 h-10 rounded-2xl bg-amber-500/10 border border-amber-500/20 flex items-center justify-center text-amber-500">
              <UtensilsCrossed className="w-5 h-5" />
            </div>
            <div>
              <h1 className="text-xl font-black text-slate-900 tracking-tight leading-none">
                Live Table Orders
              </h1>
              <p className="text-xs text-slate-500 mt-1">
                Real-time dining room floor plan & ongoing table tabs
              </p>
            </div>
          </div>
        </div>

        {/* Top Control Buttons */}
        <div className="flex items-center gap-2">
          <button
            onClick={() => fetchTablesData(false)}
            className="p-2.5 rounded-xl border border-slate-200 bg-white hover:bg-slate-50 text-slate-700 transition-colors shadow-2xs"
            title="Refresh floor plan"
          >
            <RefreshCw className="w-4 h-4" />
          </button>
          {isManager && (
            <button
              onClick={() => setIsSettingsModalOpen(true)}
              className="px-3.5 py-2.5 rounded-xl border border-slate-200 bg-white hover:bg-slate-50 text-slate-700 text-xs font-bold transition-colors flex items-center gap-2 shadow-2xs"
            >
              <SlidersHorizontal className="w-3.5 h-3.5" />
              <span>Configure Tables</span>
            </button>
          )}
        </div>
      </div>

      {/* Summary Stat Pills */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <div className="bg-white p-3.5 rounded-2xl border border-slate-200/80 shadow-2xs flex items-center gap-3">
          <div className="w-9 h-9 rounded-xl bg-slate-100 flex items-center justify-center text-slate-600 font-extrabold text-sm">
            {stats.total}
          </div>
          <div>
            <div className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider">
              Total Tables
            </div>
            <div className="text-sm font-black text-slate-800">{stats.available} Available</div>
          </div>
        </div>

        <div className="bg-white p-3.5 rounded-2xl border border-slate-200/80 shadow-2xs flex items-center gap-3">
          <div className="w-9 h-9 rounded-xl bg-emerald-50 text-emerald-600 border border-emerald-200/60 flex items-center justify-center font-extrabold text-sm">
            {stats.occupied}
          </div>
          <div>
            <div className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider">
              Occupied
            </div>
            <div className="text-sm font-black text-emerald-600">Dining In</div>
          </div>
        </div>

        <div className="bg-white p-3.5 rounded-2xl border border-slate-200/80 shadow-2xs flex items-center gap-3">
          <div className="w-9 h-9 rounded-xl bg-amber-50 text-amber-600 border border-amber-200/60 flex items-center justify-center font-extrabold text-sm">
            {stats.ready}
          </div>
          <div>
            <div className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider">
              Ready to Pay
            </div>
            <div className="text-sm font-black text-amber-600">Bill Requested</div>
          </div>
        </div>

        <div className="bg-slate-900 p-3.5 rounded-2xl border border-slate-800 shadow-2xs flex items-center gap-3">
          <div className="w-9 h-9 rounded-xl bg-amber-500/20 text-amber-400 border border-amber-500/30 flex items-center justify-center font-extrabold text-sm">
            ₹
          </div>
          <div>
            <div className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider">
              Active Table Revenue
            </div>
            <div className="text-sm font-black text-white">
              ₹{stats.runningRevenue.toFixed(2)}
            </div>
          </div>
        </div>
      </div>

      {/* Filter and Search Bar */}
      <div className="bg-white p-3.5 rounded-2xl border border-slate-200/80 shadow-2xs flex flex-col sm:flex-row items-center justify-between gap-3">
        {/* Status Filters */}
        <div className="flex items-center gap-1.5 w-full sm:w-auto overflow-x-auto pb-1 sm:pb-0 scrollbar-none">
          {[
            { id: "ALL", label: "All Tables", count: stats.total },
            { id: "OCCUPIED", label: "Occupied", count: stats.occupied },
            { id: "READY_FOR_CHECKOUT", label: "Ready to Pay", count: stats.ready },
            { id: "AVAILABLE", label: "Available", count: stats.available }
          ].map((tab) => (
            <button
              key={tab.id}
              onClick={() => setStatusFilter(tab.id)}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all whitespace-nowrap flex items-center gap-1.5 ${
                statusFilter === tab.id
                  ? "bg-slate-900 text-white shadow-2xs"
                  : "bg-slate-50 text-slate-600 hover:bg-slate-100 border border-slate-200/60"
              }`}
            >
              <span>{tab.label}</span>
              <span
                className={`text-[10px] px-1.5 py-0.2 rounded-md ${
                  statusFilter === tab.id
                    ? "bg-slate-800 text-amber-400"
                    : "bg-slate-200/70 text-slate-600"
                }`}
              >
                {tab.count}
              </span>
            </button>
          ))}
        </div>

        {/* Search Input */}
        <div className="relative w-full sm:w-64">
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            placeholder="Search table number..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-9 pr-3.5 py-1.5 text-xs bg-slate-50 border border-slate-200 rounded-xl focus:outline-hidden focus:ring-2 focus:ring-amber-500"
          />
        </div>
      </div>

      {/* Main Floor Plan Grid */}
      {loading ? (
        <LoadingState message="Loading live table layout..." />
      ) : error ? (
        <ErrorState message={error} onRetry={() => fetchTablesData(false)} />
      ) : filteredTables.length === 0 ? (
        <div className="bg-white p-12 rounded-2xl border border-slate-200/80 text-center">
          <UtensilsCrossed className="w-12 h-12 text-slate-300 mx-auto mb-3" />
          <h3 className="text-sm font-bold text-slate-700">No tables match your filter</h3>
          <p className="text-xs text-slate-400 mt-1">Try clearing your search query or status filter.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
          {filteredTables.map((table) => (
            <TableCard
              key={table.table_no}
              table={table}
              onOpenTable={handleOpenTable}
              onViewOrder={handleViewOrder}
              onCheckout={handleOpenCheckout}
            />
          ))}
        </div>
      )}

      {/* Table Order Modal (Add/Modify items) */}
      {isOrderModalOpen && selectedOrderId && (
        <TableOrderModal
          isOpen={isOrderModalOpen}
          onClose={() => {
            setIsOrderModalOpen(false);
            fetchTablesData(true);
          }}
          orderId={selectedOrderId}
          tableNo={selectedTable?.table_no}
          tableName={selectedTable?.table_name}
          onProceedCheckout={handleOpenCheckout}
          onCancelOrderClick={handleRequestCancelOrder}
        />
      )}

      {/* Table Checkout Modal (Bill confirmation & Payment) */}
      {isCheckoutModalOpen && selectedOrderId && (
        <TableCheckoutModal
          isOpen={isCheckoutModalOpen}
          onClose={() => {
            setIsCheckoutModalOpen(false);
            fetchTablesData(true);
          }}
          orderId={selectedOrderId}
          tableNo={selectedTable?.table_no}
          tableName={selectedTable?.table_name}
          onCheckoutSuccess={handleCheckoutSuccess}
        />
      )}

      {/* Table Settings Modal (Configure table count) */}
      {isSettingsModalOpen && (
        <TableSettingsModal
          isOpen={isSettingsModalOpen}
          onClose={() => setIsSettingsModalOpen(false)}
          currentCount={stats.total}
          onSaved={() => fetchTablesData(false)}
        />
      )}

      {/* Receipt Preview Modal on Checkout Complete */}
      {isReceiptModalOpen && completedOrderForReceipt && (
        <OrderDetailsModal
          isOpen={isReceiptModalOpen}
          onClose={() => {
            setIsReceiptModalOpen(false);
            setCompletedOrderForReceipt(null);
          }}
          order={completedOrderForReceipt}
        />
      )}

      {/* Manager Pin Modal for cancelling order (if Cashier) */}
      {isCancelPinModalOpen && (
        <ManagerPinModal
          isOpen={isCancelPinModalOpen}
          onClose={() => setIsCancelPinModalOpen(false)}
          onAuthorize={(creds) => {
            if (cancellingOrderId) {
              executeCancelOrder(cancellingOrderId, creds.username, creds.password);
            }
          }}
          title="Manager Authorization Required"
          description="Enter manager credentials to void/cancel this live table order."
        />
      )}
    </div>
  );
};

export default LiveOrdersPage;
