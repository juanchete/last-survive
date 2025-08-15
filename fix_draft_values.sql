-- Script para corregir valores nulos en las columnas del draft

-- Actualizar current_pick a 0 donde esté en NULL
UPDATE public.leagues 
SET current_pick = 0 
WHERE current_pick IS NULL;

-- Asegurar que draft_status tenga un valor válido
UPDATE public.leagues 
SET draft_status = 'pending' 
WHERE draft_status IS NULL OR draft_status = '';

-- Establecer valor por defecto para current_pick
ALTER TABLE public.leagues 
ALTER COLUMN current_pick SET DEFAULT 0;

-- Verificar el estado actual de las ligas
SELECT 
    id,
    name,
    draft_status,
    current_pick,
    array_length(draft_order, 1) as draft_order_length,
    start_date
FROM 
    public.leagues
ORDER BY 
    created_at DESC;