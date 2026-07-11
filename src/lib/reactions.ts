import { z } from "zod";

export const reactionEmojis = ["❤️", "👍", "😂", "😮", "😢", "🔥"] as const;
export const reactionSchema = z.object({ emoji: z.enum(reactionEmojis) });

export const reactionSelect = {
  id: true,
  emoji: true,
  userId: true,
  user: { select: { id: true, name: true, avatarColor: true } },
} as const;
