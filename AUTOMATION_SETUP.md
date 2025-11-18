# Configuración de Automatización Semanal NFL

Este documento explica cómo está configurada la automatización del proceso semanal de la liga NFL Fantasy.

## 🎯 Proceso Automatizado

Cada **martes a las 6:00 AM EST** (11:00 UTC), el sistema ejecuta automáticamente:

1. **Sincronización de estadísticas finales** - Actualiza stats de jugadores desde SportsData API
2. **Actualización de puntos semanales** - Calcula y guarda `weekly_points` para todos los equipos
3. **Eliminación del equipo con menos puntos** - Identifica y elimina al último lugar
4. **Avance de semana** - Crea la nueva semana y copia rosters
5. **Sincronización de proyecciones** - Actualiza proyecciones para la nueva semana

## 🔧 Componentes del Sistema

### 1. Funciones SQL (Supabase)

#### `update_team_weekly_points(team_id, week, season)`
- Calcula puntos de un equipo específico
- Suma `fantasy_points` de `player_stats` para jugadores activos
- Actualiza el campo `weekly_points` en `fantasy_teams`

#### `update_league_weekly_points(league_id, week, season)`
- Actualiza puntos de todos los equipos en una liga
- Retorna lista ordenada por puntos (menor a mayor)

#### `update_all_leagues_weekly_points(week, season)`
- Actualiza puntos de todas las ligas activas
- Retorna resumen con min/max puntos por liga

**Ubicación:** `supabase/migrations/20251117_update_weekly_points_function.sql`

---

### 2. Edge Functions (Supabase)

#### `weekly-elimination`
**URL:** `https://[tu-proyecto].supabase.co/functions/v1/weekly-elimination`

**Secuencia de ejecución:**
1. Sync final de stats (llama a `sync-weekly-stats`)
2. Espera 2 segundos para triggers de DB
3. **Actualiza `weekly_points`** (nuevo paso agregado)
4. Ejecuta `process_all_leagues_tuesday_3am` (eliminación + avance)

**Ubicación:** `supabase/functions/weekly-elimination/index.ts`
**Versión actual:** v15 (con actualización de puntos)

#### `sync-projections`
**URL:** `https://[tu-proyecto].supabase.co/functions/v1/sync-projections`

**Funcionalidad:**
- Obtiene semana actual desde tabla `weeks`
- Llama a SportsData API para proyecciones
- Mapea jugadores por `sportsdata_id`, `stats_id` o nombre
- Actualiza `player_stats` con proyecciones en batches de 500

**Ubicación:** `supabase/functions/sync-projections/index.ts`
**Versión actual:** v1

---

### 3. GitHub Actions Workflow

#### `weekly-nfl-process.yml`
**Trigger:** Martes 6:00 AM EST (cron: `0 11 * * 2`)

**Jobs:**
1. **Elimination Process** - Llama a `weekly-elimination` edge function
2. **Wait 10 segundos** - Permite completar operaciones de DB
3. **Projections Sync** - Llama a `sync-projections` edge function

**Características:**
- ✅ Ejecución automática programada
- ✅ Opción de ejecución manual (`workflow_dispatch`)
- ✅ Parámetro opcional de `season`
- ✅ Logs detallados en GitHub Actions
- ✅ No falla si proyecciones fallan (failsafe)

**Ubicación:** `.github/workflows/weekly-nfl-process.yml`

---

## 🔑 Configuración de GitHub Secrets

Para que el workflow funcione, necesitas configurar estos **secrets** en tu repositorio de GitHub:

### Paso 1: Ir a GitHub Settings

1. Ve a tu repositorio en GitHub
2. Click en **Settings** (Configuración)
3. En el menú lateral, click en **Secrets and variables** → **Actions**
4. Click en **New repository secret**

### Paso 2: Crear los Secrets

#### Secret 1: `SUPABASE_URL`
- **Nombre:** `SUPABASE_URL`
- **Valor:** URL de tu proyecto Supabase
- **Formato:** `https://xxxxxxxxxxx.supabase.co`
- **Dónde encontrarlo:**
  - Supabase Dashboard → Project Settings → API
  - Campo "Project URL"

#### Secret 2: `CRON_SECRET`
- **Nombre:** `CRON_SECRET`
- **Valor:** Token secreto para autenticar llamadas automáticas
- **Cómo generarlo:**
  ```bash
  # Opción 1: Generar un UUID
  uuidgen

  # Opción 2: Generar string aleatorio
  openssl rand -hex 32
  ```
- **Dónde configurarlo también:**
  - Supabase Dashboard → Project Settings → Edge Functions
  - Agregar variable de entorno `CRON_SECRET` con el mismo valor

#### Secret 3 (Opcional): `SPORTSDATA_API_KEY`
- **Nombre:** `SPORTSDATA_API_KEY`
- **Valor:** Tu API key de SportsData.io
- **Nota:** Si no lo configuras, se usa la key por defecto en el código

---

## 🧪 Pruebas Manuales

### Probar Weekly Elimination
```bash
curl -X POST "https://[tu-proyecto].supabase.co/functions/v1/weekly-elimination" \
  -H "Authorization: Bearer [CRON_SECRET]" \
  -H "Content-Type: application/json" \
  -d '{"action": "tuesday_3am_process", "season": 2025}'
```

### Probar Sync Projections
```bash
curl -X POST "https://[tu-proyecto].supabase.co/functions/v1/sync-projections" \
  -H "Authorization: Bearer [CRON_SECRET]" \
  -H "Content-Type: application/json" \
  -d '{"season": 2025, "seasonType": "REG"}'
```

### Ejecutar GitHub Action Manualmente
1. Ve a tu repositorio en GitHub
2. Click en **Actions**
3. Selecciona **Weekly NFL Process**
4. Click en **Run workflow**
5. (Opcional) Ingresa año de temporada
6. Click en **Run workflow**

---

## 📊 Monitoreo

### Ver logs de Edge Functions
```bash
# Instalar Supabase CLI
npm i -g supabase

# Login
npx supabase login

# Ver logs
npx supabase functions logs weekly-elimination
npx supabase functions logs sync-projections
```

### Ver logs de GitHub Actions
1. Ve a tu repositorio → **Actions**
2. Click en el workflow **Weekly NFL Process**
3. Selecciona la ejecución que quieres revisar
4. Expande los steps para ver logs detallados

---

## 🔄 Flujo Completo del Proceso

```
MARTES 6:00 AM EST
    ↓
GitHub Actions se activa (cron job)
    ↓
┌─────────────────────────────────────┐
│  Edge Function: weekly-elimination  │
├─────────────────────────────────────┤
│  1. Sync stats finales              │
│  2. Wait 2 segundos                 │
│  3. Actualizar weekly_points        │  ← NUEVO
│  4. Eliminar equipo con menos puntos│
│  5. Avanzar a siguiente semana      │
└─────────────────────────────────────┘
    ↓
Wait 10 segundos
    ↓
┌─────────────────────────────────────┐
│  Edge Function: sync-projections    │
├─────────────────────────────────────┤
│  1. Obtener semana actual           │
│  2. Fetch proyecciones de API       │
│  3. Mapear jugadores                │
│  4. Update player_stats             │
└─────────────────────────────────────┘
    ↓
Proceso completado ✅
```

---

## ⚠️ Notas Importantes

1. **Zona Horaria:** El workflow está configurado para UTC. Asegúrate de que el cron schedule (`0 11 * * 2`) corresponda a tu hora local deseada.

2. **Failsafe:** Si la sincronización de proyecciones falla, el workflow NO falla completamente. Solo la eliminación es crítica.

3. **Season Parameter:** Por defecto usa el año actual. En transición de temporada (diciembre-enero), verifica que use el año correcto.

4. **Database Triggers:** Las migraciones existentes pueden tener triggers que se ejecutan después de ciertos eventos. El wait de 2 segundos permite que se completen.

5. **Workflow Antiguo:** El archivo `elimination-cron.yml` fue deshabilitado (renombrado a `.disabled`) porque usaba la función SQL vieja que no incluye actualización de puntos.

---

## 🐛 Troubleshooting

### El workflow no se ejecuta automáticamente
- Verifica que los secrets estén configurados correctamente
- Revisa que el repositorio tenga Actions habilitado
- Comprueba que no haya errores de sintaxis en el YAML

### Error "Unauthorized" en edge function
- Verifica que `CRON_SECRET` sea el mismo en GitHub Secrets y Supabase
- Asegúrate de usar el formato correcto: `Bearer [secret]`

### Proyecciones no se actualizan
- Verifica la API key de SportsData en Supabase Edge Function config
- Revisa los logs para ver si hay errores de mapping
- Confirma que la semana actual esté correctamente identificada

### Puntos semanales no se actualizan
- Verifica que la migración `20251117_update_weekly_points_function.sql` esté aplicada
- Ejecuta manualmente: `SELECT update_all_leagues_weekly_points(week, season);`
- Revisa que `player_stats` tenga datos de `fantasy_points` para la semana

---

## 📝 Archivos Modificados/Creados

- ✅ `supabase/migrations/20251117_update_weekly_points_function.sql` (nueva)
- ✅ `supabase/functions/weekly-elimination/index.ts` (modificada - v15)
- ✅ `supabase/functions/sync-projections/index.ts` (nueva - v1)
- ✅ `.github/workflows/weekly-nfl-process.yml` (nueva)
- ✅ `.github/workflows/elimination-cron.yml.disabled` (deshabilitada)
- ✅ `AUTOMATION_SETUP.md` (este archivo)

---

## ✅ Checklist de Configuración

- [ ] Migración SQL aplicada en Supabase
- [ ] Edge function `weekly-elimination` deployada (v15+)
- [ ] Edge function `sync-projections` deployada (v1+)
- [ ] GitHub Secret `SUPABASE_URL` configurado
- [ ] GitHub Secret `CRON_SECRET` configurado
- [ ] Variable de entorno `CRON_SECRET` en Supabase Edge Functions
- [ ] Workflow antiguo deshabilitado
- [ ] Prueba manual exitosa de `weekly-elimination`
- [ ] Prueba manual exitosa de `sync-projections`
- [ ] GitHub Action ejecutado manualmente con éxito

---

## 📞 Soporte

Si tienes problemas con la automatización:
1. Revisa los logs de GitHub Actions
2. Revisa los logs de Supabase Edge Functions
3. Verifica que todos los secrets estén configurados
4. Ejecuta las pruebas manuales para aislar el problema
