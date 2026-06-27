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
