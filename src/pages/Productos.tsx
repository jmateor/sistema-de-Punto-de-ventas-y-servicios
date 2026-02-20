import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "sonner";
import { Plus, Pencil, Trash2, Search, Package, AlertTriangle, ShieldCheck } from "lucide-react";

interface Producto {
  id: string;
  nombre: string;
  descripcion: string | null;
  precio: number;
  costo: number;
  stock: number;
  stock_minimo: number;
  itbis_aplicable: boolean;
  categoria_id: string | null;
  garantia_descripcion: string | null;
}

const emptyForm = {
  nombre: "",
  descripcion: "",
  precio: "0",
  costo: "0",
  stock: "0",
  stock_minimo: "5",
  itbis_aplicable: true,
  garantia_descripcion: "",
};

export default function Productos() {
  const { user } = useAuth();
  const [productos, setProductos] = useState<Producto[]>([]);
  const [search, setSearch] = useState("");
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<string | null>(null);
  const [form, setForm] = useState(emptyForm);

  const load = async () => {
    const { data } = await supabase.from("productos").select("*").order("nombre");
    setProductos((data as any) || []);
  };

  useEffect(() => { if (user) load(); }, [user]);

  const handleSave = async () => {
    if (!form.nombre.trim()) { toast.error("El nombre es obligatorio"); return; }
    const payload = {
      nombre: form.nombre,
      descripcion: form.descripcion || null,
      precio: parseFloat(form.precio) || 0,
      costo: parseFloat(form.costo) || 0,
      stock: parseInt(form.stock) || 0,
      stock_minimo: parseInt(form.stock_minimo) || 5,
      itbis_aplicable: form.itbis_aplicable,
      garantia_descripcion: form.garantia_descripcion?.trim() || null,
    };

    if (editing) {
      const { error } = await supabase.from("productos").update(payload as any).eq("id", editing);
      if (error) { toast.error(error.message); return; }
      toast.success("Producto actualizado");
    } else {
      const { error } = await supabase.from("productos").insert({ ...payload, user_id: user!.id } as any);
      if (error) { toast.error(error.message); return; }
      toast.success("Producto creado");
    }
    setOpen(false); setEditing(null); setForm(emptyForm); load();
  };

  const handleEdit = (p: Producto) => {
    setForm({
      nombre: p.nombre,
      descripcion: p.descripcion || "",
      precio: String(p.precio),
      costo: String(p.costo),
      stock: String(p.stock),
      stock_minimo: String(p.stock_minimo),
      itbis_aplicable: p.itbis_aplicable,
      garantia_descripcion: p.garantia_descripcion || "",
    });
    setEditing(p.id);
    setOpen(true);
  };

  const handleDelete = async (id: string) => {
    if (!confirm("¿Eliminar este producto?")) return;
    const { error } = await supabase.from("productos").delete().eq("id", id);
    if (error) { toast.error(error.message); return; }
    toast.success("Producto eliminado"); load();
  };

  const filtered = productos.filter(p => p.nombre.toLowerCase().includes(search.toLowerCase()));

  return (
    <div className="animate-fade-in space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Productos</h1>
          <p className="text-muted-foreground">{productos.length} productos registrados</p>
        </div>
        <Dialog open={open} onOpenChange={(o) => { setOpen(o); if (!o) { setEditing(null); setForm(emptyForm); } }}>
          <DialogTrigger asChild>
            <Button><Plus className="mr-2 h-4 w-4" />Nuevo Producto</Button>
          </DialogTrigger>
          <DialogContent className="max-w-lg">
            <DialogHeader>
              <DialogTitle>{editing ? "Editar Producto" : "Nuevo Producto"}</DialogTitle>
            </DialogHeader>
            <div className="space-y-4 max-h-[70vh] overflow-y-auto pr-1">
              <div className="space-y-2">
                <Label>Nombre *</Label>
                <Input value={form.nombre} onChange={e => setForm(f => ({ ...f, nombre: e.target.value }))} />
              </div>
              <div className="space-y-2">
                <Label>Descripción</Label>
                <Input value={form.descripcion} onChange={e => setForm(f => ({ ...f, descripcion: e.target.value }))} />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Precio (RD$)</Label>
                  <Input type="number" step="0.01" value={form.precio} onChange={e => setForm(f => ({ ...f, precio: e.target.value }))} />
                </div>
                <div className="space-y-2">
                  <Label>Costo (RD$)</Label>
                  <Input type="number" step="0.01" value={form.costo} onChange={e => setForm(f => ({ ...f, costo: e.target.value }))} />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Stock</Label>
                  <Input type="number" value={form.stock} onChange={e => setForm(f => ({ ...f, stock: e.target.value }))} />
                </div>
                <div className="space-y-2">
                  <Label>Stock Mínimo</Label>
                  <Input type="number" value={form.stock_minimo} onChange={e => setForm(f => ({ ...f, stock_minimo: e.target.value }))} />
                </div>
              </div>
              <div className="flex items-center gap-2">
                <Switch checked={form.itbis_aplicable} onCheckedChange={v => setForm(f => ({ ...f, itbis_aplicable: v }))} />
                <Label>Aplica ITBIS (18%)</Label>
              </div>

              {/* Garantía */}
              <div className="space-y-2 rounded-lg border border-border p-3 bg-muted/30">
                <div className="flex items-center gap-2 mb-1">
                  <ShieldCheck className="h-4 w-4 text-primary" />
                  <Label className="text-sm font-semibold">Garantía del producto</Label>
                </div>
                <Textarea
                  value={form.garantia_descripcion}
                  onChange={e => setForm(f => ({ ...f, garantia_descripcion: e.target.value }))}
                  placeholder="Ej: 12 meses de garantía contra defectos de fábrica. Incluye soporte técnico..."
                  rows={3}
                />
                <p className="text-xs text-muted-foreground">
                  Este texto aparecerá en la factura PDF junto al producto.
                </p>
              </div>

              <Button onClick={handleSave} className="w-full">{editing ? "Actualizar" : "Crear"} Producto</Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      <div className="relative max-w-sm">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input className="pl-9" placeholder="Buscar producto..." value={search} onChange={e => setSearch(e.target.value)} />
      </div>

      <Card>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Nombre</TableHead>
                <TableHead>Precio</TableHead>
                <TableHead>Stock</TableHead>
                <TableHead>ITBIS</TableHead>
                <TableHead>Garantía</TableHead>
                <TableHead className="w-24">Acciones</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filtered.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={6} className="text-center py-8 text-muted-foreground">
                    <Package className="h-8 w-8 mx-auto mb-2 opacity-50" />
                    No hay productos
                  </TableCell>
                </TableRow>
              ) : filtered.map(p => (
                <TableRow key={p.id}>
                  <TableCell className="font-medium">
                    <div className="flex items-center gap-2">
                      {p.nombre}
                      {p.stock <= p.stock_minimo && (
                        <AlertTriangle className="h-4 w-4 text-destructive" />
                      )}
                    </div>
                    {p.descripcion && <p className="text-xs text-muted-foreground">{p.descripcion}</p>}
                  </TableCell>
                  <TableCell>RD$ {Number(p.precio).toLocaleString("es-DO", { minimumFractionDigits: 2 })}</TableCell>
                  <TableCell>
                    <Badge variant={p.stock <= p.stock_minimo ? "destructive" : "secondary"}>
                      {p.stock}
                    </Badge>
                  </TableCell>
                  <TableCell>{p.itbis_aplicable ? "Sí" : "No"}</TableCell>
                  <TableCell>
                    {p.garantia_descripcion ? (
                      <div className="flex items-center gap-1">
                        <ShieldCheck className="h-3.5 w-3.5 text-primary" />
                        <span className="text-xs text-muted-foreground max-w-[120px] truncate">{p.garantia_descripcion}</span>
                      </div>
                    ) : (
                      <span className="text-xs text-muted-foreground">—</span>
                    )}
                  </TableCell>
                  <TableCell>
                    <div className="flex gap-1">
                      <Button variant="ghost" size="icon" onClick={() => handleEdit(p)}>
                        <Pencil className="h-4 w-4" />
                      </Button>
                      <Button variant="ghost" size="icon" onClick={() => handleDelete(p.id)}>
                        <Trash2 className="h-4 w-4 text-destructive" />
                      </Button>
                    </div>
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
