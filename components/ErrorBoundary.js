import React from "react";

const isDevelopment = process.env.NODE_ENV !== "production";

class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = {
      hasError: false,
      error: null,
      errorInfo: null,
    };
  }

  static getDerivedStateFromError(error) {
    return {
      hasError: true,
      error,
    };
  }

  componentDidCatch(error, errorInfo) {
    this.setState({ errorInfo });

    const errorContext = {
      message: error?.message || "Unknown error",
      stack: error?.stack || null,
      componentStack: errorInfo?.componentStack || null,
      pathname: typeof window !== "undefined" ? window.location.pathname : null,
      timestamp: new Date().toISOString(),
    };

    console.error(
      "[ErrorBoundary] Caught a React rendering error.",
      errorContext
    );

    if (typeof this.props.onError === "function") {
      this.props.onError(error, errorInfo, errorContext);
    }
  }

  handleReset = () => {
    this.setState({
      hasError: false,
      error: null,
      errorInfo: null,
    });
  };

  handleReload = () => {
    if (typeof window !== "undefined") {
      window.location.reload();
    }
  };

  handleGoHome = () => {
    if (typeof window !== "undefined") {
      window.location.assign("/");
    }
  };

  renderFallback() {
    const { fallback } = this.props;

    if (typeof fallback === "function") {
      return fallback({
        error: this.state.error,
        errorInfo: this.state.errorInfo,
        reset: this.handleReset,
      });
    }

    if (fallback) {
      return fallback;
    }

    return (
      <main className="flex min-h-screen items-center justify-center bg-[#fdf8f6] px-4 py-10">
        <div
          className="w-full max-w-lg rounded-2xl border border-[#eaded8] bg-white p-8 text-center shadow-sm"
          role="alert"
        >
          <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-[#fff1f1] text-xl font-bold text-[#B52326]">
            !
          </div>
          <h1 className="mb-2 text-2xl font-bold text-[#2f2320]">
            Something went wrong
          </h1>
          <p className="mb-6 text-sm leading-6 text-[#5b3a34] sm:text-base">
            The page hit an unexpected error. You can try again, reload the
            page, or go back to the home page.
          </p>

          {isDevelopment && this.state.error && (
            <details className="mb-6 rounded-xl border border-[#f1d3d4] bg-[#fff7f7] p-4 text-left">
              <summary className="cursor-pointer text-sm font-semibold text-[#8f2e31]">
                Error details
              </summary>
              <pre className="mt-3 overflow-x-auto whitespace-pre-wrap break-words text-xs text-[#8f2e31]">
                {this.state.error.toString()}
                {this.state.errorInfo?.componentStack
                  ? `\n\n${this.state.errorInfo.componentStack}`
                  : ""}
              </pre>
            </details>
          )}

          <div className="flex flex-col gap-3 sm:flex-row">
            <button
              type="button"
              onClick={this.handleReset}
              className="flex-1 rounded-lg border border-[#d8c7c1] px-4 py-2.5 font-semibold text-[#2f2320] transition hover:bg-[#f8efec]"
            >
              Try again
            </button>
            <button
              type="button"
              onClick={this.handleReload}
              className="flex-1 rounded-lg bg-[#B52326] px-4 py-2.5 font-semibold text-white transition hover:bg-[#9E1F22]"
            >
              Reload page
            </button>
            <button
              type="button"
              onClick={this.handleGoHome}
              className="flex-1 rounded-lg border border-[#d8c7c1] px-4 py-2.5 font-semibold text-[#2f2320] transition hover:bg-[#f8efec]"
            >
              Go home
            </button>
          </div>
        </div>
      </main>
    );
  }

  render() {
    if (this.state.hasError) {
      return this.renderFallback();
    }

    return this.props.children;
  }
}

export default ErrorBoundary;
