'use client'
// app/login/page.tsx — Email OTP login page

import { useState } from 'react'
import { useSignIn, useSignUp } from '@clerk/nextjs'
import { useRouter } from 'next/navigation'

export default function LoginPage() {
  const { signIn, isLoaded: signInLoaded, setActive: setSignInActive } = useSignIn()
  const { signUp, isLoaded: signUpLoaded, setActive: setSignUpActive } = useSignUp()
  const router = useRouter()
  const [email, setEmail] = useState('')
  const [code, setCode] = useState('')
  const [step, setStep] = useState<'email' | 'otp'>('email')
  const [isNewUser, setIsNewUser] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  async function handleSendCode(e: React.FormEvent) {
    e.preventDefault()
    if (!signInLoaded || !signUpLoaded || !email) return
    setLoading(true)
    setError('')
    try {
      // Try sign-in first (existing user)
      await signIn!.create({
        strategy: 'email_code',
        identifier: email,
      })
      setIsNewUser(false)
      setStep('otp')
    } catch (err: any) {
      const errCode = err.errors?.[0]?.code
      if (errCode === 'form_identifier_not_found') {
        // New user — sign up flow
        try {
          await signUp!.create({ emailAddress: email })
          await signUp!.prepareEmailAddressVerification({ strategy: 'email_code' })
          setIsNewUser(true)
          setStep('otp')
        } catch (signUpErr: any) {
          setError(signUpErr.errors?.[0]?.message || 'Something went wrong. Please try again.')
        }
      } else {
        setError(err.errors?.[0]?.message || 'Something went wrong. Please try again.')
      }
    } finally {
      setLoading(false)
    }
  }

  async function handleVerifyCode(e: React.FormEvent) {
    e.preventDefault()
    if (!code) return
    setLoading(true)
    setError('')
    try {
      if (isNewUser) {
        const result = await signUp!.attemptEmailAddressVerification({ code })
        if (result.status === 'complete') {
          await setSignUpActive!({ session: result.createdSessionId })
          router.push('/dashboard')
        } else {
          setError('Verification incomplete. Please try again.')
        }
      } else {
        const result = await signIn!.attemptFirstFactor({ strategy: 'email_code', code })
        if (result.status === 'complete') {
          await setSignInActive!({ session: result.createdSessionId })
          router.push('/dashboard')
        } else {
          setError('Verification incomplete. Please try again.')
        }
      }
    } catch (err: any) {
      setError(err.errors?.[0]?.message || 'Invalid code. Please try again.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-[#0a0c10] relative overflow-hidden">
      {/* Background grid */}
      <div className="absolute inset-0" style={{
        backgroundImage: `linear-gradient(rgba(79,142,247,0.03) 1px, transparent 1px),
          linear-gradient(90deg, rgba(79,142,247,0.03) 1px, transparent 1px)`,
        backgroundSize: '40px 40px'
      }} />
      {/* Glow */}
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-96 h-96 rounded-full"
        style={{ background: 'radial-gradient(circle, rgba(79,142,247,0.06) 0%, transparent 70%)' }} />

      <div className="relative w-full max-w-sm mx-4 animate-fade-up">
        {/* Logo */}
        <div className="flex items-center gap-3 mb-10 justify-center">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-[#4f8ef7] to-[#7c6af5] flex items-center justify-center shadow-lg">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2.5">
              <path d="M12 2L2 7l10 5 10-5-10-5zM2 17l10 5 10-5M2 12l10 5 10-5"/>
            </svg>
          </div>
          <div>
            <h1 className="text-xl font-bold text-[#e8eaf0]" style={{ fontFamily: 'Syne, sans-serif' }}>
              ResearchCollab
            </h1>
            <p className="text-xs text-[#3d4558]">AI Research Platform</p>
          </div>
        </div>

        <div className="bg-theme text-theme border-theme">
          {step === 'email' ? (
            <>
              <h2 className="text-lg font-bold text-[#e8eaf0] mb-1">Sign in</h2>
              <p className="text-sm text-[#7a839a] mb-6">We'll send a 6-digit code to your email.</p>

              <div id="clerk-captcha" />
              <form onSubmit={handleSendCode} className="flex flex-col gap-4">
                <div className="flex flex-col gap-1.5">
                  <label htmlFor="login-email" className="text-xs text-[#7a839a] font-medium uppercase tracking-wider">
                    Email address
                  </label>
                  <input
                    id="login-email"
                    type="email"
                    autoComplete="email"
                    aria-label="Email address"
                    value={email}
                    onChange={e => setEmail(e.target.value)}
                    placeholder="you@university.edu"
                    required
                    className="w-full bg-[#0a0c10] border border-[#252a38] rounded-lg text-[#e8eaf0]
                      placeholder:text-[#3d4558] focus:border-[#4f8ef7]
                      focus:ring-1 focus:ring-[#4f8ef7]/30 px-3 py-3 text-sm transition-all"
                  />
                </div>

                {error && (
                  <p role="alert" aria-live="assertive" className="text-xs bg-[#ef4444]/10 border border-[#ef4444]/20 rounded-lg px-3 py-2" style={{ color: 'var(--color-error-text)' }}>
                    <span aria-hidden="true">✕ </span>{error}
                  </p>
                )}

                <button
                  type="submit"
                  disabled={loading || !email}
                  aria-label={loading ? 'Sending code, please wait' : 'Send code'}
                  aria-disabled={loading || !email}
                  className="w-full py-3 rounded-lg text-sm font-semibold text-white transition-all duration-150
                    disabled:opacity-40 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                  style={{
                    background: loading || !email ? '#4f8ef7' : 'linear-gradient(135deg, #4f8ef7, #7c6af5)',
                    boxShadow: loading || !email ? 'none' : '0 4px 20px rgba(79,142,247,0.3)',
                  }}
                >
                  {loading ? (
                    <>
                      <svg width="16" height="16" viewBox="0 0 24 24" className="animate-spin" aria-hidden="true" fill="none">
                        <circle cx="12" cy="12" r="10" stroke="rgba(255,255,255,0.3)" strokeWidth="2.5"/>
                        <path d="M12 2a10 10 0 0 1 10 10" stroke="white" strokeWidth="2.5" strokeLinecap="round"/>
                      </svg>
                      Sending...
                    </>
                  ) : (
                    <>
                      Send code
                      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" aria-hidden="true" strokeWidth="2.5">
                        <path d="M5 12h14M12 5l7 7-7 7"/>
                      </svg>
                    </>
                  )}
                </button>
              </form>

              <p className="text-xs text-[#3d4558] text-center mt-6">
                No password needed. Works with any email.
              </p>
            </>
          ) : (
            <>
              <div className="flex items-center gap-2 mb-6">
                <button
                  type="button"
                  onClick={() => { setStep('email'); setCode(''); setError('') }}
                  aria-label="Back to email"
                  className="text-[#7a839a] hover:text-[#e8eaf0] transition-colors"
                >
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                    <path d="M19 12H5M12 19l-7-7 7-7"/>
                  </svg>
                </button>
                <div>
                  <h2 className="text-lg font-bold text-[#e8eaf0]">Enter your code</h2>
                  <p className="text-xs text-[#7a839a]">Sent to <span className="text-[#4f8ef7]">{email}</span></p>
                </div>
              </div>

              <form onSubmit={handleVerifyCode} className="flex flex-col gap-4">
                <div className="flex flex-col gap-1.5">
                  <label htmlFor="login-otp" className="text-xs text-[#7a839a] font-medium uppercase tracking-wider">
                    6-digit code
                  </label>
                  <input
                    id="login-otp"
                    type="text"
                    inputMode="numeric"
                    autoComplete="one-time-code"
                    aria-label="One-time passcode"
                    aria-describedby="otp-hint"
                    value={code}
                    onChange={e => setCode(e.target.value.replace(/\D/g, '').slice(0, 6))}
                    placeholder="000000"
                    required
                    autoFocus
                    className="w-full bg-[#0a0c10] border border-[#252a38] rounded-lg text-[#e8eaf0]
                      placeholder:text-[#3d4558] focus:border-[#4f8ef7]
                      focus:ring-1 focus:ring-[#4f8ef7]/30 px-3 py-3 text-sm tracking-[0.3em] transition-all text-center"
                  />
                  <p id="otp-hint" className="sr-only">
                    Enter the 6-digit code sent to your email address
                  </p>
                </div>

                {error && (
                  <p role="alert" aria-live="assertive" className="text-xs bg-[#ef4444]/10 border border-[#ef4444]/20 rounded-lg px-3 py-2" style={{ color: 'var(--color-error-text)' }}>
                    <span aria-hidden="true">✕ </span>{error}
                  </p>
                )}

                <button
                  type="submit"
                  disabled={loading || code.length < 6}
                  aria-label={loading ? 'Verifying code, please wait' : 'Verify and sign in'}
                  aria-disabled={loading || code.length < 6}
                  className="w-full py-3 rounded-lg text-sm font-semibold text-white transition-all duration-150
                    disabled:opacity-40 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                  style={{
                    background: loading || code.length < 6 ? '#4f8ef7' : 'linear-gradient(135deg, #4f8ef7, #7c6af5)',
                    boxShadow: loading || code.length < 6 ? 'none' : '0 4px 20px rgba(79,142,247,0.3)',
                  }}
                >
                  {loading ? (
                    <>
                      <svg width="16" height="16" viewBox="0 0 24 24" className="animate-spin" aria-hidden="true" fill="none">
                        <circle cx="12" cy="12" r="10" stroke="rgba(255,255,255,0.3)" strokeWidth="2.5"/>
                        <path d="M12 2a10 10 0 0 1 10 10" stroke="white" strokeWidth="2.5" strokeLinecap="round"/>
                      </svg>
                      Verifying...
                    </>
                  ) : (
                    <>
                      Verify & sign in
                      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" aria-hidden="true" strokeWidth="2.5">
                        <path d="M5 12h14M12 5l7 7-7 7"/>
                      </svg>
                    </>
                  )}
                </button>
              </form>
            </>
          )}
        </div>

        <p className="text-center text-xs text-[#3d4558] mt-6">
          STEM AI Hackathon 2026 · IIT Delhi × Microsoft Garage × Imperial College London
        </p>
      </div>
    </div>
  )
}
