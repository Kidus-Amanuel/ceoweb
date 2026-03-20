"use client";

import React, { Component, type ErrorInfo, type ReactNode } from "react";
import { AlertTriangle } from "lucide-react";
import { Button } from "@/components/shared/ui/button/Button";

type Props = {
  children: ReactNode;
  featureName: string;
};

type State = {
  hasError: boolean;
};

export class WorkspaceErrorBoundary extends Component<Props, State> {
  state: State = { hasError: false };

  static getDerivedStateFromError(): State {
    return { hasError: true };
  }

  componentDidCatch(error: Error, info: ErrorInfo) {
    if (process.env.NODE_ENV === "development") {
      console.error(`[${this.props.featureName} ErrorBoundary]`, error, info);
    }
  }

  reset = () => this.setState({ hasError: false });

  render() {
    if (!this.state.hasError) return this.props.children;
    return (
      <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-4 text-red-700 flex items-start gap-3">
        <AlertTriangle className="h-5 w-5 mt-0.5" />
        <div className="min-w-0">
          <p className="font-semibold">
            Something went wrong in {this.props.featureName}.
          </p>
          <p className="text-sm mt-1">
            Please retry. If this keeps happening, refresh the page.
          </p>
          <Button
            type="button"
            variant="outline"
            className="mt-3 border-red-200 text-red-700 hover:bg-red-100"
            onClick={this.reset}
          >
            Retry
          </Button>
        </div>
      </div>
    );
  }
}
