import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";

interface InvoiceData {
  numero: string;
  fecha: string;
  cliente: { nombre: string; rnc_cedula?: string | null; direccion?: string | null; telefono?: string | null; email?: string | null };
  detalles: { nombre: string; cantidad: number; precio_unitario: number; itbis: number; subtotal: number }[];
  subtotal: number;
  itbis: number;
  descuento: number;
  total: number;
  metodo_pago: string;
  notas?: string | null;
}

const metodoPagoLabel: Record<string, string> = {
  efectivo: "Efectivo",
  tarjeta: "Tarjeta",
  transferencia: "Transferencia",
};

const fmt = (n: number) => `RD$ ${n.toLocaleString("es-DO", { minimumFractionDigits: 2 })}`;

export function generateInvoicePDF(data: InvoiceData, action: "download" | "print" = "download") {
  const doc = new jsPDF();
  const pageWidth = doc.internal.pageSize.getWidth();

  // Header
  doc.setFillColor(30, 58, 95);
  doc.rect(0, 0, pageWidth, 40, "F");

  doc.setTextColor(255, 255, 255);
  doc.setFontSize(22);
  doc.setFont("helvetica", "bold");
  doc.text("FACTURA", 14, 22);
  doc.setFontSize(10);
  doc.text(data.numero, 14, 30);

  doc.setFontSize(10);
  doc.text(`Fecha: ${new Date(data.fecha).toLocaleDateString("es-DO")}`, pageWidth - 14, 22, { align: "right" });
  doc.text(`Pago: ${metodoPagoLabel[data.metodo_pago] || data.metodo_pago}`, pageWidth - 14, 30, { align: "right" });

  // Client info
  doc.setTextColor(30, 58, 95);
  doc.setFontSize(11);
  doc.setFont("helvetica", "bold");
  doc.text("CLIENTE", 14, 52);

  doc.setTextColor(60, 60, 60);
  doc.setFont("helvetica", "normal");
  doc.setFontSize(10);
  let y = 59;
  doc.text(data.cliente.nombre, 14, y);
  if (data.cliente.rnc_cedula) { y += 6; doc.text(`RNC/Cédula: ${data.cliente.rnc_cedula}`, 14, y); }
  if (data.cliente.direccion) { y += 6; doc.text(`Dirección: ${data.cliente.direccion}`, 14, y); }
  if (data.cliente.telefono) { y += 6; doc.text(`Tel: ${data.cliente.telefono}`, 14, y); }
  if (data.cliente.email) { y += 6; doc.text(`Email: ${data.cliente.email}`, 14, y); }

  // Items table
  autoTable(doc, {
    startY: y + 12,
    head: [["Producto", "Cant.", "Precio Unit.", "ITBIS", "Subtotal"]],
    body: data.detalles.map(d => [
      d.nombre,
      String(d.cantidad),
      fmt(d.precio_unitario),
      fmt(d.itbis),
      fmt(d.subtotal),
    ]),
    headStyles: { fillColor: [30, 58, 95], textColor: 255, fontStyle: "bold" },
    alternateRowStyles: { fillColor: [245, 247, 250] },
    styles: { fontSize: 9, cellPadding: 4 },
    columnStyles: {
      0: { cellWidth: 60 },
      1: { halign: "center", cellWidth: 20 },
      2: { halign: "right" },
      3: { halign: "right" },
      4: { halign: "right" },
    },
  });

  // Totals
  const finalY = (doc as any).lastAutoTable.finalY + 10;
  const totalsX = pageWidth - 70;

  doc.setFontSize(10);
  doc.setTextColor(100, 100, 100);
  doc.text("Subtotal:", totalsX, finalY);
  doc.text(fmt(data.subtotal), pageWidth - 14, finalY, { align: "right" });

  doc.text("ITBIS (18%):", totalsX, finalY + 7);
  doc.text(fmt(data.itbis), pageWidth - 14, finalY + 7, { align: "right" });

  if (data.descuento > 0) {
    doc.text("Descuento:", totalsX, finalY + 14);
    doc.text(`-${fmt(data.descuento)}`, pageWidth - 14, finalY + 14, { align: "right" });
  }

  const totalY = finalY + (data.descuento > 0 ? 24 : 17);
  doc.setDrawColor(30, 58, 95);
  doc.line(totalsX, totalY - 3, pageWidth - 14, totalY - 3);
  doc.setTextColor(30, 58, 95);
  doc.setFontSize(13);
  doc.setFont("helvetica", "bold");
  doc.text("TOTAL:", totalsX, totalY + 3);
  doc.text(fmt(data.total), pageWidth - 14, totalY + 3, { align: "right" });

  // Notes
  if (data.notas) {
    doc.setFontSize(9);
    doc.setFont("helvetica", "normal");
    doc.setTextColor(120, 120, 120);
    doc.text(`Notas: ${data.notas}`, 14, totalY + 18);
  }

  // Footer
  const footerY = doc.internal.pageSize.getHeight() - 15;
  doc.setFontSize(8);
  doc.setTextColor(150, 150, 150);
  doc.text("Documento generado electrónicamente", pageWidth / 2, footerY, { align: "center" });

  if (action === "print") {
    doc.autoPrint();
    window.open(doc.output("bloburl"), "_blank");
  } else {
    doc.save(`${data.numero}.pdf`);
  }
}
