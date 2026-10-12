import { createSeed } from '../domain/seed'
import type { AppData, UiState } from '../domain/types'
import { STORAGE_KEY, STORAGE_VERSION } from '../domain/types'

const UI_KEY = `${STORAGE_KEY}-ui`

export function loadData(): AppData {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (!raw) return createSeed()
    const parsed = JSON.parse(raw) as AppData
    if (parsed.version !== STORAGE_VERSION) return createSeed()
    return parsed
  } catch {
    return createSeed()
  }
}

export function saveData(data: AppData) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(data))
  } catch {
    /* localStorage недоступен: демонстрация работает без сохранения */
  }
}

export const DEFAULT_UI: UiState = {
  role: 'director',
  enterpriseId: 'all',
  route: { page: 'overview' },
  stack: [],
}

export function loadUi(): UiState {
  try {
    const raw = localStorage.getItem(UI_KEY)
    if (!raw) return DEFAULT_UI
    return { ...DEFAULT_UI, ...(JSON.parse(raw) as UiState) }
  } catch {
    return DEFAULT_UI
  }
}

export function saveUi(ui: UiState) {
  try {
    localStorage.setItem(UI_KEY, JSON.stringify(ui))
  } catch {
    /* см. saveData */
  }
}
