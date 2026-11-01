import { Check } from 'lucide-react';
import type { Task } from '../../domain/types';
import { dateLabel, daysTo } from '../format';

export function TaskCheck({ task, onToggle }: { task: Task; onToggle: () => void }) {
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
