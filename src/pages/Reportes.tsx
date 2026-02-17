import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ChartContainer, ChartTooltip, ChartTooltipContent } from "@/components/ui/chart";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, LineChart, Line, PieChart, Pie, Cell, ResponsiveContainer } from "recharts";
import { TrendingUp, BarChart3, Download } from "lucide-react";
import { Button } from "@/components/ui/button";
import { exportToExcel } from "@/lib/exportUtils";
import { toast } from "sonner";

const COLORS = ["hsl(217, 71%, 45%)", "hsl(162, 63%, 41%)", "hsl(38, 92%, 50%)", "hsl(0, 72%, 51%)", "hsl(270, 50%, 50%)"];

export default function Reportes() {
  const { user } = useAuth();
  const [ventasHoy, setVentasHoy] = useState(0);
  const [ventasSemana, setVentasSemana] = useState(0);
  const [ventasMes, setVentasMes] = useState(0);
  const [topProductos, setTopProductos] = useState<{ nombre: string; total: number }[]>([]);
  const [ventasDiarias, setVentasDiarias] = useState<{ dia: string; total: number }[]>([]);
  const [ventasMensuales, setVentasMensuales] = useState<{ mes: string; total: number }[]>([]);
  const [metodosPago, setMetodosPago] = useState<{ name: string; value: number }[]>([]);

  useEffect(() => {
    if (!user) return;
    const load = async () => {
      const { data: facturas } = await supabase
        .from("facturas")
        .select("total, created_at, estado, metodo_pago")
        .eq("estado", "activa" as any);

      const now = new Date();
      const startDay = new Date(now.getFullYear(), now.getMonth(), now.getDate()).toISOString();
      const startWeek = new Date(now.getTime() - 7 * 86400000).toISOString();
      const startMonth = new Date(now.getFullYear(), now.getMonth(), 1).toISOString();

      const f = facturas || [];
      setVentasHoy(f.filter(x => x.created_at >= startDay).reduce((s, x) => s + Number(x.total), 0));
      setVentasSemana(f.filter(x => x.created_at >= startWeek).reduce((s, x) => s + Number(x.total), 0));
      setVentasMes(f.filter(x => x.created_at >= startMonth).reduce((s, x) => s + Number(x.total), 0));

      // Daily sales (last 7 days)
      const dailyMap: Record<string, number> = {};
      for (let i = 6; i >= 0; i--) {
        const d = new Date(now.getTime() - i * 86400000);
        const key = d.toLocaleDateString("es-DO", { weekday: "short", day: "numeric" });
        dailyMap[key] = 0;
      }
      f.filter(x => x.created_at >= startWeek).forEach(x => {
        const d = new Date(x.created_at);
        const key = d.toLocaleDateString("es-DO", { weekday: "short", day: "numeric" });
        if (key in dailyMap) dailyMap[key] += Number(x.total);
      });
      setVentasDiarias(Object.entries(dailyMap).map(([dia, total]) => ({ dia, total })));

      // Monthly sales (last 6 months)
      const monthlyMap: Record<string, number> = {};
      for (let i = 5; i >= 0; i--) {
        const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
        const key = d.toLocaleDateString("es-DO", { month: "short", year: "2-digit" });
        monthlyMap[key] = 0;
      }
      f.forEach(x => {
        const d = new Date(x.created_at);
        const key = d.toLocaleDateString("es-DO", { month: "short", year: "2-digit" });
        if (key in monthlyMap) monthlyMap[key] += Number(x.total);
      });
      setVentasMensuales(Object.entries(monthlyMap).map(([mes, total]) => ({ mes, total })));

      // Payment methods
      const pmMap: Record<string, number> = {};
      const pmLabels: Record<string, string> = { efectivo: "Efectivo", tarjeta: "Tarjeta", transferencia: "Transferencia" };
      f.forEach(x => {
        const label = pmLabels[x.metodo_pago] || x.metodo_pago;
        pmMap[label] = (pmMap[label] || 0) + Number(x.total);
      });
      setMetodosPago(Object.entries(pmMap).map(([name, value]) => ({ name, value })));

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

  const chartConfig = {
    total: { label: "Total", color: "hsl(217, 71%, 45%)" },
  };

  return (
    <div className="animate-fade-in space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Reportes</h1>
          <p className="text-muted-foreground">Resumen de ventas y métricas</p>
        </div>
        <Button variant="outline" onClick={() => { exportToExcel(ventasDiarias, "ventas-diarias"); toast.success("Exportado"); }}>
          <Download className="mr-2 h-4 w-4" />Exportar
        </Button>
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

      <div className="grid gap-6 lg:grid-cols-2">
        {/* Daily Sales Line Chart */}
        <Card>
          <CardHeader><CardTitle className="text-base">Ventas Diarias (Últimos 7 días)</CardTitle></CardHeader>
          <CardContent>
            <ChartContainer config={chartConfig} className="h-[250px] w-full">
              <LineChart data={ventasDiarias}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="dia" fontSize={12} />
                <YAxis fontSize={12} tickFormatter={v => `${(v / 1000).toFixed(0)}k`} />
                <ChartTooltip content={<ChartTooltipContent formatter={(value) => fmt(Number(value))} />} />
                <Line type="monotone" dataKey="total" stroke="hsl(217, 71%, 45%)" strokeWidth={2} dot={{ r: 4 }} />
              </LineChart>
            </ChartContainer>
          </CardContent>
        </Card>

        {/* Monthly Sales Bar Chart */}
        <Card>
          <CardHeader><CardTitle className="text-base">Ventas Mensuales (Últimos 6 meses)</CardTitle></CardHeader>
          <CardContent>
            <ChartContainer config={chartConfig} className="h-[250px] w-full">
              <BarChart data={ventasMensuales}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="mes" fontSize={12} />
                <YAxis fontSize={12} tickFormatter={v => `${(v / 1000).toFixed(0)}k`} />
                <ChartTooltip content={<ChartTooltipContent formatter={(value) => fmt(Number(value))} />} />
                <Bar dataKey="total" fill="hsl(162, 63%, 41%)" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ChartContainer>
          </CardContent>
        </Card>

        {/* Top Products Bar Chart */}
        <Card>
          <CardHeader><CardTitle className="text-base">Productos Más Vendidos</CardTitle></CardHeader>
          <CardContent>
            {topProductos.length === 0 ? (
              <p className="text-muted-foreground text-center py-4">No hay datos aún</p>
            ) : (
              <ChartContainer config={chartConfig} className="h-[250px] w-full">
                <BarChart data={topProductos} layout="vertical">
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis type="number" fontSize={12} />
                  <YAxis type="category" dataKey="nombre" fontSize={11} width={100} />
                  <ChartTooltip content={<ChartTooltipContent formatter={(value) => `${value} unidades`} />} />
                  <Bar dataKey="total" fill="hsl(217, 71%, 45%)" radius={[0, 4, 4, 0]} />
                </BarChart>
              </ChartContainer>
            )}
          </CardContent>
        </Card>

        {/* Payment Methods Pie Chart */}
        <Card>
          <CardHeader><CardTitle className="text-base">Métodos de Pago</CardTitle></CardHeader>
          <CardContent>
            {metodosPago.length === 0 ? (
              <p className="text-muted-foreground text-center py-4">No hay datos aún</p>
            ) : (
              <div className="h-[250px] w-full flex items-center justify-center">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie data={metodosPago} dataKey="value" nameKey="name" cx="50%" cy="50%" outerRadius={90} label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}>
                      {metodosPago.map((_, i) => (
                        <Cell key={i} fill={COLORS[i % COLORS.length]} />
                      ))}
                    </Pie>
                    <ChartTooltip formatter={(value) => fmt(Number(value))} />
                  </PieChart>
                </ResponsiveContainer>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
