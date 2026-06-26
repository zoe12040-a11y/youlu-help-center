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
  rating: number | null;
  expectedAt: string | null;
  createdAt: string;
  updatedAt: string;
};

const STATUS_COLOR: Record<string, string> = {
  "待处理": "bg-orange-50 text-orange-600",
  "处理中": "bg-blue-50 text-blue-600",
  "已解决": "bg-green-50 text-green-600",
};

// ── Rating modal ──────────────────────────────────────────────────────────────

function RatingModal({
  ticket,
  onRate,
  onClose,
}: {
  ticket: Ticket;
  onRate: (stars: number) => void;
  onClose: () => void;
}) {
  const [stars, setStars] = useState(0);
  const [hover, setHover] = useState(0);
  const [submitting, setSubmitting] = useState(false);

  async function submit() {
    if (stars === 0) return;
    setSubmitting(true);
    await onRate(stars);
    setSubmitting(false);
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
      <div className="w-full max-w-sm rounded-3xl bg-white p-6 shadow-2xl">
        <p className="text-center text-sm text-slate-400">工单已解决</p>
        <h2 className="mt-2 text-center text-lg font-bold text-slate-900">请为本次售后服务评分</h2>
        <p className="mt-1 text-center text-xs text-slate-400">工单编号：{ticket.ticketNo}</p>

        <div className="mt-6 flex justify-center gap-3">
          {[1, 2, 3, 4, 5].map((n) => (
            <button key={n}
              onMouseEnter={() => setHover(n)}
              onMouseLeave={() => setHover(0)}
              onClick={() => setStars(n)}
              className={`text-4xl transition-transform hover:scale-110 ${
                (hover || stars) >= n ? "text-yellow-400" : "text-slate-200"
              }`}
            >
              ★
            </button>
          ))}
        </div>

        <p className="mt-3 text-center text-sm font-bold text-slate-600">
          {stars === 0 ? "请点击星星评分" : ["", "非常不满意", "不太满意", "一般", "比较满意", "非常满意"][stars]}
        </p>

        <div className="mt-6 flex gap-3">
          <button onClick={submit} disabled={stars === 0 || submitting}
            className="flex-1 rounded-xl bg-blue-600 py-3 text-sm font-bold text-white disabled:bg-slate-300">
            {submitting ? "提交中..." : "提交评分"}
          </button>
          <button onClick={onClose}
            className="flex-1 rounded-xl border border-slate-200 py-3 text-sm font-bold text-slate-600">
            暂不评价
          </button>
        </div>
      </div>
    </div>
  );
}

// ── Main page ──────────────────────────────────────────────────────────────────

export default function MyTicketsPage() {
  const [tickets, setTickets] = useState<Ticket[]>([]);
  const [loading, setLoading] = useState(true);
  const [sortOrder, setSortOrder] = useState<"desc" | "asc">("desc");
  const [ratingTarget, setRatingTarget] = useState<Ticket | null>(null);

  // Filters
  const [statusFilter, setStatusFilter] = useState("全部");
  const [deviceFilter, setDeviceFilter] = useState("");
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");

  async function loadTickets() {
    setLoading(true);
    try {
      const userText = localStorage.getItem("youlu_user");
      if (!userText) { window.location.href = "/login"; return; }
      const user = JSON.parse(userText);
      if (user.role !== "customer") { window.location.href = "/"; return; }

      const res = await fetch(`/api/tickets?phone=${user.phone}`);
      const result = await res.json();
      if (result.success) {
        const data: Ticket[] = result.data;
        setTickets(data);

        // Find recently resolved, unrated tickets (updated within 72h)
        const dismissed: string[] = JSON.parse(localStorage.getItem("youlu_rating_dismissed") || "[]");
        const candidate = data.find(
          (t) =>
            t.status === "已解决" &&
            t.rating === null &&
            !dismissed.includes(String(t.id)) &&
            Date.now() - new Date(t.updatedAt).getTime() < 72 * 3_600_000
        );
        if (candidate) setRatingTarget(candidate);
      }
    } catch (error) {
      console.error("读取工单失败：", error);
    }
    setLoading(false);
  }

  useEffect(() => { loadTickets(); }, []);

  async function handleRate(stars: number) {
    if (!ratingTarget) return;
    try {
      await fetch(`/api/tickets/${ratingTarget.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ rating: stars }),
      });
      setRatingTarget(null);
      await loadTickets();
    } catch (e) {
      console.error(e);
    }
  }

  function dismissRating() {
    if (!ratingTarget) return;
    const dismissed: string[] = JSON.parse(localStorage.getItem("youlu_rating_dismissed") || "[]");
    dismissed.push(String(ratingTarget.id));
    localStorage.setItem("youlu_rating_dismissed", JSON.stringify(dismissed));
    setRatingTarget(null);
  }

  // ── Filtering + sorting ─────────────────────────────────────────────────────
  const processed = tickets
    .filter((t) => {
      if (statusFilter !== "全部" && t.status !== statusFilter) return false;
      if (deviceFilter && !t.device.toLowerCase().includes(deviceFilter.toLowerCase())) return false;
      if (dateFrom && new Date(t.createdAt) < new Date(dateFrom)) return false;
      if (dateTo && new Date(t.createdAt) > new Date(dateTo + "T23:59:59")) return false;
      return true;
    })
    .sort((a, b) => {
      const diff = new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime();
      return sortOrder === "desc" ? -diff : diff;
    });

  const unresolvedCount = tickets.filter((t) => t.status !== "已解决").length;
  const hasFilters = statusFilter !== "全部" || deviceFilter || dateFrom || dateTo;

  function clearFilters() {
    setStatusFilter("全部");
    setDeviceFilter("");
    setDateFrom("");
    setDateTo("");
  }

  return (
    <main className="min-h-screen bg-slate-100 px-4 py-8 text-slate-900 md:px-6 md:py-10">
      {ratingTarget && (
        <RatingModal ticket={ratingTarget} onRate={handleRate} onClose={dismissRating} />
      )}

      <section className="mx-auto max-w-6xl space-y-5">

        {/* Header */}
        <div className="rounded-3xl bg-white p-5 shadow-sm md:p-8">
          <p className="text-sm text-slate-400">客户中心 / 我的工单</p>
          <h1 className="mt-4 text-2xl font-bold text-blue-700 md:text-3xl">我的工单</h1>
          <p className="mt-2 text-sm text-slate-400">共 {tickets.length} 条工单记录</p>

          {!loading && unresolvedCount > 0 && (
            <div className="mt-3 inline-flex items-center gap-2 rounded-full bg-orange-50 px-4 py-2 text-sm font-bold text-orange-600">
              <span className="h-2 w-2 rounded-full bg-orange-500" />
              {unresolvedCount} 个工单待处理或处理中
            </div>
          )}

          <div className="mt-5 flex flex-wrap gap-3">
            <a href="/tickets" className="rounded-xl bg-blue-600 px-5 py-2.5 text-sm font-bold text-white">
              提交新工单
            </a>
            <button onClick={loadTickets} className="rounded-xl border border-blue-200 bg-white px-5 py-2.5 text-sm font-bold text-blue-600">
              刷新
            </button>
            <button onClick={() => setSortOrder((s) => (s === "desc" ? "asc" : "desc"))}
              className="rounded-xl border border-slate-200 bg-white px-5 py-2.5 text-sm font-bold text-slate-700">
              {sortOrder === "desc" ? "最新优先" : "最早优先"}
            </button>
            <a href="/" className="rounded-xl border border-slate-200 bg-white px-5 py-2.5 text-sm font-bold text-slate-700">
              返回首页
            </a>
          </div>
        </div>

        {/* Filters (功能5) */}
        <div className="rounded-3xl bg-white p-5 shadow-sm md:p-6">
          <div className="flex items-center justify-between gap-3">
            <h2 className="text-sm font-bold text-slate-700">筛选工单</h2>
            {hasFilters && (
              <button onClick={clearFilters} className="text-xs font-bold text-blue-600">
                清除筛选
              </button>
            )}
          </div>

          <div className="mt-4 grid gap-3 sm:grid-cols-2 md:grid-cols-4">
            <div>
              <label className="text-xs font-bold text-slate-500">处理状态</label>
              <select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)}
                className="mt-1.5 w-full rounded-xl border border-slate-200 px-3 py-2.5 text-sm outline-none focus:border-blue-500">
                <option value="全部">全部状态</option>
                <option value="待处理">待处理</option>
                <option value="处理中">处理中</option>
                <option value="已解决">已解决</option>
              </select>
            </div>

            <div>
              <label className="text-xs font-bold text-slate-500">设备编号</label>
              <input value={deviceFilter} onChange={(e) => setDeviceFilter(e.target.value)}
                placeholder="例如：AI130"
                className="mt-1.5 w-full rounded-xl border border-slate-200 px-3 py-2.5 text-sm outline-none focus:border-blue-500" />
            </div>

            <div>
              <label className="text-xs font-bold text-slate-500">提交时间（起）</label>
              <input type="date" value={dateFrom} onChange={(e) => setDateFrom(e.target.value)}
                className="mt-1.5 w-full rounded-xl border border-slate-200 px-3 py-2.5 text-sm outline-none focus:border-blue-500" />
            </div>

            <div>
              <label className="text-xs font-bold text-slate-500">提交时间（止）</label>
              <input type="date" value={dateTo} onChange={(e) => setDateTo(e.target.value)}
                className="mt-1.5 w-full rounded-xl border border-slate-200 px-3 py-2.5 text-sm outline-none focus:border-blue-500" />
            </div>
          </div>

          {hasFilters && (
            <p className="mt-3 text-xs text-slate-400">
              筛选后显示 {processed.length} / {tickets.length} 条
            </p>
          )}
        </div>

        {/* Ticket list */}
        <div className="rounded-3xl bg-white p-5 shadow-sm md:p-6">
          {loading ? (
            <p className="text-sm text-slate-400">正在加载工单...</p>
          ) : processed.length === 0 ? (
            <div className="rounded-2xl border border-dashed border-slate-200 p-10 text-center">
              <p className="font-bold text-slate-600">{hasFilters ? "没有匹配的工单" : "暂无工单"}</p>
              <p className="mt-2 text-sm text-slate-400">
                {hasFilters ? "请尝试调整筛选条件。" : "提交工单后，这里会显示您的工单记录。"}
              </p>
            </div>
          ) : (
            <div className="space-y-4">
              {processed.map((ticket) => {
                const atts: Attachment[] = JSON.parse(ticket.attachments || "[]");
                return (
                  <div key={ticket.id}
                    className="rounded-2xl border border-slate-200 bg-slate-50 p-4 md:p-5">
                    <div className="flex flex-wrap items-start justify-between gap-3">
                      <div>
                        <p className="text-xs text-slate-400">{ticket.ticketNo}</p>
                        <h2 className="mt-1.5 text-base font-bold text-slate-900 md:text-lg">{ticket.type}</h2>
                        <p className="mt-0.5 text-xs text-slate-500">
                          {ticket.customer} ｜ {ticket.device}
                        </p>
                      </div>
                      <div className="flex flex-wrap gap-2">
                        <span className={`rounded-full px-3 py-1 text-xs font-bold ${ticket.level === "紧急" ? "bg-red-50 text-red-600" : "bg-slate-100 text-slate-600"}`}>
                          {ticket.level}
                        </span>
                        <span className={`rounded-full px-3 py-1 text-xs font-bold ${STATUS_COLOR[ticket.status] ?? "bg-slate-100 text-slate-600"}`}>
                          {ticket.status}
                        </span>
                        {ticket.rating && (
                          <span className="rounded-full bg-yellow-50 px-3 py-1 text-xs font-bold text-yellow-600">
                            {"★".repeat(ticket.rating)} {ticket.rating}/5
                          </span>
                        )}
                      </div>
                    </div>

                    <div className="mt-3 grid grid-cols-2 gap-2 md:grid-cols-3">
                      <div className="rounded-xl bg-white p-3">
                        <p className="text-xs text-slate-400">联系人</p>
                        <p className="mt-1 text-sm font-bold">{ticket.contact}</p>
                      </div>
                      <div className="rounded-xl bg-white p-3">
                        <p className="text-xs text-slate-400">项目</p>
                        <p className="mt-1 text-sm font-bold">{ticket.project || "—"}</p>
                      </div>
                      <div className="col-span-2 rounded-xl bg-white p-3 md:col-span-1">
                        <p className="text-xs text-slate-400">提交时间</p>
                        <p className="mt-1 text-sm font-bold">{new Date(ticket.createdAt).toLocaleString()}</p>
                      </div>
                    </div>

                    {ticket.expectedAt && (
                      <div className="mt-2 flex items-center gap-2 rounded-xl bg-blue-50 px-4 py-2.5 text-sm text-blue-700">
                        <span className="font-bold">预计解决时间：</span>
                        {new Date(ticket.expectedAt).toLocaleString()}
                      </div>
                    )}

                    <div className="mt-2 rounded-xl bg-white p-3">
                      <p className="text-xs text-slate-400">问题描述</p>
                      <p className="mt-1 text-sm leading-6 text-slate-700">{ticket.description}</p>
                    </div>

                    {/* Attachments */}
                    {atts.length > 0 && (
                      <div className="mt-2 rounded-xl bg-white p-3">
                        <p className="text-xs text-slate-400 mb-2">附件（{atts.length} 个）</p>
                        <div className="flex flex-wrap gap-2">
                          {atts.filter((a) => a.fileType === "image").map((a, i) => (
                            <a key={i} href={a.url} target="_blank" rel="noopener noreferrer">
                              <img src={a.url} alt={a.name}
                                className="h-14 w-14 rounded-lg border border-slate-200 object-cover hover:opacity-80" />
                            </a>
                          ))}
                        </div>
                        {atts.filter((a) => a.fileType === "video").map((a, i) => (
                          <video key={i} src={a.url} controls
                            className="mt-2 w-full rounded-xl" style={{ maxHeight: 180 }} />
                        ))}
                      </div>
                    )}

                    {/* Rating prompt for resolved unrated tickets */}
                    {ticket.status === "已解决" && ticket.rating === null && (
                      <button
                        onClick={() => setRatingTarget(ticket)}
                        className="mt-2 w-full rounded-xl border border-yellow-200 bg-yellow-50 py-2.5 text-sm font-bold text-yellow-700 hover:bg-yellow-100"
                      >
                        ☆ 为本次服务评分
                      </button>
                    )}
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
