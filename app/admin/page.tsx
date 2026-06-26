"use client";

import { useEffect, useState } from "react";

type Ticket = {
  id: number;
  ticketNo: string;
  customer: string;
  type: string;
  level: string;
  status: string;
  rating: number | null;
  createdAt: string;
  updatedAt: string;
};

// ── SVG area line chart ────────────────────────────────────────────────────────
function LineChart({ data }: { data: { label: string; count: number }[] }) {
  const W = 320, H = 80;
  const pad = { t: 10, r: 10, b: 22, l: 24 };
  const iW = W - pad.l - pad.r;
  const iH = H - pad.t - pad.b;
  const max = Math.max(...data.map((d) => d.count), 1);

  const pts = data.map((d, i) => ({
    x: pad.l + (i / Math.max(data.length - 1, 1)) * iW,
    y: pad.t + iH - (d.count / max) * iH,
    ...d,
  }));

  const linePath = pts.map((p, i) => `${i === 0 ? "M" : "L"}${p.x.toFixed(1)},${p.y.toFixed(1)}`).join(" ");
  const areaPath = `${linePath} L${pts[pts.length - 1].x.toFixed(1)},${(pad.t + iH).toFixed(1)} L${pts[0].x.toFixed(1)},${(pad.t + iH).toFixed(1)} Z`;

  return (
    <svg viewBox={`0 0 ${W} ${H}`} className="w-full">
      <defs>
        <linearGradient id="ag" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#3b82f6" stopOpacity="0.25" />
          <stop offset="100%" stopColor="#3b82f6" stopOpacity="0.02" />
        </linearGradient>
      </defs>
      {[0, 0.5, 1].map((f, i) => (
        <line key={i} x1={pad.l} y1={pad.t + iH * (1 - f)} x2={pad.l + iW} y2={pad.t + iH * (1 - f)}
          stroke="#e2e8f0" strokeWidth="1" />
      ))}
      <path d={areaPath} fill="url(#ag)" />
      <path d={linePath} fill="none" stroke="#3b82f6" strokeWidth="2"
        strokeLinejoin="round" strokeLinecap="round" />
      {pts.map((p, i) => (
        <g key={i}>
          <circle cx={p.x} cy={p.y} r="4" fill="white" stroke="#3b82f6" strokeWidth="2" />
          {p.count > 0 && (
            <text x={p.x} y={p.y - 7} textAnchor="middle" fontSize="8" fill="#3b82f6" fontWeight="bold">
              {p.count}
            </text>
          )}
          <text x={p.x} y={H - 4} textAnchor="middle" fontSize="8" fill="#94a3b8">{p.label}</text>
        </g>
      ))}
    </svg>
  );
}

// ── Stat card ──────────────────────────────────────────────────────────────────
function StatCard({ label, value, sub, color }: { label: string; value: string; sub?: string; color: string }) {
  return (
    <div className={`rounded-2xl p-5 ${color}`}>
      <p className="text-xs font-bold text-slate-500">{label}</p>
      <p className="mt-2 text-2xl font-bold text-slate-900 md:text-3xl">{value}</p>
      {sub && <p className="mt-1 text-xs text-slate-400">{sub}</p>}
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
export default function AdminPage() {
  const [tickets, setTickets] = useState<Ticket[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const userText = localStorage.getItem("youlu_user");
    if (!userText) { window.location.href = "/login"; return; }
    const user = JSON.parse(userText);
    if (user.role !== "admin") { window.location.href = "/unauthorized"; return; }

    fetch("/api/tickets")
      .then((r) => r.json())
      .then((result) => { if (result.success) setTickets(result.data); })
      .catch(console.error)
      .finally(() => setLoading(false));
  }, []);

  // ── Stats ──────────────────────────────────────────────────────────────────
  const now = new Date();
  const thisMonth = now.getMonth();
  const thisYear = now.getFullYear();

  const monthTickets = tickets.filter((t) => {
    const d = new Date(t.createdAt);
    return d.getMonth() === thisMonth && d.getFullYear() === thisYear;
  });

  const resolvedTickets = tickets.filter((t) => t.status === "已解决");
  const resolutionRate = tickets.length
    ? Math.round((resolvedTickets.length / tickets.length) * 100)
    : 0;

  // Avg resolution time (hours): updatedAt - createdAt for resolved tickets
  const avgHours = resolvedTickets.length
    ? Math.round(
        resolvedTickets.reduce((sum, t) => {
          return sum + (new Date(t.updatedAt).getTime() - new Date(t.createdAt).getTime()) / 3_600_000;
        }, 0) / resolvedTickets.length
      )
    : 0;

  const ratedTickets = tickets.filter((t) => t.rating !== null);
  const avgRating = ratedTickets.length
    ? (ratedTickets.reduce((s, t) => s + (t.rating ?? 0), 0) / ratedTickets.length).toFixed(1)
    : "—";

  // ── 7-day trend ─────────────────────────────────────────────────────────────
  const weekData = Array.from({ length: 7 }, (_, i) => {
    const d = new Date(now);
    d.setDate(d.getDate() - (6 - i));
    const label = `${d.getMonth() + 1}/${d.getDate()}`;
    const count = tickets.filter(
      (t) => new Date(t.createdAt).toDateString() === d.toDateString()
    ).length;
    return { label, count };
  });

  const recentTickets = [...tickets]
    .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
    .slice(0, 5);

  const pendingCount = tickets.filter((t) => t.status === "待处理").length;
  const processingCount = tickets.filter((t) => t.status === "处理中").length;

  return (
    <main className="min-h-screen bg-slate-100 px-4 py-8 text-slate-900 md:px-6 md:py-10">
      <section className="mx-auto max-w-6xl space-y-6">

        {/* Header */}
        <div className="rounded-3xl bg-white p-5 shadow-sm md:p-8">
          <p className="text-sm text-slate-400">后台管理系统</p>
          <h1 className="mt-4 text-2xl font-bold text-blue-700 md:mt-5 md:text-3xl">
            有鹿机器人后台管理
          </h1>
          <p className="mt-2 text-sm text-slate-500">
            管理客户工单、操作教程、常见问题和售后服务内容。
          </p>

          <div className="mt-5 flex flex-wrap gap-3">
            <a href="/admin/tickets" className="rounded-xl bg-blue-600 px-5 py-2.5 text-sm font-bold text-white">
              工单管理
            </a>
            <a href="/admin/logs" className="rounded-xl border border-blue-200 bg-white px-5 py-2.5 text-sm font-bold text-blue-600">
              操作日志
            </a>
            <a href="/" className="rounded-xl border border-slate-200 bg-white px-5 py-2.5 text-sm font-bold text-slate-700">
              返回首页
            </a>
          </div>
        </div>

        {/* Stats + chart */}
        {!loading && (
          <>
            <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
              <StatCard label="本月工单" value={String(monthTickets.length)} sub={`全部 ${tickets.length} 条`} color="bg-blue-50" />
              <StatCard label="解决率" value={`${resolutionRate}%`} sub={`已解决 ${resolvedTickets.length} 条`} color="bg-green-50" />
              <StatCard label="平均处理时长" value={avgHours ? `${avgHours}h` : "—"} sub="已解决工单均值" color="bg-orange-50" />
              <StatCard label="平均满意度" value={avgRating === "—" ? "—" : `${avgRating} ★`} sub={`${ratedTickets.length} 条已评分`} color="bg-yellow-50" />
            </div>

            <div className="grid gap-4 md:grid-cols-2">
              {/* Status breakdown */}
              <div className="rounded-3xl bg-white p-5 shadow-sm md:p-6">
                <h2 className="text-base font-bold text-slate-800 md:text-lg">工单状态分布</h2>
                <div className="mt-5 space-y-3">
                  {[
                    { label: "待处理", count: pendingCount, color: "bg-orange-400" },
                    { label: "处理中", count: processingCount, color: "bg-blue-400" },
                    { label: "已解决", count: resolvedTickets.length, color: "bg-green-400" },
                  ].map(({ label, count, color }) => (
                    <div key={label}>
                      <div className="flex justify-between text-sm">
                        <span className="text-slate-600">{label}</span>
                        <span className="font-bold text-slate-800">{count}</span>
                      </div>
                      <div className="mt-1 h-2 rounded-full bg-slate-100">
                        <div
                          className={`h-2 rounded-full ${color} transition-all`}
                          style={{ width: tickets.length ? `${(count / tickets.length) * 100}%` : "0%" }}
                        />
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* 7-day trend */}
              <div className="rounded-3xl bg-white p-5 shadow-sm md:p-6">
                <h2 className="text-base font-bold text-slate-800 md:text-lg">近 7 天工单趋势</h2>
                <div className="mt-4">
                  <LineChart data={weekData} />
                </div>
              </div>
            </div>

            {/* Recent tickets */}
            <div className="rounded-3xl bg-white p-5 shadow-sm md:p-6">
              <div className="flex items-center justify-between gap-4">
                <h2 className="text-base font-bold text-slate-800 md:text-lg">最近工单</h2>
                <a href="/admin/tickets" className="text-sm font-bold text-blue-600">查看全部 →</a>
              </div>

              {recentTickets.length === 0 ? (
                <div className="mt-5 rounded-2xl border border-dashed border-slate-200 p-8 text-center">
                  <p className="text-sm text-slate-400">暂无工单记录</p>
                </div>
              ) : (
                <div className="mt-4 overflow-x-auto rounded-2xl border border-slate-100">
                  <table className="w-full text-left text-sm">
                    <thead className="bg-slate-50 text-xs text-slate-400">
                      <tr>
                        {["工单编号", "客户", "类型", "紧急程度", "状态", "提交时间"].map((h) => (
                          <th key={h} className="px-4 py-3 font-bold">{h}</th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {recentTickets.map((t) => (
                        <tr key={t.id} className="border-t border-slate-100">
                          <td className="px-4 py-3 font-bold text-blue-600">{t.ticketNo}</td>
                          <td className="px-4 py-3">{t.customer}</td>
                          <td className="px-4 py-3">{t.type}</td>
                          <td className={`px-4 py-3 font-bold ${t.level === "紧急" ? "text-red-600" : "text-slate-600"}`}>
                            {t.level}
                          </td>
                          <td className="px-4 py-3">
                            <span className={`rounded-full px-2 py-0.5 text-xs font-bold ${
                              t.status === "已解决" ? "bg-green-50 text-green-600"
                              : t.status === "处理中" ? "bg-blue-50 text-blue-600"
                              : "bg-orange-50 text-orange-600"
                            }`}>
                              {t.status}
                            </span>
                          </td>
                          <td className="px-4 py-3 text-slate-400">
                            {new Date(t.createdAt).toLocaleDateString()}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          </>
        )}

        {loading && (
          <div className="rounded-3xl bg-white p-12 text-center shadow-sm">
            <p className="text-slate-400">正在加载数据...</p>
          </div>
        )}

        {/* Admin section cards */}
        <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
          {[
            { href: "/admin/tickets", icon: "🧾", title: "工单管理", desc: "查看并处理客户售后工单" },
            { href: "/admin/faq",     icon: "❓", title: "FAQ 管理", desc: "管理常见问题及热门排名" },
            { href: "/admin/videos",  icon: "🎬", title: "视频管理", desc: "上传教程视频和管理素材" },
            { href: "/admin/logs",    icon: "📋", title: "操作日志", desc: "查看所有状态变更记录" },
          ].map((item) => (
            <a key={item.href} href={item.href}
              className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm transition hover:-translate-y-0.5 hover:border-blue-300 hover:shadow">
              <p className="text-2xl">{item.icon}</p>
              <h2 className="mt-3 text-base font-bold text-slate-900">{item.title}</h2>
              <p className="mt-1 text-xs leading-5 text-slate-500">{item.desc}</p>
              <p className="mt-4 text-xs font-bold text-blue-600">进入 →</p>
            </a>
          ))}
        </div>
      </section>
    </main>
  );
}
