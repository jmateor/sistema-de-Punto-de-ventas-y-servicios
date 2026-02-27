import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ChartContainer, ChartTooltip, ChartTooltipContent } from "@/components/ui/chart";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, ResponsiveContainer } from "recharts";
import { TrendingUp, BarChart3, Package, Wrench } from "lucide-react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useReportData } from "@/hooks/useReportData";
import ReportFilters from "@/components/reportes/ReportFilters";
import ReportTable from "@/components/reportes/ReportTable";

const fmt = (n: number) => `RD$ ${n.toLocaleString("es-DO", { minimumFractionDigits: 2 })}`;

export default function Reportes() {
  const {
    filters,
    setFilters,
    rows,
    summary,
    clientes,
    productos,
    loading,
    groupedData,
    exportData,
  } = useReportData();

  const chartConfig = {
    total: { label: "Total", color: "hsl(217, 71%, 45%)" },
  };

  const grouped = groupedData();

  return (
    <div className="animate-fade-in space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-foreground">Reportes</h1>
        <p className="text-muted-foreground">Análisis detallado de ventas con filtros avanzados</p>
      </div>

      {/* Filters */}
      <Card>
        <CardContent className="pt-6">
          <ReportFilters
            filters={filters}
            onChange={setFilters}
            clientes={clientes}
            productos={productos}
            exportData={exportData}
          />
        </CardContent>
      </Card>

      {/* Summary cards */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Card className="stat-card">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Total Ventas</CardTitle>
            <TrendingUp className="h-5 w-5 text-accent" />
          </CardHeader>
          <CardContent><div className="text-2xl font-bold">{fmt(summary.totalVentas)}</div></CardContent>
        </Card>
        <Card className="stat-card">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Facturas</CardTitle>
            <BarChart3 className="h-5 w-5 text-primary" />
          </CardHeader>
          <CardContent><div className="text-2xl font-bold">{summary.totalFacturas}</div></CardContent>
        </Card>
        <Card className="stat-card">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Productos Vendidos</CardTitle>
            <Package className="h-5 w-5 text-primary" />
          </CardHeader>
          <CardContent><div className="text-2xl font-bold">{summary.totalProductos}</div></CardContent>
        </Card>
        <Card className="stat-card">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Servicios</CardTitle>
            <Wrench className="h-5 w-5 text-muted-foreground" />
          </CardHeader>
          <CardContent><div className="text-2xl font-bold">{summary.totalServicios}</div></CardContent>
        </Card>
      </div>

      {/* Tabs: Chart / Table */}
      <Tabs defaultValue="tabla" className="space-y-4">
        <TabsList>
          <TabsTrigger value="tabla">Detalle</TabsTrigger>
          <TabsTrigger value="grafica">Gráfica</TabsTrigger>
        </TabsList>

        <TabsContent value="tabla">
          <Card>
            <CardHeader>
              <CardTitle className="text-base">
                Detalle de Ventas ({rows.length} registros)
              </CardTitle>
            </CardHeader>
            <CardContent>
              <ReportTable rows={rows} loading={loading} />
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="grafica">
          <Card>
            <CardHeader>
              <CardTitle className="text-base">
                Ventas por {filters.agrupacion === "diario" ? "Día" : filters.agrupacion === "mensual" ? "Mes" : "Año"}
              </CardTitle>
            </CardHeader>
            <CardContent>
              {grouped.length === 0 ? (
                <p className="text-muted-foreground text-center py-8">No hay datos para graficar</p>
              ) : (
                <ChartContainer config={chartConfig} className="h-[300px] w-full">
                  <BarChart data={grouped}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="periodo" fontSize={11} />
                    <YAxis fontSize={11} tickFormatter={v => `${(v / 1000).toFixed(0)}k`} />
                    <ChartTooltip content={<ChartTooltipContent formatter={(value) => fmt(Number(value))} />} />
                    <Bar dataKey="total" fill="hsl(217, 71%, 45%)" radius={[4, 4, 0, 0]} />
                  </BarChart>
                </ChartContainer>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
