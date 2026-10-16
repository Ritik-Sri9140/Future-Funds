import type { ReactNode } from 'react';

export type Tone = 'green' | 'amber' | 'red' | 'blue' | 'purple' | 'gray';

export function Card(props: { title?: string; subtitle?: string; actions?: ReactNode; children?: ReactNode; className?: string }) {
  return (
    <section className={`card ${props.className ?? ''}`}>
      {(props.title || props.actions) && (
        <div className="card-head">
          <div>
            {props.title && <h3>{props.title}</h3>}
            {props.subtitle && <p className="muted">{props.subtitle}</p>}
          </div>
          {props.actions}
        </div>
      )}
      {props.children}
    </section>
  );
}

export function Metric(props: { label: string; value: ReactNode; sub?: ReactNode; tone?: Tone }) {
  return (
    <div className="metric">
      <div className="label">{props.label}</div>
      <div className={`value ${props.tone ? `tone-${props.tone}` : ''}`}>{props.value}</div>
      {props.sub && <div className="sub">{props.sub}</div>}
    </div>
  );
}

export function Badge({ tone = 'gray', children }: { tone?: Tone; children: ReactNode }) {
  return <span className={`badge ${tone}`}>{children}</span>;
}
