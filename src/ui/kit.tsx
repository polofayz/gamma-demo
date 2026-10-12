import { useEffect, useState, type ReactNode } from 'react'
import { canSeeMoney, useApp } from '../app/ctx'
import { formatMoney } from '../domain/format'
import { ROLE_LABEL } from '../domain/labels'
import type { Role, Route } from '../domain/types'

export type Tone = 'red' | 'amber' | 'green' | 'neutral' | 'blue'

export function Badge({ tone = 'neutral', children }: { tone?: Tone; children: ReactNode }) {
  return <span className={`badge badge-${tone}`}>{children}</span>
}

export function Money({ value }: { value: number }) {
  const { ui } = useApp()
  if (!canSeeMoney(ui.role)) return <span className="muted">скрыто для роли</span>
  return <span className="num">{formatMoney(value)}</span>
}

export function PageHead({ title, sub, children }: { title: string; sub?: ReactNode; children?: ReactNode }) {
  const { ui, back } = useApp()
  return (
    <div className="page-head">
      <div>
        {ui.stack.length > 0 && (
          <button className="link-back" onClick={back}>
            ← Назад к предыдущему списку
          </button>
        )}
        <h1>{title}</h1>
        {sub && <div className="page-sub">{sub}</div>}
      </div>
      {children && <div className="page-filters">{children}</div>}
    </div>
  )
}

export function Card({ title, aside, children, className = '' }: { title?: ReactNode; aside?: ReactNode; children: ReactNode; className?: string }) {
  return (
    <section className={`card ${className}`}>
      {(title || aside) && (
        <header className="card-head">
          {title && <h2>{title}</h2>}
          {aside}
        </header>
      )}
      {children}
    </section>
  )
}

export function TableWrap({ children }: { children: ReactNode }) {
  return (
    <div className="table-wrap">
      <table>{children}</table>
    </div>
  )
}

export function Empty({ title, text }: { title: string; text?: string }) {
  return (
    <div className="empty">
      <strong>{title}</strong>
      {text && <span>{text}</span>}
    </div>
  )
}

export function Linkish({ route, children }: { route: Route; children: ReactNode }) {
  const { go } = useApp()
  return (
    <button className="linkish" onClick={() => go(route)}>
      {children}
    </button>
  )
}

export function CountLink({ route, value, tone }: { route: Route; value: number; tone?: Tone }) {
  const { go } = useApp()
  const cls = value > 0 && tone ? `count count-${tone}` : 'count'
  return (
    <button className={cls} onClick={() => go(route)} title="Открыть записи, из которых рассчитано число">
      {value}
    </button>
  )
}

export function Field({ label, hint, children }: { label: string; hint?: string; children: ReactNode }) {
  return (
    <label className="field">
      <span className="field-label">{label}</span>
      {children}
      {hint && <span className="field-hint">{hint}</span>}
    </label>
  )
}

export function FormError({ error }: { error: string | null }) {
  if (!error) return null
  return (
    <div className="form-error" role="alert">
      {error}
    </div>
  )
}

export function Modal({ title, onClose, children, wide }: { title: string; onClose: () => void; children: ReactNode; wide?: boolean }) {
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && onClose()
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [onClose])
  return (
    <div className="modal-backdrop" onMouseDown={(e) => e.target === e.currentTarget && onClose()}>
      <div className={`modal ${wide ? 'modal-wide' : ''}`} role="dialog" aria-modal="true" aria-label={title}>
        <header className="modal-head">
          <h3>{title}</h3>
          <button className="icon-btn" onClick={onClose} aria-label="Закрыть">
            ✕
          </button>
        </header>
        <div className="modal-body">{children}</div>
      </div>
    </div>
  )
}

export function NeedRole({ roles, text }: { roles: Role[]; text: string }) {
  const { setRole } = useApp()
  return (
    <div className="need-role">
      <span>
        {text} Действие выполняет: <strong>{roles.map((r) => ROLE_LABEL[r]).join(' или ')}</strong>.
      </span>
      <button className="btn btn-ghost btn-sm" onClick={() => setRole(roles[0])}>
        Перейти в роль «{ROLE_LABEL[roles[0]]}»
      </button>
    </div>
  )
}

export function AfterConnect({ label, reason }: { label: string; reason: string }) {
  const [open, setOpen] = useState(false)
  return (
    <span className="after-connect">
      <button className="btn btn-disabled btn-sm" onClick={() => setOpen((v) => !v)} aria-expanded={open}>
        {label} · После подключения
      </button>
      {open && <span className="after-connect-note">{reason}</span>}
    </span>
  )
}

export function Tabs<T extends string>({ value, items, onChange }: { value: T; items: { id: T; label: ReactNode }[]; onChange: (id: T) => void }) {
  return (
    <div className="tabs" role="tablist">
      {items.map((item) => (
        <button key={item.id} role="tab" aria-selected={value === item.id} className={value === item.id ? 'tab active' : 'tab'} onClick={() => onChange(item.id)}>
          {item.label}
        </button>
      ))}
    </div>
  )
}

export function Search({ value, onChange, placeholder }: { value: string; onChange: (v: string) => void; placeholder: string }) {
  return <input className="input search" type="search" value={value} placeholder={placeholder} onChange={(e) => onChange(e.target.value)} />
}

export function KV({ items }: { items: [string, ReactNode][] }) {
  return (
    <dl className="kv">
      {items.map(([k, v]) => (
        <div key={k}>
          <dt>{k}</dt>
          <dd>{v}</dd>
        </div>
      ))}
    </dl>
  )
}
