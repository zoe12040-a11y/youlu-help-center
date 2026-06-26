"use client";

import { useEffect, useState } from "react";

type Faq = {
  id: number;
  question: string;
  answer: string;
  category: string;
  sortOrder: number;
  isActive: boolean;
  clickCount: number;
};

const emptyForm = { question: "", answer: "", category: "", sortOrder: 0 };

type TabKey = "list" | "ranking";

export default function AdminFaqPage() {
  const [checkedLogin, setCheckedLogin] = useState(false);
  const [faqs, setFaqs] = useState<Faq[]>([]);
  const [loading, setLoading] = useState(true);
  const [form, setForm] = useState(emptyForm);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [saving, setSaving] = useState(false);
  const [tab, setTab] = useState<TabKey>("list");

  async function loadFaqs() {
    setLoading(true);
    try {
      const res = await fetch("/api/faq");
      const result = await res.json();
      if (result.success) setFaqs(result.data);
    } catch (e) {
      console.error("读取 FAQ 失败：", e);
    }
    setLoading(false);
  }

  useEffect(() => {
    const userText = localStorage.getItem("youlu_user");
    if (!userText) { window.location.href = "/login"; return; }
    const user = JSON.parse(userText);
    if (user.role !== "admin") { window.location.href = "/unauthorized"; return; }
    setCheckedLogin(true);
    loadFaqs();
  }, []);

  async function saveFaq() {
    if (!form.question.trim() || !form.answer.trim() || !form.category.trim()) {
      alert("问题、回答和分类均为必填项");
      return;
    }
    setSaving(true);
    try {
      const isEdit = editingId !== null;
      const res = await fetch("/api/faq", {
        method: isEdit ? "PATCH" : "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(isEdit ? { id: editingId, ...form } : form),
      });
      const result = await res.json();
      if (result.success) { setForm(emptyForm); setEditingId(null); await loadFaqs(); }
      else alert("保存失败，请稍后重试");
    } catch (e) {
      console.error("保存 FAQ 失败：", e);
      alert("保存失败，请检查系统是否正常运行");
    }
    setSaving(false);
  }

  async function deleteFaq(id: number) {
    if (!confirm("确定要删除这条 FAQ 吗？")) return;
    try {
      const res = await fetch(`/api/faq?id=${id}`, { method: "DELETE" });
      const result = await res.json();
      if (result.success) await loadFaqs();
      else alert("删除失败");
    } catch (e) {
      console.error("删除 FAQ 失败：", e);
    }
  }

  function startEdit(faq: Faq) {
    setEditingId(faq.id);
    setForm({ question: faq.question, answer: faq.answer, category: faq.category, sortOrder: faq.sortOrder });
    setTab("list");
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  if (!checkedLogin) {
    return (
      <main className="min-h-screen bg-slate-100 px-4 py-8">
        <section className="mx-auto max-w-4xl rounded-3xl bg-white p-8 shadow-sm">
          <p className="text-slate-500">正在验证管理员权限...</p>
        </section>
      </main>
    );
  }

  const rankingFaqs = [...faqs].sort((a, b) => b.clickCount - a.clickCount);
  const maxClicks = Math.max(...faqs.map((f) => f.clickCount), 1);

  return (
    <main className="min-h-screen bg-slate-100 px-4 py-8 text-slate-900 md:px-6 md:py-10">
      <section className="mx-auto max-w-4xl space-y-6">

        {/* Header */}
        <div className="rounded-3xl bg-white p-5 shadow-sm md:p-8">
          <p className="text-sm text-slate-400">后台管理 / FAQ 管理</p>
          <h1 className="mt-4 text-2xl font-bold text-blue-700 md:mt-5 md:text-3xl">FAQ 管理</h1>
          <p className="mt-2 text-sm text-slate-500">
            添加、编辑或删除常见问题，内容将实时更新到客户端 FAQ 页面。
          </p>
          <div className="mt-5 flex flex-wrap gap-3">
            <a href="/admin" className="rounded-xl border border-slate-200 bg-white px-5 py-2.5 text-sm font-bold text-slate-700">
              返回后台
            </a>
            <a href="/faq" target="_blank" className="rounded-xl border border-blue-200 bg-white px-5 py-2.5 text-sm font-bold text-blue-600">
              预览客户端 FAQ
            </a>
          </div>
        </div>

        {/* Add / Edit form */}
        <div className="rounded-3xl bg-white p-5 shadow-sm md:p-8">
          <h2 className="text-lg font-bold text-slate-900 md:text-xl">
            {editingId !== null ? "编辑 FAQ" : "新增 FAQ"}
          </h2>

          <div className="mt-5 grid gap-4 md:grid-cols-2">
            <div className="md:col-span-2">
              <label className="text-sm font-bold text-slate-700">问题</label>
              <input
                value={form.question}
                onChange={(e) => setForm({ ...form, question: e.target.value })}
                placeholder="例如：机器无法开机怎么办？"
                className="mt-2 w-full rounded-xl border border-slate-200 px-4 py-3 text-sm outline-none focus:border-blue-500"
              />
            </div>
            <div>
              <label className="text-sm font-bold text-slate-700">分类</label>
              <input
                value={form.category}
                onChange={(e) => setForm({ ...form, category: e.target.value })}
                placeholder="例如：开机问题"
                className="mt-2 w-full rounded-xl border border-slate-200 px-4 py-3 text-sm outline-none focus:border-blue-500"
              />
            </div>
            <div>
              <label className="text-sm font-bold text-slate-700">排序权重（数字越小越靠前）</label>
              <input
                type="number"
                value={form.sortOrder}
                onChange={(e) => setForm({ ...form, sortOrder: Number(e.target.value) })}
                className="mt-2 w-full rounded-xl border border-slate-200 px-4 py-3 text-sm outline-none focus:border-blue-500"
              />
            </div>
            <div className="md:col-span-2">
              <label className="text-sm font-bold text-slate-700">回答</label>
              <textarea
                value={form.answer}
                onChange={(e) => setForm({ ...form, answer: e.target.value })}
                placeholder="输入标准处理建议..."
                className="mt-2 h-28 w-full rounded-xl border border-slate-200 px-4 py-3 text-sm outline-none focus:border-blue-500"
              />
            </div>
          </div>

          <div className="mt-5 flex flex-wrap gap-3">
            <button
              onClick={saveFaq}
              disabled={saving}
              className="rounded-xl bg-blue-600 px-5 py-2.5 text-sm font-bold text-white disabled:bg-slate-400"
            >
              {saving ? "保存中..." : editingId !== null ? "保存修改" : "新增 FAQ"}
            </button>
            {editingId !== null && (
              <button
                onClick={() => { setEditingId(null); setForm(emptyForm); }}
                className="rounded-xl border border-slate-200 bg-white px-5 py-2.5 text-sm font-bold text-slate-700"
              >
                取消编辑
              </button>
            )}
          </div>
        </div>

        {/* Tabs: list / ranking */}
        <div className="rounded-3xl bg-white shadow-sm overflow-hidden">
          <div className="flex border-b border-slate-100">
            {([["list", `全部 FAQ（${faqs.length} 条）`], ["ranking", "热门问题排名"]] as [TabKey, string][]).map(
              ([key, label]) => (
                <button
                  key={key}
                  onClick={() => setTab(key)}
                  className={`flex-1 py-3.5 text-sm font-bold transition ${
                    tab === key
                      ? "border-b-2 border-blue-600 text-blue-600"
                      : "text-slate-500 hover:text-slate-700"
                  }`}
                >
                  {label}
                </button>
              )
            )}
          </div>

          <div className="p-5 md:p-6">
            <div className="mb-4 flex justify-end">
              <button onClick={loadFaqs} className="rounded-xl border border-blue-200 bg-white px-4 py-2 text-xs font-bold text-blue-600">
                刷新
              </button>
            </div>

            {loading ? (
              <p className="text-sm text-slate-500">正在加载...</p>
            ) : tab === "list" ? (
              faqs.length === 0 ? (
                <div className="rounded-2xl border border-dashed border-slate-300 p-8 text-center">
                  <p className="font-bold text-slate-700">暂无 FAQ</p>
                </div>
              ) : (
                <div className="space-y-3">
                  {faqs.map((faq) => (
                    <div key={faq.id} className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
                      <div className="flex items-start justify-between gap-3">
                        <div className="flex-1">
                          <div className="flex flex-wrap items-center gap-2">
                            <span className="rounded-full bg-blue-50 px-3 py-1 text-xs font-bold text-blue-600">
                              {faq.category}
                            </span>
                            <span className="text-xs text-slate-400">排序：{faq.sortOrder}</span>
                            {faq.clickCount > 0 && (
                              <span className="rounded-full bg-orange-50 px-2 py-0.5 text-xs font-bold text-orange-600">
                                {faq.clickCount} 次查看
                              </span>
                            )}
                          </div>
                          <p className="mt-2 text-sm font-bold text-slate-900">{faq.question}</p>
                          <p className="mt-1 text-xs leading-6 text-slate-600">{faq.answer}</p>
                        </div>
                        <div className="flex shrink-0 gap-2">
                          <button
                            onClick={() => startEdit(faq)}
                            className="rounded-xl border border-blue-200 bg-white px-3 py-1.5 text-xs font-bold text-blue-600"
                          >
                            编辑
                          </button>
                          <button
                            onClick={() => deleteFaq(faq.id)}
                            className="rounded-xl border border-red-200 bg-white px-3 py-1.5 text-xs font-bold text-red-600"
                          >
                            删除
                          </button>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )
            ) : (
              /* Ranking tab */
              rankingFaqs.length === 0 ? (
                <div className="rounded-2xl border border-dashed border-slate-300 p-8 text-center">
                  <p className="font-bold text-slate-700">暂无点击数据</p>
                  <p className="mt-2 text-sm text-slate-500">客户查看 FAQ 后，这里会自动统计热门问题。</p>
                </div>
              ) : (
                <div className="space-y-3">
                  {rankingFaqs.map((faq, idx) => (
                    <div key={faq.id} className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
                      <div className="flex items-center gap-3">
                        <span
                          className={`flex h-7 w-7 shrink-0 items-center justify-center rounded-full text-sm font-bold ${
                            idx === 0
                              ? "bg-yellow-400 text-white"
                              : idx === 1
                              ? "bg-slate-300 text-white"
                              : idx === 2
                              ? "bg-orange-300 text-white"
                              : "bg-slate-100 text-slate-500"
                          }`}
                        >
                          {idx + 1}
                        </span>

                        <div className="flex-1 min-w-0">
                          <p className="truncate text-sm font-bold text-slate-900">{faq.question}</p>
                          <div className="mt-1.5 flex items-center gap-2">
                            <div className="h-2 rounded-full bg-blue-200 flex-1">
                              <div
                                className="h-2 rounded-full bg-blue-500"
                                style={{ width: `${Math.round((faq.clickCount / maxClicks) * 100)}%` }}
                              />
                            </div>
                            <span className="shrink-0 text-xs font-bold text-blue-600">
                              {faq.clickCount} 次
                            </span>
                          </div>
                        </div>

                        <span className="shrink-0 rounded-full bg-blue-50 px-2 py-1 text-xs font-bold text-blue-600">
                          {faq.category}
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              )
            )}
          </div>
        </div>
      </section>
    </main>
  );
}
