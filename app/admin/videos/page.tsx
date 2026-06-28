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

const DEFAULT_CATEGORIES = [
  "产品视频", "开机部署", "充电操作", "加水操作", "倾倒垃圾", "任务下发", "返航操作",
];

/** Extract a human-readable title from an OSS URL filename */
function titleFromUrl(url: string): string {
  try {
    const pathname = new URL(url).pathname;
    const filename = pathname.split("/").pop() ?? "";
    return filename
      .replace(/\.[^.]+$/, "")           // remove extension
      .replace(/^\d{13}-?/, "")           // remove timestamp prefix
      .replace(/[_-]+/g, " ")             // underscores/dashes → space
      .replace(/\s+/g, " ")
      .trim()
      || filename.replace(/\.[^.]+$/, ""); // fallback: filename without ext
  } catch {
    return url.split("/").pop()?.replace(/\.[^.]+$/, "") ?? "未命名视频";
  }
}

type UploadMode = "file" | "url" | "batch";

type BatchItem = { url: string; title: string; selected: boolean };

export default function AdminVideosPage() {
  const [checkedLogin, setCheckedLogin] = useState(false);
  const [videos, setVideos] = useState<Video[]>([]);
  const [loading, setLoading] = useState(true);
  const [uploadMode, setUploadMode] = useState<UploadMode>("file");
  const [resultMsg, setResultMsg] = useState<{ ok: boolean; text: string } | null>(null);
  const [deletingId, setDeletingId] = useState<number | null>(null);

  // ── Mode A: File upload ────────────────────────────────────────────────────
  const [fileForm, setFileForm] = useState({ title: "", category: "", description: "" });
  const [uploading, setUploading] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);

  // ── Mode B: URL input ──────────────────────────────────────────────────────
  const [urlForm, setUrlForm] = useState({ url: "", title: "", category: "", description: "" });
  const [savingUrl, setSavingUrl] = useState(false);

  // ── Mode C: Batch import ───────────────────────────────────────────────────
  const [batchText, setBatchText] = useState("");
  const [batchCategory, setBatchCategory] = useState("");
  const [batchItems, setBatchItems] = useState<BatchItem[]>([]);
  const [savingBatch, setSavingBatch] = useState(false);
  const [batchParsed, setBatchParsed] = useState(false);

  // ── Category management ────────────────────────────────────────────────────
  const [customCategories, setCustomCategories] = useState<string[]>([]);
  const [newCategoryInput, setNewCategoryInput] = useState("");

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
    try {
      const saved = JSON.parse(localStorage.getItem("youlu_video_categories") || "[]");
      if (Array.isArray(saved)) setCustomCategories(saved);
    } catch {}
  }, []);

  function addCustomCategory() {
    const name = newCategoryInput.trim();
    if (!name || allCategories.includes(name)) { setNewCategoryInput(""); return; }
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

  // ── Mode A: File upload ────────────────────────────────────────────────────
  async function uploadFile() {
    const file = fileRef.current?.files?.[0];
    if (!fileForm.title.trim()) { alert("请填写视频标题"); return; }
    if (!file) { alert("请选择要上传的视频文件"); return; }
    setUploading(true);
    setResultMsg(null);
    const data = new FormData();
    data.append("title",       fileForm.title);
    data.append("category",    fileForm.category || "未分类");
    data.append("description", fileForm.description);
    data.append("file",        file);
    try {
      const res = await fetch("/api/videos/upload", { method: "POST", body: data });
      const r   = await res.json();
      if (r.success) {
        setResultMsg({ ok: true, text: "视频上传成功！" });
        setFileForm({ title: "", category: "", description: "" });
        if (fileRef.current) fileRef.current.value = "";
        await loadVideos();
      } else {
        setResultMsg({ ok: false, text: r.message || "上传失败" });
      }
    } catch (e) {
      setResultMsg({ ok: false, text: `上传失败：${e instanceof Error ? e.message : String(e)}` });
    }
    setUploading(false);
  }

  // ── Mode B: Save URL ───────────────────────────────────────────────────────
  function autoFillTitle() {
    if (urlForm.url.trim() && !urlForm.title.trim()) {
      setUrlForm((f) => ({ ...f, title: titleFromUrl(f.url) }));
    }
  }

  async function saveUrl() {
    if (!urlForm.url.trim())   { alert("请输入视频 URL"); return; }
    if (!urlForm.title.trim()) { alert("请填写视频标题"); return; }
    setSavingUrl(true);
    setResultMsg(null);
    try {
      const res = await fetch("/api/videos", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title:       urlForm.title.trim(),
          category:    urlForm.category || "未分类",
          fileUrl:     urlForm.url.trim(),
          description: urlForm.description.trim(),
        }),
      });
      const r = await res.json();
      if (r.success) {
        setResultMsg({ ok: true, text: "视频保存成功！" });
        setUrlForm({ url: "", title: "", category: "", description: "" });
        await loadVideos();
      } else {
        setResultMsg({ ok: false, text: r.message || "保存失败" });
      }
    } catch (e) {
      setResultMsg({ ok: false, text: `保存失败：${e instanceof Error ? e.message : String(e)}` });
    }
    setSavingUrl(false);
  }

  // ── Mode C: Batch parse + import ───────────────────────────────────────────
  function parseBatchUrls() {
    const lines = batchText.split("\n").map((l) => l.trim()).filter(Boolean);
    const items: BatchItem[] = lines.map((url) => ({
      url,
      title: titleFromUrl(url),
      selected: true,
    }));
    setBatchItems(items);
    setBatchParsed(true);
    setResultMsg(null);
  }

  function updateBatchItem(idx: number, field: "title" | "selected", value: string | boolean) {
    setBatchItems((prev) =>
      prev.map((item, i) => i === idx ? { ...item, [field]: value } : item)
    );
  }

  async function saveBatch() {
    const selected = batchItems.filter((i) => i.selected && i.url.trim() && i.title.trim());
    if (selected.length === 0) { alert("请至少选择一个有效的视频条目"); return; }
    setSavingBatch(true);
    setResultMsg(null);
    try {
      const res = await fetch("/api/videos/batch", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          videos: selected.map((i) => ({
            title:    i.title,
            category: batchCategory || "未分类",
            fileUrl:  i.url,
          })),
        }),
      });
      const r = await res.json();
      if (r.success) {
        setResultMsg({ ok: true, text: r.message });
        setBatchText("");
        setBatchItems([]);
        setBatchParsed(false);
        setBatchCategory("");
        await loadVideos();
      } else {
        setResultMsg({ ok: false, text: r.message || "导入失败" });
      }
    } catch (e) {
      setResultMsg({ ok: false, text: `导入失败：${e instanceof Error ? e.message : String(e)}` });
    }
    setSavingBatch(false);
  }

  // ── Toggle showOnHome ─────────────────────────────────────────────────────
  async function toggleShowOnHome(id: number, value: boolean) {
    setVideos((prev) => prev.map((v) => v.id === id ? { ...v, showOnHome: value } : v));
    try {
      const res = await fetch(`/api/videos/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ showOnHome: value }),
      });
      const r = await res.json();
      if (!r.success) {
        setVideos((prev) => prev.map((v) => v.id === id ? { ...v, showOnHome: !value } : v));
        alert(`操作失败：${r.message}`);
      }
    } catch {
      setVideos((prev) => prev.map((v) => v.id === id ? { ...v, showOnHome: !value } : v));
    }
  }

  // ── Delete ────────────────────────────────────────────────────────────────
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

  const CategoryCombo = ({ value, onChange }: { value: string; onChange: (v: string) => void }) => (
    <>
      <input
        list="video-categories-list"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder="选择或输入分类..."
        className="mt-2 w-full rounded-xl border border-slate-200 px-4 py-3 text-sm outline-none focus:border-blue-500"
      />
      <datalist id="video-categories-list">
        {allCategories.map((c) => <option key={c} value={c} />)}
      </datalist>
    </>
  );

  return (
    <main className="min-h-screen bg-slate-100 px-4 py-8 text-slate-900 md:px-6 md:py-10">
      <section className="mx-auto max-w-5xl space-y-6">

        {/* Header */}
        <div className="rounded-3xl bg-white p-5 shadow-sm md:p-8">
          <p className="text-sm text-slate-400">后台管理 / 视频素材管理</p>
          <h1 className="mt-4 text-2xl font-bold text-blue-700 md:text-3xl">视频素材管理</h1>
          <p className="mt-2 text-sm text-slate-500">
            支持文件上传、直接填URL、或批量导入 OSS 视频。
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
          <p className="mt-1 text-xs text-slate-400">新增分类后自动出现在上传表单和前台分类导航中。</p>
          <div className="mt-4 flex flex-wrap gap-2">
            {DEFAULT_CATEGORIES.map((cat) => (
              <span key={cat} className={`rounded-full px-3 py-1.5 text-xs font-bold ${cat === "产品视频" ? "bg-orange-50 text-orange-600" : "bg-slate-100 text-slate-600"}`}>
                {cat}{cat === "产品视频" && <span className="ml-1 text-orange-400">★首页</span>}
              </span>
            ))}
            {customCategories.map((cat) => (
              <span key={cat} className="flex items-center gap-1 rounded-full bg-blue-50 px-3 py-1.5 text-xs font-bold text-blue-700">
                {cat}
                <button onClick={() => removeCustomCategory(cat)} className="ml-0.5 text-blue-400 hover:text-red-500">×</button>
              </span>
            ))}
            {dbCategories.filter((c) => !DEFAULT_CATEGORIES.includes(c) && !customCategories.includes(c)).map((cat) => (
              <span key={cat} className="rounded-full bg-green-50 px-3 py-1.5 text-xs font-bold text-green-700">
                {cat} <span className="text-green-400">（已使用）</span>
              </span>
            ))}
          </div>
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

        {/* ── Add video — mode tabs ── */}
        <div className="rounded-3xl bg-white p-5 shadow-sm md:p-8">
          {/* Tab switcher */}
          <div className="flex gap-1 rounded-2xl bg-slate-100 p-1">
            {(["file", "url", "batch"] as UploadMode[]).map((mode) => {
              const labels = { file: "📁 文件上传", url: "🔗 填入URL", batch: "📋 批量导入" };
              return (
                <button
                  key={mode}
                  onClick={() => { setUploadMode(mode); setResultMsg(null); }}
                  className={`flex-1 rounded-xl px-3 py-2 text-sm font-bold transition ${
                    uploadMode === mode ? "bg-white text-blue-700 shadow-sm" : "text-slate-500 hover:text-slate-700"
                  }`}
                >
                  {labels[mode]}
                </button>
              );
            })}
          </div>

          {/* Result message */}
          {resultMsg && (
            <div className={`mt-5 rounded-2xl p-4 ${resultMsg.ok ? "bg-green-50 text-green-700" : "bg-red-50 text-red-700"}`}>
              <p className="text-sm font-bold">{resultMsg.ok ? "✅ " : "❌ "}{resultMsg.text}</p>
            </div>
          )}

          {/* ── Mode A: File upload ── */}
          {uploadMode === "file" && (
            <div className="mt-6 space-y-4">
              <p className="text-xs text-slate-400">适合小文件（Vercel 免费版 ~4.5MB 限制），大文件请使用「填入URL」方式。</p>
              <div className="grid gap-4 md:grid-cols-2">
                <div>
                  <label className="text-sm font-bold text-slate-700">视频标题 *</label>
                  <input value={fileForm.title} onChange={(e) => setFileForm({ ...fileForm, title: e.target.value })}
                    placeholder="例如：开机操作教程"
                    className="mt-2 w-full rounded-xl border border-slate-200 px-4 py-3 text-sm outline-none focus:border-blue-500" />
                </div>
                <div>
                  <label className="text-sm font-bold text-slate-700">分类</label>
                  <CategoryCombo value={fileForm.category} onChange={(v) => setFileForm({ ...fileForm, category: v })} />
                </div>
                <div className="md:col-span-2">
                  <label className="text-sm font-bold text-slate-700">描述（可选）</label>
                  <input value={fileForm.description} onChange={(e) => setFileForm({ ...fileForm, description: e.target.value })}
                    placeholder="简短描述视频内容..."
                    className="mt-2 w-full rounded-xl border border-slate-200 px-4 py-3 text-sm outline-none focus:border-blue-500" />
                </div>
                <div className="md:col-span-2">
                  <label className="text-sm font-bold text-slate-700">选择视频文件</label>
                  <input ref={fileRef} type="file"
                    accept="video/mp4,video/quicktime,video/avi,video/x-msvideo,video/webm,video/3gpp,video/3gpp2,video/*,.mp4,.mov,.avi,.webm,.3gp"
                    className="mt-2 w-full rounded-xl border border-slate-200 px-4 py-3 text-sm text-slate-700 file:mr-4 file:rounded-lg file:border-0 file:bg-blue-50 file:px-4 file:py-2 file:font-bold file:text-blue-600" />
                </div>
              </div>
              <button onClick={uploadFile} disabled={uploading}
                className="rounded-xl bg-blue-600 px-6 py-3 text-sm font-bold text-white disabled:bg-slate-400">
                {uploading ? "上传中..." : "上传视频"}
              </button>
            </div>
          )}

          {/* ── Mode B: URL input ── */}
          {uploadMode === "url" && (
            <div className="mt-6 space-y-4">
              <p className="text-xs text-slate-400">
                适合大文件：在阿里云 OSS 控制台直接上传文件，再把 URL 粘贴到这里保存到数据库。
              </p>
              <div>
                <label className="text-sm font-bold text-slate-700">OSS 视频 URL *</label>
                <input
                  value={urlForm.url}
                  onChange={(e) => setUrlForm({ ...urlForm, url: e.target.value })}
                  onBlur={autoFillTitle}
                  placeholder="https://youlu-service-videos.oss-cn-hangzhou.aliyuncs.com/..."
                  className="mt-2 w-full rounded-xl border border-slate-200 px-4 py-3 text-sm outline-none focus:border-blue-500 font-mono"
                />
                <p className="mt-1 text-xs text-slate-400">粘贴 URL 后失去焦点会自动提取文件名作为标题</p>
              </div>
              <div className="grid gap-4 md:grid-cols-2">
                <div>
                  <label className="text-sm font-bold text-slate-700">视频标题 *</label>
                  <input value={urlForm.title} onChange={(e) => setUrlForm({ ...urlForm, title: e.target.value })}
                    placeholder="视频标题"
                    className="mt-2 w-full rounded-xl border border-slate-200 px-4 py-3 text-sm outline-none focus:border-blue-500" />
                </div>
                <div>
                  <label className="text-sm font-bold text-slate-700">分类</label>
                  <CategoryCombo value={urlForm.category} onChange={(v) => setUrlForm({ ...urlForm, category: v })} />
                </div>
                <div className="md:col-span-2">
                  <label className="text-sm font-bold text-slate-700">描述（可选）</label>
                  <input value={urlForm.description} onChange={(e) => setUrlForm({ ...urlForm, description: e.target.value })}
                    placeholder="简短描述..."
                    className="mt-2 w-full rounded-xl border border-slate-200 px-4 py-3 text-sm outline-none focus:border-blue-500" />
                </div>
              </div>
              <button onClick={saveUrl} disabled={savingUrl}
                className="rounded-xl bg-blue-600 px-6 py-3 text-sm font-bold text-white disabled:bg-slate-400">
                {savingUrl ? "保存中..." : "保存到数据库"}
              </button>
            </div>
          )}

          {/* ── Mode C: Batch import ── */}
          {uploadMode === "batch" && (
            <div className="mt-6 space-y-4">
              <p className="text-xs text-slate-400">
                一次粘贴多个 OSS URL（每行一个），系统自动提取文件名作为标题，统一选择分类后一键导入。
              </p>

              {!batchParsed ? (
                <>
                  <div>
                    <label className="text-sm font-bold text-slate-700">粘贴 OSS URL（每行一个）</label>
                    <textarea
                      value={batchText}
                      onChange={(e) => setBatchText(e.target.value)}
                      rows={8}
                      placeholder={"https://youlu-service-videos.oss-cn-hangzhou.aliyuncs.com/tutorials/video1.mp4\nhttps://youlu-service-videos.oss-cn-hangzhou.aliyuncs.com/tutorials/video2.mp4\n..."}
                      className="mt-2 w-full rounded-xl border border-slate-200 px-4 py-3 text-xs font-mono outline-none focus:border-blue-500"
                    />
                    <p className="mt-1 text-xs text-slate-400">
                      共 {batchText.split("\n").filter((l) => l.trim()).length} 行
                    </p>
                  </div>
                  <button
                    onClick={parseBatchUrls}
                    disabled={!batchText.trim()}
                    className="rounded-xl bg-blue-600 px-6 py-3 text-sm font-bold text-white disabled:bg-slate-300"
                  >
                    解析 URL → 预览
                  </button>
                </>
              ) : (
                <>
                  <div className="flex flex-wrap items-end gap-4">
                    <div className="flex-1 min-w-[200px]">
                      <label className="text-sm font-bold text-slate-700">统一分类（应用到所有选中视频）</label>
                      <CategoryCombo value={batchCategory} onChange={setBatchCategory} />
                    </div>
                    <div className="flex gap-2">
                      <button
                        onClick={() => setBatchItems((p) => p.map((i) => ({ ...i, selected: true })))}
                        className="rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-xs font-bold text-slate-700"
                      >
                        全选
                      </button>
                      <button
                        onClick={() => setBatchItems((p) => p.map((i) => ({ ...i, selected: false })))}
                        className="rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-xs font-bold text-slate-700"
                      >
                        全不选
                      </button>
                      <button
                        onClick={() => { setBatchParsed(false); setBatchItems([]); }}
                        className="rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-xs font-bold text-slate-500"
                      >
                        重新粘贴
                      </button>
                    </div>
                  </div>

                  {/* Preview list */}
                  <div className="space-y-2 max-h-80 overflow-y-auto rounded-2xl border border-slate-200 p-3">
                    {batchItems.map((item, idx) => (
                      <div key={idx} className={`flex items-center gap-3 rounded-xl p-3 ${item.selected ? "bg-blue-50" : "bg-slate-50 opacity-60"}`}>
                        <input
                          type="checkbox"
                          checked={item.selected}
                          onChange={(e) => updateBatchItem(idx, "selected", e.target.checked)}
                          className="h-4 w-4 shrink-0 rounded accent-blue-600"
                        />
                        <div className="flex-1 min-w-0">
                          <input
                            value={item.title}
                            onChange={(e) => updateBatchItem(idx, "title", e.target.value)}
                            className="w-full rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-xs outline-none focus:border-blue-400"
                          />
                          <p className="mt-1 truncate text-xs text-slate-400 font-mono">{item.url}</p>
                        </div>
                      </div>
                    ))}
                  </div>

                  <div className="flex items-center gap-3">
                    <button
                      onClick={saveBatch}
                      disabled={savingBatch || batchItems.filter((i) => i.selected).length === 0}
                      className="rounded-xl bg-blue-600 px-6 py-3 text-sm font-bold text-white disabled:bg-slate-400"
                    >
                      {savingBatch
                        ? "导入中..."
                        : `导入 ${batchItems.filter((i) => i.selected).length} 个视频`}
                    </button>
                    <span className="text-xs text-slate-400">
                      已选 {batchItems.filter((i) => i.selected).length} / {batchItems.length} 个
                    </span>
                  </div>
                </>
              )}
            </div>
          )}
        </div>

        {/* Video list */}
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
                            ? "bg-orange-50 text-orange-600" : "bg-blue-50 text-blue-600"
                        }`}>
                          {video.category || "未分类"}
                        </span>
                        {video.showOnHome && (
                          <span className="rounded-full bg-yellow-50 px-2 py-0.5 text-xs font-bold text-yellow-600">★首页</span>
                        )}
                        <span className="text-xs text-slate-400">{new Date(video.createdAt).toLocaleString()}</span>
                      </div>
                      <p className="mt-2 font-bold text-slate-900">{video.title}</p>
                      {video.description && <p className="mt-1 text-xs text-slate-500">{video.description}</p>}
                      <p className="mt-1 truncate text-xs text-slate-400">{video.fileUrl}</p>
                    </div>

                    <div className="flex shrink-0 flex-col items-end gap-2">
                      <div className="flex items-center gap-2">
                        <span className={`text-xs font-bold ${video.showOnHome ? "text-blue-600" : "text-slate-400"}`}>
                          {video.showOnHome ? "首页展示" : "不展示"}
                        </span>
                        <button
                          onClick={() => toggleShowOnHome(video.id, !video.showOnHome)}
                          className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${video.showOnHome ? "bg-blue-600" : "bg-slate-200"}`}
                        >
                          <span className={`inline-block h-4 w-4 transform rounded-full bg-white shadow transition-transform ${video.showOnHome ? "translate-x-6" : "translate-x-1"}`} />
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
