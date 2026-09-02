"use client";

import { useParams } from "next/navigation";
import { useTranslations } from "next-intl";
import { useEffect, useState } from "react";

import { HostingServerSetupPanel } from "@/components/admin/hosting-server-setup";
import { PageHeader } from "@/components/ui";
import { getHostingServer, type HostingServer } from "@/features/admin";
import { useRequireAuth } from "@/features/auth";
import { Link } from "@/i18n/navigation";
import { useAuthStore } from "@/stores/auth-store";

export default function HostingServerSetupPage(): React.ReactElement | null {
  useRequireAuth();
  const params = useParams<{ id: string }>();
  const user = useAuthStore((s) => s.user);
  const isAdmin = user?.role === "admin";
  const ta = useTranslations("admin");
  const tp = useTranslations("admin.pages.hostingServers");
  const ts = useTranslations("admin.pages.hostingServers.setup");
  const tf = useTranslations("admin.forms");
  const tu = useTranslations("ui");
  const [server, setServer] = useState<HostingServer | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!isAdmin || !params.id) return;
    getHostingServer(params.id)
      .then(setServer)
      .finally(() => setLoading(false));
  }, [isAdmin, params.id]);

  if (!isAdmin) {
    return <p className="text-on-surface-variant">{tf("hostingServersEditAdminOnly")}</p>;
  }

  if (loading) return <p className="text-on-surface-variant">{tu("loading")}</p>;
  if (!server) return <p className="text-error">{ts("loadFailed")}</p>;

  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <PageHeader
        title={ts("pageTitle", { name: server.name })}
        description={
          [server.hostname, server.ipAddress, server.osVersion].filter(Boolean).join(" · ") ||
          undefined
        }
        breadcrumbs={[
          { label: ta("breadcrumb.admin"), href: "/t4abriz/panel" },
          { label: tp("title"), href: "/t4abriz/panel/hosting/servers" },
          { label: server.name, href: `/t4abriz/panel/hosting/servers/${server.id}` },
          { label: ts("breadcrumb") },
        ]}
        actions={
          <Link
            href={`/t4abriz/panel/hosting/servers/${server.id}`}
            className="border-outline-variant inline-flex h-10 items-center rounded-xl border px-4 text-sm font-semibold"
          >
            {ts("editServer")}
          </Link>
        }
      />

      <HostingServerSetupPanel serverId={server.id} />
    </div>
  );
}
