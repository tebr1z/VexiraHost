import { Resolver, resolve4, resolve6, resolveNs } from "node:dns/promises";

const domain = (process.env.DNS_TEST_DOMAIN || process.argv[2] || "").replace(/\.$/, "");
const expectedAddress = process.env.DNS_EXPECTED_ADDRESS || process.argv[3] || "";
const requiredNameservers = (
  process.env.AUTHORITATIVE_NAMESERVERS || "ns1.vexirahost.com,ns2.vexirahost.com"
)
  .split(",")
  .map((value) => value.trim().toLowerCase().replace(/\.$/, ""))
  .filter(Boolean);

if (!domain) {
  console.error("Set DNS_TEST_DOMAIN or pass the domain as the first argument.");
  process.exit(2);
}
if (requiredNameservers.length < 2) {
  console.error("At least two AUTHORITATIVE_NAMESERVERS are required.");
  process.exit(2);
}

const delegated = (await resolveNs(domain)).map((value) => value.toLowerCase().replace(/\.$/, ""));
const missing = requiredNameservers.filter((value) => !delegated.includes(value));
if (missing.length) throw new Error(`Delegation is missing: ${missing.join(", ")}`);

const results = [];
for (const nameserver of requiredNameservers.slice(0, 2)) {
  const addresses = [
    ...(await resolve4(nameserver).catch(() => [])),
    ...(await resolve6(nameserver).catch(() => [])),
  ];
  if (!addresses[0])
    throw new Error(`${nameserver} has no public A/AAAA record (glue is not ready)`);

  const resolver = new Resolver();
  resolver.setServers([addresses[0]]);
  const [soa, records] = await Promise.all([
    resolver.resolveSoa(domain),
    resolver.resolve4(domain).catch(() => resolver.resolve6(domain)),
  ]);
  if (expectedAddress && !records.includes(expectedAddress)) {
    throw new Error(`${nameserver} returned ${records.join(", ")} instead of ${expectedAddress}`);
  }
  results.push({ nameserver, serverAddress: addresses[0], serial: soa.serial, records });
}

if (new Set(results.map((result) => result.serial)).size !== 1) {
  throw new Error(
    `SOA serial mismatch: ${results.map((result) => `${result.nameserver}=${result.serial}`).join(", ")}`,
  );
}

console.log(JSON.stringify({ ok: true, domain, delegated, results }, null, 2));
