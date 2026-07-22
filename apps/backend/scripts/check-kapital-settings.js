const { PrismaClient } = require("@prisma/client");

async function main() {
  const prisma = new PrismaClient();
  const rows = await prisma.systemSetting.findMany({
    where: {
      key: {
        in: [
          "payment_provider",
          "kapital_environment",
          "kapital_username",
          "kapital_password",
        ],
      },
    },
  });
  console.log("DB settings:");
  for (const row of rows) {
    const value =
      row.key === "kapital_password" ? `[${row.value.length} chars]` : row.value;
    console.log(`  ${row.key} = ${value}`);
  }
  await prisma.$disconnect();
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
