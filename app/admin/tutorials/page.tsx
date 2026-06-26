const tutorials = [
  { title: "机器如何充电", category: "拆箱及学习", status: "已发布", updatedAt: "2026-06-24" },
  { title: "机器如何开机", category: "开机与部署", status: "已发布", updatedAt: "2026-06-24" },
  { title: "如何加水", category: "拆箱及学习", status: "已发布", updatedAt: "2026-06-24" },
  { title: "如何倾倒垃圾", category: "拆箱及学习", status: "已发布", updatedAt: "2026-06-24" },
  { title: "如何下发任务", category: "任务下发及查看", status: "已发布", updatedAt: "2026-06-24" },
  { title: "如何让机器返航", category: "任务下发及查看", status: "已发布", updatedAt: "2026-06-24" },
];

export default function AdminTutorialsPage() {
  return (
    <main className="min-h-screen bg-slate-100 px-6 py-10 text-slate-900">
      <section className="mx-auto max-w-6xl rounded-3xl bg-white p-8 shadow-sm">
        <div className="flex items-center justify-between gap-4">
          <div>
            <p className="text-sm text-slate-400">后台管理 / 教程管理</p>

            <h1 className="mt-5 text-3xl font-bold text-blue-700">
              教程管理
            </h1>

            <p className="mt-3 text-slate-500">
              管理客户可查看的 AI130 操作教程内容。当前为演示版本，后续可增加新增、编辑、上传视频等功能。
            </p>
          </div>

          <a
            href="/admin"
            className="rounded-xl border border-slate-200 bg-white px-5 py-3 font-bold text-slate-700"
          >
            返回后台
          </a>
        </div>

        <div className="mt-8 overflow-hidden rounded-2xl border border-slate-200">
          <table className="w-full text-left text-sm">
            <thead className="bg-slate-50 text-slate-500">
              <tr>
                <th className="p-4">教程标题</th>
                <th className="p-4">分类</th>
                <th className="p-4">状态</th>
                <th className="p-4">更新时间</th>
                <th className="p-4">操作</th>
              </tr>
            </thead>

            <tbody>
              {tutorials.map((item) => (
                <tr key={item.title} className="border-t">
                  <td className="p-4 font-bold text-slate-900">{item.title}</td>
                  <td className="p-4">{item.category}</td>
                  <td className="p-4 font-bold text-green-600">{item.status}</td>
                  <td className="p-4">{item.updatedAt}</td>
                  <td className="p-4 text-blue-600">编辑</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <div className="mt-8">
          <a
            href="/tutorials"
            className="rounded-xl bg-blue-600 px-6 py-3 font-bold text-white"
          >
            查看客户教程页
          </a>
        </div>
      </section>
    </main>
  );
}
