# Aligo C2 Platform 🛸

Aligo es una plataforma de comando y control (C2) de grado empresarial diseñada para la simulación de adversarios y entrenamiento de equipos de ciberseguridad (Red Team / Blue Team). Permite orquestar agentes, monitorear la topología de red distributiva mediante proxies/redirectores, y analizar telemetría táctica asistida por Inteligencia Artificial.

---

## 🏗️ Arquitectura del Sistema

El C2 está estructurado en una arquitectura cliente-servidor desacoplada con persistencia relacional completa:

1. **Frontend (React + TypeScript)**:
   - Panel de control táctico basado en un mapa interactivo (D3.js).
   - Componentes modulares utilizando Vanilla CSS / CSS Modules (sin Tailwind).
   - Monitoreo en tiempo real de capturas de red simuladas con **TShark**.
   - Asistente Copilot integrado para traducción de intenciones y análisis de logs.
2. **Backend (FastAPI + SQLAlchemy)**:
   - Servidor HTTP y WebSocket de alto rendimiento para el canal C2 de los agentes.
   - Capa de datos con ORM SQLAlchemy 2.0 y base de datos relacional serverless **Neon PostgreSQL**.
   - Integración nativa con **Google Gemini (gemini-3.5-flash)** para asistentes interactivos y decodificación de payloads.
3. **Agente (Python Client)**:
   - Cliente autónomo con reconexión adaptativa (backoff exponencial).
   - Comunicación cifrada y firma criptográfica de instrucciones.

---

## 🗄️ Modelo de Datos (Neon PostgreSQL)

La base de datos relacional implementa un esquema acíclico de 9 tablas optimizado en tercera forma normal (3NF):

- `system_configs`: Almacenamiento clave-valor de directivas de sistema (cifrado, intervalo de balizas, modo de visualización, departamento filtrado).
- `agents`: Registro de agentes comprometidos, su geolocalización, estado (online/offline), clave de cifrado asignada y redirector de tráfico.
- `playbooks` & `playbook_steps`: Automatización de comandos categorizados con tácticas MITRE ATT&CK.
- `playbook_executions`: Registro y logs detallados de la ejecución de playbooks multihost.
- `executions`: Histórico individual de comandos despachados y resultados obtenidos.
- `crypto_keys`: Almacenamiento seguro de llaves de cifrado simétrico (XOR-256 / AES).
- `redirectors`: Topología distributiva de red de proxies (soporta encadenamiento mediante `uplink_id`).
- `system_logs` & `network_packets`: Auditoría interna del C2 e histórico persistente del monitor de red TShark.

---

## 🚀 Requisitos y Configuración

### Variables de Entorno (`.env`)
Crea un archivo `.env` en la raíz del proyecto con la conexión de base de datos Neon:
```env
DATABASE_URL=postgresql://user:password@your-neon-host/neondb?sslmode=require
GEMINI_API_KEY=tu_api_key_de_gemini
```

### Ejecución del Servidor Backend
1. Navega al directorio del backend:
   ```bash
   cd backend
   ```
2. Crea e inicia tu entorno virtual de Python:
   ```bash
   python -m venv venv
   .\venv\Scripts\activate
   ```
3. Instala dependencias:
   ```bash
   pip install -r requirements.txt
   ```
4. Ejecuta el servidor (inicializará el esquema de base de datos y semilla de agentes de forma automática):
   ```bash
   python main.py
   ```

### Ejecución del Frontend
1. Navega al directorio del frontend:
   ```bash
   cd frontend
   ```
2. Instala las dependencias usando exclusivamente **pnpm**:
   ```bash
   pnpm install
   ```
3. Lanza el servidor de desarrollo de Vite (puerto `1700` por defecto):
   ```bash
   pnpm run dev
   ```

### Lanzamiento del Agente Simulador
1. En la raíz del proyecto, ejecuta el cliente de prueba:
   ```bash
   python mock_agent.py
   ```
   *El agente generará un ID dinámico y se conectará automáticamente al canal WebSocket del backend, apareciendo como nodo online en el mapa táctico.*

---

## 🚢 Despliegue en Railway

### Requisitos Previos
- Cuenta en [Railway](https://railway.app/)
- Cuenta en [Neon PostgreSQL](https://neon.tech/) para base de datos serverless
- API Key de [Google Gemini](https://makersuite.google.com/) (opcional, para asistente IA)

### Paso 1: Configurar Base de Datos en Neon
1. Crea un proyecto en Neon PostgreSQL
2. Crea una base de datos (ej: `aligo_c2`)
3. Copia el connection string (formato: `postgresql://user:password@ep-xxx.region.aws.neon.tech/neondb?sslmode=require`)

### Paso 2: Desplegar Backend en Railway
1. En Railway, crea un nuevo proyecto desde GitHub
2. Selecciona el repositorio `APT-White---Aligo`
3. Configura el servicio:
   - **Root Directory:** `backend`
   - **Build Command:** `pip install -r requirements.txt`
   - **Start Command:** `python main.py`
4. Agrega variables de entorno en Railway Settings:
   ```
   DATABASE_URL=postgresql://user:password@your-neon-host/neondb?sslmode=require
   GEMINI_API_KEY=tu_api_key_de_gemini
   ```
5. Deploy - Railway detectará automáticamente el Python environment e instalará las dependencias

### Paso 3: Desplegar Frontend en Railway
1. En el mismo proyecto de Railway, agrega un nuevo servicio
2. Selecciona el repositorio `APT-White---Aligo`
3. Configura el servicio:
   - **Root Directory:** `frontend`
   - **Build Command:** (detectado automáticamente desde Dockerfile)
   - **Start Command:** (detectado automáticamente desde Dockerfile)
4. El `Dockerfile` del frontend usa:
   - Stage 1: `node:20-alpine` para build con pnpm
   - Stage 2: `nginx:alpine` para servir archivos estáticos en puerto 80
5. No requiere variables de entorno adicionales

### Paso 4: Configurar Dominio y Conexión
1. Railway asignará dominios automáticos:
   - Backend: `https://xxx-backend.up.railway.app`
   - Frontend: `https://xxx-frontend.up.railway.app`
2. Actualiza la URL del backend en el frontend si es necesario (por defecto usa `localhost:8000` en desarrollo)
3. Para producción, configura `VITE_API_URL` en Railway del frontend si el backend está en un dominio diferente

### Paso 5: Verificar Despliegue
1. Abre la URL del frontend en Railway
2. Verifica que el mapa táctico cargue los agentes desde la base de datos Neon
3. Prueba la conexión de agentes ejecutando `mock_agent.py` localmente apuntando a la URL de Railway:
   ```bash
   # Modifica mock_agent.py para usar la URL de Railway
   WS_URL = "wss://your-backend-url.up.railway.app/ws/{agent_id}"
   ```

### Troubleshooting Railway
- **Backend falla:** Verifica que `DATABASE_URL` esté correctamente configurada en las variables de entorno
- **Frontend no carga:** Revisa los logs de build en Railway, asegúrate que `pnpm install` y `pnpm run build` completen sin errores
- **Agentes no conectan:** Verifica que el puerto WebSocket (8000) esté expuesto y que Railway no tenga restricciones de firewall

---

## 📚 Documentación Técnica

Para detalles profundos sobre arquitectura, protocolos de comunicación, esquemas de cifrado y decisiones de diseño, consulta la documentación en el directorio `docs/`:

- **Arquitectura Unificada:** `docs/02-architecture/arquitectura-unificada.md` - Diagramas Mermaid del sistema completo
- **Modelo de Datos:** `docs/02-architecture/data-model.md` - Esquema relacional detallado
- **Flujos de Secuencia:** `docs/02-architecture/sequence-flows.md` - Diagramas de secuencia para comandos E2E
- **Security Baseline:** `docs/03-security/security-baseline-checklist.md` - Prácticas de seguridad implementadas
- **Plan de Implementación:** `docs/04-implementation-plan/` - Roadmap técnico por sprints
