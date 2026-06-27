# Acta de Factibilidad de Desarrollo

> **⚠️ Reglas para llenar este template:**
> 1. Respetar las 7 secciones exactamente como están. No añadir, quitar ni reordenar.
> 2. Las únicas adiciones permitidas son a petición explícita del usuario.
> 3. La fecha estimada de entrega debe coincidir con el TOTAL de la línea de trabajo propuesta.
> 4. Cada sección debe tener contenido específico — sin "TBD" ni placeholders.

---

## 1. Información general

| Campo | Valor |
|---|---|
| **Nombre del proyecto:** | Reto Aligo (Construcción C2) |
| **Compañía:** | ALIGO Defensores Informáticos (Retador) / Equipo Hackathon |
| **Área solicitante:** | Jurado TalentoTech |
| **POC del proyecto:** | Nicolás Zamudio / Sebastián Ortiz |
| **Correo POC del proyecto:** | psicologo.nicolaszamudio@gmail.com |
| **Fecha de solicitud:** | 26/06/2026 |
| **Fecha estimada de entrega:** | 29/06/2026 (Límite 72 horas) |

## 2. Alcance de desarrollo

### Tipo de alcance
- [x] Punta a punta (E2E)
- [ ] Fase específica del requerimiento original — Fase: [nombre]

### Dentro del alcance
- Desarrollo de Agente multiplataforma (Windows/Linux) en Python.
- Servidor C2 Backend (Python, FastAPI, WebSockets) en GCP Cloud Run.
- Interfaz de Operador (React.js) para controlar el C2, alojada en GCP.
- Integración de API Gemini para procesamiento en lenguaje natural de comandos.
- Canal de comunicación mTLS con soporte multi-agente persistente.
- Despliegue de DB PostgreSQL en Neon.
- Generación de Código, Documentación, Video de 3-7 minutos y Demo en vivo.

### Fuera del alcance (explícito)
- Ataques a sistemas fuera del entorno de laboratorio de la hackathon.
- Mantenimiento post-hackathon (Go-live extendido).
- Capacitación formal a usuarios.

### Supuestos del alcance
- El entorno de laboratorio autoriza las conexiones salientes a nuestros servicios en GCP.
- El free-tier y API keys (Gemini, Neon, GCP) no alcanzarán sus límites de rate (rate-limits) durante las pruebas.

## 3. Estimación de tiempos de desarrollo

**Tiempo total estimado:** 3 días hábiles (72 horas)

**Confianza de la estimación:** Media (debido a la presión de tiempo y arquitectura distribuida en 72h).

**Factores que pueden alterar la estimación:**
- Problemas de red o despliegue en GCP (Cloud Run) o configuración mTLS.
- Tiempos de respuesta limitados en endpoints por free-tiers.

## 4. Línea de trabajo propuesta

| Fase | Actividad | Duración estimada | Hitos / Entregables |
|---|---|---|---|
| 1 | Arquitectura y Setup (Bases de datos, Repo, Cloud Run) | 12 horas | ADRs aprobados, esquema SQL, repositorios. |
| 2 | Desarrollo Backend, WebSockets y Frontend | 24 horas | Comunicación Agente-Server estable. |
| 3 | Integración mTLS, Redirectores GCP e IA (Gemini) | 16 horas | Innovación Nivel 4 operativa. |
| 4 | Pruebas, Video Pitch y Documentación | 20 horas | Entregables finales (Video, Repo, Demo). |
| **TOTAL** | | **72 horas** | |

## 5. Riesgos y consideraciones

### Riesgos técnicos
1. **Configuración de PKI y mTLS** — Probabilidad: Alta | Impacto: Alto
   - Descripción: Generar y distribuir los certificados de cliente/servidor para la autenticación mTLS puede ser complejo y quebrar el tiempo.
   - Mitigación: Sebastián Ortiz (Experto en Ciberseguridad) lidera esto en las primeras 12h.
2. **Limitaciones capa gratuita GCP/Neon** — Probabilidad: Media | Impacto: Alto
   - Descripción: Llegar al límite de cuota bloqueando el C2 en pleno jurado.
   - Mitigación: Juan José García (Cloud) monitoreando facturación y consumo.

### Pre-condiciones para iniciar
- Accesos a consola de GCP, cuenta Neon y API de Gemini disponibles para todos.
- Aprobación de este plan de factibilidad.

## 6. Insumos requeridos para el desarrollo

### Accesos
- [x] Acceso a [GCP Project]. Solicitar a: Nicolás/Juan José
- [x] Acceso a [Neon DB]. Solicitar a: Nicolás
- [x] Credenciales de servicio para [API Gemini]. Solicitar a: Nicolás

### Licencias y software
- [x] Subscripción GCP suficiente para [Cloud Run, Load Balancing]

### Datos y usuarios de prueba
- [x] Máquinas virtuales Windows y Linux (en laboratorio provisto por Aligo).

## 7. Aprobación del área solicitante

Con esta acta, el equipo de automation confirma que la información entregada es correcta y completa.

| Campo | Valor |
|---|---|
| **Nombre del aprobador:** | Paula Andrea Botia Arango / Nicolás Zamudio (POC) |
| **Cargo:** | Equipo Hackathon |
| **Fecha:** | 26/06/2026 |
