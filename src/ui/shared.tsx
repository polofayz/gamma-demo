import { Fragment, useState } from 'react'
import { newOpKey, useApp, type TaskDraft } from '../app/ctx'
import { createTask } from '../domain/actions'
import {
  appealStatus,
  byId,
  clientName,
  debtTone,
  directionName,
  enterpriseName,
  historyOf,
  isAppealProcessed,
  isOverdueShipment,
  isTaskAwaiting,
  isTaskOverdue,
  linkLabel,
  obligationOrder,
  orderAmount,
  orderBalances,
  orderDelayReason,
  overdueDaysLabel,
  paidAmount,
  personName,
  remainderOf,
} from '../domain/calc'
import { daysOverdue, formatDate, formatDateTime, formatQty } from '../domain/format'
import { STAGE_LABEL, TASK_LABEL, toneForStage, toneForTask } from '../domain/labels'
import type { Appeal, EntityType, Obligation, Order, Task } from '../domain/types'
import { DEMO_DATE } from '../domain/types'
import { Badge, Empty, Field, FormError, Linkish, Modal, Money, TableWrap } from './kit'

export function StageBadge({ order }: { order: Order }) {
  return <Badge tone={toneForStage(order.stage)}>{STAGE_LABEL[order.stage]}</Badge>
}

export function ShipBadge({ order }: { order: Order }) {
  const { data } = useApp()
  if (order.stage === 'shipped_full') return <Badge tone="green">Отгружено полностью</Badge>
  if (isOverdueShipment(data, order)) return <Badge tone="red">Просрочено {daysOverdue(order.shipDue)} дн.</Badge>
  if (order.shipDue <= addDaysIso(DEMO_DATE, 3)) return <Badge tone="amber">Срок близко</Badge>
  return <Badge tone="neutral">В срок</Badge>
}

function addDaysIso(iso: string, days: number) {
  const d = new Date(`${iso}T00:00:00Z`)
  d.setUTCDate(d.getUTCDate() + days)
  return d.toISOString().slice(0, 10)
}

export function ShippedCell({ order }: { order: Order }) {
  const { data } = useApp()
  return (
    <div className="stack-xs">
      {orderBalances(data, order.id).map((row) => (
        <span key={row.unit} className="num">
          {formatQty(row.shipped)} / {formatQty(row.left)} {row.unit}
        </span>
      ))}
    </div>
  )
}

export function OrdersTable({ orders, compact }: { orders: Order[]; compact?: boolean }) {
  const { data, go } = useApp()
  if (!orders.length) return <Empty title="Заказов нет" text="По выбранным условиям записей не найдено. Измените фильтры или предприятие." />
  return (
    <TableWrap>
      <thead>
        <tr>
          <th>Номер</th>
          <th>Клиент</th>
          {!compact && <th>Предприятие</th>}
          {!compact && <th>Направление</th>}
          <th>Менеджер</th>
          <th>Этап</th>
          <th>Ответственный за этап</th>
          <th>Срок отгрузки</th>
          <th className="r">Сумма</th>
          <th>Отгружено / осталось</th>
          <th>Задержка</th>
        </tr>
      </thead>
      <tbody>
        {orders.map((order) => (
          <tr key={order.id} className="row-click" onClick={() => go({ page: 'order', orderId: order.id })}>
            <td>
              <button className="linkish strong" onClick={(e) => (e.stopPropagation(), go({ page: 'order', orderId: order.id }))}>
                {order.number}
              </button>
            </td>
            <td>{clientName(data, order.clientId)}</td>
            {!compact && <td>{enterpriseName(data, order.enterpriseId)}</td>}
            {!compact && <td>{directionName(data, order.directionId)}</td>}
            <td>{personName(data, order.managerId)}</td>
            <td>
              <StageBadge order={order} />
            </td>
            <td>{personName(data, order.stageResponsibleId)}</td>
            <td className="nowrap">{formatDate(order.shipDue)}</td>
            <td className="r">
              <Money value={orderAmount(data, order.id)} />
            </td>
            <td>
              <ShippedCell order={order} />
            </td>
            <td>
              <ShipBadge order={order} />
              {isOverdueShipment(data, order) && <div className="cell-note">{orderDelayReason(data, order)}</div>}
            </td>
          </tr>
        ))}
      </tbody>
    </TableWrap>
  )
}

export function DebtToneBadge({ obligation }: { obligation: Obligation }) {
  const { data } = useApp()
  const tone = debtTone(data, obligation)
  if (tone === 'paid') return <Badge tone="green">Оплачено</Badge>
  if (tone === 'overdue') return <Badge tone="red">Просрочено</Badge>
  if (tone === 'no_due') return <Badge tone="neutral">Срок не задан</Badge>
  return <Badge tone="amber">Ожидает оплаты</Badge>
}

export function DebtsTable({ obligations, compact }: { obligations: Obligation[]; compact?: boolean }) {
  const { data, go } = useApp()
  const [open, setOpen] = useState<string | null>(null)
  if (!obligations.length) return <Empty title="Обязательств нет" text="По выбранным условиям долгов не найдено." />
  const cols = compact ? 8 : 11
  return (
    <TableWrap>
      <thead>
        <tr>
          <th>Клиент</th>
          <th>Документ</th>
          {!compact && <th>Заказ</th>}
          {!compact && <th>Направление</th>}
          {!compact && <th>Менеджер</th>}
          <th className="r">Сумма</th>
          <th className="r">Оплачено</th>
          <th className="r">Остаток</th>
          <th>Срок оплаты</th>
          <th>Дни просрочки</th>
          <th />
        </tr>
      </thead>
      <tbody>
        {obligations.map((obligation) => {
          const order = obligationOrder(data, obligation)!
          const pays = data.payments.filter((p) => p.obligationId === obligation.id)
          const isOpen = open === obligation.id
          return (
            <Fragment key={obligation.id}>
              <tr>
                <td>{clientName(data, order.clientId)}</td>
                <td className="nowrap">{obligation.docNumber}</td>
                {!compact && (
                  <td>
                    <Linkish route={{ page: 'order', orderId: order.id, anchor: 'finance' }}>{order.number}</Linkish>
                  </td>
                )}
                {!compact && <td>{directionName(data, order.directionId)}</td>}
                {!compact && <td>{personName(data, order.managerId)}</td>}
                <td className="r">
                  <Money value={obligation.amount} />
                </td>
                <td className="r">
                  <Money value={paidAmount(data, obligation.id)} />
                </td>
                <td className="r strong">
                  <Money value={Math.max(0, remainderOf(data, obligation))} />
                </td>
                <td className="nowrap">{formatDate(obligation.dueDate)}</td>
                <td>
                  <DebtToneBadge obligation={obligation} />
                  {debtTone(data, obligation) === 'overdue' && <div className="cell-note">{overdueDaysLabel(obligation.dueDate)}</div>}
                </td>
                <td className="nowrap">
                  <button className="btn btn-ghost btn-sm" onClick={() => setOpen(isOpen ? null : obligation.id)} aria-expanded={isOpen}>
                    {isOpen ? 'Скрыть оплаты' : `Показать оплаты (${pays.length})`}
                  </button>
                  {compact && (
                    <button className="btn btn-ghost btn-sm" onClick={() => go({ page: 'order', orderId: order.id, anchor: 'finance' })}>
                      Заказ {order.number}
                    </button>
                  )}
                </td>
              </tr>
              {isOpen && (
                <tr className="sub-row">
                  <td colSpan={cols}>
                    {pays.length ? (
                      <div className="pay-list">
                        <span className="muted">Оплаты по {obligation.docNumber}:</span>
                        {pays.map((p) => (
                          <span key={p.id} className="pay-item">
                            {formatDate(p.date)} · {p.docNumber} · <Money value={p.amount} />
                          </span>
                        ))}
                        <span className="muted">
                          Остаток = <Money value={obligation.amount} /> − <Money value={paidAmount(data, obligation.id)} /> ={' '}
                          <strong>
                            <Money value={remainderOf(data, obligation)} />
                          </strong>
                        </span>
                      </div>
                    ) : (
                      <span className="muted">Оплат по документу {obligation.docNumber} не поступало. Остаток равен сумме обязательства.</span>
                    )}
                  </td>
                </tr>
              )}
            </Fragment>
          )
        })}
      </tbody>
    </TableWrap>
  )
}

export function AppealBadge({ appeal }: { appeal: Appeal }) {
  const processed = isAppealProcessed(appeal)
  if (processed) return <Badge tone="green">{appealStatus(appeal)}</Badge>
  if (!appeal.managerId) return <Badge tone="red">{appealStatus(appeal)}</Badge>
  return <Badge tone="amber">{appealStatus(appeal)}</Badge>
}

export function AppealsTable({ appeals }: { appeals: Appeal[] }) {
  const { data, go } = useApp()
  if (!appeals.length) return <Empty title="Обращений нет" text="По выбранным условиям обращений не найдено." />
  return (
    <TableWrap>
      <thead>
        <tr>
          <th>Клиент / номер</th>
          <th>Направление</th>
          <th>Ответственный</th>
          <th>Звонки</th>
          <th>Состояние обработки</th>
          <th>Результат</th>
          <th>Следующее действие</th>
        </tr>
      </thead>
      <tbody>
        {appeals.map((appeal) => {
          const calls = data.calls.filter((c) => c.appealId === appeal.id)
          const missed = calls.filter((c) => c.status === 'missed').length
          return (
            <tr key={appeal.id} className="row-click" onClick={() => go({ page: 'appeal', appealId: appeal.id })}>
              <td>
                <button className="linkish strong" onClick={(e) => (e.stopPropagation(), go({ page: 'appeal', appealId: appeal.id }))}>
                  {clientName(data, appeal.clientId)}
                </button>
                <div className="cell-note">{appeal.phone}</div>
              </td>
              <td>{appeal.directionId ? directionName(data, appeal.directionId) : <Badge tone="red">Не назначено</Badge>}</td>
              <td>{personName(data, appeal.managerId)}</td>
              <td className="nowrap">
                {calls.length} {missed ? <span className="muted">(пропущено {missed})</span> : null}
              </td>
              <td>
                <AppealBadge appeal={appeal} />
              </td>
              <td>{appeal.resultNote || <span className="muted">Не зафиксирован</span>}</td>
              <td>{appeal.nextAction || <span className="muted">—</span>}</td>
            </tr>
          )
        })}
      </tbody>
    </TableWrap>
  )
}

export function TaskBadge({ task }: { task: Task }) {
  if (isTaskOverdue(task)) return <Badge tone="red">Просрочено · {TASK_LABEL[task.state]}</Badge>
  if (isTaskAwaiting(task)) return <Badge tone="amber">Ожидает проверки постановщиком</Badge>
  return <Badge tone={toneForTask(task.state)}>{TASK_LABEL[task.state]}</Badge>
}

export function TasksTable({ tasks }: { tasks: Task[] }) {
  const { data, go } = useApp()
  if (!tasks.length) return <Empty title="Поручений нет" text="По выбранным условиям поручений не найдено." />
  return (
    <TableWrap>
      <thead>
        <tr>
          <th>№</th>
          <th>Задача</th>
          <th>Постановщик</th>
          <th>Исполнитель</th>
          <th>Связанный объект</th>
          <th>Срок</th>
          <th>Состояние</th>
          <th>Результат</th>
        </tr>
      </thead>
      <tbody>
        {tasks.map((task) => (
          <tr key={task.id} className="row-click" onClick={() => go({ page: 'task', taskId: task.id })}>
            <td className="nowrap">{task.number}</td>
            <td>
              <button className="linkish strong" onClick={(e) => (e.stopPropagation(), go({ page: 'task', taskId: task.id }))}>
                {task.title}
              </button>
            </td>
            <td>{personName(data, task.authorId)}</td>
            <td>{personName(data, task.assigneeId)}</td>
            <td>{linkLabel(data, task.linkType, task.linkId)}</td>
            <td className="nowrap">
              {formatDate(task.due)}
              {task.previousDue && <div className="cell-note">был {formatDate(task.previousDue)}</div>}
            </td>
            <td>
              <TaskBadge task={task} />
            </td>
            <td>{task.result ? <span className="clamp">{task.result}</span> : <span className="muted">—</span>}</td>
          </tr>
        ))}
      </tbody>
    </TableWrap>
  )
}

export function HistoryList({ entityType, entityId }: { entityType: EntityType; entityId: string }) {
  const { data } = useApp()
  const events = historyOf(data, entityType, entityId)
  if (!events.length) return <Empty title="История пуста" />
  return (
    <ol className="history">
      {events.map((event) => (
        <li key={event.id}>
          <span className="history-time">{formatDateTime(event.at)}</span>
          <div>
            <strong>{event.action}</strong>
            <span className="muted"> · {personName(data, event.authorId)}</span>
            {event.comment && <div className="history-comment">{event.comment}</div>}
          </div>
        </li>
      ))}
    </ol>
  )
}

export function LinkedTasks({ linkType, linkId, directionId, title }: { linkType: 'order' | 'appeal' | 'supply'; linkId: string; directionId?: string | null; title?: string }) {
  const { data, openTaskForm } = useApp()
  const tasks = data.tasks.filter((t) => t.linkType === linkType && t.linkId === linkId)
  return (
    <div className="stack">
      <div>
        <button className="btn btn-primary btn-sm" onClick={() => openTaskForm({ linkType, linkId, directionId: directionId ?? null, title })}>
          + Создать поручение
        </button>
      </div>
      <TasksTable tasks={tasks} />
    </div>
  )
}

export function TaskFormModal({ draft, onClose }: { draft: TaskDraft; onClose: () => void }) {
  const { data, run, actor, go } = useApp()
  const [title, setTitle] = useState(draft.title ?? '')
  const [assigneeId, setAssigneeId] = useState(draft.assigneeId ?? '')
  const [directionId, setDirectionId] = useState(draft.directionId ?? '')
  const [due, setDue] = useState(addDaysIso(DEMO_DATE, 2))
  const [comment, setComment] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [opKey] = useState(newOpKey)
  const [busy, setBusy] = useState(false)

  const submit = () => {
    if (busy) return
    setBusy(true)
    const err = run(
      (d) =>
        createTask(d, actor, {
          title,
          assigneeId,
          directionId: directionId || null,
          linkType: draft.linkType ?? null,
          linkId: draft.linkId ?? null,
          due,
          comment,
          opKey,
        }),
      'Поручение создано',
    )
    setBusy(false)
    if (err) return setError(err)
    onClose()
    if (!draft.linkType) go({ page: 'tasks' })
  }

  const linkName = draft.linkType ? linkLabel(data, draft.linkType, draft.linkId ?? null) : 'Без связанного объекта'
  const assignee = byId(data.employees, assigneeId)

  return (
    <Modal title="Новое поручение" onClose={onClose}>
      <div className="form">
        <Field label="Связанный объект">
          <div className="readonly">{linkName}</div>
        </Field>
        <Field label="Задача">
          <textarea className="input" rows={2} value={title} onChange={(e) => setTitle(e.target.value)} placeholder="Что нужно сделать" autoFocus />
        </Field>
        <div className="form-row">
          <Field label="Исполнитель">
            <select className="input" value={assigneeId} onChange={(e) => setAssigneeId(e.target.value)}>
              <option value="">— выберите —</option>
              {data.employees
                .filter((e) => e.id !== actor.employeeId)
                .map((e) => (
                  <option key={e.id} value={e.id}>
                    {e.title} · {e.shortName}
                  </option>
                ))}
            </select>
          </Field>
          <Field label="Срок">
            <input className="input" type="date" value={due} min={DEMO_DATE} onChange={(e) => setDue(e.target.value)} />
          </Field>
        </div>
        <Field label="Направление">
          <select className="input" value={directionId ?? ''} onChange={(e) => setDirectionId(e.target.value)}>
            <option value="">Без направления</option>
            {data.directions.map((d) => (
              <option key={d.id} value={d.id}>
                {d.name}
              </option>
            ))}
          </select>
        </Field>
        <Field label="Комментарий">
          <textarea className="input" rows={2} value={comment} onChange={(e) => setComment(e.target.value)} placeholder="Необязательно" />
        </Field>
        {assignee && <p className="muted small">Исполнитель увидит поручение в рабочем месте роли «{assignee.title}».</p>}
        <FormError error={error} />
        <div className="form-actions">
          <button className="btn" onClick={onClose}>
            Отмена
          </button>
          <button className="btn btn-primary" onClick={submit} disabled={busy}>
            Поставить поручение
          </button>
        </div>
      </div>
    </Modal>
  )
}
