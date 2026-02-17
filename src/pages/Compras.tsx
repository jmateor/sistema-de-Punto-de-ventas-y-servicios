import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { toast } from "sonner";
import { Plus, Trash2, ShoppingCart, Loader2, Download } from "lucide-react";
import { exportToExcel } from "@/lib/exportUtils";

interface Proveedor { id: string; nombre: string; }
interface Producto { id: string; nombre: string; costo: number; }
interface LineaCompra { producto_id: string; nombre: string; cantidad: number; precio_unitario: number; subtotal: number; }
interface Compra { id: string; fecha: string; total: number; notas: string | null; proveedores: { nombre: string } | null; }

export default function Compras() {
  const { user } = useAuth();
  const [compras, setCompras] = useState<Compra[]>([]);
  const [proveedores, setProveedores] = useState<Proveedor[]>([]);
  const [productos, setProductos] = useState<Producto[]>([]);
  const [open, setOpen] = useState(false);
  const [proveedorId, setProveedorId] = useState("");
  const [notas, setNotas] = useState("");
  const [lineas, setLineas] = useState<LineaCompra[]>([]);
  const [saving, setSaving] = useState(false);

  const loadCompras = async () => {
    const { data } = await supabase
      .from("compras")
      .select("*, proveedores(nombre)")
      .order("created_at", { ascending: false });
    setCompras((data as any) || []);
  };

  useEffect(() => {
    if (!user) return;
    Promise.all([
      loadCompras(),
      supabase.from("proveedores").select("id, nombre").order("nombre").then(r => setProveedores(r.data || [])),
      supabase.from("productos").select("id, nombre, costo").order("nombre").then(r => setProductos(r.data || [])),
    ]);
  }, [user]);

  const addLinea = (productoId: string) => {
    const prod = productos.find(p => p.id === productoId);
    if (!prod) return;
    if (lineas.find(l => l.producto_id === productoId)) { toast.error("Producto ya agregado"); return; }
    setLineas([...lineas, {
      producto_id: productoId,
      nombre: prod.nombre,
      cantidad: 1,
      precio_unitario: Number(prod.costo),
      subtotal: Number(prod.costo),
    }]);
  };

  const updateLinea = (idx: number, field: "cantidad" | "precio_unitario", value: number) => {
    setLineas(lineas.map((l, i) => {
      if (i !== idx) return l;
      const updated = { ...l, [field]: value };
      updated.subtotal = updated.cantidad * updated.precio_unitario;
      return updated;
    }));
  };

  const removeLinea = (idx: number) => setLineas(lineas.filter((_, i) => i !== idx));
  const total = lineas.reduce((s, l) => s + l.subtotal, 0);

  const handleSave = async () => {
    if (!proveedorId) { toast.error("Selecciona un proveedor"); return; }
    if (lineas.length === 0) { toast.error("Agrega al menos un producto"); return; }

    setSaving(true);
    try {
      const { data: compra, error: compraError } = await supabase.from("compras").insert({
        proveedor_id: proveedorId,
        total,
        notas: notas || null,
        user_id: user!.id,
      }).select().single();
      if (compraError) throw compraError;

      const detalles = lineas.map(l => ({
        compra_id: compra.id,
        producto_id: l.producto_id,
        cantidad: l.cantidad,
        precio_unitario: l.precio_unitario,
        subtotal: l.subtotal,
      }));

      const { error: detError } = await supabase.from("detalle_compras").insert(detalles);
      if (detError) throw detError;

      // Update stock (increment)
      for (const l of lineas) {
        await supabase.from("productos").update({ stock: undefined as any }).eq("id", l.producto_id);
        // Use raw update to increment
        const { data: prod } = await supabase.from("productos").select("stock").eq("id", l.producto_id).single();
        if (prod) {
          await supabase.from("productos").update({ stock: prod.stock + l.cantidad }).eq("id", l.producto_id);
        }
      }

      toast.success("Compra registrada e inventario actualizado");
      setOpen(false);
      setProveedorId("");
      setNotas("");
      setLineas([]);
      loadCompras();
    } catch (err: any) {
      toast.error(err.message || "Error al registrar compra");
    }
    setSaving(false);
  };

  const handleExport = () => {
    exportToExcel(compras.map(c => ({
      Fecha: new Date(c.fecha).toLocaleDateString("es-DO"),
      Proveedor: c.proveedores?.nombre || "",
      Total: Number(c.total),
      Notas: c.notas || "",
    })), "compras");
    toast.success("Exportado");
  };

  const fmt = (n: number) => `RD$ ${n.toLocaleString("es-DO", { minimumFractionDigits: 2 })}`;

  return (
    <div className="animate-fade-in space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Compras</h1>
          <p className="text-muted-foreground">{compras.length} compras registradas</p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={handleExport}><Download className="mr-2 h-4 w-4" />Exportar</Button>
          <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger asChild>
              <Button><Plus className="mr-2 h-4 w-4" />Nueva Compra</Button>
            </DialogTrigger>
            <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
              <DialogHeader><DialogTitle>Registrar Compra</DialogTitle></DialogHeader>
              <div className="space-y-4">
                <div className="space-y-2">
                  <Label>Proveedor *</Label>
                  <Select value={proveedorId} onValueChange={setProveedorId}>
                    <SelectTrigger><SelectValue placeholder="Selecciona proveedor" /></SelectTrigger>
                    <SelectContent>
                      {proveedores.map(p => <SelectItem key={p.id} value={p.id}>{p.nombre}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label>Agregar Producto</Label>
                  <Select onValueChange={addLinea}>
                    <SelectTrigger><SelectValue placeholder="Seleccionar producto..." /></SelectTrigger>
                    <SelectContent>
                      {productos.map(p => (
                        <SelectItem key={p.id} value={p.id}>{p.nombre} — Costo: {fmt(Number(p.costo))}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                {lineas.length > 0 && (
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Producto</TableHead>
                        <TableHead className="w-24">Cant.</TableHead>
                        <TableHead className="w-32">Precio</TableHead>
                        <TableHead>Subtotal</TableHead>
                        <TableHead className="w-12"></TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {lineas.map((l, i) => (
                        <TableRow key={l.producto_id}>
                          <TableCell className="font-medium">{l.nombre}</TableCell>
                          <TableCell>
                            <Input type="number" min={1} value={l.cantidad} onChange={e => updateLinea(i, "cantidad", parseInt(e.target.value) || 1)} className="w-20" />
                          </TableCell>
                          <TableCell>
                            <Input type="number" step="0.01" value={l.precio_unitario} onChange={e => updateLinea(i, "precio_unitario", parseFloat(e.target.value) || 0)} className="w-28" />
                          </TableCell>
                          <TableCell>{fmt(l.subtotal)}</TableCell>
                          <TableCell>
                            <Button variant="ghost" size="icon" onClick={() => removeLinea(i)}><Trash2 className="h-4 w-4 text-destructive" /></Button>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                )}

                <div className="space-y-2">
                  <Label>Notas</Label>
                  <Textarea value={notas} onChange={e => setNotas(e.target.value)} rows={2} />
                </div>

                <div className="flex justify-between items-center pt-2 border-t">
                  <span className="text-lg font-bold">Total: {fmt(total)}</span>
                  <Button onClick={handleSave} disabled={saving}>
                    {saving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                    Registrar Compra
                  </Button>
                </div>
              </div>
            </DialogContent>
          </Dialog>
        </div>
      </div>

      <Card>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Fecha</TableHead>
                <TableHead>Proveedor</TableHead>
                <TableHead>Total</TableHead>
                <TableHead>Notas</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {compras.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={4} className="text-center py-8 text-muted-foreground">
                    <ShoppingCart className="h-8 w-8 mx-auto mb-2 opacity-50" />
                    No hay compras registradas
                  </TableCell>
                </TableRow>
              ) : compras.map(c => (
                <TableRow key={c.id}>
                  <TableCell>{new Date(c.fecha).toLocaleDateString("es-DO")}</TableCell>
                  <TableCell className="font-medium">{c.proveedores?.nombre || "—"}</TableCell>
                  <TableCell className="font-medium">{fmt(Number(c.total))}</TableCell>
                  <TableCell className="text-muted-foreground">{c.notas || "—"}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}
