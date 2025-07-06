# 🎯 League Manager Dashboard - Integrado con Supabase

Dashboard completo para la gestión de ligas de fantasy NFL, completamente integrado con Supabase para datos en tiempo real.

## 🚀 Funcionalidades Implementadas

### ✅ **Gestión de Usuarios en Tiempo Real**
- **Lista de miembros**: Obtiene usuarios activos directamente de la base de datos
- **Estados de usuario**: Activo, baneado, pendiente (con soporte completo de BD)
- **Acciones de administrador**:
  - Banear usuarios con razón personalizada
  - Desbanear usuarios 
  - Registro de acciones en `admin_actions`
- **Búsqueda y filtros**: Por nombre, email, equipo
- **Avatares y perfiles**: Integrados con datos de usuario

### ✅ **Panel de Intercambios Conectado**
- **Lista de intercambios reales**: Directamente de la tabla `trades`
- **Estados soportados**: Pendiente, completado, vetado, aceptado, rechazado
- **Función de veto**: 
  - Actualiza estado a 'vetado' en BD
  - Registra razón del veto
  - Crea entrada en `admin_actions`
- **Filtros por estado**: Todos, pendientes, completados, vetados
- **Análisis de intercambios**: Balance y detalles completos

### ✅ **Gestión de Puntuación Avanzada**
- **Edición de puntos**: Función `edit_player_stats` de Supabase
- **Rosters en tiempo real**: Obtiene equipos y jugadores actuales
- **Historial de cambios**: Todas las ediciones se registran
- **Validación de datos**: Tipos de entrada seguros
- **Razones de edición**: Campo opcional para justificar cambios

### ✅ **Estadísticas de Liga Dinámicas**
- **Contadores automáticos**: 
  - Total de usuarios (activos/baneados)
  - Intercambios activos/completados
  - Semana actual y temporada
- **Clasificación de equipos**: Ranking con puntos y récord
- **Estado de eliminación**: Equipos eliminados claramente marcados

## 🔧 Integración con Supabase

### **Hooks Personalizados Creados**

#### `useLeagueDashboardData(leagueId: string)`
Obtiene todos los datos necesarios para el dashboard:
```typescript
const { members, trades, teams, stats, isLoading, error } = useLeagueDashboardData(leagueId);
```

#### `useLeagueDashboardActions(leagueId: string)`
Proporciona acciones de administración:
```typescript
const { banUser, unbanUser, vetoTrade, editPlayerPoints } = useLeagueDashboardActions(leagueId);
```

#### `useIsLeagueOwner(leagueId: string)`
Verifica permisos de administración:
```typescript
const { data: isOwner, isLoading } = useIsLeagueOwner(leagueId);
```

### **Funciones de Supabase Utilizadas**

- `get_active_players_in_league(league_id)` - Obtener miembros activos
- `ban_user(admin_id, target_user_id, reason)` - Banear usuario
- `unban_user(admin_id, target_user_id, reason)` - Desbanear usuario
- `edit_player_stats(admin_id, player_id, week, season, points, reason)` - Editar puntos

### **Tablas Principales Integradas**

- `leagues` - Información básica de la liga
- `league_members` - Miembros y roles
- `fantasy_teams` - Equipos de fantasy
- `trades` - Intercambios entre equipos
- `users` - Datos de usuarios
- `admin_actions` - Registro de acciones administrativas

## 🛡️ Seguridad y Permisos

### **Verificación de Ownership**
- Solo el propietario de la liga puede acceder
- Verificación en tiempo real con `useIsLeagueOwner`
- Redirección automática si no tiene permisos

### **Registro de Acciones**
- Todas las acciones se registran en `admin_actions`
- Incluye: usuario objetivo, tipo de acción, razón, timestamp
- Trazabilidad completa para auditorías

### **Validación de Datos**
- IDs de usuario y liga validados
- Autenticación requerida para todas las acciones
- Manejo de errores robusto

## 🚦 Cómo Acceder al Dashboard

### **URL Actualizada**
```
/league/{leagueId}/manage
```

**Ejemplo**: `/league/abc123-def456/manage`

### **Desde la Interfaz de Usuario**
1. **Ir a tu liga** → Botón "Gestionar Liga" (solo visible para owners)
2. **Dashboard principal** → Sección "Mis Ligas" → "Administrar"
3. **URL directa** → Usar el ID de la liga en la URL

### **Verificación de Acceso**
- ✅ Usuario autenticado
- ✅ Liga válida y existente
- ✅ Usuario es owner de la liga
- ❌ Mensaje de error si no cumple requisitos

## 📊 Pestañas del Dashboard

### **1. Resumen (Overview)**
- 4 tarjetas de estadísticas principales
- Top 5 equipos con ranking
- Estado de eliminación
- Métricas de actividad

### **2. Usuarios (Users)**
- Tabla completa de miembros
- Acciones de banear/desbanear
- Búsqueda y filtros
- Estados visuales claros

### **3. Intercambios (Trades)**
- Lista de todos los intercambios
- Función de veto con razón
- Filtros por estado
- Detalles completos en modal

### **4. Puntuación (Scoring)**
- Vista de rosters por equipo
- Edición inline de puntos
- Gestión de alineaciones
- Historial de cambios

## 🔄 Estados de Carga y Errores

### **Estados de Carga**
- Skeletons durante la carga inicial
- Indicadores de carga en acciones
- Carga progresiva de datos

### **Manejo de Errores**
- Alertas informativas para errores
- Fallbacks para datos faltantes
- Retry automático en fallos de red

### **Notificaciones**
- Toast notifications para acciones exitosas
- Confirmaciones para acciones destructivas
- Feedback inmediato al usuario

## 🚀 Funcionalidades Futuras

### **Próximas Mejoras**
- [ ] Dashboard de notificaciones en tiempo real
- [ ] Exportación de datos de la liga
- [ ] Herramientas de comunicación integradas
- [ ] Analytics avanzados de rendimiento
- [ ] Gestión de reglas de liga personalizadas

### **Integración con APIs Externas**
- [ ] Sincronización con APIs de la NFL
- [ ] Importación automática de estadísticas
- [ ] Integración con plataformas de pago

## 📋 Instalación y Configuración

### **Requisitos Previos**
- Base de datos Supabase configurada
- Tablas y funciones RPC implementadas
- Sistema de autenticación funcionando

### **Variables de Entorno**
```env
VITE_SUPABASE_URL=tu_supabase_url
VITE_SUPABASE_ANON_KEY=tu_supabase_anon_key
```

### **Dependencias**
- React Query para cache de datos
- React Router para navegación
- Tailwind CSS para estilos
- shadcn/ui para componentes

## 🐛 Troubleshooting

### **Problemas Comunes**

**1. "No tienes permisos para acceder"**
- Verificar que el usuario es owner de la liga
- Comprobar que la liga existe
- Revisar la autenticación

**2. "Error al cargar datos"**
- Verificar conexión a Supabase
- Comprobar permisos de RLS
- Revisar logs de errores

**3. "Acciones no funcionan"**
- Verificar permisos de administrador
- Comprobar funciones RPC habilitadas
- Revisar logs de red

### **Logs de Debug**
```typescript
// Habilitar logs de React Query
const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      retry: 1,
      staleTime: 5 * 60 * 1000,
    },
  },
});
```

## 💡 Consejos de Uso

### **Mejores Prácticas**
1. **Siempre proporciona razones** para acciones de banear/editar
2. **Verifica cambios** antes de confirmar ediciones de puntos
3. **Usa filtros** para encontrar usuarios/intercambios específicos
4. **Revisa el resumen** regularmente para métricas de la liga

### **Flujo de Trabajo Recomendado**
1. **Inicio de sesión** → Ir al resumen para vista general
2. **Gestión diaria** → Revisar intercambios pendientes
3. **Moderación** → Gestionar usuarios problemáticos
4. **Ajustes** → Editar puntuaciones cuando sea necesario

---

## 📞 Soporte

Para problemas técnicos o consultas sobre el dashboard:
- Revisar logs de consola para errores específicos
- Verificar estado de Supabase en el panel de administración
- Comprobar permisos de Row Level Security (RLS)

**Dashboard creado con ❤️ para la mejor experiencia de gestión de ligas NFL** 