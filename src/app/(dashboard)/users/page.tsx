"use client";
import { useEffect, useState } from "react";
import Header from "@/components/layout/Header";
import GlassCard from "@/components/ui/GlassCard";
import DataTable, { Column } from "@/components/ui/DataTable";
import Badge, { statusVariant } from "@/components/ui/Badge";
import Modal from "@/components/ui/Modal";
import StatCard from "@/components/ui/StatCard";
import { usersApi } from "@/lib/api";
import { UserResponse, CreateUserRequest } from "@/types";
import {
  Users, UserCog, ShieldCheck, UserX,
  Plus, RefreshCw, Pencil, Key, Search,
} from "lucide-react";

const ROLES = ["ROLE_ADMIN", "ROLE_MANAGER", "ROLE_SALES", "ROLE_INVENTORY", "ROLE_ACCOUNTING"];

export default function UsersPage() {
  const [users, setUsers] = useState<UserResponse[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");

  const [createModal, setCreateModal] = useState(false);
  const [editModal, setEditModal] = useState<UserResponse | null>(null);
  const [roleModal, setRoleModal] = useState<UserResponse | null>(null);
  const [pwModal, setPwModal] = useState<UserResponse | null>(null);

  const [createForm, setCreateForm] = useState<CreateUserRequest>({
    firstName: "", lastName: "", email: "", password: "",
    phoneNumber: "", userType: "INTERNAL", roleNames: [],
  });
  const [selectedRoles, setSelectedRoles] = useState<string[]>([]);
  const [newPassword, setNewPassword] = useState("");
  const [saving, setSaving] = useState(false);

  const load = async () => {
    setLoading(true);
    const r = await usersApi.list();
    if (r.success) setUsers(r.data);
    setLoading(false);
  };

  useEffect(() => { load(); }, []);

  const filtered = users.filter(u =>
    `${u.firstName} ${u.lastName} ${u.email}`.toLowerCase().includes(search.toLowerCase())
  );

  const deactivate = async (id: number) => {
    if (!confirm("¿Desactivar este usuario?")) return;
    await usersApi.deactivate(id);
    load();
  };

  const createUser = async () => {
    setSaving(true);
    await usersApi.create(createForm);
    setCreateModal(false);
    setCreateForm({ firstName: "", lastName: "", email: "", password: "", phoneNumber: "", userType: "INTERNAL", roleNames: [] });
    load();
    setSaving(false);
  };

  const assignRoles = async () => {
    if (!roleModal) return;
    setSaving(true);
    await usersApi.assignRoles(roleModal.id, selectedRoles);
    setRoleModal(null);
    load();
    setSaving(false);
  };

  const resetPassword = async () => {
    if (!pwModal) return;
    setSaving(true);
    await usersApi.resetPassword(pwModal.id, newPassword, "admin");
    setPwModal(null);
    setNewPassword("");
    setSaving(false);
  };

  const columns: Column<UserResponse>[] = [
    { key: "name", label: "Usuario", render: u => (
      <div className="flex items-center gap-3">
        <div className="w-8 h-8 rounded-xl bg-blue-600/20 border border-blue-500/20 flex items-center justify-center text-blue-300 text-xs font-bold">
          {u.firstName[0]}{u.lastName[0]}
        </div>
        <div>
          <p className="text-white font-medium">{u.firstName} {u.lastName}</p>
          <p className="text-slate-500 text-xs">{u.email}</p>
        </div>
      </div>
    )},
    { key: "userType", label: "Tipo", render: u => (
      <Badge label={u.userType} variant={u.userType === "INTERNAL" ? "info" : "default"} />
    )},
    { key: "roles", label: "Roles", render: u => (
      <div className="flex gap-1 flex-wrap">
        {u.roles.map(r => (
          <span key={r} className="text-xs px-1.5 py-0.5 rounded-lg bg-purple-500/10 text-purple-400 border border-purple-500/20">
            {r.replace("ROLE_", "")}
          </span>
        ))}
      </div>
    )},
    { key: "status", label: "Estado", render: u => (
      <Badge label={u.status} variant={statusVariant(u.status)} />
    )},
    { key: "actions", label: "", render: u => (
      <div className="flex gap-1" onClick={e => e.stopPropagation()}>
        <button
          onClick={() => { setSelectedRoles(u.roles); setRoleModal(u); }}
          className="btn-secondary px-2 py-1.5 text-xs"
          title="Gestionar roles"
        >
          <ShieldCheck className="w-3 h-3" />
        </button>
        <button
          onClick={() => setPwModal(u)}
          className="btn-secondary px-2 py-1.5 text-xs"
          title="Resetear contraseña"
        >
          <Key className="w-3 h-3" />
        </button>
        {u.status === "ACTIVE" && (
          <button onClick={() => deactivate(u.id)} className="btn-danger px-2 py-1.5 text-xs">
            <UserX className="w-3 h-3" />
          </button>
        )}
      </div>
    )},
  ];

  const internalUsers = users.filter(u => u.userType === "INTERNAL");
  const adminUsers = users.filter(u => u.roles.includes("ROLE_ADMIN"));
  const activeUsers = users.filter(u => u.status === "ACTIVE");

  return (
    <div className="flex flex-col h-full">
      <Header title="Usuarios" subtitle="Administración de cuentas y permisos" />
      <div className="flex-1 p-6 space-y-4 overflow-auto">

        {/* Stats */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          <StatCard title="Total usuarios" value={users.length} icon={Users} color="blue" />
          <StatCard title="Activos" value={activeUsers.length} icon={UserCog} color="emerald" />
          <StatCard title="Internos" value={internalUsers.length} icon={Pencil} color="purple" />
          <StatCard title="Administradores" value={adminUsers.length} icon={ShieldCheck} color="amber" />
        </div>

        {/* Toolbar */}
        <GlassCard padding="sm">
          <div className="flex flex-wrap gap-3 items-center">
            <div className="relative flex-1 min-w-48">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
              <input value={search} onChange={e => setSearch(e.target.value)}
                placeholder="Buscar por nombre o email..."
                className="input pl-9" />
            </div>
            <button onClick={load} className="btn-secondary">
              <RefreshCw className="w-4 h-4" />
            </button>
            <button onClick={() => setCreateModal(true)} className="btn-primary">
              <Plus className="w-4 h-4" /> Nuevo usuario
            </button>
          </div>
        </GlassCard>

        {/* Table */}
        <DataTable
          columns={columns} data={filtered} loading={loading}
          keyExtractor={u => u.id}
          emptyText="No se encontraron usuarios"
        />
      </div>

      {/* Create Modal */}
      <Modal open={createModal} onClose={() => setCreateModal(false)} title="Nuevo usuario" size="md">
        <div className="grid grid-cols-2 gap-3">
          {[
            { label: "Nombre *", key: "firstName" }, { label: "Apellido *", key: "lastName" },
            { label: "Email *", key: "email" }, { label: "Contraseña *", key: "password" },
            { label: "Teléfono", key: "phoneNumber" },
          ].map(f => (
            <div key={f.key}>
              <label className="label">{f.label}</label>
              <input
                type={f.key === "password" ? "password" : f.key === "email" ? "email" : "text"}
                className="input"
                value={String((createForm as unknown as Record<string, unknown>)[f.key] ?? "")}
                onChange={e => setCreateForm(p => ({ ...p, [f.key]: e.target.value }))}
              />
            </div>
          ))}
          <div>
            <label className="label">Tipo de usuario</label>
            <select className="input" value={createForm.userType}
              onChange={e => setCreateForm(p => ({ ...p, userType: e.target.value }))}>
              <option value="INTERNAL">Interno</option>
              <option value="CUSTOMER">Cliente</option>
            </select>
          </div>
          <div className="col-span-2">
            <label className="label">Roles</label>
            <div className="flex flex-wrap gap-2">
              {ROLES.map(role => (
                <label key={role} className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    className="accent-blue-500"
                    checked={createForm.roleNames.includes(role)}
                    onChange={e => {
                      const next = e.target.checked
                        ? [...createForm.roleNames, role]
                        : createForm.roleNames.filter(r => r !== role);
                      setCreateForm(p => ({ ...p, roleNames: next }));
                    }}
                  />
                  <span className="text-sm text-slate-300">{role.replace("ROLE_", "")}</span>
                </label>
              ))}
            </div>
          </div>
        </div>
        <div className="flex justify-end gap-3 mt-6 pt-4 border-t border-white/10">
          <button onClick={() => setCreateModal(false)} className="btn-secondary">Cancelar</button>
          <button onClick={createUser} className="btn-primary" disabled={saving}>
            {saving && <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />}
            Crear usuario
          </button>
        </div>
      </Modal>

      {/* Roles Modal */}
      <Modal open={!!roleModal} onClose={() => setRoleModal(null)} title={`Roles: ${roleModal?.firstName} ${roleModal?.lastName}`} size="sm">
        <div className="space-y-2">
          {ROLES.map(role => (
            <label key={role} className="flex items-center gap-3 px-3 py-2.5 rounded-xl bg-white/5 hover:bg-white/10 cursor-pointer">
              <input
                type="checkbox"
                className="accent-blue-500 w-4 h-4"
                checked={selectedRoles.includes(role)}
                onChange={e => {
                  setSelectedRoles(e.target.checked
                    ? [...selectedRoles, role]
                    : selectedRoles.filter(r => r !== role));
                }}
              />
              <span className="text-slate-200 text-sm">{role}</span>
            </label>
          ))}
        </div>
        <div className="flex justify-end gap-3 mt-4">
          <button onClick={() => setRoleModal(null)} className="btn-secondary">Cancelar</button>
          <button onClick={assignRoles} className="btn-primary" disabled={saving}>
            {saving && <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />}
            Guardar roles
          </button>
        </div>
      </Modal>

      {/* Password Reset Modal */}
      <Modal open={!!pwModal} onClose={() => setPwModal(null)} title="Resetear contraseña" size="sm">
        <p className="text-slate-400 text-sm mb-4">
          Reseteando contraseña de <span className="text-white font-medium">{pwModal?.firstName} {pwModal?.lastName}</span>
        </p>
        <div>
          <label className="label">Nueva contraseña *</label>
          <input type="password" className="input" value={newPassword}
            onChange={e => setNewPassword(e.target.value)} placeholder="Mínimo 8 caracteres" />
        </div>
        <div className="flex justify-end gap-3 mt-4">
          <button onClick={() => setPwModal(null)} className="btn-secondary">Cancelar</button>
          <button onClick={resetPassword} className="btn-primary" disabled={saving || newPassword.length < 6}>
            {saving && <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />}
            Resetear
          </button>
        </div>
      </Modal>
    </div>
  );
}
