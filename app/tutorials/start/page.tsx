import { getVideosBySlug } from "../../../lib/getVideos";
import HelpfulFeedback from "../_components/HelpfulFeedback";

export default function TutorialStartPage() {
  const videos = getVideosBySlug("start");

  return (
    <main className="min-h-screen bg-slate-100 px-6 py-10 text-slate-900">
      <section className="mx-auto max-w-4xl rounded-3xl bg-white p-8 shadow-sm">
        <p className="text-sm text-slate-400">客户中心 / 操作教程 / 开机部署</p>

        <h1 className="mt-5 text-3xl font-bold text-blue-700">
          开机 &amp; 部署操作
        </h1>

        <p className="mt-4 leading-7 text-slate-600">
          指导客户完成 AI130 机器的首次开机、挡位切换和自动部署流程，确保设备正常进入工作状态。
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
                    preload="metadata"
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
            适用于客户现场操作人员、物业管理人员、售后协助人员学习 AI130
            开机和自动部署流程。
          </p>
        </div>

        <div className="mt-8">
          <h2 className="text-2xl font-bold text-slate-900">操作步骤</h2>

          <ol className="mt-5 space-y-4">
            <li className="rounded-2xl bg-slate-50 p-5">
              <p className="font-bold text-blue-600">步骤 1</p>
              <p className="mt-2 leading-7 text-slate-700">
                确认设备周边环境安全，无障碍物遮挡行驶路线。
              </p>
            </li>
            <li className="rounded-2xl bg-slate-50 p-5">
              <p className="font-bold text-blue-600">步骤 2</p>
              <p className="mt-2 leading-7 text-slate-700">
                确认急停按钮已解除（顺时针旋转弹起），整车电源开关处于开启状态。
              </p>
            </li>
            <li className="rounded-2xl bg-slate-50 p-5">
              <p className="font-bold text-blue-600">步骤 3</p>
              <p className="mt-2 leading-7 text-slate-700">
                等待系统启动完成，屏幕（HMI）显示「准备就绪等待部署」状态。
              </p>
            </li>
            <li className="rounded-2xl bg-slate-50 p-5">
              <p className="font-bold text-blue-600">步骤 4</p>
              <p className="mt-2 leading-7 text-slate-700">
                打开手机 APP，确认设备已在线，进入自动化部署流程。
              </p>
            </li>
            <li className="rounded-2xl bg-slate-50 p-5">
              <p className="font-bold text-blue-600">步骤 5</p>
              <p className="mt-2 leading-7 text-slate-700">
                部署完成后，HMI 显示「部署完成」，设备进入待机状态，可下发任务。
              </p>
            </li>
            <li className="rounded-2xl bg-slate-50 p-5">
              <p className="font-bold text-blue-600">步骤 6</p>
              <p className="mt-2 leading-7 text-slate-700">
                如需手动驾驶设备，切换至手动模式，使用挡位控制前进、倒车。
              </p>
            </li>
          </ol>
        </div>

        <div className="mt-8 rounded-2xl bg-orange-50 p-6">
          <p className="font-bold text-orange-700">注意事项</p>
          <p className="mt-3 leading-7 text-slate-700">
            首次开机前请确认设备电量充足。急停按钮在紧急情况下可随时按下使设备立即停止，
            使用结束后须顺时针旋转解除，否则设备无法正常启动。
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
        <HelpfulFeedback slug="start" />
      </section>
    </main>
  );
}
