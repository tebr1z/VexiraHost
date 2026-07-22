import { registerAs } from "@nestjs/config";

export const graphqlConfig = registerAs("graphql", () => ({
  enabled: process.env.GRAPHQL_ENABLED === "true",
  path: process.env.GRAPHQL_PATH ?? "/graphql",
  playground: process.env.GRAPHQL_PLAYGROUND === "true",
}));

/** Future GraphQL configuration — not enabled yet. */
export type GraphqlConfig = ReturnType<typeof graphqlConfig>;
