export const DEPLOY_STAGES = {
  QUEUED: "queued",
  WAITING_SERVER: "waiting_server",
  ALLOCATING_PORT: "allocating_port",
  CREATING_SUBDOMAIN: "creating_subdomain",
  PREPARING_SERVER: "preparing_server",
  ENSURING_DEPENDENCIES: "ensuring_dependencies",
  CLONING_REPO: "cloning_repo",
  BUILDING: "building",
  STARTING: "starting",
  CONFIGURING_PROXY: "configuring_proxy",
  COMPLETED: "completed",
  FAILED: "failed",
} as const;

export type DeployStage = (typeof DEPLOY_STAGES)[keyof typeof DEPLOY_STAGES];
