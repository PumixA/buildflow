# Messaging Layer

Définition des échanges asynchrones :

- bus RabbitMQ/Kafka,
- contrats d'événements NCR/HSE,
- conventions de routage.

## Topics définis (voir `libs/domain/src/events.ts`)

| Topic | Émetteur |
|---|---|
| `ncr.created` | NcrService |
| `ncr.status.updated` | NcrService |
| `ncr.updated` | NcrService |
| `ncr.closed` | NcrService |
| `hse.incident.created` | HseService |
| `hse.action.created` | HseService |
| `sync.completed` | SyncService |
| `sync.conflict` | SyncService |
