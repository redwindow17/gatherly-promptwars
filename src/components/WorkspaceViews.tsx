import { useState, type FormEvent } from 'react';
import {
  ArrowRight,
  Check,
  CheckCheck,
  ChevronDown,
  Clipboard,
  Clock3,
  Flower2,
  Lightbulb,
  ListChecks,
  PencilLine,
  Plus,
  Sparkles,
} from 'lucide-react';
import type { Plan, Task } from '../domain/types';
import { budgetSummary } from '../domain/planner';
import { isCalendarDate } from '../domain/validation';
import { dateLabel, daysTo, localToday, money } from './format';

export type WorkspaceTab = 'overview' | 'budget' | 'timeline' | 'vendors' | 'ideas' | 'activity';
interface ViewProps {
  plan: Plan;
  onChange: (plan: Plan) => void;
}

function TaskCheck({ task, onToggle }: { task: Task; onToggle: () => void }) {
  const due = daysTo(task.date);
  return (
    <div className={`task-item ${task.done ? 'task-done' : ''}`}>
      <label className="task-checkbox">
        <input type="checkbox" checked={task.done} onChange={onToggle} />
        <span aria-hidden="true">{task.done ? <Check size={13} strokeWidth={2.5} /> : null}</span>
        <span className="sr-only">
          Mark {task.title} {task.done ? 'incomplete' : 'complete'}
        </span>
      </label>
      <div className="task-copy">
        <strong>{task.title}</strong>
        <div className="task-meta">
          <span className={!task.done && due <= 0 ? 'due-now' : ''}>
            {!task.done && due < 0 ? 'Overdue · ' : !task.done && due === 0 ? 'Today · ' : ''}
            {dateLabel(task.date, { day: 'numeric', month: 'short' })}
          </span>
          <span className="meta-dot">·</span>
          <span>{task.owner}</span>
          {task.urgent && !task.done ? <span className="urgency-tag">Start now</span> : null}
        </div>
      </div>
    </div>
  );
}

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

function TaskEditForm({
  task,
  onSave,
  onCancel,
  eventDate,
}: {
  task?: Task;
  onSave: (task: Task) => void;
  onCancel: () => void;
  eventDate: string;
}) {
  const [title, setTitle] = useState(task?.title ?? '');
  const [date, setDate] = useState(
    task?.date ?? (localToday() > eventDate ? eventDate : localToday()),
  );
  const [owner, setOwner] = useState(task?.owner ?? 'You');
  const [error, setError] = useState('');
  function submit(event: FormEvent) {
    event.preventDefault();
    if (!title.trim() || !owner.trim() || !isCalendarDate(date) || date > eventDate) {
      setError('Add a title, an owner, and a valid date on or before your event.');
      return;
    }
    onSave({
      id: task?.id ?? `task-${crypto.randomUUID()}`,
      title: title.trim(),
      date,
      owner: owner.trim(),
      done: task?.done ?? false,
      urgent: date <= localToday(),
    });
  }
  return (
    <form className="task-edit-form" onSubmit={submit}>
      <div className="form-grid">
        <label className="full-width">
          Task
          <input
            autoFocus
            required
            maxLength={160}
            value={title}
            onChange={(event) => setTitle(event.target.value)}
            placeholder="What needs to happen?"
          />
        </label>
        <label>
          Due date
          <input
            type="date"
            required
            value={date}
            max={eventDate}
            onChange={(event) => setDate(event.target.value)}
          />
        </label>
        <label>
          Who’s taking care of it?
          <input
            required
            maxLength={80}
            value={owner}
            onChange={(event) => setOwner(event.target.value)}
          />
        </label>
      </div>
      {error ? (
        <p className="input-error" role="alert">
          {error}
        </p>
      ) : null}
      <div className="inline-actions">
        <button className="button primary compact" type="submit">
          <Check size={15} />
          Save task
        </button>
        <button className="button secondary compact" type="button" onClick={onCancel}>
          Cancel
        </button>
      </div>
    </form>
  );
}

export function Timeline({ plan, onChange }: ViewProps) {
  const [filter, setFilter] = useState<'all' | 'open' | 'done'>('all');
  const [editing, setEditing] = useState<string | null>(null);
  const completed = plan.tasks.filter((task) => task.done).length;
  const tasks = plan.tasks
    .filter((task) => filter === 'all' || (filter === 'done' ? task.done : !task.done))
    .sort((a, b) => Number(a.done) - Number(b.done) || a.date.localeCompare(b.date));
  const urgent = plan.tasks.filter(
    (task) => !task.done && (task.urgent || task.date <= localToday()),
  ).length;
  return (
    <section className="view-section" aria-labelledby="timeline-heading">
      <div className="section-heading">
        <div>
          <span className="eyebrow">SMALL STEPS, BEAUTIFULLY TIMED</span>
          <h2 id="timeline-heading">Make room for the moment.</h2>
          <p className="muted">
            A clear path from today to the day. Check off each step as you go.
          </p>
        </div>
        <button
          className="button secondary compact"
          onClick={() => setEditing('new')}
          disabled={editing !== null || plan.tasks.length >= 30}
          title={plan.tasks.length >= 30 ? 'A plan supports up to 30 tasks' : undefined}
        >
          <Plus size={16} />
          Add a task
        </button>
      </div>
      <div className="timeline-progress">
        <ListChecks size={21} strokeWidth={1.5} />
        <span>
          <strong>
            {completed} of {plan.tasks.length}
          </strong>{' '}
          tasks complete
        </span>
        <div className="progress-track">
          <span
            style={{ width: `${plan.tasks.length ? (completed / plan.tasks.length) * 100 : 0}%` }}
          />
        </div>
        <strong>
          {Math.round(plan.tasks.length ? (completed / plan.tasks.length) * 100 : 0)}%
        </strong>
      </div>
      {urgent ? (
        <p className="urgency-note">
          <Clock3 size={16} />
          {urgent} {urgent === 1 ? 'task needs' : 'tasks need'} attention now. Close event dates
          bring early planning steps forward to today.
        </p>
      ) : null}
      <div className="list-toolbar">
        <div className="filter-buttons" aria-label="Filter tasks">
          {(['all', 'open', 'done'] as const).map((value) => (
            <button
              key={value}
              className={filter === value ? 'active' : ''}
              aria-pressed={filter === value}
              onClick={() => setFilter(value)}
            >
              {value === 'all' ? 'All tasks' : value === 'open' ? 'To do' : 'Completed'}
            </button>
          ))}
        </div>
        <span>
          {tasks.length} {tasks.length === 1 ? 'task' : 'tasks'}
        </span>
      </div>
      {editing === 'new' ? (
        <TaskEditForm
          eventDate={plan.brief.date}
          onCancel={() => setEditing(null)}
          onSave={(task) => {
            onChange({ ...plan, tasks: [...plan.tasks, task] });
            setEditing(null);
          }}
        />
      ) : null}
      <div className="timeline-list">
        {tasks.map((task) =>
          editing === task.id ? (
            <TaskEditForm
              key={task.id}
              task={task}
              eventDate={plan.brief.date}
              onCancel={() => setEditing(null)}
              onSave={(updated) => {
                onChange({
                  ...plan,
                  tasks: plan.tasks.map((item) => (item.id === task.id ? updated : item)),
                });
                setEditing(null);
              }}
            />
          ) : (
            <div className="timeline-row" key={task.id}>
              <TaskCheck
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
              <button
                className="icon-button"
                aria-label={`Edit task: ${task.title}`}
                onClick={() => setEditing(task.id)}
                disabled={editing !== null}
              >
                <PencilLine size={16} />
              </button>
            </div>
          ),
        )}
      </div>
      {!tasks.length ? (
        <div className="empty-list">
          <CheckCheck size={30} strokeWidth={1.2} />
          <h3>
            {filter === 'done' ? 'Your first checkmark is waiting.' : 'A little breathing room.'}
          </h3>
          <p>
            {filter === 'done'
              ? 'Completed tasks will appear here.'
              : 'No tasks in this view. Add a task whenever you need one.'}
          </p>
        </div>
      ) : null}
    </section>
  );
}

export function Vendors({ plan, onChange }: ViewProps) {
  return (
    <section className="view-section" aria-labelledby="vendors-heading">
      <div className="section-heading">
        <div>
          <span className="eyebrow">THE RIGHT PEOPLE MAKE ALL THE DIFFERENCE</span>
          <h2 id="vendors-heading">Ask a little. Know a lot.</h2>
          <p className="muted">
            Bring these questions to your conversations. Check them off once discussed.
          </p>
        </div>
      </div>
      <p className="subtle-note">
        Planning checklists, not vendor recommendations. Confirm availability, terms, and quotes
        directly.
      </p>
      <div className="vendor-grid">
        {plan.vendors.map((vendor, index) => {
          const done = vendor.questions.filter((question) => question.done).length;
          return (
            <section className="vendor-sheet" key={vendor.id}>
              <div className="vendor-sheet-heading">
                <span className="sheet-number">{String(index + 1).padStart(2, '0')}</span>
                <span className="vendor-count">
                  {done}/{vendor.questions.length} discussed
                </span>
              </div>
              <h3>{vendor.category}</h3>
              <div className="mini-progress">
                <span
                  style={{
                    width: `${vendor.questions.length ? (done / vendor.questions.length) * 100 : 0}%`,
                  }}
                />
              </div>
              <div className="vendor-questions">
                {vendor.questions.map((question) => (
                  <label
                    className={`question-row ${question.done ? 'checked' : ''}`}
                    key={question.id}
                  >
                    <input
                      type="checkbox"
                      checked={question.done}
                      onChange={() =>
                        onChange({
                          ...plan,
                          vendors: plan.vendors.map((item) =>
                            item.id === vendor.id
                              ? {
                                  ...item,
                                  questions: item.questions.map((row) =>
                                    row.id === question.id ? { ...row, done: !row.done } : row,
                                  ),
                                }
                              : item,
                          ),
                        })
                      }
                    />
                    <span className="question-checkbox" aria-hidden="true">
                      {question.done ? <Check size={12} strokeWidth={2.5} /> : null}
                    </span>
                    <span>{question.text}</span>
                  </label>
                ))}
              </div>
            </section>
          );
        })}
      </div>
    </section>
  );
}

export function Ideas({ plan }: { plan: Plan }) {
  return (
    <section className="view-section" aria-labelledby="ideas-heading">
      <div className="section-heading">
        <div>
          <span className="eyebrow">THE DETAILS THEY’LL REMEMBER</span>
          <h2 id="ideas-heading">A little spark, just for you.</h2>
          <p className="muted">
            Thoughtful touches inspired by your brief. Take what feels like you.
          </p>
        </div>
        <span className="section-icon">
          <Sparkles size={23} strokeWidth={1.3} />
        </span>
      </div>
      <div className="ideas-list">
        {plan.ideas.map((idea, index) => (
          <article className="idea-row" key={index}>
            <span className="idea-number">{String(index + 1).padStart(2, '0')}</span>
            <div>
              <h3>{idea.title}</h3>
              <p>{idea.description}</p>
            </div>
            <Flower2 className="idea-flower" size={38} strokeWidth={0.8} aria-hidden="true" />
          </article>
        ))}
      </div>
      {plan.brief.notes ? (
        <aside className="brief-notes">
          <span className="eyebrow">YOUR ORIGINAL NOTES</span>
          <p>{plan.brief.notes}</p>
        </aside>
      ) : null}
    </section>
  );
}

function Transcript({ title, text }: { title: string; text: string }) {
  const [copyState, setCopyState] = useState('Copy');
  async function copy() {
    try {
      await navigator.clipboard.writeText(text);
      setCopyState('Copied');
    } catch {
      setCopyState('Select text to copy');
    }
    window.setTimeout(() => setCopyState('Copy'), 2500);
  }
  return (
    <details className="transcript">
      <summary>
        <span>{title}</span>
        <ChevronDown size={16} />
      </summary>
      <div className="transcript-body">
        <button className="text-button" onClick={copy}>
          <Clipboard size={14} />
          {copyState}
        </button>
        <pre>{text}</pre>
      </div>
    </details>
  );
}

export function AIActivity({ plan }: { plan: Plan }) {
  return (
    <section className="view-section" aria-labelledby="activity-heading">
      <div className="section-heading">
        <div>
          <span className="eyebrow">A CLEAR LOOK BEHIND YOUR PLAN</span>
          <h2 id="activity-heading">Good planning is an open book.</h2>
          <p className="muted">See where your suggestions came from and what shaped them.</p>
        </div>
      </div>
      <div className="activity-record">
        <span className="activity-icon">
          <Sparkles size={25} strokeWidth={1.25} />
        </span>
        <div>
          <span className="source-badge">
            {plan.source === 'gemini' ? 'Generated with Gemini' : 'Starter template'}
          </span>
          <h3>
            {plan.source === 'gemini'
              ? 'A real response to your event brief.'
              : 'A practical starting point. Ready for your edits.'}
          </h3>
          <p>
            {plan.source === 'gemini'
              ? 'Gemini suggested the structure and ideas. Gatherly calculated exact budget amounts and task dates. Review suggestions against your real needs.'
              : 'This plan uses a local, event-specific template. No AI request was made and no vendor information was verified.'}
          </p>
          <div className="activity-meta">
            <span>Created {new Date(plan.createdAt).toLocaleString('en-IN')}</span>
            {plan.ai?.model ? <span>Model: {plan.ai.model}</span> : null}
          </div>
        </div>
      </div>
      {plan.ai ? (
        <div className="transcripts">
          <Transcript title="The prompt sent to Gemini" text={plan.ai.prompt} />
          <Transcript title="The response received from Gemini" text={plan.ai.response} />
          <p className="fine-print">
            This is the recorded generation. Your later budget and checklist edits are saved
            separately in the plan.
          </p>
        </div>
      ) : plan.source === 'gemini' ? (
        <div className="notice">The generation transcript is not available in this saved plan.</div>
      ) : (
        <p className="starter-explanation">
          <Flower2 size={20} strokeWidth={1.2} />
          Ready for a fresh perspective? Edit your event brief and create a new plan with Gemini
          when it’s connected.
        </p>
      )}
    </section>
  );
}

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
