import { ReportRow } from "@/hooks/useReportData";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";

interface Props {
  rows: ReportRow[];
  loading: boolean;
}

const fmt = (n: number) => `RD$ ${n.toLocaleString("es-DO", { minimumFractionDigits: 2 })}`;

const pmLabels: Record<string, string> = {
  efectivo: "Efectivo",
  tarjeta: "Tarjeta",
  transferencia: "Transferencia",
};

export default function ReportTable({ rows, loading }: Props) {
  if (loading) {
    return <p className="text-center py-8 text-muted-foreground">Cargando datos...</p>;
  }

  if (rows.length === 0) {
    return <p className="text-center py-8 text-muted-foreground">No hay datos con los filtros seleccionados</p>;
  }

  return (
    <div className="rounded-md border overflow-auto max-h-[500px]">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Fecha</TableHead>
            <TableHead>Factura</TableHead>
            <TableHead>Cliente</TableHead>
            <TableHead>Producto/Servicio</TableHead>
            <TableHead>Tipo</TableHead>
            <TableHead className="text-right">Cant.</TableHead>
            <TableHead className="text-right">Precio</TableHead>
            <TableHead className="text-right">Subtotal</TableHead>
            <TableHead className="text-right">ITBIS</TableHead>
            <TableHead className="text-right">Total</TableHead>
            <TableHead>Pago</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {rows.map((r, i) => (
            <TableRow key={i}>
              <TableCell className="whitespace-nowrap text-xs">{r.fecha}</TableCell>
              <TableCell className="text-xs font-mono">{r.numero_factura}</TableCell>
              <TableCell className="text-xs">{r.cliente}</TableCell>
              <TableCell className="text-xs">{r.producto}</TableCell>
              <TableCell>
                <Badge variant={r.tipo === "Servicio" ? "secondary" : "outline"} className="text-xs">
                  {r.tipo}
                </Badge>
              </TableCell>
              <TableCell className="text-right text-xs">{r.cantidad}</TableCell>
              <TableCell className="text-right text-xs">{fmt(r.precio_unitario)}</TableCell>
              <TableCell className="text-right text-xs">{fmt(r.subtotal)}</TableCell>
              <TableCell className="text-right text-xs">{fmt(r.itbis)}</TableCell>
              <TableCell className="text-right text-xs font-semibold">{fmt(r.total)}</TableCell>
              <TableCell className="text-xs">{pmLabels[r.metodo_pago] || r.metodo_pago}</TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );
}
