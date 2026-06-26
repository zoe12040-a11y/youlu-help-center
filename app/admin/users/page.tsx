"use client";

import { useEffect, useState } from "react";

type User = {
  id: number;
  name: string;
  phone: string;
  role: string;
  isActive: boolean;
  createdAt: string;
};

export default function AdminUsersPage() {
  const [checkedLogin, setCheckedLogin] = useState(false);
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const [form, setForm] = useState({
    name: "",
    phone: "",
    password: "123456",
    role: "customer",
  });

  function updateForm(field: string, value: string) {
    setForm({ ...form, [field]: value });
  }

  async function loadUsers() {
    setLoading(true);

    try {
      const response = await fetch("/api/users");
      const result = await response.json();

      if (result.success) {
        setUsers(result.data);
      }
    } catch (error) {
      console.error("读取用户失败：", error);
    }

    setLoading(false);
  }

  async function toggleUserStatus(id: number, isActive: boolean) {
    try {
      const response = await fetch("/api/users", {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          id,
          isActive,
        }),
      });

      const result = await response.json();

      if (result.success) {
        alert(result.message);
        await loadUsers();
      } else {
        alert(result.message || "操作失败");
      }
    } catch (error) {
      console.error("更新账号状态失败：", error);
      alert("操作失败，请检查系统是否正常运行。");
    }
  }

  async function createUser() {
    if (!form.name || !form.phone) {
      alert("客户名称和账号不能为空");
      return;
    }

    setSaving(true);

    try {
      const response = await fetch("/api/users", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(form),
      });

      const result = await response.json();

      if (result.success) {
        alert("客户账号创建成功");

        setForm({
          name: "",
          phone: "",
          password: "123456",
          role: "customer",
        });

        await loadUsers();
      } else {
        alert(result.message || "创建失败");
      }
    } catch (error) {
      console.error("创建用户失败：", error);
      alert("创建失败，请检查系统是否正常运行。");
    }

    setSaving(false);
  }

  useEffect(() => {
    const userText = localStorage.getItem("youlu_user");

    if (!userText) {
      window.location.href = "/login";
      return;
    }

    const user = JSON.parse(userText);

    if (user.role !== "admin") {
      window.location.href = "/unauthorized";
      return;
    }

    setCheckedLogin(true);
    loadUsers();
  }, []);

  if (!checkedLogin) {
    return (
      <main className="min-h-screen bg-slate-100 px-6 py-10 text-slate-900">
        <section className="mx-auto max-w-4xl rounded-3xl bg-white p-8 shadow-sm">
          <p className="text-slate-500">正在验证管理员权限...</p>
        </section>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-slate-100 px-6 py-10 text-slate-900">
      <section className="mx-auto max-w-7xl">
        <div className="rounded-3xl bg-white p-8 shadow-sm">
          <p className="text-sm text-slate-400">后台管理 / 用户管理</p>

          <h1 className="mt-5 text-3xl font-bold text-blue-700">
            客户账号管理
          </h1>

          <p className="mt-3 text-slate-500">
            管理员可新增客户账号，客户登录后可提交工单并查看自己的工单进度。
          </p>

          <div className="mt-8 flex flex-wrap gap-4">
            <a
              href="/admin/tickets"
              className="rounded-xl bg-blue-600 px-6 py-3 font-bold text-white"
            >
              工单管理
            </a>

            <a
              href="/"
              className="rounded-xl border border-slate-200 bg-white px-6 py-3 font-bold text-slate-700"
            >
              返回首页
            </a>

            <a
              href="/logout"
              className="rounded-xl border border-red-200 bg-white px-6 py-3 font-bold text-red-600"
            >
              退出登录
            </a>
          </div>
        </div>

        <div className="mt-8 grid gap-8 md:grid-cols-[0.9fr_1.1fr]">
          <div className="rounded-3xl bg-white p-6 shadow-sm">
            <h2 className="text-2xl font-bold text-slate-900">
              新增客户账号
            </h2>

            <p className="mt-3 text-sm text-slate-500">
              建议账号使用客户项目简称、手机号或企业编号，便于后续工单归属。
            </p>

            <div className="mt-6 space-y-5">
              <div>
                <label className="font-bold text-slate-700">客户名称</label>
                <input
                  value={form.name}
                  onChange={(e) => updateForm("name", e.target.value)}
                  placeholder="例如：上海中心客户"
                  className="mt-2 w-full rounded-xl border border-slate-200 px-4 py-3 outline-none focus:border-blue-500"
                />
              </div>

              <div>
                <label className="font-bold text-slate-700">登录账号</label>
                <input
                  value={form.phone}
                  onChange={(e) => updateForm("phone", e.target.value)}
                  placeholder="例如：shanghai-center"
                  className="mt-2 w-full rounded-xl border border-slate-200 px-4 py-3 outline-none focus:border-blue-500"
                />
              </div>

              <div>
                <label className="font-bold text-slate-700">初始密码</label>
                <input
                  value={form.password}
                  onChange={(e) => updateForm("password", e.target.value)}
                  placeholder="默认 123456"
                  className="mt-2 w-full rounded-xl border border-slate-200 px-4 py-3 outline-none focus:border-blue-500"
                />
              </div>

              <div>
                <label className="font-bold text-slate-700">账号角色</label>
                <select
                  value={form.role}
                  onChange={(e) => updateForm("role", e.target.value)}
                  className="mt-2 w-full rounded-xl border border-slate-200 px-4 py-3 outline-none focus:border-blue-500"
                >
                  <option value="customer">客户</option>
                  <option value="engineer">工程师</option>
                  <option value="admin">管理员</option>
                </select>
                <p className="mt-1.5 text-xs text-slate-400">
                  工程师：只能查看和处理分配给自己的工单
                </p>
              </div>

              <button
                onClick={createUser}
                disabled={saving}
                className="w-full rounded-xl bg-blue-600 px-6 py-3 font-bold text-white disabled:bg-slate-400"
              >
                {saving ? "创建中..." : "创建账号"}
              </button>
            </div>
          </div>

          <div className="rounded-3xl bg-white p-6 shadow-sm">
            <div className="flex flex-wrap items-center justify-between gap-4">
              <div>
                <h2 className="text-2xl font-bold text-slate-900">
                  用户列表
                </h2>
                <p className="mt-2 text-sm text-slate-500">
                  当前系统中的管理员和客户账号。
                </p>
              </div>

              <button
                onClick={loadUsers}
                className="rounded-xl border border-blue-200 bg-white px-5 py-3 font-bold text-blue-600"
              >
                刷新
              </button>
            </div>

            <div className="mt-6">
              {loading ? (
                <p className="text-slate-500">正在加载用户...</p>
              ) : users.length === 0 ? (
                <div className="rounded-2xl border border-dashed border-slate-300 p-8 text-center">
                  <p className="font-bold text-slate-700">暂无用户</p>
                </div>
              ) : (
                <div className="space-y-4">
                  {users.map((user) => (
                    <div
                      key={user.id}
                      className="rounded-2xl border border-slate-200 bg-slate-50 p-5"
                    >
                      <div className="flex flex-wrap items-start justify-between gap-4">
                        <div>
                          <p className="text-sm text-slate-400">
                            ID：{user.id}
                          </p>

                          <h3 className="mt-1 text-xl font-bold text-slate-900">
                            {user.name}
                          </h3>

                          <p className="mt-2 text-slate-500">
                            账号：{user.phone}
                          </p>
                        </div>

                        <div className="flex flex-wrap gap-2">
                          <span
                            className={
                              user.role === "admin"
                                ? "rounded-full bg-blue-50 px-4 py-2 text-sm font-bold text-blue-600"
                                : user.role === "engineer"
                                ? "rounded-full bg-purple-50 px-4 py-2 text-sm font-bold text-purple-600"
                                : "rounded-full bg-green-50 px-4 py-2 text-sm font-bold text-green-600"
                            }
                          >
                            {user.role === "admin" ? "管理员" : user.role === "engineer" ? "工程师" : "客户"}
                          </span>

                          <span
                            className={
                              user.isActive
                                ? "rounded-full bg-emerald-50 px-4 py-2 text-sm font-bold text-emerald-600"
                                : "rounded-full bg-red-50 px-4 py-2 text-sm font-bold text-red-600"
                            }
                          >
                            {user.isActive ? "已启用" : "已禁用"}
                          </span>
                        </div>
                      </div>

                      <div className="mt-4 flex flex-wrap items-center justify-between gap-4">
                        <p className="text-sm text-slate-400">
                          创建时间：{new Date(user.createdAt).toLocaleString()}
                        </p>

                        {user.role === "customer" && (
                          <div className="flex gap-3">
                            {user.isActive ? (
                              <button
                                onClick={() => toggleUserStatus(user.id, false)}
                                className="rounded-xl border border-red-200 bg-white px-4 py-2 text-sm font-bold text-red-600"
                              >
                                禁用账号
                              </button>
                            ) : (
                              <button
                                onClick={() => toggleUserStatus(user.id, true)}
                                className="rounded-xl border border-green-200 bg-white px-4 py-2 text-sm font-bold text-green-600"
                              >
                                启用账号
                              </button>
                            )}
                          </div>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      </section>
    </main>
  );
}
