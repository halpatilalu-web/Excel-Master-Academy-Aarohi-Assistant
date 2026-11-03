import { Component, type ErrorInfo, type ReactNode } from "react";
import { Button, Card } from "./ui";

interface Props {
  children: ReactNode;
}

interface State {
  error: Error | null;
}

export class ErrorBoundary extends Component<Props, State> {
  state: State = { error: null };

  static getDerivedStateFromError(error: Error): State {
    return { error };
  }

  componentDidCatch(error: Error, info: ErrorInfo) {
    console.error("Excel Master Academy UI error", error, info.componentStack);
  }

  render() {
    if (!this.state.error) return this.props.children;

    return (
      <Card className="max-w-xl mx-auto mt-8">
        <h1 className="font-display text-xl font-extrabold">Kuch gadbad ho gayi</h1>
        <p className="text-sm text-(--color-muted) mt-2">
          Page dobara load karke try karo. Tumhari server par saved progress surakshit rehni chahiye.
        </p>
        <Button className="mt-4" onClick={() => window.location.reload()}>
          Page reload karo
        </Button>
      </Card>
    );
  }
}
