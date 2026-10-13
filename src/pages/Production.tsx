import { useState } from 'react'
import { useApp } from '../app/ctx'
import { acceptFlag, acceptedQty, byId, clientName, enterpriseMatch, personName, producedQty, workshopName } from '../domain/calc'
import { formatDate, formatQty } from '../domain/format'
import { ACCEPT_LABEL, JOB_LABEL, toneForJob } from '../domain/labels'
import type { Job, JobState, Route } from '../domain/types'
import { DEMO_DATE } from '../domain/types'
import { Badge, Card, Empty, FormError, Linkish, NeedRole, PageHead, TableWrap } from '../ui/kit'
import { OutputModal, PauseModal, ReceiveModal, useStartJob } from '../ui/ops'

type ProdRoute = Extract<Route, { page: 'production' }>

export function ProductionPage({ route }: { route: ProdRoute }) {
  const { data, ui, replace } = useApp()
  const [output, setOutput] = useState<string | null>(null)
  const [outputAny, setOutputAny] = useState(false)
  const [pause, setPause] = useState<Job | null>(null)
  const [receive, setReceive] = useState<Job | null>(null)
  const [error, setError] = useState<string | null>(null)
  const startJob = useStartJob()
  const set = (patch: Partial<ProdRoute>) => replace({ ...route, ...patch })

  const workshops = data.workshops.filter((w) => enterpriseMatch(w.enterpriseId, ui.enterpriseId))
  const jobs = data.jobs.filter((job) => {
    const ws = byId(data.workshops, job.workshopId)
    if (!ws || !enterpriseMatch(ws.enterpriseId, ui.enterpriseId)) return false
    if (route.workshopId && job.workshopId !== route.workshopId) return false
    if (route.state && job.state !== route.state) return false
    return true
  })
  const pending = jobs.filter((j) => producedQty(data, j.id) - acceptedQty(data, j.id) > 1e-9)
  const isHead = ui.role === 'production_head' || ui.role === 'director'
  const isWh = ui.role === 'warehouse' || ui.role === 'director'

  return (
    <div className="page">
      <PageHead title="Производство и передача на склад" sub={`Цехов в демонстрации: ${workshops.length}. У начальника производства 11 цехов — список расширяется без переделки экрана.`}>
        <select className="input" value={route.workshopId ?? ''} onChange={(e) => set({ workshopId: e.target.value || undefined })}>
          <option value="">Все цеха</option>
          {workshops.map((w) => (
            <option key={w.id} value={w.id}>
              {w.name}
            </option>
          ))}
        </select>
        <select className="input" value={route.state ?? ''} onChange={(e) => set({ state: (e.target.value || undefined) as JobState | undefined })}>
          <option value="">Все состояния</option>
          {(Object.keys(JOB_LABEL) as JobState[]).map((s) => (
            <option key={s} value={s}>
              {JOB_LABEL[s]}
            </option>
          ))}
        </select>
        {isHead && (
          <button className="btn btn-primary" onClick={() => setOutputAny(true)}>
            Ввести результат цеха
          </button>
        )}
      </PageHead>

      <p className="paper-note">Подробные операции цеха остаются на бумаге. В системе фиксируются события и результат.</p>
      {!isHead && !isWh && <NeedRole roles={['production_head', 'warehouse']} text="Здесь видно, где находится заказ. Ввод результата и приёмку выполняют рабочие места." />}

      <div className="ws-strip">
        {workshops.map((w) => {
          const list = data.jobs.filter((j) => j.workshopId === w.id && j.state !== 'done')
          const late = list.filter((j) => j.due < DEMO_DATE).length
          return (
            <button key={w.id} className={route.workshopId === w.id ? 'ws-card active' : 'ws-card'} onClick={() => set({ workshopId: route.workshopId === w.id ? undefined : w.id })}>
              <strong>{w.name}</strong>
              <span>
                Активных заданий: {list.length}
                {late ? <span className="text-red"> · просрочено {late}</span> : null}
              </span>
            </button>
          )
        })}
      </div>

      <Card title={`Задания · ${jobs.length}`}>
        {jobs.length ? (
          <TableWrap>
            <thead>
              <tr>
                <th>Заказ</th>
                <th>Продукция</th>
                <th className="r">План</th>
                <th>Цех</th>
                <th>Ответственный</th>
                <th>Срок</th>
                <th>Состояние</th>
                <th className="r">Выполнено</th>
                <th className="r">Принято складом</th>
                <th>Причина задержки</th>
                <th />
              </tr>
            </thead>
            <tbody>
              {jobs.map((job) => {
                const order = byId(data.orders, job.orderId)!
                const line = byId(data.lines, job.lineId)
                const flag = acceptFlag(data, job)
                const diff = producedQty(data, job.id) - acceptedQty(data, job.id)
                const late = job.state !== 'done' && job.due < DEMO_DATE
                return (
                  <tr key={job.id}>
                    <td>
                      <Linkish route={{ page: 'order', orderId: order.id }}>{order.number}</Linkish>
                      <div className="cell-note">{clientName(data, order.clientId)}</div>
                    </td>
                    <td>{line?.name}</td>
                    <td className="r num">{formatQty(job.plannedQty, job.unit)}</td>
                    <td>{workshopName(data, job.workshopId)}</td>
                    <td>{personName(data, job.responsibleId)}</td>
                    <td className="nowrap">
                      {formatDate(job.due)}
                      {late && <div className="cell-note text-red">срок прошёл</div>}
                    </td>
                    <td>
                      <Badge tone={late ? 'red' : toneForJob(job.state)}>{JOB_LABEL[job.state]}</Badge>
                    </td>
                    <td className="r num">{formatQty(producedQty(data, job.id), job.unit)}</td>
                    <td className="r">
                      <span className="num">{formatQty(acceptedQty(data, job.id), job.unit)}</span>
                      <div>
                        <Badge tone={flag === 'full' ? 'green' : flag === 'partial' ? 'amber' : 'neutral'}>{ACCEPT_LABEL[flag]}</Badge>
                      </div>
                    </td>
                    <td>{job.delayReason ?? <span className="muted">—</span>}</td>
                    <td className="nowrap">
                      {isHead && job.state === 'in_progress' && (
                        <>
                          <button className="btn btn-sm btn-primary" onClick={() => setOutput(job.id)}>
                            Выпуск
                          </button>{' '}
                          <button className="btn btn-sm" onClick={() => setPause(job)}>
                            Приостановить
                          </button>
                        </>
                      )}
                      {isHead && (job.state === 'paused' || job.state === 'waiting') && (
                        <button className="btn btn-sm" onClick={() => setError(startJob(job))}>
                          {job.state === 'paused' ? 'Возобновить' : 'Начать'}
                        </button>
                      )}
                      {isWh && diff > 0 && (
                        <button className="btn btn-sm btn-primary" onClick={() => setReceive(job)}>
                          Принять на склад
                        </button>
                      )}
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </TableWrap>
        ) : (
          <Empty title="Заданий нет" text="Измените фильтр цеха или состояния." />
        )}
        <FormError error={error} />
      </Card>

      <Card title={`Ожидаемая передача на склад · ${pending.length}`} aside={<span className="small muted">Выпущено, но склад ещё не подтвердил приёмку</span>}>
        {pending.length ? (
          <TableWrap>
            <thead>
              <tr>
                <th>Заказ</th>
                <th>Цех</th>
                <th className="r">Выпущено</th>
                <th className="r">Принято</th>
                <th className="r">Разница</th>
                <th />
              </tr>
            </thead>
            <tbody>
              {pending.map((job) => {
                const order = byId(data.orders, job.orderId)!
                return (
                  <tr key={job.id}>
                    <td>
                      <Linkish route={{ page: 'order', orderId: order.id }}>{order.number}</Linkish>
                    </td>
                    <td>{workshopName(data, job.workshopId)}</td>
                    <td className="r num">{formatQty(producedQty(data, job.id), job.unit)}</td>
                    <td className="r num">{formatQty(acceptedQty(data, job.id), job.unit)}</td>
                    <td className="r num text-amber strong">{formatQty(producedQty(data, job.id) - acceptedQty(data, job.id), job.unit)}</td>
                    <td>
                      {isWh ? (
                        <button className="btn btn-sm btn-primary" onClick={() => setReceive(job)}>
                          Принять на склад
                        </button>
                      ) : (
                        <span className="small muted">Подтверждает склад ГП</span>
                      )}
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </TableWrap>
        ) : (
          <Empty title="Всё выпущенное принято складом" />
        )}
        <p className="small muted">Количества в кг, литрах и штуках не складываются в общий показатель «Выпущено».</p>
      </Card>

      {output && <OutputModal jobId={output} onClose={() => setOutput(null)} />}
      {outputAny && <OutputModal onClose={() => setOutputAny(false)} />}
      {pause && <PauseModal job={pause} onClose={() => setPause(null)} />}
      {receive && <ReceiveModal job={receive} onClose={() => setReceive(null)} />}
    </div>
  )
}
