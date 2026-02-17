
-- Business configuration table
CREATE TABLE public.configuracion_negocio (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  nombre_comercial text NOT NULL DEFAULT '',
  rnc text DEFAULT '',
  direccion text DEFAULT '',
  telefono text DEFAULT '',
  email text DEFAULT '',
  logo_url text DEFAULT '',
  mensaje_factura text DEFAULT 'Gracias por su compra',
  itbis_rate numeric NOT NULL DEFAULT 0.18,
  moneda text NOT NULL DEFAULT 'RD$',
  impresion_automatica boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(user_id)
);

ALTER TABLE public.configuracion_negocio ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can CRUD own config"
  ON public.configuracion_negocio FOR ALL
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE TRIGGER update_config_updated_at
  BEFORE UPDATE ON public.configuracion_negocio
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();

-- NCF sequences table
CREATE TABLE public.ncf_secuencias (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  tipo_comprobante text NOT NULL, -- B01, B02, B14, B15
  serie text NOT NULL DEFAULT 'B',
  secuencia_actual integer NOT NULL DEFAULT 0,
  secuencia_limite integer NOT NULL DEFAULT 999999,
  prefijo text NOT NULL DEFAULT '',
  activo boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(user_id, tipo_comprobante)
);

ALTER TABLE public.ncf_secuencias ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can CRUD own ncf"
  ON public.ncf_secuencias FOR ALL
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- Add fiscal columns to facturas
ALTER TABLE public.facturas 
  ADD COLUMN IF NOT EXISTS tipo_comprobante text DEFAULT 'B01',
  ADD COLUMN IF NOT EXISTS ncf text DEFAULT '';

-- Function to get next NCF
CREATE OR REPLACE FUNCTION public.next_ncf(p_user_id uuid, p_tipo text)
RETURNS text
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_seq record;
  v_ncf text;
BEGIN
  SELECT * INTO v_seq FROM public.ncf_secuencias
    WHERE user_id = p_user_id AND tipo_comprobante = p_tipo AND activo = true
    FOR UPDATE;
  
  IF NOT FOUND THEN
    INSERT INTO public.ncf_secuencias (user_id, tipo_comprobante, secuencia_actual, prefijo)
    VALUES (p_user_id, p_tipo, 1, p_tipo)
    RETURNING * INTO v_seq;
    
    v_ncf := p_tipo || LPAD('1', 8, '0');
    RETURN v_ncf;
  END IF;
  
  IF v_seq.secuencia_actual >= v_seq.secuencia_limite THEN
    RAISE EXCEPTION 'NCF sequence exhausted for type %', p_tipo;
  END IF;
  
  UPDATE public.ncf_secuencias 
    SET secuencia_actual = secuencia_actual + 1
    WHERE id = v_seq.id;
  
  v_ncf := p_tipo || LPAD((v_seq.secuencia_actual + 1)::text, 8, '0');
  RETURN v_ncf;
END;
$$;
