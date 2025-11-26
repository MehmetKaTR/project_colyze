import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";
import * as XLSX from "xlsx";

export const exportPDF = (data, filename = "results.pdf") => {
  const doc = new jsPDF();

  if (!data || data.length === 0) {
    doc.text("No data available", 10, 10);
    doc.save(filename);
    return;
  }

  const columns = Object.keys(data[0]);
  const rows = data.map(row => columns.map(col => row[col]));

  autoTable(doc, {
    head: [columns],
    body: rows,
    startY: 10,
  });

  doc.save(filename);
};

export const exportExcel = (data, filename = "results.xlsx") => {
  if (!data || data.length === 0) {
    alert("No data to export");
    return;
  }

  const worksheet = XLSX.utils.json_to_sheet(data);
  const workbook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(workbook, worksheet, "Results");
  XLSX.writeFile(workbook, filename);
};
