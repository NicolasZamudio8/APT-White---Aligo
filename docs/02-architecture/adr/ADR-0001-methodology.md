# ADR 0001: Metodología del Proyecto - Hackathon (Scrumban)

## Estado
Aprobado

## Contexto
El equipo cuenta con 72 horas para desarrollar, probar y presentar un Command and Control (C2) de Nivel 4 para el Reto Aligo. Las metodologías ágiles tradicionales (Scrum con sprints de 2 semanas) son demasiado lentas para el ritmo de la competencia. Sin embargo, carecer de estructura causará caos en la integración de redes, backend y frontend.

## Decisión
Adoptaremos una metodología **Scrumban de Alta Velocidad (Hackathon-style)**.
1. Todo el backlog de las 72 horas se modela en un tablero Kanban.
2. Usaremos Sprints (Fases) de muy corta duración (12-24 horas) para forzar la convergencia e integración del código.
3. Se eliminarán ceremonias largas; se usarán checkpoints de 10 minutos al cierre de cada fase.

## Consecuencias
- **Positivas:** Permite al equipo avanzar a su propio ritmo por especialidad, garantizando puntos de control (sprints de integración) para asegurar que el C2 funciona E2E.
- **Negativas:** La documentación puede atrasarse frente al código si no se impone la regla de documentar a medida que se despliega.

## Responsables
- Todos los miembros del equipo (roles multidisciplinarios auto-gestionados).
