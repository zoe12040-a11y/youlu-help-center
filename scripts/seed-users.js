const { PrismaClient } = require("@prisma/client");
const bcrypt = require("bcryptjs");

const prisma = new PrismaClient();

async function main() {
  const hashedPassword = await bcrypt.hash("123456", 10);

  await prisma.user.upsert({
    where: {
      phone: "admin",
    },
    update: {
      name: "售后管理员",
      password: hashedPassword,
      role: "admin",
    },
    create: {
      name: "售后管理员",
      phone: "admin",
      password: hashedPassword,
      role: "admin",
    },
  });

  await prisma.user.upsert({
    where: {
      phone: "customer",
    },
    update: {
      name: "测试客户",
      password: hashedPassword,
      role: "customer",
    },
    create: {
      name: "测试客户",
      phone: "customer",
      password: hashedPassword,
      role: "customer",
    },
  });

  console.log("默认账号密码已加密");
  console.log("管理员账号：admin / 123456");
  console.log("客户账号：customer / 123456");
}

main()
  .catch((error) => {
    console.error("创建默认账号失败：", error);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
