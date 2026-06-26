"use client";

import { useState } from "react";

export default function LoginPage() {
  const [phone, setPhone] = useState("admin");
  const [password, setPassword] = useState("123456");
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState("");

  async function login() {
    setLoading(true);
    setMessage("");

    try {
      const response = await fetch("/api/login", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          phone,
          password,
        }),
      });

      const result = await response.json();

      if (!result.success) {
        setMessage(result.message || "登录失败");
        setLoading(false);
        return;
      }

      localStorage.setItem("youlu_user", JSON.stringify(result.data));

      if (result.data.role === "admin") {
        window.location.href = "/admin/tickets";
      } else if (result.data.role === "engineer") {
        window.location.href = "/engineer";
      } else {
        window.location.href = "/";
      }
    } catch (error) {
      console.error("登录失败：", error);
      setMessage("登录失败，请检查系统是否正常运行。");
    }

    setLoading(false);
  }

  return (
    <main className="min-h-screen bg-slate-100 px-6 py-10 text-slate-900">
      <section className="mx-auto flex min-h-[80vh] max-w-5xl items-center justify-center">
        <div className="grid w-full overflow-hidden rounded-3xl bg-white shadow-sm md:grid-cols-2">
          <div className="bg-blue-700 p-10 text-white">
            <p className="text-sm text-blue-100">有鹿机器人客户帮助中心</p>

            <h1 className="mt-6 text-4xl font-bold leading-tight">
              登录售后服务系统
            </h1>

            <p className="mt-5 leading-7 text-blue-100">
              客户可提交工单、查看处理进度；管理员可进入后台处理工单、查看处理记录。
            </p>

            <div className="mt-10 rounded-2xl bg-white/10 p-5">
              <p className="font-bold">测试账号</p>
              <p className="mt-3 text-sm text-blue-100">管理员：admin / 123456</p>
              <p className="mt-2 text-sm text-blue-100">客户：customer / 123456</p>
              <p className="mt-2 text-sm text-blue-100">工程师：在用户管理页创建</p>
            </div>
          </div>

          <div className="p-10">
            <p className="text-sm text-slate-400">Login</p>

            <h2 className="mt-4 text-3xl font-bold text-slate-900">
              账号登录
            </h2>

            <p className="mt-3 text-slate-500">
              请输入账号和密码进入系统。
            </p>

            <div className="mt-8 space-y-5">
              <div>
                <label className="font-bold text-slate-700">账号</label>
                <input
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  placeholder="请输入账号"
                  className="mt-2 w-full rounded-xl border border-slate-200 px-4 py-3 outline-none focus:border-blue-500"
                />
              </div>

              <div>
                <label className="font-bold text-slate-700">密码</label>
                <input
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="请输入密码"
                  type="password"
                  className="mt-2 w-full rounded-xl border border-slate-200 px-4 py-3 outline-none focus:border-blue-500"
                />
              </div>

              {message && (
                <div className="rounded-xl bg-red-50 p-4 text-sm font-bold text-red-600">
                  {message}
                </div>
              )}

              <button
                onClick={login}
                disabled={loading}
                className="w-full rounded-xl bg-blue-600 px-6 py-3 font-bold text-white disabled:bg-slate-400"
              >
                {loading ? "登录中..." : "登录"}
              </button>

              <a
                href="/"
                className="block text-center text-sm font-bold text-slate-500"
              >
                返回首页
              </a>
            </div>
          </div>
        </div>
      </section>
    </main>
  );
}
