import { useRef, useState, type FormEvent } from 'react';
import {
  ArrowRight,
  CakeSlice,
  Check,
  HeartHandshake,
  LoaderCircle,
  Sparkles,
  Users,
  X,
} from 'lucide-react';
import type { EventBrief, EventType } from '../domain/types';
import { validateBrief } from '../domain/validation';
import { localToday, rupeesToPaise } from './format';

interface Props {
  initial?: EventBrief;
  busy: boolean;
  aiConfigured: boolean | null;
  onGenerate: (brief: EventBrief, source: 'gemini' | 'starter') => void;
  onCancel?: () => void;
}
interface FormValues {
  title: string;
  type: EventType;
  date: string;
  location: string;
  guests: string;
  budget: string;
  priorities: string[];
  notes: string;
}
const priorities = [
  'Food & drink',
  'Atmosphere',
  'Guest experience',
  'Photography',
  'Entertainment',
  'Keeping it simple',
];
const choices = [
  { type: 'wedding' as const, label: 'Wedding', icon: HeartHandshake },
  { type: 'birthday' as const, label: 'Birthday', icon: CakeSlice },
  { type: 'community' as const, label: 'Community', icon: Users },
];
function initialValues(brief?: EventBrief): FormValues {
  return brief
    ? { ...brief, guests: String(brief.guests), budget: String(brief.budgetPaise / 100) }
    : {
        title: '',
        type: 'wedding',
        date: '',
        location: '',
        guests: '',
        budget: '',
        priorities: [],
        notes: '',
      };
}

export function BriefForm({ initial, busy, aiConfigured, onGenerate, onCancel }: Props) {
  const [values, setValues] = useState<FormValues>(() => initialValues(initial));
  const [error, setError] = useState('');
  const [sample, setSample] = useState(false);
  const errorRef = useRef<HTMLDivElement>(null);
  function update<K extends keyof FormValues>(key: K, value: FormValues[K]) {
    setValues((current) => ({ ...current, [key]: value }));
    setError('');
  }
  function showError(message: string) {
    setError(message);
    window.setTimeout(() => errorRef.current?.focus(), 0);
  }
  function submit(event: FormEvent) {
    event.preventDefault();
    const submitter = (event.nativeEvent as SubmitEvent).submitter as HTMLButtonElement | null;
    const source = submitter?.value === 'starter' ? 'starter' : 'gemini';
    const budgetPaise = rupeesToPaise(values.budget);
    if (budgetPaise === null) {
      showError('Enter a budget in rupees, with up to two decimal places.');
      return;
    }
    try {
      const brief = validateBrief({
        title: values.title.trim(),
        type: values.type,
        date: values.date,
        location: values.location.trim(),
        guests: Number(values.guests),
        budgetPaise,
        priorities: values.priorities,
        notes: values.notes.trim(),
        timeZone: Intl.DateTimeFormat().resolvedOptions().timeZone,
      });
      setError('');
      onGenerate(brief, source);
    } catch (cause) {
      showError(cause instanceof Error ? cause.message : 'Please check your event details.');
    }
  }
  function fillSample() {
    const future = new Date();
    future.setDate(future.getDate() + 90);
    const date = `${future.getFullYear()}-${String(future.getMonth() + 1).padStart(2, '0')}-${String(future.getDate()).padStart(2, '0')}`;
    setValues({
      title: 'An evening to remember',
      type: 'wedding',
      date,
      location: 'Chennai, Tamil Nadu',
      guests: '120',
      budget: '600000',
      priorities: ['Food & drink', 'Guest experience'],
      notes:
        'An intimate garden celebration with vegetarian food and a relaxed, welcoming atmosphere.',
    });
    setSample(true);
    setError('');
  }
  return (
    <section className="brief-panel" aria-labelledby="brief-heading">
      <div className="panel-topline">
        <span className="eyebrow">THE FIRST STEP</span>
        {onCancel ? (
          <button
            className="icon-button"
            onClick={onCancel}
            aria-label="Close event form"
            disabled={busy}
          >
            <X size={19} />
          </button>
        ) : (
          <span className="tiny-label">Made for your moment</span>
        )}
      </div>
      <h2 id="brief-heading">
        {initial ? 'A change of plans?' : 'Tell us what you’re celebrating.'}
      </h2>
      <p className="muted form-intro">A few thoughtful details. A plan you can make your own.</p>
      <form onSubmit={submit}>
        <fieldset className="event-types" disabled={busy}>
          <legend className="field-label">The occasion</legend>
          {choices.map(({ type, label, icon: Icon }) => (
            <label
              key={type}
              className={`occasion-option ${values.type === type ? 'selected' : ''}`}
            >
              <input
                type="radio"
                name="type"
                value={type}
                checked={values.type === type}
                onChange={() => update('type', type)}
              />
              <Icon size={21} strokeWidth={1.5} />
              <span>{label}</span>
              {values.type === type ? <Check size={13} className="occasion-check" /> : null}
            </label>
          ))}
        </fieldset>
        <div className="form-grid">
          <label className="full-width">
            Event name
            <input
              name="title"
              required
              minLength={2}
              maxLength={120}
              placeholder="Give your gathering a name"
              value={values.title}
              onChange={(e) => update('title', e.target.value)}
              disabled={busy}
              autoComplete="off"
            />
          </label>
          <label>
            Event date
            <input
              name="date"
              type="date"
              required
              min={localToday()}
              value={values.date}
              onChange={(e) => update('date', e.target.value)}
              disabled={busy}
            />
          </label>
          <label>
            Location
            <input
              name="location"
              required
              minLength={2}
              maxLength={120}
              placeholder="City or venue"
              value={values.location}
              onChange={(e) => update('location', e.target.value)}
              disabled={busy}
              autoComplete="off"
            />
          </label>
          <label>
            Number of guests
            <input
              name="guests"
              type="number"
              required
              min="1"
              max="10000"
              step="1"
              inputMode="numeric"
              placeholder="e.g. 120"
              value={values.guests}
              onChange={(e) => update('guests', e.target.value)}
              disabled={busy}
            />
          </label>
          <label>
            Total budget <span className="label-note">INR</span>
            <div className="money-field">
              <span aria-hidden="true">₹</span>
              <input
                name="budget"
                type="text"
                required
                inputMode="decimal"
                placeholder="e.g. 6,00,000"
                value={values.budget}
                onChange={(e) => update('budget', e.target.value.replace(/,/g, ''))}
                disabled={busy}
                aria-describedby="budget-hint"
              />
            </div>
          </label>
        </div>
        <p className="field-hint" id="budget-hint">
          ₹100–₹10 crore, including a separate contingency reserve.
        </p>
        <fieldset className="priorities" disabled={busy}>
          <legend className="field-label">
            What matters most? <span className="label-note">Optional · choose up to 3</span>
          </legend>
          <div className="priority-options">
            {priorities.map((priority) => (
              <label
                key={priority}
                className={`priority-option ${values.priorities.includes(priority) ? 'selected' : ''}`}
              >
                <input
                  type="checkbox"
                  checked={values.priorities.includes(priority)}
                  disabled={
                    busy || (!values.priorities.includes(priority) && values.priorities.length >= 3)
                  }
                  onChange={(e) =>
                    update(
                      'priorities',
                      e.target.checked
                        ? [...values.priorities, priority]
                        : values.priorities.filter((item) => item !== priority),
                    )
                  }
                />
                {values.priorities.includes(priority) ? (
                  <Check size={12} />
                ) : (
                  <span className="chip-plus">+</span>
                )}
                {priority}
              </label>
            ))}
          </div>
        </fieldset>
        <label className="notes-label">
          Anything else to keep in mind? <span className="label-note">Optional</span>
          <textarea
            name="notes"
            rows={2}
            maxLength={2000}
            placeholder="A theme, dietary needs, traditions, accessibility…"
            value={values.notes}
            onChange={(e) => update('notes', e.target.value)}
            disabled={busy}
          />
        </label>
        {error ? (
          <div ref={errorRef} tabIndex={-1} className="notice error" role="alert">
            {error}
          </div>
        ) : null}
        {sample ? (
          <p className="sample-label">
            Sample details loaded. Edit them freely before creating a plan.
          </p>
        ) : null}
        {aiConfigured === false ? (
          <p className="ai-unavailable">
            <span className="status-dot amber" />
            Gemini isn’t connected on this deployment. You can create a clearly labelled starter
            plan.
          </p>
        ) : null}
        <div className="form-actions">
          <button
            className="button primary"
            type="submit"
            value="gemini"
            disabled={busy || aiConfigured === false}
          >
            {busy ? <LoaderCircle size={17} className="spin" /> : <Sparkles size={17} />}
            <span>
              {busy
                ? 'Putting your plan together…'
                : initial
                  ? 'Create a new Gemini plan'
                  : 'Create my plan with Gemini'}
            </span>
            {!busy ? <ArrowRight size={18} /> : null}
          </button>
          <button className="button secondary" type="submit" value="starter" disabled={busy}>
            Use a starter plan
          </button>
        </div>
        <div className="form-footnote">
          <span>Saved in this browser. Always yours to edit.</span>
          {!initial ? (
            <button className="text-button" type="button" onClick={fillSample} disabled={busy}>
              Try sample details <ArrowRight size={13} />
            </button>
          ) : null}
        </div>
      </form>
    </section>
  );
}
