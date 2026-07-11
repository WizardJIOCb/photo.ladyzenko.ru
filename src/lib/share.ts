import "server-only";
import { createHash } from "crypto";
import { db } from "@/lib/db";

export function hashShareToken(token: string) {
  return createHash("sha256").update(token).digest("hex");
}

export async function findActiveShare(token: string) {
  if (!/^[A-Za-z0-9_-]{40,80}$/.test(token)) return null;
  return db.shareLink.findFirst({
    where: {
      tokenHash: hashShareToken(token),
      revokedAt: null,
      asset: { trashed: false },
    },
    include: { asset: true },
  });
}
