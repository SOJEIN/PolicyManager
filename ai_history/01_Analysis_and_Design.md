# Fase 1 — Análisis y Diseño
**Proyecto:** PolicyManager — Sistema de gestión de renovaciones  
**Fecha:** 2026-06-13  
**Participantes:** Miguel Rojas (desarrollador) · Claude (mentor técnico / arquitecto)

---

## Contexto inicial

Miguel presenta el problema: María administra ~280 clientes usando Excel para controlar pólizas y renovaciones. El problema principal no es almacenar información sino gestionar oportunamente las renovaciones y realizar seguimiento.

El sistema debe responder tres preguntas:
1. ¿Qué clientes requieren atención hoy?
2. ¿Cuáles son los casos más urgentes?
3. ¿Qué ocurrió en las gestiones anteriores con cada cliente?

**Decisiones iniciales acordadas:**
- Sistema para una única asesora (María)
- Sin autenticación
- Sin importación desde Excel
- Sin integraciones externas
- Sin notificaciones automáticas
- Entidades base: clientes, pólizas, gestiones
- Una única pantalla principal enfocada en la gestión diaria

---

## Tema 1 — Cómo identificar entidades de negocio

**Pregunta de Miguel:** Antes de proponer entidades o tablas, ¿cómo identifica un arquitecto las entidades de negocio a partir de los flujos y requisitos?

**Explicación del mentor:**

Un arquitecto no empieza por pensar en tablas. Empieza por leer los flujos y buscar los sustantivos y verbos que el negocio usa naturalmente.

**Paso 1 — Subrayar los sustantivos del dominio**  
Los sustantivos recurrentes en flujos y requisitos son candidatos a entidades. En el spec aparecen: cliente, póliza, gestión, renovación.

**Paso 2 — Verificar que cada sustantivo tiene identidad propia**  
La pregunta clave: ¿tiene sentido hablar de esto sin el contexto de otro?
- ¿Puede existir un cliente sin una póliza? Sí.
- ¿Puede existir una póliza sin un cliente? No.
- ¿Puede existir una gestión sin una póliza? No.

**Paso 3 — Distinguir entidades de atributos**  
No todo sustantivo es una entidad. "Tipo de póliza" puede ser solo un atributo si no tiene comportamiento propio.

**Paso 4 — Verificar contra los flujos**  
Cada entidad debe poder justificarse respondiendo: ¿en cuál flujo del sistema esta entidad cambia de estado, se crea o se consulta?

---

## Tema 2 — Identificación de entidades por Miguel

**Análisis de Miguel:**

1. **Cliente** — entidad con identidad propia, representa a la persona asegurada.
2. **Póliza** — entidad principal que María necesita gestionar y priorizar.
3. **Gestión** — entidad que registra interacciones y conserva historial.
4. **Renovación** — la ve más como una acción o cambio de estado de la póliza, no como entidad independiente. En los flujos no observa que tenga información propia suficiente para justificar una entidad separada.

**Pregunta de Miguel:** ¿Es razonable este análisis o estoy pasando por alto algún criterio importante?

**Respuesta del mentor:**

El análisis es sólido. El método aplicado es correcto. Hay un matiz adicional:

> La pregunta no es solo "¿tiene datos propios?" sino también "¿necesitamos saber que esto ocurrió, cuándo ocurrió, y qué pasó después?"

Ese mismo criterio justificó mantener Gestión como entidad. Aplicado a Renovación:

> Si una póliza fue renovada hace 8 meses, ¿María necesita saber *cuándo* se renovó, o solo que *está* renovada?

**Riesgo señalado:** Si Renovación es solo `estado = 'renovada'`, se pierde la fecha en que ocurrió y cualquier dato adicional.

**Decisión previa a cerrar:** ¿Qué ocurre con la póliza después de renovarse?
- La misma póliza continúa con nuevo período de vigencia (modelo más simple)
- Nace una nueva póliza que reemplaza a la anterior

---

## Tema 3 — Decisión sobre el modelo de renovación

**Decisión de Miguel:**

La renovación es una continuación de la misma póliza con una nueva fecha de vencimiento. La interpreta como una acción que actualiza la póliza y genera una gestión asociada, no como una entidad independiente.

**Pregunta de Miguel:** ¿Qué ventajas o riesgos ves en esta decisión para el MVP?

**Evaluación del mentor:**

**Ventajas:** El modelo captura lo esencial sin complejidad innecesaria. La gestión actúa como registro de auditoría — con un campo `tipo` en ella, el hecho de que ocurrió queda preservado con fecha y contexto.

**Riesgo principal — Atomicidad:**  
La decisión implica dos operaciones que deben ocurrir juntas:
1. Actualizar `fechaVencimiento` y `estado` en la póliza.
2. Crear una gestión asociada marcando la renovación.

Si una falla, los datos quedan inconsistentes.

**Mitigación:** Esa operación debe ejecutarse dentro de una transacción de base de datos. Ambas cosas ocurren, o ninguna.

**Implicación para la API:** El endpoint de renovación no puede ser un simple `PATCH` a la póliza — debe ser una operación compuesta que garantice atomicidad.

**Miguel acepta la decisión y el riesgo.**

---

## Tema 4 — Criterio para identificar atributos de dominio vs. de implementación

**Pregunta de Miguel:** ¿Cómo decidir qué atributos pertenecen realmente al dominio y cuáles son detalles de implementación?

**Explicación del mentor:**

**La distinción fundamental:**  
Un atributo de dominio existe porque el negocio lo necesita. Un atributo de implementación existe porque el software lo necesita para funcionar.

María nunca pensaría en un `id` o un `created_at`. Sí pensaría en el nombre del cliente o la fecha de vencimiento de una póliza.

**Heurístico práctico — dos preguntas en orden:**

1. ¿Qué columnas tendría esta entidad en el Excel de María?  
   → Candidatas a atributos de dominio.

2. ¿Qué necesita saber el sistema para responder las tres preguntas del spec?  
   → Captura atributos que el sistema necesita aunque María no los nombre explícitamente.

Los atributos de implementación (claves primarias, foráneas, marcas de tiempo técnicas) se agregan en una segunda pasada, separados conscientemente.

**Riesgo de mezclarlos:** Diseñar pensando primero en `id BIGINT AUTO_INCREMENT` lleva a modelos que resuelven bien el almacenamiento pero mal las preguntas reales del sistema.

---

## Tema 5 — Propuesta de modelo de datos por Miguel

**Propuesta de Miguel:**

```
Cliente
- id
- nombre
- telefono
- email

Póliza
- id
- clienteId
- tipo
- aseguradora
- fechaVencimiento
- estado
- fechaRenovacion

Gestión
- id
- polizaId
- fecha
- resultado
- nota
```

**Solicitud:** Revisar el modelo en cuatro dimensiones:
1. Atributos faltantes necesarios
2. Atributos que no aporten valor al MVP
3. Relaciones entre entidades
4. Decisiones importantes que se están tomando

---

## Tema 6 — Revisión del modelo por el mentor

### 1. Atributos que faltan y son necesarios

**En Póliza: falta `numeroPoliza`**  
Es el identificador real de una póliza en el mundo del seguro. María lo necesita para hablar con la aseguradora o con el cliente. Sin él, la póliza existe en el sistema pero no puede referenciarse con el mundo exterior.

**En Gestión: falta `tipo`**  
Sin un campo `tipo`, todas las gestiones se ven iguales — no puedes distinguir una llamada de una renovación. El endpoint de renovación necesitará marcar esa gestión de alguna manera.

### 2. Atributo que genera ruido

**`fechaRenovacion` en Póliza es parcialmente redundante.**  
Si la gestión de renovación ya registra cuándo ocurrió, `fechaRenovacion` duplica esa información. Puede desincronizarse. Para el MVP se recomienda omitirlo y obtenerlo desde la gestión cuando sea necesario.

### 3. Relaciones

- `Cliente` 1 → N `Póliza` — un cliente puede tener más de una póliza
- `Póliza` 1 → N `Gestión` — una póliza acumula gestiones en el tiempo

No hay relaciones muchos-a-muchos ni entidades intermedias necesarias para el MVP.

### 4. La decisión más importante

**`estado` como valor almacenado vs. valor derivado.**

Tres de los cuatro estados visuales son calculables en tiempo real a partir de `fechaVencimiento` y la fecha de hoy:
- Próxima a vencer
- Vencida dentro de ventana
- Fuera de ventana

Solo *Renovada* es un estado de negocio real que no puede derivarse de fechas.

Si `estado` se almacena para los cuatro casos, puede desincronizarse: una póliza con `estado = 'proxima_a_vencer'` almacenado aunque hoy ya esté vencida.

**Alternativa recomendada:** Almacenar solo `renovada: boolean` y derivar los demás estados al momento de consultar.

**Miguel acepta todos los ajustes.**

---

## Modelo de datos cerrado

**Cliente**  
`id`, `nombre`, `telefono`, `email`

**Póliza**  
`id`, `clienteId`, `numeroPoliza`, `tipo`, `aseguradora`, `fechaVencimiento`, `renovada` *(boolean)*  
→ `estado` se deriva en tiempo real a partir de `fechaVencimiento` y `renovada`

**Gestión**  
`id`, `polizaId`, `tipo`, `fecha`, `resultado`, `nota`

**Relaciones:** Cliente 1→N Póliza · Póliza 1→N Gestión

### Decisiones de diseño registradas

| Decisión | Justificación |
|---|---|
| `estado` no se almacena | Se calcula al consultar para evitar inconsistencias |
| `renovada` como boolean | Único estado de negocio que requiere persistencia explícita |
| `fechaRenovacion` omitida | La gestión de tipo `renovacion` cubre esa información |
| `numeroPoliza` incluido | Identifica la póliza en el mundo real (aseguradoras, clientes) |
| `tipo` en Gestión | Distingue contactos regulares de renovaciones |
| Renovación como operación compuesta | Actualiza póliza + crea gestión en una transacción |

---

## Próximo paso acordado

Diseño de la API REST.
