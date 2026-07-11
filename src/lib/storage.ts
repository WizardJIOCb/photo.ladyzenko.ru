import "server-only";
import { mkdir } from "fs/promises";
import path from "path";

export function storageRoot() {
  return process.env.STORAGE_DIR
    ? path.resolve(/* turbopackIgnore: true */ process.env.STORAGE_DIR)
    : path.join(process.cwd(), "storage");
}

export async function ensureStorage() {
  const root = storageRoot();
  await Promise.all([
    mkdir(path.join(root, "originals"), { recursive: true }),
    mkdir(path.join(root, "thumbs"), { recursive: true }),
  ]);
  return root;
}

export function safeStoragePath(kind: "originals" | "thumbs", name: string) {
  if (!/^[a-zA-Z0-9_.-]+$/.test(name)) throw new Error("INVALID_PATH");
  return path.join(storageRoot(), kind, name);
}
