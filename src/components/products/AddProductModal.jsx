import React, { useState, useEffect } from "react";
import Modal from "../common/Modal";

const AddProductModal = ({ isOpen, onClose, onSubmit, categories, productToEdit }) => {
  const [name, setName] = useState("");
  const [categoryId, setCategoryId] = useState("");
  const [price, setPrice] = useState("");
  const [taxRate, setTaxRate] = useState("0");
  const [sku, setSku] = useState("");
  const [description, setDescription] = useState("");
  const [isAvailable, setIsAvailable] = useState(true);

  useEffect(() => {
    if (productToEdit) {
      setName(productToEdit.name || "");
      setCategoryId(productToEdit.category_id || (categories[0]?.id || ""));
      setPrice(productToEdit.price !== undefined ? String(productToEdit.price) : "");
      setTaxRate(productToEdit.tax_rate !== undefined ? String(productToEdit.tax_rate) : "0");
      setSku(productToEdit.sku || "");
      setDescription(productToEdit.description || "");
      setIsAvailable(productToEdit.is_available ?? true);
    } else {
      setName("");
      setCategoryId(categories.find((c) => c.id !== "all")?.id || categories[0]?.id || "");
      setPrice("");
      setTaxRate("0");
      setSku("");
      setDescription("");
      setIsAvailable(true);
    }
  }, [productToEdit, categories, isOpen]);

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!name.trim() || !price || !categoryId) return;

    const payload = {
      name: name.trim(),
      category_id: Number(categoryId),
      price: Number(price),
      tax_rate: Number(taxRate || 0),
      sku: sku.trim() || null,
      description: description.trim() || null,
      is_available: isAvailable
    };

    onSubmit(payload, productToEdit?.id);
    onClose();
  };

  const validCategories = categories.filter((c) => c.id !== "all");

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={productToEdit ? "Edit Product" : "Add New Product"}
    >
      <form onSubmit={handleSubmit} className="space-y-4 text-xs font-medium text-slate-700">
        <div>
          <label className="block text-slate-600 font-bold mb-1">Product Name *</label>
          <input
            type="text"
            required
            placeholder="e.g. Cheese Garlic Bread"
            value={name}
            onChange={(e) => setName(e.target.value)}
            className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 focus:outline-none focus:border-amber-500 focus:ring-2 focus:ring-amber-500/20 text-sm font-semibold"
          />
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="block text-slate-600 font-bold mb-1">Category *</label>
            <select
              value={categoryId}
              onChange={(e) => setCategoryId(e.target.value)}
              className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 focus:outline-none focus:border-amber-500 text-sm font-semibold bg-white"
            >
              {validCategories.map((cat) => (
                <option key={cat.id} value={cat.id}>
                  {cat.name}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-slate-600 font-bold mb-1">Price (₹) *</label>
            <input
              type="number"
              required
              min="0"
              step="0.01"
              placeholder="99"
              value={price}
              onChange={(e) => setPrice(e.target.value)}
              className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 focus:outline-none focus:border-amber-500 focus:ring-2 focus:ring-amber-500/20 text-sm font-semibold"
            />
          </div>
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="block text-slate-600 font-bold mb-1">Tax Rate (%)</label>
            <input
              type="number"
              min="0"
              step="0.1"
              placeholder="0"
              value={taxRate}
              onChange={(e) => setTaxRate(e.target.value)}
              className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 focus:outline-none focus:border-amber-500 focus:ring-2 focus:ring-amber-500/20 text-sm font-semibold"
            />
          </div>

          <div>
            <label className="block text-slate-600 font-bold mb-1">SKU Code</label>
            <input
              type="text"
              placeholder="e.g. SNK-09"
              value={sku}
              onChange={(e) => setSku(e.target.value)}
              className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 focus:outline-none focus:border-amber-500 focus:ring-2 focus:ring-amber-500/20 text-sm font-semibold"
            />
          </div>
        </div>

        <div>
          <label className="block text-slate-600 font-bold mb-1">Description</label>
          <input
            type="text"
            placeholder="Brief item description"
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 focus:outline-none focus:border-amber-500 focus:ring-2 focus:ring-amber-500/20 text-sm font-semibold"
          />
        </div>

        <div className="flex items-center justify-between p-3 rounded-xl border border-slate-200 bg-slate-50">
          <div>
            <div className="font-bold text-slate-800">Available in Menu</div>
            <div className="text-[11px] text-slate-400">Toggle cashier visibility in POS</div>
          </div>
          <input
            type="checkbox"
            checked={isAvailable}
            onChange={(e) => setIsAvailable(e.target.checked)}
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
            {productToEdit ? "Update Product" : "Add Product"}
          </button>
        </div>
      </form>
    </Modal>
  );
};

export default AddProductModal;
