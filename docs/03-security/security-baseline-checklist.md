# Mapeo de Seguridad (Baseline OneSource)

El C2 se desplegará en un entorno **Cloud-Native (GCP)**. Este es el mapeo de controles de seguridad que aplicaremos para asegurar un desarrollo limpio y seguro en la hackathon.

## Checklist Aplicable (Cloud Deployment)

- [x] **1f. IAM/RBAC:** Se utilizarán Service Accounts de GCP con Least Privilege. Sin hardcoding de keys.
- [x] **1g. Criptografía:** 
  - En tránsito: TLS 1.2+ (HTTPS/WSS) forzado en Cloud Load Balancing.
  - En reposo: Encriptación por defecto de Neon (PostgreSQL) y Cloud Run.
- [x] **1j. SDLC / Secrets:** Uso estricto de .env y validación de .gitignore. Prohibición total de subir keys de GCP, Neon o Gemini al repo público de GitHub.
- [x] **3a. Cloud Posture:** Despliegue segregado en proyecto dedicado (alpha-coach-499814).
- [x] **3c. Cloud Network:** El backend (C2 FastAPI) no expondrá IPs públicas directas, operará detrás de un Cloud Load Balancer (WAF) actuando como redirector.
- [x] **7. API Security:** FastAPI validará los requests entrantes. CORS configurado estrictamente para permitir peticiones solo desde el origen del Dashboard React.
