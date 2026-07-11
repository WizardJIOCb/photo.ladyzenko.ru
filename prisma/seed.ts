import { PrismaClient } from "@prisma/client";
import { hash } from "bcryptjs";

const db = new PrismaClient();

async function main() {
  const email = (process.env.DEFAULT_ADMIN_EMAIL || "family@example.com").toLowerCase();
  let user = await db.user.findUnique({ where: { email } });
  if (!user) {
    user = await db.user.create({
      data: {
        email,
        name: process.env.DEFAULT_ADMIN_NAME || "Хранитель архива",
        passwordHash: await hash(process.env.DEFAULT_ADMIN_PASSWORD || "family-archive", 12),
        role: "admin",
        avatarColor: "#C96E48",
      },
    });
  }
  const mainAlbum = await db.album.findFirst({ where: { ownerId: user.id, title: "Семейная летопись" } });
  if (!mainAlbum) {
    await db.album.create({
      data: {
        title: "Семейная летопись",
        description: "Главный альбом для самых дорогих моментов",
        ownerId: user.id,
        color: "terracotta",
      },
    });
  }
}

main().finally(() => db.$disconnect());
