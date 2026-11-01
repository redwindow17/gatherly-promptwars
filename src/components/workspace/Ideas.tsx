import { Flower2, Sparkles } from 'lucide-react';
import type { Plan } from '../../domain/types';

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
