import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import { Loader2 } from "lucide-react";

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onCreated: (cliente: { id: string; nombre: string; rnc_cedula: string | null }) => void;
}

export default function QuickClientModal({ open, onOpenChange, onCreated }: Props) {
  const { user } = useAuth();
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({ nombre: "", rnc_cedula: "", telefono: "", email: "", direccion: "" });

  const handleSave = async () => {
    if (!form.nombre.trim()) { toast.error("El nombre es obligatorio"); return; }
    setSaving(true);
    const { data, error } = await supabase
      .from("clientes")
      .insert({ ...form, user_id: user!.id })
      .select("id, nombre, rnc_cedula")
      .single();
    setSaving(false);
    if (error) { toast.error(error.message); return; }
    toast.success("Cliente creado");
    onCreated(data);
    setForm({ nombre: "", rnc_cedula: "", telefono: "", email: "", direccion: "" });
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader><DialogTitle>Crear Cliente Rápido</DialogTitle></DialogHeader>
        <div className="space-y-4">
          <div className="space-y-2">
            <Label>Nombre *</Label>
            <Input value={form.nombre} onChange={e => setForm(f => ({ ...f, nombre: e.target.value }))} autoFocus />
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
          <Button onClick={handleSave} className="w-full" disabled={saving}>
            {saving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            Crear y Seleccionar
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
