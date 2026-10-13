import { useState } from 'react'
import { newOpKey, useApp } from '../app/ctx'
import { appealAssign, appealCallback, appealCreateOrder, appealResult } from '../domain/actions'
import { byId, callsOfAppeals, clientName, directionName, enterpriseName, isAppealProcessed, personName, personTitle, selectAppeals } from '../domain/calc'
import { formatDateTime, formatDuration } from '../domain/format'
import { CALL_STATUS, CALL_WAY, RESULT_LABEL } from '../domain/labels'
import type { AppealResult, PhoneCall, Route, Unit } from '../domain/types'
import { DEMO_DATE } from '../domain/types'
import { AfterConnect, Badge, Card, CountLink, Empty, Field, FormError, KV, Linkish, NeedRole, PageHead, Search, TableWrap, Tabs } from '../ui/kit'
import { AppealBadge, AppealsTable, HistoryList, LinkedTasks } from '../ui/shared'

type CallsRoute = Extract<Route, { page: 'calls' }>
const PERIOD = '01.10.2026 – 12.10.2026'

export function CallsPage({ route }: { route: CallsRoute }) {
  const { data, ui, replace } = useApp()
  const [q, setQ] = useState('')
  const [view, setView] = useState<'appeals' | 'calls'>(route.focus === 'incoming' || route.focus === 'missed' ? 'calls' : 'appeals')
  const set = (patch: Partial<CallsRoute>) => replace({ ...route, ...patch })
  const ent = ui.enterpriseId

  const allInScope = selectAppeals(data, { enterpriseId: ent, directionId: route.directionId, q })
  const appeals = allInScope.filter((a) => {
    if (route.focus === 'unprocessed') return !isAppealProcessed(a)
    if (route.focus === 'processed') return isAppealProcessed(a)
    return true
  })
  const calls = callsOfAppeals(data, allInScope)
    .filter((c) => {
      if (route.focus === 'incoming') return c.way === 'in'
      if (route.focus === 'missed') return c.status === 'missed'
      return true
    })
    .sort((a, b) => b.at.localeCompare(a.at))

  const statRows = [
    ...data.directions.map((d) => ({ id: d.id as string | null, name: d.name })),
    ...(ent === 'all' ? [{ id: null, name: 'Не назначено' }] : []),
  ].map((row) => {
    const scoped = data.appeals.filter((a) => (row.id ? a.directionId === row.id && (ent === 'all' || a.enterpriseId === ent) : !a.directionId))
    const cs = callsOfAppeals(data, scoped)
    return {
      ...row,
      incoming: cs.filter((c) => c.way === 'in').length,
      missed: cs.filter((c) => c.status === 'missed').length,
      unprocessed: scoped.filter((a) => !isAppealProcessed(a)).length,
      processed: scoped.filter((a) => isAppealProcessed(a)).length,
    }
  })

  const focusLabel: Record<string, string> = {
    incoming: 'Входящие звонки',
    missed: 'Пропущенные звонки',
    unprocessed: 'Необработанные обращения',
    processed: 'Обработанные обращения',
  }

  return (
    <div className="page">
      <PageHead title="Звонки и обращения" sub={`Период: ${PERIOD}`}>
        <Search value={q} onChange={setQ} placeholder="Номер или клиент" />
        <select className="input" value={route.directionId ?? ''} onChange={(e) => set({ directionId: e.target.value || undefined })}>
          <option value="">Все направления</option>
          {data.directions.map((d) => (
            <option key={d.id} value={d.id}>
              {d.name}
            </option>
          ))}
        </select>
        <select className="input" value={route.focus ?? ''} onChange={(e) => set({ focus: (e.target.value || undefined) as CallsRoute['focus'] })}>
          <option value="">Все записи</option>
          {Object.entries(focusLabel).map(([id, label]) => (
            <option key={id} value={id}>
              {label}
            </option>
          ))}
        </select>
      </PageHead>

      <Card title="Статистика направлений" aside={<span className="small muted">Период {PERIOD}. Нажатие на число открывает исходные записи</span>}>
        <TableWrap>
          <thead>
            <tr>
              <th>Направление</th>
              <th className="r">Входящие звонки</th>
              <th className="r">Пропущенные звонки</th>
              <th className="r">Необработанные обращения</th>
              <th className="r">Обработанные обращения</th>
            </tr>
          </thead>
          <tbody>
            {statRows.map((row) => {
              const base = { page: 'calls' as const, directionId: row.id ?? undefined }
              return (
                <tr key={row.id ?? 'none'}>
                  <td>{row.id ? row.name : <Badge tone="red">Не назначено</Badge>}</td>
                  <td className="r">
                    <span onClick={() => setView('calls')}>
                      <CountLink value={row.incoming} route={{ ...base, focus: 'incoming' }} />
                    </span>
                  </td>
                  <td className="r">
                    <span onClick={() => setView('calls')}>
                      <CountLink value={row.missed} tone="amber" route={{ ...base, focus: 'missed' }} />
                    </span>
                  </td>
                  <td className="r">
                    <span onClick={() => setView('appeals')}>
                      <CountLink value={row.unprocessed} tone="red" route={{ ...base, focus: 'unprocessed' }} />
                    </span>
                  </td>
                  <td className="r">
                    <span onClick={() => setView('appeals')}>
                      <CountLink value={row.processed} route={{ ...base, focus: 'processed' }} />
                    </span>
                  </td>
                </tr>
              )
            })}
          </tbody>
        </TableWrap>
        <p className="small muted">
          Пропущенный звонок и необработанное обращение — разные признаки. Несколько повторных звонков одного обращения не считаются несколькими потерянными клиентами. Автоматическая оценка
          сотрудников по числу звонков не делается.
        </p>
      </Card>

      {route.focus && (
        <div className="callout callout-neutral">
          Показаны: <strong>{focusLabel[route.focus]}</strong>
          {route.directionId ? ` · ${directionName(data, route.directionId)}` : ''}.{' '}
          <button className="linkish" onClick={() => set({ focus: undefined })}>
            Показать все
          </button>
        </div>
      )}

      <Tabs
        value={view}
        onChange={setView}
        items={[
          { id: 'appeals', label: `Обращения · ${appeals.length}` },
          { id: 'calls', label: `Звонки · ${calls.length}` },
        ]}
      />
      <Card>{view === 'appeals' ? <AppealsTable appeals={appeals} /> : <CallsTable calls={calls} />}</Card>
    </div>
  )
}

function CallsTable({ calls }: { calls: PhoneCall[] }) {
  const { data } = useApp()
  if (!calls.length) return <Empty title="Звонков нет" />
  return (
    <TableWrap>
      <thead>
        <tr>
          <th>Время</th>
          <th>Направление звонка</th>
          <th>Номер</th>
          <th>Статус</th>
          <th>Сотрудник</th>
          <th>Длительность</th>
          <th>Обращение</th>
        </tr>
      </thead>
      <tbody>
        {calls.map((c) => {
          const appeal = byId(data.appeals, c.appealId)
          return (
            <tr key={c.id}>
              <td className="nowrap">{formatDateTime(c.at)}</td>
              <td>{CALL_WAY[c.way]}</td>
              <td className="nowrap">{c.phone}</td>
              <td>
                <Badge tone={c.status === 'missed' ? 'amber' : 'neutral'}>{CALL_STATUS[c.status]}</Badge>
              </td>
              <td>{personName(data, c.employeeId)}</td>
              <td>{formatDuration(c.durationSec)}</td>
              <td>{appeal && <Linkish route={{ page: 'appeal', appealId: appeal.id }}>{clientName(data, appeal.clientId)}</Linkish>}</td>
            </tr>
          )
        })}
      </tbody>
    </TableWrap>
  )
}

function addDays(days: number) {
  const d = new Date(`${DEMO_DATE}T00:00:00Z`)
  d.setUTCDate(d.getUTCDate() + days)
  return d.toISOString().slice(0, 10)
}

export function AppealPage({ appealId }: { appealId: string }) {
  const { data, ui } = useApp()
  const appeal = byId(data.appeals, appealId)
  if (!appeal) return <Empty title="Обращение не найдено" />
  const calls = data.calls.filter((c) => c.appealId === appeal.id).sort((a, b) => b.at.localeCompare(a.at))
  const canManage = ui.role === 'director' || ui.role === 'rop'
  const canWork = ui.role === 'director' || ui.role === 'rop' || ui.role === 'manager'

  return (
    <div className="page">
      <PageHead title={`Обращение · ${clientName(data, appeal.clientId)}`} sub={<span className="row-gap"><AppealBadge appeal={appeal} /> {appeal.phone}</span>} />

      <div className="grid-2">
        <Card title="Данные обращения">
          <KV
            items={[
              ['Клиент / номер', `${clientName(data, appeal.clientId)} · ${appeal.phone}`],
              ['Предприятие', enterpriseName(data, appeal.enterpriseId)],
              ['Направление', directionName(data, appeal.directionId)],
              ['Ответственный', personTitle(data, appeal.managerId)],
              ['Результат', appeal.result ? `${RESULT_LABEL[appeal.result]} · ${appeal.resultNote}` : 'Не зафиксирован'],
              ['Следующее действие', appeal.nextAction || '—'],
              ['Связанный заказ', appeal.orderId ? <Linkish route={{ page: 'order', orderId: appeal.orderId }}>{byId(data.orders, appeal.orderId)?.number}</Linkish> : '—'],
            ]}
          />
          <p className="small muted">
            Обработанным считается обращение с содержательным результатом («удалось связаться» или «вопрос решён»).
          </p>
        </Card>
        <Card title={`Связанные звонки · ${calls.length}`}>
          <ul className="plain">
            {calls.map((c) => (
              <li key={c.id} className="call-row">
                <span className="nowrap">{formatDateTime(c.at)}</span>
                <span>{CALL_WAY[c.way]}</span>
                <Badge tone={c.status === 'missed' ? 'amber' : 'neutral'}>{CALL_STATUS[c.status]}</Badge>
                <span>{personName(data, c.employeeId)}</span>
                <span className="muted">{formatDuration(c.durationSec)}</span>
              </li>
            ))}
          </ul>
          <div className="row-gap mt">
            <AfterConnect label="Прослушать запись" reason="Запись разговора появится после подключения телефонии." />
            <AfterConnect label="ИИ-анализ разговора" reason="Анализ разговора появится после подключения." />
          </div>
        </Card>
      </div>

      {canWork ? (
        <div className="grid-2">
          {canManage ? <AssignForm appealId={appeal.id} /> : null}
          <CallbackForm appealId={appeal.id} />
          <ResultForm appealId={appeal.id} />
          <CreateOrderForm appealId={appeal.id} />
        </div>
      ) : (
        <NeedRole roles={['manager', 'rop']} text="Назначение, перезвон и результат фиксируют РОП и менеджер." />
      )}

      <Card title="Поручения по обращению">
        <LinkedTasks linkType="appeal" linkId={appeal.id} directionId={appeal.directionId} />
      </Card>
      <Card title="История">
        <HistoryList entityType="appeal" entityId={appeal.id} />
      </Card>
    </div>
  )
}

function AssignForm({ appealId }: { appealId: string }) {
  const { data, run, actor } = useApp()
  const appeal = byId(data.appeals, appealId)!
  const [enterpriseId, setEnterpriseId] = useState(appeal.enterpriseId ?? '')
  const [directionId, setDirectionId] = useState(appeal.directionId ?? '')
  const [managerId, setManagerId] = useState(appeal.managerId ?? '')
  const [error, setError] = useState<string | null>(null)
  const managers = data.employees.filter((e) => e.role === 'manager')
  return (
    <Card title="1. Назначить направление и менеджера">
      <div className="form">
        <div className="form-row">
          <Field label="Предприятие">
            <select className="input" value={enterpriseId} onChange={(e) => setEnterpriseId(e.target.value)}>
              <option value="">— выберите —</option>
              {data.enterprises.map((e) => (
                <option key={e.id} value={e.id}>
                  {e.name}
                </option>
              ))}
            </select>
          </Field>
          <Field label="Направление">
            <select className="input" value={directionId} onChange={(e) => setDirectionId(e.target.value)}>
              <option value="">— выберите —</option>
              {data.directions.map((d) => (
                <option key={d.id} value={d.id}>
                  {d.name}
                </option>
              ))}
            </select>
          </Field>
        </div>
        <Field label="Менеджер">
          <select className="input" value={managerId} onChange={(e) => setManagerId(e.target.value)}>
            <option value="">— выберите —</option>
            {managers.map((m) => (
              <option key={m.id} value={m.id}>
                {m.title} · {m.shortName}
              </option>
            ))}
          </select>
        </Field>
        <FormError error={error} />
        <div className="form-actions">
          <button className="btn btn-primary" onClick={() => setError(run((d) => appealAssign(d, actor, { appealId, enterpriseId, directionId, managerId }), 'Обращение назначено'))}>
            Назначить
          </button>
        </div>
      </div>
    </Card>
  )
}

function CallbackForm({ appealId }: { appealId: string }) {
  const { run, actor } = useApp()
  const [due, setDue] = useState(DEMO_DATE)
  const [note, setNote] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [opKey, setOpKey] = useState(newOpKey)
  return (
    <Card title="2. Поставить задачу на перезвон">
      <div className="form">
        <div className="form-row">
          <Field label="Срок">
            <input className="input" type="date" min={DEMO_DATE} value={due} onChange={(e) => setDue(e.target.value)} />
          </Field>
          <Field label="Что уточнить">
            <input className="input" value={note} onChange={(e) => setNote(e.target.value)} placeholder="Например, объём и сроки" />
          </Field>
        </div>
        <FormError error={error} />
        <div className="form-actions">
          <button
            className="btn btn-primary"
            onClick={() => {
              const err = run((d) => appealCallback(d, actor, { appealId, due, note, opKey }), 'Создано поручение на перезвон')
              setError(err)
              if (!err) {
                setNote('')
                setOpKey(newOpKey())
              }
            }}
          >
            Создать перезвон
          </button>
        </div>
      </div>
    </Card>
  )
}

function ResultForm({ appealId }: { appealId: string }) {
  const { run, actor } = useApp()
  const [result, setResult] = useState<AppealResult | ''>('')
  const [note, setNote] = useState('')
  const [nextAction, setNextAction] = useState('')
  const [error, setError] = useState<string | null>(null)
  const open = result === 'no_answer' || result === 'continue'
  return (
    <Card title="3. Зафиксировать результат">
      <div className="form">
        <Field label="Результат">
          <select className="input" value={result} onChange={(e) => setResult(e.target.value as AppealResult | '')}>
            <option value="">— выберите —</option>
            {(Object.keys(RESULT_LABEL) as AppealResult[]).map((r) => (
              <option key={r} value={r}>
                {RESULT_LABEL[r]}
              </option>
            ))}
          </select>
        </Field>
        <Field label="Содержание">
          <input className="input" value={note} onChange={(e) => setNote(e.target.value)} placeholder="О чём договорились" />
        </Field>
        {open && (
          <Field label="Следующее действие" hint="Разговор не завершён — обращение остаётся в работе">
            <input className="input" value={nextAction} onChange={(e) => setNextAction(e.target.value)} placeholder="Например, перезвонить завтра в 10:00" />
          </Field>
        )}
        <FormError error={error} />
        <div className="form-actions">
          <button
            className="btn btn-primary"
            onClick={() => {
              const err = run((d) => appealResult(d, actor, { appealId, result, note, nextAction }), 'Результат зафиксирован')
              setError(err)
              if (!err) {
                setNote('')
                setNextAction('')
              }
            }}
          >
            Сохранить результат
          </button>
        </div>
      </div>
    </Card>
  )
}

function CreateOrderForm({ appealId }: { appealId: string }) {
  const { data, ui, run, actor } = useApp()
  const appeal = byId(data.appeals, appealId)!
  const [clientId, setClientId] = useState(appeal.clientId ?? '')
  const [product, setProduct] = useState('')
  const [qty, setQty] = useState('')
  const [unit, setUnit] = useState<Unit>('кг')
  const [price, setPrice] = useState('')
  const [shipDue, setShipDue] = useState(addDays(14))
  const [error, setError] = useState<string | null>(null)
  const [opKey] = useState(newOpKey)
  if (appeal.orderId) {
    return (
      <Card title="4. Заказ по обращению">
        <p>
          Создан заказ <Linkish route={{ page: 'order', orderId: appeal.orderId }}>{byId(data.orders, appeal.orderId)?.number}</Linkish>.
        </p>
      </Card>
    )
  }
  if (ui.role !== 'manager' && ui.role !== 'rop') {
    return (
      <Card title="4. Создать связанный заказ">
        <NeedRole roles={['manager']} text="Заказ по запросу на покупку создаёт менеджер." />
      </Card>
    )
  }
  const submit = () => {
    const err = run(
      (d) => appealCreateOrder(d, actor, { appealId, clientId, product, qty: Number(qty.replace(',', '.')), unit, price: Number(price.replace(/\s/g, '')), shipDue, opKey }),
      'Заказ создан на этапе «Новый»',
    )
    setError(err)
  }
  return (
    <Card title="4. Создать связанный заказ">
      <div className="form">
        <Field label="Клиент">
          <select className="input" value={clientId} onChange={(e) => setClientId(e.target.value)}>
            <option value="">— выберите —</option>
            {data.clients.map((c) => (
              <option key={c.id} value={c.id}>
                {c.name}
              </option>
            ))}
          </select>
        </Field>
        <Field label="Продукция">
          <input className="input" value={product} onChange={(e) => setProduct(e.target.value)} placeholder="Например, Краска ВД фасадная" />
        </Field>
        <div className="form-row">
          <Field label="Количество">
            <input className="input" inputMode="decimal" value={qty} onChange={(e) => setQty(e.target.value)} />
          </Field>
          <Field label="Единица">
            <select className="input" value={unit} onChange={(e) => setUnit(e.target.value as Unit)}>
              <option value="кг">кг</option>
              <option value="л">л</option>
              <option value="шт">шт</option>
            </select>
          </Field>
          <Field label="Цена, сум">
            <input className="input" inputMode="numeric" value={price} onChange={(e) => setPrice(e.target.value)} />
          </Field>
        </div>
        <Field label="Срок отгрузки">
          <input className="input" type="date" min={DEMO_DATE} value={shipDue} onChange={(e) => setShipDue(e.target.value)} />
        </Field>
        <p className="small muted">Создание заказа не порождает долг клиента автоматически.</p>
        <FormError error={error} />
        <div className="form-actions">
          <button className="btn btn-primary" onClick={submit}>
            Создать заказ
          </button>
        </div>
      </div>
    </Card>
  )
}
