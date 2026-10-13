import { useApp } from '../app/ctx'
import {
  byId,
  directionRows,
  enterpriseName,
  personTitle,
  selectAppeals,
  selectObligations,
  selectOrders,
  selectTasks,
} from '../domain/calc'
import type { DirTab, Route } from '../domain/types'
import { Card, CountLink, Empty, Money, PageHead, Tabs } from '../ui/kit'
import { AppealsTable, DebtsTable, OrdersTable, TasksTable } from '../ui/shared'

export function DirectionsPage() {
  const { data, ui, go } = useApp()
  const rows = directionRows(data, ui.enterpriseId)
  return (
    <div className="page">
      <PageHead title="Направления" sub={<>{ui.enterpriseId === 'all' ? 'все предприятия' : enterpriseName(data, ui.enterpriseId)}</>} />
      <div className="dir-grid">
        {rows.map((row) => (
          <Card key={row.directionId} title={row.name}>
            <p className="muted small">РОП: {personTitle(data, row.ropId)}</p>
            <dl className="mini-stats">
              <div>
                <dt>Активные заказы</dt>
                <dd>
                  <CountLink value={row.inWork.length} route={{ page: 'orders', directionId: row.directionId, inWork: true }} />
                </dd>
              </div>
              <div>
                <dt>Задержанные отгрузки</dt>
                <dd>
                  <CountLink value={row.overdueShip.length} tone="red" route={{ page: 'finance', tab: 'shipments', directionId: row.directionId, overdue: true }} />
                </dd>
              </div>
              <div>
                <dt>Долг</dt>
                <dd>
                  <Money value={row.debt} />
                </dd>
              </div>
              <div>
                <dt>Просроченный долг</dt>
                <dd>
                  <Money value={row.overdueDebt} />
                </dd>
              </div>
            </dl>
            <button className="btn btn-primary btn-sm" onClick={() => go({ page: 'direction', directionId: row.directionId, tab: 'orders' })}>
              Открыть направление
            </button>
          </Card>
        ))}
      </div>
      <p className="small muted">Реальная структура направлений и предприятий ещё не согласована. Список может расширяться без переделки экранов.</p>
    </div>
  )
}

export function DirectionPage({ route }: { route: Extract<Route, { page: 'direction' }> }) {
  const { data, ui, replace } = useApp()
  const direction = byId(data.directions, route.directionId)
  if (!direction) return <Empty title="Направление не найдено" />
  const ent = ui.enterpriseId
  const row = directionRows(data, ent).find((r) => r.directionId === direction.id)!
  const orders = selectOrders(data, { enterpriseId: ent, directionId: direction.id })
  const debts = selectObligations(data, { enterpriseId: ent, directionId: direction.id })
  const appeals = selectAppeals(data, { enterpriseId: ent, directionId: direction.id })
  const tasks = selectTasks(data, { enterpriseId: ent, directionId: direction.id })
  const setTab = (tab: DirTab) => replace({ ...route, tab })

  return (
    <div className="page">
      <PageHead
        title={direction.name}
        sub={
          <>
            {ent === 'all' ? 'Все предприятия' : enterpriseName(data, ent)} · РОП: {personTitle(data, direction.ropId)}
          </>
        }
      />
      <div className="summary-strip">
        <div>
          <span>Активные заказы</span>
          <strong>{row.inWork.length}</strong>
        </div>
        <div>
          <span>Задержанные отгрузки</span>
          <strong className={row.overdueShip.length ? 'text-red' : ''}>{row.overdueShip.length}</strong>
        </div>
        <div>
          <span>Долг</span>
          <strong>
            <Money value={row.debt} />
          </strong>
        </div>
        <div>
          <span>Просроченный долг</span>
          <strong className={row.overdueDebt ? 'text-red' : ''}>
            <Money value={row.overdueDebt} />
          </strong>
        </div>
        <div>
          <span>Необработанные обращения</span>
          <strong>{row.unprocessed.length}</strong>
        </div>
        <div>
          <span>Просроченные поручения</span>
          <strong>{row.overdueTasks.length}</strong>
        </div>
      </div>
      <Tabs<DirTab>
        value={route.tab}
        onChange={setTab}
        items={[
          { id: 'orders', label: `Заказы · ${orders.length}` },
          { id: 'debts', label: `Долги · ${debts.length}` },
          { id: 'appeals', label: `Обращения · ${appeals.length}` },
          { id: 'tasks', label: `Поручения · ${tasks.length}` },
        ]}
      />
      <Card>
        {route.tab === 'orders' && <OrdersTable orders={orders} compact />}
        {route.tab === 'debts' && <DebtsTable obligations={debts} compact />}
        {route.tab === 'appeals' && <AppealsTable appeals={appeals} />}
        {route.tab === 'tasks' && <TasksTable tasks={tasks} />}
      </Card>
    </div>
  )
}
