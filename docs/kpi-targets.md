# KPI Techniques BuildFlow

## Cibles

- Disponibilité mensuelle : `>= 99.9%`
- Temps de réponse API p95 : `<= 300ms`
- Crash-free mobile : `>= 99.5%`
- Succès de synchronisation offline : `>= 99.3%`
- Couverture de tests globale : `>= 70%`

## Indicateurs suivis en code

- endpoint reporting : `GET /reporting/kpi`
- pipeline CI : lint + test coverage + audit
- dashboard HSE web : cartes KPI principales
