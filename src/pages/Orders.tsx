import { useApp } from '../app/ctx'
import { selectOrders } from '../domain/calc'
import { STAGE_LABEL } from '../domain/labels'
import type { Route, Stage } from '../domain/types'
import { Card, PageHead, Search } from '../ui/kit'
import { OrdersTable } from '../ui/shared'

type OrdersRoute = Extract<Route, { page: 'orders' }>

export function OrdersPage({ route }: { route: OrdersRoute }) {
  const { data, ui, replace } = useApp()
  const set = (patch: Partial<OrdersRoute>) => replace({ ...route, ...patch })
  const orders = selectOrders(data, { enterpriseId: ui.enterpriseId, ...route })
  const managers = data.employees.filter((e) => e.role === 'manager')
  const active = [route.directionId, route.managerId, route.clientId, route.stage, route.inWork, route.overdueShip, route.q].some(Boolean)

  return (
    <div className="page">
      <PageHead title="Заказы и контракты" sub={`Найдено: ${orders.length}`}>
        <Search value={route.q ?? ''} onChange={(q) => set({ q })} placeholder="Номер или клиент" />
        <select className="input" value={route.directionId ?? ''} onChange={(e) => set({ directionId: e.target.value || undefined })}>
          <option value="">Все направления</option>
          {data.directions.map((d) => (
            <option key={d.id} value={d.id}>
              {d.name}
            </option>
          ))}
        </select>
        <select className="input" value={route.managerId ?? ''} onChange={(e) => set({ managerId: e.target.value || undefined })}>
          <option value="">Все менеджеры</option>
          {managers.map((m) => (
            <option key={m.id} value={m.id}>
              {m.shortName}
            </option>
          ))}
        </select>
        <select className="input" value={route.stage ?? ''} onChange={(e) => set({ stage: (e.target.value || undefined) as Stage | undefined })}>
          <option value="">Все этапы</option>
          {(Object.keys(STAGE_LABEL) as Stage[]).map((s) => (
            <option key={s} value={s}>
              {STAGE_LABEL[s]}
            </option>
          ))}
        </select>
        <select className="input" value={route.clientId ?? ''} onChange={(e) => set({ clientId: e.target.value || undefined })}>
          <option value="">Все клиенты</option>
          {data.clients.map((c) => (
            <option key={c.id} value={c.id}>
              {c.name}
            </option>
          ))}
        </select>
        <label className="check">
          <input type="checkbox" checked={!!route.inWork} onChange={(e) => set({ inWork: e.target.checked || undefined })} /> В работе
        </label>
        <label className="check">
          <input type="checkbox" checked={!!route.overdueShip} onChange={(e) => set({ overdueShip: e.target.checked || undefined })} /> Просрочена отгрузка
        </label>
        {active && (
          <button className="btn btn-ghost btn-sm" onClick={() => replace({ page: 'orders' })}>
            Сбросить фильтры
          </button>
        )}
      </PageHead>
      <Card>
        <OrdersTable orders={orders} />
      </Card>
    </div>
  )
}
