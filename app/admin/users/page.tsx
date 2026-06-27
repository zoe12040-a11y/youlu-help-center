"use client";

import { useEffect, useState } from "react";

type User = {
  id: number;
  name: string;
  phone: string;
  role: string;
  isActive: boolean;
  email: string | null;
  createdAt: string;
};

const ROLE_LABEL: Record<string, string> = { admin: "管理员", engineer: "工程师", customer: "客户" };
const ROLE_COLOR: Record<string, string> = {
  admin: "bg-blue-50 text-blue-600",
  engineer: "bg-purple-50 text-purple-600",
  customer: "bg-green-50 text-green-600",
};

type EditForm = { name: string; phone: string; password: string; role: string; email: string };

export default function AdminUsersPage() {
  const [checkedLogin, setCheckedLogin] = useState(false);
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  // Create form
  const [createForm, setCreateForm] = useState({ name: "", phone: "", password: "123456", role: "customer", email: "" });

  // Edit state
  const [editingId, setEditingId] = useState<number | null>(null);
  const [editForm, setEditForm] = useState<EditForm>({ name: "", phone: "", password: "", role: "" });

  // Bulk delete
  const [selectedIds, setSelectedIds] = useState<Set<number>>(new Set());
  const [confirmDeleteId, setConfirmDeleteId] = useState<number | null>(null);
  const [confirmBulkDelete, setConfirmBulkDelete] = useState(false);

  async function loadUsers() {
    setLoading(true);
    try {
      const res = await fetch("/api/users");
      const result = await res.json();
      if (result.success) setUsers(result.data);
    } catch (e) { console.error(e); }
    setLoading(false);
  }

  useEffect(() => {
    const userText = localStorage.getItem("youlu_user");
    if (!userText) { window.location.href = "/login"; return; }
    const user = JSON.parse(userText);
    if (user.role !== "admin") { window.location.href = "/unauthorized"; return; }
    setCheckedLogin(true);
    loadUsers();
  }, []);

  // ── Create ──────────────────────────────────────────────────────────────────
  async function createUser() {
    if (!createForm.name || !createForm.phone) { alert("名称和账号不能为空"); return; }
    setSaving(true);
    try {
      const res = await fetch("/api/users", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(createForm),
      });
      const result = await res.json();
      if (result.success) {
        setCreateForm({ name: "", phone: "", password: "123456", role: "customer", email: "" });
        await loadUsers();
      } else {
        alert(result.message || "创建失败");
      }
    } catch (e) { console.error(e); alert("创建失败，请检查网络"); }
    setSaving(false);
  }

  // ── Edit ─────────────────────────────────────────────────────────────────────
  function startEdit(user: User) {
    setEditingId(user.id);
    setEditForm({ name: user.name, phone: user.phone, password: "", role: user.role, email: user.email ?? "" });
  }

  async function saveEdit() {
    if (!editingId) return;
    setSaving(true);
    try {
      const payload: Record<string, unknown> = {
        id: editingId,
        name: editForm.name,
        phone: editForm.phone,
        role: editForm.role,
        email: editForm.email.trim() || null,
      };
      if (editForm.password.trim()) payload.password = editForm.password;
      const res = await fetch("/api/users", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const result = await res.json();
      if (result.success) { setEditingId(null); await loadUsers(); }
      else alert(result.message || "保存失败");
    } catch (e) { console.error(e); alert("保存失败"); }
    setSaving(false);
  }

  // ── Delete ───────────────────────────────────────────────────────────────────
  async function deleteUser(id: number) {
    try {
      const res = await fetch(`/api/users?id=${id}`, { method: "DELETE" });
      const result = await res.json();
      if (result.success) { setConfirmDeleteId(null); await loadUsers(); }
      else alert(result.message || "删除失败");
    } catch (e) { console.error(e); alert("删除失败"); }
  }

  async function bulkDelete() {
    try {
      const res = await fetch("/api/users", {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ids: [...selectedIds] }),
      });
      const result = await res.json();
      if (result.success) { setSelectedIds(new Set()); setConfirmBulkDelete(false); await loadUsers(); }
      else alert(result.message || "批量删除失败");
    } catch (e) { console.error(e); alert("删除失败"); }
  }

  function toggleSelect(id: number) {
    setSelectedIds((prev) => { const s = new Set(prev); s.has(id) ? s.delete(id) : s.add(id); return s; });
  }

  if (!checkedLogin) {
    return (
      <main className="min-h-screen bg-slate-100 px-4 py-8">
        <section className="mx-auto max-w-4xl rounded-3xl bg-white p-8 shadow-sm">
          <p className="text-slate-400">正在验证权限...</p>
        </section>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-slate-100 px-4 py-8 text-slate-900 md:px-6 md:py-10">

      {/* Delete confirmation modal */}
      {confirmDeleteId !== null && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="w-full max-w-sm rounded-3xl bg-white p-6 shadow-2xl">
            <h2 className="text-lg font-bold text-slate-900">确认删除账号</h2>
            <p className="mt-2 text-sm text-slate-500">
              删除后该账号无法恢复，该用户的工单记录将保留。
            </p>
            <div className="mt-6 flex gap-3">
              <button onClick={() => deleteUser(confirmDeleteId)}
                className="flex-1 rounded-xl bg-red-600 py-3 text-sm font-bold text-white">
                确认删除
              </button>
              <button onClick={() => setConfirmDeleteId(null)}
                className="flex-1 rounded-xl border border-slate-200 py-3 text-sm font-bold text-slate-600">
                取消
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Bulk delete confirmation */}
      {confirmBulkDelete && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="w-full max-w-sm rounded-3xl bg-white p-6 shadow-2xl">
            <h2 className="text-lg font-bold text-slate-900">批量删除确认</h2>
            <p className="mt-2 text-sm text-slate-500">
              即将删除 <span className="font-bold text-red-600">{selectedIds.size}</span> 个账号，操作不可撤销。
            </p>
            <div className="mt-6 flex gap-3">
              <button onClick={bulkDelete}
                className="flex-1 rounded-xl bg-red-600 py-3 text-sm font-bold text-white">
                确认删除
              </button>
              <button onClick={() => setConfirmBulkDelete(false)}
                className="flex-1 rounded-xl border border-slate-200 py-3 text-sm font-bold text-slate-600">
                取消
              </button>
            </div>
          </div>
        </div>
      )}

      <section className="mx-auto max-w-7xl space-y-6">

        {/* Header */}
        <div className="rounded-3xl bg-white p-5 shadow-sm md:p-8">
          <p className="text-sm text-slate-400">后台管理 / 用户管理</p>
          <h1 className="mt-4 text-2xl font-bold text-blue-700 md:text-3xl">用户账号管理</h1>
          <p className="mt-2 text-sm text-slate-500">
            管理系统中所有用户的账号信息、角色权限和启用状态。
          </p>
          <div className="mt-5 flex flex-wrap gap-3">
            <a href="/admin" className="rounded-xl border border-slate-200 bg-white px-5 py-2.5 text-sm font-bold text-slate-700">
              返回后台
            </a>
          </div>
        </div>

        <div className="grid gap-6 md:grid-cols-[360px_1fr]">

          {/* Create / Edit form */}
          <div className="rounded-3xl bg-white p-5 shadow-sm md:p-6">
            <h2 className="text-lg font-bold text-slate-900">
              {editingId !== null ? "编辑账号" : "新增账号"}
            </h2>

            {editingId !== null ? (
              // Edit form
              <div className="mt-5 space-y-4">
                <div>
                  <label className="text-sm font-bold text-slate-700">姓名</label>
                  <input value={editForm.name} onChange={(e) => setEditForm({ ...editForm, name: e.target.value })}
                    className="mt-2 w-full rounded-xl border border-slate-200 px-4 py-3 text-sm outline-none focus:border-blue-500" />
                </div>
                <div>
                  <label className="text-sm font-bold text-slate-700">登录账号</label>
                  <input value={editForm.phone} onChange={(e) => setEditForm({ ...editForm, phone: e.target.value })}
                    className="mt-2 w-full rounded-xl border border-slate-200 px-4 py-3 text-sm outline-none focus:border-blue-500" />
                </div>
                <div>
                  <label className="text-sm font-bold text-slate-700">邮箱（用于找回密码）</label>
                  <input
                    type="email"
                    value={editForm.email}
                    onChange={(e) => setEditForm({ ...editForm, email: e.target.value })}
                    placeholder="example@company.com（可选）"
                    className="mt-2 w-full rounded-xl border border-slate-200 px-4 py-3 text-sm outline-none focus:border-blue-500"
                  />
                </div>
                <div>
                  <label className="text-sm font-bold text-slate-700">新密码（留空不修改）</label>
                  <input type="password" value={editForm.password}
                    onChange={(e) => setEditForm({ ...editForm, password: e.target.value })}
                    placeholder="留空则保持原密码"
                    className="mt-2 w-full rounded-xl border border-slate-200 px-4 py-3 text-sm outline-none focus:border-blue-500" />
                </div>
                <div>
                  <label className="text-sm font-bold text-slate-700">角色</label>
                  <select value={editForm.role} onChange={(e) => setEditForm({ ...editForm, role: e.target.value })}
                    className="mt-2 w-full rounded-xl border border-slate-200 px-4 py-3 text-sm outline-none focus:border-blue-500">
                    <option value="customer">客户</option>
                    <option value="engineer">工程师</option>
                    <option value="admin">管理员</option>
                  </select>
                </div>
                <div className="flex gap-3">
                  <button onClick={saveEdit} disabled={saving}
                    className="flex-1 rounded-xl bg-blue-600 py-3 text-sm font-bold text-white disabled:bg-slate-400">
                    {saving ? "保存中..." : "保存修改"}
                  </button>
                  <button onClick={() => setEditingId(null)}
                    className="flex-1 rounded-xl border border-slate-200 py-3 text-sm font-bold text-slate-600">
                    取消
                  </button>
                </div>
              </div>
            ) : (
              // Create form
              <div className="mt-5 space-y-4">
                <div>
                  <label className="text-sm font-bold text-slate-700">姓名 / 名称</label>
                  <input value={createForm.name}
                    onChange={(e) => setCreateForm({ ...createForm, name: e.target.value })}
                    placeholder="例如：张工程师"
                    className="mt-2 w-full rounded-xl border border-slate-200 px-4 py-3 text-sm outline-none focus:border-blue-500" />
                </div>
                <div>
                  <label className="text-sm font-bold text-slate-700">登录账号</label>
                  <input value={createForm.phone}
                    onChange={(e) => setCreateForm({ ...createForm, phone: e.target.value })}
                    placeholder="例如：engineer01"
                    className="mt-2 w-full rounded-xl border border-slate-200 px-4 py-3 text-sm outline-none focus:border-blue-500" />
                </div>
                <div>
                  <label className="text-sm font-bold text-slate-700">初始密码</label>
                  <input value={createForm.password}
                    onChange={(e) => setCreateForm({ ...createForm, password: e.target.value })}
                    className="mt-2 w-full rounded-xl border border-slate-200 px-4 py-3 text-sm outline-none focus:border-blue-500" />
                </div>
                <div>
                  <label className="text-sm font-bold text-slate-700">邮箱（用于找回密码）</label>
                  <input
                    type="email"
                    value={createForm.email}
                    onChange={(e) => setCreateForm({ ...createForm, email: e.target.value })}
                    placeholder="example@company.com（可选）"
                    className="mt-2 w-full rounded-xl border border-slate-200 px-4 py-3 text-sm outline-none focus:border-blue-500"
                  />
                </div>
                <div>
                  <label className="text-sm font-bold text-slate-700">角色</label>
                  <select value={createForm.role}
                    onChange={(e) => setCreateForm({ ...createForm, role: e.target.value })}
                    className="mt-2 w-full rounded-xl border border-slate-200 px-4 py-3 text-sm outline-none focus:border-blue-500">
                    <option value="customer">客户</option>
                    <option value="engineer">工程师</option>
                    <option value="admin">管理员</option>
                  </select>
                  <p className="mt-1.5 text-xs text-slate-400">工程师只能处理分配给自己的工单</p>
                </div>
                <button onClick={createUser} disabled={saving}
                  className="w-full rounded-xl bg-blue-600 py-3 text-sm font-bold text-white disabled:bg-slate-400">
                  {saving ? "创建中..." : "创建账号"}
                </button>
              </div>
            )}
          </div>

          {/* User list */}
          <div className="rounded-3xl bg-white p-5 shadow-sm md:p-6">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div>
                <h2 className="text-lg font-bold text-slate-900">用户列表（{users.length} 个）</h2>
                <p className="mt-1 text-xs text-slate-400">点击「编辑」修改账号信息；勾选后可批量删除</p>
              </div>
              <div className="flex gap-2">
                {selectedIds.size > 0 && (
                  <button onClick={() => setConfirmBulkDelete(true)}
                    className="rounded-xl bg-red-600 px-4 py-2 text-xs font-bold text-white">
                    删除选中 ({selectedIds.size})
                  </button>
                )}
                <button onClick={loadUsers}
                  className="rounded-xl border border-blue-200 bg-white px-4 py-2 text-xs font-bold text-blue-600">
                  刷新
                </button>
              </div>
            </div>

            {loading ? (
              <p className="mt-6 text-sm text-slate-400">正在加载...</p>
            ) : users.length === 0 ? (
              <div className="mt-6 rounded-2xl border border-dashed border-slate-200 p-8 text-center">
                <p className="text-slate-400">暂无用户</p>
              </div>
            ) : (
              <div className="mt-5 space-y-3">
                {users.map((user) => (
                  <div key={user.id}
                    className={`rounded-2xl border p-4 transition ${selectedIds.has(user.id) ? "border-blue-300 bg-blue-50" : "border-slate-200 bg-slate-50"}`}>
                    <div className="flex items-start gap-3">
                      {/* Checkbox */}
                      <input type="checkbox" checked={selectedIds.has(user.id)}
                        onChange={() => toggleSelect(user.id)}
                        className="mt-1 h-4 w-4 shrink-0 rounded accent-blue-600" />

                      <div className="flex-1 min-w-0">
                        <div className="flex flex-wrap items-center gap-2">
                          <span className="font-bold text-slate-900">{user.name}</span>
                          <span className={`rounded-full px-2 py-0.5 text-xs font-bold ${ROLE_COLOR[user.role] ?? "bg-slate-100 text-slate-600"}`}>
                            {ROLE_LABEL[user.role] ?? user.role}
                          </span>
                          <span className={`rounded-full px-2 py-0.5 text-xs font-bold ${user.isActive ? "bg-emerald-50 text-emerald-600" : "bg-red-50 text-red-500"}`}>
                            {user.isActive ? "启用" : "禁用"}
                          </span>
                        </div>
                        <p className="mt-1 text-xs text-slate-500">账号：{user.phone}</p>
                        {user.email && (
                          <p className="text-xs text-slate-400">✉ {user.email}</p>
                        )}
                        <p className="text-xs text-slate-400">{new Date(user.createdAt).toLocaleDateString()}</p>
                      </div>

                      {/* Actions */}
                      <div className="flex shrink-0 flex-col gap-1.5">
                        <button onClick={() => startEdit(user)}
                          className="rounded-lg border border-blue-200 bg-white px-3 py-1.5 text-xs font-bold text-blue-600">
                          编辑
                        </button>
                        {user.role !== "admin" && (
                          <button
                            onClick={() => fetch("/api/users", {
                              method: "PATCH",
                              headers: { "Content-Type": "application/json" },
                              body: JSON.stringify({ id: user.id, isActive: !user.isActive }),
                            }).then(() => loadUsers())}
                            className={`rounded-lg border px-3 py-1.5 text-xs font-bold ${user.isActive ? "border-orange-200 text-orange-600" : "border-green-200 text-green-600"} bg-white`}
                          >
                            {user.isActive ? "禁用" : "启用"}
                          </button>
                        )}
                        {user.role !== "admin" && (
                          <button onClick={() => setConfirmDeleteId(user.id)}
                            className="rounded-lg border border-red-200 bg-white px-3 py-1.5 text-xs font-bold text-red-600">
                            删除
                          </button>
                        )}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </section>
    </main>
  );
}
