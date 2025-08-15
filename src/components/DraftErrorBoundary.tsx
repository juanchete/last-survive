import React, { Component, ErrorInfo, ReactNode } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { AlertTriangle, RefreshCw } from 'lucide-react';

interface Props {
  children: ReactNode;
}

interface State {
  hasError: boolean;
  error: Error | null;
  errorInfo: ErrorInfo | null;
}

export class DraftErrorBoundary extends Component<Props, State> {
  public state: State = {
    hasError: false,
    error: null,
    errorInfo: null
  };

  public static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error, errorInfo: null };
  }

  public componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    this.setState({
      error,
      errorInfo
    });
  }

  private handleReset = () => {
    this.setState({ hasError: false, error: null, errorInfo: null });
    window.location.reload();
  };

  public render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-screen bg-gradient-to-br from-nfl-dark-gray to-black p-4">
          <div className="container mx-auto max-w-2xl">
            <Card className="bg-nfl-gray border-red-500/50">
              <CardHeader className="bg-red-900/20 border-b border-red-500/30">
                <CardTitle className="flex items-center gap-2 text-red-400">
                  <AlertTriangle className="w-6 h-6" />
                  Draft Error
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4 pt-6">
                <div className="text-white">
                  <p className="mb-2">Something went wrong with the draft system.</p>
                  <p className="text-sm text-gray-400">
                    The error has been logged. Please try refreshing the page.
                  </p>
                </div>
                
                {process.env.NODE_ENV === 'development' && this.state.error && (
                  <div className="bg-black/50 rounded-lg p-4 border border-red-500/20">
                    <p className="text-red-400 font-mono text-sm mb-2">
                      {this.state.error.toString()}
                    </p>
                    {this.state.errorInfo && (
                      <pre className="text-gray-500 text-xs overflow-auto max-h-40">
                        {this.state.errorInfo.componentStack}
                      </pre>
                    )}
                  </div>
                )}
                
                <Button 
                  onClick={this.handleReset}
                  className="w-full bg-nfl-blue hover:bg-nfl-blue/80"
                >
                  <RefreshCw className="w-4 h-4 mr-2" />
                  Refresh Page
                </Button>
              </CardContent>
            </Card>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}