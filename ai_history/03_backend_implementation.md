# Fase 3 — Implementación del Backend
**Proyecto:** PolicyManager — Sistema de gestión de renovaciones  
**Fecha:** 2026-06-14  
**Participantes:** Jeisson Ochoa (desarrollador) · Claude (mentor técnico / arquitecto)

---

## Contexto inicial

Con la API REST diseñada en Fase 2, se inicia la implementación del backend. Stack acordado: Node.js + Express + better-sqlite3 + Vitest.

---

## Estructura de archivos acordada

```
backend/
├── database.js
├── server.js
├── seed.js
├── routes/
│   ├── policies.js
│   └── interactions.js
└── services/
    ├── policyService.js
    └── interactionService.js
```

Decisión: agregar `services/` para aislar la lógica de negocio de las rutas. Permite testear servicios sin levantar Express. Nombres de archivos en inglés siguiendo clean code.

---

## database.js

Conexión SQLite con `better-sqlite3` (síncrono). Schema con tres tablas: `clients`, `policies`, `interactions`.

**Decisiones:**
- `journal_mode = WAL`: permite lecturas simultáneas durante escrituras
- `foreign_keys = ON`: SQLite los desactiva por defecto; necesario para integridad referencial
- `ON DELETE CASCADE`: evita datos huérfanos al eliminar clientes o pólizas
- `DEFAULT CURRENT_TIMESTAMP` en `interactions.date`: el servidor asigna la fecha, no el cliente
- `CHECK` en enums de `interactions`: la DB rechaza valores inválidos independientemente del código
- `resultado` (result) nullable: las interacciones de tipo `renewal` no tienen resultado de contacto
- Índice en `expiration_date`: optimiza el filtro del work queue
- Todos los nombres de columnas en inglés para consistencia con el resto del proyecto

**Enums definidos:**
- `type`: `follow_up` | `renewal`
- `result`: `contacted` | `no_answer` | `call_later` | `interested` | `not_interested`

---

## policyService.js

Contiene la lógica de negocio más crítica del sistema.

**`deriveStatus(daysUntilExpiration)`** — función pura, completa e independiente:
- `not_due`: días > 30 (no en ventana aún)
- `upcoming`: 0 < días ≤ 30
- `expired_in_window`: -30 ≤ días ≤ 0
- `outside_window`: días < -30

**`getWorkQueue()`** — work queue con ventana ±30 días:
- Filtro SQL por `expiration_date BETWEEN date('now', 'localtime', '-30 days') AND date('now', 'localtime', '+30 days')`
- LEFT JOIN con última interacción por `MAX(date)` (no MAX(id) para evitar dependencia en orden de inserción)
- Orden: expiradas primero (días ASC), luego próximas a vencer (días ASC)
- Fix aplicado: `julianday(date('now', 'localtime'))` en lugar de `julianday('now', 'localtime')` para calcular días correctamente sin componente de hora

**`getPolicyById(id)`** — detalle completo con cliente e-mail incluido

**`renewPolicy(id, { newExpirationDate, note })`** — operación compuesta en transacción:
- UPDATE de `expiration_date` + INSERT de interacción tipo `renewal`
- Si una falla, ambas se revierten

---

## interactionService.js

**`getInteractionsByPolicyId(policyId)`** — historial ordenado por fecha DESC

**`createInteraction(policyId, { result, note })`** — crea `follow_up`, devuelve el objeto creado completo para que el frontend actualice sin hacer otro GET. La creación de interacciones tipo `renewal` vive en `policyService` para mantener la atomicidad de la transacción.

---

## routes/policies.js y routes/interactions.js

Rutas deliberadamente delgadas: validar entrada → llamar servicio → responder. Sin lógica de negocio.

**Validaciones aplicadas:**
- Formato de fecha con regex `^\d{4}-\d{2}-\d{2}$`
- Enum de `result` validado en el router (evita 500 genérico de SQLite, da 400 con mensaje claro)
- `note.trim()` para rechazar strings de solo espacios
- Verificación de existencia de póliza antes de operar

**Nota:** `VALID_RESULTS` duplica los valores del CHECK de SQLite de forma consciente — trade-off entre DRY y mensajes de error útiles al cliente.

---

## seed.js

7 clientes, 7 pólizas, 7 interacciones. Datos diseñados para cubrir todos los estados del work queue:

| Póliza | Estado | Días | Aparece en queue |
|---|---|---|---|
| POL-001 Lucía | upcoming | +2 | ✓ |
| POL-002 Ana | upcoming | +6 | ✓ |
| POL-003 Carlos | upcoming | +26 | ✓ |
| POL-004 Rosa | expired_in_window | -9 | ✓ |
| POL-005 Juan | expired_in_window | -25 | ✓ (crítica) |
| POL-006 Pedro | outside_window | -65 | ✗ |
| POL-007 Valentina | renovada (far future) | +352 | ✗ |

`DELETE FROM` al inicio hace el seed idempotente.

---

## Validación de endpoints

Todos los endpoints probados y funcionando:

| Endpoint | Resultado |
|---|---|
| GET /api/policies | 5 pólizas ordenadas correctamente |
| GET /api/policies/1 | Detalle de Lucía con email |
| GET /api/policies/2/interactions | 2 interacciones de Ana ordenadas DESC |
| POST /api/policies/3/interactions | Interacción creada, tipo asignado por backend |
| POST /api/policies/1/renew | Lucía renovada, desaparece del work queue |
| GET /api/policies (post-renovación) | 4 pólizas, Lucía ausente ✓ |

---

## Próximo paso acordado

Fase 4 — Implementación del frontend (React + Vite, una sola pantalla).
