export type EventTopic =
  | 'ncr.created'
  | 'ncr.status.updated'
  | 'ncr.closed'
  | 'hse.incident.created'
  | 'hse.action.created'
  | 'sync.completed'
  | 'sync.conflict';

export type DomainEvent<TPayload = Record<string, unknown>> = {
  topic: EventTopic;
  timestamp: string;
  payload: TPayload;
  traceId?: string;
};
