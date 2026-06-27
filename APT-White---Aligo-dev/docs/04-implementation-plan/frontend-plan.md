# Frontend Plan - Aligo C2 Simulator

Este documento detalla el plan de implementación para el Frontend React del simulador C2.

## Componentes a Desarrollar

1.  **Layout Principal (src/components/Layout.tsx)**
    *   Sidebar con navegación (Dashboard, Agentes, Terminal).
    *   Header con estado de conexión al servidor Mock.
2.  **Dashboard (src/pages/Dashboard.tsx)**
    *   Tarjetas de resumen: Total agentes, activos, tareas completadas.
3.  **Tabla de Agentes (src/components/AgentTable.tsx)**
    *   Lista de agentes conectados obtenidos desde /api/agents.
    *   Indicador visual de estado (verde = online, gris = offline).
4.  **Terminal de Comando (src/components/Terminal.tsx)**
    *   Simulación de consola de comandos.
    *   Envía el comando al endpoint /api/command.
    *   Visualiza los resultados obtenidos desde /api/results.
5.  **Chat AI (src/components/AiChat.tsx)**
    *   Interfaz para comunicarse con Gemini.

## Estilo y Diseño (Tailwind CSS)

*   **Tema:** Oscuro (Dark Mode) tipo hacker/ciberseguridad.
*   **Colores Primarios:** Negro/Gris oscuro para fondos, acentos en verde neón o azul cian para destacar elementos activos.
*   **Fuentes:** Familia monospace para componentes técnicos (terminal, IPs), sans-serif (Inter) para la UI general.
*   **Efectos:** Glassmorphism en paneles flotantes.
