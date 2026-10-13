import {
  availableToReceive,
  availableToShip,
  byId,
  lineAccepted,
  lineShipped,
  orderJobs,
  orderLines,
  producedQty,
  remainingToProduce,
} from './calc'
import { formatDate, formatQty } from './format'
import { ROLE_LABEL } from './labels'
import type {
  Actor,
  AppData,
  AppealResult,
  EntityType,
  Order,
  Role,
  Stage,
  SupplyStage,
  Task,
  Unit,
} from './types'
import { DEMO_DATE } from './types'

type Draft = AppData
type Mutator = (draft: Draft) => string | void

function mutate(data: AppData, fn: Mutator): { ok: true; data: AppData } | { ok: false; error: string } {
  const draft = structuredClone(data)
  const error = fn(draft)
  if (error) return { ok: false, error }
  return { ok: true, data: draft }
}

function nowStamp(): string {
  const d = new Date()
  const hh = String(d.getHours()).padStart(2, '0')
  const mm = String(d.getMinutes()).padStart(2, '0')
  return `${DEMO_DATE}T${hh}:${mm}`
}

function nextId(draft: Draft, prefix: string): string {
  draft.seq += 1
  return `${prefix}-${draft.seq}`
}

function log(draft: Draft, actor: Actor, entityType: EntityType, entityId: string, action: string, comment = '') {
  draft.history.unshift({
    id: nextId(draft, 'h'),
    at: nowStamp(),
    authorId: actor.employeeId,
    action,
    comment,
    entityType,
    entityId,
  })
}

function deny(actor: Actor, roles: Role[]): string | undefined {
  if (roles.includes(actor.role)) return undefined
  return `Действие доступно роли: ${roles.map((r) => ROLE_LABEL[r]).join(', ')}`
}

function guardOp(draft: Draft, opKey: string): string | undefined {
  if (draft.ops.includes(opKey)) return 'Эта операция уже записана. Повторное нажатие не создало дубль.'
  draft.ops.push(opKey)
  return undefined
}

function addDays(iso: string, days: number): string {
  const d = new Date(`${iso.slice(0, 10)}T00:00:00Z`)
  d.setUTCDate(d.getUTCDate() + days)
  return d.toISOString().slice(0, 10)
}

function getOrder(draft: Draft, orderId: string): Order | string {
  return byId(draft.orders, orderId) ?? 'Заказ не найден'
}

function moveStage(order: Order, stage: Stage, responsibleId: string, stageDue: string, completed?: Stage) {
  if (completed) order.lastCompletedStage = completed
  order.stage = stage
  order.stageResponsibleId = responsibleId
  order.stageDue = stageDue
  order.stageEnteredAt = DEMO_DATE
}

function ropOf(draft: Draft, directionId: string): string {
  return byId(draft.directions, directionId)?.ropId ?? 'emp-dir'
}

export function submitToRop(data: AppData, actor: Actor, orderId: string) {
  return mutate(data, (d) => {
    const err = deny(actor, ['manager', 'rop'])
    if (err) return err
    const order = getOrder(d, orderId)
    if (typeof order === 'string') return order
    if (order.stage !== 'new') return 'Заказ уже не на этапе «Новый»'
    moveStage(order, 'rop', ropOf(d, order.directionId), addDays(DEMO_DATE, 1), 'new')
    log(d, actor, 'order', order.id, order.returnReason ? 'Исправленный заказ отправлен на согласование РОП' : 'Отправлен на согласование РОП')
    order.returnReason = null
    order.returnedFrom = null
  })
}

export function ropApprove(data: AppData, actor: Actor, orderId: string, comment: string) {
  return mutate(data, (d) => {
    const err = deny(actor, ['rop'])
    if (err) return err
    const order = getOrder(d, orderId)
    if (typeof order === 'string') return order
    if (order.stage !== 'rop') return 'Заказ не находится на согласовании РОП'
    moveStage(order, 'technologist', 'emp-tech', addDays(DEMO_DATE, 1), 'rop')
    log(d, actor, 'order', order.id, 'РОП согласовал заказ', comment.trim())
  })
}

export function returnOrder(data: AppData, actor: Actor, orderId: string, comment: string) {
  return mutate(data, (d) => {
    const order = getOrder(d, orderId)
    if (typeof order === 'string') return order
    const role: Role | null = order.stage === 'rop' ? 'rop' : order.stage === 'technologist' ? 'technologist' : null
    if (!role) return 'Возврат возможен только с согласования РОП или проверки технолога'
    const err = deny(actor, [role])
    if (err) return err
    if (!comment.trim()) return 'Укажите причину возврата: что нужно исправить'
    const from = order.stage
    order.returnReason = comment.trim()
    order.returnedFrom = from
    order.stage = 'new'
    order.stageResponsibleId = order.managerId
    order.stageDue = addDays(DEMO_DATE, 1)
    order.stageEnteredAt = DEMO_DATE
    const who = role === 'rop' ? 'РОП вернул заказ на корректировку' : 'Технолог вернул заказ на уточнение'
    log(d, actor, 'order', order.id, who, comment.trim())
  })
}

export function techApprove(data: AppData, actor: Actor, orderId: string, comment: string) {
  return mutate(data, (d) => {
    const err = deny(actor, ['technologist'])
    if (err) return err
    const order = getOrder(d, orderId)
    if (typeof order === 'string') return order
    if (order.stage !== 'technologist') return 'Заказ не на проверке технолога'
    order.recipeChecked = true
    moveStage(order, 'job_prep', 'emp-prod', addDays(DEMO_DATE, 1), 'technologist')
    log(d, actor, 'order', order.id, 'Технолог подтвердил проверку', comment.trim() || 'Условная рецептура проверена')
  })
}

export function createJobs(data: AppData, actor: Actor, input: { orderId: string; workshopId: string; due: string; opKey: string }) {
  return mutate(data, (d) => {
    const err = deny(actor, ['production_head'])
    if (err) return err
    const order = getOrder(d, input.orderId)
    if (typeof order === 'string') return order
    if (order.stage !== 'job_prep') return 'Задание готовится только на этапе «Подготовка производственного задания»'
    if (!input.workshopId) return 'Выберите цех'
    if (!input.due) return 'Укажите срок выпуска'
    const dup = guardOp(d, input.opKey)
    if (dup) return dup
    const workshop = byId(d.workshops, input.workshopId)
    const masters: Record<string, string> = { 'ws-1': 'emp-ws1', 'ws-2': 'emp-ws2', 'ws-3': 'emp-ws3' }
    const existing = new Set(orderJobs(d, order.id).map((job) => job.lineId))
    let created = 0
    for (const line of orderLines(d, order.id)) {
      if (existing.has(line.id)) continue
      d.jobs.push({
        id: nextId(d, 'job'),
        orderId: order.id,
        lineId: line.id,
        workshopId: input.workshopId,
        responsibleId: masters[input.workshopId] ?? 'emp-prod',
        plannedQty: line.qty,
        unit: line.unit,
        due: input.due,
        state: 'waiting',
        delayReason: null,
      })
      created += 1
    }
    if (!created) return 'Задания по этому заказу уже подготовлены'
    log(d, actor, 'order', order.id, `Подготовлено производственное задание · ${workshop?.name ?? 'цех'}`, `Срок выпуска ${formatDate(input.due)}`)
  })
}

export function startJob(data: AppData, actor: Actor, jobId: string, opKey: string) {
  return mutate(data, (d) => {
    const err = deny(actor, ['production_head', 'director'])
    if (err) return err
    const job = byId(d.jobs, jobId)
    if (!job) return 'Задание не найдено'
    if (job.state !== 'waiting' && job.state !== 'paused') return 'Задание уже в работе или выполнено'
    const dup = guardOp(d, opKey)
    if (dup) return dup
    const resumed = job.state === 'paused'
    job.state = 'in_progress'
    job.delayReason = null
    d.prodEvents.push({
      id: nextId(d, 'pe'), jobId: job.id, type: resumed ? 'resume' : 'start', at: nowStamp(), qty: 0, unit: job.unit,
      employeeId: actor.employeeId, signedBy: '', comment: '', paperDoc: '', attachment: null,
    })
    const order = byId(d.orders, job.orderId)!
    if (order.stage === 'job_prep') moveStage(order, 'production', 'emp-prod', job.due, 'job_prep')
    log(d, actor, 'order', order.id, resumed ? 'Производство возобновлено' : 'Производство начато')
  })
}

export function pauseJob(data: AppData, actor: Actor, jobId: string, reason: string) {
  return mutate(data, (d) => {
    const err = deny(actor, ['production_head', 'director'])
    if (err) return err
    const job = byId(d.jobs, jobId)
    if (!job) return 'Задание не найдено'
    if (job.state !== 'in_progress') return 'Приостановить можно только задание в работе'
    if (!reason.trim()) return 'Укажите причину остановки'
    job.state = 'paused'
    job.delayReason = reason.trim()
    d.prodEvents.push({
      id: nextId(d, 'pe'), jobId: job.id, type: 'pause', at: nowStamp(), qty: 0, unit: job.unit,
      employeeId: actor.employeeId, signedBy: '', comment: reason.trim(), paperDoc: '', attachment: null,
    })
    log(d, actor, 'order', job.orderId, 'Задание приостановлено', reason.trim())
  })
}

export interface OutputInput {
  jobId: string
  at: string
  qty: number
  signedBy: string
  comment: string
  paperDoc: string
  attach: boolean
  opKey: string
}

export function recordOutput(data: AppData, actor: Actor, input: OutputInput) {
  return mutate(data, (d) => {
    const err = deny(actor, ['production_head', 'director'])
    if (err) return err
    const job = byId(d.jobs, input.jobId)
    if (!job) return 'Выберите задание'
    if (job.state !== 'in_progress') return 'Выпуск фиксируется по заданию в работе. Сначала начните или возобновите задание.'
    if (!(input.qty > 0)) return 'Количество должно быть больше нуля'
    const left = remainingToProduce(d, job)
    if (input.qty > left + 1e-9) return `Нельзя внести больше планового остатка: осталось ${formatQty(left, job.unit)}`
    if (!input.paperDoc.trim()) return 'Укажите номер бумажного документа цеха'
    if (!input.signedBy.trim()) return 'Укажите сотрудника цеха, подписавшего документ'
    if (!input.at) return 'Укажите дату и время'
    const dup = guardOp(d, input.opKey)
    if (dup) return dup
    d.prodEvents.push({
      id: nextId(d, 'pe'), jobId: job.id, type: 'output', at: input.at, qty: input.qty, unit: job.unit,
      employeeId: actor.employeeId, signedBy: input.signedBy.trim(), comment: input.comment.trim(),
      paperDoc: input.paperDoc.trim(), attachment: input.attach ? 'demo-naryad.txt' : null,
    })
    const done = producedQty(d, job.id) + 1e-9 >= job.plannedQty
    if (done) {
      job.state = 'done'
      job.delayReason = null
    }
    const order = byId(d.orders, job.orderId)!
    const allDone = orderJobs(d, order.id).every((item) => item.state === 'done')
    if (allDone && order.stage === 'production') moveStage(order, 'ready_transfer', 'emp-wh', addDays(DEMO_DATE, 1), 'production')
    log(
      d,
      actor,
      'order',
      order.id,
      `Цех зафиксировал выпуск ${formatQty(input.qty, job.unit)}${done ? ' · задание выполнено' : ''}`,
      `Бумажный документ ${input.paperDoc.trim()}. Ожидается передача на склад ГП.`,
    )
  })
}

export function receiveToWarehouse(data: AppData, actor: Actor, input: { jobId: string; qty: number; docNumber: string; comment: string; opKey: string }) {
  return mutate(data, (d) => {
    const err = deny(actor, ['warehouse', 'director'])
    if (err) return err
    const job = byId(d.jobs, input.jobId)
    if (!job) return 'Задание не найдено'
    if (!(input.qty > 0)) return 'Количество должно быть больше нуля'
    const can = availableToReceive(d, job.id)
    if (input.qty > can + 1e-9) return `Нельзя принять больше выпущенного: доступно к приёмке ${formatQty(can, job.unit)}`
    if (!input.docNumber.trim()) return 'Укажите номер приходного документа'
    const dup = guardOp(d, input.opKey)
    if (dup) return dup
    d.receipts.push({
      id: nextId(d, 'rc'), jobId: job.id, at: nowStamp(), qty: input.qty, unit: job.unit,
      employeeId: actor.employeeId, comment: input.comment.trim(), docNumber: input.docNumber.trim(),
    })
    const order = byId(d.orders, job.orderId)!
    const allAccepted = orderLines(d, order.id).every((line) => lineAccepted(d, line.id) + 1e-9 >= line.qty)
    if (allAccepted && order.stage === 'ready_transfer') moveStage(order, 'warehouse', 'emp-wh', order.shipDue, 'ready_transfer')
    const diff = producedQty(d, job.id) - lineAccepted(d, job.lineId)
    log(
      d,
      actor,
      'order',
      order.id,
      `Склад принял ${formatQty(input.qty, job.unit)}`,
      `${input.docNumber.trim()}${diff > 0 ? `. Выпущено, но не принято: ${formatQty(diff, job.unit)}` : ''}`,
    )
  })
}

export function ship(data: AppData, actor: Actor, input: { orderId: string; lineId: string; qty: number; docNumber: string; opKey: string }) {
  return mutate(data, (d) => {
    const err = deny(actor, ['warehouse'])
    if (err) return err
    const order = getOrder(d, input.orderId)
    if (typeof order === 'string') return order
    const line = byId(d.lines, input.lineId)
    if (!line || line.orderId !== order.id) return 'Выберите позицию заказа'
    if (!(input.qty > 0)) return 'Количество должно быть больше нуля'
    const can = availableToShip(d, line.id)
    if (input.qty > can + 1e-9) return `Нельзя отгрузить больше принятого на склад и ещё не отгруженного: доступно ${formatQty(can, line.unit)}`
    if (!input.docNumber.trim()) return 'Укажите номер накладной'
    const dup = guardOp(d, input.opKey)
    if (dup) return dup
    d.shipments.push({
      id: nextId(d, 'sh'), orderId: order.id, lineId: line.id, at: nowStamp(), qty: input.qty, unit: line.unit,
      docNumber: input.docNumber.trim(), employeeId: actor.employeeId,
    })
    const full = orderLines(d, order.id).every((item) => lineShipped(d, item.id) + 1e-9 >= item.qty)
    const late: Stage[] = ['warehouse', 'shipped_partial', 'ready_transfer']
    if (full) moveStage(order, 'shipped_full', 'emp-wh', DEMO_DATE, order.stage)
    else if (late.includes(order.stage)) moveStage(order, 'shipped_partial', 'emp-wh', order.shipDue, order.stage === 'shipped_partial' ? undefined : order.stage)
    const left = line.qty - lineShipped(d, line.id)
    log(
      d,
      actor,
      'order',
      order.id,
      full ? `Полная отгрузка · ${formatQty(input.qty, line.unit)}` : `Частичная отгрузка ${formatQty(input.qty, line.unit)}`,
      `${input.docNumber.trim()}. Осталось отгрузить: ${formatQty(left, line.unit)}`,
    )
  })
}

export function changeShipDue(data: AppData, actor: Actor, orderId: string, newDate: string, reason: string) {
  return mutate(data, (d) => {
    const err = deny(actor, ['director', 'rop'])
    if (err) return err
    const order = getOrder(d, orderId)
    if (typeof order === 'string') return order
    if (!newDate) return 'Укажите новый срок отгрузки'
    if (newDate < DEMO_DATE) return 'Новый срок не может быть раньше даты демонстрации'
    if (!reason.trim()) return 'Укажите основание изменения условий (например, письмо клиента)'
    const old = order.shipDue
    order.shipDue = newDate
    order.shipDueChangeReason = reason.trim()
    log(d, actor, 'order', order.id, `Срок отгрузки изменён: ${formatDate(old)} → ${formatDate(newDate)}`, reason.trim())
  })
}

export interface TaskInput {
  title: string
  assigneeId: string
  directionId: string | null
  linkType: Task['linkType']
  linkId: string | null
  due: string
  comment: string
  opKey: string
}

function createTaskIn(d: Draft, actor: Actor, input: TaskInput): string | Task {
  if (!input.title.trim()) return 'Опишите задачу'
  if (!input.assigneeId) return 'Выберите исполнителя'
  if (!input.due) return 'Укажите срок'
  if (input.due < DEMO_DATE) return 'Срок не может быть раньше даты демонстрации'
  const dup = guardOp(d, input.opKey)
  if (dup) return dup
  const number = `П-${d.tasks.length + 1}`
  const task: Task = {
    id: nextId(d, 'task'),
    number,
    title: input.title.trim(),
    authorId: actor.employeeId,
    assigneeId: input.assigneeId,
    directionId: input.directionId,
    linkType: input.linkType,
    linkId: input.linkId,
    createdAt: DEMO_DATE,
    due: input.due,
    state: 'new',
    comment: input.comment.trim(),
    result: '',
    previousDue: null,
  }
  d.tasks.unshift(task)
  log(d, actor, 'task', task.id, 'Поручение создано', `Срок ${formatDate(task.due)}`)
  if (task.linkType && task.linkId) log(d, actor, task.linkType, task.linkId, `Создано поручение ${task.number}`, task.title)
  return task
}

export function createTask(data: AppData, actor: Actor, input: TaskInput) {
  return mutate(data, (d) => {
    const result = createTaskIn(d, actor, input)
    if (typeof result === 'string') return result
  })
}

function taskFor(d: Draft, taskId: string): Task | string {
  return byId(d.tasks, taskId) ?? 'Поручение не найдено'
}

function roleOf(d: Draft, employeeId: string): Role | undefined {
  return byId(d.employees, employeeId)?.role
}

function mirror(d: Draft, actor: Actor, task: Task, action: string, comment = '') {
  log(d, actor, 'task', task.id, action, comment)
  if (task.linkType && task.linkId) log(d, actor, task.linkType, task.linkId, `${task.number}: ${action}`, comment)
}

export function taskAccept(data: AppData, actor: Actor, taskId: string) {
  return mutate(data, (d) => {
    const task = taskFor(d, taskId)
    if (typeof task === 'string') return task
    if (roleOf(d, task.assigneeId) !== actor.role) return 'Принять в работу может только исполнитель'
    if (task.state !== 'new' && task.state !== 'returned') return 'Поручение уже в работе'
    task.state = 'in_progress'
    mirror(d, actor, task, 'Принято в работу')
  })
}

export function taskSubmit(data: AppData, actor: Actor, taskId: string, result: string) {
  return mutate(data, (d) => {
    const task = taskFor(d, taskId)
    if (typeof task === 'string') return task
    if (roleOf(d, task.assigneeId) !== actor.role) return 'Результат добавляет исполнитель'
    if (task.state !== 'in_progress' && task.state !== 'new' && task.state !== 'returned') return 'Поручение уже на проверке или закрыто'
    if (result.trim().length < 5) return 'Опишите результат: что сделано и что получено. Закрыть поручение без результата нельзя.'
    task.result = result.trim()
    task.state = 'submitted'
    mirror(d, actor, task, 'Результат отправлен на проверку', result.trim())
  })
}

export function taskConfirm(data: AppData, actor: Actor, taskId: string) {
  return mutate(data, (d) => {
    const task = taskFor(d, taskId)
    if (typeof task === 'string') return task
    if (roleOf(d, task.authorId) !== actor.role) return 'Подтверждает постановщик поручения'
    if (task.state !== 'submitted') return 'Нет результата на проверке'
    task.state = 'confirmed'
    mirror(d, actor, task, 'Результат подтверждён постановщиком')
  })
}

export function taskReturn(data: AppData, actor: Actor, taskId: string, comment: string, newDue: string) {
  return mutate(data, (d) => {
    const task = taskFor(d, taskId)
    if (typeof task === 'string') return task
    if (roleOf(d, task.authorId) !== actor.role) return 'Вернуть может постановщик поручения'
    if (task.state !== 'submitted') return 'Вернуть можно только результат на проверке'
    if (!comment.trim()) return 'Укажите, что нужно доработать'
    if (!newDue) return 'Назначьте новый срок'
    if (newDue < DEMO_DATE) return 'Новый срок не может быть раньше даты демонстрации'
    task.previousDue = task.due
    task.due = newDue
    task.state = 'returned'
    task.comment = comment.trim()
    mirror(d, actor, task, `Возвращено на доработку · новый срок ${formatDate(newDue)}`, comment.trim())
  })
}

export function appealAssign(data: AppData, actor: Actor, input: { appealId: string; enterpriseId: string; directionId: string; managerId: string }) {
  return mutate(data, (d) => {
    const err = deny(actor, ['director', 'rop'])
    if (err) return err
    const appeal = byId(d.appeals, input.appealId)
    if (!appeal) return 'Обращение не найдено'
    if (!input.enterpriseId) return 'Выберите предприятие'
    if (!input.directionId) return 'Выберите направление'
    if (!input.managerId) return 'Выберите менеджера'
    appeal.enterpriseId = input.enterpriseId
    appeal.directionId = input.directionId
    appeal.managerId = input.managerId
    appeal.nextAction = 'Связаться с клиентом и зафиксировать результат'
    const dir = byId(d.directions, input.directionId)?.name ?? ''
    const mgr = byId(d.employees, input.managerId)?.shortName ?? ''
    log(d, actor, 'appeal', appeal.id, `Назначено: ${dir} · ${mgr}`)
  })
}

export function appealCallback(data: AppData, actor: Actor, input: { appealId: string; due: string; note: string; opKey: string }) {
  return mutate(data, (d) => {
    const err = deny(actor, ['director', 'rop', 'manager'])
    if (err) return err
    const appeal = byId(d.appeals, input.appealId)
    if (!appeal) return 'Обращение не найдено'
    if (!appeal.managerId) return 'Сначала назначьте менеджера'
    const result = createTaskIn(d, actor, {
      title: `Перезвонить: ${appeal.phone}${input.note.trim() ? ` · ${input.note.trim()}` : ''}`,
      assigneeId: appeal.managerId,
      directionId: appeal.directionId,
      linkType: 'appeal',
      linkId: appeal.id,
      due: input.due,
      comment: input.note,
      opKey: input.opKey,
    })
    if (typeof result === 'string') return result
    appeal.nextAction = `Перезвонить до ${formatDate(input.due)}`
  })
}

export function appealResult(data: AppData, actor: Actor, input: { appealId: string; result: AppealResult | ''; note: string; nextAction: string }) {
  return mutate(data, (d) => {
    const err = deny(actor, ['director', 'rop', 'manager'])
    if (err) return err
    const appeal = byId(d.appeals, input.appealId)
    if (!appeal) return 'Обращение не найдено'
    if (!appeal.managerId) return 'Сначала назначьте менеджера'
    if (!input.result) return 'Выберите результат'
    if (!input.note.trim()) return 'Кратко опишите содержание разговора'
    const stillOpen = input.result === 'no_answer' || input.result === 'continue'
    if (stillOpen && !input.nextAction.trim()) return 'Обращение остаётся в работе: укажите следующее действие'
    appeal.result = input.result
    appeal.resultNote = input.note.trim()
    appeal.nextAction = stillOpen ? input.nextAction.trim() : ''
    const labels: Record<AppealResult, string> = {
      contacted: 'удалось связаться',
      no_answer: 'не ответил',
      resolved: 'вопрос решён',
      continue: 'требуется продолжение',
    }
    log(d, actor, 'appeal', appeal.id, `Результат: ${labels[input.result]}`, input.note.trim())
  })
}

export function appealCreateOrder(
  data: AppData,
  actor: Actor,
  input: { appealId: string; clientId: string; product: string; qty: number; unit: Unit; price: number; shipDue: string; opKey: string },
) {
  return mutate(data, (d) => {
    const err = deny(actor, ['manager', 'rop'])
    if (err) return err
    const appeal = byId(d.appeals, input.appealId)
    if (!appeal) return 'Обращение не найдено'
    if (!appeal.enterpriseId || !appeal.directionId || !appeal.managerId) return 'Сначала назначьте предприятие, направление и менеджера'
    if (appeal.orderId) return 'По обращению уже создан заказ'
    if (!input.clientId) return 'Выберите клиента'
    if (!input.product.trim()) return 'Укажите продукцию'
    if (!(input.qty > 0)) return 'Количество должно быть больше нуля'
    if (!(input.price > 0)) return 'Цена должна быть больше нуля'
    if (!input.shipDue || input.shipDue < DEMO_DATE) return 'Укажите срок отгрузки не раньше даты демонстрации'
    const dup = guardOp(d, input.opKey)
    if (dup) return dup
    const num = 101 + d.orders.length
    const ws = d.workshops.find((w) => w.enterpriseId === appeal.enterpriseId)
    const order: Order = {
      id: nextId(d, 'ord'),
      number: `З-${num}`,
      contractNumber: `Д-${num}`,
      clientId: input.clientId,
      directionId: appeal.directionId,
      enterpriseId: appeal.enterpriseId,
      managerId: appeal.managerId,
      stage: 'new',
      stageResponsibleId: appeal.managerId,
      stageDue: addDays(DEMO_DATE, 1),
      stageEnteredAt: DEMO_DATE,
      createdAt: DEMO_DATE,
      shipDue: input.shipDue,
      originalShipDue: input.shipDue,
      shipDueChangeReason: null,
      lastCompletedStage: null,
      returnReason: null,
      returnedFrom: null,
      preferredWorkshopId: ws?.id ?? 'ws-1',
      recipeChecked: false,
    }
    d.orders.push(order)
    d.lines.push({ id: nextId(d, 'line'), orderId: order.id, name: input.product.trim(), qty: input.qty, unit: input.unit, price: input.price })
    appeal.orderId = order.id
    appeal.clientId = input.clientId
    log(d, actor, 'order', order.id, 'Заказ создан из обращения', appeal.phone)
    log(d, actor, 'appeal', appeal.id, `Создан заказ ${order.number}`)
  })
}

export function supplyUpdate(
  data: AppData,
  actor: Actor,
  input: { supplyId: string; stage: SupplyStage; location: string; info: string; plannedDate: string; reason: string },
) {
  return mutate(data, (d) => {
    const err = deny(actor, ['purchaser'])
    if (err) return err
    const supply = byId(d.supplies, input.supplyId)
    if (!supply) return 'Поставка не найдена'
    if (!input.info.trim()) return 'Опишите последнюю информацию о грузе'
    if (!input.plannedDate) return 'Укажите ожидаемую дату'
    const moved = input.plannedDate !== supply.plannedDate
    if (moved && !input.reason.trim()) return 'Дата изменена: укажите причину переноса'
    if ((input.stage === 'received' || input.stage === 'partial') && input.stage !== supply.stage)
      return 'Получение отмечается отдельной кнопкой «Отметить получение»'
    const note = moved
      ? `Срок перенесён ${formatDate(supply.plannedDate)} → ${formatDate(input.plannedDate)}. Причина: ${input.reason.trim()}. ${input.info.trim()}`
      : input.info.trim()
    supply.stage = input.stage
    supply.location = input.location.trim()
    supply.lastInfo = input.info.trim()
    supply.plannedDate = input.plannedDate
    d.supplyEvents.unshift({ id: nextId(d, 'se'), supplyId: supply.id, at: nowStamp(), authorId: actor.employeeId, note })
    log(d, actor, 'supply', supply.id, moved ? 'Перенесена ожидаемая дата' : 'Обновлены сведения о поставке', note)
  })
}

export function supplyReceive(data: AppData, actor: Actor, input: { supplyId: string; qty: number; nextDate: string; opKey: string }) {
  return mutate(data, (d) => {
    const err = deny(actor, ['purchaser', 'warehouse'])
    if (err) return err
    const supply = byId(d.supplies, input.supplyId)
    if (!supply) return 'Поставка не найдена'
    if (!(input.qty > 0)) return 'Количество должно быть больше нуля'
    const left = supply.qty - supply.receivedQty
    if (input.qty > left + 1e-9) return `Нельзя получить больше остатка: осталось ${formatQty(left, supply.unit)}`
    const full = supply.receivedQty + input.qty + 1e-9 >= supply.qty
    if (!full && !input.nextDate) return 'Получено частично: укажите новое ожидаемое время для остатка'
    const dup = guardOp(d, input.opKey)
    if (dup) return dup
    supply.receivedQty += input.qty
    supply.stage = full ? 'received' : 'partial'
    const parts = [`Получено ${formatQty(input.qty, supply.unit)}`]
    if (!full && input.nextDate !== supply.plannedDate) {
      parts.push(`остаток ожидается ${formatDate(input.nextDate)} (было ${formatDate(supply.plannedDate)})`)
      supply.plannedDate = input.nextDate
    }
    supply.lastInfo = full ? 'Получено полностью' : `Получено частично, остаток ${formatQty(supply.qty - supply.receivedQty, supply.unit)}`
    supply.location = full ? 'Склад сырья' : supply.location
    const note = parts.join(', ')
    d.supplyEvents.unshift({ id: nextId(d, 'se'), supplyId: supply.id, at: nowStamp(), authorId: actor.employeeId, note })
    log(d, actor, 'supply', supply.id, full ? 'Поставка получена полностью' : 'Поставка получена частично', note)
  })
}
