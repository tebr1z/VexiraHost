interface MaterialIconProps {
  name: string;
  filled?: boolean;
  className?: string;
}

export function MaterialIcon({
  name,
  filled = false,
  className = "",
}: MaterialIconProps): React.ReactElement {
  return (
    <span
      className={`material-symbols-outlined ${filled ? "material-symbols-filled" : ""} ${className}`}
    >
      {name}
    </span>
  );
}
