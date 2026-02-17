import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Users, Package, FileText, DollarSign, AlertTriangle, TrendingUp } from "lucide-react";

export default function Dashboard() {
  const { user } = useAuth();
  const [stats, setStats] = useState({
    clientes: 0,
    productos: 0,
    facturas: 0,
    ventasMes: 0,
    stockBajo: 0,
    facturasHoy: 0,
  });

  useEffect(() => {
    if (!user) return;
    const load = async () => {
      const [clientesRes, productosRes, facturasRes, stockRes] = await Promise.all([
        supabase.from("clientes").select("id", { count: "exact", head: true }),
        supabase.from("productos").select("id", { count: "exact", head: true }),
        supabase.from("facturas").select("id, total, created_at"),
        supabase.from("productos").select("id").lt("stock", 5),
      ]);

      const facturas = facturasRes.data || [];
      const now = new Date();
      const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1).toISOString();
      const startOfDay = new Date(now.getFullYear(), now.getMonth(), now.getDate()).toISOString();

      const ventasMes = facturas
        .filter(f => f.created_at >= startOfMonth)
        .reduce((sum, f) => sum + Number(f.total), 0);
      
      const facturasHoy = facturas.filter(f => f.created_at >= startOfDay).length;

      setStats({
        clientes: clientesRes.count || 0,
        productos: productosRes.count || 0,
        facturas: facturas.length,
        ventasMes,
        stockBajo: stockRes.data?.length || 0,
        facturasHoy,
      });
    };
    load();
  }, [user]);

  const cards = [
    { title: "Ventas del Mes", value: `RD$ ${stats.ventasMes.toLocaleString("es-DO", { minimumFractionDigits: 2 })}`, icon: DollarSign, color: "text-accent" },
    { title: "Facturas Hoy", value: stats.facturasHoy, icon: TrendingUp, color: "text-primary" },
    { title: "Total Clientes", value: stats.clientes, icon: Users, color: "text-info" },
    { title: "Productos", value: stats.productos, icon: Package, color: "text-primary" },
    { title: "Total Facturas", value: stats.facturas, icon: FileText, color: "text-muted-foreground" },
    { title: "Stock Bajo", value: stats.stockBajo, icon: AlertTriangle, color: "text-warning" },
  ];

  return (
    <div className="animate-fade-in space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-foreground">Dashboard</h1>
        <p className="text-muted-foreground">Resumen general de tu negocio</p>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {cards.map((card) => (
          <Card key={card.title} className="stat-card">
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">{card.title}</CardTitle>
              <card.icon className={`h-5 w-5 ${card.color}`} />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-foreground">{card.value}</div>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}
