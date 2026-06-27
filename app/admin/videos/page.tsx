"use client";

import { useEffect, useRef, useState } from "react";

type Video = {
  id: number;
  title: string;
  category: string;
  fileUrl: string;
  description: string;
  showOnHome: boolean;
  createdAt: string;
};

// Default categories always shown (even if no videos exist yet)
const DEFAULT_CATEGORIES = [
  "产品视频",
  "开机部署",
  "充电操作",
  "加水操作",
  "倾倒垃圾",
  "任务下发",
  "返航操作",
];

export default function AdminVideosPage() {
  const [checkedLogin, setCheckedLogin] = useState(false);
  const [videos, setVideos] = useState<Video[]>([]);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [uploadResult, setUploadResult] = useState<{ success: boolean; message: string } | null>(null);
  const [deletingId, setDeletingId] = useState<number | null>(null);

  const [form, setForm] = useState({ title: "", category: "", description: "" });
  const fileRef = useRef<HTMLInputElement>(null);

  // Custom categories added this session (persist to localStorage)
  const [customCategories, setCustomCategories] = useState<string[]>([]);
  const [newCategoryInput, setNewCategoryInput] = useState("");

  // All available categories: defaults + DB + custom
  const dbCategories = Array.from(new Set(videos.map((v) => v.category).filter(Boolean)));
  const allCategories = Array.from(
    new Set([...DEFAULT_CATEGORIES, ...dbCategories, ...customCategories])
  ).sort();

  async function loadVideos() {
    setLoading(true);
    try {
      const res = await fetch("/api/videos");
      const r = await res.json();
      if (r.success) setVideos(r.data);
    } catch (e) { console.error(e); }
    setLoading(false);
  }

  useEffect(() => {
    const userText = localStorage.getItem("youlu_user");
    if (!userText) { window.location.href = "/login"; return; }
    const user = JSON.parse(userText);
    if (user.role !== "admin") { window.location.href = "/unauthorized"; return; }
    setCheckedLogin(true);
    loadVideos();
    // Restore custom categories from localStorage
    try {
      const saved = JSON.parse(localStorage.getItem("youlu_video_categories") || "[]");
      if (Array.isArray(saved)) setCustomCategories(saved);
    } catch {}
  }, []);

  function addCustomCategory() {
    const name = newCategoryInput.trim();
    if (!name || allCategories.includes(name)) {
      setNewCategoryInput("");
      return;
    }
    const updated = [...customCategories, name];
    setCustomCategories(updated);
    localStorage.setItem("youlu_video_categories", JSON.stringify(updated));
    setNewCategoryInput("");
  }

  function removeCustomCategory(name: string) {
    const updated = customCategories.filter((c) => c !== name);
    setCustomCategories(updated);
    localStorage.setItem("youlu_video_categories", JSON.stringify(updated));
  }

  // ── Upload via server-side API ────────────────────────────────────────────
  async function uploadVideo() {
    const file = fileRef.current?.files?.[0];
    if (!form.title.trim()) { alert("请填写视频标题"); return; }
    if (!file)               { alert("请选择要上传的视频文件"); return; }

    setUploading(true);
    setUploadResult(null);

    const data = new FormData();
    data.append("title",       form.title);
    data.append("category",    form.category || "未分类");
    data.append("description", form.description);
    data.append("file",        file);

    try {
      const res    = await fetch("/api/videos/upload", { method: "POST", body: data });
      const result = await res.json();
      if (result.success) {
        setUploadResult({ success: true, message: "视频上传成功！" });
        setForm({ title: "", category: "", description: "" });
        if (fileRef.current) fileRef.current.value = "";
        await loadVideos();
      } else {
        setUploadResult({ success: false, message: result.message || "上传失败" });
      }
    } catch (e) {
      const msg = e instanceof Error ? e.message : String(e);
      setUploadResult({ success: false, message: `上传失败：${msg}` });
    }
    setUploading(false);
  }

  // ── Toggle showOnHome ─────────────────────────────────────────────────────
  async function toggleShowOnHome(id: number, value: boolean) {
    // Optimistic update
    setVideos((prev) => prev.map((v) => v.id === id ? { ...v, showOnHome: value } : v));
    try {
      const res = await fetch(`/api/videos/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ showOnHome: value }),
      });
      const r = await res.json();
      if (!r.success) {
        // Revert on failure
        setVideos((prev) => prev.map((v) => v.id === id ? { ...v, showOnHome: !value } : v));
        alert(`操作失败：${r.message}`);
      }
    } catch {
      setVideos((prev) => prev.map((v) => v.id === id ? { ...v, showOnHome: !value } : v));
      alert("操作失败，请检查网络");
    }
  }

  // ── Delete video (DB + OSS) ────────────────────────────────────────────────
  async function deleteVideo(id: number, title: string) {
    if (!confirm(`确认删除视频「${title}」？\n\n将同时删除数据库记录和 OSS 文件，无法恢复。`)) return;
    setDeletingId(id);
    try {
      const res = await fetch(`/api/videos/${id}`, { method: "DELETE" });
      const r   = await res.json();
      if (r.success) await loadVideos();
      else alert(`删除失败：${r.message}`);
    } catch { alert("删除失败，请检查网络连接"); }
    setDeletingId(null);
  }

  if (!checkedLogin) {
    return (
      <main className="min-h-screen bg-slate-100 px-4 py-8">
        <section className="mx-auto max-w-4xl rounded-3xl bg-white p-8 shadow-sm">
          <p className="text-slate-400">正在验证管理员权限...</p>
        </section>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-slate-100 px-4 py-8 text-slate-900 md:px-6 md:py-10">
      <section className="mx-auto max-w-5xl space-y-6">

        {/* Header */}
        <div className="rounded-3xl bg-white p-5 shadow-sm md:p-8">
          <p className="text-sm text-slate-400">后台管理 / 视频素材管理</p>
          <h1 className="mt-4 text-2xl font-bold text-blue-700 md:text-3xl">视频素材管理</h1>
          <p className="mt-2 text-sm text-slate-500">
            上传视频后立即在教程页显示。删除将同时清除 OSS 文件。
          </p>
          <div className="mt-5 flex flex-wrap gap-3">
            <a href="/admin" className="rounded-xl border border-slate-200 bg-white px-5 py-2.5 text-sm font-bold text-slate-700">
              返回后台
            </a>
            <a href="/tutorials" target="_blank" className="rounded-xl border border-blue-200 bg-white px-5 py-2.5 text-sm font-bold text-blue-600">
              预览教程页
            </a>
          </div>
        </div>

        {/* Category management */}
        <div className="rounded-3xl bg-white p-5 shadow-sm md:p-6">
          <h2 className="text-lg font-bold text-slate-900">分类管理</h2>
          <p className="mt-1 text-xs text-slate-400">
            新增分类后自动出现在上传表单和前台分类导航中。
            默认分类（灰色）不可删除，自定义分类（蓝色×）可删除。
          </p>

          <div className="mt-4 flex flex-wrap gap-2">
            {DEFAULT_CATEGORIES.map((cat) => (
              <span key={cat}
                className={`rounded-full px-3 py-1.5 text-xs font-bold ${
                  cat === "产品视频"
                    ? "bg-orange-50 text-orange-600"
                    : "bg-slate-100 text-slate-600"
                }`}>
                {cat}
                {cat === "产品视频" && <span className="ml-1 text-orange-400">★首页</span>}
              </span>
            ))}
            {customCategories.map((cat) => (
              <span key={cat} className="flex items-center gap-1 rounded-full bg-blue-50 px-3 py-1.5 text-xs font-bold text-blue-700">
                {cat}
                <button onClick={() => removeCustomCategory(cat)}
                  className="ml-0.5 text-blue-400 hover:text-red-500">×</button>
              </span>
            ))}
            {dbCategories.filter((c) => !DEFAULT_CATEGORIES.includes(c) && !customCategories.includes(c)).map((cat) => (
              <span key={cat} className="rounded-full bg-green-50 px-3 py-1.5 text-xs font-bold text-green-700">
                {cat} <span className="text-green-400">（已使用）</span>
              </span>
            ))}
          </div>

          {/* Add new category */}
          <div className="mt-4 flex gap-2">
            <input
              value={newCategoryInput}
              onChange={(e) => setNewCategoryInput(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && addCustomCategory()}
              placeholder="输入新分类名称..."
              className="flex-1 rounded-xl border border-slate-200 px-4 py-2.5 text-sm outline-none focus:border-blue-500"
            />
            <button
              onClick={addCustomCategory}
              disabled={!newCategoryInput.trim() || allCategories.includes(newCategoryInput.trim())}
              className="rounded-xl bg-blue-600 px-4 py-2.5 text-sm font-bold text-white disabled:bg-slate-300"
            >
              + 新增分类
            </button>
          </div>
        </div>

        {/* Upload form */}
        <div className="rounded-3xl bg-white p-5 shadow-sm md:p-8">
          <h2 className="text-lg font-bold text-slate-900 md:text-xl">上传新视频</h2>

          {uploadResult && (
            <div className={`mt-5 rounded-2xl p-4 ${uploadResult.success ? "bg-green-50 text-green-700" : "bg-red-50 text-red-700"}`}>
              <p className="text-sm font-bold">{uploadResult.success ? "✅ " : "❌ "}{uploadResult.message}</p>
            </div>
          )}

          <div className="mt-6 grid gap-5 md:grid-cols-2">
            <div>
              <label className="text-sm font-bold text-slate-700">视频标题 *</label>
              <input value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })}
                placeholder="例如：开机操作教程"
                className="mt-2 w-full rounded-xl border border-slate-200 px-4 py-3 text-sm outline-none focus:border-blue-500" />
            </div>

            <div>
              <label className="text-sm font-bold text-slate-700">分类</label>
              {/* datalist combo: select existing or type new */}
              <input
                list="video-categories-list"
                value={form.category}
                onChange={(e) => setForm({ ...form, category: e.target.value })}
                placeholder="选择或输入分类..."
                className="mt-2 w-full rounded-xl border border-slate-200 px-4 py-3 text-sm outline-none focus:border-blue-500"
              />
              <datalist id="video-categories-list">
                {allCategories.map((cat) => (
                  <option key={cat} value={cat} />
                ))}
              </datalist>
              <p className="mt-1 text-xs text-slate-400">
                可从现有分类选择，或直接输入新分类名称
              </p>
            </div>

            <div className="md:col-span-2">
              <label className="text-sm font-bold text-slate-700">描述（可选）</label>
              <input value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })}
                placeholder="简短描述视频内容..."
                className="mt-2 w-full rounded-xl border border-slate-200 px-4 py-3 text-sm outline-none focus:border-blue-500" />
            </div>

            <div className="md:col-span-2">
              <label className="text-sm font-bold text-slate-700">选择视频文件</label>
              <p className="mt-1 text-xs text-slate-400">支持 mp4、mov、avi 等格式，手机可从相册选择</p>
              <input ref={fileRef} type="file"
                accept="video/mp4,video/quicktime,video/avi,video/x-msvideo,video/webm,video/3gpp,video/3gpp2,video/*,.mp4,.mov,.avi,.webm,.3gp"
                className="mt-2 w-full rounded-xl border border-slate-200 px-4 py-3 text-sm text-slate-700 file:mr-4 file:rounded-lg file:border-0 file:bg-blue-50 file:px-4 file:py-2 file:font-bold file:text-blue-600" />
            </div>
          </div>

          <div className="mt-5">
            <button onClick={uploadVideo} disabled={uploading}
              className="rounded-xl bg-blue-600 px-6 py-3 text-sm font-bold text-white disabled:bg-slate-400">
              {uploading ? "上传中（请勿关闭页面）..." : "上传视频"}
            </button>
          </div>
        </div>

        {/* Video list grouped by category */}
        <div className="rounded-3xl bg-white p-5 shadow-sm md:p-6">
          <div className="flex items-center justify-between gap-4">
            <div>
              <h2 className="text-lg font-bold text-slate-900 md:text-xl">全部视频（{videos.length} 条）</h2>
              <p className="mt-1 text-xs text-slate-400">
                共 {Array.from(new Set(videos.map((v) => v.category))).length} 个分类
              </p>
            </div>
            <button onClick={loadVideos} className="rounded-xl border border-blue-200 bg-white px-4 py-2 text-sm font-bold text-blue-600">
              刷新
            </button>
          </div>

          {loading ? (
            <p className="mt-6 text-sm text-slate-400">正在加载视频...</p>
          ) : videos.length === 0 ? (
            <div className="mt-6 rounded-2xl border border-dashed border-slate-300 p-10 text-center">
              <p className="font-bold text-slate-600">暂无视频</p>
            </div>
          ) : (
            <div className="mt-5 space-y-3">
              {videos.map((video) => (
                <div key={video.id} className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex-1 min-w-0">
                      <div className="flex flex-wrap items-center gap-2">
                        <span className={`rounded-full px-3 py-1 text-xs font-bold ${
                          video.category === "产品视频" || video.category === "产品介绍"
                            ? "bg-orange-50 text-orange-600"
                            : "bg-blue-50 text-blue-600"
                        }`}>
                          {video.category || "未分类"}
                        </span>
                        <span className="text-xs text-slate-400">{new Date(video.createdAt).toLocaleString()}</span>
                      </div>
                      <p className="mt-2 font-bold text-slate-900">{video.title}</p>
                      {video.description && <p className="mt-1 text-xs text-slate-500">{video.description}</p>}
                      <p className="mt-1 truncate text-xs text-slate-400">{video.fileUrl}</p>
                    </div>

                    <div className="flex shrink-0 flex-col items-end gap-2">
                      {/* Home toggle */}
                      <div className="flex items-center gap-2">
                        <span className={`text-xs font-bold ${video.showOnHome ? "text-blue-600" : "text-slate-400"}`}>
                          {video.showOnHome ? "首页展示中" : "不展示"}
                        </span>
                        <button
                          onClick={() => toggleShowOnHome(video.id, !video.showOnHome)}
                          className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                            video.showOnHome ? "bg-blue-600" : "bg-slate-200"
                          }`}
                          title={video.showOnHome ? "点击关闭首页展示" : "点击开启首页展示"}
                        >
                          <span className={`inline-block h-4 w-4 transform rounded-full bg-white shadow transition-transform ${
                            video.showOnHome ? "translate-x-6" : "translate-x-1"
                          }`} />
                        </button>
                      </div>

                      <div className="flex gap-1.5">
                        <a href={video.fileUrl} target="_blank" rel="noopener noreferrer"
                          className="rounded-xl border border-slate-200 bg-white px-3 py-2 text-center text-xs font-bold text-slate-700">
                          预览
                        </a>
                        <button
                          onClick={() => deleteVideo(video.id, video.title)}
                          disabled={deletingId === video.id}
                          className="rounded-xl border border-red-200 bg-white px-3 py-2 text-xs font-bold text-red-600 hover:bg-red-50 disabled:opacity-50"
                          title="删除视频（同时删除OSS文件）"
                        >
                          {deletingId === video.id ? "..." : "🗑️"}
                        </button>
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </section>
    </main>
  );
}
