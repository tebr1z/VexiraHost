# VexiraHost managed server and platform audit

Date: 2026-10-18

## Completed in this iteration

- Customer-owned server onboarding with encrypted SSH password storage.
- Public-host-only validation before every SSH operation to block localhost, private networks, metadata IPs and DNS rebinding; execution is pinned to the validated public address.
- Ready packages plus individual Git, Docker, Node.js, PM2, Nginx, firewall, Fail2ban and Plesk selections.
- Allowlisted scripts only; no arbitrary customer terminal command endpoint.
- CPU, RAM, disk, uptime, operating system and installed-tool probes.
- Five-minute health refresh for monitoring-enabled servers.
- Read-only security scan, security score and structured findings.
- Explicit confirmation for remote changes; safe automatic fixes are limited to firewall and Fail2ban.
- Plesk installation requires administrator approval.
- Customer dashboard and administrator fleet/approval view.
- Public development-services section for web, mobile and desktop application work.
- Removed the stale standalone SSL and Backup activation choices from the customer services screen.
- Production encryption key now fails closed when missing, short or left as `change-me`.

## P0 — required before production launch

1. Move managed-server background tasks from in-process promises to the existing durable queue. A process restart can currently leave a task in `RUNNING` until an administrator repairs it.
2. Add SSH key authentication and prefer short-lived per-customer service users. Password authentication should remain a compatibility option, not the default.
3. Add API throttling for server creation, connection tests, scans, fixes and installation requests.
4. Record immutable audit events for credential changes, installation requests, administrator approvals and security remediations.
5. Run real-provider preflight checks at startup: Epoint/Kapital, registrar, Proxmox, DNS, SMTP, object storage and deploy SSH. Production must fail clearly instead of silently falling back to a mock provider.
6. Put SSH execution workers on an isolated network with restricted outbound access and no route to databases, Redis, metadata endpoints or internal control-plane hosts.
7. Repair or rotate the existing `Plesk Primary` Auto Deploy credential: the local runtime reports that it cannot decrypt/authenticate the saved value. Reconcile the stale hosting record whose Plesk webspace no longer exists, then rerun the system-health report until those critical checks clear.

## P1 — operational readiness

1. Add notification rules for offline servers, disk above 85%, repeated task failures and critical findings; deliver through dashboard, email and configured WhatsApp.
2. Store time-series health samples so the dashboard can show 24-hour and 30-day CPU/RAM/disk graphs instead of only the latest value.
3. Add maintenance windows, cancellation and retry controls for installation tasks.
4. Add tested Ubuntu/Debian and Alma/Rocky installation profiles. The current generic package scripts need distribution-specific integration tests on disposable VMs.
5. Integrate package/add-on pricing with the catalog, checkout, invoice and renewal system. The current managed-server packages are request/configuration bundles without billable prices.
6. Add admin-set limits: maximum connected servers, scan frequency, concurrent tasks and included remediation hours per plan.
7. Add a credential rotation screen and a “disconnect without deleting history” state.

## P2 — product expansion

1. Optional deeper scanners: Lynis/OpenSCAP for the operating system and Trivy for container images. Findings should be normalized into the existing finding model.
2. Application/service inventory: listening ports, systemd services, Docker containers, PM2 processes and domain/TLS expiry.
3. Patch-management policies with preview, snapshot confirmation, staged rollout and rollback notes.
4. Public status page and SLA reporting for managed customers.
5. Development-services lead form with project type, target platforms, budget range, attachments and automatic admin ticket creation.
6. Admin reporting for service margin, support time, server risk distribution and upcoming license renewals.

## Important product boundaries

- “Security scan” must not be marketed as a guarantee that a server has no vulnerabilities.
- High-impact changes such as SSH authentication policy, kernel upgrades, database tuning and Plesk installation need review, maintenance planning and recovery access.
- VexiraHost currently does not provide managed backup; the UI must continue recommending an external backup before any remediation or upgrade.
