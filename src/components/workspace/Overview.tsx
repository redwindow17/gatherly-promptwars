import { ArrowRight, CheckCheck, Flower2, Lightbulb } from 'lucide-react';
import { budgetSummary } from '../../domain/planner';
import { dateLabel, daysTo, money } from '../format';
import type { WorkspaceTab, ViewProps } from './types';
import { TaskCheck } from './TaskCheck';

export function Overview({
  plan,
  onChange,
  onTab,
}: ViewProps & { onTab: (tab: WorkspaceTab) => void }) {
  const summary = budgetSummary(plan);
  const completed = plan.tasks.filter((task) => task.done).length;
  const next = plan.tasks
    .filter((task) => !task.done)
    .sort((a, b) => a.date.localeCompare(b.date))
    .slice(0, 3);
  const days = daysTo(plan.brief.date);
  const questions = plan.vendors.flatMap((vendor) => vendor.questions);
  const answered = questions.filter((question) => question.done).length;
  return (
    <div className="overview-view">
      <section className="event-story">
        <div className="story-copy">
          <span className="eyebrow">A PLAN FOR YOUR KIND OF CELEBRATION</span>
          <h2>
            Less to juggle.
            <br />
            <em>More to look forward to.</em>
          </h2>
          <p>{plan.summary}</p>
          <div className="story-priorities">
            {plan.brief.priorities.map((priority) => (
              <span key={priority}>{priority}</span>
            ))}
          </div>
        </div>
        <div className="countdown">
          <div className="countdown-flower" aria-hidden="true">
            <Flower2 size={112} strokeWidth={0.65} />
          </div>
          <span className="eyebrow">{days >= 0 ? 'THE COUNTDOWN' : 'THE MEMORIES'}</span>
          <strong>{Math.abs(days)}</strong>
          <span>
            {days > 0
              ? 'days until your gathering'
              : days === 0
                ? 'your gathering is today'
                : 'days since your gathering'}
          </span>
          <div className="countdown-line" />
          <small>{dateLabel(plan.brief.date)}</small>
        </div>
      </section>
      <div className="overview-metrics">
        <button onClick={() => onTab('budget')}>
          <span className="metric-label">Your budget</span>
          <strong>{money(plan.brief.budgetPaise)}</strong>
          <span className={summary.overBudgetPaise ? 'negative metric-detail' : 'metric-detail'}>
            {summary.overBudgetPaise
              ? `${money(summary.overBudgetPaise)} over budget`
              : `${money(plan.reservePaise)} held in reserve`}
            <ArrowRight size={14} />
          </span>
        </button>
        <div>
          <span className="metric-label">People to celebrate with</span>
          <strong>
            {plan.brief.guests.toLocaleString('en-IN')}
            <span className="metric-unit">guests</span>
          </strong>
          <span className="metric-detail">{money(summary.perGuestPaise)} budget per guest</span>
        </div>
        <button onClick={() => onTab('timeline')}>
          <span className="metric-label">Making it happen</span>
          <strong>
            {completed}
            <span className="metric-unit">of {plan.tasks.length} tasks done</span>
          </strong>
          <span className="metric-detail">
            One little step at a time
            <ArrowRight size={14} />
          </span>
        </button>
      </div>
      <div className="overview-bottom">
        <section className="next-steps">
          <div className="row-heading">
            <h3>Your next little steps</h3>
            <button className="text-button" onClick={() => onTab('timeline')}>
              View timeline <ArrowRight size={14} />
            </button>
          </div>
          {next.length ? (
            next.map((task) => (
              <TaskCheck
                key={task.id}
                task={task}
                onToggle={() =>
                  onChange({
                    ...plan,
                    tasks: plan.tasks.map((item) =>
                      item.id === task.id ? { ...item, done: !item.done } : item,
                    ),
                  })
                }
              />
            ))
          ) : (
            <div className="complete-message">
              <CheckCheck size={24} />
              <p>All your tasks are complete. Take a moment to enjoy it.</p>
            </div>
          )}
        </section>
        <section className="vendor-nudge">
          <span className="eyebrow">GOOD QUESTIONS, GREAT GATHERINGS</span>
          <h3>
            Find the right people
            <br />
            for your day.
          </h3>
          <p>Thoughtful questions for each vendor, so the important details don’t get missed.</p>
          <span className="vendor-progress">
            {answered} of {questions.length} questions checked
          </span>
          <button className="text-button" onClick={() => onTab('vendors')}>
            Open vendor checklists <ArrowRight size={15} />
          </button>
        </section>
      </div>
      {plan.cautions.length ? (
        <aside className="considerations">
          <Lightbulb size={19} />
          <div>
            <h3>A few things to keep in mind</h3>
            <ul>
              {plan.cautions.map((caution, index) => (
                <li key={index}>{caution}</li>
              ))}
            </ul>
          </div>
        </aside>
      ) : null}
    </div>
  );
}
