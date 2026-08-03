function escapeHtml(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;");
}

export function buildPanelUrlFromIp(ip: string, panel: "PLESK" | "CPANEL" = "PLESK"): string {
  const trimmed = ip.trim();
  const host = trimmed.includes(":") && !trimmed.startsWith("[") ? `[${trimmed}]` : trimmed;
  const port = panel === "CPANEL" ? 2083 : 8443;
  return `https://${host}:${port}`;
}

export function normalizePanelUrl(
  panelUrl: string | undefined,
  panelIp: string,
  panel: "PLESK" | "CPANEL" = "PLESK",
): string {
  const raw = panelUrl?.trim() || buildPanelUrlFromIp(panelIp, panel);
  return raw.replace(/\/$/, "");
}

function autoLoginShell(title: string, action: string, fields: Record<string, string>): string {
  const inputs = Object.entries(fields)
    .map(
      ([name, value]) =>
        `<input type="hidden" name="${escapeHtml(name)}" value="${escapeHtml(value)}" />`,
    )
    .join("\n    ");

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8" />
  <title>${escapeHtml(title)}</title>
  <style>
    body { font-family: system-ui, sans-serif; display: flex; align-items: center; justify-content: center; min-height: 100vh; margin: 0; background: #0f172a; color: #e2e8f0; }
    .box { text-align: center; padding: 2rem; }
    .spinner { width: 2rem; height: 2rem; border: 3px solid rgba(255,255,255,.2); border-top-color: #fff; border-radius: 50%; animation: spin .8s linear infinite; margin: 0 auto 1rem; }
    @keyframes spin { to { transform: rotate(360deg); } }
  </style>
</head>
<body>
  <div class="box">
    <div class="spinner"></div>
    <p>${escapeHtml(title)}</p>
  </div>
  <form id="login" method="post" action="${escapeHtml(action)}">
    ${inputs}
  </form>
  <script>document.getElementById("login").submit();</script>
</body>
</html>`;
}

export function buildPleskAutoLoginHtml(
  panelUrl: string,
  loginName: string,
  password: string,
): string {
  const base = normalizePanelUrl(panelUrl, "", "PLESK");
  return autoLoginShell("Opening Plesk…", `${base}/login_up.php`, {
    login_name: loginName,
    passwd: password,
  });
}

export function buildCpanelAutoLoginHtml(
  panelUrl: string,
  loginName: string,
  password: string,
): string {
  const base = normalizePanelUrl(panelUrl, "", "CPANEL");
  return autoLoginShell("Opening cPanel…", `${base}/login/`, {
    user: loginName,
    pass: password,
  });
}

export function buildPanelAutoLoginHtml(
  panel: "PLESK" | "CPANEL",
  panelUrl: string,
  loginName: string,
  password: string,
): string {
  return panel === "CPANEL"
    ? buildCpanelAutoLoginHtml(panelUrl, loginName, password)
    : buildPleskAutoLoginHtml(panelUrl, loginName, password);
}
