-- Add garantia_descripcion to productos
ALTER TABLE public.productos ADD COLUMN IF NOT EXISTS garantia_descripcion TEXT DEFAULT NULL;

-- Add print format and logo_url to configuracion_negocio
ALTER TABLE public.configuracion_negocio ADD COLUMN IF NOT EXISTS formato_impresion TEXT DEFAULT '80mm';
ALTER TABLE public.configuracion_negocio ADD COLUMN IF NOT EXISTS logo_url TEXT DEFAULT NULL;
ALTER TABLE public.configuracion_negocio ADD COLUMN IF NOT EXISTS whatsapp TEXT DEFAULT NULL;
ALTER TABLE public.configuracion_negocio ADD COLUMN IF NOT EXISTS razon_social TEXT DEFAULT NULL;
