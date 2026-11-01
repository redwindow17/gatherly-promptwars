import {
  ArrowRight,
  ChevronRight,
  CircleHelp,
  Flower2,
  Leaf,
  NotebookPen,
  Plus,
  RefreshCw,
  Sparkles,
  Trash2,
  Users,
} from 'lucide-react';
import type { Plan } from '../domain/types';
import { dateLabel } from './format';

interface Props {
  plans: Plan[];
  activeId: string | null;
  formMode: boolean;
  busy: boolean;
  healthBusy: boolean;
  health: { aiConfigured: boolean } | null;
  showHelp: boolean;
  newPlan: () => void;
  openPlan: (id: string) => void;
  removePlan: (plan: Plan) => void;
  checkHealth: () => void;
  toggleHelp: () => void;
}

function GatheringMark() {
  return (
    <span className="brand-mark" aria-hidden="true">
      <svg viewBox="0 0 36 36" fill="none">
        <path
          d="M18 29V14M18 23C8 23 5 17 6 10c7 0 12 5 12 13ZM18 19C18 10 23 6 30 6c0 8-4 13-12 13Z"
          stroke="currentColor"
          strokeWidth="1.5"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
        <path
          d="m10 15 8 8m7-11-7 7"
          stroke="currentColor"
          strokeWidth="1.2"
          strokeLinecap="round"
        />
      </svg>
    </span>
  );
}

export function GatheringSidebar({
  plans,
  activeId,
  formMode,
  busy,
  healthBusy,
  health,
  showHelp,
  newPlan,
  openPlan,
  removePlan,
  checkHealth,
  toggleHelp,
}: Props) {
  const active = plans.find((plan) => plan.id === activeId);
  return (
    <aside className="sidebar" aria-label="Saved gatherings">
      <a
        className="brand"
        href="#main-content"
        onClick={(event) => {
          event.preventDefault();
          if (!busy) {
            if (active) openPlan(active.id);
            else newPlan();
          }
        }}
      >
        <GatheringMark />
        <span>
          gatherly<span className="brand-period">.</span>
        </span>
      </a>
      <p className="brand-tagline">Good things happen together.</p>
      <button className="new-gathering" onClick={newPlan} disabled={busy}>
        <Plus size={17} strokeWidth={1.5} />
        <span>New gathering</span>
        <ArrowRight size={15} />
      </button>
      <div className="saved-nav-header">
        <span className="eyebrow">YOUR GATHERINGS</span>
        <span className="saved-count">{plans.length}</span>
      </div>
      <nav className="saved-list" aria-label="Local saved plans">
        {plans.length ? (
          plans.map((plan) => (
            <div
              className={`saved-item ${!formMode && activeId === plan.id ? 'active' : ''}`}
              key={plan.id}
            >
              <button
                className="saved-plan-button"
                onClick={() => openPlan(plan.id)}
                disabled={busy}
              >
                <span className="saved-plan-icon">
                  {plan.brief.type === 'birthday' ? (
                    <Flower2 size={18} strokeWidth={1.4} />
                  ) : plan.brief.type === 'community' ? (
                    <Users size={18} strokeWidth={1.4} />
                  ) : (
                    <Leaf size={18} strokeWidth={1.4} />
                  )}
                </span>
                <span className="saved-plan-copy">
                  <strong>{plan.brief.title}</strong>
                  <small>
                    {dateLabel(plan.brief.date, {
                      day: 'numeric',
                      month: 'short',
                      year: 'numeric',
                    })}
                  </small>
                </span>
                <ChevronRight className="saved-chevron" size={14} />
              </button>
              <button
                className="delete-plan"
                disabled={busy}
                aria-label={`Delete local plan: ${plan.brief.title}`}
                onClick={() => removePlan(plan)}
              >
                <Trash2 size={13} />
              </button>
            </div>
          ))
        ) : (
          <div className="empty-saved">
            <NotebookPen size={24} strokeWidth={1.1} />
            <p>
              A good day starts
              <br />
              with a little plan.
            </p>
            <span>
              Your saved gatherings
              <br />
              will live here.
            </span>
          </div>
        )}
      </nav>
      <div className="sidebar-bottom">
        <div className="local-storage-note">
          <span className="status-dot" />
          <span>Saved locally in this browser</span>
        </div>
        <p>Up to 12 plans. No account needed.</p>
        <div className="connection-row">
          <span>
            <Sparkles size={13} />
            {healthBusy
              ? 'Checking Gemini…'
              : health?.aiConfigured
                ? 'Gemini connected'
                : health
                  ? 'Starter mode available'
                  : 'Connection not checked'}
          </span>
          <button
            className="icon-button"
            disabled={healthBusy || busy}
            onClick={() => void checkHealth()}
            aria-label="Check Gemini connection"
          >
            <RefreshCw size={13} className={healthBusy ? 'spin' : ''} />
          </button>
        </div>
        <button className="help-button" onClick={toggleHelp} aria-expanded={showHelp}>
          <CircleHelp size={15} />A note about your plans
          <ArrowRight size={13} />
        </button>
      </div>
    </aside>
  );
}
