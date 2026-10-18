interface MaterialIconProps {
  name: string;
  filled?: boolean;
  className?: string;
}

const ICON_ALIASES: Record<string, string> = {
  snapshot: "photo_camera",
};

export function MaterialIcon({
  name,
  filled = false,
  className = "",
}: MaterialIconProps): React.ReactElement {
  const resolvedName = ICON_ALIASES[name.trim().toLowerCase()] ?? name;
  return (
    <span
      aria-hidden="true"
      className={`material-symbols-outlined ${filled ? "material-symbols-filled" : ""} ${className}`}
    >
      {resolvedName}
    </span>
  );
}
