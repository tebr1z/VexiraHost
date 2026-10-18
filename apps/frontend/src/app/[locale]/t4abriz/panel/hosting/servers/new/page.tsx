"use client";

import { useTranslations } from "next-intl";

import { HostingServerForm, toServerPayload } from "@/components/admin/hosting-server-form";
import { PageHeader } from "@/components/ui";
import { bootstrapServerSetup, createHostingServer } from "@/features/admin";
import { useRequireAuth } from "@/features/auth";
import { useRouter } from "@/i18n/navigation";
import { getApiErrorMessage } from "@/lib/api-error";
import { useAuthStore } from "@/stores/auth-store";
import { toast } from "@/stores/toast-store";

export default function NewHostingServerPage(): React.ReactElement | null {
  useRequireAuth();
  const router = useRouter();
  const user = useAuthStore((s) => s.user);
  const isAdmin = user?.role === "admin";
  const ta = useTranslations("admin");
  const tp = useTranslations("admin.pages.hostingServers");
  const tf = useTranslations("admin.forms");
  const tt = useTranslations("admin.toasts");
  const tw = useTranslations("admin.forms.serverWorkflow");

  if (!isAdmin) {
    return <p className="text-on-surface-variant">{tf("hostingServersAdminOnly")}</p>;
  }

  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <PageHeader
        title={tp("addTitle")}
        description={tw("createHint")}
        breadcrumbs={[
          { label: ta("breadcrumb.admin"), href: "/t4abriz/panel" },
          { label: ta("nav.hostingServers"), href: "/t4abriz/panel/hosting/servers" },
          { label: ta("breadcrumb.new") },
        ]}
      />

      <HostingServerForm
        submitLabel={tf("saveServer")}
        onSubmit={async (values) => {
          const server = await createHostingServer(
            toServerPayload(values) as Parameters<typeof createHostingServer>[0],
          );
          toast(tt("hostingServerSaved"), "success");
          if (values.deployNodeEnabled && values.setupAfterSave) {
            try {
              const { jobId } = await bootstrapServerSetup(server.id);
              router.push(
                `/t4abriz/panel/hosting/servers/${server.id}/setup?jobId=${encodeURIComponent(jobId)}`,
              );
            } catch (error) {
              // The server is already saved. Do not retry creation if SSH setup fails.
              toast(getApiErrorMessage(error, tw("setupStartFailed")), "error");
              router.push(`/t4abriz/panel/hosting/servers/${server.id}/setup`);
            }
            return;
          }
          router.push(`/t4abriz/panel/hosting/servers/${server.id}`);
        }}
      />
    </div>
  );
}
