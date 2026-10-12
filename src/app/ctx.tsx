import { createContext, useContext } from 'react'
import type { Actor, AppData, Result, Role, Route, Task, UiState } from '../domain/types'

export interface TaskDraft {
  title?: string
  assigneeId?: string
  directionId?: string | null
  linkType?: Task['linkType']
  linkId?: string | null
}

export interface Ctx {
  data: AppData
  ui: UiState
  actor: Actor
  go: (route: Route) => void
  replace: (route: Route) => void
  back: () => void
  run: (fn: (data: AppData) => Result, success?: string) => string | null
  setRole: (role: Role) => void
  openTaskForm: (draft: TaskDraft) => void
  toast: (text: string) => void
}

export const AppCtx = createContext<Ctx | null>(null)

export function useApp(): Ctx {
  const ctx = useContext(AppCtx)
  if (!ctx) throw new Error('AppCtx missing')
  return ctx
}

export function canSeeMoney(role: Role): boolean {
  return role === 'director' || role === 'rop' || role === 'manager' || role === 'accountant'
}

export function newOpKey(): string {
  return `op-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`
}
