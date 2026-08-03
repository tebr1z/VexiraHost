"use client";

import { useParams } from "next/navigation";
import { useTranslations } from "next-intl";
import { useEffect, useState } from "react";

import {
  CampaignForm,
  campaignToFormValues,
  toCampaignPayload,
} from "@/components/admin/campaign-form";
import { PageHeader, StatusBadge } from "@/components/ui";
import {
  getAdminCampaign,
  sendAdminCampaign,
  updateAdminCampaign,
  type AdminCampaign,
} from "@/features/admin";
import { useRequireAuth } from "@/features/auth";
import { useRouter } from "@/i18n/navigation";
import { getApiErrorMessage } from "@/lib/api-error";
import { toast } from "@/stores/toast-store";

export default function EditCampaignPage(): React.ReactElement | null {
  useRequireAuth();
  const router = useRouter();
  const params = useParams();
  const ta = useTranslations("admin");
  const tp = useTranslations("admin.pages.campaigns");
  const tf = useTranslations("admin.forms");
  const tt = useTranslations("admin.toasts");
  const tu = useTranslations("ui");
  const id = params.id as string;
  const [campaign, setCampaign] = useState<AdminCampaign | null>(null);
  const [sending, setSending] = useState(false);

  useEffect(() => {
    getAdminCampaign(id)
      .then(setCampaign)
      .catch(() => {
        toast(tp("loadFailed"), "error");
        router.push("/t4abriz/panel/campaigns");
      });
  }, [id, router, tp]);

  if (!campaign) {
    return <p className="text-on-surface-variant">{tu("loading")}</p>;
  }

  const locked = campaign.status === "SENT" || campaign.status === "SENDING";

  const handleSend = async () => {
    if (!confirm(tp("sendConfirm"))) return;
    setSending(true);
    try {
      const updated = await sendAdminCampaign(campaign.id);
      setCampaign(updated);
      toast(tt("campaignSent"), "success");
    } catch (err) {
      toast(getApiErrorMessage(err, tp("sendFailed")), "error");
    } finally {
      setSending(false);
    }
  };

  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <PageHeader
        title={tp("editTitle", { subject: campaign.subject })}
        breadcrumbs={[
          { label: ta("breadcrumb.admin"), href: "/t4abriz/panel" },
          { label: ta("nav.campaigns"), href: "/t4abriz/panel/campaigns" },
          { label: campaign.subject },
        ]}
        actions={
          <div className="flex items-center gap-3">
            <StatusBadge status={campaign.status} />
            {!locked && (
              <button
                type="button"
                disabled={sending}
                onClick={() => void handleSend()}
                className="bg-primary text-on-primary inline-flex h-10 items-center rounded-xl px-5 text-sm font-semibold disabled:opacity-60"
              >
                {sending ? tp("sending") : tp("publish")}
              </button>
            )}
          </div>
        }
      />

      {campaign.status === "SENT" && (
        <p className="border-outline-variant/50 bg-surface-container-low text-on-surface-variant rounded-xl border px-4 py-3 text-sm">
          {tp("sentSummary", {
            success: campaign.successCount,
            total: campaign.recipientCount,
            fail: campaign.failCount,
          })}
        </p>
      )}

      <CampaignForm
        initialValues={campaignToFormValues(campaign)}
        submitLabel={tf("saveCampaign")}
        disabled={locked}
        onSubmit={async (values) => {
          const updated = await updateAdminCampaign(campaign.id, toCampaignPayload(values));
          setCampaign(updated);
          toast(tt("campaignUpdated"), "success");
        }}
      />
    </div>
  );
}
