import Redis from "ioredis";
import { Global, Logger, Module } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { Queue, Worker, type ConnectionOptions } from "bullmq";

export const QUEUE_CONNECTION = "QUEUE_CONNECTION";
export const DEFAULT_QUEUE = "DEFAULT_QUEUE";

const logger = new Logger("QueueModule");
let redisUnavailableLogged = false;

function logRedisUnavailable(message: string): void {
  if (redisUnavailableLogged) return;
  redisUnavailableLogged = true;
  logger.warn(message);
}

function buildConnection(url: string): ConnectionOptions {
  return {
    url,
    maxRetriesPerRequest: null,
    lazyConnect: true,
    enableOfflineQueue: false,
    connectTimeout: 2_000,
    retryStrategy: () => null,
  };
}

async function probeRedis(url: string): Promise<boolean> {
  const client = new Redis(url, {
    maxRetriesPerRequest: 1,
    connectTimeout: 2_000,
    lazyConnect: true,
    enableOfflineQueue: false,
    retryStrategy: () => null,
  });

  try {
    await client.connect();
    await client.ping();
    await client.quit();
    return true;
  } catch {
    try {
      client.disconnect();
    } catch {
      // ignore cleanup errors
    }
    return false;
  }
}

async function createOptionalQueue(configService: ConfigService): Promise<Queue | null> {
  const enabled = configService.get<string>("REDIS_ENABLED") !== "false";
  if (!enabled) {
    logRedisUnavailable("Redis disabled (REDIS_ENABLED=false) — background queue is off.");
    return null;
  }

  const url = configService.get<string>("redis.url") ?? "redis://localhost:6379";
  const available = await probeRedis(url);

  if (!available) {
    if (process.env.NODE_ENV === "development") {
      logRedisUnavailable("Redis unavailable — queue disabled until Redis is running on port 6379.");
      return null;
    }

    logger.error("Redis is required in production but is not reachable.");
    throw new Error("Redis connection failed");
  }

  const queue = new Queue("vexira-default", { connection: buildConnection(url) });
  queue.on("error", (error) => {
    logger.debug(`Queue error: ${error.message}`);
  });

  return queue;
}

@Global()
@Module({
  providers: [
    {
      provide: QUEUE_CONNECTION,
      inject: [ConfigService],
      useFactory: (configService: ConfigService): ConnectionOptions => {
        const url = configService.get<string>("redis.url") ?? "redis://localhost:6379";
        return buildConnection(url);
      },
    },
    {
      provide: DEFAULT_QUEUE,
      inject: [ConfigService],
      useFactory: async (configService: ConfigService): Promise<Queue | null> =>
        createOptionalQueue(configService),
    },
  ],
  exports: [QUEUE_CONNECTION, DEFAULT_QUEUE],
})
export class QueueModule {}

/** Worker factory — instantiate per job type in jobs/ module. */
export function createWorker(
  name: string,
  processor: (job: import("bullmq").Job) => Promise<void>,
  connection: ConnectionOptions,
): Worker {
  return new Worker(name, processor, { connection });
}
