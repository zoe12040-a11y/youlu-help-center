"use client";

import { useEffect, useState } from "react";

type User = { id: number; name: string; phone: string; role: string };
type IntroVideo = { id: number; title: string; fileUrl: string; description: string };

export default function HomePage() {
  const [user, setUser] = useState<User | null>(null);
  const [unresolvedCount, setUnresolvedCount] = useState(0);
  const [introVideo, setIntroVideo] = useState<IntroVideo | null>(null);

  useEffect(() => {
    const userText = localStorage.getItem("youlu_user");
    if (!userText) return;
    const u: User = JSON.parse(userText);
    setUser(u);

    // Fetch unresolved tickets for this user
    const phone = u.role === "admin" ? "" : u.phone;
    fetch(`/api/tickets${phone ? `?phone=${phone}` : ""}`)
      .then((r) => r.json())
      .then((result) => {
        if (result.success) {
          const unresolved = result.data.filter(
            (t: { status: string }) => t.status !== "已解决"
          ).length;
          setUnresolvedCount(unresolved);
        }
      })
      .catch(() => {});
  }, []);

  // Fetch product intro video independently (no auth needed)
  useEffect(() => {
    fetch("/api/videos")
      .then((r) => r.json())
      .then((result) => {
        if (result.success) {
          const intro = result.data.find(
            (v: IntroVideo & { category: string }) => v.category === "产品介绍"
          );
          if (intro) setIntroVideo(intro);
        }
      })
      .catch(() => {});
  }, []);

  return (
    <main className="min-h-screen bg-slate-100 px-4 py-8 text-slate-900 md:px-6 md:py-10">
      <section className="mx-auto max-w-7xl">
        {/* Hero */}
        <div className="grid gap-6 rounded-3xl bg-white p-5 shadow-sm md:p-8 md:grid-cols-[1.1fr_0.9fr]">
          <div>
            <p className="text-sm text-slate-400">Udeer Robot Help Center</p>
            <h1 className="mt-4 text-3xl font-bold leading-tight text-blue-700 md:mt-5 md:text-5xl">
              有鹿机器人客户帮助中心
            </h1>
            <p className="mt-4 max-w-2xl text-base leading-8 text-slate-600 md:mt-5 md:text-lg">
              为客户提供机器人使用教程、常见问题查询、售后工单提交、处理进度查看等服务，
              帮助现场人员快速解决设备使用问题。
            </p>

            {user ? (
              <div className="mt-5 rounded-2xl bg-blue-50 p-4 text-blue-700 md:p-5">
                <p className="font-bold">当前登录：{user.name}</p>
                <p className="mt-1 text-sm">
                  账号：{user.phone} ｜ 身份：{user.role === "admin" ? "管理员" : user.role === "engineer" ? "工程师" : "客户"}
                </p>
                {unresolvedCount > 0 && (
                  <div className="mt-3 flex items-center gap-2 rounded-xl bg-orange-50 px-3 py-2 text-sm text-orange-700">
                    <span className="h-2 w-2 shrink-0 rounded-full bg-orange-500" />
                    <span>
                      您有 <span className="font-bold">{unresolvedCount}</span> 个工单待处理或处理中
                      {user.role === "customer" && (
                        <>
                          {" "}—{" "}
                          <a href="/my-tickets" className="font-bold underline">查看进度</a>
                        </>
                      )}
                      {user.role === "admin" && (
                        <>
                          {" "}—{" "}
                          <a href="/admin/tickets" className="font-bold underline">前往处理</a>
                        </>
                      )}
                      {user.role === "engineer" && (
                        <>
                          {" "}—{" "}
                          <a href="/engineer" className="font-bold underline">查看我的工单</a>
                        </>
                      )}
                    </span>
                  </div>
                )}
              </div>
            ) : (
              <div className="mt-5 rounded-2xl bg-orange-50 p-4 text-orange-700 md:p-5">
                <p className="font-bold">当前未登录</p>
                <p className="mt-1 text-sm">登录后可提交工单、查看工单进度或进入后台管理。</p>
              </div>
            )}

            <div className="mt-6 flex flex-wrap gap-3">
              {!user && (
                <a href="/login" className="rounded-xl bg-blue-600 px-5 py-3 text-sm font-bold text-white md:px-6">
                  登录系统
                </a>
              )}
              {user?.role === "customer" && (
                <>
                  <a href="/tickets" className="rounded-xl bg-blue-600 px-5 py-3 text-sm font-bold text-white md:px-6">
                    提交工单
                  </a>
                  <a href="/my-tickets" className="rounded-xl border border-blue-200 bg-white px-5 py-3 text-sm font-bold text-blue-600 md:px-6">
                    我的工单
                  </a>
                  <a href="/logout" className="rounded-xl border border-red-200 bg-white px-5 py-3 text-sm font-bold text-red-600 md:px-6">
                    退出登录
                  </a>
                </>
              )}
              {user?.role === "engineer" && (
                <>
                  <a href="/engineer" className="rounded-xl bg-purple-600 px-5 py-3 text-sm font-bold text-white md:px-6">
                    我的工单
                  </a>
                  <a href="/logout" className="rounded-xl border border-red-200 bg-white px-5 py-3 text-sm font-bold text-red-600 md:px-6">
                    退出登录
                  </a>
                </>
              )}
              {user?.role === "admin" && (
                <>
                  <a href="/admin/tickets" className="rounded-xl bg-blue-600 px-5 py-3 text-sm font-bold text-white md:px-6">
                    后台工单管理
                  </a>
                  <a href="/admin/videos" className="rounded-xl border border-blue-200 bg-white px-5 py-3 text-sm font-bold text-blue-600 md:px-6">
                    视频管理
                  </a>
                  <a href="/admin/users" className="rounded-xl border border-blue-200 bg-white px-5 py-3 text-sm font-bold text-blue-600 md:px-6">
                    用户管理
                  </a>
                  <a href="/logout" className="rounded-xl border border-red-200 bg-white px-5 py-3 text-sm font-bold text-red-600 md:px-6">
                    退出登录
                  </a>
                </>
              )}
            </div>
          </div>

          <div className="flex items-center justify-center rounded-3xl bg-slate-50 p-6">
            <img src="/AI30.png" alt="有鹿机器人" className="max-h-[360px] w-full object-contain md:max-h-[420px]" />
          </div>
        </div>

        {/* Product intro video */}
        <div className="mt-6 rounded-3xl bg-white p-5 shadow-sm md:p-8">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <p className="text-sm text-blue-500">Product Introduction</p>
              <h2 className="mt-1 text-xl font-bold text-slate-900 md:text-2xl">产品介绍视频</h2>
            </div>
            <a href="/tutorials" className="text-sm font-bold text-blue-600">
              查看全部教程 →
            </a>
          </div>

          {introVideo ? (
            <div className="mt-4 overflow-hidden rounded-2xl bg-slate-900">
              <video
                src={introVideo.fileUrl}
                controls
                preload="metadata"
                className="aspect-video w-full"
              />
              <div className="p-4">
                <p className="font-bold text-white">{introVideo.title}</p>
                {introVideo.description && (
                  <p className="mt-1 text-sm text-slate-400">{introVideo.description}</p>
                )}
              </div>
            </div>
          ) : (
            <div className="mt-4 flex aspect-video items-center justify-center rounded-2xl border-2 border-dashed border-slate-200 bg-slate-50">
              <div className="text-center">
                <p className="text-2xl">🎬</p>
                <p className="mt-2 text-sm font-bold text-slate-500">产品介绍视频</p>
                <p className="mt-1 text-xs text-slate-400">
                  管理员可在「视频管理」中上传分类为「产品介绍」的视频
                </p>
              </div>
            </div>
          )}
        </div>

        {/* Feature cards */}
        <div className="mt-6 grid gap-4 grid-cols-1 sm:grid-cols-2 md:grid-cols-4">
          <a href="/tutorials" className="rounded-3xl bg-white p-5 shadow-sm transition hover:-translate-y-1 hover:shadow-md md:p-6">
            <p className="text-sm text-blue-500">Tutorials</p>
            <h2 className="mt-3 text-xl font-bold text-slate-900 md:text-2xl">使用教程</h2>
            <p className="mt-2 text-sm leading-7 text-slate-500">
              查看开机、充电、加水、垃圾倾倒、任务下发、返航等操作视频。
            </p>
          </a>

          <a href="/faq" className="rounded-3xl bg-white p-5 shadow-sm transition hover:-translate-y-1 hover:shadow-md md:p-6">
            <p className="text-sm text-blue-500">FAQ</p>
            <h2 className="mt-3 text-xl font-bold text-slate-900 md:text-2xl">常见问题</h2>
            <p className="mt-2 text-sm leading-7 text-slate-500">
              快速查询客户现场常见问题、处理建议和基础排查方法。
            </p>
          </a>

          <a href={user ? "/tickets" : "/login"} className="rounded-3xl bg-white p-5 shadow-sm transition hover:-translate-y-1 hover:shadow-md md:p-6">
            <p className="text-sm text-blue-500">Service Ticket</p>
            <h2 className="mt-3 text-xl font-bold text-slate-900 md:text-2xl">售后工单</h2>
            <p className="mt-2 text-sm leading-7 text-slate-500">
              提交设备故障、使用异常和现场问题，由售后人员进行处理。
            </p>
          </a>

          <a href="/sop" className="rounded-3xl bg-white p-5 shadow-sm transition hover:-translate-y-1 hover:shadow-md md:p-6">
            <p className="text-sm text-blue-500">After-Sales SOP</p>
            <h2 className="mt-3 text-xl font-bold text-slate-900 md:text-2xl">售后 SOP</h2>
            <p className="mt-2 text-sm leading-7 text-slate-500">
              查看标准售后处理流程，从自助排查到提交工单的完整四步指引。
            </p>
          </a>
        </div>
      </section>
    </main>
  );
}
