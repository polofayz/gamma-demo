import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { AppCtx, type Ctx, type TaskDraft } from './app/ctx'
import { loadData, loadUi, saveData, saveUi } from './app/store'
import { kpis } from './domain/calc'
import { formatDate } from './domain/format'
import { ROLE_LABEL } from './domain/labels'
import { createSeed } from './domain/seed'
import type { AppData, Result, Role, Route, UiState } from './domain/types'
import { DEMO_DATE, SEATS } from './domain/types'
import { Modal } from './ui/kit'
import { TaskFormModal } from './ui/shared'
import { Overview } from './pages/Overview'
import { DirectionPage, DirectionsPage } from './pages/Directions'
import { OrdersPage } from './pages/Orders'
import { OrderPage } from './pages/OrderCard'
import { ProductionPage } from './pages/Production'
import { FinancePage } from './pages/Finance'
import { AppealPage, CallsPage } from './pages/Calls'
import { SuppliesPage, SupplyPage } from './pages/Supplies'
import { TaskPage, TasksPage } from './pages/Tasks'
import { GuidePage } from './pages/Guide'

type Section = Route['page']

const NAV: { id: Section; label: string; match: Section[]; route: Route }[] = [
  { id: 'overview', label: 'Обзор директора', match: ['overview'], route: { page: 'overview' } },
  { id: 'directions', label: 'Направления', match: ['directions', 'direction'], route: { page: 'directions' } },
  { id: 'orders', label: 'Заказы и контракты', match: ['orders', 'order'], route: { page: 'orders' } },
  { id: 'production', label: 'Производство', match: ['production'], route: { page: 'production' } },
  { id: 'finance', label: 'Долги и отгрузки', match: ['finance'], route: { page: 'finance', tab: 'debts' } },
  { id: 'calls', label: 'Звонки и обращения', match: ['calls', 'appeal'], route: { page: 'calls' } },
  { id: 'supplies', label: 'Поставки сырья', match: ['supplies', 'supply'], route: { page: 'supplies' } },
  { id: 'tasks', label: 'Поручения', match: ['tasks', 'task'], route: { page: 'tasks' } },
]

export function App() {
  const [data, setData] = useState<AppData>(loadData)
  const [ui, setUi] = useState<UiState>(loadUi)
  const [taskDraft, setTaskDraft] = useState<TaskDraft | null>(null)
  const [confirmReset, setConfirmReset] = useState(false)
  const [toastText, setToastText] = useState<string | null>(null)
  const [menuOpen, setMenuOpen] = useState(false)

  useEffect(() => saveData(data), [data])
  useEffect(() => saveUi(ui), [ui])
  useEffect(() => {
    window.scrollTo({ top: 0 })
    setMenuOpen(false)
  }, [ui.route])
  useEffect(() => {
    if (!toastText) return
    const t = setTimeout(() => setToastText(null), 2600)
    return () => clearTimeout(t)
  }, [toastText])

  const actor = useMemo(() => ({ role: ui.role, employeeId: SEATS[ui.role] }), [ui.role])

  const go = useCallback((route: Route) => setUi((s) => ({ ...s, route, stack: [...s.stack, s.route].slice(-30) })), [])
  const replace = useCallback((route: Route) => setUi((s) => ({ ...s, route })), [])
  const back = useCallback(
    () =>
      setUi((s) => {
        if (!s.stack.length) return { ...s, route: { page: 'overview' } }
        const stack = s.stack.slice(0, -1)
        return { ...s, route: s.stack[s.stack.length - 1], stack }
      }),
    [],
  )
  const setRole = useCallback((role: Role) => {
    setUi((s) => ({ ...s, role }))
    setToastText(`Демонстрационная роль: ${ROLE_LABEL[role]}`)
  }, [])

  const dataRef = useRef(data)
  dataRef.current = data
  const run = useCallback((fn: (d: AppData) => Result, success?: string) => {
    const result = fn(dataRef.current)
    if (!result.ok) return result.error
    dataRef.current = result.data
    setData(result.data)
    if (success) setToastText(success)
    return null
  }, [])

  const ctx: Ctx = {
    data,
    ui,
    actor,
    go,
    replace,
    back,
    run,
    setRole,
    openTaskForm: setTaskDraft,
    toast: setToastText,
  }

  const k = kpis(data, ui.enterpriseId)
  const navBadge: Partial<Record<Section, number>> = {
    finance: k.overdueShip.length,
    calls: k.unprocessed.length,
    supplies: k.delayedSupplies.length,
    tasks: k.overdueTasks.length,
  }

  const doReset = () => {
    setData(createSeed())
    setUi((s) => ({ ...s, route: { page: 'overview' }, stack: [], role: 'director' }))
    setConfirmReset(false)
    setToastText('Демонстрация сброшена к исходному набору')
  }

  return (
    <AppCtx.Provider value={ctx}>
      <div className="shell">
        <aside className={menuOpen ? 'side open' : 'side'}>
          <div className="brand">
            <span className="brand-mark">У</span>
            <div>
              <strong>Каркас управления</strong>
              <span>краски и тара · демо</span>
            </div>
          </div>
          <nav>
            {NAV.map((item) => {
              const active = item.match.includes(ui.route.page)
              const badge = navBadge[item.id]
              return (
                <button key={item.id} className={active ? 'nav-item active' : 'nav-item'} onClick={() => go(item.route)}>
                  <span>{item.label}</span>
                  {badge ? <span className="nav-badge" title="Просрочено или требует реакции">{badge}</span> : null}
                </button>
              )
            })}
          </nav>
          <div className="side-foot">
            <button className={ui.route.page === 'guide' ? 'nav-item active' : 'nav-item'} onClick={() => go({ page: 'guide' })}>
              Инструкция и правила для согласования
            </button>
          </div>
        </aside>

        <div className="main">
          <header className="topbar">
            <button className="icon-btn menu-btn" onClick={() => setMenuOpen((v) => !v)} aria-label="Меню">
              ☰
            </button>
            <label className="top-field">
              <span>Предприятие</span>
              <select className="input" value={ui.enterpriseId} onChange={(e) => setUi((s) => ({ ...s, enterpriseId: e.target.value }))}>
                <option value="all">Все предприятия</option>
                {data.enterprises.map((e) => (
                  <option key={e.id} value={e.id}>
                    {e.name}
                  </option>
                ))}
              </select>
            </label>
            <div className="top-field">
              <span>Дата демонстрации</span>
              <strong className="date-chip">{formatDate(DEMO_DATE)}</strong>
            </div>
            <label className="top-field">
              <span>Демонстрационная роль</span>
              <select className="input" value={ui.role} onChange={(e) => setRole(e.target.value as Role)}>
                {(Object.keys(ROLE_LABEL) as Role[]).map((r) => (
                  <option key={r} value={r}>
                    {ROLE_LABEL[r]}
                  </option>
                ))}
              </select>
            </label>
            <div className="top-spacer" />
            <span className="demo-note">Демонстрация · Данные условные · Интеграции не подключены</span>
            <button className="btn btn-danger-ghost" onClick={() => setConfirmReset(true)}>
              Сбросить демонстрацию
            </button>
          </header>

          <main className="content">
            <Page route={ui.route} />
          </main>
          <footer className="foot">
            Демонстрация · Данные условные · Интеграции не подключены. Переключатель роли иллюстрирует будущие рабочие места и не заменяет авторизацию.
          </footer>
        </div>
      </div>

      {taskDraft && <TaskFormModal draft={taskDraft} onClose={() => setTaskDraft(null)} />}
      {confirmReset && (
        <Modal title="Сбросить демонстрацию?" onClose={() => setConfirmReset(false)}>
          <p>Все действия, выполненные во время показа, будут удалены. Вернётся исходный демонстрационный набор на {formatDate(DEMO_DATE)}.</p>
          <div className="form-actions">
            <button className="btn" onClick={() => setConfirmReset(false)}>
              Отмена
            </button>
            <button className="btn btn-danger" onClick={doReset}>
              Сбросить
            </button>
          </div>
        </Modal>
      )}
      {toastText && (
        <div className="toast" role="status">
          {toastText}
        </div>
      )}
    </AppCtx.Provider>
  )
}

function Page({ route }: { route: Route }) {
  switch (route.page) {
    case 'overview':
      return <Overview />
    case 'directions':
      return <DirectionsPage />
    case 'direction':
      return <DirectionPage route={route} />
    case 'orders':
      return <OrdersPage route={route} />
    case 'order':
      return <OrderPage key={route.orderId} route={route} />
    case 'production':
      return <ProductionPage route={route} />
    case 'finance':
      return <FinancePage route={route} />
    case 'calls':
      return <CallsPage route={route} />
    case 'appeal':
      return <AppealPage key={route.appealId} appealId={route.appealId} />
    case 'supplies':
      return <SuppliesPage route={route} />
    case 'supply':
      return <SupplyPage key={route.supplyId} supplyId={route.supplyId} />
    case 'tasks':
      return <TasksPage route={route} />
    case 'task':
      return <TaskPage key={route.taskId} taskId={route.taskId} />
    case 'guide':
      return <GuidePage />
  }
}
