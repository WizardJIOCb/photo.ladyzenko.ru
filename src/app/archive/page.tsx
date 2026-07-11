import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/auth";
import ArchiveApp from "@/components/ArchiveApp";

export default async function ArchivePage() {
  const user = await getCurrentUser();
  if (!user) redirect("/login");
  return <ArchiveApp initialUser={user} />;
}
