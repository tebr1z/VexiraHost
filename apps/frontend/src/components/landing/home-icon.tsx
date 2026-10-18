import type { CSSProperties } from "react";

export type HomeIconName =
  | "arrow"
  | "check"
  | "cloud"
  | "server"
  | "database"
  | "shield"
  | "globe"
  | "code"
  | "mail"
  | "key"
  | "backup"
  | "chat"
  | "bolt"
  | "layers"
  | "sliders"
  | "support"
  | "search"
  | "plus";

const paths: Record<HomeIconName, React.ReactNode> = {
  arrow: <path d="M5 12h14m-6-6 6 6-6 6" />,
  check: <path d="m5 12 4 4L19 6" />,
  cloud: <path d="M6 18a4 4 0 0 1-.5-8 6.5 6.5 0 0 1 12.4-1.7A5 5 0 0 1 18 18Z" />,
  server: (
    <>
      <rect x="3" y="3" width="18" height="7" rx="2" />
      <rect x="3" y="14" width="18" height="7" rx="2" />
      <path d="M7 6.5h.01M7 17.5h.01M11 6.5h6M11 17.5h6" />
    </>
  ),
  database: (
    <>
      <ellipse cx="12" cy="5" rx="8" ry="3" />
      <path d="M4 5v14c0 4 16 4 16 0V5M4 12c0 4 16 4 16 0" />
    </>
  ),
  shield: (
    <>
      <path d="m12 3 8 3v6c0 4-4 7-8 9-4-2-8-5-8-9V6Z" />
      <path d="m8 12 3 3 5-6" />
    </>
  ),
  globe: (
    <>
      <circle cx="12" cy="12" r="9" />
      <ellipse cx="12" cy="12" rx="4" ry="9" />
      <path d="M3 12h18" />
    </>
  ),
  code: <path d="m7 7-5 5 5 5m10-10 5 5-5 5M14 4l-4 16" />,
  mail: (
    <>
      <rect x="3" y="5" width="18" height="14" rx="3" />
      <path d="m3 7 9 6 9-6" />
    </>
  ),
  key: (
    <>
      <circle cx="8" cy="9" r="5" />
      <path d="m12 13 8 8m-4-4 3-3m-6 0 3-3" />
    </>
  ),
  backup: (
    <>
      <path d="M3 10a9 9 0 1 1 1 7M3 4v6h6" />
      <path d="M12 7v5l3 2" />
    </>
  ),
  chat: <path d="M21 11.5a8.5 8.5 0 0 1-12 7.7L3 21l1.8-6A8.5 8.5 0 1 1 21 11.5Z" />,
  bolt: <path d="m13 2-9 12h7l-1 8 10-13h-7Z" />,
  layers: (
    <>
      <path d="m12 3 10 5-10 5L2 8Zm-10 9 10 5 10-5M2 16l10 5 10-5" />
    </>
  ),
  sliders: <path d="M5 3v6m0 4v8M12 3v11m0 4v3M19 3v2m0 4v12M2 9h6m1 5h6m1-9h6" />,
  support: (
    <>
      <path d="M4 14v-3a8 8 0 0 1 16 0v3M20 17v1a3 3 0 0 1-3 3h-3" />
      <rect x="2" y="11" width="4" height="7" rx="2" />
      <rect x="18" y="11" width="4" height="7" rx="2" />
    </>
  ),
  search: (
    <>
      <circle cx="10.5" cy="10.5" r="7" />
      <path d="m16 16 5 5" />
    </>
  ),
  plus: <path d="M12 5v14M5 12h14" />,
};

export function HomeIcon({
  name,
  className,
  style,
}: {
  name: HomeIconName;
  className?: string;
  style?: CSSProperties;
}): React.ReactElement {
  return (
    <svg
      viewBox="0 0 24 24"
      width="20"
      height="20"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.7"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      className={className}
      style={style}
    >
      {paths[name]}
    </svg>
  );
}
