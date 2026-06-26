"use client";

import { useCallback, useEffect, useRef, useState } from "react";

// ─── Types ────────────────────────────────────────────────────────────────────

type LocalFile = {
  id: string;
  name: string;
  size: number;
  fileType: "image" | "video";
  previewUrl: string;       // object URL for instant preview
  serverUrl: string | null; // set after upload succeeds
  status: "uploading" | "done" | "error";
  errorMsg?: string;
};

// ─── Helpers ──────────────────────────────────────────────────────────────────

function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

const IMAGE_TYPES = ["image/jpeg", "image/png", "image/gif"];
const VIDEO_TYPES = ["video/mp4", "video/quicktime"];
const ACCEPT = ".jpg,.jpeg,.png,.gif,.mp4,.mov,image/jpeg,image/png,image/gif,video/mp4,video/quicktime";
const MAX_IMAGES = 5;
const MAX_VIDEOS = 2;

// ─── Component ────────────────────────────────────────────────────────────────

export default function TicketPage() {
  const [submitted, setSubmitted] = useState(false);
  const [loading, setLoading] = useState(false);
  const [createdTicketNo, setCreatedTicketNo] = useState("");
  const [currentUser, setCurrentUser] = useState<{ name: string; phone: string; role: string } | null>(null);
  const [toast, setToast] = useState({ visible: false, message: "" });

  const [form, setForm] = useState({
    customer: "", contact: "", device: "", project: "", type: "", level: "", description: "",
  });

  const [files, setFiles] = useState<LocalFile[]>([]);
  const [isDragging, setIsDragging] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  function updateForm(field: string, value: string) {
    setForm((f) => ({ ...f, [field]: value }));
  }

  function showToast(msg: string) {
    setToast({ visible: true, message: msg });
    setTimeout(() => setToast({ visible: false, message: "" }), 5000);
  }

  useEffect(() => {
    const userText = localStorage.getItem("youlu_user");
    if (!userText) { window.location.href = "/login"; return; }
    const user = JSON.parse(userText);
    if (user.role !== "customer") { window.location.href = "/"; return; }
    setCurrentUser(user);
  }, []);

  // Revoke object URLs on unmount to avoid memory leaks
  useEffect(() => {
    return () => { files.forEach((f) => URL.revokeObjectURL(f.previewUrl)); };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // ── File picking ────────────────────────────────────────────────────────────

  const processFiles = useCallback(async (picked: FileList | File[]) => {
    const arr = Array.from(picked);
    const imageCount = files.filter((f) => f.fileType === "image").length;
    const videoCount = files.filter((f) => f.fileType === "video").length;

    let imgAdded = 0;
    let vidAdded = 0;

    for (const file of arr) {
      const isImage = IMAGE_TYPES.includes(file.type);
      const isVideo = VIDEO_TYPES.includes(file.type);

      if (!isImage && !isVideo) {
        showToast(`跳过不支持的文件：${file.name}（仅支持 jpg/png/gif/mp4/mov）`);
        continue;
      }
      if (isImage && imageCount + imgAdded >= MAX_IMAGES) {
        showToast(`最多上传 ${MAX_IMAGES} 张图片`);
        continue;
      }
      if (isVideo && videoCount + vidAdded >= MAX_VIDEOS) {
        showToast(`最多上传 ${MAX_VIDEOS} 个视频`);
        continue;
      }

      const id = `${Date.now()}-${Math.random().toString(36).slice(2)}`;
      const previewUrl = URL.createObjectURL(file);
      const fileType: "image" | "video" = isImage ? "image" : "video";

      if (isImage) imgAdded++;
      else vidAdded++;

      // Add to list as "uploading"
      setFiles((prev) => [...prev, { id, name: file.name, size: file.size, fileType, previewUrl, serverUrl: null, status: "uploading" }]);

      // Upload immediately
      (async () => {
        try {
          const fd = new FormData();
          fd.append("file", file);
          const res = await fetch("/api/upload", { method: "POST", body: fd });
          const result = await res.json();
          setFiles((prev) =>
            prev.map((f) =>
              f.id === id
                ? result.success
                  ? { ...f, serverUrl: result.url, status: "done" }
                  : { ...f, status: "error", errorMsg: result.message }
                : f
            )
          );
          if (!result.success) showToast(`上传失败：${file.name} — ${result.message}`);
        } catch {
          setFiles((prev) =>
            prev.map((f) => (f.id === id ? { ...f, status: "error", errorMsg: "网络错误" } : f))
          );
          showToast(`上传失败：${file.name}`);
        }
      })();
    }
  }, [files]);

  function removeFile(id: string) {
    setFiles((prev) => {
      const target = prev.find((f) => f.id === id);
      if (target) URL.revokeObjectURL(target.previewUrl);
      return prev.filter((f) => f.id !== id);
    });
  }

  const isUploading = files.some((f) => f.status === "uploading");

  // ── Drag & drop ─────────────────────────────────────────────────────────────

  function onDragOver(e: React.DragEvent) {
    e.preventDefault();
    setIsDragging(true);
  }
  function onDragLeave() { setIsDragging(false); }
  function onDrop(e: React.DragEvent) {
    e.preventDefault();
    setIsDragging(false);
    processFiles(e.dataTransfer.files);
  }

  // ── Submit ──────────────────────────────────────────────────────────────────

  async function submitTicket() {
    if (!form.type || !form.level || !form.description.trim()) {
      showToast("请填写问题类型、紧急程度和问题描述");
      return;
    }
    if (isUploading) {
      showToast("请等待文件上传完成后再提交");
      return;
    }

    setLoading(true);
    setSubmitted(false);

    try {
      const userText = localStorage.getItem("youlu_user");
      if (!userText) { window.location.href = "/login"; return; }
      const user = JSON.parse(userText);

      const attachments = files
        .filter((f) => f.status === "done" && f.serverUrl)
        .map((f) => ({ url: f.serverUrl!, name: f.name, fileType: f.fileType }));

      const res = await fetch("/api/tickets", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...form,
          phone: user.phone,
          customer: form.customer || user.name,
          contact: form.contact || user.name,
          attachments: JSON.stringify(attachments),
        }),
      });

      const result = await res.json();

      if (result.success) {
        setCreatedTicketNo(result.data.ticketNo);
        setSubmitted(true);
        showToast(`工单提交成功！编号：${result.data.ticketNo}`);
        // Reset
        setForm({ customer: "", contact: "", device: "", project: "", type: "", level: "", description: "" });
        files.forEach((f) => URL.revokeObjectURL(f.previewUrl));
        setFiles([]);
      } else {
        showToast("工单提交失败，请稍后重试");
      }
    } catch {
      showToast("工单提交失败，请检查网络连接");
    }

    setLoading(false);
  }

  // ── Render ──────────────────────────────────────────────────────────────────

  const imageFiles = files.filter((f) => f.fileType === "image");
  const videoFiles = files.filter((f) => f.fileType === "video");

  return (
    <main className="min-h-screen bg-slate-100 px-4 py-8 text-slate-900 md:px-6 md:py-10">
      {/* Toast */}
      {toast.visible && (
        <div className="fixed bottom-5 left-1/2 z-50 -translate-x-1/2 rounded-2xl bg-slate-900 px-6 py-4 text-white shadow-2xl">
          <p className="text-sm font-bold">{toast.message}</p>
        </div>
      )}

      <section className="mx-auto max-w-4xl space-y-5">
        <div className="rounded-3xl bg-white p-5 shadow-sm md:p-8">
          <p className="text-sm text-slate-400">客户中心 / 提交工单</p>
          <h1 className="mt-4 text-2xl font-bold text-blue-700 md:mt-5 md:text-3xl">提交售后工单</h1>
          <p className="mt-3 text-sm text-slate-500">
            客户可提交设备故障、使用异常和现场问题。提交后，后台售后人员可以查看并处理。
          </p>

          {currentUser && (
            <div className="mt-5 rounded-2xl bg-blue-50 p-4 text-blue-700">
              <p className="text-sm font-bold">当前登录：{currentUser.name}（账号：{currentUser.phone}）</p>
            </div>
          )}

          {submitted && (
            <div className="mt-5 rounded-2xl bg-green-50 p-4 text-green-700">
              <p className="font-bold">工单提交成功</p>
              <p className="mt-1 text-sm">
                工单编号：<span className="font-bold">{createdTicketNo}</span>
                {" "}— <a href="/my-tickets" className="underline">查看我的工单</a>
              </p>
            </div>
          )}
        </div>

        {/* Form */}
        <div className="rounded-3xl bg-white p-5 shadow-sm md:p-8">
          <h2 className="text-base font-bold text-slate-700 md:text-lg">工单信息</h2>

          <div className="mt-5 grid gap-4 md:grid-cols-2">
            <div>
              <label className="text-sm font-bold text-slate-700">客户名称</label>
              <input value={form.customer} onChange={(e) => updateForm("customer", e.target.value)}
                placeholder="例如：上海中心"
                className="mt-2 w-full rounded-xl border border-slate-200 px-4 py-3 text-sm outline-none focus:border-blue-500" />
            </div>

            <div>
              <label className="text-sm font-bold text-slate-700">联系人</label>
              <input value={form.contact} onChange={(e) => updateForm("contact", e.target.value)}
                placeholder="例如：张经理"
                className="mt-2 w-full rounded-xl border border-slate-200 px-4 py-3 text-sm outline-none focus:border-blue-500" />
            </div>

            <div>
              <label className="text-sm font-bold text-slate-700">联系电话</label>
              <input value={currentUser?.phone ?? ""} disabled
                className="mt-2 w-full rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-400 outline-none" />
              <p className="mt-1 text-xs text-slate-400">由系统自动绑定。</p>
            </div>

            <div>
              <label className="text-sm font-bold text-slate-700">设备编号</label>
              <input value={form.device} onChange={(e) => updateForm("device", e.target.value)}
                placeholder="例如：AI130-001"
                className="mt-2 w-full rounded-xl border border-slate-200 px-4 py-3 text-sm outline-none focus:border-blue-500" />
            </div>

            <div>
              <label className="text-sm font-bold text-slate-700">所在项目</label>
              <input value={form.project} onChange={(e) => updateForm("project", e.target.value)}
                placeholder="例如：园区主干道"
                className="mt-2 w-full rounded-xl border border-slate-200 px-4 py-3 text-sm outline-none focus:border-blue-500" />
            </div>

            <div>
              <label className="text-sm font-bold text-slate-700">问题类型 *</label>
              <select value={form.type} onChange={(e) => updateForm("type", e.target.value)}
                className="mt-2 w-full rounded-xl border border-slate-200 px-4 py-3 text-sm outline-none focus:border-blue-500">
                <option value="">请选择问题类型</option>
                <option value="无法开机">无法开机</option>
                <option value="无法充电">无法充电</option>
                <option value="无法返航">无法返航</option>
                <option value="任务下发失败">任务下发失败</option>
                <option value="APP登录问题">APP登录问题</option>
                <option value="其他问题">其他问题</option>
              </select>
            </div>

            <div>
              <label className="text-sm font-bold text-slate-700">紧急程度 *</label>
              <select value={form.level} onChange={(e) => updateForm("level", e.target.value)}
                className="mt-2 w-full rounded-xl border border-slate-200 px-4 py-3 text-sm outline-none focus:border-blue-500">
                <option value="">请选择紧急程度</option>
                <option value="普通">普通</option>
                <option value="紧急">紧急</option>
              </select>
            </div>
          </div>

          <div className="mt-4">
            <label className="text-sm font-bold text-slate-700">问题描述 *</label>
            <textarea value={form.description} onChange={(e) => updateForm("description", e.target.value)}
              placeholder="请描述现场问题、发生时间、设备状态、是否已经尝试处理等。"
              className="mt-2 h-32 w-full rounded-xl border border-slate-200 px-4 py-3 text-sm outline-none focus:border-blue-500" />
          </div>
        </div>

        {/* Upload zone */}
        <div className="rounded-3xl bg-white p-5 shadow-sm md:p-8">
          <h2 className="text-base font-bold text-slate-700 md:text-lg">附件上传</h2>
          <p className="mt-1 text-xs text-slate-400">
            图片（jpg/png/gif，最多 {MAX_IMAGES} 张） · 视频（mp4/mov，最多 {MAX_VIDEOS} 个）
          </p>

          {/* Drop zone */}
          <div
            onDragOver={onDragOver}
            onDragLeave={onDragLeave}
            onDrop={onDrop}
            onClick={() => fileInputRef.current?.click()}
            className={`mt-4 flex cursor-pointer flex-col items-center justify-center gap-2 rounded-2xl border-2 border-dashed p-8 transition ${
              isDragging
                ? "border-blue-500 bg-blue-50"
                : "border-slate-200 bg-slate-50 hover:border-blue-300 hover:bg-blue-50"
            }`}
          >
            <input
              ref={fileInputRef}
              type="file"
              multiple
              accept={ACCEPT}
              className="hidden"
              onChange={(e) => { if (e.target.files) processFiles(e.target.files); e.target.value = ""; }}
            />
            <div className="flex h-12 w-12 items-center justify-center rounded-full bg-white shadow">
              <svg className="h-6 w-6 text-blue-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                  d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12" />
              </svg>
            </div>
            <p className="text-sm font-bold text-slate-700">
              {isDragging ? "松开鼠标上传文件" : "拖拽文件到这里，或点击选择"}
            </p>
            <p className="text-xs text-slate-400">
              已选 {imageFiles.length}/{MAX_IMAGES} 张图片 · {videoFiles.length}/{MAX_VIDEOS} 个视频
            </p>
          </div>

          {/* Image previews */}
          {imageFiles.length > 0 && (
            <div className="mt-5">
              <p className="mb-3 text-xs font-bold text-slate-500">图片预览</p>
              <div className="flex flex-wrap gap-3">
                {imageFiles.map((f) => (
                  <div key={f.id} className="group relative h-20 w-20 shrink-0">
                    {f.status === "uploading" ? (
                      <div className="flex h-full w-full items-center justify-center rounded-xl bg-slate-100">
                        <svg className="h-5 w-5 animate-spin text-blue-500" fill="none" viewBox="0 0 24 24">
                          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                          <path className="opacity-75" fill="currentColor"
                            d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                        </svg>
                      </div>
                    ) : f.status === "error" ? (
                      <div className="flex h-full w-full flex-col items-center justify-center rounded-xl border border-red-200 bg-red-50">
                        <span className="text-xs font-bold text-red-500">上传失败</span>
                      </div>
                    ) : (
                      <img src={f.previewUrl} alt={f.name}
                        className="h-full w-full rounded-xl object-cover border border-slate-200" />
                    )}
                    <button
                      onClick={() => removeFile(f.id)}
                      className="absolute -right-1.5 -top-1.5 flex h-5 w-5 items-center justify-center rounded-full bg-slate-700 text-white opacity-0 transition group-hover:opacity-100"
                    >
                      <svg className="h-3 w-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M6 18L18 6M6 6l12 12" />
                      </svg>
                    </button>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Video list */}
          {videoFiles.length > 0 && (
            <div className="mt-5">
              <p className="mb-3 text-xs font-bold text-slate-500">视频文件</p>
              <div className="space-y-2">
                {videoFiles.map((f) => (
                  <div key={f.id}
                    className={`flex items-center gap-3 rounded-xl border p-3 ${
                      f.status === "error" ? "border-red-200 bg-red-50" : "border-slate-200 bg-slate-50"
                    }`}
                  >
                    <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-blue-100">
                      {f.status === "uploading" ? (
                        <svg className="h-4 w-4 animate-spin text-blue-500" fill="none" viewBox="0 0 24 24">
                          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                        </svg>
                      ) : f.status === "error" ? (
                        <span className="text-xs text-red-500">✗</span>
                      ) : (
                        <svg className="h-4 w-4 text-blue-600" fill="currentColor" viewBox="0 0 24 24">
                          <path d="M8 5v14l11-7z" />
                        </svg>
                      )}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="truncate text-sm font-bold text-slate-800">{f.name}</p>
                      <p className="text-xs text-slate-400">
                        {formatBytes(f.size)}
                        {f.status === "uploading" && " · 上传中..."}
                        {f.status === "error" && <span className="text-red-500"> · {f.errorMsg || "上传失败"}</span>}
                        {f.status === "done" && " · 已上传"}
                      </p>
                    </div>
                    <button onClick={() => removeFile(f.id)}
                      className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-200 hover:text-slate-700">
                      <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                      </svg>
                    </button>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Submit buttons */}
        <div className="rounded-3xl bg-white p-5 shadow-sm md:p-6">
          <div className="flex flex-wrap gap-3">
            <button
              onClick={submitTicket}
              disabled={loading || isUploading}
              className="rounded-xl bg-blue-600 px-6 py-3 text-sm font-bold text-white disabled:bg-slate-400"
            >
              {loading ? "提交中..." : isUploading ? "等待上传..." : "提交工单"}
            </button>
            <a href="/my-tickets" className="rounded-xl border border-blue-200 bg-white px-6 py-3 text-sm font-bold text-blue-600">
              我的工单
            </a>
            <a href="/" className="rounded-xl border border-slate-200 bg-white px-6 py-3 text-sm font-bold text-slate-700">
              返回首页
            </a>
          </div>
          {isUploading && (
            <p className="mt-3 text-xs text-slate-400">文件上传中，请稍候...</p>
          )}
        </div>
      </section>
    </main>
  );
}
