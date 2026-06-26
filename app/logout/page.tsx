"use client";

import { useEffect } from "react";

export default function LogoutPage() {
  useEffect(() => {
    localStorage.removeItem("youlu_user");

    setTimeout(() => {
      window.location.href = "/login";
    }, 800);
  }, []);

  return (
    <main className="min-h-screen bg-slate-100 px-6 py-10 text-slate-900">
      <section className="mx-auto flex min-h-[80vh] max-w-4xl items-center justify-center">
        <div className="w-full rounded-3xl bg-white p-10 text-center shadow-sm">
          <p className="text-sm text-slate-400">Logout</p>

          <h1 className="mt-5 text-4xl font-bold text-blue-700">
            正在退出登录
          </h1>

          <p className="mt-5 text-slate-500">
            系统正在清除当前登录状态，并返回登录页面。
          </p>
        </div>
      </section>
    </main>
  );
}
