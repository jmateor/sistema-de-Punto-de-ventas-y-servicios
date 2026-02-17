import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ChartContainer, ChartTooltip, ChartTooltipContent } from "@/components/ui/chart";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, LineChart, Line } from "recharts";
import { Users, Package, FileText, DollarSign, AlertTriangle, TrendingUp, Receipt } from "lucide-react";

export default function Dashboard() {
  const { user } = useAuth();
  const [stats, setStats] = useState({
    clientes: 0,
    productos: 0,
    facturas: 0,
    ventasMes: 0,
    ventasHoy: 0,
    stockBajo: 0,
    facturasHoy: 0,
    ticketPromedio: 0,
  });
  const [tendencia, setTendencia] = useState<{ dia: string; total: number }[]>([]);
  const [comparativa, setComparativa] = useState<{ mes: string; total: number }[]>([]);

  useEffect(() => {
    if (!user) return;
    const load = async () => {
      const [clientesRes, productosRes, facturasRes, stockRes] = await Promise.all([
        supabase.from("clientes").select("id", { count: "exact", head: true }),
        supabase.from("productos").select("id", { count: "exact", head: true }),
        supabase.from("facturas").select("id, total, created_at, estado").eq("estado", "activa" as any),
        supabase.from("productos").select("id").lt("stock", 5),
      ]);

      const facturas = facturasRes.data || [];
      const now = new Date();
      const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1).toISOString();
      const startOfDay = new Date(now.getFullYear(), now.getMonth(), now.getDate()).toISOString();

      const ventasMes = facturas.filter(f => f.created_at >= startOfMonth).reduce((sum, f) => sum + Number(f.total), 0);
      const ventasHoy = facturas.filter(f => f.created_at >= startOfDay).reduce((sum, f) => sum + Number(f.total), 0);
      const facturasHoy = facturas.filter(f => f.created_at >= startOfDay).length;
      const ticketPromedio = facturas.length > 0 ? facturas.reduce((s, f) => s + Number(f.total), 0) / facturas.length : 0;

      setStats({
        clientes: clientesRes.count || 0,
        productos: productosRes.count || 0,
        facturas: facturas.length,
        ventasMes,
        ventasHoy,
        stockBajo: stockRes.data?.length || 0,
        facturasHoy,
        ticketPromedio,
      });

      // Trend (last 7 days)
      const dailyMap: Record<string, number> = {};
      for (let i = 6; i >= 0; i--) {
        const d = new Date(now.getTime() - i * 86400000);
        const key = d.toLocaleDateString("es-DO", { weekday: "short", day: "numeric" });
        dailyMap[key] = 0;
      }
      const startWeek = new Date(now.getTime() - 7 * 86400000).toISOString();
      facturas.filter(x => x.created_at >= startWeek).forEach(x => {
        const d = new Date(x.created_at);
        const key = d.toLocaleDateString("es-DO", { weekday: "short", day: "numeric" });
        if (key in dailyMap) dailyMap[key] += Number(x.total);
      });
      setTendencia(Object.entries(dailyMap).map(([dia, total]) => ({ dia, total })));

      // Monthly comparison (last 4 months)
      const monthlyMap: Record<string, number> = {};
      for (let i = 3; i >= 0; i--) {
        const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
        const key = d.toLocaleDateString("es-DO", { month: "long" });
        monthlyMap[key] = 0;
      }
      facturas.forEach(x => {
        const d = new Date(x.created_at);
        const key = d.toLocaleDateString("es-DO", { month: "long" });
        if (key in monthlyMap) monthlyMap[key] += Number(x.total);
      });
      setComparativa(Object.entries(monthlyMap).map(([mes, total]) => ({ mes, total })));
    };
    load();
  }, [user]);

  const fmt = (n: number) => `RD$ ${n.toLocaleString("es-DO", { minimumFractionDigits: 2 })}`;
  const chartConfig = { total: { label: "Total", color: "hsl(217, 71%, 45%)" } };

  const cards = [
    { title: "Ventas del Día", value: fmt(stats.ventasHoy), icon: DollarSign, color: "text-accent" },
    { title: "Ventas del Mes", value: fmt(stats.ventasMes), icon: TrendingUp, color: "text-primary" },
    { title: "Ticket Promedio", value: fmt(stats.ticketPromedio), icon: Receipt, color: "text-info" },
    { title: "Facturas Hoy", value: stats.facturasHoy, icon: FileText, color: "text-primary" },
    { title: "Total Clientes", value: stats.clientes, icon: Users, color: "text-info" },
    { title: "Productos", value: stats.productos, icon: Package, color: "text-muted-foreground" },
    { title: "Total Facturas", value: stats.facturas, icon: FileText, color: "text-muted-foreground" },
    { title: "Stock Bajo", value: stats.stockBajo, icon: AlertTriangle, color: "text-warning" },
  ];

  return (
    <div className="animate-fade-in space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-foreground">Dashboard</h1>
        <p className="text-muted-foreground">Resumen general de tu negocio</p>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
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

      <div className="grid gap-6 lg:grid-cols-2">
        <Card>
          <CardHeader><CardTitle className="text-base">Tendencia de Ventas (7 días)</CardTitle></CardHeader>
          <CardContent>
            <ChartContainer config={chartConfig} className="h-[220px] w-full">
              <LineChart data={tendencia}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="dia" fontSize={12} />
                <YAxis fontSize={12} tickFormatter={v => `${(v / 1000).toFixed(0)}k`} />
                <ChartTooltip content={<ChartTooltipContent formatter={(value) => fmt(Number(value))} />} />
                <Line type="monotone" dataKey="total" stroke="hsl(217, 71%, 45%)" strokeWidth={2} dot={{ r: 4 }} />
              </LineChart>
            </ChartContainer>
          </CardContent>
        </Card>

        <Card>
          <CardHeader><CardTitle className="text-base">Comparativa Mensual</CardTitle></CardHeader>
          <CardContent>
            <ChartContainer config={chartConfig} className="h-[220px] w-full">
              <BarChart data={comparativa}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="mes" fontSize={12} />
                <YAxis fontSize={12} tickFormatter={v => `${(v / 1000).toFixed(0)}k`} />
                <ChartTooltip content={<ChartTooltipContent formatter={(value) => fmt(Number(value))} />} />
                <Bar dataKey="total" fill="hsl(162, 63%, 41%)" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ChartContainer>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
