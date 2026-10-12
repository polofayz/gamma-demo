import { useState } from 'react'
import { canSeeMoney, useApp } from '../app/ctx'
import {
  availableToShip,
  clientName,
  debtSum,
  directionName,
  hasUnshipped,
  isOverdueShipment,
  orderBalances,
  orderDelayReason,
  orderLines,
  personName,
  selectObligations,
  selectOrders,
} from '../domain/calc'
import { formatDate, formatQty } from '../domain/format'
import type { Route } from '../domain/types'
import { DEMO_DATE } from '../domain/types'
import { Card, Empty, Linkish, Money, PageHead, Search, TableWrap, Tabs } from '../ui/kit'
import { ShipModal } from '../ui/ops'
import { DebtsTable, ShipBadge } from '../ui/shared'

type FinRoute = Extract<Route, { page: 'finance' }>

export function FinancePage({ route }: { route: FinRoute }) {
  const { data, ui, replace } = useApp()
  const [q, setQ] = useState('')
  const set = (patch: Partial<FinRoute>) => replace({ ...route, ...patch })

  return (
    <div className="page">
      <PageHead title="Долги и отгрузки">
        <Search value={q} onChange={setQ} placeholder="Клиент, документ или заказ" />
        <select className="input" value={route.directionId ?? ''} onChange={(e) => set({ directionId: e.target.value || undefined })}>
          <option value="">Все направления</option>
          {data.directions.map((d) => (
            <option key={d.id} value={d.id}>
              {d.name}
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
          <input type="checkbox" checked={!!route.overdue} onChange={(e) => set({ overdue: e.target.checked || undefined })} /> Только просроченные
        </label>
        {route.tab === 'debts' && (
          <label className="check">
            <input type="checkbox" checked={!!route.openOnly} onChange={(e) => set({ openOnly: e.target.checked || undefined })} /> С остатком
          </label>
        )}
      </PageHead>
      <Tabs
        value={route.tab}
        onChange={(tab) => set({ tab })}
        items={[
          { id: 'debts', label: 'Долги' },
          { id: 'shipments', label: 'Отгрузки' },
        ]}
      />
      {route.tab === 'debts' ? (
        canSeeMoney(ui.role) ? (
          <Debts route={route} q={q} />
        ) : (
          <Card>
            <Empty title="Финансовые данные скрыты для этой демонстрационной роли" text="Переключите роль на директора, РОПа, менеджера или бухгалтера." />
          </Card>
        )
      ) : (
        <Shipments route={route} q={q} />
      )}
    </div>
  )
}

function Debts({ route, q }: { route: FinRoute; q: string }) {
  const { data, ui } = useApp()
  const list = selectObligations(data, {
    enterpriseId: ui.enterpriseId,
    directionId: route.directionId,
    clientId: route.clientId,
    overdue: route.overdue,
    openOnly: route.openOnly,
    q,
  })
  return (
    <Card
      title={`Реестр обязательств · ${list.length}`}
      aside={<span className="small muted">Условные финансовые документы. Реальный источник — уточняется с бухгалтерией/1С</span>}
    >
      <div className="summary-strip">
        <div>
          <span>Остаток по списку · сум на {formatDate(DEMO_DATE)}</span>
          <strong>
            <Money value={debtSum(data, list)} />
          </strong>
        </div>
        <div>
          <span>Из них просрочено</span>
          <strong className="text-red">
            <Money value={debtSum(data, list.filter((o) => o.dueDate && o.dueDate < DEMO_DATE))} />
          </strong>
        </div>
      </div>
      <p className="small muted">Долг = сумма обязательства − оплаты по нему. Отдельной цифрой долг не вводится. Обязательство без срока показывается как «Срок не задан».</p>
      <DebtsTable obligations={list} />
    </Card>
  )
}

function Shipments({ route, q }: { route: FinRoute; q: string }) {
  const { data, ui } = useApp()
  const [shipFor, setShipFor] = useState<string | null>(null)
  const orders = selectOrders(data, {
    enterpriseId: ui.enterpriseId,
    directionId: route.directionId,
    clientId: route.clientId,
    overdueShip: route.overdue,
    q,
  }).filter((o) => hasUnshipped(data, o))

  return (
    <Card title={`${route.overdue ? 'Просроченные отгрузки' : 'Отгрузки к выполнению'} · ${orders.length}`} aside={<span className="small muted">Штрафы по госконтрактам не рассчитываются — вынесено на согласование</span>}>
      {orders.length ? (
        <TableWrap>
          <thead>
            <tr>
              <th>Заказ</th>
              <th>Клиент</th>
              <th>Направление</th>
              <th>Согласованный срок</th>
              <th className="r">К отгрузке</th>
              <th className="r">Отгружено</th>
              <th className="r">Остаток</th>
              <th>Ответственный</th>
              <th>Состояние / причина задержки</th>
              <th />
            </tr>
          </thead>
          <tbody>
            {orders.map((order) => {
              const balances = orderBalances(data, order.id)
              const canShip = orderLines(data, order.id).some((l) => availableToShip(data, l.id) > 0)
              return (
                <tr key={order.id}>
                  <td>
                    <Linkish route={{ page: 'order', orderId: order.id }}>{order.number}</Linkish>
                  </td>
                  <td>{clientName(data, order.clientId)}</td>
                  <td>{directionName(data, order.directionId)}</td>
                  <td className="nowrap">{formatDate(order.shipDue)}</td>
                  <td className="r num">
                    {balances.map((b) => (
                      <div key={b.unit}>{formatQty(b.ordered, b.unit)}</div>
                    ))}
                  </td>
                  <td className="r num">
                    {balances.map((b) => (
                      <div key={b.unit}>{formatQty(b.shipped, b.unit)}</div>
                    ))}
                  </td>
                  <td className="r num strong">
                    {balances.map((b) => (
                      <div key={b.unit}>{formatQty(b.left, b.unit)}</div>
                    ))}
                  </td>
                  <td>{personName(data, order.stageResponsibleId)}</td>
                  <td>
                    <ShipBadge order={order} />
                    {isOverdueShipment(data, order) && <div className="cell-note">{orderDelayReason(data, order)}</div>}
                  </td>
                  <td>
                    {ui.role === 'warehouse' && canShip && (
                      <button className="btn btn-sm btn-primary" onClick={() => setShipFor(order.id)}>
                        Отгрузить
                      </button>
                    )}
                  </td>
                </tr>
              )
            })}
          </tbody>
        </TableWrap>
      ) : (
        <Empty title="Отгрузок по условиям нет" text={route.overdue ? 'Просроченных отгрузок нет.' : 'Все заказы отгружены.'} />
      )}
      <p className="small muted">Заказ уходит из просроченных только после полной отгрузки или зафиксированного изменения срока в карточке заказа.</p>
      {shipFor && <ShipModal orderId={shipFor} onClose={() => setShipFor(null)} />}
    </Card>
  )
}
