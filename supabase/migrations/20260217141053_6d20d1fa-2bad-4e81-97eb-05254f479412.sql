
-- Enum para roles
CREATE TYPE public.app_role AS ENUM ('admin', 'cajero', 'contador');

-- Enum para métodos de pago
CREATE TYPE public.metodo_pago AS ENUM ('efectivo', 'tarjeta', 'transferencia');

-- Enum para estado de factura
CREATE TYPE public.estado_factura AS ENUM ('activa', 'anulada');

-- Profiles table
CREATE TABLE public.profiles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL UNIQUE,
  nombre TEXT NOT NULL DEFAULT '',
  email TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- User roles table
CREATE TABLE public.user_roles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  role app_role NOT NULL DEFAULT 'cajero',
  UNIQUE(user_id, role)
);

-- Security definer function for role checking
CREATE OR REPLACE FUNCTION public.has_role(_user_id UUID, _role app_role)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.user_roles WHERE user_id = _user_id AND role = _role
  )
$$;

-- Categorias
CREATE TABLE public.categorias (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  nombre TEXT NOT NULL,
  descripcion TEXT,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Clientes
CREATE TABLE public.clientes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  nombre TEXT NOT NULL,
  rnc_cedula TEXT,
  direccion TEXT,
  telefono TEXT,
  email TEXT,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Productos
CREATE TABLE public.productos (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  nombre TEXT NOT NULL,
  descripcion TEXT,
  precio NUMERIC(12,2) NOT NULL DEFAULT 0,
  costo NUMERIC(12,2) NOT NULL DEFAULT 0,
  stock INTEGER NOT NULL DEFAULT 0,
  stock_minimo INTEGER NOT NULL DEFAULT 5,
  categoria_id UUID REFERENCES public.categorias(id) ON DELETE SET NULL,
  itbis_aplicable BOOLEAN NOT NULL DEFAULT true,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Proveedores
CREATE TABLE public.proveedores (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  nombre TEXT NOT NULL,
  rnc TEXT,
  direccion TEXT,
  telefono TEXT,
  email TEXT,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Facturas
CREATE TABLE public.facturas (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  numero TEXT NOT NULL,
  cliente_id UUID REFERENCES public.clientes(id) ON DELETE RESTRICT NOT NULL,
  fecha TIMESTAMPTZ NOT NULL DEFAULT now(),
  subtotal NUMERIC(12,2) NOT NULL DEFAULT 0,
  itbis NUMERIC(12,2) NOT NULL DEFAULT 0,
  descuento NUMERIC(12,2) NOT NULL DEFAULT 0,
  total NUMERIC(12,2) NOT NULL DEFAULT 0,
  metodo_pago metodo_pago NOT NULL DEFAULT 'efectivo',
  estado estado_factura NOT NULL DEFAULT 'activa',
  notas TEXT,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Detalle facturas
CREATE TABLE public.detalle_facturas (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  factura_id UUID REFERENCES public.facturas(id) ON DELETE CASCADE NOT NULL,
  producto_id UUID REFERENCES public.productos(id) ON DELETE RESTRICT NOT NULL,
  cantidad INTEGER NOT NULL DEFAULT 1,
  precio_unitario NUMERIC(12,2) NOT NULL,
  itbis NUMERIC(12,2) NOT NULL DEFAULT 0,
  subtotal NUMERIC(12,2) NOT NULL DEFAULT 0
);

-- Compras
CREATE TABLE public.compras (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  proveedor_id UUID REFERENCES public.proveedores(id) ON DELETE RESTRICT NOT NULL,
  fecha TIMESTAMPTZ NOT NULL DEFAULT now(),
  total NUMERIC(12,2) NOT NULL DEFAULT 0,
  notas TEXT,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Detalle compras
CREATE TABLE public.detalle_compras (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  compra_id UUID REFERENCES public.compras(id) ON DELETE CASCADE NOT NULL,
  producto_id UUID REFERENCES public.productos(id) ON DELETE RESTRICT NOT NULL,
  cantidad INTEGER NOT NULL DEFAULT 1,
  precio_unitario NUMERIC(12,2) NOT NULL,
  subtotal NUMERIC(12,2) NOT NULL DEFAULT 0
);

-- Indexes
CREATE INDEX idx_clientes_user ON public.clientes(user_id);
CREATE INDEX idx_productos_user ON public.productos(user_id);
CREATE INDEX idx_productos_categoria ON public.productos(categoria_id);
CREATE INDEX idx_facturas_user ON public.facturas(user_id);
CREATE INDEX idx_facturas_cliente ON public.facturas(cliente_id);
CREATE INDEX idx_facturas_fecha ON public.facturas(fecha);
CREATE INDEX idx_detalle_facturas_factura ON public.detalle_facturas(factura_id);
CREATE INDEX idx_compras_user ON public.compras(user_id);
CREATE INDEX idx_compras_proveedor ON public.compras(proveedor_id);

-- Auto-create profile on signup
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.profiles (user_id, nombre, email)
  VALUES (NEW.id, COALESCE(NEW.raw_user_meta_data->>'nombre', ''), NEW.email);
  
  INSERT INTO public.user_roles (user_id, role)
  VALUES (NEW.id, 'admin');
  
  RETURN NEW;
END;
$$;

CREATE TRIGGER on_auth_user_created
AFTER INSERT ON auth.users
FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- Updated_at trigger
CREATE OR REPLACE FUNCTION public.update_updated_at()
RETURNS TRIGGER
LANGUAGE plpgsql
SET search_path = public
AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

CREATE TRIGGER update_profiles_updated_at BEFORE UPDATE ON public.profiles FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();
CREATE TRIGGER update_clientes_updated_at BEFORE UPDATE ON public.clientes FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();
CREATE TRIGGER update_productos_updated_at BEFORE UPDATE ON public.productos FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();

-- Sequence for invoice numbering
CREATE SEQUENCE public.factura_numero_seq START 1;

-- RLS Policies
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.categorias ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.clientes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.productos ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.proveedores ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.facturas ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.detalle_facturas ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.compras ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.detalle_compras ENABLE ROW LEVEL SECURITY;

-- Profiles RLS
CREATE POLICY "Users can view own profile" ON public.profiles FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can update own profile" ON public.profiles FOR UPDATE USING (auth.uid() = user_id);

-- User roles RLS
CREATE POLICY "Users can view own roles" ON public.user_roles FOR SELECT USING (auth.uid() = user_id);

-- Categorias RLS
CREATE POLICY "Users can CRUD own categorias" ON public.categorias FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

-- Clientes RLS
CREATE POLICY "Users can CRUD own clientes" ON public.clientes FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

-- Productos RLS
CREATE POLICY "Users can CRUD own productos" ON public.productos FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

-- Proveedores RLS
CREATE POLICY "Users can CRUD own proveedores" ON public.proveedores FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

-- Facturas RLS
CREATE POLICY "Users can CRUD own facturas" ON public.facturas FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

-- Detalle facturas RLS (through factura ownership)
CREATE POLICY "Users can manage own detalle_facturas" ON public.detalle_facturas FOR ALL
USING (EXISTS (SELECT 1 FROM public.facturas WHERE facturas.id = detalle_facturas.factura_id AND facturas.user_id = auth.uid()))
WITH CHECK (EXISTS (SELECT 1 FROM public.facturas WHERE facturas.id = detalle_facturas.factura_id AND facturas.user_id = auth.uid()));

-- Compras RLS
CREATE POLICY "Users can CRUD own compras" ON public.compras FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

-- Detalle compras RLS
CREATE POLICY "Users can manage own detalle_compras" ON public.detalle_compras FOR ALL
USING (EXISTS (SELECT 1 FROM public.compras WHERE compras.id = detalle_compras.compra_id AND compras.user_id = auth.uid()))
WITH CHECK (EXISTS (SELECT 1 FROM public.compras WHERE compras.id = detalle_compras.compra_id AND compras.user_id = auth.uid()));
