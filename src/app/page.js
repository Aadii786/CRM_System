import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/auth/authService";

export default async function RootPage() {
  const user = await getCurrentUser();
  redirect(user ? "/dashboard" : "/login");
}
