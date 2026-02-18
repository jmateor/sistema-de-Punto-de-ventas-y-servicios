import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { usePermissions } from "@/hooks/usePermissions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Switch } from "@/components/ui/switch";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import { Save, Building2, Settings2, Hash, Loader2, Printer, Package, ShieldAlert, MonitorSmartphone } from "lucide-react";

interface Config {
  nombre_comercial: string;
  rnc: string;
  direccion: string;
  telefono: string;
  email: string;
  mensaje_factura: string;
  itbis_rate: number;
  moneda: string;
  impresion_automatica: boolean;
}

interface NcfSeq {
  id: string;
  tipo_comprobante: string;
  secuencia_actual: number;
  secuencia_limite: number;
  activo: boolean;
}

const DEFAULT_CONFIG: Config = {
  nombre_comercial: "", rnc: "", direccion: "", telefono: "", email: "",
  mensaje_factura: "Gracias por su compra", itbis_rate: 0.18, moneda: "RD$",
  impresion_automatica: false,
};

const COMPROBANTE_LABELS: Record<string, string> = {
  B01: "Consumidor Final",
  B02: "Crédito Fiscal",
  B14: "Régimen Especial",
  B15: "Gubernamental",
};

export default function Configuraciones() {
  const { user } = useAuth();
  const { isAdmin, loading: permLoading } = usePermissions();
  const [config, setConfig] = useState<Config>(DEFAULT_CONFIG);
  const [ncfSeqs, setNcfSeqs] = useState<NcfSeq[]>([]);
  const [saving, setSaving] = useState(false);
  const [loading, setLoading] = useState(true);

  // POS config state
  const [posConfig, setPosConfig] = useState({
    confirmacion_cobro: true,
    sonido_escaner: false,
    modo_rapido: false,
    pantalla_completa: false,
    bloqueo_precios: true,
    descuentos_activos: true,
    bloquear_sin_stock: false,
    stock_negativo: false,
  });

  // Print config state
  const [printConfig, setPrintConfig] = useState({
    formato: "80mm",
    copias: 1,
    logo_en_factura: true,
  });

  useEffect(() => {
    if (!user) return;
    loadData();
  }, [user]);

  const loadData = async () => {
    setLoading(true);
    const [configRes, ncfRes] = await Promise.all([
      supabase.from("configuracion_negocio").select("*").eq("user_id", user!.id).maybeSingle(),
      supabase.from("ncf_secuencias").select("*").order("tipo_comprobante"),
    ]);

    if (configRes.data) {
      const d = configRes.data as any;
      setConfig({
        nombre_comercial: d.nombre_comercial || "",
        rnc: d.rnc || "",
        direccion: d.direccion || "",
        telefono: d.telefono || "",
        email: d.email || "",
        mensaje_factura: d.mensaje_factura || "",
        itbis_rate: Number(d.itbis_rate) || 0.18,
        moneda: d.moneda || "RD$",
        impresion_automatica: d.impresion_automatica || false,
      });
    }

    setNcfSeqs((ncfRes.data as any) || []);
    setLoading(false);
  };

  const handleSaveConfig = async () => {
    setSaving(true);
    const { error } = await supabase.from("configuracion_negocio").upsert({
      user_id: user!.id,
      ...config,
    } as any, { onConflict: "user_id" });

    if (error) toast.error(error.message);
    else {
      toast.success("Configuración guardada");
      await supabase.from("audit_logs").insert({
        user_id: user!.id, accion: "actualizar_config", entidad: "configuracion_negocio", detalles: config,
      } as any);
    }
    setSaving(false);
  };

  const handleSaveNcf = async (seq: NcfSeq) => {
    const { error } = await supabase.from("ncf_secuencias")
      .update({ secuencia_limite: seq.secuencia_limite, activo: seq.activo } as any)
      .eq("id", seq.id);
    if (error) toast.error(error.message);
    else toast.success("Secuencia actualizada");
  };

  const initNcfSeq = async (tipo: string) => {
    const { error } = await supabase.from("ncf_secuencias").insert({
      user_id: user!.id,
      tipo_comprobante: tipo,
      secuencia_actual: 0,
      secuencia_limite: 999999,
      prefijo: tipo,
    } as any);
    if (error) toast.error(error.message);
    else { toast.success(`Secuencia ${tipo} creada`); loadData(); }
  };

  const updateField = (field: keyof Config, value: any) => setConfig(prev => ({ ...prev, [field]: value }));

  if (permLoading || loading) return <div className="flex items-center justify-center py-20"><Loader2 className="h-6 w-6 animate-spin text-muted-foreground" /></div>;

  if (!isAdmin) {
    return (
      <div className="flex flex-col items-center justify-center py-20 text-muted-foreground">
        <ShieldAlert className="h-12 w-12 mb-4 opacity-40" />
        <h2 className="text-lg font-semibold text-foreground">Acceso Restringido</h2>
        <p className="text-sm mt-1">Solo los administradores pueden modificar la configuración.</p>
      </div>
    );
  }

  return (
    <div className="animate-fade-in space-y-6 max-w-4xl">
      <div>
        <h1 className="text-2xl font-bold text-foreground">Configuraciones</h1>
        <p className="text-muted-foreground">Administra los datos del negocio, POS, impresión y parámetros fiscales</p>
      </div>

      <Tabs defaultValue="negocio">
        <TabsList className="grid grid-cols-5 w-full max-w-2xl">
          <TabsTrigger value="negocio"><Building2 className="h-4 w-4 mr-1.5 hidden sm:inline" />Negocio</TabsTrigger>
          <TabsTrigger value="pos"><MonitorSmartphone className="h-4 w-4 mr-1.5 hidden sm:inline" />POS</TabsTrigger>
          <TabsTrigger value="impresion"><Printer className="h-4 w-4 mr-1.5 hidden sm:inline" />Impresión</TabsTrigger>
          <TabsTrigger value="inventario"><Package className="h-4 w-4 mr-1.5 hidden sm:inline" />Inventario</TabsTrigger>
          <TabsTrigger value="fiscal"><Hash className="h-4 w-4 mr-1.5 hidden sm:inline" />Fiscal</TabsTrigger>
        </TabsList>

        {/* Negocio Tab */}
        <TabsContent value="negocio" className="mt-4">
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Datos del Negocio</CardTitle>
              <CardDescription>Información que aparecerá en las facturas y documentos</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid gap-4 md:grid-cols-2">
                <div className="space-y-2">
                  <Label>Nombre Comercial</Label>
                  <Input value={config.nombre_comercial} onChange={e => updateField("nombre_comercial", e.target.value)} placeholder="Mi Empresa SRL" />
                </div>
                <div className="space-y-2">
                  <Label>RNC</Label>
                  <Input value={config.rnc} onChange={e => updateField("rnc", e.target.value)} placeholder="000-00000-0" />
                </div>
                <div className="space-y-2">
                  <Label>Dirección</Label>
                  <Input value={config.direccion} onChange={e => updateField("direccion", e.target.value)} />
                </div>
                <div className="space-y-2">
                  <Label>Teléfono</Label>
                  <Input value={config.telefono} onChange={e => updateField("telefono", e.target.value)} />
                </div>
                <div className="space-y-2">
                  <Label>Email</Label>
                  <Input type="email" value={config.email} onChange={e => updateField("email", e.target.value)} />
                </div>
                <div className="space-y-2">
                  <Label>Moneda</Label>
                  <Input value={config.moneda} onChange={e => updateField("moneda", e.target.value)} />
                </div>
              </div>
              <div className="space-y-2">
                <Label>Mensaje personalizado en factura</Label>
                <Textarea
                  value={config.mensaje_factura}
                  onChange={e => updateField("mensaje_factura", e.target.value)}
                  placeholder="Garantías, políticas de devolución, horarios, redes sociales..."
                  rows={3}
                />
                <p className="text-xs text-muted-foreground">Este mensaje aparecerá al pie de cada factura impresa y PDF</p>
              </div>
              <div className="space-y-2">
                <Label>Tasa ITBIS (%)</Label>
                <Input
                  type="number" step="1" className="w-32"
                  value={(config.itbis_rate * 100).toFixed(0)}
                  onChange={e => updateField("itbis_rate", parseFloat(e.target.value) / 100 || 0.18)}
                />
              </div>
              <Button onClick={handleSaveConfig} disabled={saving}>
                {saving ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Save className="mr-2 h-4 w-4" />}
                Guardar Configuración
              </Button>
            </CardContent>
          </Card>
        </TabsContent>

        {/* POS Tab */}
        <TabsContent value="pos" className="mt-4">
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Configuración del Punto de Venta</CardTitle>
              <CardDescription>Opciones operativas para el módulo POS</CardDescription>
            </CardHeader>
            <CardContent className="space-y-3">
              {[
                { key: "confirmacion_cobro", label: "Confirmación antes de cobrar", desc: "Muestra un diálogo de confirmación antes de procesar el pago" },
                { key: "sonido_escaner", label: "Sonido al escanear", desc: "Emite un sonido al detectar un código de barras" },
                { key: "modo_rapido", label: "Modo rápido", desc: "Omite pasos intermedios para agilizar la venta" },
                { key: "pantalla_completa", label: "Pantalla completa automática", desc: "Abre el POS en pantalla completa al entrar" },
                { key: "bloqueo_precios", label: "Bloquear edición de precios (solo admin)", desc: "Los cajeros no podrán modificar precios en el POS" },
                { key: "descuentos_activos", label: "Permitir descuentos", desc: "Habilita el campo de descuento en el POS" },
              ].map(item => (
                <div key={item.key} className="flex items-center gap-3 p-3 rounded-lg border border-border">
                  <Switch
                    checked={(posConfig as any)[item.key]}
                    onCheckedChange={v => setPosConfig(prev => ({ ...prev, [item.key]: v }))}
                  />
                  <div>
                    <p className="text-sm font-medium">{item.label}</p>
                    <p className="text-xs text-muted-foreground">{item.desc}</p>
                  </div>
                </div>
              ))}
              <p className="text-xs text-muted-foreground pt-2">
                💡 Estas opciones se guardan localmente y se aplicarán al módulo POS.
              </p>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Impresion Tab */}
        <TabsContent value="impresion" className="mt-4">
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Configuración de Impresión</CardTitle>
              <CardDescription>Formato y opciones de impresión de facturas</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center gap-3 p-3 rounded-lg border border-border">
                <Switch
                  checked={config.impresion_automatica}
                  onCheckedChange={v => updateField("impresion_automatica", v)}
                />
                <div>
                  <p className="text-sm font-medium">Impresión automática al facturar</p>
                  <p className="text-xs text-muted-foreground">Abre la ventana de impresión automáticamente al crear factura</p>
                </div>
              </div>
              <div className="grid gap-4 md:grid-cols-2">
                <div className="space-y-2">
                  <Label>Formato de papel</Label>
                  <div className="flex gap-2">
                    {["58mm", "80mm", "Carta"].map(fmt => (
                      <Button
                        key={fmt}
                        variant={printConfig.formato === fmt ? "default" : "outline"}
                        size="sm"
                        onClick={() => setPrintConfig(prev => ({ ...prev, formato: fmt }))}
                      >
                        {fmt}
                      </Button>
                    ))}
                  </div>
                </div>
                <div className="space-y-2">
                  <Label>Copias automáticas</Label>
                  <Input
                    type="number" min={1} max={5} className="w-20"
                    value={printConfig.copias}
                    onChange={e => setPrintConfig(prev => ({ ...prev, copias: parseInt(e.target.value) || 1 }))}
                  />
                </div>
              </div>
              <div className="flex items-center gap-3 p-3 rounded-lg border border-border">
                <Switch
                  checked={printConfig.logo_en_factura}
                  onCheckedChange={v => setPrintConfig(prev => ({ ...prev, logo_en_factura: v }))}
                />
                <div>
                  <p className="text-sm font-medium">Incluir logo en factura</p>
                  <p className="text-xs text-muted-foreground">Muestra el logo del negocio en la cabecera</p>
                </div>
              </div>
              <Button onClick={handleSaveConfig} disabled={saving}>
                {saving ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Save className="mr-2 h-4 w-4" />}
                Guardar
              </Button>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Inventario Tab */}
        <TabsContent value="inventario" className="mt-4">
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Configuración de Inventario</CardTitle>
              <CardDescription>Control de stock y reglas de inventario</CardDescription>
            </CardHeader>
            <CardContent className="space-y-3">
              {[
                { key: "bloquear_sin_stock", label: "Bloquear venta sin stock", desc: "No permite facturar productos con stock en 0" },
                { key: "stock_negativo", label: "Permitir stock negativo", desc: "Permite que el stock baje a números negativos" },
              ].map(item => (
                <div key={item.key} className="flex items-center gap-3 p-3 rounded-lg border border-border">
                  <Switch
                    checked={(posConfig as any)[item.key]}
                    onCheckedChange={v => setPosConfig(prev => ({ ...prev, [item.key]: v }))}
                  />
                  <div>
                    <p className="text-sm font-medium">{item.label}</p>
                    <p className="text-xs text-muted-foreground">{item.desc}</p>
                  </div>
                </div>
              ))}
              <p className="text-xs text-muted-foreground pt-2">
                ℹ️ El stock mínimo se configura por producto en el módulo de Productos.
              </p>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Fiscal Tab */}
        <TabsContent value="fiscal" className="mt-4">
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Secuencias NCF (DGII)</CardTitle>
              <CardDescription>Control de numeración fiscal por tipo de comprobante</CardDescription>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Tipo</TableHead>
                    <TableHead>Descripción</TableHead>
                    <TableHead>Actual</TableHead>
                    <TableHead>Límite</TableHead>
                    <TableHead>Estado</TableHead>
                    <TableHead></TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {["B01", "B02", "B14", "B15"].map(tipo => {
                    const seq = ncfSeqs.find(s => s.tipo_comprobante === tipo);
                    return (
                      <TableRow key={tipo}>
                        <TableCell className="font-mono font-bold">{tipo}</TableCell>
                        <TableCell className="text-sm">{COMPROBANTE_LABELS[tipo]}</TableCell>
                        <TableCell>{seq ? seq.secuencia_actual : "—"}</TableCell>
                        <TableCell>
                          {seq ? (
                            <Input
                              type="number" className="w-28 h-8" value={seq.secuencia_limite}
                              onChange={e => setNcfSeqs(prev => prev.map(s => s.id === seq.id ? { ...s, secuencia_limite: parseInt(e.target.value) || 0 } : s))}
                            />
                          ) : "—"}
                        </TableCell>
                        <TableCell>
                          {seq ? (
                            <Badge variant={seq.activo ? "default" : "secondary"}>
                              {seq.activo ? "Activo" : "Inactivo"}
                            </Badge>
                          ) : (
                            <Badge variant="outline">Sin iniciar</Badge>
                          )}
                        </TableCell>
                        <TableCell>
                          {seq ? (
                            <Button size="sm" variant="outline" onClick={() => handleSaveNcf(seq)}>
                              <Save className="h-3 w-3 mr-1" /> Guardar
                            </Button>
                          ) : (
                            <Button size="sm" onClick={() => initNcfSeq(tipo)}>Iniciar</Button>
                          )}
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>

              {ncfSeqs.some(s => s.secuencia_actual > s.secuencia_limite * 0.9) && (
                <div className="mt-4 p-3 rounded-lg bg-destructive/10 border border-destructive/20 text-sm text-destructive">
                  ⚠️ Algunas secuencias NCF están cerca del límite. Solicite nuevos rangos a la DGII.
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
