'use client';

import Button from '@/components/ui/Button';

export interface ProposeOutcomeFormProps {
  className?: string;
}

export default function ProposeOutcomeForm({ className }: ProposeOutcomeFormProps): JSX.Element {
  return (
    <form className={`space-y-4 rounded-2xl border border-line bg-panel/72 p-5 ${className ?? ''}`}>
      <div>
        <p className="font-mono text-xs uppercase tracking-[0.18em] text-teal">
          Propose Outcome
        </p>
        <p className="mt-2 text-sm text-muted">
          Resolution proposals will open the optimistic dispute window.
        </p>
      </div>

      <label className="block space-y-2 text-sm text-muted">
        Market Address
        <input
          className="w-full rounded-xl border border-line bg-surface px-3 py-3 text-text"
          defaultValue="0x5f2d3d4f7f6b4c44f87c7250c6fe2f2606570a11"
        />
      </label>

      <label className="block space-y-2 text-sm text-muted">
        Proposed Outcome
        <select className="w-full rounded-xl border border-line bg-surface px-3 py-3 text-text">
          <option>YES</option>
          <option>NO</option>
        </select>
      </label>

      <label className="block space-y-2 text-sm text-muted">
        Evidence URI
        <input
          className="w-full rounded-xl border border-line bg-surface px-3 py-3 text-text"
          defaultValue="https://issuer.example/report"
        />
      </label>

      <Button type="button">Stage Proposal</Button>
    </form>
  );
}

