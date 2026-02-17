import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { Card, CardContent } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { toast } from "sonner";
import { Search, FileText, Ban } from "lucide-react";
import { Link } from "react-router-dom";

interface Factura {
  id: string;
  numero: string;
  fecha: string;
  subtotal: number;
  itbis: number;
  descuento: number;
  total: number;
  metodo_pago: string;
  estado: string;
  clientes: { nombre: string } | null;
}

export default function Facturas() {
  const { user } = useAuth();
  const [facturas, setFacturas] = useState<Factura[]>([]);
  const [search, setSearch] = useState("");

  const load = async () => {
    const { data } = await supabase
      .from("facturas")
      .select("*, clientes(nombre)")
      .order("created_at", { ascending: false });
    setFacturas((data as any) || []);
  };

  useEffect(() => { if (user) load(); }, [user]);

  const handleAnular = async (id: string) => {
    if (!confirm("¿Anular esta factura?")) return;
    const { error } = await supabase.from("facturas").update({ estado: "anulada" as any }).eq("id", id);
    if (error) { toast.error(error.message); return; }
    toast.success("Factura anulada");
    load();
  };

  const filtered = facturas.filter(f =>
    f.numero.includes(search) ||
    (f.clientes?.nombre || "").toLowerCase().includes(search.toLowerCase())
  );

  const metodoPagoLabel: Record<string, string> = {
    efectivo: "Efectivo",
    tarjeta: "Tarjeta",
    transferencia: "Transferencia",
  };

  return (
    <div className="animate-fade-in space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Facturas</h1>
          <p className="text-muted-foreground">{facturas.length} facturas registradas</p>
        </div>
        <Link to="/facturas/nueva">
          <Button><FileText className="mr-2 h-4 w-4" />Nueva Factura</Button>
        </Link>
      </div>

      <div className="relative max-w-sm">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input className="pl-9" placeholder="Buscar por número o cliente..." value={search} onChange={e => setSearch(e.target.value)} />
      </div>

      <Card>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Número</TableHead>
                <TableHead>Cliente</TableHead>
                <TableHead>Fecha</TableHead>
                <TableHead>Total</TableHead>
                <TableHead>Pago</TableHead>
                <TableHead>Estado</TableHead>
                <TableHead className="w-20">Acciones</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filtered.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={7} className="text-center py-8 text-muted-foreground">
                    <FileText className="h-8 w-8 mx-auto mb-2 opacity-50" />
                    No hay facturas
                  </TableCell>
                </TableRow>
              ) : filtered.map(f => (
                <TableRow key={f.id}>
                  <TableCell className="font-mono font-medium">{f.numero}</TableCell>
                  <TableCell>{f.clientes?.nombre || "—"}</TableCell>
                  <TableCell>{new Date(f.fecha).toLocaleDateString("es-DO")}</TableCell>
                  <TableCell className="font-medium">RD$ {Number(f.total).toLocaleString("es-DO", { minimumFractionDigits: 2 })}</TableCell>
                  <TableCell>{metodoPagoLabel[f.metodo_pago] || f.metodo_pago}</TableCell>
                  <TableCell>
                    <Badge variant={f.estado === "activa" ? "default" : "destructive"}>
                      {f.estado === "activa" ? "Activa" : "Anulada"}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    {f.estado === "activa" && (
                      <Button variant="ghost" size="icon" onClick={() => handleAnular(f.id)} title="Anular">
                        <Ban className="h-4 w-4 text-destructive" />
                      </Button>
                    )}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}
