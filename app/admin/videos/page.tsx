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

export default function AdminVideosPage() {
  const [checkedLogin, setCheckedLogin] = useState(false);
  const [videos, setVideos] = useState<Video[]>([]);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [uploadResult, setUploadResult] = useState<{
    success: boolean;
    message: string;
  } | null>(null);

  const [form, setForm] = useState({
    title: "",
    category: "",
    description: "",
  });

  const fileRef = useRef<HTMLInputElement>(null);

  async function loadVideos() {
    setLoading(true);
    try {
      const res = await fetch("/api/videos");
      const result = await res.json();
      if (result.success) setVideos(result.data);
    } catch (e) {
      console.error("读取视频失败：", e);
    }
    setLoading(false);
  }

  useEffect(() => {
    const userText = localStorage.getItem("youlu_user");
    if (!userText) {
      window.location.href = "/login";
      return;
    }
    const user = JSON.parse(userText);
    if (user.role !== "admin") {
      window.location.href = "/unauthorized";
      return;
    }
    setCheckedLogin(true);
    loadVideos();
  }, []);

  async function uploadVideo() {
    const file = fileRef.current?.files?.[0];

    if (!form.title.trim()) {
      alert("请填写视频标题");
      return;
    }
    if (!file) {
      alert("请选择要上传的视频文件");
      return;
    }

    setUploading(true);
    setUploadResult(null);

    try {
      const data = new FormData();
      data.append("title", form.title);
      data.append("category", form.category || "未分类");
      data.append("description", form.description);
      data.append("file", file);

      const res = await fetch("/api/videos/upload", {
        method: "POST",
        body: data,
      });

      const result = await res.json();

      if (result.success) {
        setUploadResult({ success: true, message: "视频上传成功！" });
        setForm({ title: "", category: "", description: "" });
        if (fileRef.current) fileRef.current.value = "";
        await loadVideos();
      } else {
        setUploadResult({
          success: false,
          message: result.message || "上传失败，请稍后重试",
        });
      }
    } catch (e) {
      console.error("上传失败：", e);
      setUploadResult({ success: false, message: "上传失败，请检查网络" });
    }

    setUploading(false);
  }

  async function deleteVideo(id: number, title: string) {
    if (!confirm(`确定要删除视频「${title}」吗？`)) return;
    try {
      const res = await fetch(`/api/videos?id=${id}`, { method: "DELETE" });
      const result = await res.json();
      if (result.success) {
        await loadVideos();
      } else {
        alert("删除失败，请稍后重试");
      }
    } catch (e) {
      console.error("删除失败：", e);
      alert("删除失败，请检查系统是否正常运行");
    }
  }

  if (!checkedLogin) {
    return (
      <main className="min-h-screen bg-slate-100 px-6 py-10">
        <section className="mx-auto max-w-4xl rounded-3xl bg-white p-8 shadow-sm">
          <p className="text-slate-500">正在验证管理员权限...</p>
        </section>
      </main>
    );
  }

  const categories = Array.from(
    new Set(videos.map((v) => v.category || "未分类"))
  );

  return (
    <main className="min-h-screen bg-slate-100 px-6 py-10 text-slate-900">
      <section className="mx-auto max-w-5xl space-y-8">
        <div className="rounded-3xl bg-white p-8 shadow-sm">
          <p className="text-sm text-slate-400">后台管理 / 视频素材管理</p>

          <h1 className="mt-5 text-3xl font-bold text-blue-700">
            视频素材管理
          </h1>

          <p className="mt-3 text-slate-500">
            上传和管理客户端教程视频，支持按分类整理，上传后立即在教程页显示。
          </p>

          <div className="mt-6 flex flex-wrap gap-4">
            <a
              href="/admin"
              className="rounded-xl border border-slate-200 bg-white px-6 py-3 font-bold text-slate-700"
            >
              返回后台
            </a>

            <a
              href="/tutorials"
              target="_blank"
              className="rounded-xl border border-blue-200 bg-white px-6 py-3 font-bold text-blue-600"
            >
              预览教程页
            </a>
          </div>
        </div>

        <div className="rounded-3xl bg-white p-8 shadow-sm">
          <h2 className="text-xl font-bold text-slate-900">上传新视频</h2>

          {uploadResult && (
            <div
              className={`mt-5 rounded-2xl p-4 ${
                uploadResult.success
                  ? "bg-green-50 text-green-700"
                  : "bg-red-50 text-red-700"
              }`}
            >
              <p className="font-bold">{uploadResult.message}</p>
            </div>
          )}

          <div className="mt-6 grid gap-5 md:grid-cols-2">
            <div>
              <label className="font-bold text-slate-700">视频标题</label>
              <input
                value={form.title}
                onChange={(e) => setForm({ ...form, title: e.target.value })}
                placeholder="例如：开机操作教程"
                className="mt-2 w-full rounded-xl border border-slate-200 px-4 py-3 outline-none focus:border-blue-500"
              />
            </div>

            <div>
              <label className="font-bold text-slate-700">分类</label>
              <input
                value={form.category}
                onChange={(e) => setForm({ ...form, category: e.target.value })}
                placeholder="例如：开机操作"
                className="mt-2 w-full rounded-xl border border-slate-200 px-4 py-3 outline-none focus:border-blue-500"
              />
            </div>

            <div className="md:col-span-2">
              <label className="font-bold text-slate-700">描述（可选）</label>
              <input
                value={form.description}
                onChange={(e) =>
                  setForm({ ...form, description: e.target.value })
                }
                placeholder="简短描述视频内容..."
                className="mt-2 w-full rounded-xl border border-slate-200 px-4 py-3 outline-none focus:border-blue-500"
              />
            </div>

            <div className="md:col-span-2">
              <label className="font-bold text-slate-700">
                选择视频文件
              </label>
              <p className="mt-1 text-xs text-slate-400">
                支持 mp4、mov、avi 等格式，手机可从相册选择
              </p>
              <input
                ref={fileRef}
                type="file"
                accept="video/mp4,video/quicktime,video/avi,video/x-msvideo,video/webm,video/3gpp,video/3gpp2,video/*,.mp4,.mov,.avi,.webm,.3gp"
                className="mt-2 w-full rounded-xl border border-slate-200 px-4 py-3 text-slate-700 file:mr-4 file:rounded-lg file:border-0 file:bg-blue-50 file:px-4 file:py-2 file:font-bold file:text-blue-600"
              />
            </div>
          </div>

          <div className="mt-6">
            <button
              onClick={uploadVideo}
              disabled={uploading}
              className="rounded-xl bg-blue-600 px-6 py-3 font-bold text-white disabled:bg-slate-400"
            >
              {uploading ? "上传中..." : "上传视频"}
            </button>
          </div>
        </div>

        <div className="rounded-3xl bg-white p-8 shadow-sm">
          <div className="flex items-center justify-between gap-4">
            <div>
              <h2 className="text-xl font-bold text-slate-900">
                全部视频（{videos.length} 条）
              </h2>
              {categories.length > 0 && (
                <p className="mt-1 text-sm text-slate-400">
                  分类：{categories.join("、")}
                </p>
              )}
            </div>

            <button
              onClick={loadVideos}
              className="rounded-xl border border-blue-200 bg-white px-5 py-2.5 font-bold text-blue-600"
            >
              刷新
            </button>
          </div>

          {loading ? (
            <p className="mt-6 text-slate-500">正在加载视频...</p>
          ) : videos.length === 0 ? (
            <div className="mt-6 rounded-2xl border border-dashed border-slate-300 p-10 text-center">
              <p className="text-xl font-bold text-slate-700">暂无视频</p>
              <p className="mt-3 text-slate-500">
                使用上方表单上传第一个教程视频。
              </p>
            </div>
          ) : (
            <div className="mt-6 space-y-4">
              {videos.map((video) => (
                <div
                  key={video.id}
                  className="rounded-2xl border border-slate-200 bg-slate-50 p-5"
                >
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex-1">
                      <div className="flex flex-wrap items-center gap-3">
                        <span className="rounded-full bg-blue-50 px-3 py-1 text-xs font-bold text-blue-600">
                          {video.category || "未分类"}
                        </span>

                        <span className="text-xs text-slate-400">
                          上传于 {new Date(video.createdAt).toLocaleString()}
                        </span>
                      </div>

                      <p className="mt-3 font-bold text-slate-900">
                        {video.title}
                      </p>

                      {video.description && (
                        <p className="mt-1 text-sm text-slate-600">
                          {video.description}
                        </p>
                      )}

                      <p className="mt-2 break-all text-xs text-slate-400">
                        {video.fileUrl}
                      </p>
                    </div>

                    <div className="flex shrink-0 flex-col gap-2">
                      <a
                        href={video.fileUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="rounded-xl border border-slate-200 bg-white px-4 py-2 text-center text-sm font-bold text-slate-700"
                      >
                        预览
                      </a>

                      <button
                        onClick={() => deleteVideo(video.id, video.title)}
                        className="rounded-xl border border-red-200 bg-white px-4 py-2 text-sm font-bold text-red-600"
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
