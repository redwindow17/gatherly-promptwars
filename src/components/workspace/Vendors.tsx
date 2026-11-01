import { Check } from 'lucide-react';
import type { ViewProps } from './types';

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
