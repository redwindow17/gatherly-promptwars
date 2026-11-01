import type { Plan } from '../../domain/types';
import { budgetSummary } from '../../domain/planner';
import { dateLabel, money } from '../format';

export function PrintReport({ plan }: { plan: Plan }) {
  const summary = budgetSummary(plan);
  return (
    <article className="print-report">
      <p>GATHERLY · YOUR CELEBRATION PLAN</p>
      <h1>{plan.brief.title}</h1>
      <p>
        {dateLabel(plan.brief.date)} · {plan.brief.location} · {plan.brief.guests} guests
      </p>
      <p>
        {plan.source === 'gemini' ? 'Generated with Gemini' : 'Starter template'} · Saved{' '}
        {new Date(plan.createdAt).toLocaleDateString('en-IN')}
      </p>
      <h2>The big picture</h2>
      <p>{plan.summary}</p>
      <h2>Budget</h2>
      <p>
        Total: {money(plan.brief.budgetPaise)} · Reserve: {money(plan.reservePaise)} ·{' '}
        {summary.overBudgetPaise
          ? `Over budget: ${money(summary.overBudgetPaise)}`
          : `Unallocated: ${money(summary.remainingPaise)}`}
      </p>
      <table>
        <thead>
          <tr>
            <th>Category</th>
            <th>Estimate</th>
            <th>Planning note</th>
          </tr>
        </thead>
        <tbody>
          {plan.budgetItems.map((item) => (
            <tr key={item.id}>
              <td>{item.category}</td>
              <td>{money(item.amountPaise)}</td>
              <td>{item.rationale}</td>
            </tr>
          ))}
        </tbody>
      </table>
      <h2>Timeline</h2>
      <ul>
        {plan.tasks.map((task) => (
          <li key={task.id}>
            {task.done ? '☑' : '☐'} {dateLabel(task.date)} — {task.title} ({task.owner})
            {task.urgent && !task.done ? ' · Start now' : ''}
          </li>
        ))}
      </ul>
      <h2>Vendor conversations</h2>
      {plan.vendors.map((vendor) => (
        <section key={vendor.id}>
          <h3>{vendor.category}</h3>
          <ul>
            {vendor.questions.map((question) => (
              <li key={question.id}>
                {question.done ? '☑' : '☐'} {question.text}
              </li>
            ))}
          </ul>
        </section>
      ))}
      <h2>Ideas</h2>
      {plan.ideas.map((idea, index) => (
        <section key={index}>
          <h3>{idea.title}</h3>
          <p>{idea.description}</p>
        </section>
      ))}
      {plan.cautions.length ? (
        <>
          <h2>Keep in mind</h2>
          <ul>
            {plan.cautions.map((caution, index) => (
              <li key={index}>{caution}</li>
            ))}
          </ul>
        </>
      ) : null}
      {plan.brief.notes ? (
        <>
          <h2>Your notes</h2>
          <p>{plan.brief.notes}</p>
        </>
      ) : null}
      <footer>
        Estimates are a planning guide, not quotes. Confirm all dates, availability, and agreements
        directly.
      </footer>
    </article>
  );
}
