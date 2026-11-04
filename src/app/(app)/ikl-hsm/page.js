import { redirect } from "next/navigation";

// Old address of the IKL dashboard; kept so bookmarks and links still work.
export default function OldIklDashboardRedirect() {
  redirect("/ikl");
}
