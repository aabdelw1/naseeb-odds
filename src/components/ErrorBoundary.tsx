import { Component, type ErrorInfo, type ReactNode } from 'react'

interface State {
  failed: boolean
}

/**
 * Keeps one broken render from wiping the page. Without it React tears down the whole app on an
 * error, leaving only the plain text below it and no way back except a manual reload.
 */
export class ErrorBoundary extends Component<{ children: ReactNode }, State> {
  state: State = { failed: false }

  static getDerivedStateFromError(): State {
    return { failed: true }
  }

  componentDidCatch(error: Error, info: ErrorInfo): void {
    console.error('Naseeb Odds hit an error', error, info.componentStack)
  }

  render(): ReactNode {
    if (!this.state.failed) return this.props.children
    return (
      <div className="crash">
        <p>Something went wrong on our end.</p>
        <button type="button" onClick={() => window.location.reload()}>
          Start over
        </button>
      </div>
    )
  }
}
