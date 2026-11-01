import { useEffect, useId, useRef, useState } from 'react';
import { AlertTriangle, ArrowDownRight, ArrowUpRight, Check, Info, PencilLine } from 'lucide-react';
import type { Plan } from '../domain/types';
import { budgetSummary } from '../domain/planner';
import { MAX_MONEY_PAISE } from '../domain/validation';
import { money, rupeesToPaise } from './format';

interface MoneyInputProps {
  amount: number;
  label: string;
  onChange: (value: number) => void;
}
function MoneyInput({ amount, label, onChange }: MoneyInputProps) {
  const errorId = useId();
  const [text, setText] = useState(String(amount / 100));
  const [invalid, setInvalid] = useState(false);
  const skipBlur = useRef(false);
  useEffect(() => {
    setText(String(amount / 100));
    setInvalid(false);
  }, [amount]);
  function commit() {
    const value = rupeesToPaise(text.replace(/,/g, ''));
    if (skipBlur.current) {
      skipBlur.current = false;
      return;
    }
    if (value === null || value > MAX_MONEY_PAISE) {
      setInvalid(true);
      return;
    }
    setInvalid(false);
    setText(String(value / 100));
    if (value !== amount) onChange(value);
  }
  return (
    <div className="budget-input-wrap">
      <div className={`money-field editable-money ${invalid ? 'invalid' : ''}`}>
        <span aria-hidden="true">₹</span>
        <input
          aria-label={`${label} amount in rupees`}
          inputMode="decimal"
          value={text}
          onChange={(e) => {
            setText(e.target.value);
            setInvalid(false);
          }}
          onBlur={commit}
          onKeyDown={(e) => {
            if (e.key === 'Enter') {
              e.preventDefault();
              e.currentTarget.blur();
            }
            if (e.key === 'Escape') {
              skipBlur.current = true;
              setText(String(amount / 100));
              setInvalid(false);
              e.currentTarget.blur();
            }
          }}
          aria-invalid={invalid}
          aria-describedby={invalid ? errorId : undefined}
        />
      </div>
      {invalid ? (
        <span className="input-error" id={errorId}>
          Use ₹0–₹10 crore, up to 2 decimals.
        </span>
      ) : null}
    </div>
  );
}
interface Props {
  plan: Plan;
  onChange: (plan: Plan) => void;
}
const colors = [
  '#294e3e',
  '#6c8979',
  '#b2bda7',
  '#c58b6b',
  '#d2b796',
  '#97a9a5',
  '#847b69',
  '#c3c8bc',
];
export function BudgetEditor({ plan, onChange }: Props) {
  const summary = budgetSummary(plan);
  const unallocated = plan.brief.budgetPaise - summary.allocatedPaise - plan.reservePaise;
  const overspend = Math.max(0, -unallocated);
  const denominator = Math.max(
    plan.brief.budgetPaise,
    summary.allocatedPaise + plan.reservePaise,
    1,
  );
  return (
    <section className="view-section" aria-labelledby="budget-heading">
      <div className="section-heading">
        <div>
          <span className="eyebrow">ROOM FOR WHAT MATTERS</span>
          <h2 id="budget-heading">Every rupee, considered.</h2>
          <p className="muted">
            An editable starting point. Replace estimates as real quotes arrive.
          </p>
        </div>
        <span className="section-icon">
          <PencilLine size={22} strokeWidth={1.4} />
        </span>
      </div>
      <div className="budget-summary">
        <div>
          <span className="metric-label">Total event budget</span>
          <strong>{money(plan.brief.budgetPaise)}</strong>
        </div>
        <div>
          <span className="metric-label">Category estimates</span>
          <strong>{money(summary.allocatedPaise)}</strong>
        </div>
        <div>
          <span className="metric-label">Contingency reserve</span>
          <strong>{money(plan.reservePaise)}</strong>
        </div>
        <div className={overspend ? 'negative' : 'positive'}>
          <span className="metric-label">{overspend ? 'Over budget' : 'Unallocated'}</span>
          <strong>
            {overspend ? <ArrowUpRight size={19} /> : <ArrowDownRight size={19} />}
            {money(overspend || unallocated)}
          </strong>
        </div>
      </div>
      <div className="allocation-bar" aria-label="Budget allocation">
        {plan.budgetItems.map((item, index) => (
          <span
            key={item.id}
            style={{
              width: `${(item.amountPaise / denominator) * 100}%`,
              background: colors[index % colors.length],
            }}
            title={`${item.category}: ${money(item.amountPaise)}`}
          />
        ))}
        <span
          className="reserve-bar"
          style={{ width: `${(plan.reservePaise / denominator) * 100}%` }}
          title={`Reserve: ${money(plan.reservePaise)}`}
        />
      </div>
      {overspend > 0 ? (
        <div className="notice error budget-notice" role="status">
          <AlertTriangle size={18} />
          <span>
            Your estimates and reserve exceed your budget by <strong>{money(overspend)}</strong>.
            Reduce an amount or edit the event budget. Other categories stay as you set them.
          </span>
        </div>
      ) : unallocated > 0 ? (
        <div className="budget-note">
          <Info size={15} />
          <span>
            {money(unallocated)} is available to allocate. Your edits never rebalance other
            categories.
          </span>
        </div>
      ) : (
        <div className="budget-note">
          <Check size={15} />
          <span>Your estimates and reserve match your event budget.</span>
        </div>
      )}
      <div className="budget-table">
        <div className="budget-table-header">
          <span>CATEGORY & PLANNING NOTE</span>
          <span>ESTIMATE (INR)</span>
        </div>
        {plan.budgetItems.map((item, index) => (
          <div className="budget-row" key={item.id}>
            <span className="budget-color" style={{ background: colors[index % colors.length] }} />
            <div className="budget-description">
              <h3>{item.category}</h3>
              <p>{item.rationale}</p>
            </div>
            <MoneyInput
              amount={item.amountPaise}
              label={item.category}
              onChange={(amountPaise) =>
                onChange({
                  ...plan,
                  budgetItems: plan.budgetItems.map((row) =>
                    row.id === item.id ? { ...row, amountPaise } : row,
                  ),
                })
              }
            />
          </div>
        ))}
        <div className="budget-row reserve-row">
          <span className="budget-color reserve-color" />
          <div className="budget-description">
            <h3>Contingency reserve</h3>
            <p>A separate cushion for the unexpected. Keep it visible.</p>
          </div>
          <MoneyInput
            amount={plan.reservePaise}
            label="Contingency reserve"
            onChange={(reservePaise) => onChange({ ...plan, reservePaise })}
          />
        </div>
      </div>
      <p className="fine-print">
        Amounts are planning estimates, not vendor quotes. Edits save when you leave a field or
        press Enter. Press Escape to discard a field edit.
      </p>
    </section>
  );
}
