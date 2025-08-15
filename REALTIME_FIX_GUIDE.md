# Guía para Arreglar Realtime en Supabase

## 1. Verificar en el Dashboard de Supabase

### Opción A: Desde la interfaz web
1. Ve a tu proyecto en Supabase Dashboard
2. Ve a **Database** → **Replication**
3. Busca la sección **Supabase Realtime**
4. Verifica que estas tablas tengan el switch activado:
   - `leagues`
   - `team_rosters`
   - `roster_moves`
   - `fantasy_teams`

5. Si alguna NO está activada, actívala haciendo clic en el switch

### Opción B: Desde Database → Tables
1. Ve a **Database** → **Tables**
2. Haz clic en cada tabla (`leagues`, `team_rosters`, etc.)
3. Ve a la pestaña **Realtime** en cada tabla
4. Asegúrate de que esté habilitado para:
   - **Insert**
   - **Update**
   - **Delete**

## 2. Verificar Configuración de Realtime

En el SQL Editor, ejecuta:

```sql
-- Ver configuración actual de Realtime
SELECT * FROM realtime.subscription;
```

## 3. Forzar Re-habilitación de Realtime

Si todo parece estar bien pero no funciona, prueba deshabilitar y volver a habilitar:

```sql
-- Deshabilitar Realtime temporalmente
ALTER PUBLICATION supabase_realtime DROP TABLE IF EXISTS public.leagues;
ALTER PUBLICATION supabase_realtime DROP TABLE IF EXISTS public.team_rosters;

-- Espera unos segundos, luego vuelve a habilitar
ALTER PUBLICATION supabase_realtime ADD TABLE public.leagues;
ALTER PUBLICATION supabase_realtime ADD TABLE public.team_rosters;
```

## 4. Verificar WebSocket Connection

En la consola del navegador (F12), verifica:
1. Ve a la pestaña **Network**
2. Filtra por **WS** (WebSocket)
3. Deberías ver una conexión a `wss://[tu-proyecto].supabase.co/realtime/v1/websocket`
4. Si ves errores de conexión, podría ser un problema de red o firewall

## 5. Solución Alternativa: Polling Agresivo

Si Realtime sigue sin funcionar, podemos implementar polling cada 2-3 segundos como solución temporal.