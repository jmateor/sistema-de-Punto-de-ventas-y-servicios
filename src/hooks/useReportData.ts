import { useEffect, useState, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";

export interface ReportFilters {
  fechaDesde: string;
  fechaHasta: string;
  clienteId: string;
  productoId: string;
  tipo: string; // "todos" | "producto" | "servicio"
  metodoPago: string; // "todos" | "efectivo" | "tarjeta" | "transferencia"
  agrupacion: string; // "diario" | "mensual" | "anual"
}

export interface ReportRow {
  fecha: string;
  cliente: string;
  producto: string;
  tipo: string;
  cantidad: number;
  precio_unitario: number;
  subtotal: number;
  itbis: number;
  total: number;
  metodo_pago: string;
  numero_factura: string;
}

export interface ReportSummary {
  totalVentas: number;
  totalFacturas: number;
  totalProductos: number;
  totalServicios: number;
}

export interface ClienteOption { id: string; nombre: string }
export interface ProductoOption { id: string; nombre: string; tipo: string }

const defaultFilters: ReportFilters = {
  fechaDesde: "",
  fechaHasta: "",
  clienteId: "todos",
  productoId: "todos",
  tipo: "todos",
  metodoPago: "todos",
  agrupacion: "diario",
};

export function useReportData() {
  const { user } = useAuth();
  const [filters, setFilters] = useState<ReportFilters>(() => {
    const now = new Date();
    const firstDay = new Date(now.getFullYear(), now.getMonth(), 1);
    return {
      ...defaultFilters,
      fechaDesde: firstDay.toISOString().split("T")[0],
      fechaHasta: now.toISOString().split("T")[0],
    };
  });

  const [rows, setRows] = useState<ReportRow[]>([]);
  const [summary, setSummary] = useState<ReportSummary>({ totalVentas: 0, totalFacturas: 0, totalProductos: 0, totalServicios: 0 });
  const [clientes, setClientes] = useState<ClienteOption[]>([]);
  const [productos, setProductos] = useState<ProductoOption[]>([]);
  const [loading, setLoading] = useState(false);

  // Load filter options once
  useEffect(() => {
    if (!user) return;
    const loadOptions = async () => {
      const [cRes, pRes] = await Promise.all([
        supabase.from("clientes").select("id, nombre").order("nombre"),
        supabase.from("productos").select("id, nombre, tipo").order("nombre"),
      ]);
      setClientes(cRes.data || []);
      setProductos((pRes.data || []) as ProductoOption[]);
    };
    loadOptions();
  }, [user]);

  const loadReport = useCallback(async () => {
    if (!user) return;
    setLoading(true);

    try {
      // Build facturas query
      let facQuery = supabase
        .from("facturas")
        .select("id, numero, total, created_at, estado, metodo_pago, cliente_id, clientes(nombre)")
        .eq("estado", "activa" as any);

      if (filters.fechaDesde) {
        facQuery = facQuery.gte("created_at", filters.fechaDesde + "T00:00:00");
      }
      if (filters.fechaHasta) {
        facQuery = facQuery.lte("created_at", filters.fechaHasta + "T23:59:59");
      }
      if (filters.clienteId !== "todos") {
        facQuery = facQuery.eq("cliente_id", filters.clienteId);
      }
      if (filters.metodoPago !== "todos") {
        facQuery = facQuery.eq("metodo_pago", filters.metodoPago as any);
      }

      const { data: facturas } = await facQuery;
      if (!facturas || facturas.length === 0) {
        setRows([]);
        setSummary({ totalVentas: 0, totalFacturas: 0, totalProductos: 0, totalServicios: 0 });
        setLoading(false);
        return;
      }

      const facturaIds = facturas.map(f => f.id);
      
      // Fetch details in batches if needed
      let detQuery = supabase
        .from("detalle_facturas")
        .select("cantidad, precio_unitario, subtotal, itbis, factura_id, producto_id, productos(nombre, tipo)")
        .in("factura_id", facturaIds);

      if (filters.productoId !== "todos") {
        detQuery = detQuery.eq("producto_id", filters.productoId);
      }

      const { data: detalles } = await detQuery;

      const facturaMap = new Map(facturas.map(f => [f.id, f]));
      const reportRows: ReportRow[] = [];
      let totalProductos = 0;
      let totalServicios = 0;

      (detalles || []).forEach((d: any) => {
        const fac = facturaMap.get(d.factura_id);
        if (!fac) return;
        const prodTipo = d.productos?.tipo || "producto";
        
        // Apply type filter
        if (filters.tipo !== "todos" && prodTipo !== filters.tipo) return;

        const row: ReportRow = {
          fecha: new Date(fac.created_at).toLocaleDateString("es-DO"),
          cliente: (fac as any).clientes?.nombre || "Sin cliente",
          producto: d.productos?.nombre || "Desconocido",
          tipo: prodTipo === "servicio" ? "Servicio" : "Producto",
          cantidad: d.cantidad,
          precio_unitario: Number(d.precio_unitario),
          subtotal: Number(d.subtotal),
          itbis: Number(d.itbis),
          total: Number(d.subtotal) + Number(d.itbis),
          metodo_pago: fac.metodo_pago,
          numero_factura: fac.numero,
        };
        reportRows.push(row);

        if (prodTipo === "servicio") totalServicios += d.cantidad;
        else totalProductos += d.cantidad;
      });

      setRows(reportRows);

      const totalVentas = reportRows.reduce((s, r) => s + r.total, 0);
      const uniqueFacturas = new Set(reportRows.map(r => r.numero_factura));
      setSummary({
        totalVentas,
        totalFacturas: uniqueFacturas.size,
        totalProductos,
        totalServicios,
      });
    } catch (e) {
      console.error("Error loading report:", e);
    } finally {
      setLoading(false);
    }
  }, [user, filters]);

  useEffect(() => {
    loadReport();
  }, [loadReport]);

  // Grouped data for charts
  const groupedData = useCallback(() => {
    const map: Record<string, number> = {};
    rows.forEach(r => {
      let key: string;
      const d = r.fecha; // already formatted es-DO
      if (filters.agrupacion === "anual") {
        key = d.split("/").pop() || d; // year
      } else if (filters.agrupacion === "mensual") {
        const parts = d.split("/");
        key = `${parts[1]}/${parts[2]}`; // month/year
      } else {
        key = d;
      }
      map[key] = (map[key] || 0) + r.total;
    });
    return Object.entries(map).map(([periodo, total]) => ({ periodo, total }));
  }, [rows, filters.agrupacion]);

  // Data for export
  const exportData = useCallback(() => {
    return rows.map(r => ({
      Fecha: r.fecha,
      Factura: r.numero_factura,
      Cliente: r.cliente,
      Producto: r.producto,
      Tipo: r.tipo,
      Cantidad: r.cantidad,
      "Precio Unit.": r.precio_unitario,
      Subtotal: r.subtotal,
      ITBIS: r.itbis,
      Total: r.total,
      "Método Pago": r.metodo_pago,
    }));
  }, [rows]);

  return {
    filters,
    setFilters,
    rows,
    summary,
    clientes,
    productos,
    loading,
    groupedData,
    exportData,
    loadReport,
  };
}
