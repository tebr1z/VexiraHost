import { cn } from "@vexira/ui";

interface ContainerProps extends React.HTMLAttributes<HTMLDivElement> {
  size?: "sm" | "md" | "lg" | "xl" | "full";
}

/**
 * Layout container — presentation only.
 */
export function Container({
  className,
  size = "lg",
  ...props
}: ContainerProps): React.ReactElement {
  return (
    <div
      className={cn(
        "mx-auto w-full px-4 sm:px-6 lg:px-8",
        {
          "max-w-screen-sm": size === "sm",
          "max-w-screen-md": size === "md",
          "max-w-screen-lg": size === "lg",
          "max-w-screen-xl": size === "xl",
          "max-w-full": size === "full",
        },
        className,
      )}
      {...props}
    />
  );
}
