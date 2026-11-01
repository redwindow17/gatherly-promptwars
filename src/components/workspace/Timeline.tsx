import { useState, type FormEvent } from 'react';
import { Check, CheckCheck, Clock3, ListChecks, PencilLine, Plus } from 'lucide-react';
import type { Task } from '../../domain/types';
import { isCalendarDate } from '../../domain/validation';
import { localToday } from '../format';
import type { ViewProps } from './types';
import { TaskCheck } from './TaskCheck';

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
