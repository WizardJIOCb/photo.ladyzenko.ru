import { hash } from "bcryptjs";
import { NextResponse } from "next/server";
import { z } from "zod";
import { createSession } from "@/lib/auth";
import { db } from "@/lib/db";

const colors = ["#C96E48", "#657B68", "#7D6C9D", "#B28752", "#467B87"];
const schema = z.object({
  name: z.string().trim().min(2).max(60),
  email: z.string().email(),
  password: z.string().min(8).max(100),
  inviteCode: z.string().max(100).optional(),
});

export async function POST(request: Request) {
  const parsed = schema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Заполните имя, email и пароль от 8 символов" },
      { status: 400 },
    );
  }
  const email = parsed.data.email.toLowerCase();
  if (await db.user.findUnique({ where: { email } })) {
    return NextResponse.json({ error: "Этот email уже используется" }, { status: 409 });
  }
  const count = await db.user.count();
  if (count > 0 && parsed.data.inviteCode !== process.env.FAMILY_INVITE_CODE) {
    return NextResponse.json({ error: "Неверный семейный код приглашения" }, { status: 403 });
  }
  const user = await db.user.create({
    data: {
      email,
      name: parsed.data.name,
      passwordHash: await hash(parsed.data.password, 12),
      role: count === 0 ? "admin" : "member",
      avatarColor: colors[count % colors.length],
    },
  });
  if (count === 0) {
    await db.album.create({
      data: {
        title: "Семейная летопись",
        description: "Самые важные моменты нашей семьи",
        ownerId: user.id,
      },
    });
  }
  await createSession(user.id);
  return NextResponse.json({ ok: true });
}
