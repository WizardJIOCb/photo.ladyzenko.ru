import { NextResponse } from "next/server";
import { requireUser } from "@/lib/auth";

export async function GET() {
  try {
    await requireUser();
    return NextResponse.json({ code: process.env.FAMILY_INVITE_CODE || "" });
  } catch {
    return NextResponse.json({ error: "Войдите в архив" }, { status: 401 });
  }
}
