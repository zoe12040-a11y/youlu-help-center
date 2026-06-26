"use client";

import { useEffect, useRef, useState } from "react";

type Faq = {
  id: number;
  question: string;
  answer: string;
  category: string;
  sortOrder: number;
};

const CACHE_KEY = "youlu_faq_cache";
const CACHE_TTL = 60 * 60 * 1000; // 1 hour

export default function FAQPage() {
  const [faqs, setFaqs] = useState<Faq[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [isOffline, setIsOffline] = useState(false);
  const clickedIds = useRef(new Set<number>());

  useEffect(() => {
    // 1. Load from cache immediately (stale-while-revalidate)
    try {
      const cached = localStorage.getItem(CACHE_KEY);
      if (cached) {
        const { data, timestamp } = JSON.parse(cached);
        if (Array.isArray(data) && data.length > 0) {
          setFaqs(data);
          setLoading(false);
          // Mark as offline if cache is stale and we haven't fetched yet
          if (Date.now() - timestamp > CACHE_TTL) setIsOffline(true);
        }
      }
    } catch {}

    // 2. Always try to fetch fresh data
    fetch("/api/faq")
      .then((r) => r.json())
      .then((result) => {
        if (result.success) {
          setFaqs(result.data);
          setIsOffline(false);
          try {
            localStorage.setItem(CACHE_KEY, JSON.stringify({ data: result.data, timestamp: Date.now() }));
          } catch {}
        }
      })
      .catch(() => {
        // Network failed — if we have cached data we already showed it
        setIsOffline(true);
      })
      .finally(() => setLoading(false));
  }, []);

  function trackClick(id: number) {
    if (clickedIds.current.has(id)) return;
    clickedIds.current.add(id);
    fetch("/api/faq", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id, increment: "clickCount" }),
    }).catch(() => {});
  }

  const lowerSearch = search.trim().toLowerCase();
  const filtered = lowerSearch
    ? faqs.filter(
        (f) =>
          f.question.toLowerCase().includes(lowerSearch) ||
          f.answer.toLowerCase().includes(lowerSearch) ||
          f.category.toLowerCase().includes(lowerSearch)
      )
    : faqs;

  const categories = Array.from(new Set(filtered.map((f) => f.category)));

  return (
    <main className="min-h-screen bg-slate-100 px-4 py-8 text-slate-900 md:px-6 md:py-10">
      <section className="mx-auto max-w-5xl">
        <div className="rounded-3xl bg-white p-5 shadow-sm md:p-8">
          <p className="text-sm text-slate-400">客户中心 / 常见问题</p>

          <h1 className="mt-4 text-2xl font-bold text-blue-700 md:mt-5 md:text-3xl">
            常见问题 FAQ
          </h1>

          <p className="mt-3 text-sm text-slate-500">
            客户可先通过常见问题进行自助排查，如无法解决，再提交售后工单。
          </p>

          {isOffline && (
            <div className="mt-4 flex items-center gap-2 rounded-xl bg-amber-50 px-4 py-3 text-sm text-amber-700">
              <span className="font-bold">📴 当前为离线数据</span>
              <span className="text-amber-600">— 网络恢复后将自动更新</span>
            </div>
          )}

          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="搜索问题或关键词..."
            className="mt-5 w-full rounded-xl border border-slate-200 px-4 py-3 text-sm outline-none focus:border-blue-500"
          />

          <div className="mt-5 flex flex-wrap gap-3">
            <a href="/" className="rounded-xl border border-slate-200 bg-white px-5 py-2.5 text-sm font-bold text-slate-700">
              返回首页
            </a>
            <a href="/tickets" className="rounded-xl bg-blue-600 px-5 py-2.5 text-sm font-bold text-white">
              提交工单
            </a>
            <a href="/sop" className="rounded-xl border border-blue-200 bg-white px-5 py-2.5 text-sm font-bold text-blue-600">
              售后 SOP 流程
            </a>
          </div>
        </div>

        {loading ? (
          <div className="mt-6 rounded-3xl bg-white p-8 text-center shadow-sm">
            <p className="text-sm text-slate-500">正在加载常见问题...</p>
          </div>
        ) : filtered.length === 0 ? (
          <div className="mt-6 rounded-3xl bg-white p-8 text-center shadow-sm">
            <p className="font-bold text-slate-700">未找到相关问题</p>
            <p className="mt-2 text-sm text-slate-500">请尝试其他关键词，或直接提交工单。</p>
          </div>
        ) : (
          <div className="mt-6 space-y-6">
            {categories.map((cat) => (
              <div key={cat}>
                <p className="mb-3 text-xs font-bold uppercase tracking-wide text-blue-600">
                  {cat}
                </p>

                <div className="space-y-3">
                  {filtered
                    .filter((f) => f.category === cat)
                    .map((item) => (
                      <details
                        key={item.id}
                        className="rounded-3xl bg-white p-5 shadow-sm md:p-6"
                        onToggle={(e) => {
                          if ((e.currentTarget as HTMLDetailsElement).open) {
                            trackClick(item.id);
                          }
                        }}
                      >
                        <summary className="cursor-pointer list-none">
                          <div className="flex items-start justify-between gap-4">
                            <h2 className="mt-0.5 text-base font-bold text-slate-900 md:text-xl">
                              {item.question}
                            </h2>
                            <span className="shrink-0 rounded-full bg-slate-100 px-3 py-1.5 text-xs font-bold text-slate-500">
                              展开
                            </span>
                          </div>
                        </summary>

                        <p className="mt-4 text-sm leading-7 text-slate-600 md:text-base">
                          {item.answer}
                        </p>
                      </details>
                    ))}
                </div>
              </div>
            ))}
          </div>
        )}
      </section>
    </main>
  );
}
