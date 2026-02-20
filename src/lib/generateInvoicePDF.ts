import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";

export interface NegocioData {
  nombre_comercial: string;
  razon_social?: string | null;
  rnc?: string | null;
  direccion?: string | null;
  telefono?: string | null;
  whatsapp?: string | null;
  email?: string | null;
  logo_url?: string | null;
  mensaje_factura?: string | null;
}

export interface InvoiceData {
  numero: string;
  fecha: string;
  cliente: { nombre: string; rnc_cedula?: string | null; direccion?: string | null; telefono?: string | null; email?: string | null };
  detalles: { nombre: string; cantidad: number; precio_unitario: number; itbis: number; subtotal: number; garantia?: string | null }[];
  subtotal: number;
  itbis: number;
  descuento: number;
  total: number;
  metodo_pago: string;
  notas?: string | null;
  ncf?: string;
  tipo_comprobante?: string;
  negocio?: NegocioData;
  formato?: "carta" | "80mm" | "58mm";
}

const metodoPagoLabel: Record<string, string> = {
  efectivo: "Efectivo",
  tarjeta: "Tarjeta",
  transferencia: "Transferencia",
};

const fmt = (n: number) => `RD$ ${n.toLocaleString("es-DO", { minimumFractionDigits: 2 })}`;

// ─── CARTA / 80mm (A4-like) ────────────────────────────────────────────────
function generateCartaPDF(data: InvoiceData, action: "download" | "print") {
  const doc = new jsPDF({ unit: "mm", format: "a4" });
  const pageWidth = doc.internal.pageSize.getWidth();
  const neg = data.negocio;

  // ── Header background
  doc.setFillColor(30, 58, 95);
  doc.rect(0, 0, pageWidth, 44, "F");

  // ── Logo placeholder (if logo_url exists, we skip it for now – jsPDF needs Base64)
  const logoX = 14;
  let headerTextX = 14;

  if (neg?.logo_url) {
    // Try to add logo – we pass it as a URL, jsPDF addImage needs base64 but we try
    try {
      doc.addImage(neg.logo_url, "JPEG", logoX, 4, 28, 28);
      headerTextX = 48;
    } catch { /* logo failed, skip */ }
  }

  // ── Business name & info (white on blue header)
  doc.setTextColor(255, 255, 255);
  doc.setFontSize(neg?.nombre_comercial ? 16 : 22);
  doc.setFont("helvetica", "bold");
  doc.text(neg?.nombre_comercial || "FACTURA", headerTextX, 16);

  if (neg?.razon_social) {
    doc.setFontSize(9);
    doc.setFont("helvetica", "normal");
    doc.text(neg.razon_social, headerTextX, 22);
  }
  if (neg?.rnc) {
    doc.setFontSize(8);
    doc.text(`RNC: ${neg.rnc}`, headerTextX, 28);
  }
  if (neg?.direccion) {
    doc.setFontSize(8);
    const dir = doc.splitTextToSize(neg.direccion, 80);
    doc.text(dir, headerTextX, 34);
  }

  // ── Invoice meta (right side)
  doc.setFontSize(14);
  doc.setFont("helvetica", "bold");
  doc.text("FACTURA", pageWidth - 14, 14, { align: "right" });
  doc.setFontSize(10);
  doc.setFont("helvetica", "normal");
  doc.text(data.numero, pageWidth - 14, 21, { align: "right" });
  if (data.ncf) {
    doc.setFontSize(9);
    doc.text(`NCF: ${data.ncf}`, pageWidth - 14, 27, { align: "right" });
  }
  doc.setFontSize(9);
  doc.text(`Fecha: ${new Date(data.fecha).toLocaleDateString("es-DO")}`, pageWidth - 14, 33, { align: "right" });
  doc.text(`Pago: ${metodoPagoLabel[data.metodo_pago] || data.metodo_pago}`, pageWidth - 14, 39, { align: "right" });

  // ── Contact info row below header
  let contactY = 50;
  if (neg?.telefono || neg?.email || neg?.whatsapp) {
    doc.setTextColor(80, 80, 80);
    doc.setFontSize(8);
    doc.setFont("helvetica", "normal");
    const contactParts: string[] = [];
    if (neg?.telefono) contactParts.push(`Tel: ${neg.telefono}`);
    if (neg?.whatsapp) contactParts.push(`WhatsApp: ${neg.whatsapp}`);
    if (neg?.email) contactParts.push(neg.email);
    doc.text(contactParts.join("   |   "), pageWidth / 2, contactY, { align: "center" });
    contactY += 6;
    doc.setDrawColor(200, 210, 220);
    doc.line(14, contactY, pageWidth - 14, contactY);
    contactY += 4;
  }

  // ── Client info
  doc.setFillColor(245, 247, 250);
  doc.roundedRect(14, contactY, pageWidth - 28, 30, 2, 2, "F");
  doc.setTextColor(30, 58, 95);
  doc.setFontSize(9);
  doc.setFont("helvetica", "bold");
  doc.text("CLIENTE", 18, contactY + 7);
  doc.setTextColor(60, 60, 60);
  doc.setFont("helvetica", "normal");
  doc.setFontSize(9);
  let cy = contactY + 7;
  doc.text(data.cliente.nombre, 18 + 22, cy);
  if (data.cliente.rnc_cedula) { cy += 6; doc.text(`RNC/Cédula: ${data.cliente.rnc_cedula}`, 18, cy); }
  if (data.cliente.direccion) { cy += 5; doc.text(`Dir: ${data.cliente.direccion}`, 18, cy); }
  if (data.cliente.telefono) { cy += 5; doc.text(`Tel: ${data.cliente.telefono}`, 18, cy); }

  // ── Items table
  const tableStartY = contactY + 34;
  autoTable(doc, {
    startY: tableStartY,
    head: [["Producto / Descripción", "Cant.", "Precio Unit.", "ITBIS", "Subtotal"]],
    body: data.detalles.map(d => [
      d.garantia ? `${d.nombre}\nGarantía: ${d.garantia}` : d.nombre,
      String(d.cantidad),
      fmt(d.precio_unitario),
      fmt(d.itbis),
      fmt(d.subtotal),
    ]),
    headStyles: { fillColor: [30, 58, 95], textColor: 255, fontStyle: "bold", fontSize: 9 },
    alternateRowStyles: { fillColor: [248, 250, 252] },
    styles: { fontSize: 9, cellPadding: 3 },
    columnStyles: {
      0: { cellWidth: "auto" },
      1: { halign: "center", cellWidth: 16 },
      2: { halign: "right", cellWidth: 32 },
      3: { halign: "right", cellWidth: 28 },
      4: { halign: "right", cellWidth: 32 },
    },
  });

  // ── Totals
  const finalY = (doc as any).lastAutoTable.finalY + 6;
  const totalsX = pageWidth - 75;

  doc.setFillColor(248, 250, 252);
  doc.roundedRect(totalsX - 4, finalY - 4, 75, data.descuento > 0 ? 36 : 28, 2, 2, "F");

  doc.setFontSize(9);
  doc.setTextColor(100, 100, 100);
  doc.text("Subtotal:", totalsX, finalY + 3);
  doc.text(fmt(data.subtotal), pageWidth - 16, finalY + 3, { align: "right" });
  doc.text("ITBIS (18%):", totalsX, finalY + 10);
  doc.text(fmt(data.itbis), pageWidth - 16, finalY + 10, { align: "right" });

  let totalLineY = finalY + 17;
  if (data.descuento > 0) {
    doc.text("Descuento:", totalsX, finalY + 17);
    doc.text(`-${fmt(data.descuento)}`, pageWidth - 16, finalY + 17, { align: "right" });
    totalLineY = finalY + 24;
  }

  doc.setDrawColor(30, 58, 95);
  doc.setLineWidth(0.5);
  doc.line(totalsX - 2, totalLineY - 1, pageWidth - 14, totalLineY - 1);
  doc.setTextColor(30, 58, 95);
  doc.setFontSize(12);
  doc.setFont("helvetica", "bold");
  doc.text("TOTAL:", totalsX, totalLineY + 6);
  doc.text(fmt(data.total), pageWidth - 16, totalLineY + 6, { align: "right" });

  // ── Notes + warranty + footer message
  let footerY = totalLineY + 16;

  if (data.notas) {
    doc.setFontSize(8);
    doc.setFont("helvetica", "italic");
    doc.setTextColor(120, 120, 120);
    doc.text(`Notas: ${data.notas}`, 14, footerY);
    footerY += 7;
  }

  // ── Footer with business message
  const pageH = doc.internal.pageSize.getHeight();
  if (neg?.mensaje_factura) {
    doc.setDrawColor(200, 210, 220);
    doc.line(14, pageH - 22, pageWidth - 14, pageH - 22);
    doc.setFontSize(8);
    doc.setFont("helvetica", "normal");
    doc.setTextColor(100, 100, 100);
    const msgLines = doc.splitTextToSize(neg.mensaje_factura, pageWidth - 28);
    doc.text(msgLines, pageWidth / 2, pageH - 18, { align: "center" });
  }

  doc.setFontSize(7);
  doc.setTextColor(160, 160, 160);
  doc.text("Documento generado electrónicamente", pageWidth / 2, pageH - 6, { align: "center" });

  if (action === "print") {
    doc.autoPrint();
    window.open(doc.output("bloburl"), "_blank");
  } else {
    doc.save(`${data.numero}.pdf`);
  }
}

// ─── THERMAL 80mm ─────────────────────────────────────────────────────────
function generateThermalPDF(data: InvoiceData, action: "download" | "print", widthMM: number) {
  const contentH = 250; // tall enough
  const doc = new jsPDF({ unit: "mm", format: [widthMM, contentH] });
  const pw = widthMM;
  const neg = data.negocio;
  let y = 6;

  const center = (text: string, size: number, bold = false) => {
    doc.setFontSize(size);
    doc.setFont("helvetica", bold ? "bold" : "normal");
    doc.setTextColor(20, 20, 20);
    doc.text(text, pw / 2, y, { align: "center" });
    y += size * 0.45;
  };

  const line = () => {
    doc.setDrawColor(180, 180, 180);
    doc.line(4, y, pw - 4, y);
    y += 3;
  };

  // ── Header
  if (neg?.nombre_comercial) center(neg.nombre_comercial, 11, true);
  if (neg?.razon_social) center(neg.razon_social, 7);
  if (neg?.rnc) center(`RNC: ${neg.rnc}`, 7);
  if (neg?.direccion) {
    doc.setFontSize(7);
    doc.setFont("helvetica", "normal");
    const lines = doc.splitTextToSize(neg.direccion, pw - 8);
    doc.text(lines, pw / 2, y, { align: "center" });
    y += lines.length * 3.5;
  }
  if (neg?.telefono) center(neg.telefono, 7);
  y += 2;
  line();

  // ── Invoice meta
  center("FACTURA", 10, true);
  center(data.numero, 8);
  if (data.ncf) center(`NCF: ${data.ncf}`, 7);
  center(new Date(data.fecha).toLocaleDateString("es-DO"), 7);
  center(`Pago: ${metodoPagoLabel[data.metodo_pago] || data.metodo_pago}`, 7);
  y += 1;
  line();

  // ── Client
  doc.setFontSize(7); doc.setFont("helvetica", "bold");
  doc.text("CLIENTE:", 4, y); y += 3.5;
  doc.setFont("helvetica", "normal");
  doc.text(data.cliente.nombre, 4, y); y += 3.5;
  if (data.cliente.rnc_cedula) { doc.text(`RNC/Céd: ${data.cliente.rnc_cedula}`, 4, y); y += 3.5; }
  y += 1;
  line();

  // ── Products
  doc.setFontSize(7); doc.setFont("helvetica", "bold");
  doc.text("CANT  PRODUCTO", 4, y);
  doc.text("TOTAL", pw - 4, y, { align: "right" });
  y += 4;
  doc.setFont("helvetica", "normal");

  for (const d of data.detalles) {
    const prodLines = doc.splitTextToSize(`${d.cantidad}x ${d.nombre}`, pw - 24);
    doc.text(prodLines, 4, y);
    doc.text(fmt(d.subtotal), pw - 4, y, { align: "right" });
    y += prodLines.length * 3.5;
    if (d.garantia) {
      doc.setFont("helvetica", "italic");
      doc.setFontSize(6.5);
      doc.text(`  Garantía: ${d.garantia}`, 4, y); y += 3.5;
      doc.setFont("helvetica", "normal");
      doc.setFontSize(7);
    }
  }
  y += 1;
  line();

  // ── Totals
  const totRow = (label: string, value: string, bold = false) => {
    doc.setFontSize(8);
    doc.setFont("helvetica", bold ? "bold" : "normal");
    doc.text(label, 4, y);
    doc.text(value, pw - 4, y, { align: "right" });
    y += 4;
  };
  totRow("Subtotal:", fmt(data.subtotal));
  totRow("ITBIS (18%):", fmt(data.itbis));
  if (data.descuento > 0) totRow("Descuento:", `-${fmt(data.descuento)}`);
  line();
  totRow("TOTAL:", fmt(data.total), true);
  y += 2;

  // ── Notes + Guarantee message
  if (data.notas) {
    doc.setFontSize(7); doc.setFont("helvetica", "italic"); doc.setTextColor(100, 100, 100);
    const nLines = doc.splitTextToSize(`Notas: ${data.notas}`, pw - 8);
    doc.text(nLines, pw / 2, y, { align: "center" });
    y += nLines.length * 3.5 + 2;
  }

  // ── Footer message
  if (neg?.mensaje_factura) {
    line();
    doc.setFontSize(7); doc.setFont("helvetica", "normal"); doc.setTextColor(80, 80, 80);
    const mLines = doc.splitTextToSize(neg.mensaje_factura, pw - 8);
    doc.text(mLines, pw / 2, y, { align: "center" });
    y += mLines.length * 3.5 + 2;
  }

  doc.setFontSize(6.5); doc.setTextColor(150, 150, 150);
  doc.text("Generado electrónicamente", pw / 2, y + 2, { align: "center" });

  if (action === "print") {
    doc.autoPrint();
    window.open(doc.output("bloburl"), "_blank");
  } else {
    doc.save(`${data.numero}.pdf`);
  }
}

// ─── PUBLIC ENTRY POINT ────────────────────────────────────────────────────
export function generateInvoicePDF(data: InvoiceData, action: "download" | "print" = "download") {
  const formato = data.formato || "carta";
  if (formato === "58mm") {
    generateThermalPDF(data, action, 58);
  } else if (formato === "80mm") {
    generateThermalPDF(data, action, 80);
  } else {
    generateCartaPDF(data, action);
  }
}
