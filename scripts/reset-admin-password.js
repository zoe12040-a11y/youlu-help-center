/**
 * Emergency admin password reset script.
 *
 * Usage:
 *   node scripts/reset-admin-password.js <new-password> [admin-account]
 *
 * Examples:
 *   node scripts/reset-admin-password.js MyNewPass123
 *   node scripts/reset-admin-password.js MyNewPass123 admin
 *
 * Defaults: account = "admin"
 */

require("dotenv").config();
const { PrismaClient } = require("@prisma/client");
const bcrypt = require("bcryptjs");

const prisma = new PrismaClient();

async function main() {
  const newPassword = process.argv[2];
  const account = process.argv[3] || "admin";

  if (!newPassword) {
    console.error("Usage: node scripts/reset-admin-password.js <new-password> [account]");
    console.error("Example: node scripts/reset-admin-password.js MyNewPass123");
    process.exit(1);
  }

  if (newPassword.length < 6) {
    console.error("Password must be at least 6 characters.");
    process.exit(1);
  }

  const user = await prisma.user.findUnique({ where: { phone: account } });
  if (!user) {
    console.error(`Account "${account}" not found.`);
    process.exit(1);
  }

  if (user.role !== "admin") {
    console.error(`Account "${account}" is not an admin (role: ${user.role}).`);
    process.exit(1);
  }

  const hashed = await bcrypt.hash(newPassword, 10);
  await prisma.user.update({ where: { id: user.id }, data: { password: hashed } });

  console.log(`✅ Password reset successfully.`);
  console.log(`   Account : ${account} (${user.name})`);
  console.log(`   New pass: ${newPassword}`);
  console.log(`\n   Login at: /login`);
}

main()
  .catch((e) => { console.error("Error:", e.message); process.exit(1); })
  .finally(() => prisma.$disconnect());
