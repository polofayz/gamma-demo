import { useEffect, useState, type ReactNode } from 'react'
import { canSeeMoney, newOpKey, useApp } from '../app/ctx'
import { changeShipDue, createJobs, returnOrder, ropApprove, submitToRop, techApprove } from '../domain/actions'
import {
  acceptFlag,
  acceptedQty,
  availableToReceive,
  availableToShip,
  byId,
  canSeeRecipe,
  clientName,
  debtSum,
  directionName,
  enterpriseName,
  isOverdueShipment,
  lineAccepted,
  lineAmount,
  lineProduced,
  lineShipped,
  orderAmount,
  orderBalances,
  orderJobs,
  orderLines,
  paidAmount,
  personName,
  personTitle,
  producedQty,
  recipeFor,
  workshopName,
} from '../domain/calc'
import { daysOnStage, formatDate, formatDateTime, formatQty } from '../domain/format'
import { ACCEPT_LABEL, FLOW, JOB_LABEL, STAGE_LABEL, STAGE_NEED, toneForJob } from '../domain/labels'
import type { Job, Order, Route, Stage } from '../domain/types'
import { DEMO_DATE } from '../domain/types'
import { Badge, Card, Empty, Field, FormError, KV, Modal, Money, NeedRole, PageHead, TableWrap } from '../ui/kit'
import { OutputModal, PauseModal, ReceiveModal, ShipModal, useStartJob } from '../ui/ops'
import { DebtsTable, HistoryList, LinkedTasks, ShipBadge, StageBadge } from '../ui/shared'

export function OrderPage({ route }: { route: Extract<Route, { page: 'order' }> }) {
  const { data, ui, openTaskForm } = useApp()
  const order = byId(data.orders, route.orderId)
  const [dueOpen, setDueOpen] = useState(false)

  useEffect(() => {
    if (!route.anchor) return
    const t = setTimeout(() => document.getElementById(route.anchor!)?.scrollIntoView({ behavior: 'smooth', block: 'start' }), 60)
    return () => clearTimeout(t)
  }, [route.anchor])

  if (!order) return <Empty title="Заказ не найден" text="Возможно, демонстрация была сброшена." />

  const obligations = data.obligations.filter((o) => o.orderId === order.id)
  const shipments = data.shipments.filter((s) => s.orderId === order.id)
  const jobs = orderJobs(data, order.id)
  const amount = orderAmount(data, order.id)
  const paid = obligations.reduce((sum, o) => sum + paidAmount(data, o.id), 0)
  const debt = debtSum(data, obligations)

  return (
    <div className="page">
      <PageHead
        title={`Заказ ${order.number} · ${clientName(data, order.clientId)}`}
        sub={
          <span className="row-gap">
            <StageBadge order={order} />
            <ShipBadge order={order} />
            <span>
              {enterpriseName(data, order.enterpriseId)} · {directionName(data, order.directionId)}
            </span>
          </span>
        }
      >
        <button className="btn btn-primary" onClick={() => openTaskForm({ linkType: 'order', linkId: order.id, directionId: order.directionId, assigneeId: order.stageResponsibleId })}>
          Поставить поручение
        </button>
        {(ui.role === 'director' || ui.role === 'rop') && order.stage !== 'shipped_full' && (
          <button className="btn" onClick={() => setDueOpen(true)}>
            Изменить срок отгрузки
          </button>
        )}
      </PageHead>

      <RouteBlock order={order} />

      <div className="grid-3">
        <Card title="Основные данные">
          <KV
            items={[
              ['Клиент', clientName(data, order.clientId)],
              ['Предприятие', enterpriseName(data, order.enterpriseId)],
              ['Направление', directionName(data, order.directionId)],
              ['Номер заказа', order.number],
              ['Условный контракт', order.contractNumber],
            ]}
          />
        </Card>
        <Card title="Сроки">
          <KV
            items={[
              ['Дата создания', formatDate(order.createdAt)],
              [
                'Срок отгрузки',
                <>
                  {formatDate(order.shipDue)}
                  {order.originalShipDue !== order.shipDue && (
                    <div className="cell-note">
                      Первоначально {formatDate(order.originalShipDue)} · {order.shipDueChangeReason}
                    </div>
                  )}
                </>,
              ],
              ['Срок текущего этапа', order.stage === 'shipped_full' ? '—' : formatDate(order.stageDue)],
            ]}
          />
        </Card>
        <Card title="Ответственные">
          <KV
            items={[
              ['Менеджер', personTitle(data, order.managerId)],
              ['Текущий этап', order.stage === 'shipped_full' ? 'Завершён' : personTitle(data, order.stageResponsibleId)],
              ['РОП направления', personTitle(data, byId(data.directions, order.directionId)?.ropId)],
            ]}
          />
        </Card>
      </div>

      <Card title="Продукция и количества" aside={<span className="small muted">Выпуск, приёмка складом и отгрузка учитываются отдельно</span>}>
        <TableWrap>
          <thead>
            <tr>
              <th>Наименование</th>
              <th className="r">Заказано</th>
              <th className="r">Цена</th>
              <th className="r">Сумма</th>
              <th className="r">Выпущено</th>
              <th className="r">Принято складом</th>
              <th className="r">Отгружено</th>
              <th className="r">Осталось отгрузить</th>
              <th className="r">Можно отгрузить сейчас</th>
            </tr>
          </thead>
          <tbody>
            {orderLines(data, order.id).map((line) => (
              <tr key={line.id}>
                <td>{line.name}</td>
                <td className="r num">{formatQty(line.qty, line.unit)}</td>
                <td className="r">
                  <Money value={line.price} />
                </td>
                <td className="r">
                  <Money value={lineAmount(line)} />
                </td>
                <td className="r num">{formatQty(lineProduced(data, line.id), line.unit)}</td>
                <td className="r num">{formatQty(lineAccepted(data, line.id), line.unit)}</td>
                <td className="r num">{formatQty(lineShipped(data, line.id), line.unit)}</td>
                <td className="r num strong">{formatQty(line.qty - lineShipped(data, line.id), line.unit)}</td>
                <td className="r num">{formatQty(availableToShip(data, line.id), line.unit)}</td>
              </tr>
            ))}
          </tbody>
        </TableWrap>
        {orderBalances(data, order.id).length > 1 && <p className="small muted">Количества в разных единицах не складываются.</p>}
      </Card>

      <Card title="Финансы" aside={<span className="small muted">Условные финансовые документы. Реальный источник — уточняется с бухгалтерией/1С</span>}>
        <div id="finance" />
        {canSeeMoney(ui.role) ? (
          <>
            <div className="summary-strip">
              <div>
                <span>Сумма заказа</span>
                <strong>
                  <Money value={amount} />
                </strong>
              </div>
              <div>
                <span>Обязательства</span>
                <strong>
                  <Money value={obligations.reduce((s, o) => s + o.amount, 0)} />
                </strong>
              </div>
              <div>
                <span>Оплачено</span>
                <strong>
                  <Money value={paid} />
                </strong>
              </div>
              <div>
                <span>Долг</span>
                <strong>
                  <Money value={debt} />
                </strong>
              </div>
              <div>
                <span>Статус оплаты</span>
                <strong className="small">
                  {!obligations.length ? 'Обязательств нет' : debt <= 0 ? 'Оплачено' : paid > 0 ? 'Оплачено частично' : 'Не оплачено'}
                </strong>
              </div>
            </div>
            <p className="small muted">Статус оплаты показан отдельно и не блокирует запуск производства без подтверждения правил клиентом.</p>
            {obligations.length ? <DebtsTable obligations={obligations} compact /> : <Empty title="Обязательств по заказу нет" text="Создание заказа само по себе не порождает долг клиента." />}
          </>
        ) : (
          <p className="muted">Финансовые данные скрыты для демонстрационной роли «{roleTitle(ui.role)}».</p>
        )}
      </Card>

      <ProductionBlock jobs={jobs} />

      <Card title="Отгрузки" aside={<ShipButton order={order} />}>
        {shipments.length ? (
          <TableWrap>
            <thead>
              <tr>
                <th>Дата</th>
                <th>Позиция</th>
                <th className="r">Количество</th>
                <th>Документ (демо)</th>
                <th>Сотрудник</th>
              </tr>
            </thead>
            <tbody>
              {shipments.map((s) => (
                <tr key={s.id}>
                  <td>{formatDateTime(s.at)}</td>
                  <td>{byId(data.lines, s.lineId)?.name}</td>
                  <td className="r num">{formatQty(s.qty, s.unit)}</td>
                  <td>{s.docNumber}</td>
                  <td>{personName(data, s.employeeId)}</td>
                </tr>
              ))}
            </tbody>
          </TableWrap>
        ) : (
          <Empty title="Отгрузок пока не было" />
        )}
        {isOverdueShipment(data, order) && (
          <p className="small text-red">Отгрузка просрочена. Заказ уйдёт из просроченных только после полной отгрузки или зафиксированного изменения срока.</p>
        )}
      </Card>

      <RecipeBlock order={order} />

      <Card title="Поручения по заказу">
        <LinkedTasks linkType="order" linkId={order.id} directionId={order.directionId} />
      </Card>

      <Card title="Документы">
        <ul className="plain">
          <li>Условный контракт {order.contractNumber}</li>
          {obligations.map((o) => (
            <li key={o.id}>Финансовый документ {o.docNumber}</li>
          ))}
          {data.prodEvents
            .filter((e) => jobs.some((j) => j.id === e.jobId) && e.paperDoc && e.type === 'output')
            .map((e) => (
              <li key={e.id}>
                Бумажный наряд цеха {e.paperDoc}
                {e.attachment && (
                  <>
                    {' '}
                    ·{' '}
                    <a href={`${import.meta.env.BASE_URL}${e.attachment}`} target="_blank" rel="noreferrer">
                      демонстрационный файл
                    </a>
                  </>
                )}
              </li>
            ))}
          {shipments.map((s) => (
            <li key={s.id}>Накладная {s.docNumber}</li>
          ))}
        </ul>
      </Card>

      <Card title="История действий">
        <HistoryList entityType="order" entityId={order.id} />
      </Card>

      {dueOpen && <ShipDueModal order={order} onClose={() => setDueOpen(false)} />}
    </div>
  )
}

function roleTitle(role: string) {
  const map: Record<string, string> = {
    technologist: 'Технолог',
    production_head: 'Начальник производства',
    warehouse: 'Сотрудник склада',
    purchaser: 'Снабженец',
  }
  return map[role] ?? role
}

function RouteBlock({ order }: { order: Order }) {
  const { data } = useApp()
  const current = order.stage === 'shipped_full' ? FLOW.length : FLOW.indexOf(order.stage)
  const late = order.stage !== 'shipped_full' && order.stageDue < DEMO_DATE
  return (
    <Card title="Маршрут заказа" aside={<span className="small muted">Предлагаемый порядок — уточняется с вашей командой</span>}>
      <ol className="stepper">
        {FLOW.map((stage, i) => {
          const state = i < current ? 'done' : i === current ? 'active' : 'todo'
          const label = stage === 'shipped_partial' ? 'Частично / полностью отгружено' : STAGE_LABEL[stage]
          return (
            <li key={stage} className={`step step-${state}`}>
              <span className="step-dot">{state === 'done' ? '✓' : i + 1}</span>
              <span className="step-label">{label}</span>
            </li>
          )
        })}
      </ol>

      {order.returnReason && (
        <div className="callout callout-amber">
          <strong>Заказ возвращён {order.returnedFrom === 'rop' ? 'РОПом на корректировку' : 'технологом на уточнение'}.</strong> Причина: {order.returnReason}. Последняя
          завершённая стадия: {order.lastCompletedStage ? STAGE_LABEL[order.lastCompletedStage] : '—'}. Ответственный за уточнение: {personTitle(data, order.stageResponsibleId)}.
        </div>
      )}

      {order.stage === 'shipped_full' ? (
        <div className="callout callout-green">
          <Badge tone="green">Завершено</Badge> Заказ полностью отгружен.
        </div>
      ) : (
        <div className={`active-stage ${late ? 'is-late' : ''}`}>
          <div className="active-grid">
            <div>
              <span className="lbl">Этап</span>
              <strong>{STAGE_LABEL[order.stage]}</strong>
            </div>
            <div>
              <span className="lbl">Что требуется</span>
              <strong>{STAGE_NEED[order.stage]}</strong>
            </div>
            <div>
              <span className="lbl">Кто отвечает</span>
              <strong>{personTitle(data, order.stageResponsibleId)}</strong>
            </div>
            <div>
              <span className="lbl">До какой даты</span>
              <strong>
                {formatDate(order.stageDue)} {late ? <Badge tone="red">Срок этапа прошёл</Badge> : <Badge tone="neutral">В срок</Badge>}
              </strong>
            </div>
            <div>
              <span className="lbl">Находится на этапе</span>
              <strong>{daysOnStage(order.stageEnteredAt)}</strong>
            </div>
          </div>
          <StageActions order={order} />
        </div>
      )}
    </Card>
  )
}

function StageActions({ order }: { order: Order }) {
  const { data, ui, run, actor } = useApp()
  const [comment, setComment] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [wsId, setWsId] = useState(order.preferredWorkshopId)
  const [due, setDue] = useState(order.shipDue > DEMO_DATE ? order.shipDue : DEMO_DATE)
  const [output, setOutput] = useState<string | null>(null)
  const [receive, setReceive] = useState<Job | null>(null)
  const [shipOpen, setShipOpen] = useState(false)
  const [opKey] = useState(newOpKey)
  const startJob = useStartJob()
  const role = ui.role
  const jobs = orderJobs(data, order.id)

  const act = (fn: Parameters<typeof run>[0], ok: string) => {
    const err = run(fn, ok)
    setError(err)
    if (!err) setComment('')
  }

  const stage: Stage = order.stage
  let body: ReactNode = null

  if (stage === 'new') {
    body =
      role === 'manager' || role === 'rop' ? (
        <div className="actions">
          <button className="btn btn-primary" onClick={() => act((d) => submitToRop(d, actor, order.id), 'Отправлено на согласование РОП')}>
            Отправить на согласование РОП
          </button>
        </div>
      ) : (
        <NeedRole roles={['manager']} text="Менеджер уточняет заказ и отправляет его на согласование." />
      )
  }

  if (stage === 'rop' || stage === 'technologist') {
    const needed = stage === 'rop' ? 'rop' : 'technologist'
    body =
      role === needed ? (
        <div className="stack">
          {stage === 'technologist' && <p className="small muted">Перед подтверждением проверьте блок «Рецептура» ниже.</p>}
          <Field label={stage === 'rop' ? 'Комментарий (обязателен при возврате)' : 'Комментарий (обязателен при возврате на уточнение)'}>
            <textarea className="input" rows={2} value={comment} onChange={(e) => setComment(e.target.value)} placeholder="Например, уточнить цену или упаковку" />
          </Field>
          <div className="actions">
            <button
              className="btn btn-primary"
              onClick={() =>
                act(
                  (d) => (stage === 'rop' ? ropApprove(d, actor, order.id, comment) : techApprove(d, actor, order.id, comment)),
                  stage === 'rop' ? 'РОП согласовал заказ' : 'Проверка технолога подтверждена',
                )
              }
            >
              {stage === 'rop' ? 'Согласовать' : 'Подтвердить проверку'}
            </button>
            <button className="btn" onClick={() => act((d) => returnOrder(d, actor, order.id, comment), 'Заказ возвращён с комментарием')}>
              {stage === 'rop' ? 'Вернуть на корректировку' : 'Вернуть на уточнение'}
            </button>
          </div>
        </div>
      ) : (
        <NeedRole roles={[needed]} text={stage === 'rop' ? 'РОП согласовывает заказ или возвращает с комментарием.' : 'Технолог подтверждает проверку или возвращает заказ.'} />
      )
  }

  if (stage === 'job_prep') {
    const waiting = jobs.filter((j) => j.state === 'waiting')
    body =
      role === 'production_head' ? (
        jobs.length === 0 ? (
          <div className="form-row align-end">
            <Field label="Цех">
              <select className="input" value={wsId} onChange={(e) => setWsId(e.target.value)}>
                {data.workshops
                  .filter((w) => w.enterpriseId === order.enterpriseId)
                  .map((w) => (
                    <option key={w.id} value={w.id}>
                      {w.name}
                    </option>
                  ))}
              </select>
            </Field>
            <Field label="Срок выпуска">
              <input className="input" type="date" min={DEMO_DATE} value={due} onChange={(e) => setDue(e.target.value)} />
            </Field>
            <button className="btn btn-primary" onClick={() => act((d) => createJobs(d, actor, { orderId: order.id, workshopId: wsId, due, opKey }), 'Производственное задание подготовлено')}>
              Сформировать задание
            </button>
          </div>
        ) : (
          <div className="actions">
            {waiting.map((j) => (
              <button key={j.id} className="btn btn-primary" onClick={() => setError(startJob(j))}>
                Зафиксировать начало · {workshopName(data, j.workshopId)}
              </button>
            ))}
          </div>
        )
      ) : (
        <NeedRole roles={['production_head']} text="Начальник производства готовит задание и фиксирует начало." />
      )
  }

  if (stage === 'production' || stage === 'ready_transfer') {
    const toReceive = jobs.filter((j) => availableToReceive(data, j.id) > 0)
    const inWork = jobs.filter((j) => j.state === 'in_progress')
    const paused = jobs.filter((j) => j.state === 'paused' || j.state === 'waiting')
    if ((role === 'production_head' || role === 'director') && stage === 'production') {
      body = (
        <div className="actions">
          {inWork.map((j) => (
            <button key={j.id} className="btn btn-primary" onClick={() => setOutput(j.id)}>
              Внести выпуск · {workshopName(data, j.workshopId)}
            </button>
          ))}
          {paused.map((j) => (
            <button key={j.id} className="btn" onClick={() => setError(startJob(j))}>
              {j.state === 'paused' ? 'Возобновить' : 'Начать'} · {workshopName(data, j.workshopId)}
            </button>
          ))}
        </div>
      )
    } else if ((role === 'warehouse' || role === 'director') && toReceive.length) {
      body = (
        <div className="actions">
          {toReceive.map((j) => (
            <button key={j.id} className="btn btn-primary" onClick={() => setReceive(j)}>
              Подтвердить поступление на склад · {formatQty(availableToReceive(data, j.id), j.unit)}
            </button>
          ))}
        </div>
      )
    } else {
      body =
        stage === 'production' ? (
          <NeedRole roles={['production_head', 'warehouse']} text="Производство фиксирует выпуск, склад отдельно подтверждает поступление." />
        ) : (
          <NeedRole roles={['warehouse']} text="Выпуск завершён. Склад отдельно подтверждает фактически принятое количество." />
        )
    }
  }

  if (stage === 'warehouse' || stage === 'shipped_partial') {
    const canShip = orderLines(data, order.id).some((l) => availableToShip(data, l.id) > 0)
    body =
      role === 'warehouse' ? (
        canShip ? (
          <div className="actions">
            <button className="btn btn-primary" onClick={() => setShipOpen(true)}>
              Добавить отгрузку (частичную или полную)
            </button>
          </div>
        ) : (
          <p className="small muted">Нет принятого на склад количества для отгрузки.</p>
        )
      ) : (
        <NeedRole roles={['warehouse']} text="Ответственный за отгрузку добавляет частичную или полную отгрузку." />
      )
  }

  return (
    <div className="stage-actions">
      {body}
      <FormError error={error} />
      {output && <OutputModal jobId={output} onClose={() => setOutput(null)} />}
      {receive && <ReceiveModal job={receive} onClose={() => setReceive(null)} />}
      {shipOpen && <ShipModal orderId={order.id} onClose={() => setShipOpen(false)} />}
    </div>
  )
}

function ProductionBlock({ jobs }: { jobs: Job[] }) {
  const { data, ui } = useApp()
  const [pause, setPause] = useState<Job | null>(null)
  const [output, setOutput] = useState<string | null>(null)
  const [receive, setReceive] = useState<Job | null>(null)
  const startJob = useStartJob()
  const [error, setError] = useState<string | null>(null)
  const canProduce = ui.role === 'production_head' || ui.role === 'director'
  const canReceive = ui.role === 'warehouse' || ui.role === 'director'
  const events = data.prodEvents.filter((e) => jobs.some((j) => j.id === e.jobId)).sort((a, b) => b.at.localeCompare(a.at))
  const supplies = data.supplies.filter((s) => s.jobIds.some((id) => jobs.some((j) => j.id === id)))
  return (
    <Card title="Производство" aside={<span className="small muted">Подробные операции цеха остаются на бумаге. В системе фиксируются события и результат</span>}>
      {jobs.length ? (
        <TableWrap>
          <thead>
            <tr>
              <th>Цех</th>
              <th>Ответственный</th>
              <th className="r">План</th>
              <th className="r">Выполнено</th>
              <th className="r">Принято складом</th>
              <th>Срок</th>
              <th>Состояние</th>
              <th>Приёмка</th>
              <th>Причина задержки</th>
              <th />
            </tr>
          </thead>
          <tbody>
            {jobs.map((job) => {
              const flag = acceptFlag(data, job)
              const diff = producedQty(data, job.id) - acceptedQty(data, job.id)
              return (
                <tr key={job.id}>
                  <td>{workshopName(data, job.workshopId)}</td>
                  <td>{personName(data, job.responsibleId)}</td>
                  <td className="r num">{formatQty(job.plannedQty, job.unit)}</td>
                  <td className="r num">{formatQty(producedQty(data, job.id), job.unit)}</td>
                  <td className="r num">
                    {formatQty(acceptedQty(data, job.id), job.unit)}
                    {diff > 0 && <div className="cell-note text-amber">не принято {formatQty(diff, job.unit)}</div>}
                  </td>
                  <td className="nowrap">{formatDate(job.due)}</td>
                  <td>
                    <Badge tone={job.state !== 'done' && job.due < DEMO_DATE ? 'red' : toneForJob(job.state)}>{JOB_LABEL[job.state]}</Badge>
                  </td>
                  <td>
                    <Badge tone={flag === 'full' ? 'green' : flag === 'partial' ? 'amber' : 'neutral'}>{ACCEPT_LABEL[flag]}</Badge>
                  </td>
                  <td>{job.delayReason ?? <span className="muted">—</span>}</td>
                  <td className="nowrap">
                    {canProduce && job.state === 'in_progress' && (
                      <>
                        <button className="btn btn-sm btn-primary" onClick={() => setOutput(job.id)}>
                          Выпуск
                        </button>{' '}
                        <button className="btn btn-sm" onClick={() => setPause(job)}>
                          Приостановить
                        </button>
                      </>
                    )}
                    {canProduce && job.state === 'paused' && (
                      <button className="btn btn-sm" onClick={() => setError(startJob(job))}>
                        Возобновить
                      </button>
                    )}
                    {canReceive && diff > 0 && (
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
        <Empty title="Производственных заданий пока нет" text={`Задание появится на этапе «${STAGE_LABEL.job_prep}».`} />
      )}
      <FormError error={error} />
      {supplies.length > 0 && (
        <div className="callout callout-neutral mt">
          Связанные поставки сырья (заданы вручную в демонаборе):{' '}
          {supplies.map((s, i) => (
            <span key={s.id}>
              {i > 0 && ', '}
              {s.number} {s.material}
            </span>
          ))}
          . Подробности — в разделе «Поставки сырья».
        </div>
      )}
      {events.length > 0 && (
        <details className="mt">
          <summary>События цехов · {events.length}</summary>
          <ul className="plain small">
            {events.map((e) => (
              <li key={e.id}>
                {formatDateTime(e.at)} · {e.type === 'output' ? `Выпуск ${formatQty(e.qty, e.unit)}` : e.type === 'start' ? 'Начало' : e.type === 'pause' ? 'Остановка' : 'Возобновление'}
                {e.paperDoc && ` · документ ${e.paperDoc}`}
                {e.signedBy && ` · подписал ${e.signedBy}`}
                {e.comment && ` · ${e.comment}`}
                {e.attachment && ' · приложен демонстрационный файл'}
              </li>
            ))}
          </ul>
        </details>
      )}
      {pause && <PauseModal job={pause} onClose={() => setPause(null)} />}
      {output && <OutputModal jobId={output} onClose={() => setOutput(null)} />}
      {receive && <ReceiveModal job={receive} onClose={() => setReceive(null)} />}
    </Card>
  )
}

function ShipButton({ order }: { order: Order }) {
  const { data, ui } = useApp()
  const [open, setOpen] = useState(false)
  const can = orderLines(data, order.id).some((l) => availableToShip(data, l.id) > 0)
  if (ui.role !== 'warehouse' || !can) return null
  return (
    <>
      <button className="btn btn-sm btn-primary" onClick={() => setOpen(true)}>
        Добавить отгрузку
      </button>
      {open && <ShipModal orderId={order.id} onClose={() => setOpen(false)} />}
    </>
  )
}

function RecipeBlock({ order }: { order: Order }) {
  const { data, ui } = useApp()
  const line = orderLines(data, order.id)[0]
  if (!line) return null
  const recipe = recipeFor(line.name)
  return (
    <Card title="Рецептура" aside={<Badge tone="blue">Условная · только для демонстрации доступа</Badge>}>
      {canSeeRecipe(ui.role) ? (
        <div className="stack">
          <p className="small muted">
            {recipe.title}. Каркас не рассчитывает технологию, себестоимость, нормы расхода и замену компонентов. Статус проверки:{' '}
            {order.recipeChecked ? <Badge tone="green">Проверено технологом</Badge> : <Badge tone="amber">Ожидает проверки</Badge>}
          </p>
          <TableWrap>
            <thead>
              <tr>
                <th>Компонент</th>
                <th className="r">Доля</th>
              </tr>
            </thead>
            <tbody>
              {recipe.rows.map((r) => (
                <tr key={r.component}>
                  <td>{r.component}</td>
                  <td className="r">{r.share}</td>
                </tr>
              ))}
            </tbody>
          </TableWrap>
        </div>
      ) : (
        <div className="callout callout-neutral">
          <strong>Рецептура доступна только уполномоченным сотрудникам.</strong> Ограничение показано для демонстрации и не является защитой данных: настоящей авторизации в каркасе нет.
        </div>
      )}
    </Card>
  )
}

function ShipDueModal({ order, onClose }: { order: Order; onClose: () => void }) {
  const { run, actor } = useApp()
  const [date, setDate] = useState(order.shipDue > DEMO_DATE ? order.shipDue : DEMO_DATE)
  const [reason, setReason] = useState('')
  const [error, setError] = useState<string | null>(null)
  const submit = () => {
    const err = run((d) => changeShipDue(d, actor, order.id, date, reason), 'Срок отгрузки изменён, история сохранена')
    if (err) return setError(err)
    onClose()
  }
  return (
    <Modal title="Изменить условия отгрузки" onClose={onClose}>
      <div className="form">
        <p className="small muted">
          Текущий срок {formatDate(order.shipDue)}, первоначальный {formatDate(order.originalShipDue)}. Перенос записывается в историю и не скрывает задержку.
        </p>
        <Field label="Новый срок отгрузки">
          <input className="input" type="date" min={DEMO_DATE} value={date} onChange={(e) => setDate(e.target.value)} />
        </Field>
        <Field label="Основание изменения">
          <textarea className="input" rows={2} value={reason} onChange={(e) => setReason(e.target.value)} placeholder="Например, письмо клиента о переносе приёмки" />
        </Field>
        <FormError error={error} />
        <div className="form-actions">
          <button className="btn" onClick={onClose}>
            Отмена
          </button>
          <button className="btn btn-primary" onClick={submit}>
            Сохранить
          </button>
        </div>
      </div>
    </Modal>
  )
}
