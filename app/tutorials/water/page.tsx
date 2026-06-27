import { prisma } from "../../../lib/prisma";
import HelpfulFeedback from "../_components/HelpfulFeedback";

export default async function TutorialWaterPage() {
  const videos = await prisma.video.findMany({ where: { category: "加水操作" }, orderBy: { createdAt: "asc" } });

  return (
    <main className="min-h-screen bg-slate-100 px-6 py-10 text-slate-900">
      <section className="mx-auto max-w-4xl rounded-3xl bg-white p-8 shadow-sm">
        <p className="text-sm text-slate-400">客户中心 / 操作教程 / 加水操作</p>

        <h1 className="mt-5 text-3xl font-bold text-blue-700">
          如何为机器加水
        </h1>

        <p className="mt-4 leading-7 text-slate-600">
          指导客户正确为 AI130 水箱补水，保证清扫时有充足的水量正常工作。
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
            适用于客户现场操作人员和物业管理人员，在设备提示水量不足或日常维护时进行补水操作。
          </p>
        </div>

        <div className="mt-8">
          <h2 className="text-2xl font-bold text-slate-900">操作步骤</h2>

          <ol className="mt-5 space-y-4">
            <li className="rounded-2xl bg-slate-50 p-5">
              <p className="font-bold text-blue-600">步骤 1</p>
              <p className="mt-2 leading-7 text-slate-700">
                确认设备已停止任务或处于待机状态，避免补水时设备意外启动。
              </p>
            </li>
            <li className="rounded-2xl bg-slate-50 p-5">
              <p className="font-bold text-blue-600">步骤 2</p>
              <p className="mt-2 leading-7 text-slate-700">
                找到设备水箱位置，打开水箱盖。
              </p>
            </li>
            <li className="rounded-2xl bg-slate-50 p-5">
              <p className="font-bold text-blue-600">步骤 3</p>
              <p className="mt-2 leading-7 text-slate-700">
                向水箱中加入清水，水位不超过最高水位线，避免溢出。
              </p>
            </li>
            <li className="rounded-2xl bg-slate-50 p-5">
              <p className="font-bold text-blue-600">步骤 4</p>
              <p className="mt-2 leading-7 text-slate-700">
                拧紧水箱盖，确保密封良好，防止行驶中漏水。
              </p>
            </li>
            <li className="rounded-2xl bg-slate-50 p-5">
              <p className="font-bold text-blue-600">步骤 5</p>
              <p className="mt-2 leading-7 text-slate-700">
                检查屏幕或 APP 中的水位显示是否恢复正常，确认补水成功后再下发任务。
              </p>
            </li>
          </ol>
        </div>

        <div className="mt-8 rounded-2xl bg-orange-50 p-6">
          <p className="font-bold text-orange-700">注意事项</p>
          <p className="mt-3 leading-7 text-slate-700">
            请使用干净清水，勿添加含腐蚀性或强挥发性的清洁剂。若加水后仍提示水量不足，
            请检查水位传感器连接是否正常，如问题持续请提交售后工单。
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
        <HelpfulFeedback slug="water" />
      </section>
    </main>
  );
}
