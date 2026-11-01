import { useState } from 'react';
import { ChevronDown, Clipboard, Flower2, Sparkles } from 'lucide-react';
import type { Plan } from '../../domain/types';

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
