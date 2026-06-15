# Fase 7 — Profundización del Code Review

**Fecha:** 2026-06-15  
**Herramienta IA:** Claude Sonnet 4.6 (Claude Code)  
**Contexto:** Discusión posterior al análisis técnico de expired_policies.py. El foco es razonamiento y conclusiones, no hallazgos adicionales.

---

## Pregunta de Jeisson

> Si fueras el Tech Lead responsable de esta revisión y tuvieras que reunirte con el desarrollador que escribió este endpoint, ¿qué preguntas le harías para entender por qué tomó estas decisiones?
>
> 1. ¿Qué señales en el código te hacen pensar que el desarrollador entendió parcialmente el problema pero no comprendió completamente el dominio?
> 2. ¿Qué parte del enunciado crees que fue ignorada o mal interpretada?
> 3. ¿Qué lecciones sobre el uso de IA para desarrollo de software podemos extraer de este ejemplo?
> 4. ¿Cómo diferenciarías un error de programación de un error de comprensión del negocio en este caso?
> 5. ¿Qué reflexión final agregarías a un code_review.md para demostrar criterio técnico y pensamiento crítico sin desacreditar el uso de IA?

---

## Respuesta

### Las preguntas que haría en esa reunión

No empezaría por el código. Empezaría por el problema.

*"¿Qué debería hacer María con la lista que retorna este endpoint?"*

Esa pregunta sola revela si el desarrollador pensó en el usuario final o solo en la estructura técnica. Si la respuesta es *"ver sus pólizas vencidas"*, el problema está ahí: entendió el output pero no el propósito. El propósito no es listar pólizas vencidas, es identificar cuáles todavía puede recuperar.

Después preguntaría: *"¿Qué pasa si una póliza lleva 8 meses vencida? ¿Debería aparecer aquí?"* Si duda, significa que nunca se preguntó eso. Si dice que sí debería aparecer, entonces el malentendido del dominio es completo.

Por último: *"¿De dónde salió el umbral de 7 días para marcar algo como urgente?"* Esa pregunta casi siempre genera silencio, porque el número no vino de ningún lado. Vino de la intuición de que "una semana suena razonable".

---

### Las señales de comprensión parcial

Lo que llama la atención es que el desarrollador *sí* entendió varias cosas no triviales: que hay una relación entre pólizas y clientes, que el historial de intentos de contacto es relevante para priorizar, que la urgencia importa. Esas no son inferencias triviales.

Lo que no entendió es el *límite* del problema. Vio "pólizas vencidas" y modeló eso literalmente: `expiration_date < today`. No vio que "vencida" en este dominio tiene una dimensión temporal adicional que define si la póliza es accionable o no.

El campo `contact_attempts` es la señal más reveladora. Alguien que cuenta los intentos de contacto está pensando en priorización, en qué tan trabajado está un caso. Ese pensamiento es sofisticado. Pero sirve de poco si la lista incluye pólizas que llevan un año vencidas y que ya no pueden recuperarse. Es como optimizar el orden de una bandeja de entrada que incluye correos de hace tres años.

---

### Qué parte del enunciado fue ignorada

El prompt decía *"que las pueda gestionar"*. Esa frase contiene el dominio completo que falta en el código.

"Gestionar" no significa "ver". Significa actuar, intervenir, recuperar. Y en seguros, solo se puede gestionar una póliza vencida dentro de un período específico. Después de ese período, la acción posible cambia de naturaleza: ya no es renovación, es nueva contratación, que involucra otros procesos, otros tiempos y probablemente otra comisión.

La IA leyó "pólizas vencidas" y resolvió eso. Ignoró "que pueda gestionar" porque esa restricción requiere conocimiento del dominio que no estaba en el prompt. No es un error de la IA: es el límite exacto de lo que un modelo puede inferir sin contexto.

---

### Lecciones sobre el uso de IA en desarrollo

La más importante: **la ausencia de conocimiento es invisible en el output de una IA**.

Si le pido a un desarrollador senior que modele la ventana de recuperación y no lo hace, puedo preguntarle por qué. Él puede decirme que no sabía que existía, que lo asumió diferente, o que lo dejó para después. La IA no puede decirme nada de eso. Retorna código que parece completo porque tiene la estructura correcta, los nombres razonables y la lógica esperada. La ausencia de la regla de los 30 días no genera ninguna advertencia, ningún comentario, ninguna señal.

Eso cambia cómo hay que revisar código generado por IA. La revisión tradicional busca errores en lo que está. La revisión de código generado por IA también tiene que buscar lo que *no está*, que es mucho más difícil porque requiere conocer el dominio completo de antemano.

La segunda lección: **la calidad del output está acotada por la calidad del contexto**. Un prompt sin la regla de negocio central produce código sin esa regla. No es falla de la herramienta; es falla del proceso de uso. La IA es un amplificador: amplifica tanto el conocimiento que se le entrega como las omisiones.

---

### Error de programación vs. error de comprensión del negocio

La diferencia es si el error existiría en cualquier dominio o solo en este.

La conexión sin cerrar es un error de programación. Ocurriría igual si el endpoint listara libros, facturas o usuarios. No requiere conocer nada de seguros para identificarlo.

La ausencia de la ventana de 30 días es un error de comprensión del negocio. Un desarrollador con 20 años de experiencia en Python, sin conocimiento de seguros, revisaría ese `WHERE expiration_date < today` y no encontraría nada malo. El código hace exactamente lo que dice. El problema está en lo que *debería* decir, y eso solo es visible si sabes cómo funciona el negocio de renovaciones.

Esa distinción importa en una revisión de código porque define quién puede encontrar cada tipo de error. Los errores de programación los encuentra cualquier revisor técnico. Los errores de comprensión del negocio solo los encuentra alguien que entiende el dominio. Y en sistemas donde el negocio es complejo, como InsurTech, la segunda categoría suele ser más peligrosa porque pasa todos los filtros técnicos.

---

### Reflexión final incorporada al code_review.md

> El error más grave de este endpoint no es técnico. Es que *parece correcto*. Compila, retorna 200, devuelve JSON con estructura razonable. Un QA sin conocimiento del dominio lo aprobaría. Un test de integración básico lo pasaría. Solo falla cuando alguien que conoce el negocio pregunta: *¿y las pólizas que ya no se pueden recuperar, por qué aparecen?*
>
> Esto ilustra el límite preciso del código generado por IA: el modelo produce código estructuralmente correcto pero semánticamente incompleto, porque la regla más importante del negocio —la ventana de 30 días— no estaba en el prompt y no podía inferirse. La ausencia de ese conocimiento no genera ninguna advertencia, ningún comentario, ninguna señal.
>
> El uso responsable de IA en desarrollo requiere que quien valida el output tenga el conocimiento de dominio que la herramienta no tiene. La IA reduce el tiempo de scaffolding. No reemplaza el criterio de quien sabe qué problema se está resolviendo. El valor del ingeniero está en saber qué preguntas hacerle al código antes de aceptarlo.

---

## Decisión de Jeisson

Incorporar parcialmente al `code_review.md`:
- Nueva sección **"Más allá de los hallazgos técnicos"** con las señales de comprensión parcial y la distinción error de programación vs. error de comprensión del negocio.
- Conclusión expandida con la reflexión sobre IA y la ausencia invisible de conocimiento.
