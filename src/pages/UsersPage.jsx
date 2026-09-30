import React, { useState, useEffect } from "react";
import {
  Users, UserPlus, ShieldCheck, ShieldAlert, ToggleLeft, ToggleRight,
  Pencil, Clock, Search, AlertCircle, KeyRound
} from "lucide-react";
import { getUsers, createUser, updateUser, deactivateUser } from "../services/api";
import { useAuth } from "../context/AuthContext";
import { useToast } from "../context/ToastContext";
import AddUserModal from "../components/users/AddUserModal";
import ConfirmModal from "../components/common/ConfirmModal";
import LoadingState from "../components/common/LoadingState";
import ErrorState from "../components/common/ErrorState";
import EmptyState from "../components/common/EmptyState";

const RoleBadge = ({ role }) => (
  <span
    className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-bold tracking-wide ${
      role === "MANAGER"
        ? "bg-amber-500/10 text-amber-600 border border-amber-500/20"
        : "bg-slate-100 text-slate-600 border border-slate-200"
    }`}
  >
    {role === "MANAGER" ? (
      <ShieldCheck className="w-3 h-3" />
    ) : (
      <ShieldAlert className="w-3 h-3" />
    )}
    {role}
  </span>
);

const StatusBadge = ({ isActive }) => (
  <span
    className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-bold ${
      isActive
        ? "bg-emerald-500/10 text-emerald-600 border border-emerald-500/20"
        : "bg-slate-100 text-slate-500 border border-slate-200"
    }`}
  >
    <span className={`w-1.5 h-1.5 rounded-full ${isActive ? "bg-emerald-500" : "bg-slate-400"}`} />
    {isActive ? "Active" : "Inactive"}
  </span>
);

const UsersPage = () => {
  const { user: currentUser, token } = useAuth();
  const { addToast } = useToast();

  const [users, setUsers] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);
  const [search, setSearch] = useState("");

  const [showAddModal, setShowAddModal] = useState(false);
  const [editingUser, setEditingUser] = useState(null);
  const [confirmDeactivate, setConfirmDeactivate] = useState(null);

  const loadUsers = async () => {
    try {
      setIsLoading(true);
      setError(null);
      const data = await getUsers(token);
      setUsers(data);
    } catch (err) {
      setError(err.message);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => { loadUsers(); }, []);

  const handleCreateUser = async (formData) => {
    const newUser = await createUser(formData, token);
    setUsers((prev) => [...prev, newUser]);
    addToast(`User "${newUser.name}" created successfully`, "success");
  };

  const handleUpdateUser = async (formData) => {
    const updated = await updateUser(editingUser.id, formData, token);
    setUsers((prev) => prev.map((u) => (u.id === updated.id ? updated : u)));
    addToast(`User "${updated.name}" updated`, "success");
    setEditingUser(null);
  };

  const handleDeactivate = async () => {
    if (!confirmDeactivate) return;
    await deactivateUser(confirmDeactivate.id, token);
    setUsers((prev) =>
      prev.map((u) => (u.id === confirmDeactivate.id ? { ...u, is_active: false } : u))
    );
    addToast(`"${confirmDeactivate.name}" deactivated`, "info");
    setConfirmDeactivate(null);
  };

  const handleReactivate = async (user) => {
    const updated = await updateUser(user.id, { is_active: true }, token);
    setUsers((prev) => prev.map((u) => (u.id === updated.id ? updated : u)));
    addToast(`"${updated.name}" reactivated`, "success");
  };

  const filteredUsers = users.filter(
    (u) =>
      u.name.toLowerCase().includes(search.toLowerCase()) ||
      u.username.toLowerCase().includes(search.toLowerCase())
  );

  const formatDate = (dateStr) => {
    if (!dateStr) return "Never";
    return new Date(dateStr).toLocaleDateString("en-IN", {
      day: "2-digit", month: "short", year: "numeric",
      hour: "2-digit", minute: "2-digit"
    });
  };

  return (
    <div className="p-6 space-y-5 max-w-5xl">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-slate-800 tracking-tight">User Management</h2>
          <p className="text-sm text-slate-500 mt-0.5">Manage staff accounts and access roles</p>
        </div>
        <button
          onClick={() => setShowAddModal(true)}
          className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-amber-500 hover:bg-amber-600 text-slate-950 font-bold text-sm transition-colors shadow-sm"
        >
          <UserPlus className="w-4 h-4" />
          Add User
        </button>
      </div>

      {/* Stats row */}
      <div className="grid grid-cols-3 gap-4">
        {[
          { label: "Total Users", value: users.length, icon: Users },
          { label: "Managers", value: users.filter((u) => u.role === "MANAGER").length, icon: ShieldCheck },
          { label: "Active", value: users.filter((u) => u.is_active).length, icon: ToggleRight }
        ].map(({ label, value, icon: Icon }) => (
          <div key={label} className="bg-white border border-slate-200 rounded-xl p-4 flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-amber-500/10 flex items-center justify-center">
              <Icon className="w-5 h-5 text-amber-600" />
            </div>
            <div>
              <div className="text-xl font-bold text-slate-800">{value}</div>
              <div className="text-xs text-slate-500 font-medium">{label}</div>
            </div>
          </div>
        ))}
      </div>

      {/* Search */}
      <div className="relative max-w-sm">
        <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
        <input
          type="text"
          placeholder="Search by name or username..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="w-full pl-10 pr-4 py-2.5 border border-slate-200 rounded-xl text-sm focus:outline-none focus:border-amber-500"
        />
      </div>

      {/* Table */}
      <div className="bg-white border border-slate-200 rounded-2xl overflow-hidden">
        {isLoading ? (
          <LoadingState message="Loading users..." />
        ) : error ? (
          <ErrorState message={error} onRetry={loadUsers} />
        ) : filteredUsers.length === 0 ? (
          <EmptyState
            icon={Users}
            title="No users found"
            description={search ? "No users match your search." : "Add your first user to get started."}
          />
        ) : (
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-slate-100 bg-slate-50">
                {["Name", "Username", "Role", "Status", "Last Login", "Actions"].map((h) => (
                  <th
                    key={h}
                    className="text-left px-5 py-3 text-[11px] font-bold text-slate-500 uppercase tracking-wider"
                  >
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-50">
              {filteredUsers.map((u) => (
                <tr key={u.id} className={`hover:bg-slate-50/80 transition-colors ${!u.is_active ? "opacity-60" : ""}`}>
                  <td className="px-5 py-3.5">
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 rounded-lg bg-amber-500/10 text-amber-700 flex items-center justify-center font-bold text-sm">
                        {u.name.charAt(0).toUpperCase()}
                      </div>
                      <div>
                        <div className="font-semibold text-slate-800">{u.name}</div>
                        {u.id === currentUser?.id && (
                          <div className="text-[10px] text-amber-600 font-semibold">You</div>
                        )}
                      </div>
                    </div>
                  </td>
                  <td className="px-5 py-3.5 font-mono text-slate-600 text-xs">{u.username}</td>
                  <td className="px-5 py-3.5">
                    <RoleBadge role={u.role} />
                  </td>
                  <td className="px-5 py-3.5">
                    <StatusBadge isActive={u.is_active} />
                  </td>
                  <td className="px-5 py-3.5">
                    <div className="flex items-center gap-1.5 text-slate-500 text-xs">
                      <Clock className="w-3.5 h-3.5" />
                      {formatDate(u.last_login)}
                    </div>
                  </td>
                  <td className="px-5 py-3.5">
                    <div className="flex items-center gap-2">
                      {u.id !== currentUser?.id && (
                        <>
                          <button
                            onClick={() => setEditingUser(u)}
                            className="p-1.5 text-slate-400 hover:text-amber-600 hover:bg-amber-50 rounded-lg transition-colors flex items-center gap-1"
                            title="Edit user details & role"
                          >
                            <Pencil className="w-3.5 h-3.5" />
                          </button>
                          <button
                            onClick={() => setEditingUser(u)}
                            className="p-1.5 text-slate-400 hover:text-amber-600 hover:bg-amber-50 rounded-lg transition-colors flex items-center gap-1"
                            title="Reset password"
                          >
                            <KeyRound className="w-3.5 h-3.5" />
                          </button>
                          {u.is_active ? (
                            <button
                              onClick={() => setConfirmDeactivate(u)}
                              className="p-1.5 text-slate-400 hover:text-rose-500 hover:bg-rose-50 rounded-lg transition-colors"
                              title="Deactivate user"
                            >
                              <ToggleRight className="w-4 h-4" />
                            </button>
                          ) : (
                            <button
                              onClick={() => handleReactivate(u)}
                              className="p-1.5 text-slate-400 hover:text-emerald-600 hover:bg-emerald-50 rounded-lg transition-colors"
                              title="Reactivate user"
                            >
                              <ToggleLeft className="w-4 h-4" />
                            </button>
                          )}
                        </>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {/* Modals */}
      {(showAddModal || editingUser) && (
        <AddUserModal
          isOpen={true}
          editingUser={editingUser}
          onClose={() => { setShowAddModal(false); setEditingUser(null); }}
          onSave={editingUser ? handleUpdateUser : handleCreateUser}
        />
      )}

      <ConfirmModal
        isOpen={!!confirmDeactivate}
        onClose={() => setConfirmDeactivate(null)}
        onConfirm={handleDeactivate}
        title="Deactivate User"
        message={`Deactivate "${confirmDeactivate?.name}"? They will no longer be able to log in. Existing orders remain intact.`}
        confirmLabel="Deactivate"
        isDangerous
      />
    </div>
  );
};

export default UsersPage;
