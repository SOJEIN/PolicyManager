# PolicyManager

Aplicación web que ayuda a asesores de seguros a gestionar renovaciones de pólizas sin perder de vista la ventana de recuperación de 30 días — el período crítico durante el cual una póliza vencida todavía puede renovarse con el mismo intermediario sin necesidad de una nueva contratación.

Desarrollado como prueba técnica para Agentemotor.

---

## Video

<!-- Graba un video de máximo 3 minutos (Loom, YouTube unlisted, etc.) -->
<!-- leyendo las secciones más relevantes de spec.md en voz alta y comentando -->
<!-- al final la decisión que más tiempo te tomó pensar. Luego reemplaza esta línea: -->

**[Link al video →](https://youtu.be/ggOxli1NBsk)**

---

## Cómo correrlo

**Requisito:** Node.js 18+

```bash
npm run setup   # instala dependencias y carga el dataset inicial
npm start       # inicia backend (puerto 3000) y frontend (puerto 5173)
```

Abrir `http://localhost:5173`.

```bash
npm test        # ejecutar tests (opcional)
```

---

## Decisiones de diseño y justificación

### La ventana de 30 días como invariante central

Una póliza vencida solo puede renovarse a través del mismo intermediario dentro de los 30 días posteriores al vencimiento. Pasado ese plazo, el caso requiere una nueva contratación — un proceso diferente, un timeline diferente, y probablemente una estructura de comisiones diferente.

Esta restricción moldeó cada decisión de diseño del sistema:

**La cola de trabajo no es una lista filtrada.** `GET /api/policies` devuelve únicamente las pólizas sobre las que todavía es posible actuar: aquellas dentro de la ventana de ±30 días, ordenadas por urgencia. Esto se aplica a nivel de query en el backend, no en el frontend. El servidor no devuelve datos que no sean accionables.

**Las pólizas vencidas dentro de la ventana aparecen antes que las próximas a vencer.** Una póliza que venció hace 20 días tiene 10 días para recuperarse. Una que vence en 20 días tiene 20. El orden refleja esta asimetría: el caso con menos tiempo disponible aparece primero, independientemente de en qué dirección corre el reloj.

**El `status` se deriva en tiempo real, nunca se almacena.** Almacenarlo requeriría un proceso en segundo plano para mantenerlo actualizado cada noche. Un `status = 'upcoming'` guardado en base de datos se vuelve silenciosamente incorrecto sin ningún error visible. La función `deriveStatus()` es la única fuente de verdad: recibe `daysUntilExpiration` y devuelve el estado correcto en el momento de la consulta.

### La renovación como operación atómica compuesta

Renovar una póliza requiere que dos cosas ocurran juntas: actualizar `expirationDate` en la póliza y crear un registro de interacción de tipo `renewal`. Si solo una de las dos tiene éxito, los datos quedan inconsistentes — la póliza aparece renovada sin trazabilidad, o la trazabilidad registra una renovación que nunca se efectuó.

La función `renewPolicy()` envuelve ambas operaciones en una única transacción SQLite. O los dos cambios persisten, o ninguno lo hace.

### Sin creación de clientes ni pólizas en la UI

La especificación establece que María gestiona pólizas existentes, no las crea. El script `seed.js` carga el dataset inicial. Agregar un formulario de creación habría introducido alcance que no resuelve el problema central y habría diluido el foco del MVP.

### Layout de una sola pantalla con acciones por pestañas

María necesita recorrer entre 15 y 20 casos por sesión. Cada paso de navegación es una interrupción potencial. El layout mantiene la cola de trabajo y el detalle del caso en la misma pantalla en todo momento. Las acciones se organizan en tres pestañas — registrar gestión, renovar póliza, ver historial — para reducir el ruido visual sin agregar profundidad de navegación.

La barra de urgencia en la cola de trabajo proporciona un gradiente visual de prioridad sin que María tenga que leer números individuales. Un vistazo rápido a la lista comunica cuáles son los casos más urgentes.

---

## Qué dejé fuera y por qué

| Funcionalidad | Motivo |
|---|---|
| Autenticación | Sistema de un solo usuario según la especificación. Agregar auth introduciría costo de implementación sin valor de negocio en esta etapa. |
| Importación desde Excel | Explícitamente fuera de alcance. En un despliegue real, sería la primera prioridad post-MVP — por ahora lo cubre el script `seed.js`. |
| Integraciones externas | No había contratos de API con aseguradoras disponibles, y la especificación las excluía. |
| Notificaciones automáticas | Requeriría infraestructura de scheduling en segundo plano, fuera del alcance de un MVP local. |
| Múltiples asesores | El sistema está diseñado específicamente para María. El soporte multi-usuario requiere `advisor_id` en el modelo de póliza, lógica de autorización y aislamiento de cartera. |
| Reportes avanzados | Las tasas de conversión y la efectividad por canal son valiosas, pero requieren datos acumulados con el tiempo — no es una funcionalidad para el día uno. |

---

## Si esto fuera a producción mañana, qué le falta

### La ventana de 30 días no debería estar hardcodeada

La ventana de recuperación es actualmente una constante dentro de `deriveStatus()`. En la práctica, esta regla probablemente varía por aseguradora y tipo de póliza. Cambiarla hoy requiere un cambio de código y un redeploy. Antes de producción, debería ser un valor de configuración almacenado en la base de datos, con alcance por aseguradora o tipo de póliza, editable sin tocar el código.

### Migración de datos desde Excel

La especificación asume que las pólizas ya existen en el sistema. En un despliegue real, el Excel de María necesita migrarse. Las hojas de cálculo del mundo real tienen formatos de fecha inconsistentes, nombres de clientes duplicados y números de póliza que no coinciden con los patrones esperados. El script de migración requeriría validación, transformación y revisión manual de casos borde — solo eso es probablemente un día completo de trabajo.

### Estrategia de backup

Todo el estado del sistema vive en un único archivo SQLite. Un fallo del servidor sin backup significa perder todo el historial de interacciones, que es el valor operativo principal del sistema después de las primeras semanas. Un export diario a almacenamiento externo es el mínimo de seguridad viable.

### Canal de contacto como campo estructurado

El canal de contacto (llamada, WhatsApp, email, visita) se antepone actualmente al texto de la nota como texto plano. Funciona operativamente, pero hace imposible consultar qué canal produce más renovaciones. Antes de producción, debería ser una columna dedicada en la tabla `interactions`.

### Validación de fecha de vencimiento al renovar

La API acepta cualquier fecha válida como `newExpirationDate`. Si María ingresa una fecha en el pasado por error, la póliza vuelve a la cola de trabajo inmediatamente como vencida sin ninguna advertencia. El endpoint debería validar que la nueva fecha esté al menos 30 días en el futuro.

### Primeros 90 días post-lanzamiento

**Mes 1 — Estabilidad y calidad de datos:** herramienta de importación desde Excel, backup automatizado de SQLite, validación de fecha en renovación, columna dedicada para el canal de contacto.

**Mes 2 — Eficiencia operativa:** programación de seguimientos ("volver a llamar el [fecha]"), vista de cliente para ver todas las pólizas de una persona en un solo panel, escalado visual a partir del día 25+.

**Mes 3 — Resultados medibles:** dashboard de conversión con el porcentaje de pólizas dentro de la ventana que se recuperan por semana, ventana de recuperación configurable por aseguradora, base para soporte multi-asesor si la empresa crece.

---

## Tiempo aproximado que me tomó

| Área | Tiempo |
|---|---|
| Análisis de negocio y modelado de dominio | 2 h |
| Arquitectura y diseño de la API | 1 h |
| Implementación del backend | 3,5 h |
| Implementación del frontend y UX | 4,5 h |
| Testing y validación | 1 h |
| Documentación, historial de IA y code review | 2 h |
| **Total** | **~14 horas** |

---

## Qué mejoraría de esta prueba técnica

La prueba está bien estructurada: evalúa análisis de dominio, pensamiento arquitectónico y calidad de implementación a través de un problema realista. El requisito de incluir el historial de interacción con IA es un acierto que la mayoría de las pruebas omite.

Lo único que agregaría es la obligación de definir métricas de éxito antes de escribir una sola línea de código.

El planteamiento actual pregunta: *¿puedes construir un sistema que ayude a María a gestionar renovaciones de pólizas?* Un planteamiento más sólido agregaría: *¿cómo sabrías, después de un mes, que el sistema está funcionando?*

Por ejemplo:
- ¿Qué porcentaje de las pólizas dentro de la ventana de 30 días se están renovando?
- ¿Cuántas menos pólizas llegan al día 30 sin un intento de contacto?
- ¿Cuánto tiempo ahorra María por semana en comparación con el flujo de trabajo en Excel?

Estas preguntas cambian cómo se diseña el sistema. Si la tasa de conversión dentro de la ventana es la métrica principal, la UI necesita mostrársela a María: no solo quién requiere atención, sino si sus acciones están produciendo resultados. Que el software funcione es condición necesaria. Que mejore resultados demostrablemente es el objetivo.

---

## Reflexión final

El problema central de esta prueba no es técnico. Es sobre el costo de la inacción: cada póliza que sale de la ventana de 30 días sin un intento de renovación es una pérdida permanente para el asesor. El sistema tiene que hacer visible ese costo antes de que se vuelva irreversible.

La parte más instructiva del proyecto fue la revisión del endpoint Flask. El fragmento no tenía errores de sintaxis, devolvía 200 y producía JSON válido. El problema era que respondía la pregunta equivocada: listaba todas las pólizas vencidas en lugar de listar únicamente las que todavía podían recuperarse. Esa distinción era invisible para cualquiera sin conocimiento del dominio. Una revisión técnica lo habría aprobado. Una revisión de negocio lo detecta de inmediato.

Un sistema que funciona no es lo mismo que un sistema que resuelve el problema.

---

**Entregables adicionales:**
- `spec.md` — análisis del problema, modelo de dominio, diseño de la API y trade-offs
- `code_review.md` — revisión de un endpoint Flask generado por IA, evaluado como código con destino a producción
- `ai_history/` — registro completo de decisiones asistidas por IA a lo largo de todas las fases del proyecto
