"use client";

import { useParams } from "next/navigation";
import { useTranslations } from "next-intl";
import { useCallback, useEffect, useState } from "react";

import { HostingDetailView } from "@/components/hosting/hosting-detail-view";
import { EmptyState, LoadingSkeletonList } from "@/components/ui";
import { useRequireAuth } from "@/features/auth";
import {
  cancelHostingRenewal,
  getHostingAccount,
  openHostingPanel,
  resumeHostingRenewal,
  retryHostingProvision,
  syncHostingPanelInfo,
  type HostingAccount,
} from "@/features/hosting";
import { getApiErrorMessage } from "@/lib/api-error";
import { toast } from "@/stores/toast-store";

export default function HostingDetailPage(): React.ReactElement | null {
  useRequireAuth();
  const params = useParams<{ id: string }>();
  const tc = useTranslations("dashboard.common");
  const tp = useTranslations("dashboard.pages.hosting");
  const tprov = useTranslations("dashboard.provision");
  const [account, setAccount] = useState<HostingAccount | null>(null);
  const [loading, setLoading] = useState(true);
  const [panelLoading, setPanelLoading] = useState(false);
  const [syncLoading, setSyncLoading] = useState(false);
  const [retryLoading, setRetryLoading] = useState(false);
  const [cancelLoading, setCancelLoading] = useState(false);
  const [resumeLoading, setResumeLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    if (!params.id) return;
    try {
      const data = await getHostingAccount(params.id);
      setAccount(data);
      setError(null);
    } catch {
      setError(tp("notFound"));
    } finally {
      setLoading(false);
    }
  }, [params.id, tp]);

  useEffect(() => {
    load();
  }, [load]);

  useEffect(() => {
    if (!account || account.status !== "PROVISIONING") return;
    const timer = window.setInterval(load, 4000);
    return () => window.clearInterval(timer);
  }, [account, load]);

  const handlePanelLogin = async () => {
    if (!account) return;
    setPanelLoading(true);
    try {
      await openHostingPanel(account.id);
      toast(tc("openingPanel"), "success");
    } catch (err) {
      const msg =
        err && typeof err === "object" && "error" in err
          ? (err as { error?: { message?: string } }).error?.message
          : tc("panelLoginFailed");
      toast(msg ?? tc("panelLoginFailed"), "error");
    } finally {
      setPanelLoading(false);
    }
  };

  const handleRetry = async () => {
    if (!account) return;
    setRetryLoading(true);
    try {
      const data = await retryHostingProvision(account.id);
      setAccount(data);
      toast(tprov("retry"), "success");
    } catch (err) {
      const msg =
        err && typeof err === "object" && "error" in err
          ? (err as { error?: { message?: string } }).error?.message
          : tprov("failedHint");
      toast(msg ?? tprov("failedHint"), "error");
    } finally {
      setRetryLoading(false);
    }
  };

  const handleSyncPlesk = async () => {
    if (!account) return;
    setSyncLoading(true);
    try {
      const data = await syncHostingPanelInfo(account.id);
      setAccount(data);
      toast(tp("pleskSync"), "success");
    } catch (err) {
      const msg =
        err && typeof err === "object" && "error" in err
          ? (err as { error?: { message?: string } }).error?.message
          : tp("pleskUnavailable");
      toast(msg ?? tp("pleskUnavailable"), "error");
    } finally {
      setSyncLoading(false);
    }
  };

  if (loading) return <LoadingSkeletonList rows={3} />;
  if (error || !account) {
    return (
      <EmptyState
        title={tp("notFound")}
        description={error ?? tp("notFoundDesc")}
        actionLabel={tc("backToHosting")}
        actionHref="/dashboard/hosting"
      />
    );
  }

  return (
    <HostingDetailView
      account={account}
      panelLoading={panelLoading}
      syncLoading={syncLoading}
      retryLoading={retryLoading}
      cancelLoading={cancelLoading}
      resumeLoading={resumeLoading}
      onPanelLogin={() => void handlePanelLogin()}
      onSyncPlesk={() => void handleSyncPlesk()}
      onRetry={() => void handleRetry()}
      onCancelRenewal={() => {
        if (!confirm(tc("cancelRenewalConfirm"))) return;
        void (async () => {
          setCancelLoading(true);
          try {
            const result = await cancelHostingRenewal(account.id);
            setAccount(result);
            toast(result.message ?? tc("cancelRenewalSuccess"), "success");
          } catch (err) {
            toast(getApiErrorMessage(err, tc("cancelRenewalFailed")), "error");
          } finally {
            setCancelLoading(false);
          }
        })();
      }}
      onResumeRenewal={() => {
        void (async () => {
          setResumeLoading(true);
          try {
            const result = await resumeHostingRenewal(account.id);
            setAccount(result);
            toast(result.message ?? tc("resumeRenewalSuccess"), "success");
          } catch (err) {
            toast(getApiErrorMessage(err, tc("resumeRenewalFailed")), "error");
          } finally {
            setResumeLoading(false);
          }
        })();
      }}
    />
  );
}
