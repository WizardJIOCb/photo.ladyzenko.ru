export type User = { id: string; name: string; email: string; role: string; avatarColor: string; createdAt?: string; _count?: { assets: number } };
export type Asset = {
  id: string; type: "photo" | "video" | "file"; originalName: string; storageName: string; thumbnailName: string | null;
  mimeType: string; size: number; width: number | null; height: number | null; title: string | null; description: string | null;
  takenAt: string | null; uploadedAt: string; favorite: boolean; trashed: boolean; uploader: Pick<User, "id" | "name" | "avatarColor">;
  folderId: string | null; albums: { albumId: string }[];
};
export type Album = {
  id: string; title: string; description: string | null; color: string; createdAt: string; updatedAt: string;
  owner: Pick<User, "id" | "name" | "avatarColor">; assets: { asset: Asset }[]; _count: { assets: number };
};
export type Folder = { id: string; name: string; parentId?: string | null; _count?: { assets: number } };
