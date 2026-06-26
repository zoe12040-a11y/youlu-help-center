import { PrismaClient } from "@prisma/client";
import bcrypt from "bcryptjs";

const prisma = new PrismaClient();

const faqs = [
  {
    question: "机器无法开机怎么办？",
    answer:
      "请先确认设备电量是否充足，急停按钮是否解除，整车电源是否打开。如果长时间未使用，请先充电后再尝试开机。",
    category: "开机问题",
    sortOrder: 1,
  },
  {
    question: "机器无法充电怎么办？",
    answer:
      "请检查充电区域是否通畅，充电桩是否通电，设备是否正确停靠到充电位置。如多次无法充电，请提交售后工单。",
    category: "充电问题",
    sortOrder: 2,
  },
  {
    question: "机器无法返航怎么办？",
    answer:
      "请确认设备在线、定位正常、返航路线没有障碍物，充电桩或停靠点周边环境没有被移动。如仍无法返航，请联系售后。",
    category: "任务问题",
    sortOrder: 3,
  },
  {
    question: "任务下发失败怎么办？",
    answer:
      "请检查设备是否在线，网络是否正常，任务区域是否配置完整。如果设备正在执行其他任务，可先暂停后重新下发。",
    category: "任务问题",
    sortOrder: 4,
  },
  {
    question: "APP 登录失败怎么办？",
    answer:
      "请确认账号和密码是否正确，账号是否已启用，网络是否正常。如为子账号，请联系管理员确认权限配置。",
    category: "APP 问题",
    sortOrder: 5,
  },
  {
    question: "什么时候需要提交售后工单？",
    answer:
      "当客户通过教程和 FAQ 仍无法解决问题，或设备影响正常清扫任务时，应提交售后工单，便于售后人员跟进处理。",
    category: "售后流程",
    sortOrder: 6,
  },
  {
    question: "设备显示屏没有反应怎么办？",
    answer:
      "请检查主机电源是否打开，屏幕线缆是否松动。如屏幕完全无显示，请先重启设备一次；如重启后仍无反应，请提交售后工单。",
    category: "硬件问题",
    sortOrder: 7,
  },
  {
    question: "机器在执行任务时突然停止怎么办？",
    answer:
      "设备在任务过程中遇到障碍物或紧急停止信号时会自动暂停。请检查行驶路线是否有临时障碍、急停按钮是否被触发，排除后可在 APP 中重新下发任务。",
    category: "任务问题",
    sortOrder: 8,
  },
  {
    question: "设备加水后仍提示水量不足怎么办？",
    answer:
      "请确认水箱盖已拧紧，水位传感器连接是否正常。可尝试重启设备后重新检测水位；如多次提示，请提交售后工单让技术人员检测传感器。",
    category: "硬件问题",
    sortOrder: 9,
  },
  {
    question: "如何查看我的工单处理进度？",
    answer:
      "登录客户帮助中心后，点击「我的工单」即可查看历史工单的状态（待处理 / 处理中 / 已解决），以及售后人员的处理备注。",
    category: "售后流程",
    sortOrder: 10,
  },
];

async function main() {
  const hashedPassword = await bcrypt.hash("123456", 10);

  await prisma.user.upsert({
    where: { phone: "admin" },
    update: { name: "售后管理员", password: hashedPassword, role: "admin" },
    create: {
      name: "售后管理员",
      phone: "admin",
      password: hashedPassword,
      role: "admin",
    },
  });

  await prisma.user.upsert({
    where: { phone: "customer" },
    update: { name: "测试客户", password: hashedPassword, role: "customer" },
    create: {
      name: "测试客户",
      phone: "customer",
      password: hashedPassword,
      role: "customer",
    },
  });

  for (const faq of faqs) {
    await prisma.faq.create({ data: faq });
  }

  console.log("✅ 测试账号已创建：");
  console.log("   管理员：admin / 123456");
  console.log("   客户：customer / 123456");
  console.log(`✅ 已写入 ${faqs.length} 条 FAQ 数据`);
}

main()
  .catch((e) => {
    console.error("Seed 失败：", e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
