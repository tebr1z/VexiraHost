import { redirect } from "next/navigation";

export default function InstancesRedirectPage(): never {
  redirect("/dashboard/servers");
}
