
-- Add tipo column to productos (producto | servicio)
ALTER TABLE public.productos ADD COLUMN IF NOT EXISTS tipo text NOT NULL DEFAULT 'producto';

-- Add condiciones_garantia for multi-line warranty conditions
ALTER TABLE public.productos ADD COLUMN IF NOT EXISTS condiciones_garantia text DEFAULT NULL;
