# Fase 2 — Diseño de la API REST
**Proyecto:** PolicyManager — Sistema de gestión de renovaciones  
**Fecha:** 2026-06-14  
**Participantes:** Jeisson Ochoa (desarrollador) · Claude (mentor técnico / arquitecto)

---

## Contexto inicial

La Fase 1 cerró con el modelo de datos definido y el siguiente paso acordado: diseñar la API REST. Se parte de los cinco endpoints propuestos por el mentor como base de discusión.

---

## Tema 1 — Endpoints base

**Propuesta del mentor:**

| Método | Ruta | Qué hace |
|---|---|---|
| GET | /api/polizas | Lista con estado derivado y prioridad |
| GET | /api/polizas/:id | Detalle + info del cliente |
| GET | /api/polizas/:id/gestiones | Historial de gestiones |
| POST | /api/polizas/:id/gestiones | Registra nueva gestión |
| POST | /api/polizas/:id/renovar | Operación compuesta en transacción |

El mentor señala que el más importante para discutir es `GET /api/polizas` por ser donde vive la lógica de negocio.

---

## Tema 2 — Campos de respuesta del GET /api/polizas

**Campos propuestos por Jeisson:** nombre, teléfono, tipo, fecha vencimiento, días y estado.

**Adición propuesta por el mentor:** `ultimaGestion` (fecha y resultado) — da contexto a María antes de llamar sin necesidad de abrir el detalle.

**Decisión:** Se incluye `ultimaGestion`. El campo `diasAlVencimiento` se devuelve como número (negativo = vencida, positivo = faltan días) para que la UI no calcule nada.

```json
{
  "id": 1,
  "numeroPoliza": "POL-001",
  "cliente": { "nombre": "Juan Pérez", "telefono": "3001234567" },
  "tipo": "auto",
  "aseguradora": "Sura",
  "fechaVencimiento": "2026-06-10",
  "diasAlVencimiento": -4,
  "estado": "vencida_en_ventana",
  "ultimaGestion": { "fecha": "2026-06-12", "resultado": "No contestó" }
}
```

---

## Tema 3 — Work queue vs. listado general

**Decisión de Jeisson:** El endpoint base no debe devolver todas las pólizas. Debe ser un work queue con solo pólizas que requieren acción. Las renovadas/canceladas se excluyen. Lo histórico va por filtro o endpoint separado.

**Razonamiento:** Una cola de trabajo limpia evita que María tenga que filtrar manualmente lo que ya está resuelto.

---

## Tema 4 — Ventana de trabajo

**Decisión de Jeisson:** La ventana de trabajo queda definida como ±30 días alrededor de la fecha de vencimiento.

- La póliza entra a la cola 30 días antes del vencimiento.
- Permanece en la cola hasta 30 días después del vencimiento.
- Fuera de ese rango se considera fuera de la ventana de gestión activa.

**Orden de prioridad dentro del work queue:**
1. Vencidas dentro de la ventana (0 a -30 días) — más urgentes
2. Próximas a vencer (0 a +30 días)

---

## Tema 5 — Inconsistencia en el orden de prioridad

**Problema identificado por el mentor:** La propuesta original incluía "Fuera de ventana" como tercer nivel de prioridad, lo cual contradice la definición del work queue que las excluye.

**Decisión de Jeisson:** Las pólizas fuera de ventana se excluyen completamente del endpoint base. Se consultan únicamente con filtro explícito (`?incluirFueraDeVentana=true`) o endpoint separado. El work queue es exclusivamente accionable.

---

## Tema 6 — POST /api/polizas/:id/gestiones

**Decisión de Jeisson:** Modelo mínimo enfocado en velocidad de registro.

- `resultado` (obligatorio): enum cerrado — `contactado`, `no_contesto`, `llamar_mas_tarde`, `interesado`, `no_interesado`
- `nota` (obligatorio): texto libre
- `tipo` no lo ingresa María — el backend asigna `tipo = "seguimiento"` automáticamente

**Body:**
```json
{
  "resultado": "no_contesto",
  "nota": "Llamé a las 3pm, no contestó"
}
```

---

## Tema 7 — POST /api/polizas/:id/renovar y el campo `renovada`

**Propuesta de Jeisson para el body:**
```json
{
  "nuevaFechaVencimiento": "2027-06-10",
  "nota": "Renovado con ajuste de prima"
}
```

**Problema identificado por el mentor:** Si `renovada = true` se mantiene permanente, la póliza nunca volvería al work queue cuando la nueva fecha entre a la ventana en 11 meses.

**Opciones evaluadas:**
- Opción A: El POST /renovar actualiza `fechaVencimiento` y resetea `renovada = false`. La póliza sale del queue porque la nueva fecha está fuera de la ventana. En 11 meses vuelve sola.
- Opción B: `renovada = true` permanente, el work queue la incluye de nuevo cuando la fecha entra a la ventana ignorando el flag.

**Decisión: Opción A.** El work queue depende exclusivamente de la ventana de tiempo basada en `fechaVencimiento`.

---

## Tema 8 — Eliminación de `renovada` del modelo

**Consecuencia de la Opción A:** Si el work queue es puramente date-driven, el campo `renovada: boolean` en Póliza pierde toda función.

**Decisión de Jeisson:** Eliminar `renovada` del modelo de Póliza. La renovación queda representada únicamente por la actualización de `fechaVencimiento` y una gestión de `tipo = "renovacion"`. Una sola fuente de verdad basada en fechas.

---

## Modelo de datos actualizado (Fase 2)

**Cliente:** id, nombre, telefono, email

**Póliza:** id, clienteId, numeroPoliza, tipo, aseguradora, fechaVencimiento  
→ `renovada` eliminado respecto al cierre de Fase 1

**Gestión:** id, polizaId, tipo, fecha, resultado (nullable), nota

---

## API REST cerrada

| Método | Ruta | Descripción |
|---|---|---|
| GET | /api/polizas | Work queue: ventana ±30 días, excluye fuera de ventana |
| GET | /api/polizas/:id | Detalle + info cliente |
| GET | /api/polizas/:id/gestiones | Historial ordenado por fecha desc |
| POST | /api/polizas/:id/gestiones | Registra seguimiento (tipo asignado por backend) |
| POST | /api/polizas/:id/renovar | Operación compuesta en transacción |

---

## Próximo paso acordado

Definir el stack tecnológico e iniciar la implementación (Fase 3).
