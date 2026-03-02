import { useEffect, useState, useRef, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";
import { toast } from "sonner";
import {
  Search, Trash2, FileText, Loader2, UserPlus, Plus, Minus,
  ShoppingCart, CreditCard, Banknote, ArrowRightLeft, MessageCircle,
  Wrench, ShieldCheck
} from "lucide-react";
import { useNavigate, useLocation } from "react-router-dom";
import { generateInvoicePDF, type NegocioData } from "@/lib/generateInvoicePDF";
import QuickClientModal from "@/components/QuickClientModal";
import PaymentModal from "@/components/PaymentModal";

interface Cliente { id: string; nombre: string; rnc_cedula: string | null; telefono: string | null; email: string | null; direccion: string | null; }
interface Producto {
  id: string; nombre: string; precio: number; stock: number;
  itbis_aplicable: boolean; tipo: string;
  garantia_descripcion: string | null; condiciones_garantia: string | null;
}
interface LineaFactura {
  producto_id: string;
  nombre: string;
  cantidad: number;
  precio_unitario: number;
  itbis: number;
  subtotal: number;
  tipo: string;
  garantia: string | null;
  condiciones_garantia: string | null;
}

const ITBIS_RATE = 0.18;

const COMPROBANTE_TYPES = [
  { value: "B01", label: "B01 - Consumidor Final" },
  { value: "B02", label: "B02 - Crédito Fiscal" },
  { value: "B14", label: "B14 - Régimen Especial" },
  { value: "B15", label: "B15 - Gubernamental" },
];

export default function POS() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [clientes, setClientes] = useState<Cliente[]>([]);
  const [ordenServicioId, setOrdenServicioId] = useState<string | null>(null);
  const [productos, setProductos] = useState<Producto[]>([]);
  const [clienteId, setClienteId] = useState("");
  const [metodoPago, setMetodoPago] = useState("efectivo");
  const [tipoComprobante, setTipoComprobante] = useState("B01");
  const [descuento, setDescuento] = useState("0");
  const [notas, setNotas] = useState("");
  const [lineas, setLineas] = useState<LineaFactura[]>([]);
  const [saving, setSaving] = useState(false);
  const [quickClientOpen, setQuickClientOpen] = useState(false);
  const [productSearch, setProductSearch] = useState("");
  const [clientSearch, setClientSearch] = useState("");
  const [paymentModalOpen, setPaymentModalOpen] = useState(false);
  const searchRef = useRef<HTMLInputElement>(null);
  const [negocio, setNegocio] = useState<NegocioData | null>(null);
  const [formatoImpresion, setFormatoImpresion] = useState<"carta" | "80mm" | "58mm">("80mm");

  useEffect(() => {
    if (!user) return;
    Promise.all([
      supabase.from("clientes").select("id, nombre, rnc_cedula, telefono, email, direccion").order("nombre"),
      supabase.from("productos").select("id, nombre, precio, stock, itbis_aplicable, tipo, garantia_descripcion, condiciones_garantia").order("nombre"),
      supabase.from("configuracion_negocio")
        .select("nombre_comercial, razon_social, rnc, direccion, telefono, whatsapp, email, logo_url, mensaje_factura, formato_impresion")
        .eq("user_id", user.id)
        .maybeSingle(),
    ]).then(([c, p, neg]) => {
      setClientes(c.data || []);
      setProductos((p.data as any) || []);
      if (neg.data) {
        const d = neg.data as any;
        setNegocio({
          nombre_comercial: d.nombre_comercial,
          razon_social: d.razon_social,
          rnc: d.rnc,
          direccion: d.direccion,
          telefono: d.telefono,
          whatsapp: d.whatsapp,
          email: d.email,
          logo_url: d.logo_url,
          mensaje_factura: d.mensaje_factura,
        });
        if (d.formato_impresion) setFormatoImpresion(d.formato_impresion as any);
      }
    });
  }, [user]);

  // Auto-load service from Orden de Servicio navigation
  useEffect(() => {
    const state = location.state as any;
    if (!state?.ordenServicioId) return;

    setOrdenServicioId(state.ordenServicioId);
    setClienteId(state.clienteId || "");

    // Add service line item directly (not from productos table)
    const precio = Number(state.servicioPrecio) || 0;
    const itbis = precio * ITBIS_RATE;
    setLineas([{
      producto_id: `os-${state.ordenServicioId}`,
      nombre: state.servicioNombre || "Servicio de Reparación",
      cantidad: 1,
      precio_unitario: precio,
      itbis,
      subtotal: precio + itbis,
      tipo: "servicio",
      garantia: null,
      condiciones_garantia: null,
    }]);

    if (state.servicioNotas) {
      setNotas(state.servicioNotas);
    }

    // Clear location state to prevent re-loading on re-render
    window.history.replaceState({}, document.title);
  }, [location.state]);

  // Keyboard shortcut: focus search on F2
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key === "F2") { e.preventDefault(); searchRef.current?.focus(); }
      if (e.key === "F9") { e.preventDefault(); openPaymentModal(); }
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [lineas, clienteId]);

  const addLinea = useCallback((productoId: string) => {
    const prod = productos.find(p => p.id === productoId);
    if (!prod) return;

    // Block if product (not service) and no stock
    if (prod.tipo !== "servicio" && prod.stock <= 0) {
      toast.error(`Sin stock disponible para "${prod.nombre}"`);
      return;
    }

    setLineas(prev => {
      const existing = prev.find(l => l.producto_id === productoId);
      if (existing) {
        return prev.map(l => {
          if (l.producto_id !== productoId) return l;
          const newCant = l.cantidad + 1;
          const itbisUnit = prod.itbis_aplicable ? l.precio_unitario * ITBIS_RATE : 0;
          return { ...l, cantidad: newCant, itbis: itbisUnit * newCant, subtotal: (l.precio_unitario + itbisUnit) * newCant };
        });
      }
      const itbis = prod.itbis_aplicable ? Number(prod.precio) * ITBIS_RATE : 0;
      return [...prev, {
        producto_id: productoId, nombre: prod.nombre, cantidad: 1,
        precio_unitario: Number(prod.precio), itbis, subtotal: Number(prod.precio) + itbis,
        tipo: prod.tipo || "producto",
        garantia: prod.garantia_descripcion || null,
        condiciones_garantia: prod.condiciones_garantia || null,
      }];
    });
    setProductSearch("");
  }, [productos]);

  const updateCantidad = (idx: number, cant: number) => {
    if (cant < 1) return;
    setLineas(lineas.map((l, i) => {
      if (i !== idx) return l;
      const prod = productos.find(p => p.id === l.producto_id);
      const itbisUnit = prod?.itbis_aplicable ? l.precio_unitario * ITBIS_RATE : 0;
      return { ...l, cantidad: cant, itbis: itbisUnit * cant, subtotal: (l.precio_unitario + itbisUnit) * cant };
    }));
  };

  const removeLinea = (idx: number) => setLineas(lineas.filter((_, i) => i !== idx));

  const subtotal = lineas.reduce((s, l) => s + l.precio_unitario * l.cantidad, 0);
  const totalItbis = lineas.reduce((s, l) => s + l.itbis, 0);
  const desc = parseFloat(descuento) || 0;
  const total = subtotal + totalItbis - desc;

  const filteredProducts = productos.filter(p =>
    p.nombre.toLowerCase().includes(productSearch.toLowerCase()) ||
    p.id.toLowerCase().includes(productSearch.toLowerCase())
  );

  const filteredClients = clientes.filter(c =>
    c.nombre.toLowerCase().includes(clientSearch.toLowerCase()) ||
    (c.rnc_cedula || "").includes(clientSearch)
  );

  const openPaymentModal = () => {
    if (!clienteId) { toast.error("Selecciona un cliente"); return; }
    if (lineas.length === 0) { toast.error("Agrega al menos un producto"); return; }
    setPaymentModalOpen(true);
  };

  const handleSave = async () => {
    setPaymentModalOpen(false);
    setSaving(true);
    try {
      // Get NCF
      const { data: ncf, error: ncfError } = await supabase.rpc("next_ncf" as any, {
        p_user_id: user!.id,
        p_tipo: tipoComprobante,
      });

      const { data: seqData } = await supabase.rpc("nextval" as any, { seq_name: "factura_numero_seq" });
      const numero = `FAC-${String(seqData || Date.now()).padStart(6, "0")}`;

      const { data: factura, error: facError } = await supabase.from("facturas").insert({
        numero, cliente_id: clienteId, subtotal, itbis: totalItbis,
        descuento: desc, total, metodo_pago: metodoPago as any,
        notas: notas || null, user_id: user!.id,
        tipo_comprobante: tipoComprobante, ncf: ncf || "",
      } as any).select().single();

      if (facError) throw facError;

      // Only insert detail rows for real products (not virtual service lines from ordenes)
      const realLineas = lineas.filter(l => !l.producto_id.startsWith("os-"));
      if (realLineas.length > 0) {
        const detalles = realLineas.map(l => ({
          factura_id: factura.id, producto_id: l.producto_id,
          cantidad: l.cantidad, precio_unitario: l.precio_unitario,
          itbis: l.itbis, subtotal: l.subtotal,
        }));
        const { error: detError } = await supabase.from("detalle_facturas").insert(detalles);
        if (detError) throw detError;
      }

      // Only decrement stock for products, NOT services
      for (const l of lineas) {
        if (l.tipo !== "servicio" && !l.producto_id.startsWith("os-")) {
          await supabase.rpc("decrement_stock" as any, { p_id: l.producto_id, amount: l.cantidad });
        }
      }

      // Link factura to orden de servicio if applicable
      if (ordenServicioId) {
        await supabase.from("ordenes_servicio")
          .update({ factura_id: factura.id, estado: "listo" } as any)
          .eq("id", ordenServicioId);
      }

      const cliente = clientes.find(c => c.id === clienteId);
      generateInvoicePDF({
        numero, fecha: new Date().toISOString(),
        cliente: { nombre: cliente?.nombre || "", rnc_cedula: cliente?.rnc_cedula, direccion: cliente?.direccion, telefono: cliente?.telefono, email: cliente?.email },
        detalles: lineas.map(l => ({
          nombre: l.nombre, cantidad: l.cantidad, precio_unitario: l.precio_unitario,
          itbis: l.itbis, subtotal: l.subtotal,
          garantia: l.garantia, condiciones_garantia: l.condiciones_garantia,
        })),
        subtotal, itbis: totalItbis, descuento: desc, total,
        metodo_pago: metodoPago, notas,
        ncf: ncf || "", tipo_comprobante: tipoComprobante,
        negocio: negocio || undefined,
        formato: formatoImpresion,
      });

      toast.success(`Factura ${numero} creada · NCF: ${ncf || "N/A"}`);

      // Reset for next sale
      setLineas([]);
      setClienteId("");
      setOrdenServicioId(null);
      setDescuento("0");
      setNotas("");
      setProductSearch("");
      searchRef.current?.focus();
    } catch (err: any) {
      toast.error(err.message || "Error al crear factura");
    }
    setSaving(false);
  };

  const handleWhatsApp = () => {
    const cliente = clientes.find(c => c.id === clienteId);
    if (!cliente?.telefono) { toast.error("El cliente no tiene teléfono registrado"); return; }
    const phone = cliente.telefono.replace(/\D/g, "");
    const message = encodeURIComponent(`Hola ${cliente.nombre}, le enviamos su factura. Monto: RD$ ${total.toLocaleString("es-DO", { minimumFractionDigits: 2 })}. ¡Gracias por su compra!`);
    window.open(`https://wa.me/${phone}?text=${message}`, "_blank");
  };

  const handleClientCreated = (c: { id: string; nombre: string; rnc_cedula: string | null }) => {
    setClientes(prev => [...prev, { ...c, telefono: null, email: null, direccion: null }].sort((a, b) => a.nombre.localeCompare(b.nombre)));
    setClienteId(c.id);
  };

  const selectedClient = clientes.find(c => c.id === clienteId);
  const productCount = lineas.filter(l => l.tipo !== "servicio").length;
  const serviceCount = lineas.filter(l => l.tipo === "servicio").length;

  return (
    <div className="animate-fade-in flex flex-col h-[calc(100vh-3.5rem)] -m-6">
      {/* Top bar */}
      <div className="flex items-center justify-between px-4 py-2 bg-card border-b border-border shrink-0">
        <div className="flex items-center gap-3">
          <ShoppingCart className="h-5 w-5 text-primary" />
          <h1 className="text-lg font-bold text-foreground">Punto de Venta</h1>
          <Badge variant="outline" className="text-xs">F2: Buscar · F9: Cobrar</Badge>
        </div>
        <div className="flex items-center gap-2">
          <Select value={tipoComprobante} onValueChange={setTipoComprobante}>
            <SelectTrigger className="w-52 h-8 text-xs">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {COMPROBANTE_TYPES.map(t => (
                <SelectItem key={t.value} value={t.value}>{t.label}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      <div className="flex flex-1 overflow-hidden">
        {/* Left: Product catalog */}
        <div className="w-80 border-r border-border flex flex-col bg-card shrink-0">
          <div className="p-3 space-y-2">
            <div className="relative">
              <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                ref={searchRef}
                className="pl-8 h-9 text-sm"
                placeholder="Buscar producto o escanear..."
                value={productSearch}
                onChange={e => setProductSearch(e.target.value)}
                onKeyDown={e => {
                  if (e.key === "Enter" && filteredProducts.length === 1) {
                    addLinea(filteredProducts[0].id);
                  }
                }}
              />
            </div>
          </div>
          <ScrollArea className="flex-1">
            <div className="px-2 pb-2 space-y-1">
              {filteredProducts.map(p => (
                <button
                  key={p.id}
                  onClick={() => addLinea(p.id)}
                  className="w-full text-left p-2.5 rounded-lg hover:bg-accent/10 transition-colors border border-transparent hover:border-border group"
                >
                  <div className="flex justify-between items-start">
                    <span className="text-sm font-medium text-foreground group-hover:text-primary truncate pr-2">{p.nombre}</span>
                    <span className="text-sm font-bold text-primary shrink-0">
                      RD$ {Number(p.precio).toLocaleString("es-DO", { minimumFractionDigits: 2 })}
                    </span>
                  </div>
                  <div className="flex justify-between mt-1 items-center">
                    <div className="flex items-center gap-1.5">
                      {p.tipo === "servicio" ? (
                        <Badge variant="outline" className="text-[10px] h-4 gap-0.5"><Wrench className="h-2.5 w-2.5" />Servicio</Badge>
                      ) : (
                        <span className="text-xs text-muted-foreground">Stock: {p.stock}</span>
                      )}
                      {p.garantia_descripcion && (
                        <ShieldCheck className="h-3 w-3 text-primary" />
                      )}
                    </div>
                    {p.itbis_aplicable && <Badge variant="secondary" className="text-[10px] h-4">ITBIS</Badge>}
                  </div>
                </button>
              ))}
              {filteredProducts.length === 0 && (
                <p className="text-center text-sm text-muted-foreground py-8">No se encontraron productos</p>
              )}
            </div>
          </ScrollArea>
        </div>

        {/* Center: Cart */}
        <div className="flex-1 flex flex-col overflow-hidden">
          <ScrollArea className="flex-1">
            <div className="p-4 space-y-1">
              {lineas.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-20 text-muted-foreground">
                  <ShoppingCart className="h-12 w-12 mb-3 opacity-30" />
                  <p className="text-sm">Agrega productos para comenzar</p>
                  <p className="text-xs mt-1">Usa la búsqueda o haz clic en un producto</p>
                </div>
              ) : lineas.map((l, i) => (
                <div key={l.producto_id} className="flex items-center gap-3 p-3 rounded-lg bg-card border border-border hover:shadow-sm transition-shadow">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-1.5">
                      <p className="text-sm font-medium text-foreground truncate">{l.nombre}</p>
                      {l.tipo === "servicio" && (
                        <Badge variant="outline" className="text-[10px] h-4 shrink-0 gap-0.5"><Wrench className="h-2.5 w-2.5" />Servicio</Badge>
                      )}
                    </div>
                    <p className="text-xs text-muted-foreground">
                      RD$ {l.precio_unitario.toLocaleString("es-DO", { minimumFractionDigits: 2 })} c/u
                      {l.itbis > 0 && ` · ITBIS: RD$ ${l.itbis.toLocaleString("es-DO", { minimumFractionDigits: 2 })}`}
                    </p>
                    {l.garantia && (
                      <p className="text-[11px] text-primary mt-0.5 flex items-center gap-1">
                        <ShieldCheck className="h-3 w-3" /> {l.garantia}
                      </p>
                    )}
                  </div>
                  <div className="flex items-center gap-1">
                    <Button variant="outline" size="icon" className="h-7 w-7" onClick={() => updateCantidad(i, l.cantidad - 1)}>
                      <Minus className="h-3 w-3" />
                    </Button>
                    <Input
                      type="number" min={1} value={l.cantidad}
                      onChange={e => updateCantidad(i, parseInt(e.target.value) || 1)}
                      className="w-14 h-7 text-center text-sm"
                    />
                    <Button variant="outline" size="icon" className="h-7 w-7" onClick={() => updateCantidad(i, l.cantidad + 1)}>
                      <Plus className="h-3 w-3" />
                    </Button>
                  </div>
                  <span className="text-sm font-bold text-foreground w-28 text-right">
                    RD$ {l.subtotal.toLocaleString("es-DO", { minimumFractionDigits: 2 })}
                  </span>
                  <Button variant="ghost" size="icon" className="h-7 w-7 shrink-0" onClick={() => removeLinea(i)}>
                    <Trash2 className="h-3.5 w-3.5 text-destructive" />
                  </Button>
                </div>
              ))}
            </div>
          </ScrollArea>
        </div>

        {/* Right: Checkout panel */}
        <div className="w-80 border-l border-border flex flex-col bg-card shrink-0">
          <div className="p-3 space-y-3 flex-1 overflow-auto">
            {/* Client selector */}
            <div className="space-y-1.5">
              <label className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Cliente</label>
              <div className="relative">
                <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
                <Input
                  className="pl-8 h-8 text-sm"
                  placeholder="Buscar cliente..."
                  value={clientSearch}
                  onChange={e => { setClientSearch(e.target.value); if (clienteId) setClienteId(""); }}
                />
              </div>
              {clienteId && selectedClient ? (
                <div className="p-2 rounded-md bg-primary/5 border border-primary/20 text-xs">
                  <p className="font-medium text-foreground">{selectedClient.nombre}</p>
                  {selectedClient.rnc_cedula && <p className="text-muted-foreground">RNC: {selectedClient.rnc_cedula}</p>}
                </div>
              ) : clientSearch && (
                <ScrollArea className="max-h-32">
                  {filteredClients.slice(0, 5).map(c => (
                    <button
                      key={c.id}
                      onClick={() => { setClienteId(c.id); setClientSearch(""); }}
                      className="w-full text-left p-1.5 text-xs hover:bg-muted rounded transition-colors"
                    >
                      <span className="font-medium">{c.nombre}</span>
                      {c.rnc_cedula && <span className="text-muted-foreground ml-1">({c.rnc_cedula})</span>}
                    </button>
                  ))}
                </ScrollArea>
              )}
              <Button variant="ghost" size="sm" className="w-full h-7 text-xs" onClick={() => setQuickClientOpen(true)}>
                <UserPlus className="h-3 w-3 mr-1" /> Nuevo cliente
              </Button>
            </div>

            <Separator />

            {/* Payment method */}
            <div className="space-y-1.5">
              <label className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Método de pago</label>
              <div className="grid grid-cols-3 gap-1.5">
                {[
                  { value: "efectivo", icon: Banknote, label: "Efectivo" },
                  { value: "tarjeta", icon: CreditCard, label: "Tarjeta" },
                  { value: "transferencia", icon: ArrowRightLeft, label: "Transf." },
                ].map(m => (
                  <Button
                    key={m.value}
                    variant={metodoPago === m.value ? "default" : "outline"}
                    size="sm"
                    className="h-auto py-2 flex-col gap-1 text-[10px]"
                    onClick={() => setMetodoPago(m.value)}
                  >
                    <m.icon className="h-4 w-4" />
                    {m.label}
                  </Button>
                ))}
              </div>
            </div>

            <Separator />

            {/* Discount */}
            <div className="space-y-1.5">
              <label className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Descuento (RD$)</label>
              <Input type="number" step="0.01" value={descuento} onChange={e => setDescuento(e.target.value)} className="h-8 text-sm" />
            </div>
          </div>

          {/* Totals */}
          <div className="border-t border-border p-3 space-y-2 bg-muted/30">
            <div className="flex justify-between text-xs text-muted-foreground">
              <span>Subtotal</span>
              <span>RD$ {subtotal.toLocaleString("es-DO", { minimumFractionDigits: 2 })}</span>
            </div>
            <div className="flex justify-between text-xs text-muted-foreground">
              <span>ITBIS (18%)</span>
              <span>RD$ {totalItbis.toLocaleString("es-DO", { minimumFractionDigits: 2 })}</span>
            </div>
            {desc > 0 && (
              <div className="flex justify-between text-xs text-muted-foreground">
                <span>Descuento</span>
                <span>-RD$ {desc.toLocaleString("es-DO", { minimumFractionDigits: 2 })}</span>
              </div>
            )}
            <Separator />
            <div className="flex justify-between text-xl font-bold text-foreground">
              <span>Total</span>
              <span>RD$ {total.toLocaleString("es-DO", { minimumFractionDigits: 2 })}</span>
            </div>
            <div className="flex justify-between text-[10px] text-muted-foreground">
              <span>
                {productCount > 0 && `${productCount} producto(s)`}
                {productCount > 0 && serviceCount > 0 && " · "}
                {serviceCount > 0 && `${serviceCount} servicio(s)`}
                {productCount === 0 && serviceCount === 0 && "0 ítems"}
              </span>
              <span>{lineas.reduce((s, l) => s + l.cantidad, 0)} unidad(es)</span>
            </div>

            <Button onClick={openPaymentModal} className="w-full h-12 text-base font-bold" disabled={saving}>
              {saving ? <Loader2 className="mr-2 h-5 w-5 animate-spin" /> : <FileText className="mr-2 h-5 w-5" />}
              Cobrar (F9)
            </Button>

            {clienteId && (
              <Button variant="outline" size="sm" className="w-full" onClick={handleWhatsApp}>
                <MessageCircle className="mr-2 h-4 w-4" /> Enviar por WhatsApp
              </Button>
            )}
          </div>
        </div>
      </div>

      <QuickClientModal open={quickClientOpen} onOpenChange={setQuickClientOpen} onCreated={handleClientCreated} />
      <PaymentModal
        open={paymentModalOpen}
        onOpenChange={setPaymentModalOpen}
        subtotal={subtotal}
        itbis={totalItbis}
        descuento={desc}
        total={total}
        metodoPago={metodoPago}
        onConfirm={handleSave}
        saving={saving}
      />
    </div>
  );
}
