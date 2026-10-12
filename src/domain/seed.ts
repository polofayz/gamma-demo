import type {
  AppData,
  Appeal,
  Client,
  Direction,
  Employee,
  Enterprise,
  HistoryEvent,
  Job,
  Obligation,
  Order,
  OrderLine,
  Payment,
  PhoneCall,
  ProdEvent,
  Receipt,
  Shipment,
  Supply,
  SupplyEvent,
  Task,
  Workshop,
} from './types'
import { STORAGE_VERSION } from './types'

const enterprises: Enterprise[] = [
  { id: 'ent-paint', name: 'Завод красок (условно)' },
  { id: 'ent-pack', name: 'Завод тары (условно)' },
]

const directions: Direction[] = [
  { id: 'dir-b2b', name: 'B2B', ropId: 'emp-rop-b2b' },
  { id: 'dir-gov', name: 'Государственные контракты', ropId: 'emp-rop-gov' },
  { id: 'dir-raw', name: 'Сырьё и материалы', ropId: 'emp-rop-raw' },
]

const employees: Employee[] = [
  { id: 'emp-dir', name: 'Директор', shortName: 'Директор', role: 'director', title: 'Директор' },
  { id: 'emp-rop-b2b', name: 'Алиев Р.', shortName: 'Алиев Р.', role: 'rop', title: 'РОП B2B' },
  { id: 'emp-rop-gov', name: 'Каримова Н.', shortName: 'Каримова Н.', role: 'rop', title: 'РОП госконтрактов' },
  { id: 'emp-rop-raw', name: 'Юсупов Д.', shortName: 'Юсупов Д.', role: 'rop', title: 'РОП сырья и материалов' },
  { id: 'emp-mgr-b2b', name: 'Ташпулатов А.', shortName: 'Ташпулатов А.', role: 'manager', title: 'Менеджер B2B' },
  { id: 'emp-mgr-gov', name: 'Ибрагимова С.', shortName: 'Ибрагимова С.', role: 'manager', title: 'Менеджер госконтрактов' },
  { id: 'emp-mgr-raw', name: 'Хасанов Б.', shortName: 'Хасанов Б.', role: 'manager', title: 'Менеджер сырья' },
  { id: 'emp-tech', name: 'Рахимов О.', shortName: 'Рахимов О.', role: 'technologist', title: 'Технолог' },
  { id: 'emp-prod', name: 'Сафаров К.', shortName: 'Сафаров К.', role: 'production_head', title: 'Начальник производства' },
  { id: 'emp-ws1', name: 'Холматов У.', shortName: 'Холматов У.', role: 'production_head', title: 'Мастер цеха №1' },
  { id: 'emp-ws2', name: 'Эргашев Ф.', shortName: 'Эргашев Ф.', role: 'production_head', title: 'Мастер цеха №2' },
  { id: 'emp-ws3', name: 'Каюмов И.', shortName: 'Каюмов И.', role: 'production_head', title: 'Мастер цеха №3' },
  { id: 'emp-wh', name: 'Мирзаев Ж.', shortName: 'Мирзаев Ж.', role: 'warehouse', title: 'Склад ГП' },
  { id: 'emp-acc', name: 'Назарова Л.', shortName: 'Назарова Л.', role: 'accountant', title: 'Бухгалтер' },
  { id: 'emp-buy', name: 'Абдуллаев Ш.', shortName: 'Абдуллаев Ш.', role: 'purchaser', title: 'Снабженец (импорт)' },
  { id: 'emp-buy2', name: 'Турсунов Э.', shortName: 'Турсунов Э.', role: 'purchaser', title: 'Снабженец (местные закупки)' },
]

const clients: Client[] = [
  { id: 'cl-1', name: 'ООО «СтройМонтаж» (демо)' },
  { id: 'cl-2', name: 'ГУП «Дорстрой» (демо)' },
  { id: 'cl-3', name: 'ООО «Фасад Сервис» (демо)' },
  { id: 'cl-4', name: 'ООО «АгроПак» (демо)' },
  { id: 'cl-5', name: 'ЧП «КраскиОпт» (демо)' },
  { id: 'cl-6', name: 'ГУ «Водоканал» (демо)' },
]

const workshops: Workshop[] = [
  { id: 'ws-1', name: 'Цех №1 · водно-дисперсионные краски', enterpriseId: 'ent-paint' },
  { id: 'ws-2', name: 'Цех №2 · эмали и грунтовки', enterpriseId: 'ent-paint' },
  { id: 'ws-3', name: 'Цех №3 · тара', enterpriseId: 'ent-pack' },
]

type OrderSeed = Omit<Order, 'originalShipDue' | 'shipDueChangeReason' | 'lastCompletedStage' | 'returnReason' | 'returnedFrom' | 'recipeChecked'> &
  Partial<Pick<Order, 'lastCompletedStage' | 'recipeChecked'>>

function order(seed: OrderSeed): Order {
  return {
    originalShipDue: seed.shipDue,
    shipDueChangeReason: null,
    lastCompletedStage: null,
    returnReason: null,
    returnedFrom: null,
    recipeChecked: false,
    ...seed,
  }
}

const orders: Order[] = [
  order({
    id: 'ord-1', number: 'З-101', contractNumber: 'Д-101', clientId: 'cl-1', directionId: 'dir-b2b', enterpriseId: 'ent-paint',
    managerId: 'emp-mgr-b2b', stage: 'technologist', stageResponsibleId: 'emp-tech', stageDue: '2026-10-10',
    stageEnteredAt: '2026-10-08', createdAt: '2026-10-06', shipDue: '2026-10-20', preferredWorkshopId: 'ws-1', lastCompletedStage: 'rop',
  }),
  order({
    id: 'ord-2', number: 'З-102', contractNumber: 'Д-ГК-17', clientId: 'cl-2', directionId: 'dir-gov', enterpriseId: 'ent-paint',
    managerId: 'emp-mgr-gov', stage: 'production', stageResponsibleId: 'emp-prod', stageDue: '2026-10-06',
    stageEnteredAt: '2026-09-30', createdAt: '2026-09-18', shipDue: '2026-10-08', preferredWorkshopId: 'ws-2',
    lastCompletedStage: 'job_prep', recipeChecked: true,
  }),
  order({
    id: 'ord-3', number: 'З-103', contractNumber: 'Д-103', clientId: 'cl-3', directionId: 'dir-b2b', enterpriseId: 'ent-paint',
    managerId: 'emp-mgr-b2b', stage: 'ready_transfer', stageResponsibleId: 'emp-wh', stageDue: '2026-10-10',
    stageEnteredAt: '2026-10-09', createdAt: '2026-09-25', shipDue: '2026-10-14', preferredWorkshopId: 'ws-2',
    lastCompletedStage: 'production', recipeChecked: true,
  }),
  order({
    id: 'ord-4', number: 'З-104', contractNumber: 'Д-ГК-09', clientId: 'cl-6', directionId: 'dir-gov', enterpriseId: 'ent-paint',
    managerId: 'emp-mgr-gov', stage: 'shipped_partial', stageResponsibleId: 'emp-wh', stageDue: '2026-10-05',
    stageEnteredAt: '2026-10-04', createdAt: '2026-09-05', shipDue: '2026-10-05', preferredWorkshopId: 'ws-1',
    lastCompletedStage: 'warehouse', recipeChecked: true,
  }),
  order({
    id: 'ord-5', number: 'З-105', contractNumber: 'Д-105', clientId: 'cl-4', directionId: 'dir-b2b', enterpriseId: 'ent-pack',
    managerId: 'emp-mgr-b2b', stage: 'rop', stageResponsibleId: 'emp-rop-b2b', stageDue: '2026-10-13',
    stageEnteredAt: '2026-10-11', createdAt: '2026-10-11', shipDue: '2026-10-25', preferredWorkshopId: 'ws-3', lastCompletedStage: 'new',
  }),
  order({
    id: 'ord-6', number: 'З-106', contractNumber: 'Д-106', clientId: 'cl-5', directionId: 'dir-raw', enterpriseId: 'ent-paint',
    managerId: 'emp-mgr-raw', stage: 'shipped_full', stageResponsibleId: 'emp-wh', stageDue: '2026-09-28',
    stageEnteredAt: '2026-09-27', createdAt: '2026-09-10', shipDue: '2026-09-28', preferredWorkshopId: 'ws-1',
    lastCompletedStage: 'shipped_full', recipeChecked: true,
  }),
  order({
    id: 'ord-7', number: 'З-107', contractNumber: 'Д-ГК-21', clientId: 'cl-6', directionId: 'dir-gov', enterpriseId: 'ent-pack',
    managerId: 'emp-mgr-gov', stage: 'production', stageResponsibleId: 'emp-prod', stageDue: '2026-10-18',
    stageEnteredAt: '2026-10-08', createdAt: '2026-10-01', shipDue: '2026-10-22', preferredWorkshopId: 'ws-3',
    lastCompletedStage: 'job_prep', recipeChecked: true,
  }),
  order({
    id: 'ord-8', number: 'З-108', contractNumber: 'Д-108', clientId: 'cl-1', directionId: 'dir-b2b', enterpriseId: 'ent-paint',
    managerId: 'emp-mgr-b2b', stage: 'warehouse', stageResponsibleId: 'emp-wh', stageDue: '2026-10-15',
    stageEnteredAt: '2026-10-10', createdAt: '2026-09-28', shipDue: '2026-10-15', preferredWorkshopId: 'ws-1',
    lastCompletedStage: 'ready_transfer', recipeChecked: true,
  }),
  order({
    id: 'ord-9', number: 'З-109', contractNumber: 'Д-109', clientId: 'cl-5', directionId: 'dir-raw', enterpriseId: 'ent-pack',
    managerId: 'emp-mgr-raw', stage: 'new', stageResponsibleId: 'emp-mgr-raw', stageDue: '2026-10-14',
    stageEnteredAt: '2026-10-12', createdAt: '2026-10-12', shipDue: '2026-10-30', preferredWorkshopId: 'ws-3',
  }),
  order({
    id: 'ord-10', number: 'З-110', contractNumber: 'Д-110', clientId: 'cl-3', directionId: 'dir-b2b', enterpriseId: 'ent-paint',
    managerId: 'emp-mgr-b2b', stage: 'job_prep', stageResponsibleId: 'emp-prod', stageDue: '2026-10-13',
    stageEnteredAt: '2026-10-11', createdAt: '2026-10-03', shipDue: '2026-10-18', preferredWorkshopId: 'ws-2',
    lastCompletedStage: 'technologist', recipeChecked: true,
  }),
]

const lines: OrderLine[] = [
  { id: 'line-1', orderId: 'ord-1', name: 'Краска ВД интерьерная белая', qty: 2000, unit: 'кг', price: 18_000 },
  { id: 'line-2', orderId: 'ord-2', name: 'Эмаль ПФ-115 серая', qty: 3000, unit: 'кг', price: 25_000 },
  { id: 'line-3', orderId: 'ord-3', name: 'Грунтовка ГФ-021 красно-коричневая', qty: 1500, unit: 'кг', price: 21_000 },
  { id: 'line-4', orderId: 'ord-4', name: 'Краска ВД фасадная', qty: 4000, unit: 'кг', price: 16_000 },
  { id: 'line-5', orderId: 'ord-5', name: 'Ведро пластиковое 10 л с крышкой', qty: 5000, unit: 'шт', price: 9_500 },
  { id: 'line-6a', orderId: 'ord-6', name: 'Растворитель Р-4, фасовка', qty: 1000, unit: 'л', price: 22_000 },
  { id: 'line-6b', orderId: 'ord-6', name: 'Пигментная паста жёлтая', qty: 200, unit: 'кг', price: 45_000 },
  { id: 'line-7', orderId: 'ord-7', name: 'Канистра 20 л', qty: 3000, unit: 'шт', price: 14_000 },
  { id: 'line-8', orderId: 'ord-8', name: 'Краска ВД для потолков', qty: 800, unit: 'кг', price: 18_000 },
  { id: 'line-9', orderId: 'ord-9', name: 'Банка жестяная 3 л', qty: 10_000, unit: 'шт', price: 3_200 },
  { id: 'line-10', orderId: 'ord-10', name: 'Эмаль ПФ-115 белая', qty: 1200, unit: 'кг', price: 25_000 },
]

const obligations: Obligation[] = [
  { id: 'obl-1', orderId: 'ord-4', docNumber: 'СФ-0412', amount: 64_000_000, dueDate: '2026-09-30' },
  { id: 'obl-2', orderId: 'ord-6', docNumber: 'СФ-0398', amount: 31_000_000, dueDate: '2026-10-01' },
  { id: 'obl-3', orderId: 'ord-8', docNumber: 'СФ-0420', amount: 14_400_000, dueDate: '2026-10-25' },
  { id: 'obl-4', orderId: 'ord-2', docNumber: 'Д-ГК-17 · аванс', amount: 30_000_000, dueDate: null },
  { id: 'obl-5', orderId: 'ord-7', docNumber: 'СФ-0415', amount: 42_000_000, dueDate: '2026-10-10' },
  { id: 'obl-6', orderId: 'ord-3', docNumber: 'СФ-0409', amount: 31_500_000, dueDate: '2026-10-10' },
]

const payments: Payment[] = [
  { id: 'pay-1', obligationId: 'obl-1', date: '2026-09-20', amount: 30_000_000, docNumber: 'ПП-311' },
  { id: 'pay-2', obligationId: 'obl-2', date: '2026-09-29', amount: 12_000_000, docNumber: 'ПП-298' },
  { id: 'pay-3', obligationId: 'obl-5', date: '2026-09-15', amount: 20_000_000, docNumber: 'ПП-275' },
  { id: 'pay-4', obligationId: 'obl-5', date: '2026-10-02', amount: 22_000_000, docNumber: 'ПП-305' },
]

const jobs: Job[] = [
  { id: 'job-2', orderId: 'ord-2', lineId: 'line-2', workshopId: 'ws-2', responsibleId: 'emp-ws2', plannedQty: 3000, unit: 'кг', due: '2026-10-06', state: 'paused', delayReason: 'Нет ксилола: импортная поставка ПС-201 задержана' },
  { id: 'job-3', orderId: 'ord-3', lineId: 'line-3', workshopId: 'ws-2', responsibleId: 'emp-ws2', plannedQty: 1500, unit: 'кг', due: '2026-10-09', state: 'done', delayReason: null },
  { id: 'job-4', orderId: 'ord-4', lineId: 'line-4', workshopId: 'ws-1', responsibleId: 'emp-ws1', plannedQty: 4000, unit: 'кг', due: '2026-10-03', state: 'done', delayReason: null },
  { id: 'job-6a', orderId: 'ord-6', lineId: 'line-6a', workshopId: 'ws-1', responsibleId: 'emp-ws1', plannedQty: 1000, unit: 'л', due: '2026-09-25', state: 'done', delayReason: null },
  { id: 'job-6b', orderId: 'ord-6', lineId: 'line-6b', workshopId: 'ws-1', responsibleId: 'emp-ws1', plannedQty: 200, unit: 'кг', due: '2026-09-25', state: 'done', delayReason: null },
  { id: 'job-7', orderId: 'ord-7', lineId: 'line-7', workshopId: 'ws-3', responsibleId: 'emp-ws3', plannedQty: 3000, unit: 'шт', due: '2026-10-18', state: 'in_progress', delayReason: null },
  { id: 'job-8', orderId: 'ord-8', lineId: 'line-8', workshopId: 'ws-1', responsibleId: 'emp-ws1', plannedQty: 800, unit: 'кг', due: '2026-10-09', state: 'done', delayReason: null },
  { id: 'job-10', orderId: 'ord-10', lineId: 'line-10', workshopId: 'ws-2', responsibleId: 'emp-ws2', plannedQty: 1200, unit: 'кг', due: '2026-10-16', state: 'waiting', delayReason: null },
]

function prod(id: string, jobId: string, type: ProdEvent['type'], at: string, qty: number, unit: ProdEvent['unit'], employeeId: string, paperDoc: string, comment = ''): ProdEvent {
  return { id, jobId, type, at, qty, unit, employeeId, signedBy: '', comment, paperDoc, attachment: null }
}

const prodEvents: ProdEvent[] = [
  prod('pe-1', 'job-2', 'start', '2026-09-30T08:10', 0, 'кг', 'emp-ws2', 'Н-2-0412'),
  prod('pe-2', 'job-2', 'output', '2026-10-03T17:40', 1200, 'кг', 'emp-ws2', 'Н-2-0412', 'Первая партия'),
  prod('pe-3', 'job-2', 'pause', '2026-10-04T09:00', 0, 'кг', 'emp-ws2', 'Н-2-0412', 'Закончился ксилол'),
  prod('pe-4', 'job-3', 'start', '2026-10-06T08:00', 0, 'кг', 'emp-ws2', 'Н-2-0418'),
  prod('pe-5', 'job-3', 'output', '2026-10-08T17:30', 900, 'кг', 'emp-ws2', 'Н-2-0418'),
  prod('pe-6', 'job-3', 'output', '2026-10-09T16:50', 600, 'кг', 'emp-ws2', 'Н-2-0418', 'Задание выполнено'),
  prod('pe-7', 'job-4', 'start', '2026-09-26T08:00', 0, 'кг', 'emp-ws1', 'Н-1-0390'),
  prod('pe-8', 'job-4', 'output', '2026-10-02T18:00', 4000, 'кг', 'emp-ws1', 'Н-1-0390'),
  prod('pe-9', 'job-6a', 'output', '2026-09-24T15:00', 1000, 'л', 'emp-ws1', 'Н-1-0371'),
  prod('pe-10', 'job-6b', 'output', '2026-09-24T16:00', 200, 'кг', 'emp-ws1', 'Н-1-0372'),
  prod('pe-11', 'job-7', 'start', '2026-10-08T08:00', 0, 'шт', 'emp-ws3', 'Н-3-0120'),
  prod('pe-12', 'job-7', 'output', '2026-10-10T18:00', 1200, 'шт', 'emp-ws3', 'Н-3-0120'),
  prod('pe-13', 'job-8', 'output', '2026-10-09T17:00', 800, 'кг', 'emp-ws1', 'Н-1-0405'),
]

const receipts: Receipt[] = [
  { id: 'rc-1', jobId: 'job-2', at: '2026-10-04T10:00', qty: 1200, unit: 'кг', employeeId: 'emp-wh', comment: '', docNumber: 'ПР-0331' },
  { id: 'rc-2', jobId: 'job-4', at: '2026-10-03T09:30', qty: 4000, unit: 'кг', employeeId: 'emp-wh', comment: '', docNumber: 'ПР-0326' },
  { id: 'rc-3', jobId: 'job-6a', at: '2026-09-25T09:00', qty: 1000, unit: 'л', employeeId: 'emp-wh', comment: '', docNumber: 'ПР-0301' },
  { id: 'rc-4', jobId: 'job-6b', at: '2026-09-25T09:10', qty: 200, unit: 'кг', employeeId: 'emp-wh', comment: '', docNumber: 'ПР-0302' },
  { id: 'rc-5', jobId: 'job-7', at: '2026-10-11T09:00', qty: 1200, unit: 'шт', employeeId: 'emp-wh', comment: '', docNumber: 'ПР-0340' },
  { id: 'rc-6', jobId: 'job-8', at: '2026-10-10T09:20', qty: 800, unit: 'кг', employeeId: 'emp-wh', comment: '', docNumber: 'ПР-0338' },
]

const shipments: Shipment[] = [
  { id: 'sh-1', orderId: 'ord-4', lineId: 'line-4', at: '2026-10-04T11:00', qty: 2500, unit: 'кг', docNumber: 'ТТН-1181', employeeId: 'emp-wh' },
  { id: 'sh-2', orderId: 'ord-6', lineId: 'line-6a', at: '2026-09-27T10:00', qty: 1000, unit: 'л', docNumber: 'ТТН-1150', employeeId: 'emp-wh' },
  { id: 'sh-3', orderId: 'ord-6', lineId: 'line-6b', at: '2026-09-27T10:00', qty: 200, unit: 'кг', docNumber: 'ТТН-1150', employeeId: 'emp-wh' },
]

const appeals: Appeal[] = [
  { id: 'apl-1', clientId: 'cl-1', phone: '+998 90 111-22-33', enterpriseId: 'ent-paint', directionId: 'dir-b2b', managerId: 'emp-mgr-b2b', result: 'resolved', resultNote: 'Запрос оформлен заказом З-101', nextAction: '', orderId: 'ord-1' },
  { id: 'apl-2', clientId: null, phone: '+998 93 555-10-20', enterpriseId: null, directionId: null, managerId: null, result: null, resultNote: '', nextAction: 'Назначить направление и менеджера', orderId: null },
  { id: 'apl-3', clientId: 'cl-5', phone: '+998 97 700-80-90', enterpriseId: 'ent-paint', directionId: 'dir-raw', managerId: 'emp-mgr-raw', result: 'no_answer', resultNote: 'Обещали перезвонить по цене пигмента, клиент не ответил', nextAction: 'Перезвонить 12.10 до 12:00', orderId: null },
  { id: 'apl-4', clientId: 'cl-6', phone: '+998 71 200-30-40', enterpriseId: 'ent-pack', directionId: 'dir-gov', managerId: 'emp-mgr-gov', result: 'contacted', resultNote: 'Согласовали график приёмки канистр', nextAction: '', orderId: 'ord-7' },
  { id: 'apl-5', clientId: 'cl-4', phone: '+998 99 321-45-67', enterpriseId: 'ent-pack', directionId: 'dir-b2b', managerId: 'emp-mgr-b2b', result: null, resultNote: '', nextAction: 'Подготовить расчёт на вёдра 20 л', orderId: null },
]

const calls: PhoneCall[] = [
  { id: 'call-1', at: '2026-10-01T10:15', way: 'in', phone: '+998 90 111-22-33', status: 'answered', employeeId: 'emp-mgr-b2b', durationSec: 240, appealId: 'apl-1' },
  { id: 'call-2', at: '2026-10-02T11:00', way: 'out', phone: '+998 90 111-22-33', status: 'answered', employeeId: 'emp-mgr-b2b', durationSec: 185, appealId: 'apl-1' },
  { id: 'call-3', at: '2026-10-11T09:12', way: 'in', phone: '+998 93 555-10-20', status: 'missed', employeeId: null, durationSec: 0, appealId: 'apl-2' },
  { id: 'call-4', at: '2026-10-11T09:40', way: 'in', phone: '+998 93 555-10-20', status: 'missed', employeeId: null, durationSec: 0, appealId: 'apl-2' },
  { id: 'call-5', at: '2026-10-12T08:55', way: 'in', phone: '+998 93 555-10-20', status: 'missed', employeeId: null, durationSec: 0, appealId: 'apl-2' },
  { id: 'call-6', at: '2026-10-10T14:20', way: 'in', phone: '+998 97 700-80-90', status: 'answered', employeeId: 'emp-mgr-raw', durationSec: 180, appealId: 'apl-3' },
  { id: 'call-7', at: '2026-10-11T15:05', way: 'out', phone: '+998 97 700-80-90', status: 'missed', employeeId: 'emp-mgr-raw', durationSec: 0, appealId: 'apl-3' },
  { id: 'call-8', at: '2026-10-07T10:30', way: 'in', phone: '+998 71 200-30-40', status: 'answered', employeeId: 'emp-mgr-gov', durationSec: 320, appealId: 'apl-4' },
  { id: 'call-9', at: '2026-10-08T12:10', way: 'out', phone: '+998 71 200-30-40', status: 'answered', employeeId: 'emp-mgr-gov', durationSec: 140, appealId: 'apl-4' },
  { id: 'call-10', at: '2026-10-09T16:45', way: 'in', phone: '+998 99 321-45-67', status: 'missed', employeeId: null, durationSec: 0, appealId: 'apl-5' },
  { id: 'call-11', at: '2026-10-12T09:30', way: 'in', phone: '+998 99 321-45-67', status: 'answered', employeeId: 'emp-mgr-b2b', durationSec: 300, appealId: 'apl-5' },
]

const supplies: Supply[] = [
  {
    id: 'sup-1', number: 'ПС-201', material: 'Ксилол', supplier: 'Gulf Chem Trading (условно)', purchaserId: 'emp-buy', origin: 'import',
    qty: 20_000, unit: 'кг', receivedQty: 0, originalPlannedDate: '2026-09-20', plannedDate: '2026-10-05', stage: 'in_transit',
    location: 'Порт Шарджа, ожидание парома', lastInfo: 'Контейнер повторно выгружен с парома, новая дата отправки не подтверждена',
    jobIds: ['job-2', 'job-10'], riskComment: 'Без ксилола цех №2 не может продолжить эмали. Прогноз остановки не рассчитывается: в каркасе нет остатков и норм расхода.',
  },
  {
    id: 'sup-2', number: 'ПС-202', material: 'Диоксид титана (пигмент)', supplier: 'Shandong Pigment Co. (условно)', purchaserId: 'emp-buy', origin: 'import',
    qty: 5000, unit: 'кг', receivedQty: 2000, originalPlannedDate: '2026-10-08', plannedDate: '2026-10-08', stage: 'partial',
    location: 'Остаток на таможенном складе', lastInfo: 'Получено 2 000 кг, остаток ждёт оформления',
    jobIds: ['job-10'], riskComment: 'Остаток нужен для эмали белой по заказу З-110.',
  },
  {
    id: 'sup-3', number: 'ПС-203', material: 'Ксилол', supplier: 'ООО «ТашХим» (условно)', purchaserId: 'emp-buy2', origin: 'local',
    qty: 5000, unit: 'кг', receivedQty: 0, originalPlannedDate: '2026-10-16', plannedDate: '2026-10-16', stage: 'ordered',
    location: 'Склад поставщика, Ташкент', lastInfo: 'Местная альтернатива: счёт выставлен, ждём подтверждения отгрузки',
    jobIds: ['job-2'], riskComment: 'Частично закрывает потребность, пока импортная поставка ПС-201 в пути.',
  },
  {
    id: 'sup-4', number: 'ПС-204', material: 'Гранулы ПЭНД', supplier: 'ООО «ПолимерСнаб» (условно)', purchaserId: 'emp-buy2', origin: 'local',
    qty: 8000, unit: 'кг', receivedQty: 8000, originalPlannedDate: '2026-10-03', plannedDate: '2026-10-03', stage: 'received',
    location: 'Склад сырья', lastInfo: 'Получено полностью',
    jobIds: ['job-7'], riskComment: '',
  },
  {
    id: 'sup-5', number: 'ПС-205', material: 'Сиккатив', supplier: 'Поставщик из РФ (условно)', purchaserId: 'emp-buy', origin: 'import',
    qty: 300, unit: 'кг', receivedQty: 0, originalPlannedDate: '2026-10-20', plannedDate: '2026-10-20', stage: 'awaiting_dispatch',
    location: 'Склад поставщика', lastInfo: 'Ожидает отправки',
    jobIds: ['job-10'], riskComment: '',
  },
]

const supplyEvents: SupplyEvent[] = [
  { id: 'se-1', supplyId: 'sup-1', at: '2026-09-01T10:00', authorId: 'emp-buy', note: 'Заказано 20 000 кг, плановое поступление 20.09.2026' },
  { id: 'se-2', supplyId: 'sup-1', at: '2026-09-18T12:00', authorId: 'emp-buy', note: 'Срок перенесён на 05.10.2026. Причина: контейнер выгружен с парома в Шардже' },
  { id: 'se-3', supplyId: 'sup-1', at: '2026-10-09T11:30', authorId: 'emp-buy', note: 'Контейнер повторно выгружен с парома, новая дата отправки не подтверждена' },
  { id: 'se-4', supplyId: 'sup-2', at: '2026-10-08T15:00', authorId: 'emp-buy', note: 'Получено частично: 2 000 кг' },
  { id: 'se-5', supplyId: 'sup-3', at: '2026-10-10T16:00', authorId: 'emp-buy2', note: 'Заказано у местного поставщика 5 000 кг' },
  { id: 'se-6', supplyId: 'sup-4', at: '2026-10-03T10:00', authorId: 'emp-buy2', note: 'Получено полностью' },
  { id: 'se-7', supplyId: 'sup-5', at: '2026-10-05T09:00', authorId: 'emp-buy', note: 'Заказано, ожидает отправки' },
]

const tasks: Task[] = [
  {
    id: 'task-1', number: 'П-1', title: 'Согласовать с заказчиком график отгрузки остатка по З-104', authorId: 'emp-dir', assigneeId: 'emp-rop-gov',
    directionId: 'dir-gov', linkType: 'order', linkId: 'ord-4', createdAt: '2026-10-05', due: '2026-10-09', state: 'in_progress',
    comment: 'Остаток 1 500 кг на складе, клиент не принимает машину', result: '', previousDue: null,
  },
  {
    id: 'task-2', number: 'П-2', title: 'Сверить оплаты по СФ-0412', authorId: 'emp-dir', assigneeId: 'emp-acc',
    directionId: 'dir-gov', linkType: 'order', linkId: 'ord-4', createdAt: '2026-10-06', due: '2026-10-11', state: 'submitted',
    comment: '', result: 'Поступила одна оплата 30 000 000 сум (ПП-311). Остаток 34 000 000 сум, акт сверки отправлен клиенту.', previousDue: null,
  },
  {
    id: 'task-3', number: 'П-3', title: 'Напомнить клиенту об оплате СФ-0409', authorId: 'emp-dir', assigneeId: 'emp-mgr-b2b',
    directionId: 'dir-b2b', linkType: 'order', linkId: 'ord-3', createdAt: '2026-10-11', due: '2026-10-14', state: 'new',
    comment: '', result: '', previousDue: null,
  },
  {
    id: 'task-4', number: 'П-4', title: 'Подготовить предложение по поставке канистр', authorId: 'emp-rop-gov', assigneeId: 'emp-mgr-gov',
    directionId: 'dir-gov', linkType: 'appeal', linkId: 'apl-4', createdAt: '2026-10-07', due: '2026-10-08', state: 'confirmed',
    comment: '', result: 'Предложение отправлено, клиент согласовал график', previousDue: null,
  },
  {
    id: 'task-5', number: 'П-5', title: 'Дать план выпуска по цеху №2 на неделю', authorId: 'emp-dir', assigneeId: 'emp-prod',
    directionId: null, linkType: 'order', linkId: 'ord-2', createdAt: '2026-10-05', due: '2026-10-13', state: 'returned',
    comment: 'Вернул: нет дат по каждому заказу', result: 'План: эмали после поступления ксилола', previousDue: '2026-10-09',
  },
  {
    id: 'task-6', number: 'П-6', title: 'Перезвонить по запросу пигмента', authorId: 'emp-rop-raw', assigneeId: 'emp-mgr-raw',
    directionId: 'dir-raw', linkType: 'appeal', linkId: 'apl-3', createdAt: '2026-10-11', due: '2026-10-12', state: 'in_progress',
    comment: '', result: '', previousDue: null,
  },
  {
    id: 'task-7', number: 'П-7', title: 'Обновить сведения по контейнеру в Шардже', authorId: 'emp-dir', assigneeId: 'emp-buy',
    directionId: null, linkType: 'supply', linkId: 'sup-1', createdAt: '2026-10-06', due: '2026-10-10', state: 'new',
    comment: 'Нужна дата отправки и альтернативный маршрут', result: '', previousDue: null,
  },
]

function h(id: string, at: string, authorId: string, entityType: HistoryEvent['entityType'], entityId: string, action: string, comment = ''): HistoryEvent {
  return { id, at, authorId, entityType, entityId, action, comment }
}

const history: HistoryEvent[] = [
  h('h-1', '2026-10-06T10:00', 'emp-mgr-b2b', 'order', 'ord-1', 'Заказ создан по обращению клиента'),
  h('h-2', '2026-10-07T09:00', 'emp-mgr-b2b', 'order', 'ord-1', 'Отправлен на согласование РОП'),
  h('h-3', '2026-10-08T11:20', 'emp-rop-b2b', 'order', 'ord-1', 'РОП согласовал заказ', 'Цена в рамках прайса'),
  h('h-4', '2026-09-18T10:00', 'emp-mgr-gov', 'order', 'ord-2', 'Заказ создан по госконтракту'),
  h('h-5', '2026-09-22T12:00', 'emp-tech', 'order', 'ord-2', 'Технолог подтвердил проверку'),
  h('h-6', '2026-09-30T08:10', 'emp-ws2', 'order', 'ord-2', 'Производство начато · цех №2', 'Бумажный наряд Н-2-0412'),
  h('h-7', '2026-10-03T17:40', 'emp-ws2', 'order', 'ord-2', 'Цех зафиксировал выпуск 1 200 кг', 'Бумажный наряд Н-2-0412'),
  h('h-8', '2026-10-04T09:00', 'emp-ws2', 'order', 'ord-2', 'Задание приостановлено', 'Нет ксилола: импортная поставка ПС-201 задержана'),
  h('h-9', '2026-10-04T10:00', 'emp-wh', 'order', 'ord-2', 'Склад принял 1 200 кг', 'ПР-0331'),
  h('h-10', '2026-10-09T16:50', 'emp-ws2', 'order', 'ord-3', 'Цех зафиксировал выпуск 1 500 кг · задание выполнено', 'Ожидается передача на склад'),
  h('h-11', '2026-10-03T09:30', 'emp-wh', 'order', 'ord-4', 'Склад принял 4 000 кг', 'ПР-0326'),
  h('h-12', '2026-10-04T11:00', 'emp-wh', 'order', 'ord-4', 'Частичная отгрузка 2 500 кг', 'ТТН-1181'),
  h('h-13', '2026-10-05T09:00', 'emp-dir', 'order', 'ord-4', 'Создано поручение П-1', 'Согласовать с заказчиком график отгрузки остатка по З-104'),
  h('h-14', '2026-10-11T15:00', 'emp-mgr-b2b', 'order', 'ord-5', 'Отправлен на согласование РОП'),
  h('h-15', '2026-09-27T10:00', 'emp-wh', 'order', 'ord-6', 'Полная отгрузка', 'ТТН-1150'),
  h('h-16', '2026-10-10T18:00', 'emp-ws3', 'order', 'ord-7', 'Цех зафиксировал выпуск 1 200 шт', 'Н-3-0120'),
  h('h-17', '2026-10-11T09:00', 'emp-wh', 'order', 'ord-7', 'Склад принял 1 200 шт', 'ПР-0340'),
  h('h-18', '2026-10-10T09:20', 'emp-wh', 'order', 'ord-8', 'Склад принял 800 кг', 'ПР-0338'),
  h('h-19', '2026-10-12T08:30', 'emp-mgr-raw', 'order', 'ord-9', 'Заказ создан'),
  h('h-20', '2026-10-11T10:00', 'emp-tech', 'order', 'ord-10', 'Технолог подтвердил проверку'),
  h('h-21', '2026-10-11T10:30', 'emp-prod', 'order', 'ord-10', 'Подготовлено производственное задание · цех №2'),
  h('h-22', '2026-10-12T08:55', 'emp-dir', 'appeal', 'apl-2', 'Три пропущенных входящих звонка с одного номера', 'Объединены в одно обращение'),
  h('h-23', '2026-10-11T15:05', 'emp-mgr-raw', 'appeal', 'apl-3', 'Результат: не ответил', 'Перезвонить 12.10 до 12:00'),
  h('h-24', '2026-10-12T09:35', 'emp-mgr-b2b', 'appeal', 'apl-5', 'Разговор состоялся, результат не зафиксирован'),
  h('h-25', '2026-10-01T10:20', 'emp-mgr-b2b', 'appeal', 'apl-1', 'Результат: вопрос решён', 'Создан заказ З-101'),
  h('h-26', '2026-10-08T12:15', 'emp-mgr-gov', 'appeal', 'apl-4', 'Результат: удалось связаться'),
  h('h-27', '2026-10-09T11:30', 'emp-buy', 'supply', 'sup-1', 'Обновлены сведения о поставке', 'Контейнер повторно выгружен с парома'),
  h('h-28', '2026-10-10T16:00', 'emp-buy2', 'supply', 'sup-3', 'Заказано у местного поставщика'),
  h('h-29', '2026-10-05T09:00', 'emp-dir', 'task', 'task-1', 'Поручение создано'),
  h('h-30', '2026-10-06T10:00', 'emp-rop-gov', 'task', 'task-1', 'Принято в работу'),
  h('h-31', '2026-10-06T10:30', 'emp-dir', 'task', 'task-2', 'Поручение создано'),
  h('h-32', '2026-10-11T17:00', 'emp-acc', 'task', 'task-2', 'Результат отправлен на проверку'),
  h('h-33', '2026-10-11T12:00', 'emp-dir', 'task', 'task-3', 'Поручение создано'),
  h('h-34', '2026-10-08T18:00', 'emp-rop-gov', 'task', 'task-4', 'Результат подтверждён постановщиком'),
  h('h-35', '2026-10-09T17:00', 'emp-prod', 'task', 'task-5', 'Результат отправлен на проверку'),
  h('h-36', '2026-10-10T09:00', 'emp-dir', 'task', 'task-5', 'Возвращено на доработку · новый срок 13.10.2026', 'Нет дат по каждому заказу'),
  h('h-37', '2026-10-11T12:30', 'emp-rop-raw', 'task', 'task-6', 'Поручение создано'),
  h('h-38', '2026-10-06T11:00', 'emp-dir', 'task', 'task-7', 'Поручение создано'),
]

export function createSeed(): AppData {
  const data: AppData = {
    version: STORAGE_VERSION,
    seq: 1000,
    ops: [],
    enterprises,
    directions,
    employees,
    clients,
    workshops,
    orders,
    lines,
    obligations,
    payments,
    jobs,
    prodEvents,
    receipts,
    shipments,
    calls,
    appeals,
    supplies,
    supplyEvents,
    tasks,
    history,
  }
  const copy = structuredClone(data)
  copy.history.sort((a, b) => b.at.localeCompare(a.at))
  copy.supplyEvents.sort((a, b) => b.at.localeCompare(a.at))
  return copy
}
