export const DEMO_DATE = '2026-10-12'
export const STORAGE_KEY = 'gamma-director-demo-v1'
export const STORAGE_VERSION = 3

export type Role =
  | 'director'
  | 'rop'
  | 'manager'
  | 'technologist'
  | 'production_head'
  | 'warehouse'
  | 'accountant'
  | 'purchaser'

export type Stage =
  | 'new'
  | 'rop'
  | 'technologist'
  | 'job_prep'
  | 'production'
  | 'ready_transfer'
  | 'warehouse'
  | 'shipped_partial'
  | 'shipped_full'

export type Unit = 'кг' | 'л' | 'шт'

export type JobState = 'waiting' | 'in_progress' | 'paused' | 'done'

export type AcceptFlag = 'none' | 'partial' | 'full'

export type TaskState = 'new' | 'in_progress' | 'submitted' | 'confirmed' | 'returned'

export type AppealResult = 'contacted' | 'no_answer' | 'resolved' | 'continue'

export type SupplyStage =
  | 'ordered'
  | 'awaiting_dispatch'
  | 'in_transit'
  | 'clearance'
  | 'partial'
  | 'received'

export type Origin = 'local' | 'import'

export type CallWay = 'in' | 'out'
export type CallStatus = 'answered' | 'missed'

export type EntityType = 'order' | 'appeal' | 'supply' | 'task' | 'job'

export type DirTab = 'orders' | 'debts' | 'appeals' | 'tasks'

export interface Enterprise {
  id: string
  name: string
}

export interface Direction {
  id: string
  name: string
  ropId: string
}

export interface Employee {
  id: string
  name: string
  shortName: string
  role: Role
  title: string
}

export interface Client {
  id: string
  name: string
}

export interface Workshop {
  id: string
  name: string
  enterpriseId: string
}

export interface OrderLine {
  id: string
  orderId: string
  name: string
  qty: number
  unit: Unit
  price: number
}

export interface Order {
  id: string
  number: string
  contractNumber: string
  clientId: string
  directionId: string
  enterpriseId: string
  managerId: string
  stage: Stage
  stageResponsibleId: string
  stageDue: string
  stageEnteredAt: string
  createdAt: string
  shipDue: string
  originalShipDue: string
  shipDueChangeReason: string | null
  lastCompletedStage: Stage | null
  returnReason: string | null
  returnedFrom: Stage | null
  preferredWorkshopId: string
  recipeChecked: boolean
}

export interface Obligation {
  id: string
  orderId: string
  docNumber: string
  amount: number
  dueDate: string | null
}

export interface Payment {
  id: string
  obligationId: string
  date: string
  amount: number
  docNumber: string
}

export interface Job {
  id: string
  orderId: string
  lineId: string
  workshopId: string
  responsibleId: string
  plannedQty: number
  unit: Unit
  due: string
  state: JobState
  delayReason: string | null
}

export interface ProdEvent {
  id: string
  jobId: string
  type: 'start' | 'output' | 'pause' | 'resume'
  at: string
  qty: number
  unit: Unit
  employeeId: string
  signedBy: string
  comment: string
  paperDoc: string
  attachment: string | null
}

export interface Receipt {
  id: string
  jobId: string
  at: string
  qty: number
  unit: Unit
  employeeId: string
  comment: string
  docNumber: string
}

export interface Shipment {
  id: string
  orderId: string
  lineId: string
  at: string
  qty: number
  unit: Unit
  docNumber: string
  employeeId: string
}

export interface PhoneCall {
  id: string
  at: string
  way: CallWay
  phone: string
  status: CallStatus
  employeeId: string | null
  durationSec: number
  appealId: string
}

export interface Appeal {
  id: string
  clientId: string | null
  phone: string
  enterpriseId: string | null
  directionId: string | null
  managerId: string | null
  result: AppealResult | null
  resultNote: string
  nextAction: string
  orderId: string | null
}

export interface Supply {
  id: string
  number: string
  material: string
  supplier: string
  purchaserId: string
  origin: Origin
  qty: number
  unit: Unit
  receivedQty: number
  originalPlannedDate: string
  plannedDate: string
  stage: SupplyStage
  location: string
  lastInfo: string
  jobIds: string[]
  riskComment: string
}

export interface SupplyEvent {
  id: string
  supplyId: string
  at: string
  authorId: string
  note: string
}

export interface Task {
  id: string
  number: string
  title: string
  authorId: string
  assigneeId: string
  directionId: string | null
  linkType: 'order' | 'appeal' | 'supply' | null
  linkId: string | null
  createdAt: string
  due: string
  state: TaskState
  comment: string
  result: string
  previousDue: string | null
}

export interface HistoryEvent {
  id: string
  at: string
  authorId: string
  action: string
  comment: string
  entityType: EntityType
  entityId: string
}

export interface AppData {
  version: number
  seq: number
  ops: string[]
  enterprises: Enterprise[]
  directions: Direction[]
  employees: Employee[]
  clients: Client[]
  workshops: Workshop[]
  orders: Order[]
  lines: OrderLine[]
  obligations: Obligation[]
  payments: Payment[]
  jobs: Job[]
  prodEvents: ProdEvent[]
  receipts: Receipt[]
  shipments: Shipment[]
  calls: PhoneCall[]
  appeals: Appeal[]
  supplies: Supply[]
  supplyEvents: SupplyEvent[]
  tasks: Task[]
  history: HistoryEvent[]
}

export type Route =
  | { page: 'overview' }
  | { page: 'directions' }
  | { page: 'direction'; directionId: string; tab: DirTab }
  | {
      page: 'orders'
      directionId?: string
      managerId?: string
      clientId?: string
      stage?: Stage
      inWork?: boolean
      overdueShip?: boolean
      q?: string
    }
  | { page: 'order'; orderId: string; anchor?: string }
  | { page: 'production'; workshopId?: string; state?: JobState }
  | {
      page: 'finance'
      tab: 'debts' | 'shipments'
      directionId?: string
      overdue?: boolean
      openOnly?: boolean
      clientId?: string
    }
  | {
      page: 'calls'
      directionId?: string
      focus?: 'incoming' | 'missed' | 'unprocessed' | 'processed'
    }
  | { page: 'appeal'; appealId: string }
  | { page: 'supplies'; delayed?: boolean; origin?: Origin }
  | { page: 'supply'; supplyId: string }
  | {
      page: 'tasks'
      directionId?: string
      focus?: 'overdue' | 'awaiting' | 'active' | 'done' | 'all'
      assigneeId?: string
    }
  | { page: 'task'; taskId: string }
  | { page: 'guide' }

export interface UiState {
  role: Role
  enterpriseId: string
  route: Route
  stack: Route[]
}

export interface Actor {
  role: Role
  employeeId: string
}

export type Result = { ok: true; data: AppData } | { ok: false; error: string }

export const SEATS: Record<Role, string> = {
  director: 'emp-dir',
  rop: 'emp-rop-b2b',
  manager: 'emp-mgr-b2b',
  technologist: 'emp-tech',
  production_head: 'emp-prod',
  warehouse: 'emp-wh',
  accountant: 'emp-acc',
  purchaser: 'emp-buy',
}
