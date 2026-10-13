import { useState } from 'react'
import { newOpKey, useApp } from '../app/ctx'
import { pauseJob, receiveToWarehouse, recordOutput, ship, startJob } from '../domain/actions'
import {
  availableToReceive,
  availableToShip,
  byId,
  clientName,
  orderLines,
  producedQty,
  remainingToProduce,
  workshopName,
  acceptedQty,
} from '../domain/calc'
import { formatQty } from '../domain/format'
import type { Job } from '../domain/types'
import { DEMO_DATE } from '../domain/types'
import { Field, FormError, Modal } from './kit'

function useSubmit() {
  const [error, setError] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)
  const [opKey] = useState(newOpKey)
  return { error, setError, busy, setBusy, opKey }
}

function parseQty(v: string): number {
  return Number(v.replace(',', '.').replace(/\s/g, ''))
}

export function OutputModal({ jobId, onClose }: { jobId?: string; onClose: () => void }) {
  const { data, run, actor } = useApp()
  const candidates = data.jobs.filter((j) => j.state === 'in_progress' || j.id === jobId)
  const [selected, setSelected] = useState(jobId ?? candidates[0]?.id ?? '')
  const job = byId(data.jobs, selected)
  const order = job ? byId(data.orders, job.orderId) : undefined
  const line = job ? byId(data.lines, job.lineId) : undefined
  const [qty, setQty] = useState(job ? String(remainingToProduce(data, job)) : '')
  const [at, setAt] = useState(`${DEMO_DATE}T16:00`)
  const [signedBy, setSignedBy] = useState(job ? (byId(data.employees, job.responsibleId)?.shortName ?? '') : '')
  const [paperDoc, setPaperDoc] = useState('')
  const [comment, setComment] = useState('')
  const [attach, setAttach] = useState(true)
  const s = useSubmit()

  const submit = () => {
    if (s.busy) return
    s.setBusy(true)
    const err = run(
      (d) => recordOutput(d, actor, { jobId: selected, at, qty: parseQty(qty), signedBy, comment, paperDoc, attach, opKey: s.opKey }),
      'Выпуск зафиксирован. Ожидается передача на склад',
    )
    s.setBusy(false)
    if (err) return s.setError(err)
    onClose()
  }

  return (
    <Modal title="Ввод результата бумажного цеха" onClose={onClose} wide>
      <p className="paper-note">Подробные операции цеха остаются на бумаге. В системе фиксируются события и результат.</p>
      <div className="form">
        <Field label="Задание">
          <select
            className="input"
            value={selected}
            onChange={(e) => {
              setSelected(e.target.value)
              const next = byId(data.jobs, e.target.value)
              if (next) setQty(String(remainingToProduce(data, next)))
            }}
          >
            {candidates.length === 0 && <option value="">Нет заданий в работе</option>}
            {candidates.map((j) => {
              const o = byId(data.orders, j.orderId)
              const l = byId(data.lines, j.lineId)
              return (
                <option key={j.id} value={j.id}>
                  {o?.number} · {l?.name} · {workshopName(data, j.workshopId)}
                </option>
              )
            })}
          </select>
        </Field>
        {job && (
          <p className="small muted">
            {order ? `${order.number} · ${clientName(data, order.clientId)} · ` : ''}
            {line?.name}. План {formatQty(job.plannedQty, job.unit)}, уже выпущено {formatQty(producedQty(data, job.id), job.unit)}, остаток{' '}
            {formatQty(remainingToProduce(data, job), job.unit)}.
          </p>
        )}
        <div className="form-row">
          <Field label="Цех">
            <div className="readonly">{job ? workshopName(data, job.workshopId) : '—'}</div>
          </Field>
          <Field label="Событие">
            <div className="readonly">Выпуск продукции</div>
          </Field>
        </div>
        <div className="form-row">
          <Field label="Дата и время">
            <input className="input" type="datetime-local" value={at} onChange={(e) => setAt(e.target.value)} />
          </Field>
          <Field label={`Количество${job ? `, ${job.unit}` : ''}`} hint="Единица берётся из задания и не меняется">
            <input className="input" inputMode="decimal" value={qty} onChange={(e) => setQty(e.target.value)} />
          </Field>
        </div>
        <div className="form-row">
          <Field label="Сотрудник цеха (подписал наряд)">
            <input className="input" value={signedBy} onChange={(e) => setSignedBy(e.target.value)} />
          </Field>
          <Field label="Номер бумажного документа">
            <input className="input" value={paperDoc} onChange={(e) => setPaperDoc(e.target.value)} placeholder="например, Н-2-0430" />
          </Field>
        </div>
        <Field label="Комментарий">
          <input className="input" value={comment} onChange={(e) => setComment(e.target.value)} placeholder="Необязательно" />
        </Field>
        <label className="check">
          <input type="checkbox" checked={attach} onChange={(e) => setAttach(e.target.checked)} /> Приложить скан наряда
        </label>
        <FormError error={s.error} />
        <div className="form-actions">
          <button className="btn" onClick={onClose}>
            Отмена
          </button>
          <button className="btn btn-primary" onClick={submit} disabled={s.busy || !selected}>
            Зафиксировать выпуск
          </button>
        </div>
      </div>
    </Modal>
  )
}

export function ReceiveModal({ job, onClose }: { job: Job; onClose: () => void }) {
  const { data, run, actor } = useApp()
  const can = availableToReceive(data, job.id)
  const [qty, setQty] = useState(String(can))
  const [docNumber, setDocNumber] = useState('')
  const [comment, setComment] = useState('')
  const s = useSubmit()
  const order = byId(data.orders, job.orderId)
  const line = byId(data.lines, job.lineId)

  const submit = () => {
    if (s.busy) return
    s.setBusy(true)
    const err = run((d) => receiveToWarehouse(d, actor, { jobId: job.id, qty: parseQty(qty), docNumber, comment, opKey: s.opKey }), 'Приёмка на склад ГП записана')
    s.setBusy(false)
    if (err) return s.setError(err)
    onClose()
  }

  return (
    <Modal title="Приёмка на склад готовой продукции" onClose={onClose}>
      <div className="form">
        <p className="small">
          {order?.number} · {line?.name}
        </p>
        <div className="qty-strip">
          <span>
            Выпущено <strong>{formatQty(producedQty(data, job.id), job.unit)}</strong>
          </span>
          <span>
            Уже принято <strong>{formatQty(acceptedQty(data, job.id), job.unit)}</strong>
          </span>
          <span>
            Можно принять <strong>{formatQty(can, job.unit)}</strong>
          </span>
        </div>
        <div className="form-row">
          <Field label={`Принятое количество, ${job.unit}`} hint="Нельзя принять больше выпущенного">
            <input className="input" inputMode="decimal" value={qty} onChange={(e) => setQty(e.target.value)} autoFocus />
          </Field>
          <Field label="Номер приходного документа">
            <input className="input" value={docNumber} onChange={(e) => setDocNumber(e.target.value)} placeholder="например, ПР-0345" />
          </Field>
        </div>
        <Field label="Комментарий">
          <input className="input" value={comment} onChange={(e) => setComment(e.target.value)} placeholder="Например, расхождение по таре" />
        </Field>
        <FormError error={s.error} />
        <div className="form-actions">
          <button className="btn" onClick={onClose}>
            Отмена
          </button>
          <button className="btn btn-primary" onClick={submit} disabled={s.busy}>
            Подтвердить приёмку
          </button>
        </div>
      </div>
    </Modal>
  )
}

export function ShipModal({ orderId, onClose }: { orderId: string; onClose: () => void }) {
  const { data, run, actor } = useApp()
  const lines = orderLines(data, orderId)
  const firstAvailable = lines.find((l) => availableToShip(data, l.id) > 0) ?? lines[0]
  const [lineId, setLineId] = useState(firstAvailable?.id ?? '')
  const line = byId(data.lines, lineId)
  const can = line ? availableToShip(data, line.id) : 0
  const [qty, setQty] = useState(String(can))
  const [docNumber, setDocNumber] = useState('')
  const s = useSubmit()
  const order = byId(data.orders, orderId)

  const submit = () => {
    if (s.busy) return
    s.setBusy(true)
    const err = run((d) => ship(d, actor, { orderId, lineId, qty: parseQty(qty), docNumber, opKey: s.opKey }), 'Отгрузка записана')
    s.setBusy(false)
    if (err) return s.setError(err)
    onClose()
  }

  return (
    <Modal title={`Отгрузка по заказу ${order?.number ?? ''}`} onClose={onClose}>
      <div className="form">
        <Field label="Позиция">
          <select
            className="input"
            value={lineId}
            onChange={(e) => {
              setLineId(e.target.value)
              setQty(String(availableToShip(data, e.target.value)))
            }}
          >
            {lines.map((l) => (
              <option key={l.id} value={l.id}>
                {l.name} · доступно {formatQty(availableToShip(data, l.id), l.unit)}
              </option>
            ))}
          </select>
        </Field>
        {line && (
          <p className="small muted">
            Доступно к отгрузке = принято на склад − уже отгружено = {formatQty(can, line.unit)}.
          </p>
        )}
        <div className="form-row">
          <Field label={`Количество${line ? `, ${line.unit}` : ''}`} hint="Частичная отгрузка уменьшает остаток">
            <input className="input" inputMode="decimal" value={qty} onChange={(e) => setQty(e.target.value)} autoFocus />
          </Field>
          <Field label="Номер накладной">
            <input className="input" value={docNumber} onChange={(e) => setDocNumber(e.target.value)} placeholder="например, ТТН-1200" />
          </Field>
        </div>
        <FormError error={s.error} />
        <div className="form-actions">
          <button className="btn" onClick={onClose}>
            Отмена
          </button>
          <button className="btn btn-primary" onClick={submit} disabled={s.busy || !line}>
            Записать отгрузку
          </button>
        </div>
      </div>
    </Modal>
  )
}

export function PauseModal({ job, onClose }: { job: Job; onClose: () => void }) {
  const { run, actor } = useApp()
  const [reason, setReason] = useState('')
  const [error, setError] = useState<string | null>(null)
  const submit = () => {
    const err = run((d) => pauseJob(d, actor, job.id, reason), 'Задание приостановлено')
    if (err) return setError(err)
    onClose()
  }
  return (
    <Modal title="Приостановить задание" onClose={onClose}>
      <div className="form">
        <Field label="Причина остановки">
          <textarea className="input" rows={2} value={reason} onChange={(e) => setReason(e.target.value)} autoFocus placeholder="Например, нет сырья" />
        </Field>
        <FormError error={error} />
        <div className="form-actions">
          <button className="btn" onClick={onClose}>
            Отмена
          </button>
          <button className="btn btn-primary" onClick={submit}>
            Приостановить
          </button>
        </div>
      </div>
    </Modal>
  )
}

export function useStartJob() {
  const { run, actor } = useApp()
  return (job: Job) => run((d) => startJob(d, actor, job.id, newOpKey()), job.state === 'paused' ? 'Задание возобновлено' : 'Производство начато')
}
