"use client";

import { useEffect, useRef, useState } from "react";

type Video = {
  id: number;
  title: string;
  category: string;
  fileUrl: string;
  description: string;
  createdAt: string;
};

type Phase = "idle" | "presigning" | "uploading" | "confirming" | "done" | "error";

export default function AdminVideosPage() {
  const [checkedLogin, setCheckedLogin] = useState(false);
  const [videos, setVideos] = useState<Video[]>([]);
  const [loading, setLoading] = useState(true);

  const [phase, setPhase] = useState<Phase>("idle");
  const [progress, setProgress] = useState(0);
  const [message, setMessage] = useState("");

  const [form, setForm] = useState({ title: "", category: "", description: "" });
  const fileRef = useRef<HTMLInputElement>(null);
  const xhrRef  = useRef<XMLHttpRequest | null>(null);

  async function loadVideos() {
    setLoading(true);
    try {
      const res = await fetch("/api/videos");
      const r   = await res.json();
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
  }, []);

  // ── Three-step presigned upload ───────────────────────────────────────────
  async function uploadVideo() {
    const file = fileRef.current?.files?.[0];
    if (!form.title.trim()) { alert("请填写视频标题"); return; }
    if (!file)               { alert("请选择要上传的视频文件"); return; }

    setPhase("presigning");
    setProgress(0);
    setMessage("正在获取上传凭证...");

    try {
      // ── Step 1: Get presigned URL ──────────────────────────────────────
      const presignRes = await fetch("/api/videos/presign", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ filename: file.name, contentType: file.type || "video/mp4" }),
      });

      if (!presignRes.ok) {
        let detail = `HTTP ${presignRes.status}`;
        try { const j = await presignRes.json(); detail = j.message ?? detail; } catch {}
        throw new Error(`获取凭证失败（${detail}）`);
      }
      const presign = await presignRes.json();
      if (!presign.success) throw new Error(presign.message || "获取凭证失败");

      const { uploadUrl, objectKey } = presign as { uploadUrl: string; objectKey: string };
      console.log("[upload] presign OK, objectKey:", objectKey);

      // ── Step 2: PUT directly to OSS — NO custom headers ────────────────
      // Signature does not include Content-Type, so the browser can send
      // any Content-Type without breaking the signature.
      // Sending NO custom headers means no CORS preflight for Content-Type.
      setPhase("uploading");
      setMessage(`正在上传「${file.name}」（${(file.size / 1024 / 1024).toFixed(1)} MB）...`);

      await new Promise<void>((resolve, reject) => {
        const xhr = new XMLHttpRequest();
        xhrRef.current = xhr;

        xhr.upload.onprogress = (e) => {
          if (e.lengthComputable) {
            const pct = Math.round((e.loaded / e.total) * 100);
            setProgress(pct);
            setMessage(`上传中 ${pct}%...`);
          }
        };

        xhr.open("PUT", uploadUrl);
        // ⚠️  No setRequestHeader calls — zero custom headers
        // OSS auth is entirely in the query params (OSSAccessKeyId, Expires, Signature)

        xhr.onload = () => {
          console.log("[upload] PUT status:", xhr.status, xhr.statusText);
          console.log("[upload] PUT response:", xhr.responseText.slice(0, 300));
          if (xhr.status >= 200 && xhr.status < 300) {
            resolve();
          } else {
            // Parse OSS error XML
            const codeMatch = xhr.responseText.match(/<Code>([^<]+)<\/Code>/);
            const msgMatch  = xhr.responseText.match(/<Message>([^<]+)<\/Message>/);
            reject(new Error(
              `OSS 错误 ${xhr.status} [${codeMatch?.[1] ?? "?"}]：${msgMatch?.[1] ?? xhr.responseText.slice(0, 200)}`
            ));
          }
        };

        xhr.onerror = () => {
          console.error("[upload] XHR onerror — likely CORS preflight rejected");
          reject(new Error(
            "PUT 请求被浏览器拦截（CORS）。\n" +
            "OSS CORS 配置需要：来源=你的域名，方法=PUT，允许Headers=*\n" +
            "检查 F12 → Network 找到 OPTIONS 或 PUT 请求查看具体状态码。"
          ));
        };

        xhr.ontimeout = () => reject(new Error("上传超时"));
        xhr.send(file);
      });

      // ── Step 3: Confirm to DB ──────────────────────────────────────────
      setPhase("confirming");
      setMessage("正在写入数据库...");
      setProgress(100);

      const confirmRes = await fetch("/api/videos/confirm", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          objectKey,
          title:       form.title,
          category:    form.category || "未分类",
          description: form.description,
        }),
      });
      const confirm = await confirmRes.json();
      if (!confirm.success) throw new Error(confirm.message || "写入数据库失败");

      setPhase("done");
      setMessage("✅ 视频上传成功！");
      setForm({ title: "", category: "", description: "" });
      if (fileRef.current) fileRef.current.value = "";
      await loadVideos();

    } catch (error) {
      const msg = error instanceof Error ? error.message : String(error);
      console.error("[upload] error:", msg);
      setPhase("error");
      setMessage(msg);
    }
  }

  const busy = phase === "presigning" || phase === "uploading" || phase === "confirming";

  async function deleteVideo(id: number, title: string) {
    if (!confirm(`确定要删除视频「${title}」吗？`)) return;
    try {
      const res = await fetch(`/api/videos?id=${id}`, { method: "DELETE" });
      const r   = await res.json();
      if (r.success) await loadVideos();
      else alert("删除失败，请稍后重试");
    } catch (e) { console.error(e); alert("删除失败"); }
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

  const categories = Array.from(new Set(videos.map((v) => v.category || "未分类")));

  return (
    <main className="min-h-screen bg-slate-100 px-4 py-8 text-slate-900 md:px-6 md:py-10">
      <section className="mx-auto max-w-5xl space-y-6">

        {/* Header */}
        <div className="rounded-3xl bg-white p-5 shadow-sm md:p-8">
          <p className="text-sm text-slate-400">后台管理 / 视频素材管理</p>
          <h1 className="mt-4 text-2xl font-bold text-blue-700 md:text-3xl">视频素材管理</h1>
          <p className="mt-2 text-sm text-slate-500">
            视频直接上传到阿里云 OSS，支持大文件，实时显示上传进度。
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

        {/* Upload form */}
        <div className="rounded-3xl bg-white p-5 shadow-sm md:p-8">
          <h2 className="text-lg font-bold text-slate-900 md:text-xl">上传新视频</h2>

          {/* Status / progress */}
          {phase !== "idle" && (
            <div className={`mt-5 rounded-2xl p-4 ${
              phase === "done"  ? "bg-green-50"
              : phase === "error" ? "bg-red-50"
              : "bg-blue-50"
            }`}>
              <p className={`whitespace-pre-wrap text-sm font-bold ${
                phase === "done"  ? "text-green-700"
                : phase === "error" ? "text-red-700"
                : "text-blue-700"
              }`}>
                {phase === "done" ? "✅ " : phase === "error" ? "❌ " : ""}{message}
              </p>

              {phase === "uploading" && (
                <div className="mt-3">
                  <div className="h-2.5 w-full rounded-full bg-blue-100">
                    <div
                      className="h-2.5 rounded-full bg-blue-500 transition-all duration-200"
                      style={{ width: `${progress}%` }}
                    />
                  </div>
                  <p className="mt-1 text-right text-xs text-blue-500">{progress}%</p>
                </div>
              )}

              {(phase === "done" || phase === "error") && (
                <button
                  onClick={() => { setPhase("idle"); setMessage(""); }}
                  className="mt-3 text-xs font-bold underline opacity-70"
                >
                  {phase === "done" ? "继续上传" : "重试"}
                </button>
              )}
            </div>
          )}

          {(phase === "idle" || phase === "error") && (
            <>
              <div className="mt-6 grid gap-5 md:grid-cols-2">
                <div>
                  <label className="text-sm font-bold text-slate-700">视频标题 *</label>
                  <input
                    value={form.title}
                    onChange={(e) => setForm({ ...form, title: e.target.value })}
                    placeholder="例如：开机操作教程"
                    className="mt-2 w-full rounded-xl border border-slate-200 px-4 py-3 text-sm outline-none focus:border-blue-500"
                  />
                </div>
                <div>
                  <label className="text-sm font-bold text-slate-700">分类</label>
                  <input
                    value={form.category}
                    onChange={(e) => setForm({ ...form, category: e.target.value })}
                    placeholder="例如：开机部署"
                    className="mt-2 w-full rounded-xl border border-slate-200 px-4 py-3 text-sm outline-none focus:border-blue-500"
                  />
                </div>
                <div className="md:col-span-2">
                  <label className="text-sm font-bold text-slate-700">描述（可选）</label>
                  <input
                    value={form.description}
                    onChange={(e) => setForm({ ...form, description: e.target.value })}
                    placeholder="简短描述视频内容..."
                    className="mt-2 w-full rounded-xl border border-slate-200 px-4 py-3 text-sm outline-none focus:border-blue-500"
                  />
                </div>
                <div className="md:col-span-2">
                  <label className="text-sm font-bold text-slate-700">选择视频文件</label>
                  <p className="mt-1 text-xs text-slate-400">支持 mp4、mov、avi 等，手机可从相册选择，无文件大小限制</p>
                  <input
                    ref={fileRef}
                    type="file"
                    accept="video/mp4,video/quicktime,video/avi,video/x-msvideo,video/webm,video/3gpp,video/3gpp2,video/*,.mp4,.mov,.avi,.webm,.3gp"
                    className="mt-2 w-full rounded-xl border border-slate-200 px-4 py-3 text-sm text-slate-700 file:mr-4 file:rounded-lg file:border-0 file:bg-blue-50 file:px-4 file:py-2 file:font-bold file:text-blue-600"
                  />
                </div>
              </div>
              <div className="mt-5">
                <button
                  onClick={uploadVideo}
                  className="rounded-xl bg-blue-600 px-6 py-3 text-sm font-bold text-white"
                >
                  上传视频
                </button>
              </div>
            </>
          )}

          {busy && (
            <div className="mt-5">
              <button disabled className="rounded-xl bg-slate-400 px-6 py-3 text-sm font-bold text-white">
                {phase === "presigning" ? "获取凭证中..." :
                 phase === "uploading"  ? `上传中 ${progress}%...` :
                 "写入数据库中..."}
              </button>
            </div>
          )}
        </div>

        {/* Video list */}
        <div className="rounded-3xl bg-white p-5 shadow-sm md:p-6">
          <div className="flex items-center justify-between gap-4">
            <div>
              <h2 className="text-lg font-bold text-slate-900 md:text-xl">
                全部视频（{videos.length} 条）
              </h2>
              {categories.length > 0 && (
                <p className="mt-1 text-xs text-slate-400">分类：{categories.join("、")}</p>
              )}
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
                        <span className="rounded-full bg-blue-50 px-3 py-1 text-xs font-bold text-blue-600">
                          {video.category || "未分类"}
                        </span>
                        <span className="text-xs text-slate-400">
                          {new Date(video.createdAt).toLocaleString()}
                        </span>
                      </div>
                      <p className="mt-2 font-bold text-slate-900">{video.title}</p>
                      {video.description && (
                        <p className="mt-1 text-xs text-slate-500">{video.description}</p>
                      )}
                      <p className="mt-1 truncate text-xs text-slate-400">{video.fileUrl}</p>
                    </div>
                    <div className="flex shrink-0 flex-col gap-1.5">
                      <a
                        href={video.fileUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="rounded-xl border border-slate-200 bg-white px-3 py-2 text-center text-xs font-bold text-slate-700"
                      >
                        预览
                      </a>
                      <button
                        onClick={() => deleteVideo(video.id, video.title)}
                        className="rounded-xl border border-red-200 bg-white px-3 py-2 text-xs font-bold text-red-600"
                      >
                        删除
                      </button>
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
