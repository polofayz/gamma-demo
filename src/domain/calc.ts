import { daysOverdue, formatDate, formatMoney, formatQty } from './format'
import type {
  AcceptFlag,
  AppData,
  Appeal,
  Job,
  Obligation,
  Order,
  OrderLine,
  Supply,
  Task,
  Unit,
} from './types'
import { DEMO_DATE } from './types'

export function byId<T extends { id: string }>(list: T[], id: string | null | undefined): T | undefined {
  if (!id) return undefined
  return list.find((item) => item.id === id)
}

export function personName(data: AppData, id: string | null | undefined): string {
  if (!id) return 'Не назначен'
  return byId(data.employees, id)?.shortName ?? 'Не найден'
}

export function personTitle(data: AppData, id: string | null | undefined): string {
  if (!id) return 'Не назначен'
  const employee = byId(data.employees, id)
  if (!employee) return 'Не найден'
  if (employee.title === employee.shortName) return employee.title
  return `${employee.title} · ${employee.shortName}`
}

export function clientName(data: AppData, id: string | null | undefined): string {
  if (!id) return 'Клиент не указан'
  return byId(data.clients, id)?.name ?? 'Не найден'
}

export function directionName(data: AppData, id: string | null | undefined): string {
  if (!id) return 'Направление не назначено'
  return byId(data.directions, id)?.name ?? 'Не найдено'
}

export function enterpriseName(data: AppData, id: string | null | undefined): string {
  if (!id) return 'Предприятие не назначено'
  return byId(data.enterprises, id)?.name ?? 'Не найдено'
}

export function workshopName(data: AppData, id: string): string {
  return byId(data.workshops, id)?.name ?? 'Цех'
}

export function orderLines(data: AppData, orderId: string): OrderLine[] {
  return data.lines.filter((line) => line.orderId === orderId)
}

export function lineAmount(line: OrderLine): number {
  return line.qty * line.price
}

export function orderAmount(data: AppData, orderId: string): number {
  return orderLines(data, orderId).reduce((sum, line) => sum + lineAmount(line), 0)
}

export function orderJobs(data: AppData, orderId: string): Job[] {
  return data.jobs.filter((job) => job.orderId === orderId)
}

export function producedQty(data: AppData, jobId: string): number {
  return data.prodEvents
    .filter((event) => event.jobId === jobId && event.type === 'output')
    .reduce((sum, event) => sum + event.qty, 0)
}

export function acceptedQty(data: AppData, jobId: string): number {
  return data.receipts.filter((item) => item.jobId === jobId).reduce((sum, item) => sum + item.qty, 0)
}

export function lineProduced(data: AppData, lineId: string): number {
  return data.jobs.filter((job) => job.lineId === lineId).reduce((sum, job) => sum + producedQty(data, job.id), 0)
}

export function lineAccepted(data: AppData, lineId: string): number {
  return data.jobs.filter((job) => job.lineId === lineId).reduce((sum, job) => sum + acceptedQty(data, job.id), 0)
}

export function lineShipped(data: AppData, lineId: string): number {
  return data.shipments.filter((item) => item.lineId === lineId).reduce((sum, item) => sum + item.qty, 0)
}

export function acceptFlag(data: AppData, job: Job): AcceptFlag {
  const accepted = acceptedQty(data, job.id)
  if (accepted <= 0) return 'none'
  if (accepted + 1e-9 >= job.plannedQty) return 'full'
  return 'partial'
}

export function availableToReceive(data: AppData, jobId: string): number {
  return Math.max(0, producedQty(data, jobId) - acceptedQty(data, jobId))
}

export function availableToShip(data: AppData, lineId: string): number {
  return Math.max(0, lineAccepted(data, lineId) - lineShipped(data, lineId))
}

export function remainingToProduce(data: AppData, job: Job): number {
  return Math.max(0, job.plannedQty - producedQty(data, job.id))
}

export interface QtyBalance {
  unit: Unit
  ordered: number
  produced: number
  accepted: number
  shipped: number
  left: number
}

export function orderBalances(data: AppData, orderId: string): QtyBalance[] {
  const grouped = new Map<Unit, QtyBalance>()
  for (const line of orderLines(data, orderId)) {
    const current = grouped.get(line.unit) ?? {
      unit: line.unit,
      ordered: 0,
      produced: 0,
      accepted: 0,
      shipped: 0,
      left: 0,
    }
    current.ordered += line.qty
    current.produced += lineProduced(data, line.id)
    current.accepted += lineAccepted(data, line.id)
    current.shipped += lineShipped(data, line.id)
    current.left += line.qty - lineShipped(data, line.id)
    grouped.set(line.unit, current)
  }
  return [...grouped.values()]
}

export function hasUnshipped(data: AppData, order: Order): boolean {
  return orderBalances(data, order.id).some((row) => row.left > 1e-9)
}

export function isInWork(order: Order): boolean {
  return order.stage !== 'shipped_full'
}

export function isOverdueShipment(data: AppData, order: Order): boolean {
  return hasUnshipped(data, order) && order.shipDue < DEMO_DATE
}

export function paidAmount(data: AppData, obligationId: string): number {
  return data.payments
    .filter((payment) => payment.obligationId === obligationId)
    .reduce((sum, payment) => sum + payment.amount, 0)
}

export function remainderOf(data: AppData, obligation: Obligation): number {
  return obligation.amount - paidAmount(data, obligation.id)
}

export type DebtTone = 'paid' | 'overdue' | 'no_due' | 'open'

export function debtTone(data: AppData, obligation: Obligation): DebtTone {
  const left = remainderOf(data, obligation)
  if (left <= 0) return 'paid'
  if (!obligation.dueDate) return 'no_due'
  if (obligation.dueDate < DEMO_DATE) return 'overdue'
  return 'open'
}

export function isOverdueDebt(data: AppData, obligation: Obligation): boolean {
  return debtTone(data, obligation) === 'overdue'
}

export function isDelayedSupply(supply: Supply): boolean {
  return supply.receivedQty + 1e-9 < supply.qty && supply.plannedDate < DEMO_DATE
}

export function supplyWasLate(supply: Supply): boolean {
  return supply.originalPlannedDate < DEMO_DATE && supply.receivedQty + 1e-9 < supply.qty
}

export function isAppealProcessed(appeal: Appeal): boolean {
  return appeal.result === 'resolved' || appeal.result === 'contacted'
}

export function appealStatus(appeal: Appeal): string {
  if (appeal.result === 'resolved') return 'Обработано · вопрос решён'
  if (appeal.result === 'contacted') return 'Обработано · удалось связаться'
  if (appeal.result === 'no_answer') return 'В работе · не ответил'
  if (appeal.result === 'continue') return 'В работе · требуется продолжение'
  if (appeal.managerId) return 'Назначено · нет результата'
  return 'Не назначено'
}

export function isTaskOverdue(task: Task): boolean {
  const stillWithAssignee = task.state === 'new' || task.state === 'in_progress' || task.state === 'returned'
  return stillWithAssignee && task.due < DEMO_DATE
}

export function isTaskAwaiting(task: Task): boolean {
  return task.state === 'submitted'
}

export function taskEnterpriseId(data: AppData, task: Task): string | null {
  if (task.linkType === 'order' && task.linkId) return byId(data.orders, task.linkId)?.enterpriseId ?? null
  if (task.linkType === 'appeal' && task.linkId) return byId(data.appeals, task.linkId)?.enterpriseId ?? null
  if (task.linkType === 'supply' && task.linkId) {
    const supply = byId(data.supplies, task.linkId)
    const ids = supply ? supplyEnterpriseIds(data, supply) : []
    return ids.length === 1 ? ids[0] : null
  }
  return null
}

export function supplyEnterpriseIds(data: AppData, supply: Supply): string[] {
  const ids = new Set<string>()
  for (const jobId of supply.jobIds) {
    const job = byId(data.jobs, jobId)
    const order = job ? byId(data.orders, job.orderId) : undefined
    if (order) ids.add(order.enterpriseId)
  }
  return [...ids]
}

export function enterpriseMatch(recordId: string | null, enterpriseId: string): boolean {
  if (enterpriseId === 'all') return true
  return recordId === enterpriseId
}

export interface OrderQuery {
  enterpriseId: string
  directionId?: string
  managerId?: string
  clientId?: string
  stage?: string
  q?: string
  inWork?: boolean
  overdueShip?: boolean
}

export function selectOrders(data: AppData, query: OrderQuery): Order[] {
  const needle = query.q?.trim().toLowerCase()
  return data.orders.filter((order) => {
    if (!enterpriseMatch(order.enterpriseId, query.enterpriseId)) return false
    if (query.directionId && order.directionId !== query.directionId) return false
    if (query.managerId && order.managerId !== query.managerId) return false
    if (query.clientId && order.clientId !== query.clientId) return false
    if (query.stage && order.stage !== query.stage) return false
    if (query.inWork && !isInWork(order)) return false
    if (query.overdueShip && !isOverdueShipment(data, order)) return false
    if (needle) {
      const client = clientName(data, order.clientId).toLowerCase()
      if (!order.number.toLowerCase().includes(needle) && !client.includes(needle)) return false
    }
    return true
  })
}

export interface DebtQuery {
  enterpriseId: string
  directionId?: string
  clientId?: string
  overdue?: boolean
  openOnly?: boolean
  q?: string
}

export function obligationOrder(data: AppData, obligation: Obligation): Order | undefined {
  return byId(data.orders, obligation.orderId)
}

export function selectObligations(data: AppData, query: DebtQuery): Obligation[] {
  const needle = query.q?.trim().toLowerCase()
  return data.obligations.filter((obligation) => {
    const order = obligationOrder(data, obligation)
    if (!order) return false
    if (!enterpriseMatch(order.enterpriseId, query.enterpriseId)) return false
    if (query.directionId && order.directionId !== query.directionId) return false
    if (query.clientId && order.clientId !== query.clientId) return false
    const left = remainderOf(data, obligation)
    if (query.openOnly && left <= 0) return false
    if (query.overdue && !isOverdueDebt(data, obligation)) return false
    if (needle) {
      const client = clientName(data, order.clientId).toLowerCase()
      const blob = `${obligation.docNumber} ${order.number} ${client}`.toLowerCase()
      if (!blob.includes(needle)) return false
    }
    return true
  })
}

export function debtSum(data: AppData, obligations: Obligation[]): number {
  return obligations.reduce((sum, obligation) => sum + Math.max(0, remainderOf(data, obligation)), 0)
}

export interface AppealQuery {
  enterpriseId: string
  directionId?: string
  unprocessed?: boolean
  processed?: boolean
  q?: string
}

export function selectAppeals(data: AppData, query: AppealQuery): Appeal[] {
  const needle = query.q?.trim().toLowerCase()
  return data.appeals.filter((appeal) => {
    if (query.enterpriseId !== 'all' && appeal.enterpriseId !== query.enterpriseId) return false
    if (query.directionId && appeal.directionId !== query.directionId) return false
    const processed = isAppealProcessed(appeal)
    if (query.unprocessed && processed) return false
    if (query.processed && !processed) return false
    if (needle) {
      const client = clientName(data, appeal.clientId).toLowerCase()
      if (!appeal.phone.toLowerCase().includes(needle) && !client.includes(needle)) return false
    }
    return true
  })
}

export function callsOfAppeals(data: AppData, appeals: Appeal[]) {
  const ids = new Set(appeals.map((appeal) => appeal.id))
  return data.calls.filter((call) => ids.has(call.appealId))
}

export interface TaskQuery {
  enterpriseId: string
  directionId?: string
  assigneeId?: string
  overdue?: boolean
  awaiting?: boolean
  q?: string
}

export function selectTasks(data: AppData, query: TaskQuery): Task[] {
  const needle = query.q?.trim().toLowerCase()
  return data.tasks.filter((task) => {
    if (query.enterpriseId !== 'all') {
      const enterpriseId = taskEnterpriseId(data, task)
      if (enterpriseId !== query.enterpriseId) return false
    }
    if (query.directionId && task.directionId !== query.directionId) return false
    if (query.assigneeId && task.assigneeId !== query.assigneeId) return false
    if (query.overdue && !isTaskOverdue(task)) return false
    if (query.awaiting && !isTaskAwaiting(task)) return false
    if (needle && !`${task.number} ${task.title}`.toLowerCase().includes(needle)) return false
    return true
  })
}

export interface SupplyQuery {
  enterpriseId: string
  delayed?: boolean
  origin?: string
  q?: string
}

export function selectSupplies(data: AppData, query: SupplyQuery): Supply[] {
  const needle = query.q?.trim().toLowerCase()
  return data.supplies.filter((supply) => {
    if (query.enterpriseId !== 'all') {
      const ids = supplyEnterpriseIds(data, supply)
      if (!ids.includes(query.enterpriseId)) return false
    }
    if (query.delayed && !isDelayedSupply(supply)) return false
    if (query.origin && supply.origin !== query.origin) return false
    if (needle) {
      const blob = `${supply.number} ${supply.material} ${supply.supplier}`.toLowerCase()
      if (!blob.includes(needle)) return false
    }
    return true
  })
}

export interface Kpis {
  inWork: Order[]
  overdueShip: Order[]
  debtDocs: Obligation[]
  overdueDebtDocs: Obligation[]
  debt: number
  overdueDebt: number
  unprocessed: Appeal[]
  overdueTasks: Task[]
  awaitingTasks: Task[]
  delayedSupplies: Supply[]
}

export function kpis(data: AppData, enterpriseId: string): Kpis {
  const inWork = selectOrders(data, { enterpriseId, inWork: true })
  const overdueShip = selectOrders(data, { enterpriseId, overdueShip: true })
  const debtDocs = selectObligations(data, { enterpriseId, openOnly: true })
  const overdueDebtDocs = selectObligations(data, { enterpriseId, overdue: true })
  const unprocessed = selectAppeals(data, { enterpriseId, unprocessed: true })
  const overdueTasks = selectTasks(data, { enterpriseId, overdue: true })
  const awaitingTasks = selectTasks(data, { enterpriseId, awaiting: true })
  const delayedSupplies = selectSupplies(data, { enterpriseId, delayed: true })
  return {
    inWork,
    overdueShip,
    debtDocs,
    overdueDebtDocs,
    debt: debtSum(data, debtDocs),
    overdueDebt: debtSum(data, overdueDebtDocs),
    unprocessed,
    overdueTasks,
    awaitingTasks,
    delayedSupplies,
  }
}

export interface DirectionRow {
  directionId: string
  name: string
  ropId: string
  inWork: Order[]
  overdueShip: Order[]
  debt: number
  overdueDebt: number
  unprocessed: Appeal[]
  overdueTasks: Task[]
}

export function directionRows(data: AppData, enterpriseId: string): DirectionRow[] {
  return data.directions.map((direction) => {
    const debtDocs = selectObligations(data, { enterpriseId, directionId: direction.id, openOnly: true })
    const overdueDebtDocs = selectObligations(data, { enterpriseId, directionId: direction.id, overdue: true })
    return {
      directionId: direction.id,
      name: direction.name,
      ropId: direction.ropId,
      inWork: selectOrders(data, { enterpriseId, directionId: direction.id, inWork: true }),
      overdueShip: selectOrders(data, { enterpriseId, directionId: direction.id, overdueShip: true }),
      debt: debtSum(data, debtDocs),
      overdueDebt: debtSum(data, overdueDebtDocs),
      unprocessed: selectAppeals(data, { enterpriseId, directionId: direction.id, unprocessed: true }),
      overdueTasks: selectTasks(data, { enterpriseId, directionId: direction.id, overdue: true }),
    }
  })
}

export interface Decision {
  id: string
  type: string
  objectLabel: string
  reason: string
  due: string
  responsibleId: string | null
  next: string
  entityType: 'order' | 'appeal' | 'supply'
  entityId: string
  linkType: 'order' | 'appeal' | 'supply'
}

export function lastAction(data: AppData, entityType: string, entityId: string): string {
  const latest = historyOf(data, entityType, entityId)[0]
  return latest ? latest.action : 'Действий пока нет'
}

export function decisions(data: AppData, enterpriseId: string): Decision[] {
  const rows: Decision[] = []
  for (const order of selectOrders(data, { enterpriseId })) {
    const label = `Заказ ${order.number} · ${clientName(data, order.clientId)}`
    if (order.stage === 'technologist') {
      rows.push({
        id: `tech-${order.id}`,
        type: 'Технолог не согласовал заказ',
        objectLabel: label,
        reason: order.stageDue < DEMO_DATE ? 'Срок проверки уже прошёл' : 'Заказ ждёт проверки',
        due: order.stageDue,
        responsibleId: order.stageResponsibleId,
        next: 'Подтвердить проверку или вернуть на уточнение',
        entityType: 'order',
        entityId: order.id,
        linkType: 'order',
      })
    }
    if (order.stage === 'production' && (order.stageDue < DEMO_DATE || order.shipDue < DEMO_DATE)) {
      const job = orderJobs(data, order.id).find((item) => item.delayReason)
      rows.push({
        id: `prod-${order.id}`,
        type: 'Производство не завершено к сроку',
        objectLabel: label,
        reason: job?.delayReason || 'Срок выпуска прошёл, задание ещё не выполнено',
        due: order.shipDue,
        responsibleId: order.stageResponsibleId,
        next: 'Зафиксировать фактический выпуск или причину остановки',
        entityType: 'order',
        entityId: order.id,
        linkType: 'order',
      })
    }
    for (const job of orderJobs(data, order.id)) {
      const produced = producedQty(data, job.id)
      const accepted = acceptedQty(data, job.id)
      if (produced > accepted + 1e-9 && (job.state === 'done' || order.stage === 'ready_transfer')) {
        rows.push({
          id: `wh-${job.id}`,
          type: 'Продукция выпущена, склад ещё не подтвердил приёмку',
          objectLabel: label,
          reason: `Выпущено ${formatQty(produced, job.unit)}, принято ${formatQty(accepted, job.unit)}`,
          due: order.shipDue,
          responsibleId: 'emp-wh',
          next: 'Складу внести принятое количество',
          entityType: 'order',
          entityId: order.id,
          linkType: 'order',
        })
      }
    }
  }
  for (const obligation of selectObligations(data, { enterpriseId, overdue: true })) {
    const order = obligationOrder(data, obligation)!
    rows.push({
      id: `debt-${obligation.id}`,
      type: 'Клиент просрочил оплату',
      objectLabel: `${clientName(data, order.clientId)} · ${obligation.docNumber}`,
      reason: `Остаток ${formatMoney(remainderOf(data, obligation))}, срок ${formatDate(obligation.dueDate)}`,
      due: obligation.dueDate || DEMO_DATE,
      responsibleId: order.managerId,
      next: 'Разобрать обязательство и оплаты',
      entityType: 'order',
      entityId: order.id,
      linkType: 'order',
    })
  }
  for (const supply of selectSupplies(data, { enterpriseId, delayed: true })) {
    rows.push({
      id: `sup-${supply.id}`,
      type: 'Поставка сырья задержалась',
      objectLabel: `${supply.number} · ${supply.material}`,
      reason: supply.lastInfo,
      due: supply.plannedDate,
      responsibleId: supply.purchaserId,
      next: 'Обновить сведения или поручить поиск замены',
      entityType: 'supply',
      entityId: supply.id,
      linkType: 'supply',
    })
  }
  for (const appeal of selectAppeals(data, { enterpriseId, unprocessed: true })) {
    rows.push({
      id: `apl-${appeal.id}`,
      type: 'Обращение без результата',
      objectLabel: `${clientName(data, appeal.clientId)} · ${appeal.phone}`,
      reason: appeal.result ? appealStatus(appeal) : 'Содержательный результат не зафиксирован',
      due: DEMO_DATE,
      responsibleId: appeal.managerId,
      next: appeal.managerId ? 'Зафиксировать результат или поставить перезвон' : 'Назначить направление и менеджера',
      entityType: 'appeal',
      entityId: appeal.id,
      linkType: 'appeal',
    })
  }
  return rows
}

export function historyOf(data: AppData, entityType: string, entityId: string) {
  return data.history.filter((event) => event.entityType === entityType && event.entityId === entityId)
}

export function orderDelayReason(data: AppData, order: Order): string {
  if (!isOverdueShipment(data, order)) return 'Срок выдерживается'
  const job = orderJobs(data, order.id).find((item) => item.delayReason)
  if (job?.delayReason) return job.delayReason
  if (order.stage === 'ready_transfer') return 'Выпуск есть, приёмка склада не закрыта'
  if (order.stage === 'shipped_partial') return 'Часть количества ещё не отгружена'
  return 'Срок отгрузки прошёл, остаток не отгружен'
}

export function overdueDaysLabel(due: string | null): string {
  if (!due) return 'Срок не задан'
  const days = daysOverdue(due)
  if (!days) return 'Срок не наступил'
  return `${days} дн.`
}

export function canSeeRecipe(role: string): boolean {
  return role === 'director' || role === 'technologist'
}

export interface RecipeRow {
  component: string
  share: string
}

export function recipeFor(productName: string): { title: string; rows: RecipeRow[] } {
  const name = productName.toLowerCase()
  if (name.includes('эмаль') || name.includes('грунт')) {
    return {
      title: 'Рецептура эмали / грунтовки',
      rows: [
        { component: 'Лак-основа', share: '45%' },
        { component: 'Пигмент', share: '20%' },
        { component: 'Растворитель', share: '30%' },
        { component: 'Добавки', share: '5%' },
      ],
    }
  }
  if (name.includes('ведро') || name.includes('банка') || name.includes('канистра') || name.includes('контейнер')) {
    return {
      title: 'Состав тары',
      rows: [
        { component: 'Полимер или жесть', share: '92%' },
        { component: 'Крышка и ручка', share: '7%' },
        { component: 'Маркировка', share: '1%' },
      ],
    }
  }
  return {
    title: 'Рецептура водно-дисперсионной краски',
    rows: [
      { component: 'Вода подготовленная', share: '35%' },
      { component: 'Дисперсия', share: '40%' },
      { component: 'Пигмент', share: '18%' },
      { component: 'Добавки', share: '7%' },
    ],
  }
}

export function linkLabel(data: AppData, type: Task['linkType'], id: string | null): string {
  if (!type || !id) return 'Без связанного объекта'
  if (type === 'order') {
    const order = byId(data.orders, id)
    return order ? `Заказ ${order.number}` : 'Заказ'
  }
  if (type === 'appeal') {
    const appeal = byId(data.appeals, id)
    return appeal ? `Обращение ${appeal.phone}` : 'Обращение'
  }
  const supply = byId(data.supplies, id)
  return supply ? `Поставка ${supply.number}` : 'Поставка'
}

export function unassignedAppeals(data: AppData): Appeal[] {
  return data.appeals.filter((appeal) => !appeal.enterpriseId && !isAppealProcessed(appeal))
}
