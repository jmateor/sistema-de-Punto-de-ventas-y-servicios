import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";

export type AppRole = "admin" | "cajero" | "contador";

interface Permissions {
  role: AppRole | null;
  isAdmin: boolean;
  isCajero: boolean;
  isContador: boolean;
  loading: boolean;
  canAnular: boolean;
  canEliminar: boolean;
  canEditarPrecios: boolean;
  canAplicarDescuentos: boolean;
  canExportar: boolean;
  canConfiguracion: boolean;
  canGestionUsuarios: boolean;
}

export function usePermissions(): Permissions {
  const { user } = useAuth();
  const [role, setRole] = useState<AppRole | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user) { setLoading(false); return; }
    supabase
      .from("user_roles")
      .select("role")
      .eq("user_id", user.id)
      .maybeSingle()
      .then(({ data }) => {
        setRole((data?.role as AppRole) || "cajero");
        setLoading(false);
      });
  }, [user]);

  const isAdmin = role === "admin";
  const isCajero = role === "cajero";
  const isContador = role === "contador";

  return {
    role,
    isAdmin,
    isCajero,
    isContador,
    loading,
    canAnular: isAdmin,
    canEliminar: isAdmin,
    canEditarPrecios: isAdmin,
    canAplicarDescuentos: isAdmin || isContador,
    canExportar: isAdmin || isContador,
    canConfiguracion: isAdmin,
    canGestionUsuarios: isAdmin,
  };
}
