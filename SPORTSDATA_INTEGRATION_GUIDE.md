# 🏈 Guía de Integración SportsData.io

## 📋 Resumen
Tu plataforma NFL Fantasy ahora soporta dos proveedores de datos:
- **Sleeper** (por defecto) - Gratis, datos básicos
- **SportsData.io** - De pago, datos más detallados con DFS y odds

## 🚀 Cómo Sincronizar Datos desde SportsData.io

### Método 1: Panel de Administración (Recomendado)

1. **Accede al Panel de Admin**
   - Ve a `http://localhost:8080/admin`
   - Inicia sesión con tu cuenta de administrador

2. **Selecciona SportsData como Proveedor**
   - Ve a la pestaña "Sleeper API"
   - En la sección "Fantasy Data Provider", selecciona "SportsData.io"
   - Haz clic en "Switch Provider"

3. **Sincroniza los Datos**
   - En la sección "Data Synchronization"
   - Haz clic en "Sync All Data" para sincronizar todo
   - O usa los botones individuales para sincronizar:
     - NFL Teams
     - Players
     - Week Stats
     - Week Projections

### Método 2: Consola del Navegador (Rápido)

1. **Abre la consola del navegador** (F12)

2. **Ejecuta el comando de sincronización:**
   ```javascript
   syncSportsData()
   ```
   
   Esto sincronizará automáticamente:
   - Equipos NFL
   - Todos los jugadores
   - Estadísticas de la semana actual
   - Proyecciones de la semana actual

### Método 3: Prueba Individual de Endpoints

Para probar que SportsData funciona correctamente:

```javascript
// En la consola del navegador
testSportsData()
```

Esto probará todos los endpoints y mostrará si funcionan correctamente.

## 📊 Datos Disponibles desde SportsData

### Información de Jugadores
- **Datos básicos**: Nombre, equipo, posición, edad
- **Datos físicos**: Altura, peso, universidad
- **Estado**: Lesiones, práctica, estado activo
- **IDs cruzados**: DraftKings, FanDuel, Yahoo, ESPN

### Estadísticas Semanales
- **Passing**: Yards, TDs, INTs, completions
- **Rushing**: Carries, yards, TDs
- **Receiving**: Targets, receptions, yards, TDs
- **Fantasy Points**: PPR, Half-PPR, Standard

### Proyecciones Semanales
- Todas las categorías estadísticas proyectadas
- Puntos fantasy proyectados por sistema de puntuación
- Actualizaciones cada 10-15 minutos antes del juego

## 🔄 Diferencias entre Proveedores

| Característica | Sleeper | SportsData.io |
|---------------|---------|---------------|
| **Costo** | Gratis | $199/mes+ |
| **Player IDs** | Propios | Estándar industria |
| **Actualización** | ~5 min | Tiempo real |
| **DFS Data** | No | Sí |
| **Odds** | No | Sí |
| **Proyecciones** | Básicas | Detalladas |
| **API Rate Limit** | 100/min | 60/min |

## 🛠️ Configuración Técnica

### Variables de Entorno
El API key ya está configurado en `.env`:
```env
VITE_SPORTSDATA_API_KEY=a7fdf8e0c4914c15894d1cb3bb3c884a
```

### Edge Function
La Edge Function `sportsdata-proxy` ya está desplegada en Supabase y maneja:
- Autenticación con API key
- Cache de 5 minutos
- CORS headers
- Transformación de datos

## 📈 Monitoreo y Estado

### Ver Estado del Proveedor
En el panel de admin puedes ver:
- Proveedor activo actual
- Estado de salud (Healthy/Issues)
- Cantidad de datos en la base de datos
- Última sincronización

### Logs de Sincronización
Durante la sincronización verás:
- Progreso en tiempo real
- Mensajes de éxito/error
- Cantidad de registros sincronizados

## 🔧 Solución de Problemas

### Error: "API key not configured"
- Verifica que el API key esté en el archivo `.env`
- Reinicia el servidor de desarrollo

### Error: "Failed to fetch players"
- Verifica que la Edge Function esté desplegada
- Revisa los logs en Supabase Dashboard

### Datos no aparecen después de sincronizar
- Verifica en el panel que el proveedor activo sea SportsData
- Revisa la sección "Data Synchronization" para ver contadores
- Intenta sincronizar nuevamente

## 🎯 Mejores Prácticas

1. **Primera Sincronización**
   - Sincroniza Teams primero
   - Luego Players
   - Finalmente Stats y Projections

2. **Sincronización Semanal**
   - Sincroniza Stats después de que terminen los juegos
   - Sincroniza Projections antes del inicio de la semana

3. **Cambio de Proveedor**
   - Los IDs de jugadores son diferentes entre proveedores
   - Necesitarás re-sincronizar todos los datos al cambiar

## 📝 Notas Importantes

- **API Key**: El key proporcionado es para pruebas. Para producción, obtén tu propio key en sportsdata.io
- **Límites**: 60 requests por minuto, 500 por hora
- **Cache**: Los datos se cachean por 5 minutos para optimizar
- **Fallback**: Si SportsData falla, automáticamente usa Sleeper

## 🚀 Comandos Rápidos

```javascript
// Cambiar a SportsData
providerManager.switchProvider('sportsdata')

// Cambiar a Sleeper
providerManager.switchProvider('sleeper')

// Sincronizar todo desde el proveedor activo
syncSportsData()

// Probar SportsData
testSportsData()

// Ver estado actual
providerManager.getProviderStats()
```

## 📞 Soporte

Si encuentras problemas:
1. Revisa la consola del navegador para errores
2. Verifica el estado en el panel de admin
3. Revisa los logs de Supabase Edge Functions
4. Contacta al soporte técnico con los detalles del error