type BadgeProps = {
  value: string;
};

export function StatusBadge({ value }: BadgeProps) {
  return <span className={`badge status-${value.toLowerCase()}`}>{value}</span>;
}

export function PriorityBadge({ value }: BadgeProps) {
  return <span className={`badge priority-${value.toLowerCase()}`}>{value}</span>;
}

export function WormBadge({ locked }: { locked: boolean }) {
  return <span className={`worm-badge ${locked ? 'locked' : 'unlocked'}`}>{locked ? 'WORM' : '—'}</span>;
}
