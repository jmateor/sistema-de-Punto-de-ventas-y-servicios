
CREATE OR REPLACE FUNCTION public.decrement_stock(p_id UUID, amount INTEGER)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  UPDATE public.productos SET stock = stock - amount WHERE id = p_id;
END;
$$;
