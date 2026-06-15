# Fase 6 — Code Review del snippet Flask

**Fecha:** 2026-06-15  
**Herramienta IA:** Claude Sonnet 4.6 (Claude Code)

---

## Contexto

Se analizó el archivo `expired_policies.py`, generado por IA a partir del prompt:  
*"hazme un endpoint Python/Flask que liste las pólizas vencidas de un asesor para que las pueda gestionar"*

El análisis se realizó desde la perspectiva de un Staff Software Engineer evaluando código antes de un deploy a producción, relacionando cada hallazgo con el dominio del negocio (María, la regla de los 30 días, InsurTech).

---

## Hallazgos identificados (12 en total)

### Alta prioridad
| ID | Categoría | Hallazgo |
|---|---|---|
| H1 | Reglas de negocio | Ventana de 30 días ausente del WHERE |
| H4 | Rendimiento | N+1 queries en el loop |
| H6 | Seguridad | debug=True en producción |
| H7 | Seguridad | Sin autenticación ni autorización |
| H8 | Manejo de errores | Conexión BD nunca se cierra |
| H9 | Manejo de errores | client puede ser None → crash |

### Media prioridad
| ID | Categoría | Hallazgo |
|---|---|---|
| H2 | Reglas de negocio | Umbral de prioridad (7 días) sin base en el dominio |
| H5 | Rendimiento | fetchall() sin paginación |
| H13 | Arquitectura | Flask app instanciada en el archivo del endpoint |

### Baja prioridad
| ID | Categoría | Hallazgo |
|---|---|---|
| H3 | Reglas de negocio | recommended_action estático = ruido |
| H10 | Calidad | status se selecciona pero nunca se usa |
| H11 | Calidad | Parsing de fecha en Python que puede hacer SQLite |
| H12 | Calidad | timedelta importado pero no utilizado |

---

## Los 3 más graves

1. **H1** — La ventana de 30 días ausente: el endpoint retorna datos incorrectos de negocio.
2. **H4** — N+1 queries: problema estructural de rendimiento que escala con la cartera.
3. **H8 + H6** — Conexión sin cerrar + debug=True: pueden tumbar o comprometer el servidor.

---

## Conclusión del análisis

El código ilustra el riesgo de aceptar output de IA sin revisión de dominio: funciona sintácticamente pero es semánticamente incorrecto. El modelo no conocía la regla de los 30 días y no podía inferirla del prompt. El criterio técnico humano es lo que diferencia "código que compila" de "código correcto para el negocio".
