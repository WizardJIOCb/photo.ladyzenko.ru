import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/auth";
import LoginForm from "@/components/LoginForm";

export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ invite?: string | string[] }>;
}) {
  if (await getCurrentUser()) redirect("/archive");
  const params = await searchParams;
  const inviteCode = Array.isArray(params.invite) ? params.invite[0] : params.invite;
  return <LoginForm inviteCode={inviteCode || ""} />;
}
