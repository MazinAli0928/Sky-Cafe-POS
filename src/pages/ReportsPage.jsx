import React, { useState, useEffect, useCallback } from "react";
import StatCard from "../components/common/StatCard";
import LoadingState from "../components/common/LoadingState";
import ErrorState from "../components/common/ErrorState";
import EmptyState from "../components/common/EmptyState";
import {
  DollarSign, ShoppingBag, TrendingUp, Banknote, QrCode, CreditCard,
  Calendar, FileText, Tag, ArrowUpDown, XCircle, Download, RefreshCw, ShieldCheck
} from "lucide-react";
import {
  getSalesReport,
  getDiscountReport,
  getProductReport,
  getVoidsReport
} from "../services/api";
import { useAuth } from "../context/AuthContext";
import {
  ResponsiveContainer, BarChart, Bar, XAxis, YAxis, Tooltip, PieChart, Pie, Cell
} from "recharts";

const dateFilterMap = [
  { label: "Today", value: "today" },
  { label: "Yesterday", value: "yesterday" },
  { label: "This Week", value: "this_week" },
  { label: "This Month", value: "this_month" }
];

const ReportsPage = () => {
  const { user, isManager, token } = useAuth();
  const [activeTab, setActiveTab] = useState("sales"); // "sales" | "discounts" | "products" | "voids"
  const [dateFilter, setDateFilter] = useState("today");
  const [productSortBy, setProductSortBy] = useState("quantity"); // "quantity" | "revenue"

  const [salesData, setSalesData] = useState(null);
  const [discountData, setDiscountData] = useState(null);
  const [productData, setProductData] = useState([]);
  const [voidsData, setVoidsData] = useState([]);

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const fetchReportData = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      if (activeTab === "sales") {
        const res = await getSalesReport(dateFilter, null, null, token);
        setSalesData(res);
      } else if (activeTab === "discounts") {
        if (!isManager) {
          setError("Manager access required for Discount Reports.");
          setLoading(false);
          return;
        }
        const res = await getDiscountReport(dateFilter, null, null, token);
        setDiscountData(res);
      } else if (activeTab === "products") {
        const res = await getProductReport(dateFilter, productSortBy, null, null, token);
        setProductData(res);
      } else if (activeTab === "voids") {
        const res = await getVoidsReport(dateFilter, null, null, token);
        setVoidsData(res);
      }
    } catch (err) {
      setError(err.message || "Failed to load report data.");
    } finally {
      setLoading(false);
    }
  }, [activeTab, dateFilter, productSortBy, isManager, token]);

  useEffect(() => {
    fetchReportData();
  }, [fetchReportData]);

  const handleTabChange = (tab) => {
    setActiveTab(tab);
    setError(null);
  };

  const formatDate = (dateStr) => {
    if (!dateStr) return "—";
    const d = new Date(dateStr);
    return d.toLocaleString("en-IN", {
      day: "2-digit", month: "short", year: "numeric",
      hour: "2-digit", minute: "2-digit"
    });
  };

  return (
    <div className="p-6 space-y-6 max-w-7xl mx-auto select-none">
      {/* Header & Controls */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-black text-slate-800 tracking-tight">Reports & Analytics</h2>
          <p className="text-xs text-slate-500 mt-0.5">Database aggregated financial breakdowns & staff audit logs</p>
        </div>

        {/* Date Filter & Refresh */}
        <div className="flex items-center gap-2">
          <div className="flex items-center gap-1 p-1 bg-white border border-slate-200 rounded-xl shadow-xs">
            {dateFilterMap.map((f) => (
              <button
                key={f.value}
                onClick={() => setDateFilter(f.value)}
                className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
                  dateFilter === f.value
                    ? "bg-slate-900 text-amber-400 shadow-xs"
                    : "text-slate-600 hover:text-slate-900 hover:bg-slate-100"
                }`}
              >
                {f.label}
              </button>
            ))}
          </div>

          <button
            onClick={fetchReportData}
            title="Refresh Report"
            className="p-2 rounded-xl bg-white border border-slate-200 text-slate-600 hover:bg-slate-50 transition-colors shadow-xs"
          >
            <RefreshCw className={`w-4 h-4 ${loading ? "animate-spin" : ""}`} />
          </button>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex items-center gap-2 border-b border-slate-200 pb-1">
        <button
          onClick={() => handleTabChange("sales")}
          className={`px-4 py-2.5 rounded-xl font-bold text-xs flex items-center gap-2 transition-all ${
            activeTab === "sales"
              ? "bg-slate-900 text-amber-400 shadow-sm"
              : "text-slate-600 hover:bg-slate-100"
          }`}
        >
          <FileText className="w-4 h-4" />
          <span>Sales Report</span>
        </button>

        {isManager && (
          <button
            onClick={() => handleTabChange("discounts")}
            className={`px-4 py-2.5 rounded-xl font-bold text-xs flex items-center gap-2 transition-all ${
              activeTab === "discounts"
                ? "bg-slate-900 text-amber-400 shadow-sm"
                : "text-slate-600 hover:bg-slate-100"
            }`}
          >
            <Tag className="w-4 h-4 text-amber-500" />
            <span>Discount Report</span>
            <span className="text-[10px] font-extrabold px-1.5 py-0.5 rounded bg-amber-500/20 text-amber-400">
              Manager
            </span>
          </button>
        )}

        <button
          onClick={() => handleTabChange("products")}
          className={`px-4 py-2.5 rounded-xl font-bold text-xs flex items-center gap-2 transition-all ${
            activeTab === "products"
              ? "bg-slate-900 text-amber-400 shadow-sm"
              : "text-slate-600 hover:bg-slate-100"
          }`}
        >
          <TrendingUp className="w-4 h-4" />
          <span>Product Performance</span>
        </button>

        <button
          onClick={() => handleTabChange("voids")}
          className={`px-4 py-2.5 rounded-xl font-bold text-xs flex items-center gap-2 transition-all ${
            activeTab === "voids"
              ? "bg-slate-900 text-amber-400 shadow-sm"
              : "text-slate-600 hover:bg-slate-100"
          }`}
        >
          <XCircle className="w-4 h-4 text-rose-400" />
          <span>Cancelled / Voids</span>
        </button>
      </div>

      {/* Main Content Area */}
      {loading ? (
        <LoadingState message="Computing database report metrics..." />
      ) : error ? (
        <ErrorState message={error} onRetry={fetchReportData} />
      ) : (
        <>
          {/* TAB 1: SALES REPORT */}
          {activeTab === "sales" && salesData && (
            <div className="space-y-6">
              {/* Metrics Row */}
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-3">
                <StatCard title="Gross Sales" value={`₹${salesData.gross_sales.toLocaleString()}`} icon={DollarSign} color="emerald" />
                <StatCard title="Total Discounts" value={`₹${salesData.discounts.toLocaleString()}`} icon={Tag} color="amber" />
                <StatCard title="Net Sales" value={`₹${salesData.net_sales.toLocaleString()}`} icon={TrendingUp} color="indigo" />
                <StatCard title="Cash Sales" value={`₹${salesData.cash_sales.toLocaleString()}`} icon={Banknote} color="amber" />
                <StatCard title="UPI Sales" value={`₹${salesData.upi_sales.toLocaleString()}`} icon={QrCode} color="emerald" />
                <StatCard title="Card Sales" value={`₹${salesData.card_sales.toLocaleString()}`} icon={CreditCard} color="indigo" />
              </div>

              {/* Summary Table */}
              <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden">
                <div className="p-4 border-b border-slate-100 bg-slate-50/50 flex items-center justify-between">
                  <h3 className="font-bold text-slate-800 text-sm">Financial Breakdown</h3>
                  <span className="text-xs font-semibold text-slate-500">
                    Range: {dateFilterMap.find(d => d.value === dateFilter)?.label}
                  </span>
                </div>
                <div className="p-5 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6 text-sm">
                  <div className="p-4 rounded-xl bg-slate-50 border border-slate-200/80">
                    <div className="text-xs text-slate-500 font-bold">Total Orders Processed</div>
                    <div className="text-2xl font-black text-slate-900 mt-1">{salesData.total_orders}</div>
                  </div>
                  <div className="p-4 rounded-xl bg-slate-50 border border-slate-200/80">
                    <div className="text-xs text-slate-500 font-bold">Average Order Value</div>
                    <div className="text-2xl font-black text-amber-600 mt-1">₹{salesData.avg_order_value}</div>
                  </div>
                  <div className="p-4 rounded-xl bg-slate-50 border border-slate-200/80">
                    <div className="text-xs text-slate-500 font-bold">Total Tax Collected</div>
                    <div className="text-2xl font-black text-slate-900 mt-1">₹{salesData.tax}</div>
                  </div>
                  <div className="p-4 rounded-xl bg-slate-50 border border-slate-200/80">
                    <div className="text-xs text-slate-500 font-bold">Cancelled / Void Orders</div>
                    <div className="text-2xl font-black text-rose-600 mt-1">{salesData.cancelled_orders}</div>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* TAB 2: DISCOUNT REPORT (MANAGER ONLY) */}
          {activeTab === "discounts" && discountData && (
            <div className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="p-5 rounded-2xl bg-amber-50 border border-amber-200/80 flex items-center justify-between">
                  <div>
                    <div className="text-xs font-bold text-amber-900 uppercase tracking-wider">Total Discount Value</div>
                    <div className="text-3xl font-black text-amber-600 mt-1">₹{discountData.total_discount_amount}</div>
                  </div>
                  <Tag className="w-8 h-8 text-amber-500" />
                </div>
                <div className="p-5 rounded-2xl bg-slate-900 text-white flex items-center justify-between">
                  <div>
                    <div className="text-xs font-bold text-slate-400 uppercase tracking-wider">Discounted Orders Count</div>
                    <div className="text-3xl font-black text-amber-400 mt-1">{discountData.discount_count}</div>
                  </div>
                  <ShieldCheck className="w-8 h-8 text-amber-400" />
                </div>
              </div>

              <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden">
                {discountData.discounts.length === 0 ? (
                  <EmptyState icon={Tag} title="No Manager Discounts" description="No discounts were authorized in the selected period." />
                ) : (
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b border-slate-100 bg-slate-50 text-[11px] font-bold text-slate-500 uppercase tracking-wider">
                        <th className="text-left px-5 py-3">Bill #</th>
                        <th className="text-left px-5 py-3">Date & Time</th>
                        <th className="text-left px-5 py-3">Discount Details</th>
                        <th className="text-left px-5 py-3">Amount</th>
                        <th className="text-left px-5 py-3">Reason</th>
                        <th className="text-left px-5 py-3">Authorized By</th>
                        <th className="text-left px-5 py-3">Cashier</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-50 font-medium text-xs">
                      {discountData.discounts.map((d) => (
                        <tr key={d.id} className="hover:bg-slate-50 transition-colors">
                          <td className="px-5 py-3.5 font-bold font-mono text-amber-600">#{d.bill_no}</td>
                          <td className="px-5 py-3.5 text-slate-600">{formatDate(d.created_at)}</td>
                          <td className="px-5 py-3.5">
                            <span className="font-bold text-slate-900">
                              {d.discount_type === "percentage" ? `${d.discount_value}%` : `₹${d.discount_value}`}
                            </span>
                          </td>
                          <td className="px-5 py-3.5 font-extrabold text-emerald-600">-₹{d.discount_amount}</td>
                          <td className="px-5 py-3.5 text-slate-600">{d.discount_reason}</td>
                          <td className="px-5 py-3.5 font-semibold text-slate-900">{d.authorized_by_name}</td>
                          <td className="px-5 py-3.5 text-slate-600">{d.cashier_name}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                )}
              </div>
            </div>
          )}

          {/* TAB 3: PRODUCT PERFORMANCE REPORT */}
          {activeTab === "products" && (
            <div className="space-y-4">
              <div className="flex items-center justify-between bg-white p-4 rounded-xl border border-slate-200">
                <div className="text-xs font-bold text-slate-700">Sort Performance By:</div>
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => setProductSortBy("quantity")}
                    className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
                      productSortBy === "quantity"
                        ? "bg-slate-900 text-amber-400"
                        : "bg-slate-100 text-slate-600"
                    }`}
                  >
                    Quantity Sold
                  </button>
                  <button
                    onClick={() => setProductSortBy("revenue")}
                    className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
                      productSortBy === "revenue"
                        ? "bg-slate-900 text-amber-400"
                        : "bg-slate-100 text-slate-600"
                    }`}
                  >
                    Total Revenue
                  </button>
                </div>
              </div>

              <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden">
                {productData.length === 0 ? (
                  <EmptyState icon={TrendingUp} title="No Product Sales" description="No items were sold in this selected date range." />
                ) : (
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b border-slate-100 bg-slate-50 text-[11px] font-bold text-slate-500 uppercase tracking-wider">
                        <th className="text-left px-5 py-3">Product</th>
                        <th className="text-center px-5 py-3">Units Sold</th>
                        <th className="text-right px-5 py-3">Total Revenue</th>
                        <th className="text-right px-5 py-3">% Share of Sales</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-50 font-medium text-xs">
                      {productData.map((p, idx) => (
                        <tr key={p.product_name} className="hover:bg-slate-50 transition-colors">
                          <td className="px-5 py-3.5 font-bold text-slate-900 flex items-center gap-2">
                            <span className="w-5 h-5 rounded-full bg-slate-100 text-slate-600 flex items-center justify-center text-[10px] font-bold">
                              #{idx + 1}
                            </span>
                            <span>{p.product_name}</span>
                          </td>
                          <td className="px-5 py-3.5 text-center font-bold text-amber-600">{p.quantity_sold}</td>
                          <td className="px-5 py-3.5 text-right font-extrabold text-slate-900">₹{p.revenue.toLocaleString()}</td>
                          <td className="px-5 py-3.5 text-right font-semibold text-slate-600">{p.percentage}%</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                )}
              </div>
            </div>
          )}

          {/* TAB 4: CANCELLED / VOIDS REPORT */}
          {activeTab === "voids" && (
            <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden">
              {voidsData.length === 0 ? (
                <EmptyState icon={XCircle} title="No Cancelled Orders" description="No orders were cancelled/voided during this period." />
              ) : (
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-slate-100 bg-slate-50 text-[11px] font-bold text-slate-500 uppercase tracking-wider">
                      <th className="text-left px-5 py-3">Bill #</th>
                      <th className="text-left px-5 py-3">Date & Time</th>
                      <th className="text-left px-5 py-3">Cashier</th>
                      <th className="text-right px-5 py-3">Original Total</th>
                      <th className="text-right px-5 py-3">Status</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-50 font-medium text-xs">
                    {voidsData.map((v) => (
                      <tr key={v.id} className="hover:bg-slate-50 transition-colors">
                        <td className="px-5 py-3.5 font-bold font-mono text-rose-600">#{v.bill_no}</td>
                        <td className="px-5 py-3.5 text-slate-600">{formatDate(v.created_at)}</td>
                        <td className="px-5 py-3.5 text-slate-800">{v.cashier_name}</td>
                        <td className="px-5 py-3.5 text-right font-extrabold text-slate-900">₹{v.total}</td>
                        <td className="px-5 py-3.5 text-right font-bold text-rose-600 uppercase text-[10px]">
                          {v.status}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </div>
          )}
        </>
      )}
    </div>
  );
};

export default ReportsPage;
