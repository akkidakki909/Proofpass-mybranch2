import { useState } from 'react'
import { Link } from 'react-router-dom'
import { loginRequest } from '../api/auth.js'

export default function Login() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [errors, setErrors] = useState({})
  const [statusMessage, setStatusMessage] = useState(null)
  const [isSubmitting, setIsSubmitting] = useState(false)

  const handleSubmit = async (e) => {
    e.preventDefault()
    setStatusMessage(null)

    // Inline validation
    const errs = {}
    if (!email.trim()) {
      errs.email = 'Email address is required.'
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim())) {
      errs.email = 'Please enter a valid email address.'
    }

    if (!password) {
      errs.password = 'Password is required.'
    } else if (password.length < 6) {
      errs.password = 'Password must be at least 6 characters.'
    }

    if (Object.keys(errs).length > 0) {
      setErrors(errs)
      return
    }

    setErrors({})
    setIsSubmitting(true)

    try {
      await loginRequest(email.trim(), password)
    } catch (err) {
      // Honest inline notice when backend is not connected
      setStatusMessage(err.message || 'Log in is not connected yet.')
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <main id="main" className="login-page">
      <div className="w">
        <div className="login-card glass">
          <div className="login-header">
            <span className="k m">ACCOUNT ACCESS</span>
            <h1 className="login-title">Log in</h1>
            <p className="login-desc">
              Access your saved passport claims, evidence models, and verification history.
            </p>
          </div>

          <form className="login-form" onSubmit={handleSubmit} noValidate>
            {statusMessage && (
              <div className="login-notice" role="status" aria-live="polite">
                <span className="notice-dot" aria-hidden="true" />
                <span>{statusMessage}</span>
              </div>
            )}

            <div className="form-group">
              <label htmlFor="login-email" className="form-label">
                Email address
              </label>
              <input
                id="login-email"
                type="email"
                name="email"
                autoComplete="email"
                className={`form-input ${errors.email ? 'input-error' : ''}`}
                placeholder="name@example.com"
                value={email}
                onChange={(e) => {
                  setEmail(e.target.value)
                  if (errors.email) setErrors((prev) => ({ ...prev, email: null }))
                }}
                aria-invalid={errors.email ? 'true' : 'false'}
                aria-describedby={errors.email ? 'email-error' : undefined}
                required
              />
              {errors.email && (
                <span id="email-error" className="field-error-msg" role="alert">
                  {errors.email}
                </span>
              )}
            </div>

            <div className="form-group">
              <label htmlFor="login-password" className="form-label">
                Password
              </label>
              <input
                id="login-password"
                type="password"
                name="password"
                autoComplete="current-password"
                className={`form-input ${errors.password ? 'input-error' : ''}`}
                placeholder="••••••••"
                value={password}
                onChange={(e) => {
                  setPassword(e.target.value)
                  if (errors.password) setErrors((prev) => ({ ...prev, password: null }))
                }}
                aria-invalid={errors.password ? 'true' : 'false'}
                aria-describedby={errors.password ? 'password-error' : undefined}
                required
              />
              {errors.password && (
                <span id="password-error" className="field-error-msg" role="alert">
                  {errors.password}
                </span>
              )}
            </div>

            <div className="login-actions">
              <button type="submit" className="b login-submit-btn" disabled={isSubmitting}>
                {isSubmitting ? 'Connecting...' : 'Log in'}
              </button>
            </div>
          </form>

          <div className="login-footer">
            <Link to="/" className="back-home-link">
              ← Back to Home
            </Link>
          </div>
        </div>
      </div>
    </main>
  )
}
