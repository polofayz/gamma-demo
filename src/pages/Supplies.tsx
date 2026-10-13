import { useState } from 'react'
import { newOpKey, useApp } from '../app/ctx'
import { supplyReceive, supplyUpdate } from '../domain/actions'
import { byId, isDelayedSupply, personName, personTitle, selectSupplies, supplyWasLate, workshopName } from '../domain/calc'
import { daysOverdue, formatDate, formatDateTime, formatQty } from '../domain/format'
import { JOB_LABEL, ORIGIN_LABEL, SUPPLY_LABEL } from '../domain/labels'
import type { Origin, Route, SupplyStage } from '../domain/types'
import { DEMO_DATE } from '../domain/types'
import { Badge, Card, Empty, Field, FormError, KV, Linkish, NeedRole, PageHead, Search, TableWrap } from '../ui/kit'
import { HistoryList, LinkedTasks } from '../ui/shared'

type SupRoute = Extract<Route, { page: 'supplies' }>

function SupplyBadge({ supplyId }: { supplyId: string }) {
  const { data } = useApp()
  const s = byId(data.supplies, supplyId)!
  if (s.stage === 'received') return <Badge tone="green">{SUPPLY_LABEL.received}</Badge>
  if (isDelayedSupply(s)) return <Badge tone="red">Задержана {daysOverdue(s.plannedDate)} дн. · {SUPPLY_LABEL[s.stage]}</Badge>
  if (supplyWasLate(s) || s.originalPlannedDate !== s.plannedDate) return <Badge tone="amber">Перенос срока · {SUPPLY_LABEL[s.stage]}</Badge>
  return <Badge tone="neutral">{SUPPLY_LABEL[s.stage]}</Badge>
}

export function SuppliesPage({ route }: { route: SupRoute }) {
  const { data, ui, replace } = useApp()
  const [q, setQ] = useState('')
  const set = (patch: Partial<SupRoute>) => replace({ ...route, ...patch })
  const list = selectSupplies(data, { enterpriseId: ui.enterpriseId, delayed: route.delayed, origin: route.origin, q })

  return (
    <div className="page">
      <PageHead title="Поставки сырья" sub="Задержка поставки, связанные задания и поиск другого источника">
        <Search value={q} onChange={setQ} placeholder="Материал, поставщик, номер" />
        <select className="input" value={route.origin ?? ''} onChange={(e) => set({ origin: (e.target.value || undefined) as Origin | undefined })}>
          <option value="">Местные и импортные</option>
          <option value="local">Местные</option>
          <option value="import">Импортные</option>
        </select>
        <label className="check">
          <input type="checkbox" checked={!!route.delayed} onChange={(e) => set({ delayed: e.target.checked || undefined })} /> Только задержанные
        </label>
      </PageHead>
      <Card title={`Реестр поставок · ${list.length}`}>
        {list.length ? (
          <TableWrap>
            <thead>
              <tr>
                <th>Материал</th>
                <th>Поставщик</th>
                <th>Ответственный</th>
                <th>Тип</th>
                <th className="r">Количество</th>
                <th>Плановая дата</th>
                <th>Этап / местонахождение</th>
                <th>Последняя информация</th>
                <th className="r">Получено / осталось</th>
                <th>Связанные задания</th>
              </tr>
            </thead>
            <tbody>
              {list.map((s) => (
                <tr key={s.id}>
                  <td>
                    <Linkish route={{ page: 'supply', supplyId: s.id }}>
                      <strong>{s.material}</strong>
                    </Linkish>
                    <div className="cell-note">{s.number}</div>
                  </td>
                  <td>{s.supplier}</td>
                  <td>{personName(data, s.purchaserId)}</td>
                  <td>{ORIGIN_LABEL[s.origin]}</td>
                  <td className="r num">{formatQty(s.qty, s.unit)}</td>
                  <td className="nowrap">
                    {formatDate(s.plannedDate)}
                    {s.originalPlannedDate !== s.plannedDate && <div className="cell-note">первоначально {formatDate(s.originalPlannedDate)}</div>}
                  </td>
                  <td>
                    <SupplyBadge supplyId={s.id} />
                    <div className="cell-note">{s.location}</div>
                  </td>
                  <td className="small">{s.lastInfo}</td>
                  <td className="r num">
                    {formatQty(s.receivedQty)} / {formatQty(s.qty - s.receivedQty, s.unit)}
                  </td>
                  <td className="small">
                    {s.jobIds.map((id) => {
                      const job = byId(data.jobs, id)
                      const order = job ? byId(data.orders, job.orderId) : undefined
                      return order ? (
                        <div key={id}>
                          <Linkish route={{ page: 'order', orderId: order.id }}>{order.number}</Linkish>
                        </div>
                      ) : null
                    })}
                  </td>
                </tr>
              ))}
            </tbody>
          </TableWrap>
        ) : (
          <Empty title="Поставок нет" text="Измените фильтры или предприятие." />
        )}
      </Card>
    </div>
  )
}

export function SupplyPage({ supplyId }: { supplyId: string }) {
  const { data, ui, openTaskForm } = useApp()
  const supply = byId(data.supplies, supplyId)
  if (!supply) return <Empty title="Поставка не найдена" />
  const events = data.supplyEvents.filter((e) => e.supplyId === supply.id)
  const delayed = isDelayedSupply(supply)
  const alternatives = data.supplies.filter((s) => s.id !== supply.id && s.material === supply.material)

  return (
    <div className="page">
      <PageHead
        title={`${supply.number} · ${supply.material}`}
        sub={
          <span className="row-gap">
            <SupplyBadge supplyId={supply.id} /> {ORIGIN_LABEL[supply.origin]} поставка · {supply.supplier}
          </span>
        }
      >
        <button
          className="btn btn-primary"
          onClick={() =>
            openTaskForm({
              linkType: 'supply',
              linkId: supply.id,
              assigneeId: 'emp-buy2',
              title: `Найти замену: ${supply.material}, ${formatQty(supply.qty - supply.receivedQty, supply.unit)} у местных поставщиков`,
            })
          }
        >
          Поручить поиск замены
        </button>
      </PageHead>

      <div className="grid-2">
        <Card title="Сроки и состояние">
          <KV
            items={[
              ['Первоначальный срок', formatDate(supply.originalPlannedDate)],
              ['Текущая ожидаемая дата', <span className={delayed ? 'text-red strong' : ''}>{formatDate(supply.plannedDate)}{delayed ? ` · прошла ${daysOverdue(supply.plannedDate)} дн. назад` : ''}</span>],
              ['Этап', SUPPLY_LABEL[supply.stage]],
              ['Местонахождение', supply.location],
              ['Количество', formatQty(supply.qty, supply.unit)],
              ['Получено / осталось', `${formatQty(supply.receivedQty, supply.unit)} / ${formatQty(supply.qty - supply.receivedQty, supply.unit)}`],
              ['Ответственный снабженец', personTitle(data, supply.purchaserId)],
            ]}
          />
        </Card>
        <Card title="Риск для производства">
          {supply.riskComment ? <p>{supply.riskComment}</p> : <p className="muted">Комментария о риске нет.</p>}
          <h3 className="h3">Затронутые задания</h3>
          {supply.jobIds.length ? (
            <ul className="plain">
              {supply.jobIds.map((id) => {
                const job = byId(data.jobs, id)
                const order = job ? byId(data.orders, job.orderId) : undefined
                if (!job || !order) return null
                return (
                  <li key={id}>
                    <Linkish route={{ page: 'order', orderId: order.id }}>{order.number}</Linkish> · {workshopName(data, job.workshopId)} · {JOB_LABEL[job.state]}
                    {job.delayReason && <span className="muted"> · {job.delayReason}</span>}
                  </li>
                )
              })}
            </ul>
          ) : (
            <p className="muted">Не связана с заданиями.</p>
          )}
          <p className="small muted">Связанные производственные задания по этому сырью.</p>
          {alternatives.length > 0 && (
            <>
              <h3 className="h3">Другие поставки этого материала</h3>
              <ul className="plain">
                {alternatives.map((a) => (
                  <li key={a.id}>
                    <Linkish route={{ page: 'supply', supplyId: a.id }}>{a.number}</Linkish> · {ORIGIN_LABEL[a.origin]} · {a.supplier} · {SUPPLY_LABEL[a.stage]} · ожидается {formatDate(a.plannedDate)}
                  </li>
                ))}
              </ul>
            </>
          )}
        </Card>
      </div>

      {ui.role === 'purchaser' || ui.role === 'warehouse' ? (
        <div className="grid-2">
          {ui.role === 'purchaser' && <UpdateForm supplyId={supply.id} />}
          {supply.stage !== 'received' && <ReceiveForm supplyId={supply.id} />}
        </div>
      ) : (
        <NeedRole roles={['purchaser']} text="Сведения о грузе обновляет снабженец." />
      )}

      <Card title="История обновлений">
        {events.length ? (
          <ol className="history">
            {events.map((e) => (
              <li key={e.id}>
                <span className="history-time">{formatDateTime(e.at)}</span>
                <div>
                  {e.note}
                  <span className="muted"> · {personName(data, e.authorId)}</span>
                </div>
              </li>
            ))}
          </ol>
        ) : (
          <Empty title="Обновлений нет" />
        )}
      </Card>

      <Card title="Поручения по поставке">
        <LinkedTasks linkType="supply" linkId={supply.id} />
      </Card>
      <Card title="Журнал действий">
        <HistoryList entityType="supply" entityId={supply.id} />
      </Card>

    </div>
  )
}

function UpdateForm({ supplyId }: { supplyId: string }) {
  const { data, run, actor } = useApp()
  const s = byId(data.supplies, supplyId)!
  const [stage, setStage] = useState<SupplyStage>(s.stage)
  const [location, setLocation] = useState(s.location)
  const [info, setInfo] = useState('')
  const [plannedDate, setPlannedDate] = useState(s.plannedDate)
  const [reason, setReason] = useState('')
  const [error, setError] = useState<string | null>(null)
  const moved = plannedDate !== s.plannedDate
  return (
    <Card title="Обновить сведения">
      <div className="form">
        <div className="form-row">
          <Field label="Этап">
            <select className="input" value={stage} onChange={(e) => setStage(e.target.value as SupplyStage)}>
              {(Object.keys(SUPPLY_LABEL) as SupplyStage[]).map((st) => (
                <option key={st} value={st}>
                  {SUPPLY_LABEL[st]}
                </option>
              ))}
            </select>
          </Field>
          <Field label="Ожидаемая дата">
            <input className="input" type="date" value={plannedDate} onChange={(e) => setPlannedDate(e.target.value)} />
          </Field>
        </div>
        <Field label="Местонахождение">
          <input className="input" value={location} onChange={(e) => setLocation(e.target.value)} />
        </Field>
        <Field label="Последняя информация">
          <input className="input" value={info} onChange={(e) => setInfo(e.target.value)} placeholder="Что известно о грузе" />
        </Field>
        {moved && (
          <Field label="Причина переноса" hint="Первоначальный срок и история задержки сохранятся">
            <input className="input" value={reason} onChange={(e) => setReason(e.target.value)} />
          </Field>
        )}
        <FormError error={error} />
        <div className="form-actions">
          <button
            className="btn btn-primary"
            onClick={() => {
              const err = run((d) => supplyUpdate(d, actor, { supplyId, stage, location, info, plannedDate, reason }), 'Сведения о поставке обновлены')
              setError(err)
              if (!err) {
                setInfo('')
                setReason('')
              }
            }}
          >
            Сохранить
          </button>
        </div>
      </div>
    </Card>
  )
}

function ReceiveForm({ supplyId }: { supplyId: string }) {
  const { data, run, actor } = useApp()
  const s = byId(data.supplies, supplyId)!
  const left = s.qty - s.receivedQty
  const [qty, setQty] = useState('')
  const [nextDate, setNextDate] = useState(s.plannedDate > DEMO_DATE ? s.plannedDate : DEMO_DATE)
  const [error, setError] = useState<string | null>(null)
  const [opKey, setOpKey] = useState(newOpKey)
  const partial = Number(qty) > 0 && Number(qty) < left
  return (
    <Card title="Отметить получение">
      <div className="form">
        <p className="small muted">Осталось получить {formatQty(left, s.unit)}.</p>
        <div className="form-row">
          <Field label={`Получено, ${s.unit}`}>
            <input className="input" inputMode="decimal" value={qty} onChange={(e) => setQty(e.target.value)} />
          </Field>
          {partial && (
            <Field label="Новое ожидаемое время остатка">
              <input className="input" type="date" min={DEMO_DATE} value={nextDate} onChange={(e) => setNextDate(e.target.value)} />
            </Field>
          )}
        </div>
        <FormError error={error} />
        <div className="form-actions">
          <button
            className="btn btn-primary"
            onClick={() => {
              const err = run((d) => supplyReceive(d, actor, { supplyId, qty: Number(qty.replace(',', '.')), nextDate, opKey }), 'Получение отмечено')
              setError(err)
              if (!err) {
                setQty('')
                setOpKey(newOpKey())
              }
            }}
          >
            Отметить получение
          </button>
        </div>
      </div>
    </Card>
  )
}
