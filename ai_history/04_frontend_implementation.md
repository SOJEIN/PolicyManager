# Fase 4 — Implementación del Frontend

**Fecha:** 2026-06-15  
**Herramienta IA:** Claude Sonnet 4.6 (Claude Code)

---

## Decisiones de diseño

### ¿Crear clientes y pólizas desde la UI?

**Pregunta del usuario:** ¿Es necesario crear clientes? En el ejercicio no leo que María las cree, solo las gestiona.

**Análisis:** El spec lo confirma en los supuestos: *"Las pólizas ya existen dentro del sistema"*. El alcance del MVP no incluye crear clientes ni pólizas. El seed carga los datos iniciales y María solo gestiona desde ahí.

**Decisión:** No se implementa CRUD de clientes ni pólizas. El frontend es de solo gestión.

---

### Estructura: una pantalla, sin React Router

El spec (sección 7) define una única pantalla principal. No hay necesidad de navegación entre rutas, por lo tanto no se instaló React Router.

**Dependencias instaladas:** solo `axios`.

---

### Proxy Vite en lugar de baseURL absoluta

Se configuró un proxy en `vite.config.js` apuntando `/api` → `http://localhost:3000`. Esto evita exponer el puerto del backend en el código del cliente y es más cercano a un setup de producción.

```js
// vite.config.js
server: {
  proxy: { '/api': 'http://localhost:3000' }
}
```

---

### Comportamiento post-renovación

Cuando una póliza se renueva con una fecha futura mayor a 30 días, sale de la work queue del backend. El frontend detecta esto en `refrescarTodo`: si después de recargar la lista el `selectedId` ya no está en la cola, limpia la selección automáticamente. Esto evita mostrar un detalle desactualizado de una póliza que ya no requiere acción.

---

## Estructura final del frontend

```
frontend/src/
├── services/
│   └── api.js              ← instancia axios + 5 funciones de llamada
├── components/
│   ├── PolizaList.jsx      ← tabla izquierda con badge de días y estado
│   ├── PolizaDetail.jsx    ← panel derecho: info cliente + póliza + historial
│   ├── GestionForm.jsx     ← form seguimiento (result + nota)
│   └── RenovacionForm.jsx  ← form renovación (nueva fecha + nota)
├── App.jsx                 ← layout dos columnas, estado global, lógica de refresco
├── App.css                 ← todos los estilos (sin CSS framework externo)
└── index.css               ← reset mínimo
```

---

## Flujos implementados y verificados

| Flujo | Endpoint consumido | Resultado |
|---|---|---|
| Ver cola de trabajo | GET /api/policies | Tabla ordenada por urgencia |
| Ver detalle | GET /api/policies/:id + GET /api/policies/:id/interactions | Panel derecho con cliente, póliza e historial |
| Registrar gestión | POST /api/policies/:id/interactions | Form con resultado (5 opciones) + nota |
| Registrar renovación | POST /api/policies/:id/renew | Form con nueva fecha + nota; si sale de cola, deselecciona |

---

## Estados visuales

| Estado backend | Label UI | Color |
|---|---|---|
| `upcoming` | Próxima a vencer | Amarillo |
| `expired_in_window` | Vencida en ventana | Rojo |
| `outside_window` | Fuera de ventana | Gris |
| `not_due` | Al día | Verde |

---

## Resultado

Frontend funcional verificado en `http://localhost:5173`. Las 4 funcionalidades del MVP están operativas.
