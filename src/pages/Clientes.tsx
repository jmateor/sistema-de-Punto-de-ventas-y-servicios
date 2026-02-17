import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { toast } from "sonner";
import { Plus, Pencil, Trash2, Search, Users } from "lucide-react";

interface Cliente {
  id: string;
  nombre: string;
  rnc_cedula: string | null;
  direccion: string | null;
  telefono: string | null;
  email: string | null;
}

const emptyCliente = { nombre: "", rnc_cedula: "", direccion: "", telefono: "", email: "" };

export default function Clientes() {
  const { user } = useAuth();
  const [clientes, setClientes] = useState<Cliente[]>([]);
  const [search, setSearch] = useState("");
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<string | null>(null);
  const [form, setForm] = useState(emptyCliente);

  const load = async () => {
    const { data } = await supabase.from("clientes").select("*").order("nombre");
    setClientes(data || []);
  };

  useEffect(() => { if (user) load(); }, [user]);

  const handleSave = async () => {
    if (!form.nombre.trim()) { toast.error("El nombre es obligatorio"); return; }
    
    if (editing) {
      const { error } = await supabase.from("clientes").update(form).eq("id", editing);
      if (error) { toast.error(error.message); return; }
      toast.success("Cliente actualizado");
    } else {
      const { error } = await supabase.from("clientes").insert({ ...form, user_id: user!.id });
      if (error) { toast.error(error.message); return; }
      toast.success("Cliente creado");
    }
    setOpen(false);
    setEditing(null);
    setForm(emptyCliente);
    load();
  };

  const handleEdit = (c: Cliente) => {
    setForm({ nombre: c.nombre, rnc_cedula: c.rnc_cedula || "", direccion: c.direccion || "", telefono: c.telefono || "", email: c.email || "" });
    setEditing(c.id);
    setOpen(true);
  };

  const handleDelete = async (id: string) => {
    if (!confirm("¿Eliminar este cliente?")) return;
    const { error } = await supabase.from("clientes").delete().eq("id", id);
    if (error) { toast.error(error.message); return; }
    toast.success("Cliente eliminado");
    load();
  };

  const filtered = clientes.filter(c =>
    c.nombre.toLowerCase().includes(search.toLowerCase()) ||
    (c.rnc_cedula || "").includes(search)
  );

  return (
    <div className="animate-fade-in space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Clientes</h1>
          <p className="text-muted-foreground">{clientes.length} clientes registrados</p>
        </div>
        <Dialog open={open} onOpenChange={(o) => { setOpen(o); if (!o) { setEditing(null); setForm(emptyCliente); } }}>
          <DialogTrigger asChild>
            <Button><Plus className="mr-2 h-4 w-4" />Nuevo Cliente</Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>{editing ? "Editar Cliente" : "Nuevo Cliente"}</DialogTitle>
            </DialogHeader>
            <div className="space-y-4">
              <div className="space-y-2">
                <Label>Nombre *</Label>
                <Input value={form.nombre} onChange={e => setForm(f => ({ ...f, nombre: e.target.value }))} />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>RNC / Cédula</Label>
                  <Input value={form.rnc_cedula} onChange={e => setForm(f => ({ ...f, rnc_cedula: e.target.value }))} />
                </div>
                <div className="space-y-2">
                  <Label>Teléfono</Label>
                  <Input value={form.telefono} onChange={e => setForm(f => ({ ...f, telefono: e.target.value }))} />
                </div>
              </div>
              <div className="space-y-2">
                <Label>Email</Label>
                <Input type="email" value={form.email} onChange={e => setForm(f => ({ ...f, email: e.target.value }))} />
              </div>
              <div className="space-y-2">
                <Label>Dirección</Label>
                <Input value={form.direccion} onChange={e => setForm(f => ({ ...f, direccion: e.target.value }))} />
              </div>
              <Button onClick={handleSave} className="w-full">{editing ? "Actualizar" : "Crear"} Cliente</Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      <div className="relative max-w-sm">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input className="pl-9" placeholder="Buscar por nombre o RNC..." value={search} onChange={e => setSearch(e.target.value)} />
      </div>

      <Card>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Nombre</TableHead>
                <TableHead>RNC/Cédula</TableHead>
                <TableHead>Teléfono</TableHead>
                <TableHead>Email</TableHead>
                <TableHead className="w-24">Acciones</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filtered.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={5} className="text-center py-8 text-muted-foreground">
                    <Users className="h-8 w-8 mx-auto mb-2 opacity-50" />
                    No hay clientes
                  </TableCell>
                </TableRow>
              ) : filtered.map(c => (
                <TableRow key={c.id}>
                  <TableCell className="font-medium">{c.nombre}</TableCell>
                  <TableCell>{c.rnc_cedula || "—"}</TableCell>
                  <TableCell>{c.telefono || "—"}</TableCell>
                  <TableCell>{c.email || "—"}</TableCell>
                  <TableCell>
                    <div className="flex gap-1">
                      <Button variant="ghost" size="icon" onClick={() => handleEdit(c)}>
                        <Pencil className="h-4 w-4" />
                      </Button>
                      <Button variant="ghost" size="icon" onClick={() => handleDelete(c.id)}>
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
