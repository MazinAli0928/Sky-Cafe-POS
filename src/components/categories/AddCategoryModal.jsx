import React, { useState, useEffect } from "react";
import Modal from "../common/Modal";

const AddCategoryModal = ({ isOpen, onClose, onAddCategory, categoryToEdit }) => {
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [isActive, setIsActive] = useState(true);

  useEffect(() => {
    if (categoryToEdit) {
      setName(categoryToEdit.name || "");
      setDescription(categoryToEdit.description || "");
      setIsActive(categoryToEdit.is_active ?? true);
    } else {
      setName("");
      setDescription("");
      setIsActive(true);
    }
  }, [categoryToEdit, isOpen]);

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!name.trim()) return;

    const payload = {
      name: name.trim(),
      description: description.trim() || null,
      is_active: isActive
    };

    onAddCategory(payload, categoryToEdit?.id);
    onClose();
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={categoryToEdit ? "Edit Category" : "Add New Category"}
    >
      <form onSubmit={handleSubmit} className="space-y-4 text-xs font-medium text-slate-700">
        <div>
          <label className="block text-slate-600 font-bold mb-1">Category Name *</label>
          <input
            type="text"
            required
            placeholder="e.g. Beverages"
            value={name}
            onChange={(e) => setName(e.target.value)}
            className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 focus:outline-none focus:border-amber-500 focus:ring-2 focus:ring-amber-500/20 text-sm font-semibold"
          />
        </div>

        <div>
          <label className="block text-slate-600 font-bold mb-1">Description</label>
          <input
            type="text"
            placeholder="Brief category description"
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 focus:outline-none focus:border-amber-500 focus:ring-2 focus:ring-amber-500/20 text-sm font-semibold"
          />
        </div>

        <div className="flex items-center justify-between p-3 rounded-xl border border-slate-200 bg-slate-50">
          <div>
            <div className="font-bold text-slate-800">Category Active</div>
            <div className="text-[11px] text-slate-400">Controls visibility in POS filter tabs</div>
          </div>
          <input
            type="checkbox"
            checked={isActive}
            onChange={(e) => setIsActive(e.target.checked)}
            className="w-5 h-5 text-amber-500 rounded-md border-slate-300 focus:ring-amber-500"
          />
        </div>

        <div className="pt-4 border-t border-slate-100 flex justify-end gap-3">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2.5 rounded-xl border border-slate-200 font-bold hover:bg-slate-100 text-slate-700"
          >
            Cancel
          </button>
          <button
            type="submit"
            className="px-5 py-2.5 rounded-xl bg-amber-500 hover:bg-amber-600 text-slate-950 font-extrabold shadow-md shadow-amber-500/20"
          >
            {categoryToEdit ? "Update Category" : "Add Category"}
          </button>
        </div>
      </form>
    </Modal>
  );
};

export default AddCategoryModal;
