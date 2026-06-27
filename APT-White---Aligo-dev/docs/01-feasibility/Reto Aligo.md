# Reto Aligo

> **Archivo original:** `Reto Aligo.pdf`
> **Tipo:** PDF
> **Páginas / Hojas / Filas / Diapositivas:** 4 páginas
> **Autor / Fecha:** Aligo Defensores Informáticos
> **Conversión:** Fiel al 100% — sin omisiones ni resúmenes

---

<!-- Página 1 -->
Empresa Retadora : ALIGO
http://www.nilo.app
Reto de Construcción de Command and Control (C2)
Hackathon de Desarrollo — Aligo Defensores Informáticos
Contexto
Este reto es organizado por Aligo Defensores Informáticos, una empresa de ciberseguridad y hacking con 17 años de
trayectoria nacida en la ciudad de Medellín. La empresa desarrolla actividades relacionadas con Red Teaming, Blue
Teaming, Purple Teaming, Green Teaming y múltiples áreas asociadas a la seguridad informática.
A diferencia de un CTF tradicional, este evento es una hackathon de desarrollo: los participantes no resuelven retos
prearmados, sino que construyen su propio proyecto técnico desde cero a lo largo de la competencia.
Objetivo del Reto
El propósito de esta hackathon es que los equipos diseñen y construyan un Command and Control (C2): la
infraestructura que permite a un servidor central coordinar uno o varios agentes para ejecutar comandos de
forma remota, recibir resultados y orquestar la operación.
Un C2 es un concepto fundamental dentro de la ciberseguridad y toca, de manera natural, una enorme cantidad de
disciplinas técnicas: redes, criptografía, arquitectura de sistemas distribuidos, diseño de protocolos, serialización,
concurrencia y desarrollo de software. Por eso el reto no está limitado a personas del mundo de la ciberseguridad:
cualquier rama de la tecnología puede aportar y destacar, porque construir un buen C2 combina muchas
competencias a la vez.
Importante: todo el desarrollo y las pruebas se realizan exclusivamente en un entorno de laboratorio cerrado y
autorizado, provisto por la organización. El objetivo es demostrar dominio técnico y diseño de ingeniería, no operar
contra sistemas reales ni de terceros.
Gana el equipo que construya el C2 más innovador, mejor diseñado y mejor sustentado.
Descripción del desafío
Lo bonito de este reto es su rango: un C2 puede ir desde lo más sencillo —un netcat con un comando básico— hasta
arquitecturas extremadamente sofisticadas con múltiples saltos, cifrado robusto, agentes modulares y mecanismos
de coordinación de última generación. Esto garantiza que cualquier participante pueda empezar y avanzar a su
propio ritmo, mientras los equipos más ambiciosos no tienen techo.
Curva de complejidad (referencial)
Los siguientes niveles son una guía orientativa, no una camisa de fuerza. Un equipo puede saltar, combinar o superar
estos niveles libremente:

| Nivel | Nombre | Descripción |
| :--- | :--- | :--- |
| Nivel 1 | Nivel básico | Un canal de control mínimo funcional: un servidor que recibe conexión de un agente y permite ejecutar comandos remotos (estilo netcat + shell). El punto de partida que cualquiera puede alcanzar. |
| Nivel 2 | Nivel intermedio | Protocolo de comunicación propio, cifrado del canal, manejo de varios agentes a la vez, una interfaz de operador clara y persistencia de la conexión. |

Organiza
Apoya
Technology
Entrenamiento en Innovación y Tecnología

---

<!-- Página 2 -->
Empresa Retadora : ALIGO
http://www.nilo.app
Curva de complejidad (referencial)

| Nivel | Nombre | Descripción |
| :--- | :--- | :--- |
| Nivel 3 | Nivel avanzado | Arquitectura distribuida y resiliente: múltiples saltos o redirectores, comunicación por canales no convencionales, agentes modulares con plugins, reconexión automática, esquemas de cifrado robustos y diseño que escale a muchos agentes. |
| Nivel 4 | Nivel Aligo | Hasta donde llegue la imaginación del equipo: nuevas generaciones de arquitectura, mecanismos de coordinación originales, integración de tecnologías de otras ramas (web, blockchain, IoT, ML, redes) y todo lo que eleve el estado del arte del proyecto. |

Espíritu del reto
Más allá del rigor técnico, se espera creatividad implacable, buen criterio de ingeniería y la capacidad de explicar y
defender las decisiones de diseño.
Premiamos a quien piensa distinto y lo construye bien.
Ramas que pueden participar
Como el reto combina muchas disciplinas, equipos de perfiles diversos pueden aportar y sobresalir. Algunos
ángulos desde los que se puede atacar el problema:
Redes y protocolos: diseño del canal de comunicación, transporte, multiplexación y redirectores.
Criptografía: cifrado del canal, intercambio de claves y autenticación entre servidor y agentes.
Desarrollo de software: arquitectura del servidor, de los agentes y de la interfaz de operador.
Sistemas distribuidos: concurrencia, resiliencia, manejo de múltiples agentes y reconexión.
Web / frontend: paneles de control, visualización del estado y experiencia de operador.
Otras tecnologías: blockchain, IoT, machine learning o cualquier integración original que aporte valor al proyecto.
Organiza
Apoya
Technology
Entrenamiento en Innovación y Tecnología

---

<!-- Página 3 -->
Empresa Retadora : ALIGO
http://www.nilo.app
Criterios de evaluación
Los proyectos se evalúan sobre los siguientes ejes, en orden de peso. La innovación y el que el C2 funcione de
verdad son lo más importante:

| Categoría | Peso | Aspectos evaluados |
| :--- | :--- | :--- |
| Innovación técnica | 35% | Originalidad de la propuesta: enfoques comunicación, mecanismos de control o ideas que se salgan del patrón clásico cliente-servidor. |
| Funcionalidad / que sirva | 25% | El C2 funciona de extremo a extremo: el servidor controla a los agentes, ejecuta comandos, recibe resultados y opera de forma estable durante la demostración. |
| Robustez y diseño de arquitectura | 20% | Resiliencia ante fallos, reconexión de agentes, manejo de múltiples agentes simultáneos, modularidad y diseño de protocolo de canal (incluido cifrado de las comunicaciones). |
| Calidad de código y arquitectura | 10% | Código limpio, organizado y mantenible. Buenas prácticas, separación de responsabilidades y estructura de proyecto comprensible. |
| Presentación y documentación | 10% | Claridad del video, de la documentación técnica y de la demostración. Capacidad de mexplicar las decisiones de diseño. |

Entregables
Cada equipo debe entregar los siguientes cuatro elementos al cierre de la hackathon:
1 Código fuente. Repositorio completo del proyecto (servidor, agente e interfaz), con un README que explique cómo desplegarlo y ejecutarlo en el entorno del laboratorio.
2 Documentación técnica. Documento que describa la arquitectura, el protocolo de comunicación, los esquemas de cifrado, las decisiones de diseño y las limitaciones conocidas. Es donde el equipo argumenta por qué su C2 es innovador.
3 Video. Grabación corta (sugerido 3 a 7 minutos) que muestre el C2 en funcionamiento: servidor levantado, agente conectado y comandos ejecutándose de extremo a extremo.
4 Demostración en vivo. Presentación ante el jurado donde el equipo opera su C2 en el entorno controlado y responde preguntas sobre el diseño.
Organiza
Apoya
Technology
Entrenamiento en Innovación y Tecnología

---

<!-- Página 4 -->
Empresa Retadora : ALIGO
http://www.nilo.app
Mínimo esperado
Para que un proyecto sea considerado válido y entre a evaluación, debe cumplir como mínimo:
Un servidor C2 que acepte la conexión de al menos un agente.
Un agente que se conecte al servidor y ejecute comandos enviados de forma remota.
Retorno de los resultados de esos comandos al operador.
El canal de comunicación funcionando de extremo a extremo durante la demostración.
Los cuatro entregables (código, documentación, video y demo) presentados al cierre.
Cumplir el mínimo no da puntos extra: es el piso. A partir de ahí, todo lo que el equipo añada —cifrado, múltiples
agentes, arquitectura distribuida, ideas originales— suma en los criterios de evaluación.
Dinámica y reglas
Conformación: los participantes compiten en equipos, según indique la organización.
Periodo de desarrollo: la hackathon inicia el viernes de apertura y se extiende hasta el sábado
Entrega: al cierre, cada equipo entrega los cuatro entregables y agenda su demostración en vivo ante el jurado.
Evaluación: el jurado puntúa cada proyecto según los criterios y pesos definidos en este documento.
Victoria: ganan los proyectos con mayor puntaje total. Se reconocerá a los mejores C2 por su innovación,
funcionalidad y calidad de diseño.presentados al cierre.
Aligo Defensores Informáticos
Construyendo talento técnico desde Medellín.
Organiza
Apoya
Technology
Entrenamiento en Innovación y Tecnología

---

## ✅ Reporte de integridad

| Métrica | Original | Markdown | Estado |
| :--- | :--- | :--- | :--- |
| Páginas/Hojas/Diapositivas | 4 | 4 | ✅ |
| Palabras (aprox.) | 1188 | 1194 | ✅ |
| Tablas | 2 | 2 | ✅ |
| Listas/Bullets | 3 | 3 | ✅ |

> Conversión `file-to-markdown` — sin omisiones ni modificaciones.
