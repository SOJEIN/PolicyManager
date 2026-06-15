# Code Review — expired_policies.py

**Revisor:** Jeisson Ochoa  
**Fecha:** 2026-06-15  
**Contexto:** Endpoint Flask generado por IA a partir del prompt *"hazme un endpoint Python/Flask que liste las pólizas vencidas de un asesor para que las pueda gestionar"*. Se evalúa como si estuviera a punto de desplegarse a producción en un sistema InsurTech.

---

## Código analizado

```python
# expired_policies.py
from flask import Flask, request, jsonify
from datetime import datetime, timedelta
import sqlite3

app = Flask(__name__)
DB = 'agentemotor.db'

@app.route('/advisors/<advisor_id>/expired-policies', methods=['GET'])
def list_expired_policies(advisor_id):
    """Lista las pólizas vencidas de un asesor."""
    conn = sqlite3.connect(DB)
    cursor = conn.cursor()
    today = datetime.now().date()
    cursor.execute(
        "SELECT id, client_id, insurer, expiration_date, status "
        "FROM policies WHERE advisor_id = ? AND expiration_date < ?",
        (advisor_id, today)
    )
    expired = cursor.fetchall()

    result = []
    for policy in expired:
        policy_id, client_id, insurer, exp_date_str, status = policy
        exp_date = datetime.strptime(exp_date_str, '%Y-%m-%d').date()
        days_overdue = (today - exp_date).days

        cursor.execute(
            "SELECT name, phone FROM clients WHERE id = ?",
            (client_id,)
        )
        client = cursor.fetchone()

        cursor.execute(
            "SELECT COUNT(*) FROM contact_attempts WHERE policy_id = ?",
            (policy_id,)
        )
        attempts = cursor.fetchone()[0]

        priority = 'urgent' if days_overdue > 7 else 'normal'

        result.append({
            'policy_id': policy_id,
            'client_name': client[0],
            'client_phone': client[1],
            'insurer': insurer,
            'expiration_date': exp_date_str,
            'days_overdue': days_overdue,
            'contact_attempts': attempts,
            'priority': priority,
            'recommended_action': 'Contactar urgentemente para evitar pérdida del cliente'
        })

    return jsonify(result), 200

if __name__ == '__main__':
    app.run(debug=True)
```

---

## Resumen ejecutivo

El endpoint tiene un error de negocio crítico que invalida su propósito central: devuelve pólizas que el asesor ya no puede recuperar, mientras que potencialmente omite el criterio de urgencia correcto. Adicionalmente, tiene un problema de rendimiento estructural (N+1 queries) que lo hace inviable en escala, y dos problemas de estabilidad/seguridad que pueden tumbar el servidor en producción. La IA generó código que *sintácticamente funciona* pero que *semánticamente está equivocado* respecto al dominio del negocio.

---

## Hallazgos

---

### REGLAS DE NEGOCIO

---

#### H1 — La ventana de 30 días está completamente ausente

**Prioridad:** Alta

**Qué está mal:**  
El `WHERE` filtra `expiration_date < today`, lo que devuelve *todas* las pólizas vencidas desde el inicio de los tiempos: las de ayer, las de hace 6 meses y las de hace 3 años.

**Por qué es un problema:**  
En el dominio de seguros, una póliza vencida más de 30 días ya no es recuperable por el mismo intermediario sin nueva contratación. El endpoint debería exponer únicamente las pólizas dentro de la ventana de recuperación (`[hoy - 30 días, hoy)`). Fuera de esa ventana, el caso no es accionable y no pertenece a la cola de trabajo del asesor.

**Impacto en producción:**  
El endpoint retorna datos incorrectos desde el primer día. Cualquier pantalla o informe construido sobre él será estructuralmente erróneo.

**Impacto para María:**  
María verá mezcladas pólizas que puede recuperar con pólizas que ya perdió. Invertirá tiempo llamando a clientes con pólizas irrecuperables mientras casos urgentes (que sí están dentro de la ventana) quedan sin atención. El sistema agrava exactamente el problema que pretende resolver.

**Principio incumplido:**  
*Business rules must be explicit and correct in code.* El conocimiento del dominio no puede asumir que el consumidor lo filtrará por su cuenta.

**Corrección:**

```python
thirty_days_ago = today - timedelta(days=30)

cursor.execute(
    "SELECT id, client_id, insurer, expiration_date, status "
    "FROM policies "
    "WHERE advisor_id = ? "
    "AND expiration_date < ? "     # vencida
    "AND expiration_date >= ?",    # dentro de los 30 días recuperables
    (advisor_id, today, thirty_days_ago)
)
```

---

#### H2 — La regla de prioridad contradice el dominio

**Prioridad:** Media

**Qué está mal:**  
`priority = 'urgent' if days_overdue > 7 else 'normal'`

El umbral de 7 días es un número arbitrario sin justificación de negocio.

**Por qué es un problema:**  
Si la ventana de recuperación es de 30 días, la urgencia debería definirse en términos de cuánto tiempo *queda* en esa ventana, no en cuántos días lleva vencida. Una póliza vencida hace 25 días (a 5 días de ser irrecuperable) sería clasificada como `urgent`, pero una vencida hace 8 días también. El criterio no discrimina bien los casos realmente críticos.

**Impacto para María:**  
María no puede confiar en el campo `priority` para priorizar su trabajo. El sistema dice que algo es urgente pero no explica *por qué* ni *con qué horizonte*.

**Principio incumplido:**  
*No magic numbers. Business rules must be traceable to a requirement.*

**Corrección sugerida:**  
Definir urgencia en función del tiempo restante en la ventana:

```python
days_remaining_in_window = 30 - days_overdue
priority = 'urgent' if days_remaining_in_window <= 10 else 'normal'
```

---

#### H3 — `recommended_action` es ruido, no información

**Prioridad:** Baja

**Qué está mal:**  
El campo siempre retorna el mismo string para todas las pólizas, independientemente de su estado, urgencia o historial de intentos de contacto.

**Impacto:**  
No aporta valor diferencial. Si aparece en una UI, genera la percepción de que el sistema está haciendo algo inteligente cuando en realidad es texto estático.

**Corrección sugerida:**  
O eliminarlo, o hacerlo dinámico en función del contexto real (días restantes en ventana, número de intentos previos).

---

### RENDIMIENTO

---

#### H4 — N+1 queries: el loop hace 2 consultas por cada póliza

**Prioridad:** Alta

**Qué está mal:**  
El código ejecuta la query principal una vez, y luego por cada póliza en el resultado ejecuta 2 queries adicionales (cliente + conteo de intentos de contacto). Para `N` pólizas: `1 + 2N` queries al servidor de base de datos.

**Por qué es un problema:**  
El N+1 query problem es uno de los antipatrones de acceso a datos más conocidos. La cantidad de queries crece linealmente con los datos, convirtiendo lo que debería ser una operación de lectura simple en un bombardeo a la base de datos.

**Impacto en producción:**  
Con María gestionando 280 clientes, si 50 tienen pólizas en ventana: `1 + 100 = 101 queries` por petición. A medida que la cartera crece, el endpoint se vuelve más lento. Lo que tarda 200ms hoy puede tardar 3 segundos en 6 meses.

**Principio incumplido:**  
*Minimize database roundtrips. Prefer JOINs over iterative queries.*

**Corrección:**  
Un solo `JOIN` reemplaza todo el loop de queries:

```sql
SELECT
    p.id,
    p.insurer,
    p.expiration_date,
    c.name   AS client_name,
    c.phone  AS client_phone,
    COUNT(ca.id) AS contact_attempts
FROM policies p
JOIN clients c ON c.id = p.client_id
LEFT JOIN contact_attempts ca ON ca.policy_id = p.id
WHERE p.advisor_id = ?
  AND p.expiration_date < ?
  AND p.expiration_date >= ?
GROUP BY p.id
ORDER BY p.expiration_date ASC
```

---

#### H5 — `fetchall()` sin paginación carga todo en memoria

**Prioridad:** Media

**Qué está mal:**  
`expired = cursor.fetchall()` trae todas las filas coincidentes a RAM en una sola operación. No hay `LIMIT` ni paginación.

**Impacto en producción:**  
Para asesores con carteras grandes o en empresas con muchos asesores compartiendo la misma instancia, esto puede generar presión de memoria y latencias altas en cada petición.

**Corrección:**  
Agregar paginación con `LIMIT`/`OFFSET` y exponer los parámetros como query params:

```python
page = int(request.args.get('page', 1))
per_page = int(request.args.get('per_page', 20))
offset = (page - 1) * per_page

cursor.execute("... LIMIT ? OFFSET ?", (..., per_page, offset))
```

---

### SEGURIDAD

---

#### H6 — `debug=True` habilitado en producción

**Prioridad:** Alta

**Qué está mal:**  
```python
if __name__ == '__main__':
    app.run(debug=True)
```

**Por qué es un problema:**  
En modo debug, Flask expone un debugger interactivo en el navegador. Ante cualquier excepción no manejada, cualquier visitante puede ver el traceback completo y ejecutar código Python arbitrario en el servidor. Es una vulnerabilidad de ejecución remota de código (RCE).

**Impacto en producción:**  
Comprometer la seguridad del servidor completo con la primera excepción no atrapada.

**Principio incumplido:**  
*Never run debug mode in production. Configuration must come from the environment, not from code.*

**Corrección:**  
```python
import os
app.run(debug=os.environ.get('FLASK_DEBUG', 'false').lower() == 'true')
```

---

#### H7 — Sin autenticación ni autorización sobre `advisor_id`

**Prioridad:** Alta

**Qué está mal:**  
`advisor_id` viene directamente de la URL y se usa sin verificar si el solicitante tiene derecho a ver esos datos.

**Por qué es un problema:**  
Cualquier persona que conozca (o adivine) el `advisor_id` de otro asesor puede consultar toda su cartera de pólizas vencidas: clientes, teléfonos, aseguradoras. En una InsurTech, esto es una brecha de confidencialidad de datos de negocio.

**Supuesto:** El sistema eventualmente tendrá múltiples asesores. Incluso para un asesor único, la ausencia de autenticación es un riesgo.

**Principio incumplido:**  
*Zero trust: authenticate and authorize every request.*

---

### MANEJO DE ERRORES

---

#### H8 — La conexión a la base de datos nunca se cierra

**Prioridad:** Alta

**Qué está mal:**  
```python
conn = sqlite3.connect(DB)
# ... nunca hay conn.close() ni context manager
```

No hay `try/finally` ni uso del context manager (`with`). Si ocurre cualquier excepción en el bloque, la conexión queda abierta indefinidamente.

**Impacto en producción:**  
Connection leak. Bajo carga, el servidor acumula conexiones abiertas hasta agotar los descriptores de archivo disponibles (`too many open files`). El servidor deja de aceptar conexiones.

**Principio incumplido:**  
*Always release resources. Prefer context managers for deterministic cleanup.*

**Corrección:**  
```python
with sqlite3.connect(DB) as conn:
    cursor = conn.cursor()
    # ...
```

---

#### H9 — `client` puede ser `None` y el código crashea

**Prioridad:** Alta

**Qué está mal:**  
```python
client = cursor.fetchone()
# ...
'client_name': client[0],   # TypeError si client es None
'client_phone': client[1],
```

Si por algún motivo hay una póliza cuyo `client_id` no tiene registro en `clients` (integridad referencial no garantizada, migración de datos parcial, bug en seed), `client` será `None` y el acceso `client[0]` lanza `TypeError: 'NoneType' object is not subscriptable`. El endpoint retorna 500.

**Principio incumplido:**  
*Defensive programming. Validate assumptions about external data.*

**Corrección:**  
```python
if client is None:
    continue  # o registrar un warning y omitir la póliza
```

---

### MANTENIBILIDAD Y CALIDAD DE CÓDIGO

---

#### H10 — `status` se consulta pero nunca se usa

**Prioridad:** Baja

**Qué está mal:**  
```python
"SELECT id, client_id, insurer, expiration_date, status "
...
policy_id, client_id, insurer, exp_date_str, status = policy
```

`status` se selecciona y desempaqueta pero no aparece en el resultado. Código muerto que viaja en cada fila sin propósito.

**Principio incumplido:**  
*YAGNI. Don't fetch what you don't use.*

---

#### H11 — Parsing de fecha en Python que SQLite puede hacer en el query

**Prioridad:** Baja

**Qué está mal:**  
```python
exp_date = datetime.strptime(exp_date_str, '%Y-%m-%d').date()
days_overdue = (today - exp_date).days
```

El cálculo de días se hace en Python, iterando sobre cada fila. SQLite puede calcularlo directamente:

```sql
CAST(julianday('now', 'localtime') - julianday(expiration_date) AS INTEGER) AS days_overdue
```

Menos código en Python, el cálculo ocurre donde están los datos.

---

#### H12 — `timedelta` importado pero no utilizado

**Prioridad:** Baja

**Qué está mal:**  
```python
from datetime import datetime, timedelta
```

`timedelta` no se usa en ninguna parte del código. Ironicamente, *sí debería usarse* para implementar la regla de los 30 días (H1).

---

### ARQUITECTURA Y DISEÑO

---

#### H13 — Flask app instanciada en el mismo archivo del endpoint

**Prioridad:** Media

**Qué está mal:**  
`app = Flask(__name__)` y la definición de la ruta conviven en el mismo archivo.

**Por qué es un problema:**  
En producción, Flask se inicializa en un módulo central (`create_app()`) y las rutas se registran como blueprints. Mezclar la configuración de la aplicación con la lógica de un endpoint hace imposible testear el endpoint de forma aislada y dificulta agregar nuevas rutas sin tocar este archivo.

**Principio incumplido:**  
*Separation of concerns. Application factory pattern.*

---

## Los 3 problemas más graves

### #1 — La ventana de 30 días está ausente (H1)

Es el error más grave porque invalida el propósito del endpoint. El código *funciona* técnicamente pero retorna la respuesta *equivocada* de negocio. Una póliza vencida hace 45 días aparece en la lista junto a una vencida hace 3 días, cuando solo la segunda es accionable. María no puede confiar en estos datos para tomar decisiones. Un sistema que da información incorrecta es más peligroso que uno que no da nada, porque genera la ilusión de control.

### #2 — N+1 queries (H4)

Es el problema de rendimiento más estructural. No se manifiesta en desarrollo (pocas filas), pero crece linealmente con la cartera. A diferencia de otros problemas de rendimiento que se pueden mitigar con caché o infraestructura, el N+1 requiere un cambio de arquitectura de queries. Cuanto más tarde en detectarse, más difícil es refactorizarlo sin romper código que ya depende del comportamiento actual.

### #3 — Conexión sin cerrar + debug=True (H8 + H6)

Dos problemas que, juntos, pueden dejar el servidor inoperativo o comprometido. El primero es una bomba de tiempo: bajo carga, el servidor eventualmente agota los descriptores de archivo y deja de aceptar conexiones. El segundo es una vulnerabilidad activa desde el primer deploy: cualquier excepción no manejada expone el servidor a ejecución remota de código. Ambos son errores de configuración que no requieren contexto de negocio para identificarse, lo que hace más grave que la IA los haya introducido sin advertencia.

---

## Si solo tuviera una hora

1. **Agregar la regla de los 30 días al WHERE** (10 min) — Resuelve H1 y hace que el endpoint retorne datos correctos.
2. **Reemplazar el loop N+1 por un JOIN** (25 min) — Resuelve H4 y H10 de paso. Es la refactorización de mayor impacto en rendimiento.
3. **Cerrar la conexión con context manager y eliminar `debug=True`** (10 min) — Resuelve H8 y H6. Dos líneas de cambio que evitan dos clases de fallos en producción.

Lo restante (paginación, autorización, prioridad de negocio) se planifica para la siguiente iteración.

---

## Más allá de los hallazgos técnicos

### Señales de comprensión parcial del dominio

Lo que llama la atención en este código es que el desarrollador *sí* entendió varias cosas no triviales: que el historial de intentos de contacto es relevante para priorizar, que la urgencia importa, que los datos del cliente deben acompañar a la póliza. Esas no son inferencias obvias para alguien ajeno al dominio.

Lo que no entendió es el *límite* del problema. Modeló "pólizas vencidas" de forma literal (`expiration_date < today`) sin preguntarse qué significa "vencida" en el contexto de un asesor que necesita *actuar*. El campo `contact_attempts` es la señal más reveladora: alguien que cuenta intentos de contacto está pensando en priorización y en el estado de cada caso. Ese pensamiento es sofisticado. Pero sirve de poco si la lista incluye pólizas que llevan un año vencidas y ya son irrecuperables. Es como optimizar el orden de una bandeja de entrada que incluye correos de hace tres años.

### Error de programación vs. error de comprensión del negocio

La distinción más importante de esta revisión no está en los hallazgos técnicos. Está en separar dos categorías de error que requieren remedios diferentes.

**Error de programación:** ocurre independientemente del dominio. La conexión sin cerrar (H8) o el `debug=True` (H6) serían igual de graves en un endpoint que lista libros o facturas. Cualquier revisor técnico puede encontrarlos sin saber nada de seguros.

**Error de comprensión del negocio:** solo es visible si se conoce el dominio. Un desarrollador con veinte años de experiencia en Python, sin conocimiento de seguros, revisaría el `WHERE expiration_date < today` y no encontraría nada malo. El código hace exactamente lo que dice. El problema está en lo que *debería* decir, y eso solo es detectable si se sabe cómo funciona el negocio de renovaciones.

Esta distinción importa porque define quién puede encontrar cada tipo de error. Y en sistemas donde el dominio es complejo —como InsurTech— los errores de comprensión del negocio suelen ser los más peligrosos precisamente porque pasan todos los filtros técnicos.

---

## Conclusión

El error más grave de este endpoint no es técnico. Es que *parece correcto*. Compila, retorna 200, devuelve JSON con estructura razonable. Un QA sin conocimiento del dominio lo aprobaría. Un test de integración básico lo pasaría. Solo falla cuando alguien que conoce el negocio pregunta: *¿y las pólizas que ya no se pueden recuperar, por qué aparecen?*

Esto ilustra el límite preciso del código generado por IA: el modelo produce código estructuralmente correcto pero semánticamente incompleto, porque la regla más importante del negocio —la ventana de 30 días— no estaba en el prompt y no podía inferirse. La ausencia de ese conocimiento no genera ninguna advertencia, ningún comentario, ninguna señal. El output parece completo porque tiene la estructura esperada.

El uso responsable de IA en desarrollo requiere que quien valida el output tenga el conocimiento de dominio que la herramienta no tiene. La IA reduce el tiempo de scaffolding. No reemplaza el criterio de quien sabe qué problema se está resolviendo. El valor del ingeniero está en saber qué preguntas hacerle al código antes de aceptarlo.
