"use client";

import React from "react";
import { AlertTriangle } from "lucide-react";

type Props = {
  children: React.ReactNode;
};

type State = {
  hasError: boolean;
};

export class DashboardErrorBoundary extends React.Component<Props, State> {
  state: State = { hasError: false };

  static getDerivedStateFromError(): State {
    return { hasError: true };
  }

  componentDidCatch(error: Error) {
    console.error("Dashboard rendering failed.", error);
  }

  private handleRetry = () => {
    this.setState({ hasError: false });
    window.location.reload();
  };

  render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-screen bg-[#050505] flex flex-col items-center justify-center text-center text-white px-6">
          <AlertTriangle className="text-red-500 mb-4" size={48} />
          <h1 className="font-bold text-xl mb-2">Something went wrong</h1>
          <p className="text-sm text-gray-400 mb-6 max-w-sm">
            The dashboard hit an unexpected error. Reload to try again.
          </p>
          <button
            onClick={this.handleRetry}
            className="bg-white/10 hover:bg-white/20 px-5 py-3 rounded-lg font-bold text-sm transition-colors"
          >
            Reload Dashboard
          </button>
        </div>
      );
    }

    return this.props.children;
  }
}
