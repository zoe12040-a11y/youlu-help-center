"use client";

import { useEffect, useState } from "react";

export default function AdminSettingsPage() {
  const [user, setUser] = useState<{ id: number; name: string; phone: string } | null>(null);
  const [form, setForm] = useState({ currentPassword: "", newPassword: "", confirmPassword: "" });
  const [saving, setSaving] = useState(false);
  const [result, setResult] = useState<{ ok: boolean; msg: string } | null>(null);

  useEffect(() => {
    const userText = localStorage.getItem("youlu_user");
    if (!userText) { window.location.href = "/login"; return; }
    const u = JSON.parse(userText);
    if (u.role !== "admin") { window.location.href = "/unauthorized"; return; }
    setUser(u);
  }, []);

  async function changePassword() {
    setResult(null);

    if (!form.currentPassword || !form.newPassword || !form.confirmPassword) {
      setResult({ ok: false, msg: "请填写所有密码字段" });
      return;
    }
    if (form.newPassword !== form.confirmPassword) {
      setResult({ ok: false, msg: "两次输入的新密码不一致" });
      return;
    }
    if (form.newPassword.length < 6) {
      setResult({ ok: false, msg: "新密码至少 6 位" });
      return;
    }

    setSaving(true);
    try {
      const res = await fetch("/api/auth/change-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          userId: user?.id,
          currentPassword: form.currentPassword,
          newPassword: form.newPassword,
        }),
      });
      const data = await res.json();
      if (data.success) {
        setResult({ ok: true, msg: "密码已成功修改，下次登录请使用新密码。" });
        setForm({ currentPassword: "", newPassword: "", confirmPassword: "" });
      } else {
        setResult({ ok: false, msg: data.message || "修改失败" });
      }
    } catch {
      setResult({ ok: false, msg: "网络错误，请稍后重试" });
    }
    setSaving(false);
  }

  if (!user) {
    return (
      <main className="min-h-screen bg-slate-100 px-4 py-8">
        <section className="mx-auto max-w-2xl rounded-3xl bg-white p-8 shadow-sm">
          <p className="text-slate-400">正在验证权限...</p>
        </section>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-slate-100 px-4 py-8 text-slate-900 md:px-6 md:py-10">
      <section className="mx-auto max-w-2xl space-y-5">

        {/* Header */}
        <div className="rounded-3xl bg-white p-5 shadow-sm md:p-8">
          <p className="text-sm text-slate-400">后台管理 / 个人设置</p>
          <h1 className="mt-4 text-2xl font-bold text-blue-700">个人设置</h1>
          <p className="mt-2 text-sm text-slate-500">
            当前账号：<span className="font-bold">{user.name}</span>（{user.phone}）
          </p>
          <div className="mt-5">
            <a href="/admin" className="rounded-xl border border-slate-200 bg-white px-5 py-2.5 text-sm font-bold text-slate-700">
              返回后台
            </a>
          </div>
        </div>

        {/* Password change */}
        <div className="rounded-3xl bg-white p-5 shadow-sm md:p-8">
          <h2 className="text-lg font-bold text-slate-900">修改密码</h2>
          <p className="mt-1 text-sm text-slate-400">建议使用 8 位以上、包含数字和字母的强密码。</p>

          <div className="mt-6 space-y-4">
            <div>
              <label className="text-sm font-bold text-slate-700">当前密码</label>
              <input
                type="password"
                value={form.currentPassword}
                onChange={(e) => setForm({ ...form, currentPassword: e.target.value })}
                placeholder="请输入当前密码"
                className="mt-2 w-full rounded-xl border border-slate-200 px-4 py-3 text-sm outline-none focus:border-blue-500"
              />
            </div>

            <div>
              <label className="text-sm font-bold text-slate-700">新密码</label>
              <input
                type="password"
                value={form.newPassword}
                onChange={(e) => setForm({ ...form, newPassword: e.target.value })}
                placeholder="至少 6 位"
                className="mt-2 w-full rounded-xl border border-slate-200 px-4 py-3 text-sm outline-none focus:border-blue-500"
              />
            </div>

            <div>
              <label className="text-sm font-bold text-slate-700">确认新密码</label>
              <input
                type="password"
                value={form.confirmPassword}
                onChange={(e) => setForm({ ...form, confirmPassword: e.target.value })}
                placeholder="再次输入新密码"
                className="mt-2 w-full rounded-xl border border-slate-200 px-4 py-3 text-sm outline-none focus:border-blue-500"
              />
            </div>

            {result && (
              <div className={`rounded-xl p-4 text-sm font-bold ${result.ok ? "bg-green-50 text-green-700" : "bg-red-50 text-red-600"}`}>
                {result.msg}
              </div>
            )}

            <button
              onClick={changePassword}
              disabled={saving}
              className="w-full rounded-xl bg-blue-600 py-3 text-sm font-bold text-white disabled:bg-slate-400"
            >
              {saving ? "保存中..." : "修改密码"}
            </button>
          </div>
        </div>

        {/* Emergency reset note */}
        <div className="rounded-3xl border border-dashed border-slate-200 bg-white p-5 shadow-sm">
          <h2 className="text-sm font-bold text-slate-600">紧急重置密码</h2>
          <p className="mt-2 text-xs leading-6 text-slate-400">
            如果忘记密码无法登录，可以在服务器上运行以下命令重置管理员密码：
          </p>
          <div className="mt-3 rounded-xl bg-slate-900 px-4 py-3 font-mono text-xs text-green-400">
            node scripts/reset-admin-password.js 新密码
          </div>
          <p className="mt-2 text-xs text-slate-400">
            例如：<code className="text-slate-600">node scripts/reset-admin-password.js MyNewPass123</code>
          </p>
        </div>

      </section>
    </main>
  );
}
