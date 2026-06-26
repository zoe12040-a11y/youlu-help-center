import { getVideosBySlug } from "../../../lib/getVideos";
import HelpfulFeedback from "../_components/HelpfulFeedback";

export default function TutorialReturnPage() {
  const videos = getVideosBySlug("return");

  return (
    <main className="min-h-screen bg-slate-100 px-6 py-10 text-slate-900">
      <section className="mx-auto max-w-4xl rounded-3xl bg-white p-8 shadow-sm">
        <p className="text-sm text-slate-400">客户中心 / 操作教程 / 返航操作</p>

        <h1 className="mt-5 text-3xl font-bold text-blue-700">
          如何让机器返航
        </h1>

        <p className="mt-4 leading-7 text-slate-600">
          当设备完成任务或需要回到充电区域时，可通过返航功能让设备返回。
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
            适用于客户现场操作人员、物业管理人员、售后协助人员学习 AI130 日常使用流程。
          </p>
        </div>

        <div className="mt-8">
          <h2 className="text-2xl font-bold text-slate-900">操作步骤</h2>

          <ol className="mt-5 space-y-4">
            <li className="rounded-2xl bg-slate-50 p-5">
              <p className="font-bold text-blue-600">步骤 1</p>
              <p className="mt-2 leading-7 text-slate-700">确认设备在线。</p>
            </li>
            <li className="rounded-2xl bg-slate-50 p-5">
              <p className="font-bold text-blue-600">步骤 2</p>
              <p className="mt-2 leading-7 text-slate-700">
                进入设备控制或任务页面。
              </p>
            </li>
            <li className="rounded-2xl bg-slate-50 p-5">
              <p className="font-bold text-blue-600">步骤 3</p>
              <p className="mt-2 leading-7 text-slate-700">
                根据现场情况选择暂停、切换任务或返航。
              </p>
            </li>
            <li className="rounded-2xl bg-slate-50 p-5">
              <p className="font-bold text-blue-600">步骤 4</p>
              <p className="mt-2 leading-7 text-slate-700">点击返航按钮。</p>
            </li>
            <li className="rounded-2xl bg-slate-50 p-5">
              <p className="font-bold text-blue-600">步骤 5</p>
              <p className="mt-2 leading-7 text-slate-700">
                观察设备路线是否正常。
              </p>
            </li>
            <li className="rounded-2xl bg-slate-50 p-5">
              <p className="font-bold text-blue-600">步骤 6</p>
              <p className="mt-2 leading-7 text-slate-700">
                确认设备回到指定位置或充电区域。
              </p>
            </li>
          </ol>
        </div>

        <div className="mt-8 rounded-2xl bg-orange-50 p-6">
          <p className="font-bold text-orange-700">注意事项</p>
          <p className="mt-3 leading-7 text-slate-700">
            如果返航失败，请检查返航路线是否被障碍物遮挡，充电桩周边环境是否发生变化。
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
        <HelpfulFeedback slug="return" />
      </section>
    </main>
  );
}
