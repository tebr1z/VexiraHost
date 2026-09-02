"use client";

import { useTranslations } from "next-intl";
import { useCallback, useEffect, useRef, useState } from "react";

import { MaterialIcon } from "@/components/landing/material-icon";
import {
  bootstrapServerSetup,
  getBootstrapJob,
  getServerSetupStatus,
  probeServerSetup,
  testServerSetupSsh,
  type BootstrapJob,
  type ServerSetupStatus,
} from "@/features/admin";
import { getApiErrorMessage } from "@/lib/api-error";
import { cn } from "@/lib/cn";
import { toast } from "@/stores/toast-store";

const STAGE_ORDER = [
  "connect",
  "detect_os",
  "save_os",
  "upload_script",
  "install_packages",
  "verify",
] as const;

function ToolRow({
  label,
  value,
  ok,
}: {
  label: string;
  value: string | null;
  ok?: boolean;
}): React.ReactElement {
  return (
    <div className="flex items-start justify-between gap-3 rounded-xl border border-[var(--separator)] bg-[var(--bg-secondary)] px-4 py-3">
      <span className="text-sm font-medium text-[var(--label-primary)]">{label}</span>
      <span
        className={cn(
          "text-right font-mono text-xs",
          value
            ? ok === false
              ? "text-[var(--danger)]"
              : "text-[var(--label-secondary)]"
            : "text-[var(--danger)]",
        )}
      >
        {value ?? "—"}
      </span>
    </div>
  );
}

function StepIcon({
  status,
}: {
  status: BootstrapJob["steps"][number]["status"];
}): React.ReactElement {
  if (status === "running") {
    return (
      <span className="material-symbols-outlined animate-spin text-[18px] text-[var(--accent)]">
        progress_activity
      </span>
    );
  }
  if (status === "success") {
    return <MaterialIcon name="check_circle" className="text-[18px] text-emerald-500" />;
  }
  if (status === "failed") {
    return <MaterialIcon name="error" className="text-[18px] text-[var(--danger)]" />;
  }
  return (
    <MaterialIcon
      name="radio_button_unchecked"
      className="text-[18px] text-[var(--label-tertiary)]"
    />
  );
}

function BootstrapProgressPanel({
  job,
  t,
}: {
  job: BootstrapJob;
  t: (key: string, values?: Record<string, string>) => string;
}): React.ReactElement {
  const logRef = useRef<HTMLPreElement>(null);

  useEffect(() => {
    const el = logRef.current;
    if (el) el.scrollTop = el.scrollHeight;
  }, [job.log]);

  const bannerClass =
    job.status === "running"
      ? "border-[var(--accent)]/30 bg-[var(--accent)]/10 text-[var(--accent)]"
      : job.status === "success"
        ? "border-emerald-500/30 bg-emerald-500/10 text-emerald-700 dark:text-emerald-300"
        : "border-[var(--danger)]/30 bg-[var(--danger)]/10 text-[var(--danger)]";

  const bannerText =
    job.status === "running"
      ? t("progressRunning")
      : job.status === "success"
        ? t("progressSuccess")
        : t("progressFailed");

  return (
    <div className="card-3d border-outline-variant/40 space-y-4 rounded-2xl border p-5">
      <div className="flex items-center justify-between gap-3">
        <h3 className="text-primary text-sm font-semibold">{t("progressTitle")}</h3>
        <span className={cn("rounded-full border px-3 py-1 text-xs font-semibold", bannerClass)}>
          {bannerText}
        </span>
      </div>

      <ol className="space-y-2">
        {STAGE_ORDER.map((stageId) => {
          const step = job.steps.find((item) => item.id === stageId);
          const status = step?.status ?? "pending";
          return (
            <li
              key={stageId}
              className={cn(
                "flex items-start gap-3 rounded-xl border px-3 py-2.5",
                status === "running" && "border-[var(--accent)]/40 bg-[var(--accent)]/5",
                status === "success" && "border-emerald-500/20 bg-emerald-500/5",
                status === "failed" && "border-[var(--danger)]/30 bg-[var(--danger)]/5",
                status === "pending" && "border-[var(--separator)] bg-[var(--bg-secondary)]",
              )}
            >
              <StepIcon status={status} />
              <div className="min-w-0 flex-1">
                <p className="text-sm font-medium text-[var(--label-primary)]">
                  {t(`stage_${stageId}`)}
                </p>
                <p className="text-xs text-[var(--label-secondary)]">
                  {status === "pending" && t("stepPending")}
                  {status === "running" && t("stepRunning")}
                  {status === "success" && (step?.message || t("stepSuccess"))}
                  {status === "failed" && (step?.message || t("stepFailed"))}
                </p>
              </div>
            </li>
          );
        })}
      </ol>

      {job.error ? <p className="text-sm text-[var(--danger)]">{job.error}</p> : null}

      <div>
        <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-[var(--label-secondary)]">
          {t("liveLog")}
        </p>
        <pre
          ref={logRef}
          className="max-h-72 overflow-auto rounded-xl bg-[#0f1117] p-3 text-[11px] leading-relaxed text-[#d4d4d8]"
        >
          {job.log || t("logWaiting")}
        </pre>
      </div>
    </div>
  );
}

export function HostingServerSetupPanel({ serverId }: { serverId: string }): React.ReactElement {
  const t = useTranslations("admin.pages.hostingServers.setup");
  const [status, setStatus] = useState<ServerSetupStatus | null>(null);
  const [loading, setLoading] = useState(true);
  const [probing, setProbing] = useState(false);
  const [testingSsh, setTestingSsh] = useState(false);
  const [bootstrapping, setBootstrapping] = useState(false);
  const [bootstrapJob, setBootstrapJob] = useState<BootstrapJob | null>(null);
  const [sshOutput, setSshOutput] = useState<string | null>(null);

  const refreshStatus = useCallback(async () => {
    const data = await getServerSetupStatus(serverId);
    setStatus(data);
    return data;
  }, [serverId]);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      await refreshStatus();
    } catch (err) {
      toast(getApiErrorMessage(err, t("loadFailed")), "error");
    } finally {
      setLoading(false);
    }
  }, [refreshStatus, t]);

  const pollJob = useCallback(
    async (jobId: string) => {
      try {
        const job = await getBootstrapJob(serverId, jobId);
        setBootstrapJob(job);

        if (job.status === "success") {
          setBootstrapping(false);
          const data = await probeServerSetup(serverId);
          setStatus(data);
          toast(t("bootstrapSuccess"), "success");
          return false;
        }

        if (job.status === "failed") {
          setBootstrapping(false);
          toast(job.error ?? t("bootstrapFailed"), "error");
          return false;
        }

        return true;
      } catch (err) {
        setBootstrapping(false);
        toast(getApiErrorMessage(err, t("bootstrapFailed")), "error");
        return false;
      }
    },
    [serverId, t],
  );

  useEffect(() => {
    void load();
  }, [load]);

  useEffect(() => {
    if (!status?.activeBootstrapJobId) return;
    setBootstrapping(true);
    void pollJob(status.activeBootstrapJobId);
  }, [status?.activeBootstrapJobId, pollJob]);

  useEffect(() => {
    if (!bootstrapping || !bootstrapJob?.id) return;
    const timer = window.setInterval(() => {
      void pollJob(bootstrapJob.id).then((keepPolling) => {
        if (!keepPolling) window.clearInterval(timer);
      });
    }, 1500);
    return () => window.clearInterval(timer);
  }, [bootstrapping, bootstrapJob?.id, pollJob]);

  const onProbe = async () => {
    setProbing(true);
    try {
      const data = await probeServerSetup(serverId);
      setStatus(data);
      toast(t("probeSuccess"), "success");
    } catch (err) {
      toast(getApiErrorMessage(err, t("probeFailed")), "error");
    } finally {
      setProbing(false);
    }
  };

  const onTestSsh = async () => {
    setTestingSsh(true);
    setSshOutput(null);
    try {
      const result = await testServerSetupSsh(serverId);
      setSshOutput(result.output);
      toast(result.message, result.ok ? "success" : "error");
    } catch (err) {
      toast(getApiErrorMessage(err, t("sshTestFailed")), "error");
    } finally {
      setTestingSsh(false);
    }
  };

  const onBootstrap = async () => {
    if (!confirm(t("bootstrapConfirm"))) return;
    setBootstrapping(true);
    setBootstrapJob(null);
    try {
      const { jobId } = await bootstrapServerSetup(serverId);
      await pollJob(jobId);
    } catch (err) {
      setBootstrapping(false);
      toast(getApiErrorMessage(err, t("bootstrapFailed")), "error");
    }
  };

  if (loading && !status) {
    return <p className="text-on-surface-variant text-sm">{t("loading")}</p>;
  }

  if (!status) {
    return <p className="text-error text-sm">{t("loadFailed")}</p>;
  }

  return (
    <div className="space-y-6">
      <div className="card-3d border-outline-variant/40 rounded-2xl border p-5">
        <h2 className="font-jakarta text-primary text-lg font-semibold">{t("title")}</h2>
        <p className="text-on-surface-variant mt-1 text-sm">{t("description")}</p>

        {status.mockRemote && (
          <div className="mt-4 rounded-xl border border-amber-500/30 bg-amber-500/10 px-4 py-3 text-sm text-amber-950 dark:text-amber-100">
            {t("mockRemoteHint")}
          </div>
        )}

        <div className="mt-4 grid gap-3 sm:grid-cols-2">
          <ToolRow
            label={t("osLabel")}
            value={status.server.osVersion ?? status.tools?.os ?? null}
          />
          <ToolRow
            label={t("sshLabel")}
            value={
              status.server.sshConfigured
                ? `${status.server.sshUsername ?? "root"}:${status.server.sshPort}`
                : null
            }
            ok={status.server.sshConfigured}
          />
        </div>

        {!status.server.sshConfigured && (
          <p className="text-error mt-3 text-sm">{t("sshMissingHint")}</p>
        )}

        <div className="mt-5 flex flex-wrap gap-2">
          <button
            type="button"
            disabled={probing || bootstrapping || !status.server.sshConfigured}
            onClick={() => void onProbe()}
            className="border-outline-variant hover:bg-surface-container-low inline-flex h-10 items-center gap-2 rounded-xl border px-4 text-sm font-semibold disabled:opacity-50"
          >
            <MaterialIcon name="search" className={cn("text-[18px]", probing && "animate-spin")} />
            {probing ? t("probing") : t("probeTools")}
          </button>
          <button
            type="button"
            disabled={testingSsh || bootstrapping || !status.server.sshConfigured}
            onClick={() => void onTestSsh()}
            className="border-outline-variant hover:bg-surface-container-low inline-flex h-10 items-center gap-2 rounded-xl border px-4 text-sm font-semibold disabled:opacity-50"
          >
            <MaterialIcon name="lan" className="text-[18px]" />
            {testingSsh ? t("testingSsh") : t("testSsh")}
          </button>
          <button
            type="button"
            disabled={bootstrapping || !status.server.sshConfigured}
            onClick={() => void onBootstrap()}
            className="bg-primary text-on-primary inline-flex h-10 items-center gap-2 rounded-xl px-4 text-sm font-semibold disabled:opacity-50"
          >
            <MaterialIcon
              name="download"
              className={cn("text-[18px]", bootstrapping && "animate-bounce")}
            />
            {bootstrapping ? t("bootstrapping") : t("installDeps")}
          </button>
        </div>
      </div>

      {(bootstrapping || bootstrapJob) && bootstrapJob ? (
        <BootstrapProgressPanel job={bootstrapJob} t={t} />
      ) : null}

      {status.tools && (
        <div className="card-3d border-outline-variant/40 space-y-3 rounded-2xl border p-5">
          <h3 className="text-primary text-sm font-semibold">{t("toolsTitle")}</h3>
          <ToolRow label="Git" value={status.tools.git} ok={Boolean(status.tools.git)} />
          <ToolRow label="Docker" value={status.tools.docker} ok={Boolean(status.tools.docker)} />
          <ToolRow
            label="Docker Compose"
            value={status.tools.compose}
            ok={Boolean(status.tools.compose)}
          />
        </div>
      )}

      {sshOutput ? (
        <pre className="max-h-32 overflow-auto rounded-xl bg-[#0f1117] p-3 text-[11px] text-[#d4d4d8]">
          {sshOutput}
        </pre>
      ) : null}

      {status.lastBootstrapLog && !bootstrapJob ? (
        <div className="card-3d border-outline-variant/40 rounded-2xl border p-5">
          <h3 className="text-primary text-sm font-semibold">{t("bootstrapLogTitle")}</h3>
          <pre className="mt-3 max-h-80 overflow-auto rounded-xl bg-[#0f1117] p-3 text-[11px] leading-relaxed text-[#d4d4d8]">
            {status.lastBootstrapLog}
          </pre>
        </div>
      ) : null}
    </div>
  );
}
