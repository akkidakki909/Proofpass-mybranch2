import { Component } from 'react'

export default class ErrorBoundary extends Component {
  first = null
  state = { err: null }
  static getDerivedStateFromError(err) {
    return { err }
  }
  componentDidCatch(err, info) {
    if (!this.first) this.first = { err, stack: info && info.componentStack }
    console.error(err)
  }
  render() {
    if (!this.state.err) return this.props.children
    if (this.props.fallback !== undefined) return this.props.fallback
    const f = this.first || { err: this.state.err }
    return (
      <pre style={{ padding: 24, whiteSpace: 'pre-wrap', font: '14px monospace', color: 'var(--ink)' }}>
        {String(f.err.stack || f.err)}
        {f.stack}
      </pre>
    )
  }
}
