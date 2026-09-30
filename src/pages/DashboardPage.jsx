import React, { useState, useEffect, useCallback } from "react";
import StatCard from "../components/common/StatCard";
import LoadingState from "../components/common/LoadingState";
import ErrorState from "../components/common/ErrorState";
import {
  DollarSign, ShoppingBag, TrendingUp, Package, Trophy,
  Banknote, QrCode, CreditCard, Tag, XCircle, Calendar, RefreshCw
} from "lucide-react";
import { getDashboardAnalytics } from "../services/api";
import { useAuth } from "../context/AuthContext";
import {
  ResponsiveContainer, AreaChart, Area, XAxis, YAxis, Tooltip, PieChart, Pie, Cell
} from "recharts";

const rangeOptions = [
  { value: "7days", label: "7 Days" },
  { value: "today", label: "Today" },
  { value: "30days", label: "30 Days" }
];

const DashboardPage = () => {
  const { token } = useAuth();
  const [range, setRange] = useState("7days");
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const fetchAnalytics = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await getDashboardAnalytics(range, null, null, token);
      setData(res);
    } catch (err) {
      setError(err.message || "Failed to load dashboard metrics.");
    } finally {
      setLoading(false);
    }
  }, [range, token]);

  useEffect(() => {
    fetchAnalytics();
  }, [fetchAnalytics]);

  if (loading && !data) {
    return (
      <div className="p-6 max-w-7xl mx-auto">
        <LoadingState message="Loading real-time sales analytics from database..." />
      </div>
    );
  }

  if (error && !data) {
    return (
      <div className="p-6 max-w-7xl mx-auto">
        <ErrorState message={error} onRetry={fetchAnalytics} />
      </div>
    );
  }

  const stats = data?.stats || {
    todaysSales: 0, todaysOrders: 0, averageOrder: 0, itemsSold: 0,
    discountsGiven: 0, cashSales: 0, upiSales: 0, cardSales: 0, cancelledOrders: 0
  };

  const salesOverview = data?.salesOverview || [];
  const paymentBreakdown = data?.paymentBreakdown || [];
  const topProducts = data?.topProducts || [];
  const totalPaymentVol = paymentBreakdown.reduce((sum, item) => sum + item.value, 0);

  return (
    <div className="p-6 space-y-6 max-w-7xl mx-auto select-none">
      {/* Page Header & Range Filter */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-black text-slate-800 tracking-tight">Executive Dashboard</h2>
          <p className="text-xs text-slate-500 mt-0.5">Real-time revenue metrics & database performance summaries</p>
        </div>

        <div className="flex items-center gap-2">
          <div className="flex items-center gap-1 p-1 bg-white border border-slate-200 rounded-xl shadow-xs">
            {rangeOptions.map((opt) => (
              <button
                key={opt.value}
                onClick={() => setRange(opt.value)}
                className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
                  range === opt.value
                    ? "bg-slate-900 text-amber-400 shadow-xs"
                    : "text-slate-600 hover:text-slate-900 hover:bg-slate-100"
                }`}
              >
                {opt.label}
              </button>
            ))}
          </div>

          <button
            onClick={fetchAnalytics}
            title="Refresh Data"
            className="p-2 rounded-xl bg-white border border-slate-200 text-slate-600 hover:bg-slate-50 transition-colors shadow-xs"
          >
            <RefreshCw className={`w-4 h-4 ${loading ? "animate-spin" : ""}`} />
          </button>
        </div>
      </div>

      {/* Top Stat Cards — Row 1 (Core Sales Metrics) */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard
          title="Today's Sales"
          value={`₹${stats.todaysSales.toLocaleString()}`}
          subtext="Completed paid sales"
          icon={DollarSign}
          color="emerald"
        />
        <StatCard
          title="Today's Orders"
          value={stats.todaysOrders}
          subtext="Paid transactions"
          icon={ShoppingBag}
          color="amber"
        />
        <StatCard
          title="Average Order Value"
          value={`₹${stats.averageOrder.toLocaleString()}`}
          subtext="Per completed bill"
          icon={TrendingUp}
          color="indigo"
        />
        <StatCard
          title="Items Sold"
          value={stats.itemsSold}
          subtext="Total units"
          icon={Package}
          color="rose"
        />
      </div>

      {/* Secondary Stat Cards — Row 2 (Detailed Breakdown: Payment Methods & Discounts/Voids) */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3">
        <div className="bg-white p-4 rounded-xl border border-slate-200/80 flex items-center justify-between">
          <div>
            <div className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">Cash Sales</div>
            <div className="text-lg font-black text-slate-800 mt-0.5">₹{stats.cashSales.toLocaleString()}</div>
          </div>
          <div className="w-9 h-9 rounded-lg bg-amber-50 text-amber-600 flex items-center justify-center border border-amber-200">
            <Banknote className="w-4 h-4" />
          </div>
        </div>

        <div className="bg-white p-4 rounded-xl border border-slate-200/80 flex items-center justify-between">
          <div>
            <div className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">UPI Sales</div>
            <div className="text-lg font-black text-slate-800 mt-0.5">₹{stats.upiSales.toLocaleString()}</div>
          </div>
          <div className="w-9 h-9 rounded-lg bg-emerald-50 text-emerald-600 flex items-center justify-center border border-emerald-200">
            <QrCode className="w-4 h-4" />
          </div>
        </div>

        <div className="bg-white p-4 rounded-xl border border-slate-200/80 flex items-center justify-between">
          <div>
            <div className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">Card Sales</div>
            <div className="text-lg font-black text-slate-800 mt-0.5">₹{stats.cardSales.toLocaleString()}</div>
          </div>
          <div className="w-9 h-9 rounded-lg bg-indigo-50 text-indigo-600 flex items-center justify-center border border-indigo-200">
            <CreditCard className="w-4 h-4" />
          </div>
        </div>

        <div className="bg-white p-4 rounded-xl border border-slate-200/80 flex items-center justify-between">
          <div>
            <div className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">Discounts Given</div>
            <div className="text-lg font-black text-amber-600 mt-0.5">₹{stats.discountsGiven.toLocaleString()}</div>
          </div>
          <div className="w-9 h-9 rounded-lg bg-amber-50 text-amber-600 flex items-center justify-center border border-amber-200">
            <Tag className="w-4 h-4" />
          </div>
        </div>

        <div className="bg-white p-4 rounded-xl border border-slate-200/80 flex items-center justify-between">
          <div>
            <div className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">Cancelled Orders</div>
            <div className="text-lg font-black text-rose-600 mt-0.5">{stats.cancelledOrders}</div>
          </div>
          <div className="w-9 h-9 rounded-lg bg-rose-50 text-rose-600 flex items-center justify-center border border-rose-200">
            <XCircle className="w-4 h-4" />
          </div>
        </div>
      </div>

      {/* Middle Section: Real Sales Chart & Payment Donut Chart */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Sales Overview Chart */}
        <div className="lg:col-span-2 bg-white p-6 rounded-2xl border border-slate-200/80 shadow-xs space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-base font-bold text-slate-800">Sales Overview</h3>
              <p className="text-xs text-slate-400">Total revenue computed from database paid transactions</p>
            </div>
            <div className="flex items-center gap-1.5 text-xs font-semibold px-3 py-1 bg-amber-50 text-amber-700 rounded-lg border border-amber-200">
              <Calendar className="w-3.5 h-3.5 text-amber-600" />
              <span>Range: {rangeOptions.find(r => r.value === range)?.label}</span>
            </div>
          </div>

          <div className="h-64 w-full pt-2">
            {salesOverview.length === 0 ? (
              <div className="h-full flex items-center justify-center text-slate-400 text-xs font-semibold">
                No revenue recorded in this period.
              </div>
            ) : (
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={salesOverview}>
                  <defs>
                    <linearGradient id="salesGrad" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#f59e0b" stopOpacity={0.35} />
                      <stop offset="95%" stopColor="#f59e0b" stopOpacity={0.0} />
                    </linearGradient>
                  </defs>
                  <XAxis dataKey="day" stroke="#94a3b8" fontSize={11} tickLine={false} />
                  <YAxis
                    stroke="#94a3b8"
                    fontSize={11}
                    tickLine={false}
                    axisLine={false}
                    tickFormatter={(val) => `₹${val >= 1000 ? `${(val / 1000).toFixed(1)}k` : val}`}
                  />
                  <Tooltip
                    formatter={(value) => [`₹${value.toLocaleString()}`, "Revenue"]}
                    contentStyle={{
                      backgroundColor: "#0f172a",
                      borderColor: "#334155",
                      borderRadius: "12px",
                      color: "#fff",
                      fontSize: "12px"
                    }}
                  />
                  <Area
                    type="monotone"
                    dataKey="sales"
                    stroke="#f59e0b"
                    strokeWidth={3}
                    fillOpacity={1}
                    fill="url(#salesGrad)"
                  />
                </AreaChart>
              </ResponsiveContainer>
            )}
          </div>
        </div>

        {/* Real Payment Methods Donut Chart */}
        <div className="bg-white p-6 rounded-2xl border border-slate-200/80 shadow-xs space-y-4 flex flex-col justify-between">
          <div>
            <h3 className="text-base font-bold text-slate-800">Payment Breakdown</h3>
            <p className="text-xs text-slate-400">Actual distribution of completed transactions</p>
          </div>

          <div className="h-44 w-full relative flex items-center justify-center">
            {totalPaymentVol === 0 ? (
              <div className="text-xs text-slate-400 font-semibold">No paid orders today</div>
            ) : (
              <>
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={paymentBreakdown}
                      innerRadius={55}
                      outerRadius={75}
                      paddingAngle={5}
                      dataKey="value"
                    >
                      {paymentBreakdown.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={entry.color} />
                      ))}
                    </Pie>
                    <Tooltip
                      formatter={(val) => [`₹${val.toLocaleString()}`, "Volume"]}
                      contentStyle={{
                        backgroundColor: "#0f172a",
                        borderRadius: "10px",
                        color: "#fff"
                      }}
                    />
                  </PieChart>
                </ResponsiveContainer>
                <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
                  <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Total</span>
                  <span className="text-base font-black text-slate-900">₹{totalPaymentVol.toLocaleString()}</span>
                </div>
              </>
            )}
          </div>

          <div className="space-y-2 pt-2 border-t border-slate-100">
            {paymentBreakdown.map((item) => (
              <div key={item.name} className="flex items-center justify-between text-xs font-medium">
                <div className="flex items-center gap-2">
                  <span className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: item.color }} />
                  <span className="text-slate-700 font-semibold">{item.name}</span>
                </div>
                <div className="flex gap-3">
                  <span className="font-extrabold text-slate-900">₹{item.value.toLocaleString()}</span>
                  <span className="text-slate-400 font-normal w-10 text-right">{item.percentage}%</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Bottom Section: Top Selling Products */}
      <div className="bg-white p-6 rounded-2xl border border-slate-200/80 shadow-xs space-y-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="p-2 rounded-xl bg-amber-50 text-amber-600 border border-amber-200">
              <Trophy className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base font-bold text-slate-800">Top Selling Products</h3>
              <p className="text-xs text-slate-400">Actual highest volume items from database</p>
            </div>
          </div>
        </div>

        {topProducts.length === 0 ? (
          <div className="p-8 text-center text-slate-400 text-xs font-semibold">
            No product sales recorded in selected range.
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4 pt-2">
            {topProducts.map((product, idx) => (
              <div
                key={product.name}
                className="p-4 rounded-xl border border-slate-200/80 bg-slate-50/50 flex flex-col justify-between space-y-3 hover:border-amber-400 transition-colors"
              >
                <div className="flex items-start justify-between">
                  <span className="text-xs font-extrabold w-6 h-6 rounded-full bg-amber-500 text-slate-950 flex items-center justify-center shadow-xs">
                    #{idx + 1}
                  </span>
                  <span className="text-[10px] font-bold px-2 py-0.5 rounded-md bg-white text-slate-600 border border-slate-200">
                    {product.category}
                  </span>
                </div>

                <div>
                  <h4 className="font-bold text-slate-800 text-sm truncate">{product.name}</h4>
                  <p className="text-xs font-bold text-amber-600 mt-0.5">{product.sold} sold</p>
                </div>

                <div className="pt-2 border-t border-slate-200/60 flex justify-between items-center text-xs">
                  <span className="text-slate-400 font-medium">Revenue</span>
                  <span className="font-extrabold text-slate-900">₹{product.revenue.toLocaleString()}</span>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default DashboardPage;
