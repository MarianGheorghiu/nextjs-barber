import { Component } from 'react';
import type { ErrorInfo, ReactNode } from 'react';
export class ErrorBoundary extends Component<{ children: ReactNode }, { failed: boolean }> {
  state = { failed: false };
  static getDerivedStateFromError() { return { failed: true }; }
  componentDidCatch(_error: Error, _info: ErrorInfo) { /* No personal data or sessions sent to third parties. */ }
  render() {
    if (this.state.failed) return <main className="empty loading-page"><h1>Reîncarcă atelierul.</h1><p className="muted">Pagina nu s-a putut afișa. Datele salvate rămân în contul tău.</p><button className="primary" onClick={() => location.reload()}>Reîncarcă pagina</button></main>;
    return this.props.children;
  }
}
