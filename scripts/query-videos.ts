import { PrismaClient } from '@prisma/client';
async function main() {
  const prisma = new PrismaClient();
  const videos = await prisma.video.findMany({ orderBy: { category: 'asc' } });
  console.log(JSON.stringify(videos, null, 2));
  await prisma.$disconnect();
}
main().catch(console.error);
