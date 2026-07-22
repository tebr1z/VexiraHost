"use client";

import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { useState, type ReactNode } from "react";

import { ToastContainer } from "@/components/ui/toast-container";

import { AuthHydrationProvider } from "./auth-hydration-provider";
import { ThemeProvider } from "./theme-provider";

interface AppProvidersProps {
  children: ReactNode;
}

export function AppProviders({ children }: AppProvidersProps): React.ReactElement {
  const [queryClient] = useState(
    () =>
      new QueryClient({
        defaultOptions: {
          queries: {
            staleTime: 60 * 1000,
            retry: 1,
          },
        },
      }),
  );

  return (
    <QueryClientProvider client={queryClient}>
      <ThemeProvider>
        <AuthHydrationProvider>
          {children}
          <ToastContainer />
        </AuthHydrationProvider>
      </ThemeProvider>
    </QueryClientProvider>
  );
}
