import React, { Component, ReactNode } from 'react';

interface Props {
  children: ReactNode;
  fallback?: ReactNode;
}

interface State {
  hasError: boolean;
  error?: Error;
}

class ErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    console.error('LessonPlan Error Boundary caught an error:', error, errorInfo);
  }

  render() {
    if (this.state.hasError) {
      return (
        this.props.fallback || (
          <div className="backdrop-blur-xl bg-red-50/80 border border-red-200/50 rounded-2xl shadow-lg px-4 py-3 dark:bg-red-900/20 dark:border-red-700/50">
            <div className="flex items-center space-x-3">
              <div className="w-8 h-8 bg-red-100 rounded-full flex items-center justify-center dark:bg-red-900/40">
                <span className="text-red-600 dark:text-red-400">⚠️</span>
              </div>
              <div>
                <h3 className="text-sm font-medium text-red-800 dark:text-red-200">
                  Something went wrong
                </h3>
                <p className="text-xs text-red-700 dark:text-red-300 mt-1">
                  Unable to display this lesson plan component. Please try refreshing the page.
                </p>
                {process.env.NODE_ENV === 'development' && this.state.error && (
                  <details className="mt-2">
                    <summary className="text-xs cursor-pointer text-red-600 dark:text-red-400">
                      Error details
                    </summary>
                    <pre className="text-xs text-red-600 dark:text-red-400 mt-1 whitespace-pre-wrap">
                      {this.state.error.message}
                    </pre>
                  </details>
                )}
              </div>
            </div>
          </div>
        )
      );
    }

    return this.props.children;
  }
}

export default ErrorBoundary;