# Fase 5 — Tests con Vitest

**Fecha:** 2026-06-15  
**Herramienta IA:** Claude Sonnet 4.6 (Claude Code)

---

## Caso más crítico elegido

La lógica de `deriveStatus` y `getWorkQueue` en `policyService.js`. Es el núcleo del negocio: determina qué pólizas son accionables, en qué orden se presentan y cuándo una póliza sale del radar del intermediario.

---

## Decisiones técnicas

### BD en memoria para tests de integración

El módulo `database.js` usaba una ruta fija a `data.db`. Se agregó soporte para la variable de entorno `DB_PATH`:

```js
const dbPath = process.env.DB_PATH || path.join(__dirname, 'data.db');
```

En `tests/setup.js` (ejecutado antes de cualquier test) se establece:
```js
process.env.DB_PATH = ':memory:';
```

Esto garantiza que los tests corren contra una BD efímera sin tocar los datos reales.

### globals: true en Vitest

El backend usa CommonJS (`require`). Vitest no permite `require('vitest')` en módulos CJS. Con `globals: true` en `vitest.config.js`, `describe/it/expect/beforeEach` están disponibles globalmente sin importar nada.

### `deriveStatus` exportada

Se agregó `deriveStatus` a los exports de `policyService.js` para poder testearla como función pura, sin necesidad de BD.

---

## Tests implementados

### Test 1: `deriveStatus` — fronteras de la regla de negocio

Verifica los 4 estados en sus valores límite exactos (día 31, 30, 1, 0, -30, -31).  
Es una función pura: no requiere BD ni setup.

### Test 2: `getWorkQueue` — filtrado

Inserta una póliza dentro de la ventana (10 días) y una fuera (-45 días).  
Verifica que la cola solo retorna la póliza accionable.

### Test 3: `getWorkQueue` — orden de prioridad

Inserta una póliza próxima a vencer y una ya vencida (dentro de ventana).  
Verifica que la vencida aparece primero: es el caso más urgente para María.

---

## Resultado

```
✓ tests/policyService.test.js (3 tests) 11ms
Test Files  1 passed
Tests       3 passed
```
