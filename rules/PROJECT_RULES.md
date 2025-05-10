# 📚 Reglas del Proyecto: NFL Fantasy Survivor

---

## 1. Propósito del Proyecto

Crear una plataforma de Fantasy NFL bajo el formato Survivor, donde los usuarios compiten en ligas privadas o públicas, seleccionan jugadores mediante draft, y cada semana se eliminan equipos tanto de la NFL como fantasy, hasta que solo queda un campeón.

---

## 2. Principios Generales

- **Experiencia de usuario sencilla y atractiva:** El usuario debe entender rápidamente el formato y poder navegar sin fricciones.
- **Transparencia en reglas y puntajes:** Las reglas del juego, el sistema de eliminación y el cálculo de puntos deben ser claros y accesibles.
- **Flexibilidad para ligas:** Soporte para ligas públicas y privadas, con gestión de miembros y códigos de invitación.
- **Actualización semanal:** El sistema debe reflejar eliminaciones y cambios de jugadores cada semana.
- **Seguridad y privacidad:** Los datos de usuario y ligas deben manejarse de forma segura.

---

## 3. Flujo de Usuario

1. **Landing:** El usuario conoce el formato y se motiva a registrarse.
2. **Registro/Login:** Acceso mediante email y contraseña, con validación.
3. **Perfil:** Personalización opcional de nombre, equipo y avatar.
4. **Gestión de Ligas:** Crear o unirse a ligas, públicas o privadas.
5. **Dashboard:** Resumen de la semana, acceso a draft, standings y timeline.
6. **Draft:** Selección de jugadores disponibles, con filtros y reglas claras.
7. **Competencia Semanal:** Eliminación de equipos, redraft y actualización de puntos.
8. **Standings:** Consulta de posiciones, equipos activos y eliminados.
9. **Eliminación/Final:** Proceso hasta que solo queda un equipo campeón.

---

## 4. Reglas de Juego

- **Draft:**  
  - Solo se pueden seleccionar jugadores disponibles (no eliminados ni ya drafteados).
  - El draft puede repetirse cada semana para redraftear jugadores de equipos NFL eliminados.
  - **Prioridad en agencia libre:**
    - Cuando un equipo es eliminado, sus jugadores pasan a la agencia libre.
    - El orden de prioridad para elegir jugadores en agencia libre esa semana es inverso al ranking semanal (excluyendo al eliminado). Es decir, el que quedó peor pero se salvó elige primero, y así sucesivamente hasta el mejor clasificado.
    - Si dos equipos quieren al mismo jugador, se lo queda el de mayor prioridad según este orden.
    - Ejemplo: Si en una liga de 5 (A, B, C, D, E) E es eliminado, el orden de selección será D, C, B, A.
- **Eliminación semanal:**  
  - Cada semana se elimina un equipo de la NFL (sus jugadores pasan a estar disponibles).
  - El equipo fantasy con menos puntos es eliminado de la liga.
- **Puntaje:**  
  - Los puntos de cada equipo fantasy se calculan sumando el rendimiento de sus jugadores.
  - El sistema de puntaje debe ser transparente y consultable.
- **Ligas:**  
  - Pueden ser públicas (cualquiera puede unirse) o privadas (requieren código de invitación).
  - El creador de la liga es el owner y puede gestionar miembros.
- **Final:**  
  - El último equipo fantasy activo es el campeón de la liga.

---

## 5. Estructura Técnica

- **Frontend:** React + TypeScript, Vite, Tailwind CSS, shadcn-ui.
- **Estado global:** Zustand.
- **Datos:** Mock data para desarrollo, integración futura con Supabase u otro backend.
- **Componentes clave:** PlayerCard, TeamCard, WeeklyElimination, Layout, etc.
- **Páginas principales:** Home, Signup, Login, Hub, BrowseLeagues, CreateLeague, Dashboard, Draft, Standings, Profile, NotFound.

---

## 6. Buenas Prácticas de Desarrollo

- **Componentización:** Reutilizar componentes UI y lógica donde sea posible.
- **Validación:** Formularios con validación robusta (zod, react-hook-form).
- **Accesibilidad:** Cumplir con estándares de accesibilidad en formularios y navegación.
- **Feedback al usuario:** Mensajes claros de éxito/error en todas las acciones.
- **Código limpio y documentado:** Seguir convenciones de TypeScript y React, y documentar funciones y componentes complejos.
- **Internacionalización:** Preparar el sistema para soportar múltiples idiomas en el futuro.

---

## 7. Casos Especiales y Restricciones

- **No se puede draftear jugadores de equipos NFL eliminados.**
- **No se puede draftear jugadores ya seleccionados por otro equipo fantasy.**
- **El owner de la liga puede expulsar miembros antes de iniciar la temporada.**
- **El sistema debe manejar correctamente los empates en puntaje para eliminaciones.**
- **El usuario eliminado puede seguir viendo la liga pero no participar en el draft.**
- **El código de invitación de liga privada debe ser único y seguro.**

---

## 8. Futuras Mejoras (Backlog sugerido)

- Integración real con Supabase para auth y persistencia.
- Notificaciones por email o push.
- Soporte para múltiples temporadas.
- Estadísticas avanzadas y visualizaciones.
- Chat o foro dentro de cada liga.
- Personalización de reglas de liga (número de eliminados, sistema de puntaje, etc).

---

## 9. Glosario

- **Draft:** Proceso de selección de jugadores.
- **Redraft:** Nuevo draft semanal con jugadores liberados.
- **Owner:** Creador y administrador de la liga.
- **Roster:** Plantilla de jugadores de un equipo fantasy.
- **Standings:** Tabla de posiciones de la liga.
- **Survivor:** Formato donde cada semana se elimina al peor equipo. 