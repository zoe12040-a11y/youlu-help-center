"use client";

import { useState } from "react";

export default function ForgotPasswordPage() {
  const [phone, setPhone] = useState("");
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<{ ok: boolean; msg: string } | null>(null);

  async function submit() {
    if (!phone.trim()) { setResult({ ok: false, msg: "请输入账号" }); return; }
    setLoading(true);
    setResult(null);
    try {
      const res = await fetch("/api/forgot-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ phone: phone.trim() }),
      });
      const data = await res.json();
      setResult({ ok: data.success, msg: data.message });
    } catch {
      setResult({ ok: false, msg: "网络错误，请稍后重试" });
    }
    setLoading(false);
  }

  return (
    <main className="min-h-screen bg-slate-100 px-6 py-10 text-slate-900">
      <section className="mx-auto flex min-h-[80vh] max-w-md items-center justify-center">
        <div className="w-full rounded-3xl bg-white p-8 shadow-sm">
          <div className="mb-8 text-center">
            <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-blue-50">
              <span className="text-2xl">🔑</span>
            </div>
            <h1 className="text-2xl font-bold text-slate-900">忘记密码</h1>
            <p className="mt-2 text-sm text-slate-400">
              输入您的账号，系统将向绑定邮箱发送重置链接
            </p>
          </div>

          {result?.ok ? (
            <div className="space-y-5">
              <div className="rounded-2xl bg-green-50 p-5 text-center">
                <p className="text-2xl mb-2">📧</p>
                <p className="font-bold text-green-700">邮件已发送</p>
                <p className="mt-2 text-sm text-green-600">{result.msg}</p>
                <p className="mt-2 text-xs text-green-500">请检查收件箱（含垃圾邮件文件夹）</p>
              </div>
              <button
                onClick={() => { setResult(null); setPhone(""); }}
                className="w-full rounded-xl border border-slate-200 py-3 text-sm font-bold text-slate-600"
              >
                重新发送
              </button>
            </div>
          ) : (
            <div className="space-y-5">
              <div>
                <label className="text-sm font-bold text-slate-700">登录账号</label>
                <input
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  onKeyDown={(e) => e.key === "Enter" && submit()}
                  placeholder="请输入账号"
                  className="mt-2 w-full rounded-xl border border-slate-200 px-4 py-3 text-sm outline-none focus:border-blue-500"
                />
              </div>

              {result && !result.ok && (
                <div className="rounded-xl bg-red-50 p-4 text-sm font-bold text-red-600">
                  {result.msg}
                </div>
              )}

              <button
                onClick={submit}
                disabled={loading}
                className="w-full rounded-xl bg-blue-600 py-3 text-sm font-bold text-white disabled:bg-slate-400"
              >
                {loading ? "发送中..." : "发送重置邮件"}
              </button>
            </div>
          )}

          <a
            href="/login"
            className="mt-6 block text-center text-sm font-bold text-slate-400 hover:text-slate-600"
          >
            ← 返回登录
          </a>
        </div>
      </section>
    </main>
  );
}
