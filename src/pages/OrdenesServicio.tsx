import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Separator } from "@/components/ui/separator";
import { toast } from "sonner";
import { Plus, Search, ClipboardList, AlertTriangle, Send, Eye, Pencil, Printer } from "lucide-react";
import { format, differenceInBusinessDays } from "date-fns";
import { es } from "date-fns/locale";
import { useNavigate } from "react-router-dom";

interface Cliente {
  id: string;
  nombre: string;
  telefono: string | null;
  email: string | null;
}

interface Orden {
  id: string;
  cliente_id: string;
  equipo_descripcion: string;
  marca: string;
  modelo: string;
  serial: string;
  problema_reportado: string;
  diagnostico: string;
  costo_estimado: number;
  estado: string;
  fecha_entrada: string;
  fecha_notificacion: string | null;
  fecha_entrega: string | null;
  factura_id: string | null;
  notas: string;
  created_at: string;
  clientes?: Cliente;
}

const ESTADOS = [
  { value: "recibido", label: "Recibido", color: "bg-blue-100 text-blue-800" },
  { value: "en_revision", label: "En Revisión", color: "bg-yellow-100 text-yellow-800" },
  { value: "diagnosticado", label: "Diagnosticado", color: "bg-purple-100 text-purple-800" },
  { value: "aprobado", label: "Aprobado por Cliente", color: "bg-emerald-100 text-emerald-800" },
  { value: "en_reparacion", label: "En Reparación", color: "bg-orange-100 text-orange-800" },
  { value: "listo", label: "Listo para Entrega", color: "bg-green-100 text-green-800" },
  { value: "entregado", label: "Entregado", color: "bg-gray-100 text-gray-800" },
  { value: "perdido", label: "Reportado Perdido", color: "bg-red-100 text-red-800" },
];

const POLITICA_DIAS = 60;

function getEstadoBadge(estado: string) {
  const e = ESTADOS.find((s) => s.value === estado);
  return <Badge className={`${e?.color ?? "bg-muted text-muted-foreground"} border-0`}>{e?.label ?? estado}</Badge>;
}

function getDiasTranscurridos(fechaEntrada: string) {
  return differenceInBusinessDays(new Date(), new Date(fechaEntrada));
}

export default function OrdenesServicio() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [ordenes, setOrdenes] = useState<Orden[]>([]);
  const [clientes, setClientes] = useState<Cliente[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [filtroEstado, setFiltroEstado] = useState("todos");
  const [modalOpen, setModalOpen] = useState(false);
  const [detailOpen, setDetailOpen] = useState(false);
  const [selectedOrden, setSelectedOrden] = useState<Orden | null>(null);
  const [editMode, setEditMode] = useState(false);

  // Form state
  const [form, setForm] = useState({
    cliente_id: "",
    equipo_descripcion: "",
    marca: "",
    modelo: "",
    serial: "",
    problema_reportado: "",
    diagnostico: "",
    costo_estimado: 0,
    notas: "",
  });

  const fetchData = async () => {
    if (!user) return;
    setLoading(true);
    const [{ data: ords }, { data: clis }] = await Promise.all([
      supabase
        .from("ordenes_servicio")
        .select("*, clientes(id, nombre, telefono, email)")
        .eq("user_id", user.id)
        .order("created_at", { ascending: false }),
      supabase.from("clientes").select("id, nombre, telefono, email").eq("user_id", user.id).order("nombre"),
    ]);
    setOrdenes((ords as any[]) ?? []);
    setClientes((clis as any[]) ?? []);
    setLoading(false);
  };

  useEffect(() => {
    fetchData();
  }, [user]);

  const resetForm = () =>
    setForm({ cliente_id: "", equipo_descripcion: "", marca: "", modelo: "", serial: "", problema_reportado: "", diagnostico: "", costo_estimado: 0, notas: "" });

  const handleCreate = async () => {
    if (!user || !form.cliente_id || !form.equipo_descripcion || !form.problema_reportado) {
      toast.error("Complete los campos requeridos: cliente, equipo y problema");
      return;
    }
    const { error } = await supabase.from("ordenes_servicio").insert({
      user_id: user.id,
      cliente_id: form.cliente_id,
      equipo_descripcion: form.equipo_descripcion,
      marca: form.marca,
      modelo: form.modelo,
      serial: form.serial,
      problema_reportado: form.problema_reportado,
      diagnostico: form.diagnostico,
      costo_estimado: form.costo_estimado,
      notas: form.notas,
    });
    if (error) {
      toast.error("Error al crear orden");
      return;
    }
    toast.success("Orden de servicio creada");
    setModalOpen(false);
    resetForm();
    fetchData();
  };

  const handleUpdateEstado = async (id: string, nuevoEstado: string) => {
    // Block delivery if no payment registered
    if (nuevoEstado === "entregado") {
      const orden = ordenes.find((o) => o.id === id);
      if (orden && !orden.factura_id) {
        toast.error("Esta orden de servicio no puede ser entregada porque no registra ningún pago de reparación.");
        return;
      }
    }

    const updates: any = { estado: nuevoEstado };
    if (nuevoEstado === "entregado") updates.fecha_entrega = new Date().toISOString();
    if (nuevoEstado === "diagnosticado" || nuevoEstado === "listo") updates.fecha_notificacion = new Date().toISOString();

    const { error } = await supabase.from("ordenes_servicio").update(updates).eq("id", id);
    if (error) {
      toast.error("Error al actualizar estado");
      return;
    }
    toast.success(`Estado actualizado a: ${ESTADOS.find((e) => e.value === nuevoEstado)?.label}`);
    fetchData();
    if (selectedOrden?.id === id) setSelectedOrden((prev) => (prev ? { ...prev, ...updates } : prev));
  };

  const handleUpdateDiagnostico = async () => {
    if (!selectedOrden) return;
    const { error } = await supabase
      .from("ordenes_servicio")
      .update({ diagnostico: form.diagnostico, costo_estimado: form.costo_estimado, notas: form.notas })
      .eq("id", selectedOrden.id);
    if (error) {
      toast.error("Error al guardar");
      return;
    }
    toast.success("Diagnóstico actualizado");
    setEditMode(false);
    fetchData();
  };

  const handleEnviarFacturar = (orden: Orden) => {
    // Validate that the order has charges
    if (!orden.costo_estimado || orden.costo_estimado <= 0) {
      toast.error("No se puede generar factura: la orden de servicio no tiene cargos registrados.");
      return;
    }

    // Build service description with diagnostic info
    const descripcion = [
      `Reparación: ${orden.equipo_descripcion}`,
      orden.marca ? `(${orden.marca}${orden.modelo ? ` ${orden.modelo}` : ""})` : "",
    ].filter(Boolean).join(" ");

    const notasOrden = [
      orden.diagnostico ? `Diagnóstico: ${orden.diagnostico}` : "",
      orden.notas ? `Notas: ${orden.notas}` : "",
    ].filter(Boolean).join(" | ");

    // Navigate to POS with pre-filled service info
    navigate("/pos", {
      state: {
        ordenServicioId: orden.id,
        clienteId: orden.cliente_id,
        servicioNombre: descripcion,
        servicioPrecio: orden.costo_estimado,
        servicioNotas: notasOrden,
      },
    });
  };

  const printRecibo = (orden: Orden) => {
    const clienteNombre = orden.clientes?.nombre ?? "N/A";
    const dias = getDiasTranscurridos(orden.fecha_entrada);
    const w = window.open("", "_blank", "width=400,height=700");
    if (!w) return;
    w.document.write(`<!DOCTYPE html><html><head><title>Recibo de Entrada</title>
      <style>
        body { font-family: monospace; font-size: 12px; padding: 10px; max-width: 300px; margin: 0 auto; }
        .center { text-align: center; }
        .bold { font-weight: bold; }
        .line { border-top: 1px dashed #000; margin: 8px 0; }
        .warning { font-size: 10px; margin-top: 10px; border: 1px solid #000; padding: 6px; }
        table { width: 100%; } td { padding: 2px 0; }
      </style></head><body>
      <div class="center bold" style="font-size:14px;">RECIBO DE ENTRADA</div>
      <div class="center">Orden de Servicio</div>
      <div class="line"></div>
      <table>
        <tr><td class="bold">Cliente:</td><td>${clienteNombre}</td></tr>
        <tr><td class="bold">Teléfono:</td><td>${orden.clientes?.telefono ?? "N/A"}</td></tr>
        <tr><td class="bold">Fecha:</td><td>${format(new Date(orden.fecha_entrada), "dd/MM/yyyy HH:mm")}</td></tr>
      </table>
      <div class="line"></div>
      <table>
        <tr><td class="bold">Equipo:</td><td>${orden.equipo_descripcion}</td></tr>
        <tr><td class="bold">Marca:</td><td>${orden.marca || "N/A"}</td></tr>
        <tr><td class="bold">Modelo:</td><td>${orden.modelo || "N/A"}</td></tr>
        <tr><td class="bold">Serial:</td><td>${orden.serial || "N/A"}</td></tr>
      </table>
      <div class="line"></div>
      <div class="bold">Problema reportado:</div>
      <div>${orden.problema_reportado}</div>
      <div class="warning">
        <div class="bold center">⚠️ POLÍTICA DE CUSTODIA</div>
        <div>Los artículos que permanezcan más de <b>${POLITICA_DIAS} días laborables</b> en el centro sin que el cliente sea notificado de su estado o sin que el cliente retire el equipo, serán reportados como <b>PERDIDOS</b>. El centro no se hace responsable después de este período.</div>
      </div>
      <div class="line"></div>
      <div class="center" style="font-size:10px;">Firma del cliente: ____________________</div>
      <div class="center" style="font-size:10px;margin-top:20px;">Firma del técnico: ____________________</div>
      </body></html>`);
    w.document.close();
    w.print();
  };

  const filtered = ordenes.filter((o) => {
    const matchSearch =
      o.equipo_descripcion.toLowerCase().includes(search.toLowerCase()) ||
      o.clientes?.nombre?.toLowerCase().includes(search.toLowerCase()) ||
      o.serial.toLowerCase().includes(search.toLowerCase()) ||
      o.marca.toLowerCase().includes(search.toLowerCase());
    const matchEstado = filtroEstado === "todos" || o.estado === filtroEstado;
    return matchSearch && matchEstado;
  });

  const ordenesEnRiesgo = ordenes.filter(
    (o) => !["entregado", "perdido"].includes(o.estado) && getDiasTranscurridos(o.fecha_entrada) >= POLITICA_DIAS
  );

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Órdenes de Servicio</h1>
          <p className="text-muted-foreground">Entrada de equipos para chequeo o reparación</p>
        </div>
        <Dialog open={modalOpen} onOpenChange={setModalOpen}>
          <DialogTrigger asChild>
            <Button onClick={resetForm}>
              <Plus className="mr-2 h-4 w-4" /> Nueva Entrada
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>Registrar Entrada de Equipo</DialogTitle>
            </DialogHeader>
            <div className="space-y-4">
              <div>
                <Label>Cliente *</Label>
                <Select value={form.cliente_id} onValueChange={(v) => setForm((f) => ({ ...f, cliente_id: v }))}>
                  <SelectTrigger><SelectValue placeholder="Seleccione cliente" /></SelectTrigger>
                  <SelectContent>
                    {clientes.map((c) => (
                      <SelectItem key={c.id} value={c.id}>{c.nombre}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label>Equipo / Descripción *</Label>
                <Input value={form.equipo_descripcion} onChange={(e) => setForm((f) => ({ ...f, equipo_descripcion: e.target.value }))} placeholder="Ej: Laptop Dell Inspiron 15" />
              </div>
              <div className="grid grid-cols-3 gap-3">
                <div>
                  <Label>Marca</Label>
                  <Input value={form.marca} onChange={(e) => setForm((f) => ({ ...f, marca: e.target.value }))} placeholder="Dell" />
                </div>
                <div>
                  <Label>Modelo</Label>
                  <Input value={form.modelo} onChange={(e) => setForm((f) => ({ ...f, modelo: e.target.value }))} placeholder="Inspiron 15" />
                </div>
                <div>
                  <Label>Serial</Label>
                  <Input value={form.serial} onChange={(e) => setForm((f) => ({ ...f, serial: e.target.value }))} placeholder="SN12345" />
                </div>
              </div>
              <div>
                <Label>Problema Reportado *</Label>
                <Textarea value={form.problema_reportado} onChange={(e) => setForm((f) => ({ ...f, problema_reportado: e.target.value }))} placeholder="Describe el problema del equipo..." rows={3} />
              </div>
              <div>
                <Label>Notas adicionales</Label>
                <Textarea value={form.notas} onChange={(e) => setForm((f) => ({ ...f, notas: e.target.value }))} placeholder="Accesorios entregados, condiciones físicas, etc." rows={2} />
              </div>
              <Separator />
              <div className="p-3 rounded-lg bg-destructive/10 border border-destructive/20 text-sm text-destructive">
                <AlertTriangle className="inline h-4 w-4 mr-1" />
                <strong>Política:</strong> Los equipos que permanezcan más de {POLITICA_DIAS} días laborables sin notificación al cliente serán reportados como perdidos.
              </div>
              <Button onClick={handleCreate} className="w-full">
                <ClipboardList className="mr-2 h-4 w-4" /> Registrar Entrada
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      {/* Alert for at-risk orders */}
      {ordenesEnRiesgo.length > 0 && (
        <Card className="border-destructive/50 bg-destructive/5">
          <CardContent className="py-3 px-4 flex items-center gap-3">
            <AlertTriangle className="h-5 w-5 text-destructive shrink-0" />
            <div>
              <p className="font-semibold text-destructive">
                {ordenesEnRiesgo.length} equipo(s) han superado los {POLITICA_DIAS} días laborables
              </p>
              <p className="text-sm text-muted-foreground">Deben ser notificados al cliente o reportados como perdidos.</p>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input className="pl-9" placeholder="Buscar por equipo, cliente, serial..." value={search} onChange={(e) => setSearch(e.target.value)} />
        </div>
        <Select value={filtroEstado} onValueChange={setFiltroEstado}>
          <SelectTrigger className="w-full sm:w-48"><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="todos">Todos los estados</SelectItem>
            {ESTADOS.map((e) => (
              <SelectItem key={e.value} value={e.value}>{e.label}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {/* Summary cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="pt-4 pb-3 text-center">
            <p className="text-2xl font-bold text-foreground">{ordenes.filter((o) => !["entregado", "perdido"].includes(o.estado)).length}</p>
            <p className="text-xs text-muted-foreground">En Proceso</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4 pb-3 text-center">
            <p className="text-2xl font-bold text-foreground">{ordenes.filter((o) => o.estado === "listo").length}</p>
            <p className="text-xs text-muted-foreground">Listos para Entrega</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4 pb-3 text-center">
            <p className="text-2xl font-bold text-destructive">{ordenesEnRiesgo.length}</p>
            <p className="text-xs text-muted-foreground">+{POLITICA_DIAS} Días</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4 pb-3 text-center">
            <p className="text-2xl font-bold text-foreground">{ordenes.filter((o) => o.estado === "entregado").length}</p>
            <p className="text-xs text-muted-foreground">Entregados</p>
          </CardContent>
        </Card>
      </div>

      {/* Table */}
      <Card>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Equipo</TableHead>
                <TableHead>Cliente</TableHead>
                <TableHead>Entrada</TableHead>
                <TableHead>Días</TableHead>
                <TableHead>Estado</TableHead>
                <TableHead className="text-right">Acciones</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {loading ? (
                <TableRow><TableCell colSpan={6} className="text-center py-8 text-muted-foreground">Cargando...</TableCell></TableRow>
              ) : filtered.length === 0 ? (
                <TableRow><TableCell colSpan={6} className="text-center py-8 text-muted-foreground">No hay órdenes</TableCell></TableRow>
              ) : (
                filtered.map((o) => {
                  const dias = getDiasTranscurridos(o.fecha_entrada);
                  const enRiesgo = dias >= POLITICA_DIAS && !["entregado", "perdido"].includes(o.estado);
                  return (
                    <TableRow key={o.id} className={enRiesgo ? "bg-destructive/5" : ""}>
                      <TableCell>
                        <div className="font-medium text-foreground">{o.equipo_descripcion}</div>
                        <div className="text-xs text-muted-foreground">{[o.marca, o.modelo].filter(Boolean).join(" - ") || "Sin marca/modelo"}</div>
                      </TableCell>
                      <TableCell className="text-foreground">{o.clientes?.nombre ?? "N/A"}</TableCell>
                      <TableCell className="text-foreground">{format(new Date(o.fecha_entrada), "dd/MM/yy")}</TableCell>
                      <TableCell>
                        <span className={`font-semibold ${enRiesgo ? "text-destructive" : "text-foreground"}`}>
                          {dias}d {enRiesgo && <AlertTriangle className="inline h-3 w-3" />}
                        </span>
                      </TableCell>
                      <TableCell>{getEstadoBadge(o.estado)}</TableCell>
                      <TableCell className="text-right">
                        <div className="flex justify-end gap-1">
                          <Button
                            size="sm"
                            variant="ghost"
                            onClick={() => {
                              setSelectedOrden(o);
                              setForm({ ...form, diagnostico: o.diagnostico, costo_estimado: o.costo_estimado, notas: o.notas });
                              setEditMode(false);
                              setDetailOpen(true);
                            }}
                          >
                            <Eye className="h-4 w-4" />
                          </Button>
                          <Button size="sm" variant="ghost" onClick={() => printRecibo(o)}>
                            <Printer className="h-4 w-4" />
                          </Button>
                          {o.estado === "aprobado" && !o.factura_id && (
                            <Button size="sm" variant="default" onClick={() => handleEnviarFacturar(o)}>
                              <Send className="h-4 w-4" />
                            </Button>
                          )}
                        </div>
                      </TableCell>
                    </TableRow>
                  );
                })
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {/* Detail modal */}
      <Dialog open={detailOpen} onOpenChange={setDetailOpen}>
        <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
          {selectedOrden && (
            <>
              <DialogHeader>
                <DialogTitle className="flex items-center gap-2">
                  {selectedOrden.equipo_descripcion}
                  {getEstadoBadge(selectedOrden.estado)}
                </DialogTitle>
              </DialogHeader>
              <div className="space-y-4">
                <div className="grid grid-cols-2 gap-3 text-sm">
                  <div>
                    <span className="text-muted-foreground">Cliente:</span>
                    <p className="font-medium text-foreground">{selectedOrden.clientes?.nombre}</p>
                  </div>
                  <div>
                    <span className="text-muted-foreground">Teléfono:</span>
                    <p className="font-medium text-foreground">{selectedOrden.clientes?.telefono ?? "N/A"}</p>
                  </div>
                  <div>
                    <span className="text-muted-foreground">Marca / Modelo:</span>
                    <p className="font-medium text-foreground">{selectedOrden.marca || "N/A"} / {selectedOrden.modelo || "N/A"}</p>
                  </div>
                  <div>
                    <span className="text-muted-foreground">Serial:</span>
                    <p className="font-medium text-foreground">{selectedOrden.serial || "N/A"}</p>
                  </div>
                  <div>
                    <span className="text-muted-foreground">Entrada:</span>
                    <p className="font-medium text-foreground">{format(new Date(selectedOrden.fecha_entrada), "dd/MM/yyyy HH:mm", { locale: es })}</p>
                  </div>
                  <div>
                    <span className="text-muted-foreground">Días laborables:</span>
                    <p className="font-bold text-foreground">{getDiasTranscurridos(selectedOrden.fecha_entrada)}</p>
                  </div>
                </div>

                <Separator />
                <div>
                  <span className="text-sm text-muted-foreground">Problema reportado:</span>
                  <p className="text-foreground">{selectedOrden.problema_reportado}</p>
                </div>

                {editMode ? (
                  <>
                    <div>
                      <Label>Diagnóstico</Label>
                      <Textarea value={form.diagnostico} onChange={(e) => setForm((f) => ({ ...f, diagnostico: e.target.value }))} rows={3} />
                    </div>
                    <div>
                      <Label>Costo Estimado</Label>
                      <Input type="number" value={form.costo_estimado} onChange={(e) => setForm((f) => ({ ...f, costo_estimado: parseFloat(e.target.value) || 0 }))} />
                    </div>
                    <div>
                      <Label>Notas</Label>
                      <Textarea value={form.notas} onChange={(e) => setForm((f) => ({ ...f, notas: e.target.value }))} rows={2} />
                    </div>
                    <Button onClick={handleUpdateDiagnostico} className="w-full">Guardar Diagnóstico</Button>
                  </>
                ) : (
                  <>
                    {selectedOrden.diagnostico && (
                      <div>
                        <span className="text-sm text-muted-foreground">Diagnóstico:</span>
                        <p className="text-foreground">{selectedOrden.diagnostico}</p>
                      </div>
                    )}
                    {selectedOrden.costo_estimado > 0 && (
                      <div>
                        <span className="text-sm text-muted-foreground">Costo estimado:</span>
                        <p className="text-lg font-bold text-foreground">RD$ {selectedOrden.costo_estimado.toLocaleString("es-DO", { minimumFractionDigits: 2 })}</p>
                      </div>
                    )}
                    {selectedOrden.notas && (
                      <div>
                        <span className="text-sm text-muted-foreground">Notas:</span>
                        <p className="text-foreground">{selectedOrden.notas}</p>
                      </div>
                    )}
                  </>
                )}

                <Separator />

                {/* Action buttons */}
                <div className="flex flex-wrap gap-2">
                  {!editMode && !["entregado", "perdido"].includes(selectedOrden.estado) && (
                    <Button variant="outline" size="sm" onClick={() => {
                      setForm((f) => ({ ...f, diagnostico: selectedOrden.diagnostico, costo_estimado: selectedOrden.costo_estimado, notas: selectedOrden.notas }));
                      setEditMode(true);
                    }}>
                      <Pencil className="mr-1 h-3 w-3" /> Editar Diagnóstico
                    </Button>
                  )}
                  <Button variant="outline" size="sm" onClick={() => printRecibo(selectedOrden)}>
                    <Printer className="mr-1 h-3 w-3" /> Imprimir Recibo
                  </Button>
                </div>

                {/* State transitions */}
                {!["entregado", "perdido"].includes(selectedOrden.estado) && (
                  <div className="space-y-2">
                    <Label>Cambiar Estado</Label>
                    <div className="flex flex-wrap gap-2">
                      {selectedOrden.estado === "recibido" && (
                        <Button size="sm" variant="secondary" onClick={() => handleUpdateEstado(selectedOrden.id, "en_revision")}>Iniciar Revisión</Button>
                      )}
                      {selectedOrden.estado === "en_revision" && (
                        <Button size="sm" variant="secondary" onClick={() => handleUpdateEstado(selectedOrden.id, "diagnosticado")}>Marcar Diagnosticado</Button>
                      )}
                      {selectedOrden.estado === "diagnosticado" && (
                        <Button size="sm" variant="secondary" onClick={() => handleUpdateEstado(selectedOrden.id, "aprobado")}>Cliente Aprobó</Button>
                      )}
                      {selectedOrden.estado === "aprobado" && (
                        <>
                          <Button size="sm" variant="secondary" onClick={() => handleUpdateEstado(selectedOrden.id, "en_reparacion")}>Iniciar Reparación</Button>
                          {!selectedOrden.factura_id && (
                            <Button size="sm" onClick={() => { setDetailOpen(false); handleEnviarFacturar(selectedOrden); }}>
                              <Send className="mr-1 h-3 w-3" /> Enviar a Facturar
                            </Button>
                          )}
                        </>
                      )}
                      {selectedOrden.estado === "en_reparacion" && (
                        <Button size="sm" variant="secondary" onClick={() => handleUpdateEstado(selectedOrden.id, "listo")}>Marcar Listo</Button>
                      )}
                      {selectedOrden.estado === "listo" && (
                        <Button
                          size="sm"
                          variant={selectedOrden.factura_id ? "secondary" : "outline"}
                          onClick={() => handleUpdateEstado(selectedOrden.id, "entregado")}
                          title={!selectedOrden.factura_id ? "Requiere pago registrado" : ""}
                        >
                          Marcar Entregado
                          {!selectedOrden.factura_id && <AlertTriangle className="ml-1 h-3 w-3 text-destructive" />}
                        </Button>
                      )}
                      {getDiasTranscurridos(selectedOrden.fecha_entrada) >= POLITICA_DIAS && (
                        <Button size="sm" variant="destructive" onClick={() => handleUpdateEstado(selectedOrden.id, "perdido")}>Reportar Perdido</Button>
                      )}
                    </div>
                  </div>
                )}
              </div>
            </>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
