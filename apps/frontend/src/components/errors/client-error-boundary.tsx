"use client";

import React from "react";

import { ErrorShell } from "./error-shell";

interface ClientErrorBoundaryProps {
  children: React.ReactNode;
  fallbackNamespace?: "boundary" | "server";
}

interface ClientErrorBoundaryState {
  hasError: boolean;
  error?: Error;
}

export class ClientErrorBoundary extends React.Component<
  ClientErrorBoundaryProps,
  ClientErrorBoundaryState
> {
  constructor(props: ClientErrorBoundaryProps) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError(error: Error): ClientErrorBoundaryState {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, info: React.ErrorInfo): void {
    console.error("[ClientErrorBoundary]", error, info.componentStack);
  }

  render(): React.ReactNode {
    if (this.state.hasError) {
      return (
        <ErrorShell
          variant="boundary"
          namespace={this.props.fallbackNamespace ?? "boundary"}
          onRetry={() => this.setState({ hasError: false, error: undefined })}
          errorDigest={this.state.error?.message}
        />
      );
    }

    return this.props.children;
  }
}
