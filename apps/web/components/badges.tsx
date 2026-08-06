type BadgeProps = {
  value: string;
};

const STATUS_LABELS: Record<string, string> = {
  OUVERT: 'Ouvert',
  EN_COURS: 'En cours',
  EN_ANALYSE: 'En analyse',
  RESOLU: 'Résolu',
  CLOTURE: 'Clôturé'
};

export function StatusBadge({ value }: BadgeProps) {
  return <span className={`badge status-${value.toLowerCase()}`}>{value}</span>;
}

export function NcrStatusDot({ value }: BadgeProps) {
  return (
    <span
      className={`ncr-status-dot status-${value.toLowerCase()}`}
      title={STATUS_LABELS[value] ?? value}
      aria-label={STATUS_LABELS[value] ?? value}
    />
  );
}

export function PriorityBadge({ value }: BadgeProps) {
  return <span className={`badge priority-${value.toLowerCase()}`}>{value}</span>;
}

export function WormBadge({ locked }: { locked: boolean }) {
  return <span className={`worm-badge ${locked ? 'locked' : 'unlocked'}`}>{locked ? 'WORM' : '—'}</span>;
}
