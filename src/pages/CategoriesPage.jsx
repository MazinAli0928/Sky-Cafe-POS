import React, { useState, useEffect, useCallback } from "react";
import { Plus, Grid, Edit3, Trash2, RefreshCw } from "lucide-react";
import {
  getCategories,
  createCategory,
  updateCategory,
  deleteCategory,
  toggleCategoryStatus
} from "../services/api";
import StatusBadge from "../components/common/StatusBadge";
import AddCategoryModal from "../components/categories/AddCategoryModal";
import ConfirmModal from "../components/common/ConfirmModal";
import LoadingState from "../components/common/LoadingState";
import ErrorState from "../components/common/ErrorState";
import { useToast } from "../context/ToastContext";

const CategoriesPage = () => {
  const { addToast } = useToast();
  const [categories, setCategories] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // Modal states
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [categoryToEdit, setCategoryToEdit] = useState(null);
  const [categoryToDelete, setCategoryToDelete] = useState(null);

  const fetchCategories = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await getCategories();
      setCategories(data);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchCategories();
  }, [fetchCategories]);

  const handleCreateOrUpdate = async (catData, editingId) => {
    try {
      if (editingId) {
        await updateCategory(editingId, catData);
        addToast("Category updated successfully.", "success");
      } else {
        await createCategory(catData);
        addToast("Category created successfully.", "success");
      }
      fetchCategories();
    } catch (err) {
      addToast(err.message || "Failed to save category", "error");
    }
  };

  const handleDeleteConfirmed = async () => {
    if (!categoryToDelete) return;
    try {
      await deleteCategory(categoryToDelete.id);
      addToast(`Category "${categoryToDelete.name}" deleted.`, "info");
      setCategories((prev) => prev.filter((c) => c.id !== categoryToDelete.id));
    } catch (err) {
      // Safe Category Delete Rule (Requirement 21) feedback
      addToast(err.message || "Cannot delete category with products.", "error");
    } finally {
      setCategoryToDelete(null);
    }
  };

  const handleToggleStatus = async (cat) => {
    try {
      const updated = await toggleCategoryStatus(cat.id);
      setCategories((prev) =>
        prev.map((c) => (c.id === cat.id ? { ...c, is_active: updated.is_active } : c))
      );
      addToast(
        `Category "${cat.name}" is now ${updated.is_active ? "Active" : "Inactive"}`,
        updated.is_active ? "success" : "warning"
      );
    } catch (err) {
      addToast(err.message || "Failed to toggle status", "error");
    }
  };

  return (
    <div className="p-6 space-y-6 max-w-7xl mx-auto">
      {/* Page Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-extrabold text-slate-800 tracking-tight">Categories</h2>
          <p className="text-xs text-slate-400">Organize menu items in SQLite database into categories</p>
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={fetchCategories}
            title="Refresh database"
            className="p-2 text-slate-600 hover:text-slate-900 bg-white border border-slate-200 rounded-xl hover:bg-slate-50 transition-colors"
          >
            <RefreshCw className="w-4 h-4" />
          </button>

          <button
            onClick={() => {
              setCategoryToEdit(null);
              setIsAddModalOpen(true);
            }}
            className="px-4 py-2 bg-amber-500 hover:bg-amber-600 text-slate-950 font-extrabold text-xs rounded-xl shadow-md shadow-amber-500/20 flex items-center gap-2 transition-colors"
          >
            <Plus className="w-4 h-4 stroke-[2.5]" />
            <span>Add Category</span>
          </button>
        </div>
      </div>

      {/* Main View: Loading / Error / Grid */}
      {loading ? (
        <LoadingState count={6} type="grid" />
      ) : error ? (
        <ErrorState subtitle={error} onRetry={fetchCategories} />
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {categories.map((cat) => (
            <div
              key={cat.id}
              className="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-xs hover:shadow-md transition-all duration-200 flex flex-col justify-between space-y-4"
            >
              <div className="flex items-start justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-slate-900 text-amber-400 flex items-center justify-center font-bold">
                    <Grid className="w-5 h-5" />
                  </div>
                  <div>
                    <h3 className="font-bold text-slate-800 text-base">{cat.name}</h3>
                    <p className="text-xs text-slate-400 font-medium">{cat.product_count || 0} Products</p>
                  </div>
                </div>
                <button onClick={() => handleToggleStatus(cat)} className="cursor-pointer" title="Toggle status">
                  <StatusBadge status={cat.is_active ? "Active" : "Inactive"} />
                </button>
              </div>

              <div className="pt-3 border-t border-slate-100 flex items-center justify-between text-xs">
                <span className="text-slate-400 font-medium">Category ID: #{cat.id}</span>
                <div className="flex items-center gap-1">
                  <button
                    title="Edit category"
                    onClick={() => {
                      setCategoryToEdit(cat);
                      setIsAddModalOpen(true);
                    }}
                    className="p-1.5 text-slate-400 hover:text-amber-600 hover:bg-amber-50 rounded-lg transition-colors"
                  >
                    <Edit3 className="w-4 h-4" />
                  </button>
                  <button
                    title="Delete category"
                    onClick={() => setCategoryToDelete(cat)}
                    className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-colors"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Add / Edit Category Modal */}
      <AddCategoryModal
        isOpen={isAddModalOpen}
        onClose={() => {
          setIsAddModalOpen(false);
          setCategoryToEdit(null);
        }}
        onAddCategory={handleCreateOrUpdate}
        categoryToEdit={categoryToEdit}
      />

      {/* Delete Confirmation Modal */}
      <ConfirmModal
        isOpen={Boolean(categoryToDelete)}
        onClose={() => setCategoryToDelete(null)}
        onConfirm={handleDeleteConfirmed}
        title="Delete Category"
        message={`Are you sure you want to delete category "${categoryToDelete?.name}"? Deleting categories with existing products will be prevented.`}
        confirmText="Delete Category"
      />
    </div>
  );
};

export default CategoriesPage;
