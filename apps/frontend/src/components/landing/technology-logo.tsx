type TechnologyLogoProps = {
  name: string;
  className?: string;
};

function LogoFrame({
  children,
  className = "",
}: {
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <svg
      aria-hidden="true"
      className={`home-tech-logo ${className}`}
      viewBox="0 0 32 32"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
    >
      {children}
    </svg>
  );
}

export function TechnologyLogo({ name, className }: TechnologyLogoProps): React.ReactElement {
  switch (name) {
    case "React":
      return (
        <LogoFrame className={className}>
          <circle cx="16" cy="16" r="2.6" fill="currentColor" />
          <ellipse cx="16" cy="16" rx="13" ry="5.2" stroke="currentColor" strokeWidth="1.8" />
          <ellipse
            cx="16"
            cy="16"
            rx="13"
            ry="5.2"
            stroke="currentColor"
            strokeWidth="1.8"
            transform="rotate(60 16 16)"
          />
          <ellipse
            cx="16"
            cy="16"
            rx="13"
            ry="5.2"
            stroke="currentColor"
            strokeWidth="1.8"
            transform="rotate(120 16 16)"
          />
        </LogoFrame>
      );
    case "Node.js":
      return (
        <LogoFrame className={className}>
          <path d="M16 2.8 27.4 9.4v13.2L16 29.2 4.6 22.6V9.4L16 2.8Z" fill="currentColor" />
          <path
            d="M11 22V10l10 12V10"
            stroke="white"
            strokeWidth="2.2"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </LogoFrame>
      );
    case "Vue.js":
      return (
        <LogoFrame className={className}>
          <path d="M2.5 5h6.2L16 17.5 23.3 5h6.2L16 28 2.5 5Z" fill="currentColor" />
          <path d="M8.7 5h5L16 9l2.3-4h5L16 17.5 8.7 5Z" fill="#35495e" />
        </LogoFrame>
      );
    case "Next.js":
      return (
        <LogoFrame className={className}>
          <circle cx="16" cy="16" r="14" fill="currentColor" />
          <path
            d="M10 22V10l12 16M21.5 10v9"
            stroke="white"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </LogoFrame>
      );
    case "NestJS":
      return (
        <LogoFrame className={className}>
          <path d="M16 2.5 27 8.8v12.4L16 27.5 5 21.2V8.8L16 2.5Z" fill="currentColor" />
          <path
            d="M10.5 21.5v-11l11 11v-11"
            stroke="white"
            strokeWidth="2.1"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </LogoFrame>
      );
    case "TypeScript":
      return (
        <LogoFrame className={className}>
          <rect x="3" y="3" width="26" height="26" rx="4" fill="currentColor" />
          <path
            d="M8 11h11M13.5 11v12M20 20.8c1 .8 3.4 1.1 4.2-.2 1.6-2.7-4.8-2.2-3.7-5.3.7-1.8 3.4-1.5 4.4-.6"
            stroke="white"
            strokeWidth="2"
            strokeLinecap="round"
          />
        </LogoFrame>
      );
    case "JavaScript":
      return (
        <LogoFrame className={className}>
          <rect x="3" y="3" width="26" height="26" rx="4" fill="currentColor" />
          <path
            d="M15 10v10.5c0 3.4-4.1 3.3-5.3 1.1M20 21c1 .9 3.9 1.3 4.6-.4 1.2-2.8-5-2.1-3.8-5.4.7-1.8 3.5-1.5 4.5-.5"
            stroke="#111827"
            strokeWidth="2"
            strokeLinecap="round"
          />
        </LogoFrame>
      );
    case ".NET":
      return (
        <LogoFrame className={className}>
          <circle cx="16" cy="16" r="14" fill="currentColor" />
          <circle cx="8.5" cy="21.5" r="1.5" fill="white" />
          <path
            d="M12 21V11l7.5 10V11M21.5 11H28M24.8 11v10"
            stroke="white"
            strokeWidth="1.8"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </LogoFrame>
      );
    case "Python":
      return (
        <LogoFrame className={className}>
          <path
            d="M16 3c-7 0-6.6 3.1-6.6 3.1v5h6.8v1.5H6.7S3 12.2 3 18.2s3.2 5.8 3.2 5.8h3.2v-4.4s-.2-3.2 3.1-3.2h7s3 .1 3-2.9V6.3S23 3 16 3Z"
            fill="#3776ab"
          />
          <path
            d="M16 29c7 0 6.6-3.1 6.6-3.1v-5h-6.8v-1.5h9.5s3.7.4 3.7-5.6S25.8 8 25.8 8h-3.2v4.4s.2 3.2-3.1 3.2h-7s-3-.1-3 2.9v7.2S9 29 16 29Z"
            fill="#ffd43b"
          />
          <circle cx="13" cy="7" r="1.1" fill="white" />
          <circle cx="19" cy="25" r="1.1" fill="white" />
        </LogoFrame>
      );
    case "PHP":
      return (
        <LogoFrame className={className}>
          <ellipse cx="16" cy="16" rx="14" ry="8.5" fill="currentColor" />
          <path
            d="M7 20l2-8h4c4 0 3.3 6-1 6H9M15 20l2-8M16 16h4l1-4M21 20l2-8h3c4 0 3 6-1 6h-2"
            stroke="white"
            strokeWidth="1.5"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </LogoFrame>
      );
    case "Java":
      return (
        <LogoFrame className={className}>
          <path d="M12 20h10c0 4-2.2 6-5 6s-5-2-5-6Z" fill="currentColor" />
          <path
            d="M22 20c3-.2 4.5 1 2.5 2.5M10 27h14M16 18c-4-5 6-5 2-10M19 17c-2.5-3 5-4 3-8"
            stroke="currentColor"
            strokeWidth="1.8"
            strokeLinecap="round"
          />
        </LogoFrame>
      );
    case "Kotlin":
      return (
        <LogoFrame className={className}>
          <path d="M4 4h24L16 16 28 28H4V4Z" fill="currentColor" />
          <path d="M4 28 16 16 28 28H4Z" fill="#e44857" opacity=".9" />
          <path d="M4 4h24L4 28V4Z" fill="#0095d5" opacity=".75" />
        </LogoFrame>
      );
    case "Flutter":
      return (
        <LogoFrame className={className}>
          <path
            d="M18.5 3 5 16.5l4.2 4.2L27 3h-8.5ZM18.5 17 11 24.5l4.2 4.2 7.5-7.5L18.5 17Z"
            fill="currentColor"
          />
          <path d="m11 24.5 4.2-4.2 7.5 7.5-4.2 4.2-7.5-7.5Z" fill="#13b9fd" />
        </LogoFrame>
      );
    case "Go":
      return (
        <LogoFrame className={className}>
          <path
            d="M3 12h8M1 16h8M3 20h8"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
          />
          <path
            d="M12 10h7l-1 4h-3l-1 4h4l1-3h5l-2 7H11l3-12ZM24 10h7l-3 12h-7l3-12Z"
            fill="currentColor"
          />
        </LogoFrame>
      );
    case "Docker":
      return (
        <LogoFrame className={className}>
          <path d="M5 16h23c-.5 7-5 11-12 11S5.5 23.5 5 16Z" fill="currentColor" />
          <path d="M25 14c1-3 3-4 5-3-1 3-2.5 4-5 3Z" fill="currentColor" />
          {[6, 11, 16, 21].map((x) => (
            <rect key={x} x={x} y="11" width="4" height="4" rx=".5" fill="currentColor" />
          ))}
          {[11, 16].map((x) => (
            <rect key={x} x={x} y="6" width="4" height="4" rx=".5" fill="currentColor" />
          ))}
        </LogoFrame>
      );
    case "PostgreSQL":
      return (
        <LogoFrame className={className}>
          <path
            d="M8 7c3-4 13-4 16 1 3 5 1 13-3 17-2 2-4 3-5 1-1-2 1-5 3-7-3 2-7 3-10 1C5 17 4 11 8 7Z"
            fill="currentColor"
          />
          <path
            d="M13 10c2-2 6-2 7 1 1 3-1 6-4 7-2 1-4-1-4-3 0-2 0-4 1-5ZM17 18c-1 4 0 7 2 9"
            stroke="white"
            strokeWidth="1.6"
            strokeLinecap="round"
          />
          <circle cx="13" cy="11" r="1" fill="white" />
        </LogoFrame>
      );
    default:
      return (
        <LogoFrame className={className}>
          <circle cx="16" cy="16" r="13" fill="currentColor" />
          <path d="M10 16h12M16 10v12" stroke="white" strokeWidth="2" strokeLinecap="round" />
        </LogoFrame>
      );
  }
}
