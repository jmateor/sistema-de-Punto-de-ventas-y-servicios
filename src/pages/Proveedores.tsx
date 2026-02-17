import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { toast } from "sonner";
import { Plus, Pencil, Trash2, Search, Truck } from "lucide-react";

interface Proveedor {
  id: string;
  nombre: string;
  rnc: string | null;
  direccion: string | null;
  telefono: string | null;
  email: string | null;
}

const emptyForm = { nombre: "", rnc: "", direccion: "", telefono: "", email: "" };

export default function Proveedores() {
  const { user } = useAuth();
  const [proveedores, setProveedores] = useState<Proveedor[]>([]);
  const [search, setSearch] = useState("");
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<string | null>(null);
  const [form, setForm] = useState(emptyForm);

  const load = async () => {
    const { data } = await supabase.from("proveedores").select("*").order("nombre");
    setProveedores(data || []);
  };

  useEffect(() => { if (user) load(); }, [user]);

  const handleSave = async () => {
    if (!form.nombre.trim()) { toast.error("El nombre es obligatorio"); return; }
    const payload = { nombre: form.nombre, rnc: form.rnc || null, direccion: form.direccion || null, telefono: form.telefono || null, email: form.email || null };

    if (editing) {
      const { error } = await supabase.from("proveedores").update(payload).eq("id", editing);
      if (error) { toast.error(error.message); return; }
      toast.success("Proveedor actualizado");
    } else {
      const { error } = await supabase.from("proveedores").insert({ ...payload, user_id: user!.id });
      if (error) { toast.error(error.message); return; }
      toast.success("Proveedor creado");
    }
    setOpen(false); setEditing(null); setForm(emptyForm); load();
  };

  const handleEdit = (p: Proveedor) => {
    setForm({ nombre: p.nombre, rnc: p.rnc || "", direccion: p.direccion || "", telefono: p.telefono || "", email: p.email || "" });
    setEditing(p.id);
    setOpen(true);
  };

  const handleDelete = async (id: string) => {
    if (!confirm("¿Eliminar este proveedor?")) return;
    const { error } = await supabase.from("proveedores").delete().eq("id", id);
    if (error) { toast.error(error.message); return; }
    toast.success("Proveedor eliminado"); load();
  };

  const filtered = proveedores.filter(p => p.nombre.toLowerCase().includes(search.toLowerCase()));

  return (
    <div className="animate-fade-in space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Proveedores</h1>
          <p className="text-muted-foreground">{proveedores.length} proveedores registrados</p>
        </div>
        <Dialog open={open} onOpenChange={(o) => { setOpen(o); if (!o) { setEditing(null); setForm(emptyForm); } }}>
          <DialogTrigger asChild>
            <Button><Plus className="mr-2 h-4 w-4" />Nuevo Proveedor</Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>{editing ? "Editar Proveedor" : "Nuevo Proveedor"}</DialogTitle>
            </DialogHeader>
            <div className="space-y-4">
              <div className="space-y-2"><Label>Nombre *</Label><Input value={form.nombre} onChange={e => setForm(f => ({ ...f, nombre: e.target.value }))} /></div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2"><Label>RNC</Label><Input value={form.rnc} onChange={e => setForm(f => ({ ...f, rnc: e.target.value }))} /></div>
                <div className="space-y-2"><Label>Teléfono</Label><Input value={form.telefono} onChange={e => setForm(f => ({ ...f, telefono: e.target.value }))} /></div>
              </div>
              <div className="space-y-2"><Label>Email</Label><Input type="email" value={form.email} onChange={e => setForm(f => ({ ...f, email: e.target.value }))} /></div>
              <div className="space-y-2"><Label>Dirección</Label><Input value={form.direccion} onChange={e => setForm(f => ({ ...f, direccion: e.target.value }))} /></div>
              <Button onClick={handleSave} className="w-full">{editing ? "Actualizar" : "Crear"} Proveedor</Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      <div className="relative max-w-sm">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input className="pl-9" placeholder="Buscar proveedor..." value={search} onChange={e => setSearch(e.target.value)} />
      </div>

      <Card>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Nombre</TableHead>
                <TableHead>RNC</TableHead>
                <TableHead>Teléfono</TableHead>
                <TableHead>Email</TableHead>
                <TableHead className="w-24">Acciones</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filtered.length === 0 ? (
                <TableRow><TableCell colSpan={5} className="text-center py-8 text-muted-foreground"><Truck className="h-8 w-8 mx-auto mb-2 opacity-50" />No hay proveedores</TableCell></TableRow>
              ) : filtered.map(p => (
                <TableRow key={p.id}>
                  <TableCell className="font-medium">{p.nombre}</TableCell>
                  <TableCell>{p.rnc || "—"}</TableCell>
                  <TableCell>{p.telefono || "—"}</TableCell>
                  <TableCell>{p.email || "—"}</TableCell>
                  <TableCell>
                    <div className="flex gap-1">
                      <Button variant="ghost" size="icon" onClick={() => handleEdit(p)}><Pencil className="h-4 w-4" /></Button>
                      <Button variant="ghost" size="icon" onClick={() => handleDelete(p.id)}><Trash2 className="h-4 w-4 text-destructive" /></Button>
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
