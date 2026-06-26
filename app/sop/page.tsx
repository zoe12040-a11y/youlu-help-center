export default function SOPPage() {
  const steps = [
    {
      step: "第一步",
      title: "查阅使用教程",
      desc: "客户遇到设备问题时，首先前往「使用教程」查看对应操作视频，包括开机、充电、加水、任务下发、返航等标准流程。",
      link: "/tutorials",
      linkText: "前往使用教程",
      color: "blue",
    },
    {
      step: "第二步",
      title: "查询常见问题 FAQ",
      desc: "若教程无法解决，请前往「常见问题」页面检索相关问题的处理建议，大多数现场问题可在此找到标准答案。",
      link: "/faq",
      linkText: "前往常见问题",
      color: "sky",
    },
    {
      step: "第三步",
      title: "提交售后工单",
      desc: "如果 FAQ 仍无法解决问题，或设备已影响正常清扫任务，请登录后提交售后工单，填写设备信息和问题描述，售后人员将跟进处理。",
      link: "/tickets",
      linkText: "提交工单",
      color: "orange",
    },
    {
      step: "第四步",
      title: "查看工单处理进度",
      desc: "工单提交后，可在「我的工单」页面实时查看工单状态（待处理 / 处理中 / 已解决），以及售后人员的处理备注。",
      link: "/my-tickets",
      linkText: "查看我的工单",
      color: "green",
    },
  ];

  const colorMap: Record<string, { badge: string; title: string; btn: string }> = {
    blue: {
      badge: "bg-blue-50 text-blue-600",
      title: "text-blue-700",
      btn: "bg-blue-600 text-white",
    },
    sky: {
      badge: "bg-sky-50 text-sky-600",
      title: "text-sky-700",
      btn: "bg-sky-600 text-white",
    },
    orange: {
      badge: "bg-orange-50 text-orange-600",
      title: "text-orange-700",
      btn: "bg-orange-500 text-white",
    },
    green: {
      badge: "bg-green-50 text-green-600",
      title: "text-green-700",
      btn: "bg-green-600 text-white",
    },
  };

  return (
    <main className="min-h-screen bg-slate-100 px-6 py-10 text-slate-900">
      <section className="mx-auto max-w-4xl">
        <div className="rounded-3xl bg-white p-8 shadow-sm">
          <p className="text-sm text-slate-400">客户中心 / 售后 SOP</p>

          <h1 className="mt-5 text-3xl font-bold text-blue-700">
            售后服务 SOP 流程
          </h1>

          <p className="mt-3 text-slate-500">
            遇到设备问题时，请按照以下标准流程逐步排查，快速解决现场问题。
          </p>

          <div className="mt-8 flex flex-wrap gap-4">
            <a
              href="/"
              className="rounded-xl border border-slate-200 bg-white px-6 py-3 font-bold text-slate-700"
            >
              返回首页
            </a>

            <a
              href="/faq"
              className="rounded-xl bg-blue-600 px-6 py-3 font-bold text-white"
            >
              查阅常见问题
            </a>
          </div>
        </div>

        <div className="mt-8 space-y-5">
          {steps.map((item) => {
            const c = colorMap[item.color];
            return (
              <div
                key={item.step}
                className="rounded-3xl bg-white p-6 shadow-sm"
              >
                <div className="flex items-start gap-5">
                  <span
                    className={`shrink-0 rounded-full px-4 py-2 text-sm font-bold ${c.badge}`}
                  >
                    {item.step}
                  </span>

                  <div className="flex-1">
                    <h2 className={`text-xl font-bold ${c.title}`}>
                      {item.title}
                    </h2>

                    <p className="mt-3 leading-7 text-slate-600">{item.desc}</p>

                    <a
                      href={item.link}
                      className={`mt-5 inline-block rounded-xl px-5 py-2.5 text-sm font-bold ${c.btn}`}
                    >
                      {item.linkText} →
                    </a>
                  </div>
                </div>
              </div>
            );
          })}
        </div>

        <div className="mt-8 rounded-3xl bg-blue-50 p-6 shadow-sm">
          <h2 className="text-xl font-bold text-blue-700">联系售后说明</h2>

          <p className="mt-3 leading-7 text-slate-600">
            提交工单是最有效的售后联系方式。售后团队将在工单系统内跟进处理，并通过工单备注反馈处理结果，客户可随时查看进度，无需额外等待电话回复。
          </p>

          <div className="mt-5 grid gap-4 md:grid-cols-3">
            <div className="rounded-2xl bg-white p-5">
              <p className="text-sm font-bold text-slate-400">响应时间</p>
              <p className="mt-2 font-bold text-slate-900">工作日 2 小时内</p>
            </div>

            <div className="rounded-2xl bg-white p-5">
              <p className="text-sm font-bold text-slate-400">紧急工单</p>
              <p className="mt-2 font-bold text-slate-900">优先处理</p>
            </div>

            <div className="rounded-2xl bg-white p-5">
              <p className="text-sm font-bold text-slate-400">工单查询</p>
              <p className="mt-2 font-bold text-slate-900">登录后实时查看</p>
            </div>
          </div>
        </div>
      </section>
    </main>
  );
}
