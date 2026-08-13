"use client";

import { NotFoundView } from "@/components/errors/not-found-view";

/**
 * Ensures notFound() under /t4abriz always uses the same public 404 template,
 * even if a parent segment tries to style the area differently.
 */
export default function StaffAreaNotFound(): React.ReactElement {
  return <NotFoundView />;
}
