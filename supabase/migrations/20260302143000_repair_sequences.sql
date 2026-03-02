-- =============================================================================
-- ARQUITECTURA DE BASE DE DATOS: REPARACIÓN INTEGRAL DE SECUENCIAS Y RPC
-- =============================================================================
-- Problema: Error "public.nextval(seq_name) not found in schema cache".
-- Causa: PostgREST/Supabase no expone funciones internas (pg_catalog) por defecto.
-- Solución: Implementación de Bridge Pattern para RPC y Auditoría de Identidad.
-- =============================================================================

BEGIN;

-- 1. BRIDGE DE FUNCIÓN NEXTVAL
-- Expone la funcionalidad de secuencias al esquema público de forma segura.
CREATE OR REPLACE FUNCTION public.nextval(seq_name text)
RETURNS bigint
LANGUAGE plpgsql
SECURITY DEFINER -- Ejecuta con privilegios de dueño para acceder a secuencias
AS $$
BEGIN
    -- Validación de seguridad básica y casteo a regclass
    RETURN nextval(seq_name::regclass);
EXCEPTION WHEN OTHERS THEN
    RAISE EXCEPTION 'Secuencia % no encontrada o inaccesible', seq_name;
END;
$$;

-- 2. ASEGURAR SECUENCIA DE FACTURACIÓN
-- La numeración de facturas es un proceso crítico que debe ser secuencial.
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_class WHERE relname = 'factura_numero_seq' AND relkind = 'S') THEN
        CREATE SEQUENCE public.factura_numero_seq START 1;
    END IF;
END $$;

-- Sincronizar secuencia con el máximo actual si ya existen facturas
-- Esto previene errores de "duplicate key" si se importaron datos.
SELECT setval('public.factura_numero_seq', 
    COALESCE((SELECT MAX(NULLIF(regexp_replace(numero, '\D', '', 'g'), '')::bigint) FROM public.facturas), 0) + 1, 
    false);

-- 3. AUDITORÍA DE TABLAS CRÍTICAS (IDs UUID)
-- En este sistema, las tablas usan UUID (gen_random_uuid) para IDs, no secuencias.
-- Aseguramos que los valores por defecto estén correctamente configurados.

-- Auditoría: facturas
ALTER TABLE public.facturas ALTER COLUMN id SET DEFAULT gen_random_uuid();

-- Auditoría: ordenes_servicio
ALTER TABLE public.ordenes_servicio ALTER COLUMN id SET DEFAULT gen_random_uuid();

-- 4. PERMISOS DE SEGURIDAD (RBAC)
-- Conceder permisos necesarios a los roles de Supabase.
GRANT USAGE, SELECT ON ALL SEQUENCES IN SCHEMA public TO anon, authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.nextval(text) TO anon, authenticated, service_role;

COMMIT;

-- =============================================================================
-- RESULTADO: Sistema de numeración restaurado y bridge de RPC habilitado.
-- =============================================================================
