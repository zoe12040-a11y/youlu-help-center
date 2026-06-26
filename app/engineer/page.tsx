"use client";

import { useEffect, useState } from "react";

// ── Types ─────────────────────────────────────────────────────────────────────

type Attachment = { url: string; name: string; fileType: "image" | "video" };

type Ticket = {
  id: number;
  ticketNo: string;
  customer: string;
  contact: string;
  phone: string;
  device: string;
  project: string;
  type: string;
  level: string;
  status: string;
  description: string;
  attachments: string;
  assignedAt: string | null;
  expectedAt: string | null;
  createdAt: string;
  updatedAt: string;
};

const STATUS_COLOR: Record<string, string> = {
  "待处理": "bg-orange-50 text-orange-600",
  "处理中": "bg-blue-50 text-blue-600",
  "已解决": "bg-green-50 text-green-600",
};

// ── Component ─────────────────────────────────────────────────────────────────

export default function EngineerPage() {
  const [engineer, setEngineer] = useState<{ id: number; name: string; phone: string } | null>(null);
  const [tickets, setTickets] = useState<Ticket[]>([]);
  const [loading, setLoading] = useState(true);
  const [sortOrder, setSortOrder] = useState<"desc" | "asc">("desc");
  const [statusFilter, setStatusFilter] = useState("全部");
  // Remark form state per ticket
  const [remarkMap, setRemarkMap] = useState<Record<number, string>>({});
  const [savingMap, setSavingMap] = useState<Record<number, boolean>>({});
  const [lightbox, setLightbox] = useState<string | null>(null);

  async function loadTickets(eng: { id: number }) {
    setLoading(true);
    try {
      const res = await fetch(`/api/tickets?engineerId=${eng.id}`);
      const result = await res.json();
      if (result.success) setTickets(result.data);
    } catch (e) {
      console.error("读取工单失败：", e);
    }
    setLoading(false);
  }

  useEffect(() => {
    const userText = localStorage.getItem("youlu_user");
    if (!userText) { window.location.href = "/login"; return; }
    const user = JSON.parse(userText);
    if (user.role !== "engineer") { window.location.href = "/unauthorized"; return; }
    setEngineer(user);
    loadTickets(user);
  }, []);

  // ── Update status + optional remark ────────────────────────────────────────

  async function updateStatus(ticket: Ticket, newStatus: string) {
    const remark = remarkMap[ticket.id]?.trim() || `工程师将工单状态更新为：${newStatus}`;
    setSavingMap((m) => ({ ...m, [ticket.id]: true }));
    try {
      const res = await fetch(`/api/tickets/${ticket.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          status: newStatus,
          operator: engineer?.name ?? "工程师",
          remark,
        }),
      });
      if ((await res.json()).success) {
        setRemarkMap((m) => ({ ...m, [ticket.id]: "" }));
        if (engineer) await loadTickets(engineer);
      }
    } catch (e) {
      console.error(e);
    }
    setSavingMap((m) => ({ ...m, [ticket.id]: false }));
  }

  // ── Filtered + sorted ────────────────────────────────────────────────────────

  const displayed = tickets
    .filter((t) => statusFilter === "全部" || t.status === statusFilter)
    .sort((a, b) => {
      const d = new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime();
      return sortOrder === "desc" ? -d : d;
    });

  const pendingCount    = tickets.filter((t) => t.status === "待处理").length;
  const processingCount = tickets.filter((t) => t.status === "处理中").length;
  const doneCount       = tickets.filter((t) => t.status === "已解决").length;

  if (!engineer) {
    return (
      <main className="min-h-screen bg-slate-100 px-4 py-10">
        <section className="mx-auto max-w-4xl rounded-3xl bg-white p-8 shadow-sm">
          <p className="text-slate-400">正在验证工程师权限...</p>
        </section>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-slate-100 px-4 py-8 text-slate-900 md:px-6 md:py-10">

      {/* Lightbox */}
      {lightbox && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 p-4"
          onClick={() => setLightbox(null)}
        >
          <button
            className="absolute right-4 top-4 flex h-9 w-9 items-center justify-center rounded-full bg-white/20 text-white"
            onClick={() => setLightbox(null)}
          >
            ✕
          </button>
          <img
            src={lightbox}
            alt="附件预览"
            className="max-h-[90vh] max-w-[90vw] rounded-2xl object-contain shadow-2xl"
            onClick={(e) => e.stopPropagation()}
          />
        </div>
      )}

      <section className="mx-auto max-w-5xl space-y-5">

        {/* Header */}
        <div className="rounded-3xl bg-white p-5 shadow-sm md:p-8">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div>
              <p className="text-sm text-slate-400">工程师工作台</p>
              <h1 className="mt-3 text-2xl font-bold text-purple-700 md:text-3xl">
                你好，{engineer.name}
              </h1>
              <p className="mt-1 text-sm text-slate-500">
                以下是分配给你的售后工单，请及时跟进处理。
              </p>
            </div>
            <div className="flex flex-wrap gap-2">
              <a
                href="/"
                className="rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm font-bold text-slate-600"
              >
                返回首页
              </a>
              <a
                href="/logout"
                className="rounded-xl border border-red-200 bg-white px-4 py-2.5 text-sm font-bold text-red-600"
              >
                退出登录
              </a>
            </div>
          </div>

          {/* Stats */}
          <div className="mt-6 grid grid-cols-3 gap-3">
            <div className="rounded-2xl bg-orange-50 p-4 text-center">
              <p className="text-xs text-orange-500">待处理</p>
              <p className="mt-1 text-2xl font-bold text-orange-600">{pendingCount}</p>
            </div>
            <div className="rounded-2xl bg-blue-50 p-4 text-center">
              <p className="text-xs text-blue-500">处理中</p>
              <p className="mt-1 text-2xl font-bold text-blue-600">{processingCount}</p>
            </div>
            <div className="rounded-2xl bg-green-50 p-4 text-center">
              <p className="text-xs text-green-500">已解决</p>
              <p className="mt-1 text-2xl font-bold text-green-600">{doneCount}</p>
            </div>
          </div>

          {/* Controls */}
          <div className="mt-5 flex flex-wrap gap-3">
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm font-bold text-slate-700"
            >
              <option value="全部">全部状态</option>
              <option value="待处理">待处理</option>
              <option value="处理中">处理中</option>
              <option value="已解决">已解决</option>
            </select>

            <button
              onClick={() => setSortOrder((s) => (s === "desc" ? "asc" : "desc"))}
              className="rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm font-bold text-slate-700"
            >
              {sortOrder === "desc" ? "最新优先" : "最早优先"}
            </button>

            <button
              onClick={() => engineer && loadTickets(engineer)}
              className="rounded-xl border border-purple-200 bg-white px-4 py-2.5 text-sm font-bold text-purple-600"
            >
              刷新
            </button>
          </div>
        </div>

        {/* Ticket list */}
        <div className="rounded-3xl bg-white p-5 shadow-sm md:p-6">
          <p className="mb-4 text-sm text-slate-400">
            共 {displayed.length} 条工单
            {statusFilter !== "全部" ? `（${statusFilter}）` : ""}
          </p>

          {loading ? (
            <p className="py-8 text-center text-sm text-slate-400">正在加载工单...</p>
          ) : displayed.length === 0 ? (
            <div className="rounded-2xl border border-dashed border-slate-200 py-16 text-center">
              <p className="font-bold text-slate-600">
                {statusFilter === "全部" ? "暂无分配给你的工单" : `暂无${statusFilter}的工单`}
              </p>
              <p className="mt-2 text-sm text-slate-400">
                管理员指派工单后将在这里显示。
              </p>
            </div>
          ) : (
            <div className="space-y-4">
              {displayed.map((ticket) => {
                const atts: Attachment[] = JSON.parse(ticket.attachments || "[]");
                const isSaving = savingMap[ticket.id] ?? false;

                return (
                  <div
                    key={ticket.id}
                    className={`rounded-2xl border p-4 md:p-5 ${
                      ticket.status === "待处理"
                        ? "border-orange-200 bg-orange-50"
                        : "border-slate-200 bg-slate-50"
                    }`}
                  >
                    {/* Header */}
                    <div className="flex flex-wrap items-start justify-between gap-3">
                      <div>
                        <p className="text-xs text-slate-400">{ticket.ticketNo}</p>
                        <h2 className="mt-1 text-base font-bold text-slate-900 md:text-lg">
                          {ticket.type}
                        </h2>
                        <p className="mt-0.5 text-xs text-slate-500">
                          {ticket.customer} ｜ {ticket.device} ｜ {ticket.project}
                        </p>
                      </div>
                      <div className="flex flex-wrap gap-2">
                        <span
                          className={`rounded-full px-3 py-1 text-xs font-bold ${
                            ticket.level === "紧急"
                              ? "bg-red-50 text-red-600"
                              : "bg-slate-100 text-slate-600"
                          }`}
                        >
                          {ticket.level}
                        </span>
                        <span
                          className={`rounded-full px-3 py-1 text-xs font-bold ${STATUS_COLOR[ticket.status] ?? "bg-slate-100 text-slate-600"}`}
                        >
                          {ticket.status}
                        </span>
                      </div>
                    </div>

                    {/* Info grid */}
                    <div className="mt-3 grid grid-cols-2 gap-2 md:grid-cols-3">
                      <div className="rounded-xl bg-white p-3">
                        <p className="text-xs text-slate-400">联系人</p>
                        <p className="mt-1 text-sm font-bold">{ticket.contact}</p>
                      </div>
                      <div className="rounded-xl bg-white p-3">
                        <p className="text-xs text-slate-400">联系电话</p>
                        <p className="mt-1 text-sm font-bold">{ticket.phone}</p>
                      </div>
                      <div className="col-span-2 rounded-xl bg-white p-3 md:col-span-1">
                        <p className="text-xs text-slate-400">提交时间</p>
                        <p className="mt-1 text-sm font-bold">
                          {new Date(ticket.createdAt).toLocaleString()}
                        </p>
                      </div>
                    </div>

                    {/* Description */}
                    <div className="mt-2 rounded-xl bg-white p-3">
                      <p className="text-xs text-slate-400">问题描述</p>
                      <p className="mt-1 text-sm leading-6 text-slate-700">
                        {ticket.description}
                      </p>
                    </div>

                    {/* Expected time */}
                    {ticket.expectedAt && (
                      <div className="mt-2 flex items-center gap-2 rounded-xl bg-blue-50 px-4 py-2.5 text-sm text-blue-700">
                        <span className="font-bold">预计解决时间：</span>
                        {new Date(ticket.expectedAt).toLocaleString()}
                      </div>
                    )}

                    {/* Attachments */}
                    {atts.length > 0 && (
                      <div className="mt-2 rounded-xl bg-white p-3">
                        <p className="mb-2 text-xs text-slate-400">
                          客户附件（{atts.length} 个）
                        </p>
                        <div className="flex flex-wrap gap-2">
                          {atts
                            .filter((a) => a.fileType === "image")
                            .map((a, i) => (
                              <button
                                key={i}
                                onClick={() => setLightbox(a.url)}
                                className="group relative h-16 w-16 overflow-hidden rounded-xl border border-slate-200"
                                title={a.name}
                              >
                                <img
                                  src={a.url}
                                  alt={a.name}
                                  className="h-full w-full object-cover"
                                />
                                <div className="absolute inset-0 flex items-center justify-center bg-black/0 transition group-hover:bg-black/20">
                                  <span className="text-xs font-bold text-white opacity-0 group-hover:opacity-100">
                                    放大
                                  </span>
                                </div>
                              </button>
                            ))}
                        </div>
                        {atts
                          .filter((a) => a.fileType === "video")
                          .map((a, i) => (
                            <div key={i} className="mt-2">
                              <p className="mb-1 text-xs text-slate-400">{a.name}</p>
                              <video
                                src={a.url}
                                controls
                                className="w-full rounded-xl"
                                style={{ maxHeight: 200 }}
                              />
                            </div>
                          ))}
                      </div>
                    )}

                    {/* Update status + remark */}
                    <div className="mt-3 rounded-xl border border-purple-100 bg-white p-3">
                      <p className="mb-2 text-xs font-bold text-slate-500">
                        更新处理状态
                      </p>

                      <textarea
                        value={remarkMap[ticket.id] ?? ""}
                        onChange={(e) =>
                          setRemarkMap((m) => ({ ...m, [ticket.id]: e.target.value }))
                        }
                        placeholder="填写处理备注（可选）..."
                        rows={2}
                        className="w-full rounded-xl border border-slate-200 px-3 py-2 text-xs outline-none focus:border-purple-400"
                      />

                      <div className="mt-2 flex flex-wrap gap-2">
                        {["待处理", "处理中", "已解决"].map((s) => (
                          <button
                            key={s}
                            onClick={() => updateStatus(ticket, s)}
                            disabled={ticket.status === s || isSaving}
                            className={`rounded-xl border px-3 py-2 text-xs font-bold transition ${
                              ticket.status === s
                                ? "cursor-default border-slate-100 bg-slate-50 text-slate-300"
                                : s === "已解决"
                                ? "border-green-200 bg-white text-green-700 hover:bg-green-50"
                                : s === "处理中"
                                ? "border-blue-200 bg-white text-blue-700 hover:bg-blue-50"
                                : "border-orange-200 bg-white text-orange-700 hover:bg-orange-50"
                            } disabled:opacity-50`}
                          >
                            {isSaving ? "更新中..." : `标记${s}`}
                          </button>
                        ))}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </section>
    </main>
  );
}
