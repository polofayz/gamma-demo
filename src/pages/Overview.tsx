import { canSeeMoney, useApp } from '../app/ctx'
import { decisions, directionRows, enterpriseName, isTaskAwaiting, kpis, lastAction, personName, personTitle } from '../domain/calc'
import { formatDate, formatMoney } from '../domain/format'
import { ROLE_LABEL, STAGE_LABEL } from '../domain/labels'
import type { Route } from '../domain/types'
import { DEMO_DATE } from '../domain/types'
import { Badge, Card, CountLink, Empty, Linkish, Money, PageHead, TableWrap } from '../ui/kit'
import { TaskBadge } from '../ui/shared'

export function Overview() {
  const { data, ui, go, openTaskForm } = useApp()
  const ent = ui.enterpriseId
  const k = kpis(data, ent)
  const rows = directionRows(data, ent)
  const issues = decisions(data, ent)
  const money = canSeeMoney(ui.role)
  const stamp = `валюта: сум · состояние на ${formatDate(DEMO_DATE)}`

  const cards: { label: string; value: string; note: string; tone: 'red' | 'amber' | 'neutral'; route: Route; extra?: string }[] = [
    { label: 'Заказы в работе', value: String(k.inWork.length), note: 'не завершены полной отгрузкой', tone: 'neutral', route: { page: 'orders', inWork: true } },
    { label: 'Просроченные отгрузки', value: String(k.overdueShip.length), note: 'срок прошёл, есть неотгруженный остаток', tone: k.overdueShip.length ? 'red' : 'neutral', route: { page: 'finance', tab: 'shipments', overdue: true } },
    {
      label: 'Задолженность клиентов',
      value: money ? formatMoney(k.debt) : 'скрыто',
      note: stamp,
      tone: 'neutral',
      route: { page: 'finance', tab: 'debts', openOnly: true },
      extra: `${k.debtDocs.length} док.`,
    },
    {
      label: 'Просроченная задолженность',
      value: money ? formatMoney(k.overdueDebt) : 'скрыто',
      note: `${stamp} · входит в общую`,
      tone: k.overdueDebt ? 'red' : 'neutral',
      route: { page: 'finance', tab: 'debts', overdue: true },
      extra: `${k.overdueDebtDocs.length} док.`,
    },
    { label: 'Необработанные обращения', value: String(k.unprocessed.length), note: 'нет зафиксированного результата', tone: k.unprocessed.length ? 'amber' : 'neutral', route: { page: 'calls', focus: 'unprocessed' } },
    {
      label: 'Просроченные поручения',
      value: String(k.overdueTasks.length),
      note: 'срок прошёл, результат не отправлен',
      tone: k.overdueTasks.length ? 'red' : 'neutral',
      route: { page: 'tasks', focus: 'overdue' },
      extra: `ещё ${k.awaitingTasks.length} ждут вашей проверки`,
    },
    { label: 'Задержанные поставки', value: String(k.delayedSupplies.length), note: 'плановая дата прошла, есть неполученный остаток', tone: k.delayedSupplies.length ? 'red' : 'neutral', route: { page: 'supplies', delayed: true } },
  ]

  return (
    <div className="page">
      <PageHead
        title="Обзор директора"
        sub={
          <>
            {ent === 'all' ? 'Все предприятия' : enterpriseName(data, ent)} · состояние на {formatDate(DEMO_DATE)}. Здесь видно, где нужна ваша реакция.
          </>
        }
      />

      {ui.role !== 'director' && <MyQueue />}

      <div className="kpi-grid">
        {cards.map((card) => (
          <button key={card.label} className={`kpi kpi-${card.tone}`} onClick={() => go(card.route)}>
            <span className="kpi-label">{card.label}</span>
            <span className="kpi-value">{card.value}</span>
            <span className="kpi-note">{card.note}</span>
            {card.extra && <span className="kpi-extra">{card.extra}</span>}
            <span className="kpi-open">Открыть записи →</span>
          </button>
        ))}
      </div>

      <Card title="Направления">
        <TableWrap>
          <thead>
            <tr>
              <th>Направление</th>
              <th>Ответственный РОП</th>
              <th className="r">Активные заказы</th>
              <th className="r">Задержанные отгрузки</th>
              <th className="r">Долг</th>
              <th className="r">Просроченный долг</th>
              <th className="r">Необработанные обращения</th>
              <th className="r">Просроченные поручения</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((row) => (
              <tr key={row.directionId}>
                <td>
                  <Linkish route={{ page: 'direction', directionId: row.directionId, tab: 'orders' }}>
                    <strong>{row.name}</strong>
                  </Linkish>
                </td>
                <td>{personName(data, row.ropId)}</td>
                <td className="r">
                  <CountLink value={row.inWork.length} route={{ page: 'orders', directionId: row.directionId, inWork: true }} />
                </td>
                <td className="r">
                  <CountLink value={row.overdueShip.length} tone="red" route={{ page: 'finance', tab: 'shipments', directionId: row.directionId, overdue: true }} />
                </td>
                <td className="r">
                  <Linkish route={{ page: 'finance', tab: 'debts', directionId: row.directionId, openOnly: true }}>
                    <Money value={row.debt} />
                  </Linkish>
                </td>
                <td className="r">
                  <Linkish route={{ page: 'finance', tab: 'debts', directionId: row.directionId, overdue: true }}>
                    <span className={row.overdueDebt ? 'text-red' : ''}>
                      <Money value={row.overdueDebt} />
                    </span>
                  </Linkish>
                </td>
                <td className="r">
                  <CountLink value={row.unprocessed.length} tone="amber" route={{ page: 'calls', directionId: row.directionId, focus: 'unprocessed' }} />
                </td>
                <td className="r">
                  <CountLink value={row.overdueTasks.length} tone="red" route={{ page: 'tasks', directionId: row.directionId, focus: 'overdue' }} />
                </td>
              </tr>
            ))}
          </tbody>
        </TableWrap>
        <p className="small muted">
          Нажатие на число открывает список, из которого оно рассчитано. Обращения без назначенного направления в таблицу не попадают — их видно в сводной карточке и в разделе «Звонки и обращения».
        </p>
      </Card>

      <Card title={`Требует решения · ${issues.length}`} aside={<span className="small muted">Факты и сроки, без оценки сотрудников</span>}>
        {issues.length ? (
          <TableWrap>
            <thead>
              <tr>
                <th>Тип проблемы</th>
                <th>Объект</th>
                <th>Причина</th>
                <th>Срок</th>
                <th>Ответственный</th>
                <th>Следующее действие</th>
                <th>Последнее действие</th>
                <th />
              </tr>
            </thead>
            <tbody>
              {issues.map((issue) => {
                const late = issue.due < DEMO_DATE
                const route: Route =
                  issue.entityType === 'order'
                    ? { page: 'order', orderId: issue.entityId }
                    : issue.entityType === 'appeal'
                      ? { page: 'appeal', appealId: issue.entityId }
                      : { page: 'supply', supplyId: issue.entityId }
                return (
                  <tr key={issue.id}>
                    <td>
                      <Badge tone={late ? 'red' : 'amber'}>{late ? 'Просрочено' : 'Ожидает'}</Badge>
                      <div className="strong mt-xs">{issue.type}</div>
                    </td>
                    <td>{issue.objectLabel}</td>
                    <td>{issue.reason}</td>
                    <td className="nowrap">{formatDate(issue.due)}</td>
                    <td>{personTitle(data, issue.responsibleId)}</td>
                    <td>{issue.next}</td>
                    <td className="small">{lastAction(data, issue.entityType, issue.entityId)}</td>
                    <td className="nowrap">
                      <button className="btn btn-sm btn-primary" onClick={() => go(route)}>
                        Открыть
                      </button>{' '}
                      <button
                        className="btn btn-sm btn-ghost"
                        onClick={() =>
                          openTaskForm({
                            linkType: issue.linkType,
                            linkId: issue.entityId,
                            assigneeId: issue.responsibleId ?? undefined,
                            title: `${issue.type}: ${issue.next.toLowerCase()}`,
                          })
                        }
                      >
                        Поручить
                      </button>
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </TableWrap>
        ) : (
          <Empty title="Нет проблем, требующих решения" text="Все сроки выдерживаются по выбранному предприятию." />
        )}
      </Card>
    </div>
  )
}

function MyQueue() {
  const { data, ui, actor, go } = useApp()
  const myRole = ui.role
  const roleEmployees = new Set(data.employees.filter((e) => e.role === myRole).map((e) => e.id))
  const orders = data.orders.filter((o) => o.stage !== 'shipped_full' && roleEmployees.has(o.stageResponsibleId))
  const tasks = data.tasks.filter((t) => roleEmployees.has(t.assigneeId) && t.state !== 'confirmed')
  const toCheck = data.tasks.filter((t) => roleEmployees.has(t.authorId) && isTaskAwaiting(t))
  return (
    <Card title={`Рабочее место: ${ROLE_LABEL[myRole]}`} aside={<span className="small muted">{personTitle(data, actor.employeeId)}</span>} className="card-accent">
      <div className="queue">
        <div>
          <h3>Заказы на моём этапе · {orders.length}</h3>
          {orders.length ? (
            <ul className="plain">
              {orders.map((o) => (
                <li key={o.id}>
                  <button className="linkish" onClick={() => go({ page: 'order', orderId: o.id })}>
                    {o.number}
                  </button>{' '}
                  · {STAGE_LABEL[o.stage]} · до {formatDate(o.stageDue)}
                </li>
              ))}
            </ul>
          ) : (
            <p className="muted small">Нет заказов, ожидающих действия этой роли.</p>
          )}
        </div>
        <div>
          <h3>Мои поручения · {tasks.length}</h3>
          {tasks.length ? (
            <ul className="plain">
              {tasks.map((t) => (
                <li key={t.id}>
                  <button className="linkish" onClick={() => go({ page: 'task', taskId: t.id })}>
                    {t.number} · {t.title}
                  </button>{' '}
                  <TaskBadge task={t} />
                </li>
              ))}
            </ul>
          ) : (
            <p className="muted small">Активных поручений нет.</p>
          )}
        </div>
        {toCheck.length > 0 && (
          <div>
            <h3>Ждут моей проверки · {toCheck.length}</h3>
            <ul className="plain">
              {toCheck.map((t) => (
                <li key={t.id}>
                  <button className="linkish" onClick={() => go({ page: 'task', taskId: t.id })}>
                    {t.number} · {t.title}
                  </button>
                </li>
              ))}
            </ul>
          </div>
        )}
      </div>
    </Card>
  )
}
