'use client'
// components/ui/index.tsx — All base UI components

import React, { useState, useEffect, useRef } from 'react'

// ─── Button ────────────────────────────────────────────────────────────────────
interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary' | 'ghost' | 'danger' | 'success'
  size?: 'sm' | 'md' | 'lg'
  loading?: boolean
  icon?: React.ReactNode
}

export function Button({
  variant = 'primary', size = 'md', loading, icon, children, className = '', disabled, ...props
}: ButtonProps) {
  const base = 'inline-flex items-center gap-2 font-medium rounded-lg transition-all duration-150 cursor-pointer select-none disabled:opacity-40 disabled:cursor-not-allowed'
  const variants = {
    primary:   'bg-[#4f8ef7] hover:bg-[#3d7de8] text-white shadow-sm',
    secondary: 'bg-[#1a1f2e] hover:bg-[#252a38] text-[#e8eaf0] border border-[#252a38] hover:border-[#2e3548]',
    ghost:     'bg-transparent hover:bg-[#1a1f2e] text-[#7a839a] hover:text-[#e8eaf0]',
    danger:    'bg-[#ef4444]/10 hover:bg-[#ef4444]/20 text-[#ef4444] border border-[#ef4444]/20',
    success:   'bg-[#3ecf8e]/10 hover:bg-[#3ecf8e]/20 text-[#3ecf8e] border border-[#3ecf8e]/20',
  }
  const sizes = { sm: 'px-3 py-1.5 text-xs', md: 'px-4 py-2 text-sm', lg: 'px-5 py-2.5 text-base' }

  return (
    <button
      className={`${base} ${variants[variant]} ${sizes[size]} ${className}`}
      disabled={disabled || loading}
      {...props}
    >
      {loading ? <Spinner size={14} /> : icon}
      {children}
    </button>
  )
}

// ─── Input ─────────────────────────────────────────────────────────────────────
interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  id?: string
  label?: string
  ariaLabel?: string
  hint?: string
  error?: string
  icon?: React.ReactNode
}

export function Input({ id, label, ariaLabel, hint, error, icon, className = '', ...props }: InputProps) {
  return (
    <div className="flex flex-col gap-1.5">
      {label && (
        <label
          htmlFor={id}
          className="text-xs text-[#7a839a] font-medium uppercase tracking-wider"
        >
          {label}
        </label>
      )}
      <div className="relative">
        {icon && <span className="absolute left-3 top-1/2 -translate-y-1/2 text-[#7a839a]" aria-hidden="true">{icon}</span>}
        <input
          id={id}
          aria-label={!label ? ariaLabel : undefined}
          aria-describedby={[hint && id && `${id}-hint`, error && id && `${id}-error`].filter(Boolean).join(' ') || undefined}
          aria-invalid={!!error}
          className={`w-full bg-[#12151c] border border-[#252a38] rounded-lg text-[#e8eaf0] placeholder:text-[#3d4558]
            focus:border-[#4f8ef7] focus:ring-1 focus:ring-[#4f8ef7]/30 transition-all
            ${icon ? 'pl-9' : 'pl-3'} pr-3 py-2.5 text-sm ${error ? 'border-[#ef4444]' : ''} ${className}`}
          {...props}
        />
      </div>
      {hint && id && <p id={`${id}-hint`} className="text-xs" style={{ color: 'var(--color-muted)', marginTop: 4 }}>{hint}</p>}
      {error && id && <ErrorText id={`${id}-error`}>{error}</ErrorText>}
      {error && !id && <p className="text-xs" style={{ color: 'var(--color-error-text)' }}><span aria-hidden="true">✕ </span>{error}</p>}
    </div>
  )
}

// ─── ErrorText ─────────────────────────────────────────────────────────────────
export function ErrorText({ children, id }: { children: React.ReactNode; id?: string }) {
  return (
    <p
      id={id}
      role="alert"
      aria-live="assertive"
      style={{ color: 'var(--color-error-text)', fontSize: 14, marginTop: 4 }}
    >
      <span aria-hidden="true">✕ </span>
      {children}
    </p>
  )
}

// ─── Textarea ──────────────────────────────────────────────────────────────────
interface TextareaProps extends React.TextareaHTMLAttributes<HTMLTextAreaElement> {
  label?: string
}

export function Textarea({ label, className = '', ...props }: TextareaProps) {
  return (
    <div className="flex flex-col gap-1.5">
      {label && <label className="text-xs text-[#7a839a] font-medium uppercase tracking-wider">{label}</label>}
      <textarea
        className={`w-full bg-[#12151c] border border-[#252a38] rounded-lg text-[#e8eaf0] placeholder:text-[#3d4558]
          focus:border-[#4f8ef7] focus:ring-1 focus:ring-[#4f8ef7]/30 transition-all
          px-3 py-2.5 text-sm resize-none ${className}`}
        {...props}
      />
    </div>
  )
}

// ─── Badge / Status Pill ───────────────────────────────────────────────────────
const STATUS_ICONS: Record<string, string> = {
  ready:        '✓',
  processing:   '⟳',
  failed:       '✕',
  pending:      '◦',
  draft:        '◦',
  submitted:    '✓',
  approved:     '✓',
  active:       '●',
  review:       '⚠',
  merged:       '✓',
  done:         '✓',
  not_started:  '◦',
  in_progress:  '⟳',
}

export function StatusPill({ status }: { status: string }) {
  const label = status.replace(/_/g, ' ')
  const icon = STATUS_ICONS[status.toLowerCase()] ?? '●'
  return (
    <span
      aria-label={label}
      className={`status-${status} inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium`}
    >
      <span aria-hidden="true">{icon} </span>
      {label}
    </span>
  )
}

export function Badge({ children, color = 'blue', className = '' }: { children: React.ReactNode; color?: 'blue' | 'green' | 'amber' | 'red' | 'gray'; className?: string }) {
  const colors = {
    blue:  'bg-[#4f8ef7]/12 text-[#4f8ef7] border-[#4f8ef7]/20',
    green: 'bg-[#3ecf8e]/12 text-[#3ecf8e] border-[#3ecf8e]/20',
    amber: 'bg-[#f59e0b]/12 text-[#f59e0b] border-[#f59e0b]/20',
    red:   'bg-[#ef4444]/12 text-[#ef4444] border-[#ef4444]/20',
    gray:  'bg-[#7a839a]/12 text-[#7a839a] border-[#7a839a]/20',
  }
  return (
    <span className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium border ${colors[color]} ${className}`}>
      {children}
    </span>
  )
}

// ─── Avatar ────────────────────────────────────────────────────────────────────
export function Avatar({ name, src, size = 32, className = '' }: { name: string; src?: string; size?: number; className?: string }) {
  const initials = name.split(' ').map(w => w[0]).join('').slice(0, 2).toUpperCase()
  const colors = ['#4f8ef7','#7c6af5','#3ecf8e','#f59e0b','#ef4444','#ec4899']
  const color = colors[name.charCodeAt(0) % colors.length]

  if (src) {
    return <img src={src} alt={name} style={{ width: size, height: size }} className="rounded-full object-cover" />
  }
  return (
    <div
      style={{ width: size, height: size, background: color + '22', border: `1.5px solid ${color}44`, fontSize: size * 0.35 }}
      className="rounded-full flex items-center justify-center font-semibold text-white flex-shrink-0"
    >
      <span style={{ color }}>{initials}</span>
    </div>
  )
}

// ─── Spinner ───────────────────────────────────────────────────────────────────
export function Spinner({ size = 18, color = '#4f8ef7' }: { size?: number; color?: string }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" className="animate-spin" fill="none">
      <circle cx="12" cy="12" r="10" stroke={color} strokeWidth="2.5" strokeOpacity="0.2" />
      <path d="M12 2a10 10 0 0 1 10 10" stroke={color} strokeWidth="2.5" strokeLinecap="round" />
    </svg>
  )
}

// ─── Modal ─────────────────────────────────────────────────────────────────────
interface ModalProps {
  open: boolean
  onClose: () => void
  title?: string
  children: React.ReactNode
  width?: string
}

export function Modal({ open, onClose, title, children, width = 'max-w-lg' }: ModalProps) {
  useEffect(() => {
    const handler = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose() }
    if (open) document.addEventListener('keydown', handler)
    return () => document.removeEventListener('keydown', handler)
  }, [open, onClose])

  if (!open) return null
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm animate-fade-in" onClick={onClose} />
      <div className={`relative w-full ${width} bg-[#12151c] border border-[#252a38] rounded-xl shadow-2xl animate-fade-up`}>
        {title && (
          <div className="flex items-center justify-between px-6 py-4 border-b border-[#252a38]">
            <h3 className="font-semibold text-[#e8eaf0]">{title}</h3>
            <button onClick={onClose} className="text-[#7a839a] hover:text-[#e8eaf0] transition-colors">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M18 6L6 18M6 6l12 12"/>
              </svg>
            </button>
          </div>
        )}
        <div className="p-6">{children}</div>
      </div>
    </div>
  )
}

// ─── Toast ─────────────────────────────────────────────────────────────────────
type ToastType = 'success' | 'error' | 'info'

interface ToastState { message: string; type: ToastType; id: number }

let toastFn: ((msg: string, type?: ToastType) => void) | null = null

export function useToast() {
  return {
    toast: (message: string, type: ToastType = 'info') => toastFn?.(message, type),
    success: (message: string) => toastFn?.(message, 'success'),
    error: (message: string) => toastFn?.(message, 'error'),
  }
}

export function ToastProvider() {
  const [toasts, setToasts] = useState<ToastState[]>([])

  toastFn = (message: string, type: ToastType = 'info') => {
    const id = Date.now()
    setToasts(t => [...t, { message, type, id }])
    setTimeout(() => setToasts(t => t.filter(x => x.id !== id)), 3500)
  }

  const icons = {
    success: '✓',
    error: '✕',
    info: 'i',
  }
  const colors = {
    success: 'border-[#3ecf8e]/30 bg-[#3ecf8e]/10 text-[#3ecf8e]',
    error:   'border-[#ef4444]/30 bg-[#ef4444]/10 text-[#ef4444]',
    info:    'border-[#4f8ef7]/30 bg-[#4f8ef7]/10 text-[#4f8ef7]',
  }

  return (
    <div className="fixed bottom-6 right-6 z-[100] flex flex-col gap-2 pointer-events-none">
      {toasts.map(t => (
        <div key={t.id} className={`flex items-center gap-3 px-4 py-3 rounded-lg border backdrop-blur-sm
          shadow-xl animate-fade-up text-sm font-medium ${colors[t.type]}`}>
          <span className="w-5 h-5 rounded-full flex items-center justify-center text-xs font-bold
            border border-current">{icons[t.type]}</span>
          <span className="text-[#e8eaf0]">{t.message}</span>
        </div>
      ))}
    </div>
  )
}

// ─── Card ──────────────────────────────────────────────────────────────────────
export function Card({ children, className = '', onClick, style }: {
  children: React.ReactNode; className?: string; onClick?: () => void; style?: React.CSSProperties
}) {
  return (
    <div
      onClick={onClick}
      style={style}
      className={`bg-[#12151c] border border-[#252a38] rounded-xl p-5
        ${onClick ? 'cursor-pointer hover:border-[#2e3548] transition-colors' : ''} ${className}`}
    >
      {children}
    </div>
  )
}

// ─── Empty State ───────────────────────────────────────────────────────────────
export function EmptyState({ icon, title, description, action }: {
  icon: string; title: string; description?: string; action?: React.ReactNode
}) {
  return (
    <div className="flex flex-col items-center justify-center text-center py-16 gap-3">
      <div className="text-4xl mb-2">{icon}</div>
      <h3 className="font-semibold text-[#e8eaf0]">{title}</h3>
      {description && <p className="text-sm text-[#7a839a] max-w-xs">{description}</p>}
      {action && <div className="mt-2">{action}</div>}
    </div>
  )
}

// ─── Divider ───────────────────────────────────────────────────────────────────
export function Divider({ label }: { label?: string }) {
  return (
    <div className="flex items-center gap-3 my-4">
      <div className="flex-1 h-px bg-[#252a38]" />
      {label && <span className="text-xs text-[#3d4558] uppercase tracking-wider">{label}</span>}
      <div className="flex-1 h-px bg-[#252a38]" />
    </div>
  )
}

// ─── Progress Bar ──────────────────────────────────────────────────────────────
export function ProgressBar({ value, max, color = '#4f8ef7', label }: {
  value: number; max: number; color?: string; label?: string
}) {
  const pct = Math.min(100, Math.round((value / Math.max(max, 1)) * 100))
  return (
    <div className="flex flex-col gap-1">
      {label && (
        <div className="flex justify-between text-xs text-[#7a839a]">
          <span>{label}</span>
          <span>{value} / {max}</span>
        </div>
      )}
      <div className="h-1.5 bg-[#1a1f2e] rounded-full overflow-hidden">
        <div
          className="h-full rounded-full transition-all duration-500"
          style={{ width: `${pct}%`, background: color }}
        />
      </div>
    </div>
  )
}

// ─── Select ────────────────────────────────────────────────────────────────────
interface SelectProps extends React.SelectHTMLAttributes<HTMLSelectElement> {
  label?: string
  options: { value: string; label: string }[]
}

export function Select({ label, options, className = '', ...props }: SelectProps) {
  return (
    <div className="flex flex-col gap-1.5">
      {label && <label className="text-xs text-[#7a839a] font-medium uppercase tracking-wider">{label}</label>}
      <select
        className={`w-full bg-[#12151c] border border-[#252a38] rounded-lg text-[#e8eaf0]
          focus:border-[#4f8ef7] transition-all px-3 py-2.5 text-sm
          appearance-none cursor-pointer ${className}`}
        {...props}
      >
        {options.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
      </select>
    </div>
  )
}
