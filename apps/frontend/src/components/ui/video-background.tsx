"use client";

import { cn } from "@/lib/cn";

const DEFAULT_VIDEO =
  "https://videos.pexels.com/video-files/3129957/3129957-sd_640_360_30fps.mp4";

const DEFAULT_POSTER =
  "https://images.pexels.com/photos/325111/pexels-photo-325111.jpeg?auto=compress&cs=tinysrgb&w=1920";

export function VideoBackground({
  className,
  videoSrc = DEFAULT_VIDEO,
  posterSrc = DEFAULT_POSTER,
  overlayClassName,
}: {
  className?: string;
  videoSrc?: string;
  posterSrc?: string;
  overlayClassName?: string;
}): React.ReactElement {
  return (
    <div className={cn("absolute inset-0 overflow-hidden", className)} aria-hidden>
      <video
        autoPlay
        muted
        loop
        playsInline
        poster={posterSrc}
        className="h-full w-full object-cover"
      >
        <source src={videoSrc} type="video/mp4" />
      </video>
      <div
        className={cn(
          "absolute inset-0 bg-gradient-to-b from-slate-950/75 via-slate-900/60 to-slate-950/90",
          overlayClassName,
        )}
      />
    </div>
  );
}
