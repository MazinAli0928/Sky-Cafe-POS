import React, { useState, useEffect, useMemo, useCallback } from "react";
import { Search, RefreshCw } from "lucide-react";
import { getProducts, getCategories } from "../services/api";
import ProductCard from "../components/pos/ProductCard";
import CategoryTabs from "../components/pos/CategoryTabs";
import CartPanel from "../components/pos/CartPanel";
import OrderDetailsModal from "../components/orders/OrderDetailsModal";
import EmptyState from "../components/common/EmptyState";
import LoadingState from "../components/common/LoadingState";
import ErrorState from "../components/common/ErrorState";
import { useCart } from "../context/CartContext";

const PosPage = () => {
  const { cartItems, addToCart } = useCart();
  const [products, setProducts] = useState([]);
  const [categories, setCategories] = useState([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [activeCategory, setActiveCategory] = useState("All");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // Modal state when bill is generated
  const [selectedOrderForModal, setSelectedOrderForModal] = useState(null);
  const [isModalOpen, setIsModalOpen] = useState(false);

  const fetchPosData = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      // Only fetch available products for POS (Requirement 22)
      const [prodData, catData] = await Promise.all([
        getProducts({ is_available: true }),
        getCategories()
      ]);

      // Map products to match component shape
      const mappedProducts = prodData.map((p) => ({
        id: p.id,
        name: p.name,
        category: p.category_name,
        price: p.price,
        isAvailable: p.is_available,
        badge: p.price > 140 ? "Bestseller" : null
      }));

      const activeCategories = catData.filter((c) => c.is_active);
      const categoryTabsList = [
        { id: "all", name: "All", count: mappedProducts.length },
        ...activeCategories.map((c) => ({
          id: c.id,
          name: c.name,
          count: mappedProducts.filter((p) => p.category === c.name).length
        }))
      ];

      setProducts(mappedProducts);
      setCategories(categoryTabsList);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchPosData();
  }, [fetchPosData]);

  // Filter products based on search term and category
  const filteredProducts = useMemo(() => {
    return products.filter((p) => {
      const matchesSearch =
        p.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        (p.category && p.category.toLowerCase().includes(searchQuery.toLowerCase()));
      const matchesCategory = activeCategory === "All" || p.category === activeCategory;
      return matchesSearch && matchesCategory;
    });
  }, [products, searchQuery, activeCategory]);

  const handlePrintSuccess = (newOrder) => {
    setSelectedOrderForModal(newOrder);
    setIsModalOpen(true);
  };

  return (
    <div className="flex flex-col lg:flex-row h-[calc(100vh-4rem)] w-full overflow-hidden">
      {/* LEFT SIDE: Product Catalogue & Search */}
      <div className="flex-1 flex flex-col p-6 space-y-4 overflow-y-auto min-w-0">
        {/* Top Controls: Search & Category Tabs */}
        <div className="space-y-4 bg-white p-4 rounded-2xl border border-slate-200/80 shadow-xs">
          {/* Search Field */}
          <div className="relative flex items-center gap-3">
            <div className="relative flex-1">
              <Search className="w-5 h-5 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                autoFocus
                placeholder="Search products by name or category..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-11 pr-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-sm font-medium text-slate-800 placeholder-slate-400 focus:outline-none focus:border-amber-500 focus:bg-white focus:ring-2 focus:ring-amber-500/20 transition-all"
              />
              {searchQuery && (
                <button
                  onClick={() => setSearchQuery("")}
                  className="absolute right-3.5 top-1/2 -translate-y-1/2 text-xs font-bold text-slate-400 hover:text-slate-600 bg-slate-200 px-2 py-0.5 rounded-md"
                >
                  Clear
                </button>
              )}
            </div>

            <button
              onClick={fetchPosData}
              title="Refresh products"
              className="p-3 text-slate-600 hover:text-slate-900 bg-slate-50 border border-slate-200 rounded-xl hover:bg-slate-100 transition-colors"
            >
              <RefreshCw className="w-5 h-5" />
            </button>
          </div>

          {/* Category Tabs */}
          <CategoryTabs
            categories={categories}
            activeCategory={activeCategory}
            onSelectCategory={setActiveCategory}
          />
        </div>

        {/* Product Grid View */}
        <div className="flex-1 min-h-[300px]">
          {loading ? (
            <LoadingState count={8} type="grid" />
          ) : error ? (
            <ErrorState subtitle={error} onRetry={fetchPosData} />
          ) : filteredProducts.length === 0 ? (
            <EmptyState
              title="No Products Available"
              subtitle={`No products match "${searchQuery || activeCategory}".`}
              actionLabel="Reset Filters"
              onAction={() => {
                setSearchQuery("");
                setActiveCategory("All");
              }}
            />
          ) : (
            <div className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-4 gap-4 pb-6">
              {filteredProducts.map((product) => {
                const isInCart = cartItems.some((item) => item.id === product.id);
                return (
                  <ProductCard
                    key={product.id}
                    product={product}
                    onAddToCart={addToCart}
                    isInCart={isInCart}
                  />
                );
              })}
            </div>
          )}
        </div>
      </div>

      {/* RIGHT SIDE: Current Order Sticky Panel */}
      <CartPanel onPrintSuccess={handlePrintSuccess} />

      {/* Generated Order Details Modal */}
      <OrderDetailsModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        order={selectedOrderForModal}
      />
    </div>
  );
};

export default PosPage;
