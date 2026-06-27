import { PrismaClient } from "@prisma/client";
import bcrypt from "bcryptjs";

const prisma = new PrismaClient();

// ── Supabase Storage base URL ─────────────────────────────────────────────────
const SUPABASE_URL = process.env.SUPABASE_URL ?? "https://yokyvnurtudaqviodizu.supabase.co";
const BASE = `${SUPABASE_URL}/storage/v1/object/public/videos`;
const sv = (...parts: string[]) => `${BASE}/${parts.join("/")}`;

// ── FAQ data ──────────────────────────────────────────────────────────────────
const faqs = [
  { question: "机器无法开机怎么办？", answer: "请先确认设备电量是否充足，急停按钮是否解除，整车电源是否打开。如果长时间未使用，请先充电后再尝试开机。", category: "开机问题", sortOrder: 1 },
  { question: "机器无法充电怎么办？", answer: "请检查充电区域是否通畅，充电桩是否通电，设备是否正确停靠到充电位置。如多次无法充电，请提交售后工单。", category: "充电问题", sortOrder: 2 },
  { question: "机器无法返航怎么办？", answer: "请确认设备在线、定位正常、返航路线没有障碍物，充电桩或停靠点周边环境没有被移动。如仍无法返航，请联系售后。", category: "任务问题", sortOrder: 3 },
  { question: "任务下发失败怎么办？", answer: "请检查设备是否在线，网络是否正常，任务区域是否配置完整。如果设备正在执行其他任务，可先暂停后重新下发。", category: "任务问题", sortOrder: 4 },
  { question: "APP 登录失败怎么办？", answer: "请确认账号和密码是否正确，账号是否已启用，网络是否正常。如为子账号，请联系管理员确认权限配置。", category: "APP 问题", sortOrder: 5 },
  { question: "什么时候需要提交售后工单？", answer: "当客户通过教程和 FAQ 仍无法解决问题，或设备影响正常清扫任务时，应提交售后工单，便于售后人员跟进处理。", category: "售后流程", sortOrder: 6 },
  { question: "设备显示屏没有反应怎么办？", answer: "请检查主机电源是否打开，屏幕线缆是否松动。如屏幕完全无显示，请先重启设备一次；如重启后仍无反应，请提交售后工单。", category: "硬件问题", sortOrder: 7 },
  { question: "机器在执行任务时突然停止怎么办？", answer: "设备在任务过程中遇到障碍物或紧急停止信号时会自动暂停。请检查行驶路线是否有临时障碍、急停按钮是否被触发，排除后可在 APP 中重新下发任务。", category: "任务问题", sortOrder: 8 },
  { question: "设备加水后仍提示水量不足怎么办？", answer: "请确认水箱盖已拧紧，水位传感器连接是否正常。可尝试重启设备后重新检测水位；如多次提示，请提交售后工单让技术人员检测传感器。", category: "硬件问题", sortOrder: 9 },
  { question: "如何查看我的工单处理进度？", answer: "登录客户帮助中心后，点击「我的工单」即可查看历史工单的状态（待处理 / 处理中 / 已解决），以及售后人员的处理备注。", category: "售后流程", sortOrder: 10 },
];

// ── Video data — Supabase Storage URLs ───────────────────────────────────────
const videos = [
  // Root-level video_ files
  { title: "开机操作",             category: "开机部署", fileUrl: sv("video_start_1.mp4"),          description: "" },
  { title: "急停按钮使用",         category: "开机部署", fileUrl: sv("video_emergency_stop.mp4"),    description: "" },
  { title: "切换前进挡位（一挡）", category: "开机部署", fileUrl: sv("video_gear_1.mp4"),            description: "" },
  { title: "切换前进挡位（二挡）", category: "开机部署", fileUrl: sv("video_gear_2.mp4"),            description: "" },
  { title: "人工清扫模式",         category: "开机部署", fileUrl: sv("video_manual_clean.mp4"),      description: "" },
  { title: "倒车操作",             category: "开机部署", fileUrl: sv("video_reverse.mp4"),           description: "" },
  { title: "充电操作演示",         category: "充电操作", fileUrl: sv("video_charging.mp4"),          description: "" },
  { title: "加水操作演示",         category: "加水操作", fileUrl: sv("video_water.mp4"),             description: "" },
  { title: "倾倒垃圾操作",         category: "倾倒垃圾", fileUrl: sv("video_dump_trash.mp4"),        description: "" },
  { title: "垃圾车复位操作",       category: "倾倒垃圾", fileUrl: sv("video_trash_reset.mp4"),       description: "" },
  { title: "APP 任务管理",         category: "任务下发", fileUrl: sv("video_task_manage.mp4"),       description: "" },
  { title: "下发任务",             category: "任务下发", fileUrl: sv("video_task_send.mp4"),         description: "" },
  { title: "自动充电状态下发任务", category: "任务下发", fileUrl: sv("video_task_auto_charge.mp4"),  description: "" },
  { title: "待机状态下发任务",     category: "任务下发", fileUrl: sv("video_task_standby.mp4"),      description: "" },
  { title: "暂停操作",             category: "任务下发", fileUrl: sv("video_pause.mp4"),             description: "" },
  { title: "返航操作",             category: "返航操作", fileUrl: sv("video_return.mp4"),            description: "" },
  { title: "APP 切换任务与返航",   category: "返航操作", fileUrl: sv("video_app_switch_return.mp4"), description: "" },

  // 01拆箱及确认
  { title: "开机1",              category: "开机部署", fileUrl: sv("01拆箱及确认", "开机1.mp4"),        description: "拆箱及确认" },
  { title: "充电1",              category: "充电操作", fileUrl: sv("01拆箱及确认", "充电1.mp4"),        description: "拆箱及确认" },
  { title: "加水1",              category: "加水操作", fileUrl: sv("01拆箱及确认", "加水1.mp4"),        description: "拆箱及确认" },
  { title: "倾倒垃圾",           category: "倾倒垃圾", fileUrl: sv("01拆箱及确认", "倾倒垃圾.mp4"),    description: "拆箱及确认" },
  { title: "垃圾车复位",         category: "倾倒垃圾", fileUrl: sv("01拆箱及确认", "垃圾车复位.mp4"),  description: "拆箱及确认" },
  { title: "急停按钮使用（拆箱）", category: "开机部署", fileUrl: sv("01拆箱及确认", "急停按钮使用.mp4"), description: "拆箱及确认" },
  { title: "刷卡关机",           category: "开机部署", fileUrl: sv("01拆箱及确认", "刷卡关机.mp4"),    description: "拆箱及确认" },

  // 02开机部署
  { title: "开机（部署）",   category: "开机部署", fileUrl: sv("02开机部署", "开机.mp4"),         description: "开机部署" },
  { title: "人工清扫（部署）", category: "开机部署", fileUrl: sv("02开机部署", "人工清扫模式.mp4"), description: "开机部署" },
  { title: "倒车（部署）",   category: "开机部署", fileUrl: sv("02开机部署", "倒车.mp4"),         description: "开机部署" },
  { title: "切换前进2挡",    category: "开机部署", fileUrl: sv("02开机部署", "切换前进2挡.mp4"),  description: "开机部署" },
  { title: "切换前进挡位",   category: "开机部署", fileUrl: sv("02开机部署", "切换前进挡位.mp4"), description: "开机部署" },

  // 03任务下发及查看
  { title: "APP任务管理（任务）",       category: "任务下发", fileUrl: sv("03任务下发及查看", "APP任务管理.mp4"),              description: "任务下发及查看" },
  { title: "APP切换任务暂停返航",       category: "返航操作", fileUrl: sv("03任务下发及查看", "APP切换任务、暂停、返航.mp4"),  description: "任务下发及查看" },
  { title: "下发任务（任务）",          category: "任务下发", fileUrl: sv("03任务下发及查看", "下发任务.mp4"),                description: "任务下发及查看" },
  { title: "待机状态任务下发",          category: "任务下发", fileUrl: sv("03任务下发及查看", "待机状态 - 任务下发.mp4"),      description: "任务下发及查看" },
  { title: "暂停（任务）",              category: "任务下发", fileUrl: sv("03任务下发及查看", "暂停.mp4"),                    description: "任务下发及查看" },
  { title: "自动充电状态任务下发",      category: "任务下发", fileUrl: sv("03任务下发及查看", "自动充电状态 - 任务下发.mp4"), description: "任务下发及查看" },
  { title: "返航（任务）",              category: "返航操作", fileUrl: sv("03任务下发及查看", "返航.mp4"),                    description: "任务下发及查看" },

  // 04APP业务视图
  { title: "APP业务视图", category: "APP业务视图", fileUrl: sv("04APP业务视图", "APP业务视图.mp4"), description: "APP业务视图" },
  { title: "养成计划",    category: "APP业务视图", fileUrl: sv("04APP业务视图", "养成计划.mp4"),    description: "APP业务视图" },
  { title: "问题反馈",    category: "APP业务视图", fileUrl: sv("04APP业务视图", "问题反馈.mp4"),    description: "APP业务视图" },

  // 05APP配置变更
  { title: "APP配置变更", category: "APP配置变更", fileUrl: sv("05APP配置变更", "APP配置变更.mp4"), description: "APP配置变更" },
  { title: "尊享版",      category: "APP配置变更", fileUrl: sv("05APP配置变更", "尊享版.mp4"),      description: "APP配置变更" },

  // 06APP登录及管理
  { title: "APP登录",         category: "APP登录及管理", fileUrl: sv("06APP登录及管理", "APP登录.mp4"),         description: "APP登录及管理" },
  { title: "切换语言",        category: "APP登录及管理", fileUrl: sv("06APP登录及管理", "切换语言.mp4"),        description: "APP登录及管理" },
  { title: "反馈工单查看",    category: "APP登录及管理", fileUrl: sv("06APP登录及管理", "反馈工单查看.mp4"),    description: "APP登录及管理" },
  { title: "子账户管理",      category: "APP登录及管理", fileUrl: sv("06APP登录及管理", "子账户管理.mp4"),      description: "APP登录及管理" },
  { title: "所有反馈工单查看", category: "APP登录及管理", fileUrl: sv("06APP登录及管理", "所有反馈工单查看.mp4"), description: "APP登录及管理" },
  { title: "账户通知配置",    category: "APP登录及管理", fileUrl: sv("06APP登录及管理", "账户通知配置.mp4"),    description: "APP登录及管理" },
];

// ── Seed ──────────────────────────────────────────────────────────────────────
async function main() {
  const hashedPassword = await bcrypt.hash("123456", 10);

  await prisma.user.upsert({
    where: { phone: "admin" },
    update: { name: "售后管理员", password: hashedPassword, role: "admin" },
    create: { name: "售后管理员", phone: "admin", password: hashedPassword, role: "admin" },
  });

  await prisma.user.upsert({
    where: { phone: "customer" },
    update: { name: "测试客户", password: hashedPassword, role: "customer" },
    create: { name: "测试客户", phone: "customer", password: hashedPassword, role: "customer" },
  });

  // FAQs — idempotent: skip if question already exists
  let faqCreated = 0;
  for (const faq of faqs) {
    const existing = await prisma.faq.findFirst({ where: { question: faq.question } });
    if (!existing) { await prisma.faq.create({ data: faq }); faqCreated++; }
  }

  // Videos — idempotent: upsert by title+category to handle URL changes
  let videoCreated = 0, videoUpdated = 0;
  for (const video of videos) {
    const existing = await prisma.video.findFirst({
      where: { title: video.title, category: video.category },
    });
    if (existing) {
      if (existing.fileUrl !== video.fileUrl) {
        await prisma.video.update({ where: { id: existing.id }, data: { fileUrl: video.fileUrl } });
        videoUpdated++;
      }
    } else {
      await prisma.video.create({ data: video });
      videoCreated++;
    }
  }

  console.log("✅ 账号：admin / 123456（管理员）  customer / 123456（客户）");
  console.log(`✅ FAQ：${faqCreated} 条新建`);
  console.log(`✅ 视频：${videoCreated} 条新建，${videoUpdated} 条更新 URL`);
}

main()
  .catch((e) => { console.error("Seed 失败：", e); process.exit(1); })
  .finally(() => prisma.$disconnect());
