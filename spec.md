Spec - Sistema de Gestión de Renovaciones para María
1. Cómo entendí el problema

María administra aproximadamente 280 clientes utilizando un archivo Excel para controlar pólizas y renovaciones.

El principal problema identificado no es el almacenamiento de información, sino la gestión oportuna de renovaciones y el seguimiento de clientes.

Actualmente María debe revisar manualmente qué pólizas requieren atención, registrar sus gestiones en diferentes columnas y recordar el contexto de conversaciones anteriores. Esto genera riesgo de perder oportunidades de renovación y clientes cuando una póliza vence sin seguimiento adecuado.

Existe una ventana de 30 días posteriores al vencimiento de una póliza que tiene un impacto importante para el negocio del asesor, por lo que el sistema debe ayudar a identificar y priorizar estos casos.

Considero que la aplicación debe responder principalmente tres preguntas:

¿Qué clientes requieren atención hoy?
¿Cuáles son los casos más urgentes?
¿Qué ocurrió en las gestiones anteriores con cada cliente?
2. Supuestos
Supuestos iniciales
El sistema será utilizado por una única asesora (María).
No se implementará autenticación.
No se implementará importación desde Excel.
No se implementarán integraciones con aseguradoras.
No se implementarán notificaciones automáticas.
Las pólizas ya existen dentro del sistema.
Una póliza vencida por más de 30 días se considerará fuera de la ventana prioritaria de renovación.
3. Alcance del MVP
Funcionalidades incluidas
Visualizar pólizas ordenadas por prioridad.
Consultar información del cliente.
Registrar gestiones realizadas.
Consultar historial de gestiones.
Registrar una renovación.
Funcionalidades fuera de alcance
Gestión de múltiples asesores.
Importación masiva de datos.
Integraciones externas.
Notificaciones automáticas.
Adjuntos o documentos.
Reportes avanzados.
4. Flujos principales
Flujo 1: Consultar casos prioritarios

María ingresa a la aplicación y visualiza las pólizas que requieren atención ordenadas por prioridad.

Flujo 2: Registrar gestión

María selecciona una póliza y registra el resultado de una llamada o contacto con el cliente.

Flujo 3: Consultar historial

María consulta las gestiones previas realizadas sobre una póliza antes de volver a contactar al cliente.

Flujo 4: Registrar renovación

María registra que una póliza fue renovada para dejar de verla como un caso pendiente.

5. Modelo de datos

Cliente
- id
- nombre
- telefono
- email

Póliza
- id
- clienteId
- numeroPoliza
- tipo
- aseguradora
- fechaVencimiento

Gestión
- id
- polizaId
- tipo          (asignado por backend: "follow_up" | "renewal")
- fecha
- resultado     (nullable: "contacted" | "no_answer" | "call_later" | "interested" | "not_interested")
- nota

Relaciones: Cliente 1→N Póliza · Póliza 1→N Gestión

Decisiones de diseño del modelo:

- `renovada` eliminado de Póliza: la renovación queda representada únicamente por la actualización de fechaVencimiento y una gestión de tipo "renovacion". Evita duplicar estados y mantiene una única fuente de verdad basada en fechas.
- `estado` no se almacena: se calcula en tiempo real a partir de fechaVencimiento y la fecha actual.
- `tipo` en Gestión no lo ingresa María: el backend lo asigna automáticamente según el endpoint utilizado.
- `resultado` es nullable: las gestiones de tipo "renovacion" no requieren resultado, solo las de seguimiento.

6. API REST

Work queue — regla de negocio fija:
Una póliza entra a la cola de trabajo 30 días antes de su vencimiento y permanece hasta 30 días después. Fuera de esa ventana (±30 días) no es accionable por el mismo intermediario sin competencia.

Endpoints:

GET /api/polizas
Work queue: devuelve únicamente pólizas dentro de la ventana [-30, +30] días respecto a fechaVencimiento.
Excluye: pólizas fuera de ventana (< -30 días vencidas).
Orden de prioridad: vencidas en ventana primero (0 a -30), luego próximas a vencer (0 a +30).
Respuesta por ítem: id, numeroPoliza, cliente (nombre, telefono), tipo, aseguradora, fechaVencimiento, diasAlVencimiento, estado, ultimaGestion (fecha, resultado).

GET /api/polizas/:id
Detalle completo de una póliza con información del cliente.

GET /api/polizas/:id/gestiones
Historial de gestiones de una póliza, ordenadas por fecha descendente.

POST /api/policies/:id/interactions
Registra una gestión de seguimiento. Backend asigna tipo = "follow_up".
Body: { "result": "no_answer", "note": "Llamé a las 3pm, no contestó" }

POST /api/policies/:id/renew
Operación compuesta en transacción: actualiza expirationDate + crea interacción tipo "renewal".
Body: { "newExpirationDate": "2027-06-10", "note": "Renovado con ajuste de prima" }
Si una operación falla, ambas se revierten.

7. Frontend
Objetivo

Permitir que María identifique rápidamente las pólizas que requieren atención, consulte el contexto de gestiones anteriores y registre nuevas acciones sin necesidad de navegar entre múltiples pantallas.

Enfoque

La aplicación estará compuesta por una única pantalla principal enfocada en la gestión diaria de renovaciones.

Distribución de la pantalla
Lista principal de pólizas

Se mostrará una tabla ordenada por prioridad que incluirá:

Nombre del cliente
Teléfono
Tipo de póliza
Fecha de vencimiento
Días para vencer o días vencida
Estado
Última gestión realizada

La tabla permitirá identificar rápidamente los casos más importantes del día.

Panel de detalle

Al seleccionar una póliza se mostrará:

Información del cliente
Información de la póliza
Historial de gestiones realizadas
Resultado de la última gestión
Registro de gestión

Desde el mismo panel se podrá:

Registrar una nueva gestión
Agregar notas
Registrar el resultado del contacto
Registro de renovación

La póliza podrá marcarse como renovada desde el detalle del caso.

Estados visuales

Los casos se identificarán visualmente según su situación:

Próxima a vencer
Vencida dentro de la ventana de renovación
Fuera de ventana de renovación
Renovada
Justificación

Se prioriza una única pantalla para reducir la cantidad de navegación y permitir que María gestione la mayor cantidad posible de renovaciones desde un solo lugar.

8. Estrategia de pruebas

Pendiente de definir.

9. Trade-offs y decisiones

| Decisión | Alternativa descartada | Justificación |
|---|---|---|
| `estado` derivado en tiempo real | Almacenado en DB | Un campo almacenado puede desincronizarse con la fecha real; la derivación garantiza consistencia |
| `renovada` eliminado del modelo | Boolean permanente en Póliza | Con el campo activo, la póliza nunca volvería al work queue; la fecha actualizada es suficiente |
| Work queue con ventana ±30 días fija | Listado general con filtros | La cola debe ser accionable por defecto; pólizas fuera de ventana no requieren acción inmediata |
| `tipo` asignado por backend | Ingresado por María | Reduce fricción en el registro; María no toma decisiones técnicas en la UI |
| Renovación como operación compuesta | PATCH simple a la póliza | Garantiza atomicidad: o se actualiza la fecha y se crea la gestión, o no ocurre ninguna de las dos |
| `resultado` nullable en Gestión | Requerido siempre | Las gestiones de renovación no tienen resultado de contacto; forzarlo sería ruido sin valor |