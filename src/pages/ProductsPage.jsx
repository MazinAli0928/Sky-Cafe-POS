import React, { useState, useEffect, useCallback } from "react";
import { Plus, Search, Edit3, Trash2, Package, RefreshCw } from "lucide-react";
import {
  getProducts,
  getCategories,
  createProduct,
  updateProduct,
  deleteProduct,
  toggleProductAvailability
} from "../services/api";
import DataTable from "../components/common/DataTable";
import StatusBadge from "../components/common/StatusBadge";
import AddProductModal from "../components/products/AddProductModal";
import ConfirmModal from "../components/common/ConfirmModal";
import LoadingState from "../components/common/LoadingState";
import ErrorState from "../components/common/ErrorState";
import { useToast } from "../context/ToastContext";

const ProductsPage = () => {
  const { addToast } = useToast();
  const [products, setProducts] = useState([]);
  const [categories, setCategories] = useState([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // Modal states
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [productToEdit, setProductToEdit] = useState(null);
  const [productToDelete, setProductToDelete] = useState(null);

  const fetchData = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const [prodData, catData] = await Promise.all([getProducts(), getCategories()]);
      setProducts(prodData);
      setCategories([
        { id: "all", name: "All" },
        ...catData.map((c) => ({ id: c.id, name: c.name }))
      ]);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const handleCreateOrUpdate = async (payload, editingId) => {
    try {
      if (editingId) {
        await updateProduct(editingId, payload);
        addToast("Product updated successfully.", "success");
      } else {
        await createProduct(payload);
        addToast("Product added successfully.", "success");
      }
      fetchData();
    } catch (err) {
      addToast(err.message || "Failed to save product", "error");
    }
  };

  const handleDeleteConfirmed = async () => {
    if (!productToDelete) return;
    try {
      await deleteProduct(productToDelete.id);
      addToast(`Deleted "${productToDelete.name}" successfully.`, "info");
      setProducts((prev) => prev.filter((p) => p.id !== productToDelete.id));
    } catch (err) {
      addToast(err.message || "Failed to delete product", "error");
    } finally {
      setProductToDelete(null);
    }
  };

  const handleToggleStatus = async (product) => {
    try {
      const updated = await toggleProductAvailability(product.id);
      setProducts((prev) =>
        prev.map((p) => (p.id === product.id ? { ...p, is_available: updated.is_available, status: updated.status } : p))
      );
      addToast(
        `"${product.name}" is now ${updated.is_available ? "Available" : "Out of Stock"}`,
        updated.is_available ? "success" : "warning"
      );
    } catch (err) {
      addToast(err.message || "Failed to toggle status", "error");
    }
  };

  const filteredProducts = products.filter(
    (p) =>
      p.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (p.category_name && p.category_name.toLowerCase().includes(searchQuery.toLowerCase())) ||
      (p.sku && p.sku.toLowerCase().includes(searchQuery.toLowerCase()))
  );

  const columns = [
    {
      header: "Product",
      accessor: "name",
      render: (row) => (
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-xl bg-amber-50 text-amber-600 border border-amber-200/80 flex items-center justify-center font-bold text-sm shrink-0">
            <Package className="w-4 h-4" />
          </div>
          <div>
            <div className="font-bold text-slate-800">{row.name}</div>
            <div className="text-xs text-slate-400 font-mono">
              SKU: {row.sku || "N/A"} • {row.description || "Fresh item"}
            </div>
          </div>
        </div>
      )
    },
    {
      header: "Category",
      accessor: "category_name",
      render: (row) => (
        <span className="px-2.5 py-1 rounded-lg bg-slate-100 text-slate-700 font-semibold text-xs border border-slate-200/80">
          {row.category_name}
        </span>
      )
    },
    {
      header: "Price",
      accessor: "price",
      render: (row) => <span className="font-extrabold text-slate-900 text-sm">₹{row.price}</span>
    },
    {
      header: "Status",
      accessor: "status",
      render: (row) => (
        <button onClick={() => handleToggleStatus(row)} className="cursor-pointer" title="Click to toggle availability">
          <StatusBadge status={row.is_available ? "Available" : "Out of Stock"} />
        </button>
      )
    },
    {
      header: "Actions",
      align: "right",
      render: (row) => (
        <div className="flex items-center justify-end gap-2">
          <button
            title="Edit product"
            onClick={() => {
              setProductToEdit(row);
              setIsModalOpen(true);
            }}
            className="p-1.5 text-slate-400 hover:text-amber-600 hover:bg-amber-50 rounded-lg transition-colors"
          >
            <Edit3 className="w-4 h-4" />
          </button>
          <button
            title="Delete product"
            onClick={() => setProductToDelete(row)}
            className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-colors"
          >
            <Trash2 className="w-4 h-4" />
          </button>
        </div>
      )
    }
  ];

  return (
    <div className="p-6 space-y-6 max-w-7xl mx-auto">
      {/* Header Actions */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-extrabold text-slate-800 tracking-tight">Products Management</h2>
          <p className="text-xs text-slate-400">Manage SQLite backend menu inventory items and pricing</p>
        </div>

        <div className="flex items-center gap-3 w-full sm:w-auto">
          <div className="relative flex-1 sm:w-64">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              placeholder="Search products or SKU..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-9 pr-3 py-2 bg-white border border-slate-200 rounded-xl text-xs font-medium focus:outline-none focus:border-amber-500"
            />
          </div>

          <button
            onClick={fetchData}
            title="Refresh database"
            className="p-2 text-slate-600 hover:text-slate-900 bg-white border border-slate-200 rounded-xl hover:bg-slate-50 transition-colors"
          >
            <RefreshCw className="w-4 h-4" />
          </button>

          <button
            onClick={() => {
              setProductToEdit(null);
              setIsModalOpen(true);
            }}
            className="px-4 py-2 bg-amber-500 hover:bg-amber-600 text-slate-950 font-extrabold text-xs rounded-xl shadow-md shadow-amber-500/20 flex items-center gap-2 whitespace-nowrap transition-colors"
          >
            <Plus className="w-4 h-4 stroke-[2.5]" />
            <span>Add Product</span>
          </button>
        </div>
      </div>

      {/* Main View: Loading / Error / Data */}
      {loading ? (
        <LoadingState count={6} type="table" />
      ) : error ? (
        <ErrorState subtitle={error} onRetry={fetchData} />
      ) : (
        <DataTable
          columns={columns}
          data={filteredProducts}
          emptyMessage="No Products Found"
          emptySubtext="Add products to display in the menu catalog."
        />
      )}

      {/* Add / Edit Product Modal */}
      <AddProductModal
        isOpen={isModalOpen}
        onClose={() => {
          setIsModalOpen(false);
          setProductToEdit(null);
        }}
        onSubmit={handleCreateOrUpdate}
        categories={categories}
        productToEdit={productToEdit}
      />

      {/* Delete Confirmation Modal */}
      <ConfirmModal
        isOpen={Boolean(productToDelete)}
        onClose={() => setProductToDelete(null)}
        onConfirm={handleDeleteConfirmed}
        title="Delete Product"
        message={`Are you sure you want to delete "${productToDelete?.name}"? This action cannot be undone.`}
        confirmText="Delete Product"
      />
    </div>
  );
};

export default ProductsPage;
