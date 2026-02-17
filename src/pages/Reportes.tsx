import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { BarChart3, TrendingUp, Package, Users } from "lucide-react";

export default function Reportes() {
  const { user } = useAuth();
  const [ventasHoy, setVentasHoy] = useState(0);
  const [ventasSemana, setVentasSemana] = useState(0);
  const [ventasMes, setVentasMes] = useState(0);
  const [topProductos, setTopProductos] = useState<{ nombre: string; total: number }[]>([]);

  useEffect(() => {
    if (!user) return;
    const load = async () => {
      const { data: facturas } = await supabase
        .from("facturas")
        .select("total, created_at, estado")
        .eq("estado", "activa" as any);

      const now = new Date();
      const startDay = new Date(now.getFullYear(), now.getMonth(), now.getDate()).toISOString();
      const startWeek = new Date(now.getTime() - 7 * 86400000).toISOString();
      const startMonth = new Date(now.getFullYear(), now.getMonth(), 1).toISOString();

      const f = facturas || [];
      setVentasHoy(f.filter(x => x.created_at >= startDay).reduce((s, x) => s + Number(x.total), 0));
      setVentasSemana(f.filter(x => x.created_at >= startWeek).reduce((s, x) => s + Number(x.total), 0));
      setVentasMes(f.filter(x => x.created_at >= startMonth).reduce((s, x) => s + Number(x.total), 0));

      // Top products
      const { data: detalles } = await supabase
        .from("detalle_facturas")
        .select("cantidad, producto_id, productos(nombre)");

      const grouped: Record<string, { nombre: string; total: number }> = {};
      (detalles || []).forEach((d: any) => {
        const name = d.productos?.nombre || "Desconocido";
        if (!grouped[d.producto_id]) grouped[d.producto_id] = { nombre: name, total: 0 };
        grouped[d.producto_id].total += d.cantidad;
      });
      setTopProductos(Object.values(grouped).sort((a, b) => b.total - a.total).slice(0, 5));
    };
    load();
  }, [user]);

  const fmt = (n: number) => `RD$ ${n.toLocaleString("es-DO", { minimumFractionDigits: 2 })}`;

  return (
    <div className="animate-fade-in space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-foreground">Reportes</h1>
        <p className="text-muted-foreground">Resumen de ventas y métricas</p>
      </div>

      <div className="grid gap-4 sm:grid-cols-3">
        <Card className="stat-card">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Ventas Hoy</CardTitle>
            <TrendingUp className="h-5 w-5 text-accent" />
          </CardHeader>
          <CardContent><div className="text-2xl font-bold">{fmt(ventasHoy)}</div></CardContent>
        </Card>
        <Card className="stat-card">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Ventas Semana</CardTitle>
            <BarChart3 className="h-5 w-5 text-primary" />
          </CardHeader>
          <CardContent><div className="text-2xl font-bold">{fmt(ventasSemana)}</div></CardContent>
        </Card>
        <Card className="stat-card">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Ventas Mes</CardTitle>
            <BarChart3 className="h-5 w-5 text-info" />
          </CardHeader>
          <CardContent><div className="text-2xl font-bold">{fmt(ventasMes)}</div></CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader><CardTitle className="text-base">Productos Más Vendidos</CardTitle></CardHeader>
        <CardContent>
          {topProductos.length === 0 ? (
            <p className="text-muted-foreground text-center py-4">No hay datos aún</p>
          ) : (
            <div className="space-y-3">
              {topProductos.map((p, i) => (
                <div key={i} className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <span className="text-sm font-bold text-muted-foreground w-6">{i + 1}</span>
                    <span className="font-medium">{p.nombre}</span>
                  </div>
                  <span className="text-sm text-muted-foreground">{p.total} unidades</span>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
