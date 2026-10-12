import * as A from '../src/domain/actions'
import { availableToShip, debtSum, decisions, kpis, orderBalances, remainderOf, selectObligations } from '../src/domain/calc'
import { createSeed } from '../src/domain/seed'
import type { Actor, AppData, Result, Role } from '../src/domain/types'
import { SEATS } from '../src/domain/types'

let data: AppData = createSeed()
let failures = 0
const as = (role: Role): Actor => ({ role, employeeId: SEATS[role] })

function ok(label: string, r: Result) {
  if (!r.ok) {
    failures++
    console.log(`✗ ${label}: ${r.error}`)
    return
  }
  data = r.data
  console.log(`✓ ${label}`)
}

function fails(label: string, r: Result) {
  if (r.ok) {
    failures++
    console.log(`✗ ${label}: ожидалась ошибка`)
    return
  }
  console.log(`✓ ${label} → «${r.error}»`)
}

function expect(label: string, cond: boolean) {
  if (!cond) failures++
  console.log(`${cond ? '✓' : '✗'} ${label}`)
}

const k0 = kpis(data, 'all')
console.log('Исходно:', {
  inWork: k0.inWork.length,
  overdueShip: k0.overdueShip.map((o) => o.number),
  debt: k0.debt,
  overdueDebt: k0.overdueDebt,
  unprocessed: k0.unprocessed.length,
  overdueTasks: k0.overdueTasks.map((t) => t.number),
  awaiting: k0.awaitingTasks.map((t) => t.number),
  delayed: k0.delayedSupplies.map((s) => s.number),
  decisions: decisions(data, 'all').length,
})
expect('Сводная сумма долга равна сумме открытого реестра', k0.debt === debtSum(data, selectObligations(data, { enterpriseId: 'all', openOnly: true })))
expect('Просроченный долг не больше общего', k0.overdueDebt <= k0.debt)
const byEnt = kpis(data, 'ent-paint').inWork.length + kpis(data, 'ent-pack').inWork.length
expect('Заказы в работе по предприятиям складываются в общий итог', byEnt === k0.inWork.length)

ok('Поручение директора по З-102', A.createTask(data, as('director'), { title: 'Дать дату возобновления', assigneeId: 'emp-prod', directionId: 'dir-gov', linkType: 'order', linkId: 'ord-2', due: '2026-10-13', comment: '', opKey: 'k1' }))
fails('Повтор того же нажатия не создаёт дубль', A.createTask(data, as('director'), { title: 'Дать дату возобновления', assigneeId: 'emp-prod', directionId: 'dir-gov', linkType: 'order', linkId: 'ord-2', due: '2026-10-13', comment: '', opKey: 'k1' }))
const t = data.tasks[0]
fails('Исполнитель не закрывает без результата', A.taskSubmit(data, as('production_head'), t.id, ''))
ok('Исполнитель принимает в работу', A.taskAccept(data, as('production_head'), t.id))
ok('Исполнитель отправляет результат', A.taskSubmit(data, as('production_head'), t.id, 'Возобновим после поступления ПС-203, ориентир 16.10'))
fails('Исполнитель не может подтвердить сам', A.taskConfirm(data, as('production_head'), t.id))
ok('Директор подтверждает', A.taskConfirm(data, as('director'), t.id))

fails('Менеджер не может подтвердить проверку технолога', A.techApprove(data, as('manager'), 'ord-1', ''))
ok('Технолог подтверждает З-101', A.techApprove(data, as('technologist'), 'ord-1', ''))
ok('Формирование задания', A.createJobs(data, as('production_head'), { orderId: 'ord-1', workshopId: 'ws-1', due: '2026-10-18', opKey: 'k2' }))
const job = data.jobs.find((j) => j.orderId === 'ord-1')!
ok('Начало производства', A.startJob(data, as('production_head'), job.id, 'k3'))
fails('Нельзя выпустить больше плана', A.recordOutput(data, as('production_head'), { jobId: job.id, at: '2026-10-12T16:00', qty: 2500, signedBy: 'Холматов У.', comment: '', paperDoc: 'Н-1-0430', attach: true, opKey: 'k4' }))
ok('Выпуск 2000 кг', A.recordOutput(data, as('production_head'), { jobId: job.id, at: '2026-10-12T16:00', qty: 2000, signedBy: 'Холматов У.', comment: '', paperDoc: 'Н-1-0430', attach: true, opKey: 'k5' }))
expect('Этап «Готово к передаче»', data.orders.find((o) => o.id === 'ord-1')!.stage === 'ready_transfer')
expect('Блок решений показывает выпуск без приёмки', decisions(data, 'all').some((d) => d.id === `wh-${job.id}`))
fails('Нельзя принять больше выпущенного', A.receiveToWarehouse(data, as('warehouse'), { jobId: job.id, qty: 2100, docNumber: 'ПР-1', comment: '', opKey: 'k6' }))
ok('Склад принимает 1950 кг', A.receiveToWarehouse(data, as('warehouse'), { jobId: job.id, qty: 1950, docNumber: 'ПР-1', comment: '', opKey: 'k7' }))
expect('Разница 50 кг остаётся видимой, этап не сменился', data.orders.find((o) => o.id === 'ord-1')!.stage === 'ready_transfer')
ok('Склад принимает оставшиеся 50 кг', A.receiveToWarehouse(data, as('warehouse'), { jobId: job.id, qty: 50, docNumber: 'ПР-2', comment: '', opKey: 'k8' }))
expect('Этап «Принято на склад ГП»', data.orders.find((o) => o.id === 'ord-1')!.stage === 'warehouse')
fails('Нельзя отгрузить больше принятого', A.ship(data, as('warehouse'), { orderId: 'ord-1', lineId: 'line-1', qty: 2001, docNumber: 'ТТН-1', opKey: 'k9' }))
ok('Частичная отгрузка 1200 кг', A.ship(data, as('warehouse'), { orderId: 'ord-1', lineId: 'line-1', qty: 1200, docNumber: 'ТТН-1', opKey: 'k10' }))
expect('Остаток 800 кг', orderBalances(data, 'ord-1')[0].left === 800 && availableToShip(data, 'line-1') === 800)
expect('Этап «Частично отгружено»', data.orders.find((o) => o.id === 'ord-1')!.stage === 'shipped_partial')

ok('Назначить обращение', A.appealAssign(data, as('director'), { appealId: 'apl-2', enterpriseId: 'ent-paint', directionId: 'dir-b2b', managerId: 'emp-mgr-b2b' }))
ok('Перезвон', A.appealCallback(data, as('director'), { appealId: 'apl-2', due: '2026-10-12', note: 'Уточнить объём', opKey: 'k11' }))
fails('«Не ответил» без следующего действия', A.appealResult(data, as('manager'), { appealId: 'apl-2', result: 'no_answer', note: 'Не взял трубку', nextAction: '' }))
ok('Результат: удалось связаться', A.appealResult(data, as('manager'), { appealId: 'apl-2', result: 'contacted', note: 'Нужна фасадная краска 500 кг', nextAction: '' }))

ok('Поручить поиск замены', A.createTask(data, as('director'), { title: 'Найти ксилол у местных', assigneeId: 'emp-buy2', directionId: null, linkType: 'supply', linkId: 'sup-1', due: '2026-10-14', comment: '', opKey: 'k12' }))
ok('Перенос даты поставки с причиной', A.supplyUpdate(data, as('purchaser'), { supplyId: 'sup-1', stage: 'in_transit', location: 'Паром', info: 'Отправлен', plannedDate: '2026-10-20', reason: 'Новая дата парома' }))
expect('Первоначальный срок сохранён', data.supplies.find((s) => s.id === 'sup-1')!.originalPlannedDate === '2026-09-20')

const obl = data.obligations.find((o) => o.id === 'obl-1')!
expect('Остаток СФ-0412 = 64 000 000 − 30 000 000', remainderOf(data, obl) === 34_000_000)

const k1 = kpis(data, 'all')
console.log('После сценария:', {
  inWork: k1.inWork.length,
  overdueShip: k1.overdueShip.map((o) => o.number),
  unprocessed: k1.unprocessed.length,
  delayed: k1.delayedSupplies.map((s) => s.number),
  decisions: decisions(data, 'all').length,
})
expect('Необработанных обращений стало меньше', k1.unprocessed.length === k0.unprocessed.length - 1)
expect('Перенос поставки убрал её из задержанных, история осталась', !k1.delayedSupplies.some((s) => s.id === 'sup-1'))

console.log(failures ? `\nОшибок: ${failures}` : '\nВсе проверки прошли')
process.exit(failures ? 1 : 0)
