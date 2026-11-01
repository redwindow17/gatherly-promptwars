import { Sparkles } from 'lucide-react';

export function WelcomeStory() {
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
