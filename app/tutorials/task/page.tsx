import { prisma } from "../../../lib/prisma";

export const dynamic = "force-dynamic"; // render at request time, not build time
import HelpfulFeedback from "../_components/HelpfulFeedback";

export default async function TutorialTaskPage() {
  const videos = await prisma.video.findMany({ where: { category: "任务下发" }, orderBy: { createdAt: "asc" } });

  return (
    <main className="min-h-screen bg-slate-100 px-6 py-10 text-slate-900">
      <section className="mx-auto max-w-4xl rounded-3xl bg-white p-8 shadow-sm">
        <p className="text-sm text-slate-400">客户中心 / 操作教程 / 任务下发</p>

        <h1 className="mt-5 text-3xl font-bold text-blue-700">
          任务下发 &amp; 任务管理
        </h1>

        <p className="mt-4 leading-7 text-slate-600">
          指导客户通过 APP 下发清扫任务、切换任务状态、暂停和查看任务执行进度。
        </p>

        <div className="mt-8">
          <h2 className="text-2xl font-bold text-slate-900">视频教学</h2>
          <p className="mt-3 text-sm text-slate-500">
            请按顺序观看视频，再结合下方操作步骤完成现场操作。
          </p>

          {videos.length === 0 ? (
            <div className="mt-5 rounded-2xl border border-dashed border-slate-300 p-8 text-center">
              <p className="text-slate-500">暂无匹配的视频文件。</p>
            </div>
          ) : (
            <div className="mt-5 space-y-6">
              {videos.map((video, i) => (
                <div key={video.url} className="rounded-3xl bg-slate-900 p-4">
                  <p className="mb-4 font-bold text-white">
                    {i + 1}. {video.name}
                  </p>
                  <video
                    controls
                    preload="none"
                    className="w-full rounded-2xl bg-black"
                    src={video.url}
                  >
                    您的浏览器不支持视频播放。
                  </video>
                </div>
              ))}
            </div>
          )}
        </div>

        <div className="mt-8 rounded-2xl bg-blue-50 p-6">
          <p className="font-bold text-blue-700">适用场景</p>
          <p className="mt-3 leading-7 text-slate-700">
            适用于需要在 APP 中为 AI130 下发、切换或暂停清扫任务的现场操作人员和物业管理人员。
          </p>
        </div>

        <div className="mt-8">
          <h2 className="text-2xl font-bold text-slate-900">操作步骤</h2>

          <ol className="mt-5 space-y-4">
            <li className="rounded-2xl bg-slate-50 p-5">
              <p className="font-bold text-blue-600">步骤 1</p>
              <p className="mt-2 leading-7 text-slate-700">
                确认设备已完成开机部署，处于待机或自动充电状态，并在 APP 中显示在线。
              </p>
            </li>
            <li className="rounded-2xl bg-slate-50 p-5">
              <p className="font-bold text-blue-600">步骤 2</p>
              <p className="mt-2 leading-7 text-slate-700">
                打开手机 APP，进入设备详情页面的「任务管理」界面。
              </p>
            </li>
            <li className="rounded-2xl bg-slate-50 p-5">
              <p className="font-bold text-blue-600">步骤 3</p>
              <p className="mt-2 leading-7 text-slate-700">
                选择对应的清扫区域和任务类型，确认路线配置完整后点击「下发任务」。
              </p>
            </li>
            <li className="rounded-2xl bg-slate-50 p-5">
              <p className="font-bold text-blue-600">步骤 4</p>
              <p className="mt-2 leading-7 text-slate-700">
                观察设备是否正常启动并开始执行任务，HMI 应显示任务执行状态。
              </p>
            </li>
            <li className="rounded-2xl bg-slate-50 p-5">
              <p className="font-bold text-blue-600">步骤 5</p>
              <p className="mt-2 leading-7 text-slate-700">
                任务执行中如需暂停，在 APP 中点击「暂停」；如需切换任务，选择新任务后下发即可。
              </p>
            </li>
            <li className="rounded-2xl bg-slate-50 p-5">
              <p className="font-bold text-blue-600">步骤 6</p>
              <p className="mt-2 leading-7 text-slate-700">
                任务完成后，设备将自动返航充电或继续待机，可在 APP 中查看任务执行记录。
              </p>
            </li>
          </ol>
        </div>

        <div className="mt-8 rounded-2xl bg-orange-50 p-6">
          <p className="font-bold text-orange-700">注意事项</p>
          <p className="mt-3 leading-7 text-slate-700">
            下发任务前请确认设备电量充足且在线。如果设备正在执行其他任务，请先暂停后再切换或重新下发。
            任务区域配置有误会导致下发失败，如多次失败请检查路线配置或提交售后工单。
          </p>
        </div>

        <div className="mt-8 flex flex-wrap gap-4">
          <a
            href="/tutorials"
            className="rounded-xl border border-slate-200 bg-white px-6 py-3 font-bold text-slate-700"
          >
            返回教程中心
          </a>

          <a
            href="/faq"
            className="rounded-xl border border-blue-200 bg-white px-6 py-3 font-bold text-blue-600"
          >
            查看常见问题
          </a>

          <a
            href="/tickets"
            className="rounded-xl bg-blue-600 px-6 py-3 font-bold text-white"
          >
            提交工单
          </a>
        </div>
        <HelpfulFeedback slug="task" />
      </section>
    </main>
  );
}
