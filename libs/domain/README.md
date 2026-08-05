# Shared Domain Library

Contrats partagés :

- modèles métier,
- types d'événements,
- enums (statuts, gravité, rôles).

## Exports

| Fichier | Contenu |
|---|---|
| `models.ts` | `Role`, `NcrStatus`, `IncidentSeverity`, `IncidentStatus`, `NcrHistoryEntry`, `User`, `Project`, `NcrPhoto`, `Ncr`, `Incident`, `HseAction` |
| `events.ts` | `EventTopic`, `DomainEvent<T>` |
| `index.ts` | Réexporte tout |

Utilisé par `src/` (domaine) et `services/api-gateway/src/modules/` (couche HTTP).
