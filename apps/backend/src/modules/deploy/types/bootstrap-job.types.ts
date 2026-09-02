export const BOOTSTRAP_STAGE_IDS = [
  "connect",
  "detect_os",
  "save_os",
  "upload_script",
  "install_packages",
  "verify",
] as const;

export type BootstrapStageId = (typeof BOOTSTRAP_STAGE_IDS)[number];

export type BootstrapStepStatus = "pending" | "running" | "success" | "failed";

export type BootstrapJobStep = {
  id: BootstrapStageId;
  status: BootstrapStepStatus;
  message?: string;
};

export type BootstrapJobStatus = "running" | "success" | "failed";

export type BootstrapJob = {
  id: string;
  serverId: string;
  status: BootstrapJobStatus;
  currentStage: BootstrapStageId | "done";
  steps: BootstrapJobStep[];
  log: string;
  error: string | null;
  startedAt: string;
  finishedAt: string | null;
};

export type BootstrapProgressUpdate = {
  stage: BootstrapStageId | "done";
  status: Exclude<BootstrapStepStatus, "pending">;
  message?: string;
  logChunk?: string;
};

export function createInitialBootstrapSteps(): BootstrapJobStep[] {
  return BOOTSTRAP_STAGE_IDS.map((id) => ({ id, status: "pending" }));
}

export function applyBootstrapProgress(
  steps: BootstrapJobStep[],
  update: BootstrapProgressUpdate,
): BootstrapJobStep[] {
  const next = steps.map((step) => ({ ...step }));

  if (update.stage !== "done") {
    const idx = next.findIndex((step) => step.id === update.stage);
    if (idx >= 0) {
      for (let i = 0; i < idx; i += 1) {
        if (next[i].status === "pending" || next[i].status === "running") {
          next[i].status = "success";
        }
      }
      next[idx].status = update.status;
      if (update.message) next[idx].message = update.message;
    }
  } else if (update.status === "success") {
    for (const step of next) {
      if (step.status === "pending" || step.status === "running") {
        step.status = "success";
      }
    }
  }

  return next;
}
