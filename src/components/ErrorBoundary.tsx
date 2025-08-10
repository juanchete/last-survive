import React, { Component, ErrorInfo, ReactNode } from 'react';
import { AlertTriangle, RefreshCw, Home } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { isProduction } from '@/config';

interface Props {
  children: ReactNode;
  fallback?: ReactNode;
}

interface State {
  hasError: boolean;
  error: Error | null;
  errorInfo: ErrorInfo | null;
  errorId: string | null;
}

export class ErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = {
      hasError: false,
      error: null,
      errorInfo: null,
      errorId: null,
    };
  }

  static getDerivedStateFromError(error: Error): State {
    // Generate a unique error ID for tracking
    const errorId = `err_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    
    return {
      hasError: true,
      error,
      errorInfo: null,
      errorId,
    };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    // Log to console in development
    if (!isProduction()) {
      console.error('ErrorBoundary caught an error:', error, errorInfo);
    }

    // Update state with error info
    this.setState({
      errorInfo,
    });

    // In production, send error to monitoring service
    if (isProduction() && window.Sentry) {
      window.Sentry.captureException(error, {
        contexts: {
          react: {
            componentStack: errorInfo.componentStack,
          },
        },
        tags: {
          error_boundary: true,
          error_id: this.state.errorId,
        },
      });
    }
  }

  handleReset = () => {
    this.setState({
      hasError: false,
      error: null,
      errorInfo: null,
      errorId: null,
    });
  };

  handleGoHome = () => {
    window.location.href = '/';
  };

  render() {
    if (this.state.hasError) {
      // Use custom fallback if provided
      if (this.props.fallback) {
        return <>{this.props.fallback}</>;
      }

      // Default error UI
      return (
        <div className="min-h-screen bg-nfl-dark flex items-center justify-center p-4">
          <Card className="max-w-2xl w-full bg-nfl-gray border-nfl-light-gray/20">
            <CardHeader className="text-center">
              <div className="mx-auto mb-4 w-16 h-16 bg-red-500/20 rounded-full flex items-center justify-center">
                <AlertTriangle className="h-8 w-8 text-red-500" />
              </div>
              <CardTitle className="text-2xl text-white">Oops! Something went wrong</CardTitle>
              <CardDescription className="text-gray-400">
                {isProduction()
                  ? "We're sorry for the inconvenience. The error has been reported to our team."
                  : "An error occurred while rendering this page."}
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {/* Error ID for reference */}
              {this.state.errorId && (
                <Alert className="bg-nfl-dark border-nfl-light-gray/20">
                  <AlertDescription className="text-sm text-gray-400">
                    Error ID: <code className="text-xs">{this.state.errorId}</code>
                  </AlertDescription>
                </Alert>
              )}

              {/* Error details in development */}
              {!isProduction() && this.state.error && (
                <Alert className="bg-red-500/10 border-red-500/20">
                  <AlertDescription>
                    <div className="space-y-2">
                      <p className="font-semibold text-red-400">
                        {this.state.error.toString()}
                      </p>
                      {this.state.errorInfo && (
                        <details className="text-xs text-gray-400">
                          <summary className="cursor-pointer hover:text-gray-300">
                            Component Stack
                          </summary>
                          <pre className="mt-2 whitespace-pre-wrap overflow-x-auto">
                            {this.state.errorInfo.componentStack}
                          </pre>
                        </details>
                      )}
                    </div>
                  </AlertDescription>
                </Alert>
              )}

              {/* Action buttons */}
              <div className="flex flex-col sm:flex-row gap-3">
                <Button
                  onClick={this.handleReset}
                  className="flex-1"
                  variant="default"
                >
                  <RefreshCw className="h-4 w-4 mr-2" />
                  Try Again
                </Button>
                <Button
                  onClick={this.handleGoHome}
                  className="flex-1"
                  variant="outline"
                >
                  <Home className="h-4 w-4 mr-2" />
                  Go to Home
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      );
    }

    return this.props.children;
  }
}

// Async Error Boundary for handling async errors
export function AsyncErrorBoundary({ children }: { children: ReactNode }) {
  const [error, setError] = React.useState<Error | null>(null);

  React.useEffect(() => {
    const handleUnhandledRejection = (event: PromiseRejectionEvent) => {
      setError(new Error(event.reason));
    };

    window.addEventListener('unhandledrejection', handleUnhandledRejection);
    return () => {
      window.removeEventListener('unhandledrejection', handleUnhandledRejection);
    };
  }, []);

  if (error) {
    throw error;
  }

  return <>{children}</>;
}

// Route Error Boundary for specific route errors
export function RouteErrorBoundary({ children }: { children: ReactNode }) {
  return (
    <ErrorBoundary
      fallback={
        <div className="min-h-screen bg-nfl-dark flex items-center justify-center p-4">
          <Card className="max-w-md w-full bg-nfl-gray border-nfl-light-gray/20">
            <CardHeader>
              <CardTitle className="text-white">Page Error</CardTitle>
              <CardDescription className="text-gray-400">
                This page encountered an error and cannot be displayed.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Button onClick={() => window.location.href = '/'} className="w-full">
                Return to Home
              </Button>
            </CardContent>
          </Card>
        </div>
      }
    >
      {children}
    </ErrorBoundary>
  );
}