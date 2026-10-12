import { useState } from 'react'
import { useApp } from '../app/ctx'
import { taskAccept, taskConfirm, taskReturn, taskSubmit } from '../domain/actions'
import { byId, directionName, isTaskAwaiting, isTaskOverdue, linkLabel, personTitle, selectTasks } from '../domain/calc'
import { formatDate } from '../domain/format'
import { ROLE_LABEL } from '../domain/labels'
import type { Route } from '../domain/types'
import { DEMO_DATE } from '../domain/types'
import { Card, Empty, Field, FormError, KV, Linkish, NeedRole, PageHead, Search, Tabs } from '../ui/kit'
import { HistoryList, TaskBadge, TasksTable } from '../ui/shared'

type TasksRoute = Extract<Route, { page: 'tasks' }>
type Focus = 'active' | 'overdue' | 'awaiting' | 'done' | 'all'

export function TasksPage({ route }: { route: TasksRoute }) {
  const { data, ui, replace, openTaskForm } = useApp()
  const [q, setQ] = useState('')
  const [mine, setMine] = useState(ui.role !== 'director')
  const focus: Focus = route.focus ?? 'active'
  const set = (patch: Partial<TasksRoute>) => replace({ ...route, ...patch })
  const roleIds = new Set(data.employees.filter((e) => e.role === ui.role).map((e) => e.id))

  const base = selectTasks(data, { enterpriseId: ui.enterpriseId, directionId: route.directionId, assigneeId: route.assigneeId, q }).filter(
    (t) => !mine || roleIds.has(t.assigneeId) || roleIds.has(t.authorId),
  )
  const pick = (f: Focus) =>
    base.filter((t) => {
      if (f === 'overdue') return isTaskOverdue(t)
      if (f === 'awaiting') return isTaskAwaiting(t)
      if (f === 'done') return t.state === 'confirmed'
      if (f === 'active') return t.state !== 'confirmed'
      return true
    })
  const list = pick(focus)

  return (
    <div className="page">
      <PageHead title="Поручения" sub={ui.enterpriseId !== 'all' ? 'Учитываются поручения, связанные с объектами выбранного предприятия' : 'Одна задача хранится один раз и видна из связанных карточек'}>
        <Search value={q} onChange={setQ} placeholder="Номер или текст" />
        <select className="input" value={route.directionId ?? ''} onChange={(e) => set({ directionId: e.target.value || undefined })}>
          <option value="">Все направления</option>
          {data.directions.map((d) => (
            <option key={d.id} value={d.id}>
              {d.name}
            </option>
          ))}
        </select>
        <label className="check">
          <input type="checkbox" checked={mine} onChange={(e) => setMine(e.target.checked)} /> Только роли «{ROLE_LABEL[ui.role]}»
        </label>
        <button className="btn btn-primary" onClick={() => openTaskForm({ directionId: route.directionId ?? null })}>
          + Новое поручение
        </button>
      </PageHead>
      <Tabs<Focus>
        value={focus}
        onChange={(f) => set({ focus: f === 'active' ? undefined : f })}
        items={[
          { id: 'active', label: `Активные · ${pick('active').length}` },
          { id: 'overdue', label: `Просроченные · ${pick('overdue').length}` },
          { id: 'awaiting', label: `Ожидают проверки постановщиком · ${pick('awaiting').length}` },
          { id: 'done', label: `Подтверждённые · ${pick('done').length}` },
          { id: 'all', label: 'Все' },
        ]}
      />
      <Card>
        <TasksTable tasks={list} />
        <p className="small muted">
          Просрочено — срок прошёл, а исполнитель ещё не отправил результат. Ожидающие проверки показаны отдельно, чтобы задержка постановщика не приписывалась исполнителю.
        </p>
      </Card>
    </div>
  )
}

export function TaskPage({ taskId }: { taskId: string }) {
  const { data, ui, run, actor } = useApp()
  const task = byId(data.tasks, taskId)
  const [result, setResult] = useState('')
  const [comment, setComment] = useState('')
  const [newDue, setNewDue] = useState(DEMO_DATE)
  const [error, setError] = useState<string | null>(null)
  if (!task) return <Empty title="Поручение не найдено" />

  const assignee = byId(data.employees, task.assigneeId)
  const author = byId(data.employees, task.authorId)
  const isAssignee = assignee?.role === ui.role
  const isAuthor = author?.role === ui.role
  const act = (fn: Parameters<typeof run>[0], ok: string) => {
    const err = run(fn, ok)
    setError(err)
    if (!err) {
      setResult('')
      setComment('')
    }
  }
  const linkRoute: Route | null =
    task.linkType === 'order' && task.linkId
      ? { page: 'order', orderId: task.linkId }
      : task.linkType === 'appeal' && task.linkId
        ? { page: 'appeal', appealId: task.linkId }
        : task.linkType === 'supply' && task.linkId
          ? { page: 'supply', supplyId: task.linkId }
          : null

  return (
    <div className="page">
      <PageHead title={`${task.number} · ${task.title}`} sub={<TaskBadge task={task} />} />
      <div className="grid-2">
        <Card title="Поручение">
          <KV
            items={[
              ['Постановщик', personTitle(data, task.authorId)],
              ['Исполнитель', personTitle(data, task.assigneeId)],
              ['Направление', task.directionId ? directionName(data, task.directionId) : '—'],
              ['Связанный объект', linkRoute ? <Linkish route={linkRoute}>{linkLabel(data, task.linkType, task.linkId)}</Linkish> : 'Без связанного объекта'],
              ['Дата создания', formatDate(task.createdAt)],
              ['Срок', <>{formatDate(task.due)}{task.previousDue && <span className="muted"> · прежний срок {formatDate(task.previousDue)}</span>}</>],
              ['Комментарий', task.comment || '—'],
              ['Результат', task.result || 'Не добавлен'],
            ]}
          />
        </Card>
        <Card title="Действия">
          {isAssignee && (task.state === 'new' || task.state === 'returned') && (
            <div className="stack">
              <button className="btn" onClick={() => act((d) => taskAccept(d, actor, task.id), 'Поручение принято в работу')}>
                Принять в работу
              </button>
            </div>
          )}
          {isAssignee && (task.state === 'new' || task.state === 'in_progress' || task.state === 'returned') && (
            <div className="form mt">
              <Field label="Результат" hint="Без описания результата отправить нельзя">
                <textarea className="input" rows={3} value={result} onChange={(e) => setResult(e.target.value)} placeholder="Что сделано и что получено" />
              </Field>
              <div className="form-actions">
                <button className="btn btn-primary" onClick={() => act((d) => taskSubmit(d, actor, task.id, result), 'Результат отправлен на проверку')}>
                  Отправить на проверку
                </button>
              </div>
            </div>
          )}
          {isAuthor && task.state === 'submitted' && (
            <div className="form">
              <div className="callout callout-amber">Исполнитель отправил результат. Подтвердите или верните с комментарием.</div>
              <div className="form-actions start">
                <button className="btn btn-primary" onClick={() => act((d) => taskConfirm(d, actor, task.id), 'Результат подтверждён')}>
                  Подтвердить результат
                </button>
              </div>
              <div className="form-row">
                <Field label="Что доработать">
                  <input className="input" value={comment} onChange={(e) => setComment(e.target.value)} />
                </Field>
                <Field label="Новый срок">
                  <input className="input" type="date" min={DEMO_DATE} value={newDue} onChange={(e) => setNewDue(e.target.value)} />
                </Field>
              </div>
              <div className="form-actions start">
                <button className="btn" onClick={() => act((d) => taskReturn(d, actor, task.id, comment, newDue), 'Поручение возвращено на доработку')}>
                  Вернуть с комментарием
                </button>
              </div>
            </div>
          )}
          {task.state === 'confirmed' && <div className="callout callout-green">Результат подтверждён постановщиком.</div>}
          {!isAssignee && task.state !== 'submitted' && task.state !== 'confirmed' && assignee && (
            <NeedRole roles={[assignee.role]} text="Принять в работу и добавить результат может исполнитель." />
          )}
          {!isAuthor && task.state === 'submitted' && author && <NeedRole roles={[author.role]} text="Результат на проверке у постановщика." />}
          <FormError error={error} />
          <p className="small muted mt">Подтверждение постановщиком используется для показа; нужно ли это правило в рабочей системе — согласовать.</p>
        </Card>
      </div>
      <Card title="История">
        <HistoryList entityType="task" entityId={task.id} />
      </Card>
    </div>
  )
}
