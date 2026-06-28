"use client";

import { useEffect, useRef, useState } from "react";

type Video = {
  id: number;
  title: string;
  category: string;
  fileUrl: string;
  description: string;
};

type Faq = {
  id: number;
  question: string;
  answer: string;
  category: string;
};

// Primary categories with links to dedicated step-by-step tutorial pages
const PRIMARY_CARDS = [
  { title: "开机 & 部署", dbCategory: "开机部署",  href: "/tutorials/start"    },
  { title: "充电操作",    dbCategory: "充电操作",  href: "/tutorials/charging" },
  { title: "加水操作",    dbCategory: "加水操作",  href: "/tutorials/water"    },
  { title: "倾倒垃圾",   dbCategory: "倾倒垃圾",  href: "/tutorials/trash"    },
  { title: "任务下发",   dbCategory: "任务下发",  href: "/tutorials/task"     },
  { title: "返航操作",   dbCategory: "返航操作",  href: "/tutorials/return"   },
];

const PRIMARY_CATEGORY_NAMES = PRIMARY_CARDS.map((c) => c.dbCategory);
const HOT_WORDS = ["充电异常", "无法开机", "任务下发", "APP 连接", "返航", "加水"];

export default function TutorialsPage() {
  const [videos, setVideos] = useState<Video[]>([]);
  const [faqs, setFaqs] = useState<Faq[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  // null = no category selected (default: show no videos)
  const [activeCategory, setActiveCategory] = useState<string | null>(null);
  const [playingId, setPlayingId] = useState<number | null>(null);
  const videoRefs = useRef<Record<number, HTMLVideoElement | null>>({});
  const [isAdmin, setIsAdmin] = useState(false);
  const [deletingId, setDeletingId] = useState<number | null>(null);

  useEffect(() => {
    const user = JSON.parse(localStorage.getItem("youlu_user") || "{}");
    setIsAdmin(user.role === "admin");
  }, []);

  async function adminDeleteVideo(id: number, title: string) {
    if (!confirm(`确认删除视频「${title}」？\n将同时删除 OSS 文件，无法恢复。`)) return;
    setDeletingId(id);
    try {
      const res = await fetch(`/api/videos/${id}`, { method: "DELETE" });
      const r   = await res.json();
      if (r.success) setVideos((prev) => prev.filter((v) => v.id !== id));
      else alert(`删除失败：${r.message}`);
    } catch { alert("删除失败，请检查网络"); }
    setDeletingId(null);
  }

  async function loadData() {
    setLoading(true);
    try {
      const [vRes, fRes] = await Promise.all([fetch("/api/videos"), fetch("/api/faq")]);
      const [vResult, fResult] = await Promise.all([vRes.json(), fRes.json()]);
      if (vResult.success) setVideos(vResult.data);
      if (fResult.success) setFaqs(fResult.data);
    } catch (e) {
      console.error("加载数据失败：", e);
    }
    setLoading(false);
  }

  useEffect(() => { loadData(); }, []);

  // ── Derived state ──────────────────────────────────────────────────────────
  const lowerSearch = search.trim().toLowerCase();

  // Categories from DB, split into primary + extra
  const dbOnlyCategories = Array.from(new Set(videos.map((v) => v.category)))
    .filter((c) => !PRIMARY_CATEGORY_NAMES.includes(c))
    .sort();
  // All categories for the filter UI: primary first, then extras from DB
  const allCategories = [...PRIMARY_CATEGORY_NAMES, ...dbOnlyCategories];

  // Videos to show:
  // - Search active: show matching videos regardless of category
  // - Category selected: show that category's videos
  // - Neither: show nothing (user must pick a category)
  const displayVideos = (() => {
    if (lowerSearch)
      return videos.filter(
        (v) =>
          v.title.toLowerCase().includes(lowerSearch) ||
          v.category.toLowerCase().includes(lowerSearch) ||
          v.description.toLowerCase().includes(lowerSearch)
      );
    if (activeCategory !== null)
      return videos.filter((v) => v.category === activeCategory);
    return []; // no selection → no videos
  })();

  // FAQ search results
  const matchedFaqs = lowerSearch
    ? faqs.filter(
        (f) =>
          f.question.toLowerCase().includes(lowerSearch) ||
          f.answer.toLowerCase().includes(lowerSearch) ||
          f.category.toLowerCase().includes(lowerSearch)
      )
    : [];

  function selectCategory(cat: string) {
    // Clicking the active category deselects it (back to "no selection")
    setActiveCategory((prev) => (prev === cat ? null : cat));
    setSearch("");
    setPlayingId(null);
    Object.values(videoRefs.current).forEach((el) => el?.pause());
  }

  function handlePlay(id: number) {
    if (playingId !== null && playingId !== id) {
      videoRefs.current[playingId]?.pause();
    }
    setPlayingId(id);
  }

  const nothingSelected = !lowerSearch && activeCategory === null;

  return (
    <main className="min-h-screen bg-slate-100 px-4 py-8 text-slate-900 md:px-6 md:py-10">
      <section className="mx-auto max-w-7xl space-y-6">

        {/* ── Header ── */}
        <div className="rounded-3xl bg-white p-5 shadow-sm md:p-8">
          <p className="text-sm text-slate-400">客户中心 / 使用教程</p>
          <h1 className="mt-4 text-2xl font-bold text-blue-700 md:mt-5 md:text-3xl">
            有鹿机器人使用教程
          </h1>
          <p className="mt-3 text-sm leading-7 text-slate-500 md:text-base">
            请选择教程分类，或使用搜索查找具体视频。
          </p>

          {/* Search */}
          <div className="mt-5 flex items-center gap-2">
            <input
              value={search}
              onChange={(e) => { setSearch(e.target.value); setActiveCategory(null); }}
              placeholder="搜索视频标题、分类或关键词..."
              className="flex-1 rounded-xl border border-slate-200 px-4 py-3 text-sm outline-none focus:border-blue-500"
            />
            {search && (
              <button
                onClick={() => setSearch("")}
                className="rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm font-bold text-slate-500"
              >
                清除
              </button>
            )}
          </div>

          {/* Hot keywords */}
          <div className="mt-3 flex flex-wrap items-center gap-2">
            <span className="text-xs text-slate-400">热门：</span>
            {HOT_WORDS.map((word) => (
              <button
                key={word}
                onClick={() => { setSearch(word); setActiveCategory(null); }}
                className={`rounded-full border px-3 py-1 text-xs font-bold transition ${
                  search === word
                    ? "border-blue-500 bg-blue-50 text-blue-600"
                    : "border-slate-200 bg-white text-slate-600 hover:border-blue-300 hover:text-blue-600"
                }`}
              >
                {word}
              </button>
            ))}
          </div>

          <div className="mt-5 flex flex-wrap gap-3">
            <a href="/" className="rounded-xl bg-blue-600 px-5 py-2.5 text-sm font-bold text-white">
              返回首页
            </a>
            <a href="/tickets" className="rounded-xl border border-blue-200 bg-white px-5 py-2.5 text-sm font-bold text-blue-600">
              提交工单
            </a>
            <button onClick={loadData} className="rounded-xl border border-slate-200 bg-white px-5 py-2.5 text-sm font-bold text-slate-700">
              刷新
            </button>
          </div>
        </div>

        {/* ── Category cards ── */}
        <div className="rounded-3xl bg-white p-5 shadow-sm md:p-6">
          <h2 className="text-base font-bold text-slate-700 md:text-lg">
            选择教程分类{activeCategory && (
              <span className="ml-2 text-sm font-normal text-slate-400">
                — 已选：<span className="font-bold text-blue-600">{activeCategory}</span>
              </span>
            )}
          </h2>

          {/* Primary cards (with detail page links) */}
          <div className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-6">
            {PRIMARY_CARDS.map((card) => {
              const isActive = activeCategory === card.dbCategory && !lowerSearch;
              const count = videos.filter((v) => v.category === card.dbCategory).length;
              return (
                <div
                  key={card.dbCategory}
                  onClick={() => selectCategory(card.dbCategory)}
                  className={`relative cursor-pointer rounded-2xl border p-3 text-center transition hover:-translate-y-0.5 hover:shadow-sm md:p-4 ${
                    isActive
                      ? "border-blue-500 bg-blue-50 shadow-sm"
                      : "border-slate-200 bg-slate-50 hover:border-blue-300"
                  }`}
                >
                  <p className={`text-sm font-bold md:text-base ${isActive ? "text-blue-700" : "text-slate-800"}`}>
                    {card.title}
                  </p>
                  {count > 0 && (
                    <p className={`mt-1 text-xs ${isActive ? "text-blue-500" : "text-slate-400"}`}>
                      {count} 个视频
                    </p>
                  )}
                  <a
                    href={card.href}
                    onClick={(e) => e.stopPropagation()}
                    className={`mt-2 block text-xs font-bold ${
                      isActive ? "text-blue-600" : "text-slate-400 hover:text-blue-500"
                    }`}
                  >
                    查看步骤 →
                  </a>
                </div>
              );
            })}
          </div>

          {/* Extra DB-only categories as pills */}
          {dbOnlyCategories.length > 0 && (
            <div className="mt-4 flex flex-wrap gap-2">
              <span className="self-center text-xs text-slate-400">更多分类：</span>
              {dbOnlyCategories.map((cat) => {
                const isActive = activeCategory === cat && !lowerSearch;
                const count = videos.filter((v) => v.category === cat).length;
                return (
                  <button
                    key={cat}
                    onClick={() => selectCategory(cat)}
                    className={`rounded-full border px-3 py-1.5 text-xs font-bold transition ${
                      isActive
                        ? "border-blue-500 bg-blue-50 text-blue-600"
                        : "border-slate-200 bg-white text-slate-600 hover:border-blue-300"
                    }`}
                  >
                    {cat}{count > 0 && <span className="ml-1 opacity-60">({count})</span>}
                  </button>
                );
              })}
            </div>
          )}
        </div>

        {/* ── FAQ search results ── */}
        {lowerSearch && matchedFaqs.length > 0 && (
          <div className="rounded-3xl bg-white p-5 shadow-sm md:p-6">
            <h2 className="text-base font-bold text-slate-900 md:text-lg">
              常见问题匹配（{matchedFaqs.length} 项）
            </h2>
            <div className="mt-4 space-y-3">
              {matchedFaqs.map((faq) => (
                <details key={faq.id} className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
                  <summary className="cursor-pointer list-none">
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <span className="rounded-full bg-blue-50 px-2 py-0.5 text-xs font-bold text-blue-600">
                          {faq.category}
                        </span>
                        <p className="mt-2 text-sm font-bold text-slate-900">{faq.question}</p>
                      </div>
                      <span className="shrink-0 rounded-full bg-slate-100 px-3 py-1 text-xs font-bold text-slate-500">
                        展开
                      </span>
                    </div>
                  </summary>
                  <p className="mt-3 text-sm leading-6 text-slate-600">{faq.answer}</p>
                  <a href="/faq" className="mt-2 inline-block text-xs font-bold text-blue-600">
                    查看全部 FAQ →
                  </a>
                </details>
              ))}
            </div>
          </div>
        )}

        {/* ── Video list ── */}
        <div className="rounded-3xl bg-white p-5 shadow-sm md:p-6">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <h2 className="text-base font-bold text-slate-900 md:text-xl">
              {lowerSearch
                ? `搜索结果：${displayVideos.length} 个视频`
                : activeCategory !== null
                ? `${activeCategory}（${displayVideos.length} 个视频）`
                : "视频教程"}
            </h2>

            {/* Category filter dropdown */}
            <select
              value={lowerSearch ? "" : (activeCategory ?? "")}
              onChange={(e) => {
                const val = e.target.value;
                setSearch("");
                setActiveCategory(val === "" ? null : val);
                setPlayingId(null);
                Object.values(videoRefs.current).forEach((el) => el?.pause());
              }}
              className="rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm font-bold text-slate-700"
            >
              <option value="">全部分类</option>
              {allCategories.map((c) => (
                <option key={c} value={c}>{c}</option>
              ))}
            </select>
          </div>

          <div className="mt-5">
            {loading ? (
              <div className="py-12 text-center">
                <p className="text-sm text-slate-400">正在加载视频...</p>
              </div>
            ) : nothingSelected ? (
              /* Default state: no category selected */
              <div className="rounded-2xl border border-dashed border-slate-200 py-16 text-center">
                <p className="text-4xl">👆</p>
                <p className="mt-4 font-bold text-slate-700">请先选择上方的教程分类</p>
                <p className="mt-2 text-sm text-slate-400">
                  点击分类卡片查看该分类下的教学视频，或使用搜索框搜索关键词
                </p>
              </div>
            ) : displayVideos.length === 0 ? (
              <div className="rounded-2xl border border-dashed border-slate-300 py-16 text-center">
                <p className="font-bold text-slate-700">
                  {lowerSearch ? `未找到与「${search}」相关的视频` : "该分类暂无视频"}
                </p>
                <p className="mt-2 text-sm text-slate-400">
                  {lowerSearch ? "请尝试其他关键词。" : "请联系管理员添加视频。"}
                </p>
              </div>
            ) : (
              <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                {displayVideos.map((video) => (
                  <div key={video.id} className="relative">
                    <VideoCard
                      video={video}
                      isPlaying={playingId === video.id}
                      onPlay={() => handlePlay(video.id)}
                      videoRef={(el) => { videoRefs.current[video.id] = el; }}
                    />
                    {isAdmin && (
                      <button
                        onClick={() => adminDeleteVideo(video.id, video.title)}
                        disabled={deletingId === video.id}
                        className="absolute right-2 top-2 z-10 rounded-lg bg-red-600 px-2 py-1 text-xs font-bold text-white opacity-80 hover:opacity-100 disabled:opacity-40"
                        title="管理员删除"
                      >
                        {deletingId === video.id ? "删除中" : "🗑️"}
                      </button>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* No results at all (search) */}
        {lowerSearch && !loading && displayVideos.length === 0 && matchedFaqs.length === 0 && (
          <div className="rounded-3xl bg-white p-8 text-center shadow-sm">
            <p className="font-bold text-slate-700">未找到与「{search}」相关的内容</p>
            <p className="mt-2 text-sm text-slate-500">
              请尝试其他关键词，或{" "}
              <a href="/tickets" className="font-bold text-blue-600">提交工单</a>
              {" "}联系售后。
            </p>
          </div>
        )}

      </section>
    </main>
  );
}

// ── Video Card component ──────────────────────────────────────────────────────

type VideoCardProps = {
  video: Video;
  isPlaying: boolean;
  onPlay: () => void;
  videoRef: (el: HTMLVideoElement | null) => void;
};

function VideoCard({ video, onPlay, videoRef }: VideoCardProps) {
  const [expanded, setExpanded] = useState(false);

  function handlePlayClick() {
    setExpanded(true);
    onPlay();
  }

  return (
    <div className="group overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm transition hover:shadow-md">
      <div className="relative bg-slate-900">
        {expanded ? (
          <video
            ref={videoRef}
            src={video.fileUrl}
            controls
            autoPlay
            preload="none"
            className="aspect-video w-full"
            onPlay={onPlay}
          />
        ) : (
          /* Thumbnail: no video tag → zero network load until user clicks */
          <div className="relative aspect-video flex items-center justify-center bg-slate-800">
            <video ref={videoRef} preload="none" className="hidden" />
            <button
              onClick={handlePlayClick}
              className="absolute inset-0 flex flex-col items-center justify-center gap-3 transition hover:bg-white/5"
            >
              <span className="flex h-14 w-14 items-center justify-center rounded-full bg-white/90 text-blue-600 shadow-lg transition group-hover:scale-110">
                <svg className="ml-1 h-6 w-6" fill="currentColor" viewBox="0 0 24 24">
                  <path d="M8 5v14l11-7z" />
                </svg>
              </span>
              <span className="text-xs font-bold text-white/80 drop-shadow">点击播放</span>
            </button>
          </div>
        )}
      </div>

      <div className="p-4">
        <div className="flex items-center gap-2">
          <span className="rounded-full bg-blue-50 px-2.5 py-1 text-xs font-bold text-blue-600">
            {video.category}
          </span>
          {video.description && video.description !== video.category && (
            <span className="text-xs text-slate-400">{video.description}</span>
          )}
        </div>
        <h3 className="mt-2 text-sm font-bold leading-snug text-slate-900 md:text-base">
          {video.title}
        </h3>
      </div>
    </div>
  );
}
