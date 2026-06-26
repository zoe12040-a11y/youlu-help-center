"use client";

import { useEffect, useState } from "react";

type Log = {
  id: number;
  ticketId: number;
  oldStatus: string;
  newStatus: string;
  operator: string;
  remark: string;
  createdAt: string;
  ticket: { ticketNo: string; customer: string; type: string };
};

export default function AdminLogsPage() {
  const [logs, setLogs] = useState<Log[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [operatorFilter, setOperatorFilter] = useState("");

  useEffect(() => {
    const userText = localStorage.getItem("youlu_user");
    if (!userText) { window.location.href = "/login"; return; }
    const user = JSON.parse(userText);
    if (user.role !== "admin") { window.location.href = "/unauthorized"; return; }

    fetch("/api/admin/logs")
      .then((r) => r.json())
      .then((result) => { if (result.success) setLogs(result.data); })
      .catch(console.error)
      .finally(() => setLoading(false));
  }, []);

  const operators = Array.from(new Set(logs.map((l) => l.operator)));

  const filtered = logs.filter((l) => {
    const matchSearch =
      !search ||
      l.ticket.ticketNo.includes(search) ||
      l.ticket.customer.includes(search) ||
      l.remark.includes(search) ||
      l.operator.includes(search);
    const matchOp = !operatorFilter || l.operator === operatorFilter;
    return matchSearch && matchOp;
  });

  return (
    <main className="min-h-screen bg-slate-100 px-4 py-8 text-slate-900 md:px-6 md:py-10">
      <section className="mx-auto max-w-6xl space-y-5">

        <div className="rounded-3xl bg-white p-5 shadow-sm md:p-8">
          <p className="text-sm text-slate-400">后台管理 / 操作日志</p>
          <h1 className="mt-4 text-2xl font-bold text-blue-700 md:text-3xl">操作日志</h1>
          <p className="mt-2 text-sm text-slate-500">
            记录所有工单状态变更、备注和批量操作，共 {logs.length} 条记录。
          </p>

          <div className="mt-5 flex flex-wrap gap-3">
            <input value={search} onChange={(e) => setSearch(e.target.value)}
              placeholder="搜索工单编号、客户、备注..."
              className="rounded-xl border border-slate-200 px-4 py-2.5 text-sm outline-none focus:border-blue-500 md:w-64" />
            <select value={operatorFilter} onChange={(e) => setOperatorFilter(e.target.value)}
              className="rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm font-bold text-slate-700">
              <option value="">全部操作人</option>
              {operators.map((op) => <option key={op} value={op}>{op}</option>)}
            </select>
            <a href="/admin"
              className="rounded-xl border border-slate-200 bg-white px-5 py-2.5 text-sm font-bold text-slate-700">
              返回后台
            </a>
          </div>
        </div>

        <div className="rounded-3xl bg-white p-5 shadow-sm md:p-6">
          <p className="mb-4 text-sm text-slate-400">显示 {filtered.length} 条记录</p>

          {loading ? (
            <p className="text-sm text-slate-400">正在加载日志...</p>
          ) : filtered.length === 0 ? (
            <div className="rounded-2xl border border-dashed border-slate-200 p-10 text-center">
              <p className="text-slate-400">暂无操作日志</p>
            </div>
          ) : (
            <div className="overflow-x-auto rounded-2xl border border-slate-100">
              <table className="w-full text-left text-sm">
                <thead className="bg-slate-50 text-xs text-slate-400">
                  <tr>
                    {["时间", "工单编号", "客户", "状态变更", "操作人", "备注"].map((h) => (
                      <th key={h} className="px-4 py-3 font-bold whitespace-nowrap">{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {filtered.map((log) => (
                    <tr key={log.id} className="border-t border-slate-100 hover:bg-slate-50">
                      <td className="px-4 py-3 text-xs text-slate-400 whitespace-nowrap">
                        {new Date(log.createdAt).toLocaleString()}
                      </td>
                      <td className="px-4 py-3 font-bold text-blue-600 whitespace-nowrap">
                        {log.ticket.ticketNo}
                      </td>
                      <td className="px-4 py-3 text-slate-700 whitespace-nowrap">
                        {log.ticket.customer}
                      </td>
                      <td className="px-4 py-3 whitespace-nowrap">
                        <span className="rounded-full bg-slate-100 px-2 py-0.5 text-xs text-slate-600">
                          {log.oldStatus}
                        </span>
                        <span className="mx-1 text-slate-400">→</span>
                        <span className={`rounded-full px-2 py-0.5 text-xs font-bold ${
                          log.newStatus === "已解决" ? "bg-green-50 text-green-600"
                          : log.newStatus === "处理中" ? "bg-blue-50 text-blue-600"
                          : "bg-orange-50 text-orange-600"
                        }`}>
                          {log.newStatus}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-slate-600 whitespace-nowrap">{log.operator}</td>
                      <td className="px-4 py-3 text-slate-500 max-w-xs truncate">{log.remark}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </section>
    </main>
  );
}
