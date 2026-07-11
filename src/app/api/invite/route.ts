import { NextResponse } from "next/server";
import { requireUser } from "@/lib/auth";

export async function GET() {
  try {
    const user = await requireUser();
    if (user.role !== "admin") return NextResponse.json({ error: "Только хранитель может приглашать участников" }, { status: 403 });
    return NextResponse.json({ code: process.env.FAMILY_INVITE_CODE || "" });
  } catch {
    return NextResponse.json({ error: "Войдите в архив" }, { status: 401 });
  }
}
