import { useEffect, useRef, useState } from 'react';
import {
  ArrowDownToLine,
  ArrowLeft,
  ArrowRight,
  CalendarDays,
  Check,
  ChevronRight,
  CircleHelp,
  Flower2,
  Leaf,
  ListChecks,
  LoaderCircle,
  MapPin,
  NotebookPen,
  Plus,
  Printer,
  RefreshCw,
  Sparkles,
  Trash2,
  Users,
  Wallet,
  X,
} from 'lucide-react';
import type { EventBrief, Plan } from './domain/types';
import { createPlan } from './domain/planner';
import { validateStoredPlan } from './domain/validation';
import { starterAdvice } from './domain/starter';
import { exportPlanCalendar } from './domain/calendar';
import { loadPlans, savePlans } from './lib/storage';
import { BriefForm } from './components/BriefForm';
import { BudgetEditor } from './components/BudgetEditor';
import {
  AIActivity,
  Ideas,
  Overview,
  PrintReport,
  Timeline,
  Vendors,
  type WorkspaceTab,
} from './components/WorkspaceViews';
import { EVENT_LABELS, dateLabel, saveTextFile } from './components/format';

interface Health {
  aiConfigured: boolean;
  model: string;
}
function boot() {
  try {
    return { plans: loadPlans(), error: '' };
  } catch (error) {
    return {
      plans: [] as Plan[],
      error:
        error instanceof Error
          ? error.message
          : 'Saved plans could not be loaded. You can start a new plan.',
    };
  }
}
const tabs: { id: WorkspaceTab; label: string; icon: typeof Leaf }[] = [
  { id: 'overview', label: 'Overview', icon: Leaf },
  { id: 'budget', label: 'Budget', icon: Wallet },
  { id: 'timeline', label: 'Timeline', icon: ListChecks },
  { id: 'vendors', label: 'Vendors', icon: Users },
  { id: 'ideas', label: 'Ideas', icon: Flower2 },
  { id: 'activity', label: 'AI activity', icon: Sparkles },
];

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

function WelcomeStory() {
  return (
    <div className="welcome-story">
      <div className="welcome-kicker">
        <span className="short-line" />
        <span className="eyebrow">GOOD TIMES START HERE</span>
      </div>
      <h1>
        For the moments
        <br />
        that bring us
        <br />
        <em>together.</em>
      </h1>
      <p className="welcome-description">
        From the first idea to the final little detail. A thoughtful home for your next celebration.
      </p>
      <div className="welcome-illustration" aria-hidden="true">
        <svg viewBox="0 0 280 150" fill="none">
          <path d="M18 131c60-13 121-45 190-108" stroke="#9cae96" strokeWidth="1.1" />
          <path
            d="M77 110c-29-4-44-22-41-47 26 2 44 18 41 47ZM116 93c-15-25-12-48 8-65 16 23 15 46-8 65ZM157 65c-1-27 12-44 39-47-2 26-15 43-39 47ZM83 108c22-20 45-22 66-5-19 18-42 22-66 5ZM151 69c29-10 53-5 66 18-27 9-50 4-66-18Z"
            fill="#e6eadf"
            stroke="#b0bba4"
            strokeWidth="1"
          />
          <circle cx="228" cy="37" r="8" stroke="#c28b71" strokeWidth="1" />
          <circle cx="246" cy="62" r="3" fill="#c28b71" />
          <path d="M225 107h12m-6-6v12" stroke="#c28b71" strokeWidth="1" />
        </svg>
      </div>
      <div className="welcome-promises">
        <div>
          <span>01</span>
          <p>
            <strong>A plan that fits.</strong>Your priorities. Your people. Your budget.
          </p>
        </div>
        <div>
          <span>02</span>
          <p>
            <strong>The details, in order.</strong>Budgets, timelines, and thoughtful checklists.
          </p>
        </div>
        <div>
          <span>03</span>
          <p>
            <strong>More room to enjoy.</strong>Less keeping it all in your head.
          </p>
        </div>
      </div>
      <div className="welcome-note">
        <Sparkles size={15} />
        <span>A little help from Gemini. A lot of you.</span>
      </div>
    </div>
  );
}

export default function App() {
  const [initial] = useState(boot);
  const [plans, setPlans] = useState<Plan[]>(initial.plans);
  const [activeId, setActiveId] = useState<string | null>(initial.plans[0]?.id ?? null);
  const [formMode, setFormMode] = useState<'new' | 'edit' | null>(
    initial.plans.length ? null : 'new',
  );
  const [formVersion, setFormVersion] = useState(0);
  const [tab, setTab] = useState<WorkspaceTab>('overview');
  const [health, setHealth] = useState<Health | null>(null);
  const [healthBusy, setHealthBusy] = useState(true);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState(initial.error);
  const [storageError, setStorageError] = useState('');
  const [changesSaved, setChangesSaved] = useState(true);
  const [notification, setNotification] = useState('');
  const [showHelp, setShowHelp] = useState(false);
  const errorRef = useRef<HTMLDivElement>(null);
  const mainRef = useRef<HTMLElement>(null);
  const active = plans.find((plan) => plan.id === activeId);

  async function checkHealth(signal?: AbortSignal) {
    setHealthBusy(true);
    try {
      const response = await fetch('/api/health', {
        signal: signal
          ? AbortSignal.any([signal, AbortSignal.timeout(8000)])
          : AbortSignal.timeout(8000),
        headers: { Accept: 'application/json' },
      });
      if (!response.ok) throw new Error('Connection unavailable');
      const data: unknown = await response.json();
      if (
        !data ||
        typeof data !== 'object' ||
        !('aiConfigured' in data) ||
        typeof data.aiConfigured !== 'boolean'
      )
        throw new Error('Connection unavailable');
      setHealth({
        aiConfigured: data.aiConfigured,
        model: 'model' in data && typeof data.model === 'string' ? data.model : 'Gemini',
      });
    } catch (cause) {
      if (!(cause instanceof Error && cause.name === 'AbortError')) setHealth(null);
    } finally {
      if (!signal?.aborted) setHealthBusy(false);
    }
  }
  useEffect(() => {
    const controller = new AbortController();
    void checkHealth(controller.signal);
    return () => controller.abort();
  }, []);
  useEffect(() => {
    if (!notification) return;
    const timeout = window.setTimeout(() => setNotification(''), 5000);
    return () => window.clearTimeout(timeout);
  }, [notification]);

  function store(next: Plan[]) {
    setPlans(next);
    try {
      savePlans(next);
      setChangesSaved(true);
      setStorageError('');
    } catch (cause) {
      setChangesSaved(false);
      setStorageError(
        cause instanceof Error
          ? cause.message
          : 'Your changes are in memory, but could not be saved in this browser. Keep this tab open and print or export your plan.',
      );
    }
  }
  function updatePlan(plan: Plan) {
    store(plans.map((item) => (item.id === plan.id ? plan : item)));
  }
  function focusError(message: string) {
    setError(message);
    window.setTimeout(() => errorRef.current?.focus(), 0);
  }
  function focusMain() {
    window.setTimeout(() => mainRef.current?.focus(), 0);
  }
  function newPlan() {
    setFormMode('new');
    setFormVersion((value) => value + 1);
    setError('');
    setShowHelp(false);
    focusMain();
  }
  function openPlan(id: string) {
    setActiveId(id);
    setFormMode(null);
    setTab('overview');
    setError('');
    setShowHelp(false);
    focusMain();
  }
  async function generate(brief: EventBrief, source: 'gemini' | 'starter') {
    if (busy) return;
    if (plans.length >= 12) {
      focusError(
        'You already have 12 plans in this browser. Print or export a plan you want to keep, then explicitly delete an existing plan before creating a new or revised plan. Your existing plans and edits are unchanged.',
      );
      return;
    }
    setBusy(true);
    setError('');
    try {
      let plan: Plan;
      if (source === 'starter') plan = createPlan(brief, starterAdvice(brief), 'starter');
      else {
        const controller = new AbortController();
        const timeout = window.setTimeout(() => controller.abort(), 40_000);
        try {
          const response = await fetch('/api/plan', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
            body: JSON.stringify(brief),
            signal: controller.signal,
          });
          const payload = (await response.json().catch(() => null)) as {
            plan?: Plan;
            error?: string;
          } | null;
          if (!response.ok)
            throw new Error(
              typeof payload?.error === 'string'
                ? payload.error
                : `Your plan couldn’t be generated (${response.status}). Please try again or choose a starter plan.`,
            );
          if (
            !payload?.plan ||
            payload.plan.source !== 'gemini' ||
            !Array.isArray(payload.plan.tasks) ||
            !Array.isArray(payload.plan.budgetItems)
          )
            throw new Error('The planning service returned an incomplete plan. Please try again.');
          plan = validateStoredPlan(payload.plan);
        } finally {
          window.clearTimeout(timeout);
        }
      }
      store([plan, ...plans]);
      setActiveId(plan.id);
      setFormMode(null);
      setTab('overview');
      setNotification(
        source === 'gemini'
          ? 'Your Gemini plan is ready.'
          : 'Your starter plan is ready. No AI request was made.',
      );
      focusMain();
    } catch (cause) {
      focusError(
        cause instanceof Error && cause.name === 'AbortError'
          ? 'Gemini took too long to respond. Your details and saved plans are still here. Try again or choose a starter plan.'
          : cause instanceof Error
            ? cause.message
            : 'We couldn’t create this plan. Your event details and existing plans are still here.',
      );
    } finally {
      setBusy(false);
    }
  }
  function calendarExport() {
    if (!active) return;
    try {
      saveTextFile(
        exportPlanCalendar(active),
        `${active.brief.title.replace(/[^a-z0-9]+/gi, '-').toLowerCase() || 'gatherly'}-calendar.ics`,
        'text/calendar;charset=utf-8',
      );
      setNotification('Calendar downloaded. Import the .ics file into your calendar app.');
    } catch (cause) {
      focusError(cause instanceof Error ? cause.message : 'The calendar could not be exported.');
    }
  }
  function removePlan(plan: Plan) {
    if (
      !window.confirm(
        `Delete “${plan.brief.title}” from this browser? This removes its saved edits.`,
      )
    )
      return;
    const next = plans.filter((item) => item.id !== plan.id);
    store(next);
    if (plan.id === activeId) {
      setActiveId(next[0]?.id ?? null);
      setFormMode(next.length ? null : 'new');
      setTab('overview');
    }
    setNotification('The local plan was deleted.');
  }

  return (
    <>
      <a className="skip-link" href="#main-content">
        Skip to your gathering
      </a>
      <div className="app-shell">
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
            <button
              className="help-button"
              onClick={() => setShowHelp((value) => !value)}
              aria-expanded={showHelp}
            >
              <CircleHelp size={15} />A note about your plans
              <ArrowRight size={13} />
            </button>
          </div>
        </aside>
        <div className="main-shell">
          <header className="topbar">
            <div className="breadcrumb">
              <span>Your planning space</span>
              <ChevronRight size={13} />
              <span>
                {formMode
                  ? formMode === 'edit'
                    ? 'Update your brief'
                    : 'A new beginning'
                  : active
                    ? EVENT_LABELS[active.brief.type]
                    : 'Welcome'}
              </span>
            </div>
            <span className="topbar-signoff">
              A little intention. A lovely gathering.
              <Leaf size={15} strokeWidth={1.3} />
            </span>
          </header>
          <main
            id="main-content"
            ref={mainRef}
            tabIndex={-1}
            className={formMode ? 'main-content entry-content' : 'main-content workspace-content'}
          >
            {storageError ? (
              <div className="notice error global-notice" role="alert">
                <span>{storageError} Your current changes remain in this tab.</span>
                <button
                  className="icon-button"
                  aria-label="Dismiss storage warning"
                  onClick={() => setStorageError('')}
                >
                  <X size={16} />
                </button>
              </div>
            ) : null}
            {error ? (
              <div className="notice error global-notice" role="alert" tabIndex={-1} ref={errorRef}>
                <span>{error}</span>
                <button
                  className="icon-button"
                  aria-label="Dismiss error"
                  onClick={() => setError('')}
                >
                  <X size={16} />
                </button>
              </div>
            ) : null}
            {showHelp ? (
              <section className="help-panel">
                <div className="row-heading">
                  <h2>A thoughtful plan. A few practical notes.</h2>
                  <button
                    className="icon-button"
                    onClick={() => setShowHelp(false)}
                    aria-label="Close plan information"
                  >
                    <X size={18} />
                  </button>
                </div>
                <p>
                  Gatherly saves up to 12 plans in this browser. Clearing site data or switching
                  devices won’t carry them across. Print a plan to keep a copy, and export its
                  calendar to keep dates close.
                </p>
                <p>
                  Gemini suggestions and starter templates are planning guides. Review every
                  estimate, confirm vendor agreements, and adapt dates to your event. Creating a
                  revised plan keeps your earlier plan and edits.
                </p>
              </section>
            ) : null}
            {formMode ? (
              <>
                <div className="entry-layout">
                  {formMode === 'new' ? (
                    <WelcomeStory />
                  ) : (
                    <div className="edit-story">
                      <button
                        className="text-button"
                        onClick={() => setFormMode(null)}
                        disabled={busy}
                      >
                        <ArrowLeft size={15} />
                        Back to your plan
                      </button>
                      <span className="eyebrow">LET YOUR PLAN GROW WITH YOU</span>
                      <h1>
                        New details.
                        <br />
                        <em>Fresh possibilities.</em>
                      </h1>
                      <p className="welcome-description">
                        Update your brief and we’ll create a separate plan. Your existing budget
                        edits and checkmarks stay in the original.
                      </p>
                      <div className="edit-flower" aria-hidden="true">
                        <Flower2 size={150} strokeWidth={0.5} />
                      </div>
                    </div>
                  )}
                  <BriefForm
                    key={`${formMode}-${formVersion}-${formMode === 'edit' ? activeId : ''}`}
                    initial={formMode === 'edit' ? active?.brief : undefined}
                    busy={busy}
                    aiConfigured={health?.aiConfigured ?? null}
                    onGenerate={(brief, source) => void generate(brief, source)}
                    onCancel={active ? () => setFormMode(null) : undefined}
                  />
                </div>
                <footer className="entry-footer">
                  <span>Make it meaningful. Make it yours.</span>
                  <span>
                    WEDDINGS <span>·</span> BIRTHDAYS <span>·</span> COMMUNITY
                  </span>
                </footer>
              </>
            ) : active ? (
              <>
                <header className="event-header">
                  <div>
                    <div className="event-kicker">
                      <span className="eyebrow">
                        {EVENT_LABELS[active.brief.type].toUpperCase()}
                      </span>
                      <span
                        className={`source-badge ${active.source === 'starter' ? 'starter' : ''}`}
                      >
                        <Sparkles size={11} />
                        {active.source === 'gemini' ? 'Planned with Gemini' : 'Starter template'}
                      </span>
                    </div>
                    <h1>{active.brief.title}</h1>
                    <div className="event-meta">
                      <span>
                        <CalendarDays size={15} />
                        {dateLabel(active.brief.date)}
                      </span>
                      <span>
                        <MapPin size={15} />
                        {active.brief.location}
                      </span>
                      <span>
                        <Users size={15} />
                        {active.brief.guests.toLocaleString('en-IN')} guests
                      </span>
                    </div>
                  </div>
                  <div className="event-actions">
                    <button
                      className="button secondary compact"
                      onClick={() => {
                        setFormMode('edit');
                        setError('');
                        focusMain();
                      }}
                    >
                      <NotebookPen size={15} />
                      Edit brief
                    </button>
                    <div className="export-actions">
                      <button
                        className="icon-button"
                        onClick={calendarExport}
                        aria-label="Export event and tasks to calendar"
                        title="Export calendar (.ics)"
                      >
                        <ArrowDownToLine size={18} />
                      </button>
                      <button
                        className="icon-button"
                        onClick={() => window.print()}
                        aria-label="Print full event plan"
                        title="Print full plan"
                      >
                        <Printer size={18} />
                      </button>
                    </div>
                  </div>
                </header>
                <nav className="workspace-tabs" aria-label="Plan sections">
                  {tabs.map(({ id, label, icon: Icon }) => (
                    <button
                      key={id}
                      className={tab === id ? 'active' : ''}
                      aria-current={tab === id ? 'page' : undefined}
                      onClick={() => setTab(id)}
                    >
                      <Icon size={15} strokeWidth={1.5} />
                      {label}
                      {id === 'timeline' ? (
                        <span className="tab-count">
                          {active.tasks.filter((task) => !task.done).length}
                        </span>
                      ) : null}
                    </button>
                  ))}
                </nav>
                <div className="workspace-view" key={`${active.id}-${tab}`}>
                  {tab === 'overview' ? (
                    <Overview plan={active} onChange={updatePlan} onTab={setTab} />
                  ) : tab === 'budget' ? (
                    <BudgetEditor plan={active} onChange={updatePlan} />
                  ) : tab === 'timeline' ? (
                    <Timeline plan={active} onChange={updatePlan} />
                  ) : tab === 'vendors' ? (
                    <Vendors plan={active} onChange={updatePlan} />
                  ) : tab === 'ideas' ? (
                    <Ideas plan={active} />
                  ) : (
                    <AIActivity plan={active} />
                  )}
                </div>
                <footer className="workspace-footer">
                  <span>
                    <Check size={12} />
                    {changesSaved ? 'Changes saved in this browser' : 'Changes in this tab only'}
                  </span>
                  <span>Thoughtfully planned. Happily gathered.</span>
                </footer>
                <PrintReport plan={active} />
              </>
            ) : null}
          </main>
        </div>
      </div>
      {notification ? (
        <div className="toast" role="status">
          <Check size={17} />
          {notification}
          <button
            className="icon-button"
            aria-label="Dismiss notification"
            onClick={() => setNotification('')}
          >
            <X size={15} />
          </button>
        </div>
      ) : null}
      {busy ? (
        <div className="generation-status" role="status">
          <LoaderCircle size={16} className="spin" />
          <span>Considering your budget, people, and priorities…</span>
        </div>
      ) : null}
    </>
  );
}
