import { ReportFilters as Filters, ClienteOption, ProductoOption } from "@/hooks/useReportData";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { Download, Filter, RotateCcw } from "lucide-react";
import { exportToExcel } from "@/lib/exportUtils";
import { toast } from "sonner";

interface Props {
  filters: Filters;
  onChange: (f: Filters) => void;
  clientes: ClienteOption[];
  productos: ProductoOption[];
  exportData: () => Record<string, any>[];
}

export default function ReportFilters({ filters, onChange, clientes, productos, exportData }: Props) {
  const update = (partial: Partial<Filters>) => onChange({ ...filters, ...partial });

  const handleExport = () => {
    const data = exportData();
    if (data.length === 0) {
      toast.error("No hay datos para exportar");
      return;
    }
    exportToExcel(data, `reporte-${filters.fechaDesde}-a-${filters.fechaHasta}`);
    toast.success("Reporte exportado a Excel");
  };

  const resetFilters = () => {
    const now = new Date();
    const firstDay = new Date(now.getFullYear(), now.getMonth(), 1);
    onChange({
      fechaDesde: firstDay.toISOString().split("T")[0],
      fechaHasta: now.toISOString().split("T")[0],
      clienteId: "todos",
      productoId: "todos",
      tipo: "todos",
      metodoPago: "todos",
      agrupacion: "diario",
    });
  };

  // Filter productos by selected type
  const filteredProductos = filters.tipo === "todos"
    ? productos
    : productos.filter(p => p.tipo === filters.tipo);

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2">
        <Filter className="h-4 w-4 text-muted-foreground" />
        <h3 className="text-sm font-semibold text-foreground">Filtros del Reporte</h3>
      </div>

      <div className="grid gap-3 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4">
        {/* Date range */}
        <div className="space-y-1">
          <label className="text-xs text-muted-foreground">Desde</label>
          <Input type="date" value={filters.fechaDesde} onChange={e => update({ fechaDesde: e.target.value })} />
        </div>
        <div className="space-y-1">
          <label className="text-xs text-muted-foreground">Hasta</label>
          <Input type="date" value={filters.fechaHasta} onChange={e => update({ fechaHasta: e.target.value })} />
        </div>

        {/* Client */}
        <div className="space-y-1">
          <label className="text-xs text-muted-foreground">Cliente</label>
          <Select value={filters.clienteId} onValueChange={v => update({ clienteId: v })}>
            <SelectTrigger><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="todos">Todos los clientes</SelectItem>
              {clientes.map(c => <SelectItem key={c.id} value={c.id}>{c.nombre}</SelectItem>)}
            </SelectContent>
          </Select>
        </div>

        {/* Type */}
        <div className="space-y-1">
          <label className="text-xs text-muted-foreground">Tipo</label>
          <Select value={filters.tipo} onValueChange={v => update({ tipo: v, productoId: "todos" })}>
            <SelectTrigger><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="todos">Todos</SelectItem>
              <SelectItem value="producto">Productos</SelectItem>
              <SelectItem value="servicio">Servicios</SelectItem>
            </SelectContent>
          </Select>
        </div>

        {/* Product */}
        <div className="space-y-1">
          <label className="text-xs text-muted-foreground">Producto/Servicio</label>
          <Select value={filters.productoId} onValueChange={v => update({ productoId: v })}>
            <SelectTrigger><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="todos">Todos</SelectItem>
              {filteredProductos.map(p => <SelectItem key={p.id} value={p.id}>{p.nombre}</SelectItem>)}
            </SelectContent>
          </Select>
        </div>

        {/* Payment method */}
        <div className="space-y-1">
          <label className="text-xs text-muted-foreground">Método de Pago</label>
          <Select value={filters.metodoPago} onValueChange={v => update({ metodoPago: v })}>
            <SelectTrigger><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="todos">Todos</SelectItem>
              <SelectItem value="efectivo">Efectivo</SelectItem>
              <SelectItem value="tarjeta">Tarjeta</SelectItem>
              <SelectItem value="transferencia">Transferencia</SelectItem>
            </SelectContent>
          </Select>
        </div>

        {/* Grouping */}
        <div className="space-y-1">
          <label className="text-xs text-muted-foreground">Agrupar por</label>
          <Select value={filters.agrupacion} onValueChange={v => update({ agrupacion: v })}>
            <SelectTrigger><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="diario">Diario</SelectItem>
              <SelectItem value="mensual">Mensual</SelectItem>
              <SelectItem value="anual">Anual</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      <div className="flex gap-2 flex-wrap">
        <Button variant="outline" size="sm" onClick={resetFilters}>
          <RotateCcw className="mr-1 h-3.5 w-3.5" />Limpiar
        </Button>
        <Button size="sm" onClick={handleExport}>
          <Download className="mr-1 h-3.5 w-3.5" />Exportar a Excel
        </Button>
      </div>
    </div>
  );
}
