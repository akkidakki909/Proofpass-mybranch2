import { memo, useEffect, useRef, useState } from 'react'

const ChatBubble = memo(function ChatBubble({ item }) {
  return (
    <div className={`chat-bubble log-bubble ${item.type}`}>
      <div className="bubble-meta">
        {item.time && <span className="bubble-time m">{item.time}</span>}
        <span className={`bubble-type-tag m ${item.type}`}>
          {item.type.toUpperCase()}
        </span>
      </div>
      <div className="bubble-content m">
        {item.text}
      </div>
    </div>
  )
})

export default function VerificationChatbot({
  isOpen,
  onToggle,
  onClose,
  logs = [],
  currentStep = 0,
  currentStepTitle = '',
  stepStatus = 'waiting',
  isProcessing = false,
  hasStarted = false,
}) {
  const [copied, setCopied] = useState(false)
  const [filter, setFilter] = useState('all') // 'all' | 'steps' | 'hashes' | 'alerts'
  const chatBodyRef = useRef(null)
  const isUserScrolledUp = useRef(false)
  const prevLogsLength = useRef(logs.length)

  // Auto-scroll on new logs if user hasn't explicitly scrolled up
  useEffect(() => {
    if (chatBodyRef.current && (!isUserScrolledUp.current || logs.length > prevLogsLength.current)) {
      chatBodyRef.current.scrollTop = chatBodyRef.current.scrollHeight
    }
    prevLogsLength.current = logs.length
  }, [logs, isOpen])

  const handleScroll = () => {
    if (!chatBodyRef.current) return
    const { scrollTop, scrollHeight, clientHeight } = chatBodyRef.current
    const isAtBottom = scrollHeight - scrollTop - clientHeight < 40
    isUserScrolledUp.current = !isAtBottom
  }

  const scrollToBottom = () => {
    if (chatBodyRef.current) {
      chatBodyRef.current.scrollTo({
        top: chatBodyRef.current.scrollHeight,
        behavior: 'smooth',
      })
      isUserScrolledUp.current = false
    }
  }

  const handleCopyLogs = async () => {
    try {
      await navigator.clipboard.writeText(logs.join('\n'))
      setCopied(true)
      setTimeout(() => setCopied(false), 2200)
    } catch {
      // Fallback if clipboard API restricted
    }
  }

  // Parse log line into metadata
  const parseLogLine = (line) => {
    const timeMatch = line.match(/^\[(.*?)\]\s*(.*)$/)
    const time = timeMatch ? timeMatch[1] : ''
    const text = timeMatch ? timeMatch[2] : line

    let type = 'info'
    if (/step \d+|progressing to step/i.test(text)) type = 'step'
    else if (/sha-256|hash|digest|seal/i.test(text)) type = 'hash'
    else if (/error|flagged|tamper detected|validation error/i.test(text)) type = 'alert'
    else if (/confirmed|passed|completed|verified/i.test(text)) type = 'success'
    else if (/advisory|sample model/i.test(text)) type = 'advisory'

    return { time, text, type }
  }

  const filteredLogs = logs.map(parseLogLine).filter((item) => {
    if (filter === 'steps') return item.type === 'step'
    if (filter === 'hashes') return item.type === 'hash'
    if (filter === 'alerts') return item.type === 'alert'
    return true
  })

  return (
    <div className="verification-chatbot-container" aria-label="Verification Chatbot">
      {/* FLOATING LAUNCHER BUTTON IN THE RIGHT CORNER (WHEN HIDDEN) */}
      {!isOpen && (
        <button
          type="button"
          className={`chatbot-launcher-btn ${hasStarted ? 'pulse-attention' : ''}`}
          onClick={onToggle}
          aria-expanded={isOpen}
          aria-label="Show Live Verification Log Chatbot"
          title="Open Live Verification Log Chatbot"
        >
          <span className="chatbot-launcher-status">
            <span className={`chatbot-pulse-dot ${isProcessing ? 'processing' : 'ready'}`} />
          </span>
          <svg
            className="chatbot-icon"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
            aria-hidden="true"
          >
            <rect x="3" y="11" width="18" height="10" rx="3" />
            <circle cx="12" cy="5" r="2" />
            <path d="M12 7v4" />
            <line x1="8" y1="16" x2="8.01" y2="16" />
            <line x1="16" y1="16" x2="16.01" y2="16" />
          </svg>
          <span className="chatbot-launcher-label">Show Verification Log</span>
          <span className="chatbot-badge" aria-label={`${logs.length} logs recorded`}>
            {logs.length}
          </span>
        </button>
      )}

      {/* EXPANDED CHATBOT WINDOW IN RIGHT CORNER */}
      {isOpen && (
        <aside
          className="chatbot-window"
          role="dialog"
          aria-label="Live Verification Audit Chatbot"
          data-lenis-prevent
        >
          {/* CHATBOT HEADER */}
          <div className="chatbot-header">
            <div className="chatbot-brand">
              <div className="chatbot-avatar">
                <svg
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  aria-hidden="true"
                >
                  <rect x="3" y="11" width="18" height="10" rx="3" />
                  <circle cx="12" cy="5" r="2" />
                  <path d="M12 7v4" />
                  <line x1="8" y1="16" x2="8.01" y2="16" />
                  <line x1="16" y1="16" x2="16.01" y2="16" />
                </svg>
                <span className={`chatbot-online-dot ${isProcessing ? 'processing' : 'active'}`} />
              </div>
              <div className="chatbot-titles">
                <div className="chatbot-title-row">
                  <h3 className="chatbot-title">ProofPass Engine Bot</h3>
                  <span className="chatbot-tag m">AUDIT LOG</span>
                </div>
                <p className="chatbot-subtitle m">
                  {isProcessing ? 'Executing deterministic pipeline...' : 'Live audit stream active'}
                </p>
              </div>
            </div>

            <div className="chatbot-header-actions">
              <button
                type="button"
                className="chatbot-action-btn"
                onClick={handleCopyLogs}
                title="Copy all logs to clipboard"
                aria-label="Copy logs"
              >
                {copied ? (
                  <span className="copied-text m">Copied!</span>
                ) : (
                  <svg
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    aria-hidden="true"
                  >
                    <rect x="9" y="9" width="13" height="13" rx="2" ry="2" />
                    <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1" />
                  </svg>
                )}
              </button>

              <button
                type="button"
                className="chatbot-hide-btn"
                onClick={onClose}
                aria-label="Hide verification chatbot"
                title="Hide chatbot log"
              >
                <span>Hide</span>
                <svg
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2.5"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  aria-hidden="true"
                >
                  <polyline points="6 9 12 15 18 9" />
                </svg>
              </button>
            </div>
          </div>

          {/* ACTIVE PIPELINE STEP TICKER */}
          <div className="chatbot-step-bar">
            <div className="step-bar-info">
              <span className="step-bar-num m">STEP 0{currentStep}</span>
              <span className="step-bar-title">{currentStepTitle || 'Intake'}</span>
            </div>
            <div className="step-bar-status">
              <span className={`status-pill ${stepStatus}`}>
                {stepStatus.toUpperCase()}
              </span>
            </div>
          </div>

          {/* FILTER PILLS */}
          <div className="chatbot-filter-bar">
            <button
              type="button"
              className={`filter-pill ${filter === 'all' ? 'active' : ''}`}
              onClick={() => setFilter('all')}
            >
              All ({logs.length})
            </button>
            <button
              type="button"
              className={`filter-pill ${filter === 'steps' ? 'active' : ''}`}
              onClick={() => setFilter('steps')}
            >
              Steps
            </button>
            <button
              type="button"
              className={`filter-pill ${filter === 'hashes' ? 'active' : ''}`}
              onClick={() => setFilter('hashes')}
            >
              Hashes & Seals
            </button>
            <button
              type="button"
              className={`filter-pill ${filter === 'alerts' ? 'active' : ''}`}
              onClick={() => setFilter('alerts')}
            >
              Alerts
            </button>
          </div>

          {/* CHATBOT MESSAGE BODY STREAM */}
          <div
            className="chatbot-body"
            ref={chatBodyRef}
            onScroll={handleScroll}
            tabIndex={0}
            aria-live="polite"
            data-lenis-prevent
          >
            {/* INTRO MESSAGE FROM BOT */}
            <div className="chat-bubble bot-intro">
              <div className="bubble-header">
                <span className="bubble-author">ProofPass Verification Bot</span>
                <span className="bubble-badge m">SYSTEM</span>
              </div>
              <p className="bubble-content">
                Welcome to the live verification audit stream. Every step of the intake, resume extraction, advisory LLM proposals, code file hash checks, authorship depth, micro-check evaluations, and SHA-256 seal issuance is logged below deterministically.
              </p>
            </div>

            {/* LOG MESSAGES */}
            {filteredLogs.map((item, idx) => (
              <ChatBubble key={idx} item={item} />
            ))}

            {isProcessing && (
              <div className="chat-bubble processing-bubble">
                <span className="m">Verification engine running step 0{currentStep}...</span>
                <div className="typing-dots">
                  <span /><span /><span />
                </div>
              </div>
            )}
          </div>

          {/* CHATBOT FOOTER */}
          <div className="chatbot-footer">
            <div className="chatbot-engine-info m">
              <span className="engine-dot" />
              <span>DETERMINISTIC SHA-256 PIPELINE</span>
            </div>
            <div className="chatbot-footer-actions">
              <button
                type="button"
                className="chatbot-footer-hide-btn"
                onClick={onClose}
              >
                Hide Log
              </button>
              <button
                type="button"
                className="chatbot-scroll-btn"
                onClick={scrollToBottom}
                title="Scroll to bottom"
              >
                ↓ Bottom
              </button>
            </div>
          </div>
        </aside>
      )}
    </div>
  )
}
