"use client";

import { useEffect, useState } from "react";

type TokenState =
  | { status: "checking" }
  | { status: "valid"; name: string; phone: string }
  | { status: "invalid"; message: string };

export default function ResetPasswordPage() {
  const [tokenState, setTokenState] = useState<TokenState>({ status: "checking" });
  const [token, setToken] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [done, setDone] = useState(false);
  const [error, setError] = useState("");
  const [countdown, setCountdown] = useState(5);

  // Verify token on mount
  useEffect(() => {
    const t = new URLSearchParams(window.location.search).get("token");
    if (!t) { setTokenState({ status: "invalid", message: "链接无效：缺少 token" }); return; }
    setToken(t);

    fetch(`/api/reset-password?token=${t}`)
      .then((r) => r.json())
      .then((data) => {
        if (data.success) {
          setTokenState({ status: "valid", name: data.name, phone: data.phone });
        } else {
          setTokenState({ status: "invalid", message: data.message });
        }
      })
      .catch(() => setTokenState({ status: "invalid", message: "网络错误，请重试" }));
  }, []);

  // Countdown redirect after success
  useEffect(() => {
    if (!done) return;
    const id = setInterval(() => {
      setCountdown((n) => {
        if (n <= 1) { clearInterval(id); window.location.href = "/login"; }
        return n - 1;
      });
    }, 1000);
    return () => clearInterval(id);
  }, [done]);

  async function submit() {
    setError("");
    if (!newPassword || !confirmPassword) { setError("请填写两次新密码"); return; }
    if (newPassword !== confirmPassword) { setError("两次密码不一致"); return; }
    if (newPassword.length < 6) { setError("密码至少 6 位"); return; }

    setSubmitting(true);
    try {
      const res = await fetch("/api/reset-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ token, newPassword }),
      });
      const data = await res.json();
      if (data.success) {
        setDone(true);
      } else {
        setError(data.message || "操作失败，请重试");
      }
    } catch {
      setError("网络错误，请稍后重试");
    }
    setSubmitting(false);
  }

  return (
    <main className="min-h-screen bg-slate-100 px-6 py-10 text-slate-900">
      <section className="mx-auto flex min-h-[80vh] max-w-md items-center justify-center">
        <div className="w-full rounded-3xl bg-white p-8 shadow-sm">

          {/* Checking token */}
          {tokenState.status === "checking" && (
            <div className="py-8 text-center">
              <p className="text-slate-400">正在验证链接有效性...</p>
            </div>
          )}

          {/* Invalid token */}
          {tokenState.status === "invalid" && (
            <div className="space-y-5 text-center">
              <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-red-50">
                <span className="text-2xl">⚠️</span>
              </div>
              <h1 className="text-xl font-bold text-slate-900">链接已失效</h1>
              <p className="text-sm text-slate-500">{tokenState.message}</p>
              <a
                href="/forgot-password"
                className="block w-full rounded-xl bg-blue-600 py-3 text-sm font-bold text-white"
              >
                重新申请重置链接
              </a>
              <a href="/login" className="block text-sm font-bold text-slate-400">
                返回登录
              </a>
            </div>
          )}

          {/* Valid token — show form or success */}
          {tokenState.status === "valid" && (
            <>
              {done ? (
                <div className="space-y-5 text-center">
                  <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-green-50">
                    <span className="text-2xl">✅</span>
                  </div>
                  <h1 className="text-xl font-bold text-slate-900">密码已重置</h1>
                  <p className="text-sm text-slate-500">
                    {countdown} 秒后自动跳转到登录页…
                  </p>
                  <a
                    href="/login"
                    className="block w-full rounded-xl bg-blue-600 py-3 text-sm font-bold text-white"
                  >
                    立即前往登录
                  </a>
                </div>
              ) : (
                <>
                  <div className="mb-8 text-center">
                    <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-blue-50">
                      <span className="text-2xl">🔒</span>
                    </div>
                    <h1 className="text-2xl font-bold text-slate-900">设置新密码</h1>
                    <p className="mt-1 text-sm text-slate-400">
                      账号：{tokenState.phone}（{tokenState.name}）
                    </p>
                  </div>

                  <div className="space-y-4">
                    <div>
                      <label className="text-sm font-bold text-slate-700">新密码</label>
                      <input
                        type="password"
                        value={newPassword}
                        onChange={(e) => setNewPassword(e.target.value)}
                        placeholder="至少 6 位"
                        className="mt-2 w-full rounded-xl border border-slate-200 px-4 py-3 text-sm outline-none focus:border-blue-500"
                      />
                    </div>

                    <div>
                      <label className="text-sm font-bold text-slate-700">确认新密码</label>
                      <input
                        type="password"
                        value={confirmPassword}
                        onChange={(e) => setConfirmPassword(e.target.value)}
                        onKeyDown={(e) => e.key === "Enter" && submit()}
                        placeholder="再次输入新密码"
                        className="mt-2 w-full rounded-xl border border-slate-200 px-4 py-3 text-sm outline-none focus:border-blue-500"
                      />
                    </div>

                    {error && (
                      <div className="rounded-xl bg-red-50 p-3 text-sm font-bold text-red-600">
                        {error}
                      </div>
                    )}

                    <button
                      onClick={submit}
                      disabled={submitting}
                      className="w-full rounded-xl bg-blue-600 py-3 text-sm font-bold text-white disabled:bg-slate-400"
                    >
                      {submitting ? "设置中..." : "确认设置新密码"}
                    </button>
                  </div>

                  <a href="/login" className="mt-5 block text-center text-sm font-bold text-slate-400">
                    返回登录
                  </a>
                </>
              )}
            </>
          )}
        </div>
      </section>
    </main>
  );
}
