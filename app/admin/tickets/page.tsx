"use client";

import { useEffect, useState } from "react";

// ── Types ─────────────────────────────────────────────────────────────────────

type Attachment = { url: string; name: string; fileType: "image" | "video" };

type Engineer = { id: number; name: string; phone: string };

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
  assignedTo: number | null;
  assignedAt: string | null;
  assignedUser: { id: number; name: string } | null;
  expectedAt: string | null;
  createdAt: string;
  updatedAt: string;
};

type TicketLog = {
  id: number;
  ticketId: number;
  oldStatus: string;
  newStatus: string;
  operator: string;
  remark: string;
  createdAt: string;
};

// ── Helpers ───────────────────────────────────────────────────────────────────

const STATUS_COLOR: Record<string, string> = {
  "待处理": "bg-orange-50 text-orange-600",
  "处理中": "bg-blue-50 text-blue-600",
  "已解决": "bg-green-50 text-green-600",
};

function overdueLevel(ticket: Ticket): "overdue" | "warning" | "ok" {
  if (ticket.status !== "待处理") return "ok";
  const h = (Date.now() - new Date(ticket.createdAt).getTime()) / 3_600_000;
  const limit = ticket.level === "紧急" ? 2 : 24;
  const warn = ticket.level === "紧急" ? 1 : 12;
  if (h >= limit) return "overdue";
  if (h >= warn) return "warning";
  return "ok";
}

function exportCSV(tickets: Ticket[]) {
  const headers = ["工单编号","客户名称","联系人","联系电话","设备编号","所在项目","问题类型","紧急程度","处理状态","评分","提交时间","更新时间"];
  const rows = tickets.map((t) =>
    [t.ticketNo, t.customer, t.contact, t.phone, t.device, t.project,
     t.type, t.level, t.status, t.rating?.toString() ?? "",
     new Date(t.createdAt).toLocaleString(), new Date(t.updatedAt).toLocaleString()]
      .map((v) => `"${(v || "").replace(/"/g, '""')}"`).join(",")
  );
  const csv = [headers.map((h) => `"${h}"`).join(","), ...rows].join("\n");
  const blob = new Blob(["﻿" + csv], { type: "text/csv;charset=utf-8;" });
  const a = Object.assign(document.createElement("a"), {
    href: URL.createObjectURL(blob),
    download: `工单导出_${new Date().toLocaleDateString()}.csv`,
  });
  a.click();
  URL.revokeObjectURL(a.href);
}

// ── Component ─────────────────────────────────────────────────────────────────

export default function AdminTicketsPage() {
  const [checkedLogin, setCheckedLogin] = useState(false);
  const [tickets, setTickets] = useState<Ticket[]>([]);
  const [logsMap, setLogsMap] = useState<Record<number, TicketLog[]>>({});
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState("全部");
  const [sortOrder, setSortOrder] = useState<"desc" | "asc">("desc");
  const [etaMap, setEtaMap] = useState<Record<number, string>>({});
  const [savingEta, setSavingEta] = useState<number | null>(null);
  const [lightbox, setLightbox] = useState<string | null>(null);
  const [selectedIds, setSelectedIds] = useState<Set<number>>(new Set());
  const [bulkStatus, setBulkStatus] = useState("处理中");
  const [bulkLoading, setBulkLoading] = useState(false);
  const [engineers, setEngineers] = useState<Engineer[]>([]);
  const [assignMap, setAssignMap] = useState<Record<number, string>>({});
  const [savingAssign, setSavingAssign] = useState<number | null>(null);

  async function loadTickets() {
    setLoading(true);
    try {
      const res = await fetch("/api/tickets");
      const result = await res.json();
      if (result.success) setTickets(result.data);
    } catch (e) { console.error(e); }
    setLoading(false);
  }

  async function loadEngineers() {
    try {
      const res = await fetch("/api/engineers");
      const result = await res.json();
      if (result.success) setEngineers(result.data);
    } catch (e) { console.error(e); }
  }

  async function assignEngineer(ticketId: number) {
    const engineerId = assignMap[ticketId];
    if (!engineerId) return;
    setSavingAssign(ticketId);
    try {
      const res = await fetch(`/api/tickets/${ticketId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ assignedTo: Number(engineerId), operator: "售后管理员" }),
      });
      if ((await res.json()).success) await loadTickets();
    } catch (e) { console.error(e); }
    setSavingAssign(null);
  }

  async function unassignEngineer(ticketId: number) {
    setSavingAssign(ticketId);
    try {
      const res = await fetch(`/api/tickets/${ticketId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ assignedTo: null, operator: "售后管理员" }),
      });
      if ((await res.json()).success) await loadTickets();
    } catch (e) { console.error(e); }
    setSavingAssign(null);
  }

  async function loadLogs(ticketId: number) {
    try {
      const res = await fetch(`/api/tickets/logs?id=${ticketId}`);
      const result = await res.json();
      if (result.success) setLogsMap((old) => ({ ...old, [ticketId]: result.data }));
    } catch (e) { console.error(e); }
  }

  async function updateStatus(id: number, status: string) {
    try {
      const res = await fetch("/api/tickets/status", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id, status, operator: "售后管理员", remark: `后台将工单状态更新为：${status}` }),
      });
      const result = await res.json();
      if (result.success) { await loadTickets(); await loadLogs(id); }
      else alert("状态更新失败");
    } catch (e) { console.error(e); alert("状态更新失败，请检查网络"); }
  }

  async function saveEta(ticketId: number) {
    setSavingEta(ticketId);
    try {
      await fetch(`/api/tickets/${ticketId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ expectedAt: etaMap[ticketId] || null }),
      });
      await loadTickets();
    } catch (e) { console.error(e); }
    setSavingEta(null);
  }

  async function handleBulkUpdate() {
    if (selectedIds.size === 0) return;
    setBulkLoading(true);
    try {
      const res = await fetch("/api/tickets/batch", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ids: [...selectedIds],
          status: bulkStatus,
          operator: "售后管理员",
          remark: `批量更新状态为：${bulkStatus}`,
        }),
      });
      const result = await res.json();
      if (result.success) { setSelectedIds(new Set()); await loadTickets(); }
      else alert("批量操作失败");
    } catch (e) { console.error(e); alert("批量操作失败"); }
    setBulkLoading(false);
  }

  useEffect(() => {
    const userText = localStorage.getItem("youlu_user");
    if (!userText) { window.location.href = "/login"; return; }
    const user = JSON.parse(userText);
    if (user.role !== "admin") { window.location.href = "/unauthorized"; return; }
    setCheckedLogin(true);
    loadTickets();
    loadEngineers();
  }, []);

  if (!checkedLogin) {
    return (
      <main className="min-h-screen bg-slate-100 px-4 py-8">
        <section className="mx-auto max-w-4xl rounded-3xl bg-white p-8 shadow-sm">
          <p className="text-slate-400">正在验证管理员权限...</p>
        </section>
      </main>
    );
  }

  // ── Filtered + sorted ──────────────────────────────────────────────────────
  const filtered = (statusFilter === "全部" ? tickets : tickets.filter((t) => t.status === statusFilter))
    .slice()
    .sort((a, b) => {
      const diff = new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime();
      return sortOrder === "desc" ? -diff : diff;
    });

  const allFilteredSelected = filtered.length > 0 && filtered.every((t) => selectedIds.has(t.id));

  function toggleAll() {
    if (allFilteredSelected) {
      setSelectedIds((prev) => { const s = new Set(prev); filtered.forEach((t) => s.delete(t.id)); return s; });
    } else {
      setSelectedIds((prev) => { const s = new Set(prev); filtered.forEach((t) => s.add(t.id)); return s; });
    }
  }

  function toggleOne(id: number) {
    setSelectedIds((prev) => {
      const s = new Set(prev);
      s.has(id) ? s.delete(id) : s.add(id);
      return s;
    });
  }

  // Stats
  const now = new Date();
  const todayStr = now.toDateString();
  const todayCount = tickets.filter((t) => new Date(t.createdAt).toDateString() === todayStr).length;
  const weekData = Array.from({ length: 7 }, (_, i) => {
    const d = new Date(now); d.setDate(d.getDate() - (6 - i));
    const cnt = tickets.filter((t) => new Date(t.createdAt).toDateString() === d.toDateString()).length;
    return { label: `${d.getMonth() + 1}/${d.getDate()}`, count: cnt, isToday: i === 6 };
  });
  const maxW = Math.max(...weekData.map((d) => d.count), 1);

  return (
    <main className="min-h-screen bg-slate-100 px-4 py-8 text-slate-900 md:px-6 md:py-10">

      {/* Lightbox */}
      {lightbox && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 p-4"
          onClick={() => setLightbox(null)}>
          <button className="absolute right-4 top-4 flex h-9 w-9 items-center justify-center rounded-full bg-white/20 text-white"
            onClick={() => setLightbox(null)}>✕</button>
          <img src={lightbox} alt="" className="max-h-[90vh] max-w-[90vw] rounded-2xl object-contain shadow-2xl"
            onClick={(e) => e.stopPropagation()} />
        </div>
      )}

      <section className="mx-auto max-w-7xl space-y-5">

        {/* Header */}
        <div className="rounded-3xl bg-white p-5 shadow-sm md:p-8">
          <p className="text-sm text-slate-400">后台管理 / 工单管理</p>
          <h1 className="mt-4 text-2xl font-bold text-blue-700 md:text-3xl">工单管理</h1>

          {/* Week mini chart */}
          <div className="mt-6 rounded-2xl bg-slate-50 p-4">
            <div className="flex items-center justify-between">
              <p className="text-sm font-bold text-slate-600">本周趋势</p>
              <span className="rounded-full bg-blue-50 px-3 py-1 text-xs font-bold text-blue-600">
                今日新增 {todayCount} 件
              </span>
            </div>
            <div className="mt-3 flex items-end gap-1.5" style={{ height: 64 }}>
              {weekData.map((d) => (
                <div key={d.label} className="flex flex-1 flex-col items-center gap-1">
                  {d.count > 0 && <span className="text-xs font-bold text-slate-500">{d.count}</span>}
                  <div className={`w-full rounded-t ${d.isToday ? "bg-blue-500" : "bg-blue-200"}`}
                    style={{ height: `${Math.round((d.count / maxW) * 44) + (d.count > 0 ? 4 : 2)}px` }} />
                </div>
              ))}
            </div>
            <div className="mt-1 flex gap-1.5">
              {weekData.map((d) => (
                <div key={d.label} className="flex-1 text-center">
                  <span className={`text-xs ${d.isToday ? "font-bold text-blue-600" : "text-slate-400"}`}>
                    {d.label}
                  </span>
                </div>
              ))}
            </div>
          </div>

          {/* Stat pills */}
          <div className="mt-4 grid grid-cols-2 gap-3 md:grid-cols-4">
            {[
              { label: "全部", count: tickets.length, c: "bg-slate-50" },
              { label: "待处理", count: tickets.filter((t) => t.status === "待处理").length, c: "bg-orange-50" },
              { label: "处理中", count: tickets.filter((t) => t.status === "处理中").length, c: "bg-blue-50" },
              { label: "已解决", count: tickets.filter((t) => t.status === "已解决").length, c: "bg-green-50" },
            ].map(({ label, count, c }) => (
              <div key={label} className={`rounded-2xl p-4 ${c}`}>
                <p className="text-xs text-slate-400">{label}</p>
                <p className="mt-1 text-2xl font-bold text-slate-900">{count}</p>
              </div>
            ))}
          </div>

          {/* Controls */}
          <div className="mt-5 flex flex-wrap gap-3">
            <select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)}
              className="rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm font-bold text-slate-700">
              <option value="全部">全部状态</option>
              <option value="待处理">待处理</option>
              <option value="处理中">处理中</option>
              <option value="已解决">已解决</option>
            </select>

            <button onClick={() => setSortOrder((s) => (s === "desc" ? "asc" : "desc"))}
              className="rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm font-bold text-slate-700">
              {sortOrder === "desc" ? "最新优先" : "最早优先"}
            </button>

            <button onClick={loadTickets}
              className="rounded-xl border border-blue-200 bg-white px-4 py-2.5 text-sm font-bold text-blue-600">
              刷新
            </button>

            <button onClick={() => exportCSV(filtered)}
              className="rounded-xl border border-green-200 bg-white px-4 py-2.5 text-sm font-bold text-green-700">
              导出 CSV
            </button>

            <a href="/admin" className="rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm font-bold text-slate-700">
              返回后台
            </a>
          </div>

          {/* Bulk action bar */}
          {selectedIds.size > 0 && (
            <div className="mt-4 flex flex-wrap items-center gap-3 rounded-2xl bg-blue-50 px-4 py-3">
              <span className="text-sm font-bold text-blue-700">
                已选 {selectedIds.size} 条工单
              </span>
              <select value={bulkStatus} onChange={(e) => setBulkStatus(e.target.value)}
                className="rounded-xl border border-blue-200 bg-white px-3 py-2 text-sm font-bold text-slate-700">
                <option value="待处理">待处理</option>
                <option value="处理中">处理中</option>
                <option value="已解决">已解决</option>
              </select>
              <button onClick={handleBulkUpdate} disabled={bulkLoading}
                className="rounded-xl bg-blue-600 px-4 py-2 text-sm font-bold text-white disabled:bg-slate-400">
                {bulkLoading ? "更新中..." : "批量更新状态"}
              </button>
              <button onClick={() => setSelectedIds(new Set())}
                className="rounded-xl border border-blue-200 bg-white px-4 py-2 text-sm font-bold text-blue-600">
                取消选择
              </button>
            </div>
          )}
        </div>

        {/* Ticket list */}
        <div className="rounded-3xl bg-white p-5 shadow-sm md:p-6">
          {/* Select-all row */}
          {filtered.length > 0 && (
            <label className="mb-4 flex cursor-pointer items-center gap-2 text-sm font-bold text-slate-600">
              <input type="checkbox" checked={allFilteredSelected} onChange={toggleAll}
                className="h-4 w-4 rounded accent-blue-600" />
              全选当前筛选结果（{filtered.length} 条）
            </label>
          )}

          {loading ? (
            <p className="text-sm text-slate-400">正在加载工单...</p>
          ) : filtered.length === 0 ? (
            <div className="rounded-2xl border border-dashed border-slate-200 p-10 text-center">
              <p className="font-bold text-slate-600">暂无工单</p>
            </div>
          ) : (
            <div className="space-y-4">
              {filtered.map((ticket) => {
                const ov = overdueLevel(ticket);
                const isSelected = selectedIds.has(ticket.id);

                return (
                  <div key={ticket.id}
                    className={`rounded-2xl border p-4 transition md:p-5 ${
                      ov === "overdue" ? "border-red-300 bg-red-50"
                      : ov === "warning" ? "border-orange-200 bg-orange-50"
                      : isSelected ? "border-blue-300 bg-blue-50"
                      : "border-slate-200 bg-slate-50"
                    }`}
                  >
                    {/* Header row */}
                    <div className="flex flex-wrap items-start justify-between gap-3">
                      <div className="flex items-start gap-3">
                        <input type="checkbox" checked={isSelected} onChange={() => toggleOne(ticket.id)}
                          className="mt-1 h-4 w-4 rounded accent-blue-600 shrink-0" />
                        <div>
                          <div className="flex flex-wrap items-center gap-2">
                            <p className="text-xs text-slate-400">{ticket.ticketNo}</p>
                            {ov === "overdue" && (
                              <span className="rounded-full bg-red-100 px-2 py-0.5 text-xs font-bold text-red-600">
                                ⚠ 已超时
                              </span>
                            )}
                            {ov === "warning" && (
                              <span className="rounded-full bg-orange-100 px-2 py-0.5 text-xs font-bold text-orange-600">
                                即将超时
                              </span>
                            )}
                          </div>
                          <h2 className="mt-1 text-base font-bold text-slate-900 md:text-lg">{ticket.type}</h2>
                          <p className="mt-0.5 text-xs text-slate-500">
                            {ticket.customer} ｜ {ticket.device} ｜ {ticket.project}
                          </p>
                        </div>
                      </div>

                      <div className="flex flex-wrap gap-2">
                        <span className={`rounded-full px-3 py-1 text-xs font-bold ${
                          ticket.level === "紧急" ? "bg-red-50 text-red-600" : "bg-slate-100 text-slate-600"
                        }`}>{ticket.level}</span>
                        <span className={`rounded-full px-3 py-1 text-xs font-bold ${STATUS_COLOR[ticket.status] ?? "bg-slate-100 text-slate-600"}`}>
                          {ticket.status}
                        </span>
                        {ticket.rating && (
                          <span className="rounded-full bg-yellow-50 px-3 py-1 text-xs font-bold text-yellow-700">
                            {"★".repeat(ticket.rating)}{"☆".repeat(5 - ticket.rating)}
                          </span>
                        )}
                      </div>
                    </div>

                    {/* Info grid */}
                    <div className="mt-3 grid grid-cols-2 gap-2 md:grid-cols-3">
                      <div className="rounded-xl bg-white p-3">
                        <p className="text-xs text-slate-400">联系人</p>
                        <p className="mt-1 text-sm font-bold">{ticket.contact}</p>
                      </div>
                      <div className="rounded-xl bg-white p-3">
                        <p className="text-xs text-slate-400">电话</p>
                        <p className="mt-1 text-sm font-bold">{ticket.phone}</p>
                      </div>
                      <div className="col-span-2 rounded-xl bg-white p-3 md:col-span-1">
                        <p className="text-xs text-slate-400">提交时间</p>
                        <p className="mt-1 text-sm font-bold">{new Date(ticket.createdAt).toLocaleString()}</p>
                      </div>
                    </div>

                    {/* Description */}
                    <div className="mt-2 rounded-xl bg-white p-3">
                      <p className="text-xs text-slate-400">问题描述</p>
                      <p className="mt-1 text-sm leading-6 text-slate-700">{ticket.description}</p>
                    </div>

                    {/* Attachments */}
                    {(() => {
                      const atts: Attachment[] = JSON.parse(ticket.attachments || "[]");
                      if (atts.length === 0) return null;
                      const imgs = atts.filter((a) => a.fileType === "image");
                      const vids = atts.filter((a) => a.fileType === "video");
                      return (
                        <div className="mt-2 rounded-xl border border-slate-200 bg-white p-3">
                          <p className="text-xs font-bold text-slate-400 mb-2">附件（{atts.length} 个）</p>
                          {imgs.length > 0 && (
                            <div className="flex flex-wrap gap-2">
                              {imgs.map((a, i) => (
                                <button key={i} onClick={() => setLightbox(a.url)}
                                  className="group relative h-16 w-16 overflow-hidden rounded-xl border border-slate-200">
                                  <img src={a.url} alt={a.name} className="h-full w-full object-cover" />
                                  <div className="absolute inset-0 flex items-center justify-center bg-black/0 group-hover:bg-black/20 transition">
                                    <span className="text-xs font-bold text-white opacity-0 group-hover:opacity-100">放大</span>
                                  </div>
                                </button>
                              ))}
                            </div>
                          )}
                          {vids.map((a, i) => (
                            <div key={i} className="mt-2">
                              <p className="mb-1 text-xs text-slate-400">{a.name}</p>
                              <video src={a.url} controls className="w-full rounded-xl" style={{ maxHeight: 200 }} />
                            </div>
                          ))}
                        </div>
                      );
                    })()}

                    {/* Assign engineer */}
                    <div className="mt-2 rounded-xl border border-slate-200 bg-white p-3">
                      <p className="text-xs font-bold text-slate-400">指派工程师</p>
                      {ticket.assignedUser ? (
                        <div className="mt-1.5 flex items-center gap-2">
                          <span className="rounded-full bg-purple-50 px-3 py-1 text-xs font-bold text-purple-700">
                            {ticket.assignedUser.name}
                          </span>
                          <span className="text-xs text-slate-400">
                            {ticket.assignedAt ? new Date(ticket.assignedAt).toLocaleDateString() : ""}
                          </span>
                        </div>
                      ) : (
                        <p className="mt-1 text-xs text-slate-400">暂未指派</p>
                      )}
                      <div className="mt-2 flex flex-wrap items-center gap-2">
                        <select
                          value={assignMap[ticket.id] ?? ""}
                          onChange={(e) => setAssignMap((m) => ({ ...m, [ticket.id]: e.target.value }))}
                          className="rounded-lg border border-slate-200 px-3 py-2 text-xs outline-none focus:border-blue-400"
                        >
                          <option value="">
                            {engineers.length === 0 ? "暂无工程师账号" : "选择工程师..."}
                          </option>
                          {engineers.map((e) => (
                            <option key={e.id} value={e.id}>{e.name}</option>
                          ))}
                        </select>
                        <button
                          onClick={() => assignEngineer(ticket.id)}
                          disabled={!assignMap[ticket.id] || savingAssign === ticket.id}
                          className="rounded-lg bg-purple-600 px-3 py-2 text-xs font-bold text-white disabled:bg-slate-300"
                        >
                          {savingAssign === ticket.id ? "指派中..." : "指派"}
                        </button>
                        {ticket.assignedUser && (
                          <button
                            onClick={() => unassignEngineer(ticket.id)}
                            disabled={savingAssign === ticket.id}
                            className="rounded-lg border border-slate-200 bg-white px-3 py-2 text-xs font-bold text-slate-600"
                          >
                            取消指派
                          </button>
                        )}
                      </div>
                    </div>

                    {/* ETA */}
                    <div className="mt-2 rounded-xl border border-slate-200 bg-white p-3">
                      <p className="text-xs font-bold text-slate-400">预计解决时间</p>
                      <div className="mt-2 flex flex-wrap items-center gap-2">
                        <input type="datetime-local"
                          defaultValue={ticket.expectedAt ? new Date(ticket.expectedAt).toISOString().slice(0, 16) : ""}
                          onChange={(e) => setEtaMap((m) => ({ ...m, [ticket.id]: e.target.value }))}
                          className="rounded-lg border border-slate-200 px-3 py-2 text-xs outline-none focus:border-blue-400" />
                        <button onClick={() => saveEta(ticket.id)} disabled={savingEta === ticket.id}
                          className="rounded-lg bg-blue-600 px-3 py-2 text-xs font-bold text-white disabled:bg-slate-400">
                          {savingEta === ticket.id ? "保存中..." : "保存"}
                        </button>
                        {ticket.expectedAt && (
                          <span className="text-xs text-blue-600">
                            当前：{new Date(ticket.expectedAt).toLocaleString()}
                          </span>
                        )}
                      </div>
                    </div>

                    {/* Status actions */}
                    <div className="mt-3 flex flex-wrap gap-2">
                      {["待处理", "处理中", "已解决"].map((s) => (
                        <button key={s} onClick={() => updateStatus(ticket.id, s)}
                          disabled={ticket.status === s}
                          className={`rounded-xl border px-3 py-2 text-xs font-bold ${
                            ticket.status === s
                              ? "border-slate-100 bg-slate-50 text-slate-300 cursor-default"
                              : "border-slate-200 bg-white text-slate-700 hover:border-blue-300"
                          }`}>
                          标记{s}
                        </button>
                      ))}
                      <button onClick={() => loadLogs(ticket.id)}
                        className="rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs font-bold text-slate-600">
                        查看处理记录
                      </button>
                    </div>

                    {/* Logs */}
                    {logsMap[ticket.id] && (
                      <div className="mt-3 rounded-2xl bg-white p-4">
                        <p className="text-sm font-bold text-slate-800">处理记录</p>
                        {logsMap[ticket.id].length === 0 ? (
                          <p className="mt-2 text-xs text-slate-400">暂无记录。</p>
                        ) : (
                          <div className="mt-3 space-y-2">
                            {logsMap[ticket.id].map((log) => (
                              <div key={log.id} className="rounded-xl border border-slate-100 bg-slate-50 p-3">
                                <p className="text-sm font-bold text-blue-600">{log.oldStatus} → {log.newStatus}</p>
                                <p className="mt-1 text-xs text-slate-500">操作人：{log.operator}</p>
                                <p className="text-xs text-slate-500">备注：{log.remark}</p>
                                <p className="mt-1 text-xs text-slate-400">{new Date(log.createdAt).toLocaleString()}</p>
                              </div>
                            ))}
                          </div>
                        )}
                      </div>
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
