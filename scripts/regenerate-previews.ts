import { randomUUID } from "crypto";
import { mkdir } from "fs/promises";
import path from "path";
import { PrismaClient } from "@prisma/client";
import { generateMediaPreview, getMediaDimensions } from "../src/lib/previews";

const db = new PrismaClient();

async function main() {
  const root = path.resolve(process.env.STORAGE_DIR || "./storage");
  const originals = path.join(root, "originals");
  const thumbs = path.join(root, "thumbs");
  await mkdir(thumbs, { recursive: true });

  const assets = await db.asset.findMany({
    where: { thumbnailName: null, type: { in: ["photo", "video"] } },
  });
  let generated = 0;

  for (const asset of assets) {
    const thumbnailName = `${randomUUID()}.webp`;
    const inputPath = path.join(originals, asset.storageName);
    const outputPath = path.join(thumbs, thumbnailName);
    try {
      await generateMediaPreview(inputPath, outputPath, asset.type === "video");
      const dimensions = await getMediaDimensions(inputPath);
      await db.asset.update({
        where: { id: asset.id },
        data: { thumbnailName, ...dimensions },
      });
      generated += 1;
      console.log(`Preview generated: ${asset.originalName}`);
    } catch (error) {
      console.warn(`Preview skipped: ${asset.originalName}`, error);
    }
  }

  console.log(`Done. Generated ${generated} of ${assets.length} missing previews.`);
}

main().finally(() => db.$disconnect());
