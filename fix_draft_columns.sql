-- Script para ejecutar directamente en Supabase SQL Editor
-- Este script agrega las columnas necesarias para el draft si no existen

-- Verificar si las columnas ya existen antes de agregarlas
DO $$ 
BEGIN
    -- Agregar draft_order si no existe
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_schema = 'public' 
        AND table_name = 'leagues' 
        AND column_name = 'draft_order'
    ) THEN
        ALTER TABLE public.leagues ADD COLUMN draft_order UUID[];
    END IF;

    -- Agregar current_pick si no existe
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_schema = 'public' 
        AND table_name = 'leagues' 
        AND column_name = 'current_pick'
    ) THEN
        ALTER TABLE public.leagues ADD COLUMN current_pick INTEGER DEFAULT 0;
    END IF;

    -- Agregar draft_status si no existe
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_schema = 'public' 
        AND table_name = 'leagues' 
        AND column_name = 'draft_status'
    ) THEN
        ALTER TABLE public.leagues ADD COLUMN draft_status VARCHAR(20) DEFAULT 'pending';
    END IF;

    -- Agregar start_date si no existe
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_schema = 'public' 
        AND table_name = 'leagues' 
        AND column_name = 'start_date'
    ) THEN
        ALTER TABLE public.leagues ADD COLUMN start_date TIMESTAMPTZ;
    END IF;
END $$;

-- Verificar que las columnas se agregaron correctamente
SELECT 
    column_name, 
    data_type, 
    column_default
FROM 
    information_schema.columns
WHERE 
    table_schema = 'public' 
    AND table_name = 'leagues'
    AND column_name IN ('draft_order', 'current_pick', 'draft_status', 'start_date')
ORDER BY 
    ordinal_position;