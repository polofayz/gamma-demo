import type {
  AcceptFlag,
  AppealResult,
  CallStatus,
  CallWay,
  JobState,
  Origin,
  Role,
  Stage,
  SupplyStage,
  TaskState,
} from './types'

export const ROLE_LABEL: Record<Role, string> = {
  director: 'Директор',
  rop: 'РОП',
  manager: 'Менеджер',
  technologist: 'Технолог',
  production_head: 'Начальник производства',
  warehouse: 'Сотрудник склада',
  accountant: 'Бухгалтер',
  purchaser: 'Снабженец',
}

export const STAGE_LABEL: Record<Stage, string> = {
  new: 'Новый',
  rop: 'Согласование РОП',
  technologist: 'Проверка технолога',
  job_prep: 'Подготовка производственного задания',
  production: 'Производство',
  ready_transfer: 'Готово к передаче',
  warehouse: 'Принято на склад ГП',
  shipped_partial: 'Частично отгружено',
  shipped_full: 'Полностью отгружено',
}

export const STAGE_NEED: Record<Stage, string> = {
  new: 'Уточнить заказ и отправить его на согласование РОП',
  rop: 'Согласовать заказ или вернуть на корректировку',
  technologist: 'Проверить заказ и условную рецептуру',
  job_prep: 'Начать производственное задание',
  production: 'Зафиксировать выпуск по бумажному наряду',
  ready_transfer: 'Складу подтвердить принятое количество',
  warehouse: 'Отгрузить принятое количество',
  shipped_partial: 'Отгрузить остаток или зафиксировать изменение срока',
  shipped_full: 'Отгрузка завершена',
}

export const FLOW: Stage[] = [
  'new',
  'rop',
  'technologist',
  'job_prep',
  'production',
  'ready_transfer',
  'warehouse',
  'shipped_partial',
]

export const JOB_LABEL: Record<JobState, string> = {
  waiting: 'Ожидает начала',
  in_progress: 'В работе',
  paused: 'Приостановлено',
  done: 'Выполнено',
}

export const ACCEPT_LABEL: Record<AcceptFlag, string> = {
  none: 'Не принято',
  partial: 'Принято частично',
  full: 'Принято полностью',
}

export const TASK_LABEL: Record<TaskState, string> = {
  new: 'Новая',
  in_progress: 'В работе',
  submitted: 'Выполнена сотрудником',
  confirmed: 'Подтверждена постановщиком',
  returned: 'Возвращена на доработку',
}

export const RESULT_LABEL: Record<AppealResult, string> = {
  contacted: 'Удалось связаться',
  no_answer: 'Не ответил',
  resolved: 'Вопрос решён',
  continue: 'Требуется продолжение',
}

export const SUPPLY_LABEL: Record<SupplyStage, string> = {
  ordered: 'Заказано',
  awaiting_dispatch: 'Ожидает отправки',
  in_transit: 'В пути',
  clearance: 'На оформлении',
  partial: 'Получено частично',
  received: 'Получено полностью',
}

export const ORIGIN_LABEL: Record<Origin, string> = {
  local: 'Местная',
  import: 'Импортная',
}

export const CALL_WAY: Record<CallWay, string> = {
  in: 'Входящий',
  out: 'Исходящий',
}

export const CALL_STATUS: Record<CallStatus, string> = {
  answered: 'Принятый',
  missed: 'Пропущенный',
}

export function toneForStage(stage: Stage): 'green' | 'amber' | 'neutral' {
  if (stage === 'shipped_full') return 'green'
  if (stage === 'new' || stage === 'rop' || stage === 'technologist' || stage === 'ready_transfer') return 'amber'
  return 'neutral'
}

export function toneForJob(state: JobState): 'green' | 'amber' | 'neutral' {
  if (state === 'done') return 'green'
  if (state === 'paused' || state === 'waiting') return 'amber'
  return 'neutral'
}

export function toneForTask(state: TaskState): 'green' | 'amber' | 'neutral' {
  if (state === 'confirmed') return 'green'
  if (state === 'submitted' || state === 'returned' || state === 'new') return 'amber'
  return 'neutral'
}
