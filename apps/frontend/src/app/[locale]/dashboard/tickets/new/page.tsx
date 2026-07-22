"use client";

import { useRouter } from "@/i18n/navigation";
import { useTranslations } from "next-intl";
import { useEffect, useState } from "react";

import { LoadingSkeleton, PageHeader } from "@/components/ui";
import { useRequireAuth } from "@/features/auth";
import {
  createTicket,
  listTicketRelatedServices,
  type TicketRelatedServiceOption,
} from "@/features/tickets";

export default function NewTicketPage(): React.ReactElement | null {
  useRequireAuth();
  const router = useRouter();
  const t = useTranslations("dashboard");
  const tc = useTranslations("dashboard.common");
  const tp = useTranslations("dashboard.pages.tickets");
  const [subject, setSubject] = useState("");
  const [body, setBody] = useState("");
  const [priority, setPriority] = useState("MEDIUM");
  const [relatedServiceKey, setRelatedServiceKey] = useState("");
  const [services, setServices] = useState<TicketRelatedServiceOption[]>([]);
  const [servicesLoading, setServicesLoading] = useState(true);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    listTicketRelatedServices()
      .then(setServices)
      .finally(() => setServicesLoading(false));
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    let relatedServiceType: string | undefined;
    let relatedServiceId: string | undefined;
    if (relatedServiceKey) {
      const [type, id] = relatedServiceKey.split(":");
      if (type && id) {
        relatedServiceType = type;
        relatedServiceId = id;
      }
    }

    try {
      const ticket = await createTicket({
        subject,
        message: body,
        priority,
        relatedServiceType,
        relatedServiceId,
      });
      router.push(`/dashboard/tickets/${ticket.id}`);
    } catch {
      setError(tc("failedCreateTicket"));
    } finally {
      setLoading(false);
    }
  };

  const serviceTypeLabel = (type: string) => {
    const key = type.toLowerCase() as "hosting" | "server" | "domain" | "addon";
    return tp(`serviceTypes.${key}`);
  };

  return (
    <div className="mx-auto max-w-xl space-y-6">
      <PageHeader
        title={tp("newTitle")}
        description={tp("newDescription")}
        breadcrumbs={[
          { label: t("nav.dashboard"), href: "/dashboard" },
          { label: t("nav.support"), href: "/dashboard/tickets" },
          { label: tp("newBreadcrumb") },
        ]}
      />

      <form onSubmit={handleSubmit} className="space-y-4 rounded-2xl border border-outline-variant/50 bg-surface p-6">
        <div>
          <label htmlFor="related-service" className="mb-1.5 block text-sm font-medium text-primary">
            {tp("relatedService")}
          </label>
          {servicesLoading ? (
            <LoadingSkeleton className="h-12 w-full rounded-xl" />
          ) : (
            <select
              id="related-service"
              value={relatedServiceKey}
              onChange={(e) => setRelatedServiceKey(e.target.value)}
              className="h-12 w-full rounded-xl border border-outline-variant px-4"
            >
              <option value="">{tp("relatedServiceNone")}</option>
              {services.map((service) => (
                <option key={`${service.type}:${service.id}`} value={`${service.type}:${service.id}`}>
                  [{serviceTypeLabel(service.type)}] {service.label}
                </option>
              ))}
            </select>
          )}
          <p className="mt-1.5 text-xs text-on-surface-variant">{tp("relatedServiceHint")}</p>
        </div>

        <input
          value={subject}
          onChange={(e) => setSubject(e.target.value)}
          placeholder={tc("subject")}
          required
          className="h-12 w-full rounded-xl border border-outline-variant px-4"
        />
        <select
          value={priority}
          onChange={(e) => setPriority(e.target.value)}
          className="h-12 w-full rounded-xl border border-outline-variant px-4"
        >
          <option value="LOW">{tc("priorityLow")}</option>
          <option value="MEDIUM">{tc("priorityMedium")}</option>
          <option value="HIGH">{tc("priorityHigh")}</option>
          <option value="URGENT">{tc("priorityUrgent")}</option>
        </select>
        <textarea
          value={body}
          onChange={(e) => setBody(e.target.value)}
          placeholder={tc("describeIssue")}
          required
          rows={6}
          className="w-full rounded-xl border border-outline-variant px-4 py-3"
        />
        {error && <p className="text-sm text-error">{error}</p>}
        <button
          type="submit"
          disabled={loading}
          className="h-12 w-full rounded-xl bg-primary font-semibold text-on-primary disabled:opacity-60"
        >
          {loading ? tc("submitting") : tc("submitTicket")}
        </button>
      </form>
    </div>
  );
}
