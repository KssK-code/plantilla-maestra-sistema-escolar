import jsPDF from 'jspdf';
import 'jspdf-autotable';
import { format, parseISO } from 'date-fns';
import { utcToZonedTime } from 'date-fns-tz';
import { resolveSchoolDisplayName, getPublicLogoUrl } from './utils';

const daysOfWeek = ['Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado', 'Domingo'];

function openPdfInNewTab(doc) {
  const blob = doc.output('blob');
  const url = URL.createObjectURL(blob);
  window.open(url, '_blank');
  setTimeout(() => URL.revokeObjectURL(url), 60000);
}

const drawHeader = async (doc, schoolSettings, title) => {
  let startY = 15;
  const resolvedName = resolveSchoolDisplayName(schoolSettings);

  const tryAddLogo = async (url) => {
    const response = await fetch(url);
    if (!response.ok) throw new Error('logo fetch failed');
    const blob = await response.blob();
    const imgData = await new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onloadend = () => resolve(reader.result);
      reader.onerror = reject;
      reader.readAsDataURL(blob);
    });
    const img = new Image();
    img.src = imgData;
    await new Promise((resolve, reject) => { img.onload = resolve; img.onerror = reject; });
    const imgWidth = 30;
    const imgHeight = (img.height * imgWidth) / img.width;
    const fmt = String(imgData).toLowerCase().includes('jpeg') ? 'JPEG' : 'PNG';
    doc.addImage(imgData, fmt, 15, startY, imgWidth, imgHeight);
    startY = 22;
  };

  try {
    if (schoolSettings?.logo_url) {
      await tryAddLogo(schoolSettings.logo_url);
    } else {
      throw new Error('no remote logo');
    }
  } catch (e) {
    try {
      await tryAddLogo(getPublicLogoUrl());
    } catch (e2) {
      console.error('Error loading logo for PDF, skipping.', e2);
      startY = 15;
    }
  }

  if (resolvedName) {
    doc.setFontSize(16);
    doc.text(resolvedName, 50, startY);
  }

  doc.setFontSize(18);
  doc.text(title, doc.internal.pageSize.getWidth() / 2, startY + 15, { align: 'center' });

  return startY + 25;
};

export const generateCashCutPdf = async (cut, cutPayments, schoolSettings) => {
  const doc = new jsPDF();
  let startY = await drawHeader(doc, schoolSettings, `Corte de Caja #${cut.cut_number}`);

  const timeZone = Intl.DateTimeFormat().resolvedOptions().timeZone;
  const localCreatedAt = utcToZonedTime(cut.created_at, timeZone);

  const displayStartDate = format(parseISO(cut.start_date), 'dd/MM/yyyy');
  const displayEndDate = format(parseISO(cut.end_date), 'dd/MM/yyyy');

  doc.setFontSize(12);
  doc.text(`Periodo: ${displayStartDate} - ${displayEndDate}`, 15, startY);
  doc.text(`Fecha de Emisión: ${format(localCreatedAt, 'dd/MM/yyyy HH:mm')}`, 15, startY + 6);
  startY += 20;

  doc.setFontSize(14);
  doc.text('Desglose por Concepto', 15, startY);
  startY += 8;
  const breakdownBody = Object.entries(cut.details.breakdown || {}).map(([concept, amount]) => [
    concept,
    `$${amount.toLocaleString('es-MX', { minimumFractionDigits: 2 })}`
  ]);
  breakdownBody.push([{ content: 'Total:', styles: { fontStyle: 'bold' } }, { content: `$${cut.total_amount.toLocaleString('es-MX', { minimumFractionDigits: 2 })}`, styles: { fontStyle: 'bold' } }]);
  doc.autoTable({
    startY,
    head: [['Concepto', 'Monto']],
    body: breakdownBody,
    theme: 'striped',
    headStyles: { fillColor: [41, 128, 185] },
  });
  startY = doc.autoTable.previous.finalY + 15;

  doc.setFontSize(14);
  doc.text('Pagos Incluidos', 15, startY);
  startY += 8;
  const paymentsBody = cutPayments.map(p => [
    p.students?.student_number || 'N/A',
    p.students?.name || 'N/A',
    p.concept,
    `$${p.amount.toLocaleString('es-MX', { minimumFractionDigits: 2 })}`,
    format(parseISO(p.paid_date), 'dd/MM/yyyy')
  ]);
  doc.autoTable({
    startY,
    head: [['# Alumno', 'Estudiante', 'Concepto', 'Monto', 'Fecha de Pago']],
    body: paymentsBody,
    theme: 'striped',
    headStyles: { fillColor: [41, 128, 185] },
  });

  openPdfInNewTab(doc);
};


export const generateAttendanceListPdf = async (schedule, students, schoolSettings) => {
    const doc = new jsPDF();
    const scheduleTitle = `${schedule.courses.name} - ${daysOfWeek[schedule.day_of_week]} ${schedule.start_time.slice(0, 5)}-${schedule.end_time.slice(0, 5)}`;
    let startY = await drawHeader(doc, schoolSettings, 'Lista de Asistencia');
    
    doc.setFontSize(12);
    doc.text(scheduleTitle, 15, startY);
    startY += 10;
    
    // Add print date
    const printDate = new Date().toLocaleDateString('es-MX', {
        year: 'numeric',
        month: 'long',
        day: 'numeric'
    });
    doc.setFontSize(10);
    doc.setTextColor(100, 100, 100);
    doc.text(`Fecha de impresión: ${printDate}`, 15, startY);
    doc.setTextColor(0, 0, 0); // Reset to black
    doc.setFontSize(12); // Reset font size
    startY += 15;
    
    const tableBody = students.map((student, index) => [
      student.student_number || 'N/A',
      student.name,
      '' 
    ]);

    doc.autoTable({
        startY,
        head: [['# Alumno', 'Nombre del Estudiante', 'Asistencia']],
        body: tableBody,
        theme: 'grid',
        headStyles: { fillColor: [41, 128, 185] },
        columnStyles: {
            2: { cellWidth: 40, halign: 'center' }
        },
        didDrawCell: (data) => {
            if (data.section === 'body' && data.column.index === 2) {
                doc.rect(data.cell.x + 15, data.cell.y + 2, 10, 10);
            }
        }
    });

    openPdfInNewTab(doc);
};

export const generateIncomeByConceptPdf = async (payments, dateRange, schoolSettings) => {
  const doc = new jsPDF();
  let startY = await drawHeader(doc, schoolSettings, 'Reporte de Ingresos por Concepto');
  
  doc.setFontSize(12);
  doc.text(`Periodo: ${format(parseISO(dateRange.from), 'dd/MM/yyyy')} - ${format(parseISO(dateRange.to), 'dd/MM/yyyy')}`, 15, startY);
  startY += 15;

  const incomeByConcept = payments.reduce((acc, p) => {
    acc[p.concept] = (acc[p.concept] || 0) + Number(p.amount);
    return acc;
  }, {});
  const totalRevenue = payments.reduce((sum, p) => sum + Number(p.amount), 0);

  const tableBody = Object.entries(incomeByConcept).map(([concept, amount]) => [
    concept,
    `$${amount.toLocaleString('es-MX', { minimumFractionDigits: 2 })}`
  ]);
  tableBody.push([{ content: 'Total General:', styles: { fontStyle: 'bold' } }, { content: `$${totalRevenue.toLocaleString('es-MX', { minimumFractionDigits: 2 })}`, styles: { fontStyle: 'bold' } }]);

  doc.autoTable({
    startY,
    head: [['Concepto', 'Monto Total']],
    body: tableBody,
    theme: 'striped',
    headStyles: { fillColor: [41, 128, 185] },
  });

  openPdfInNewTab(doc);
};

export const generateEnrollmentsPdf = async (students, dateRange, schoolSettings) => {
  const doc = new jsPDF();
  let startY = await drawHeader(doc, schoolSettings, 'Reporte de Inscripciones');

  doc.setFontSize(12);
  doc.text(`Periodo: ${format(parseISO(dateRange.from), 'dd/MM/yyyy')} - ${format(parseISO(dateRange.to), 'dd/MM/yyyy')}`, 15, startY);
  startY += 15;

  // Agregar número de alumno de cada estudiante
  const tableBody = students.map((student, index) => [
    student.student_number || 'N/A', // Número de alumno real
    student.name,
    student.course,
    format(parseISO(student.enrollment_date), 'dd/MM/yyyy'),
    student.email
  ]);

  doc.autoTable({
    startY,
    head: [['# Alumno', 'Nombre', 'Curso', 'Fecha de Inscripción', 'Email']],
    body: tableBody,
    theme: 'striped',
    headStyles: { fillColor: [41, 128, 185] },
    columnStyles: {
      0: { cellWidth: 15 }, // Columna # más angosta
      1: { cellWidth: 50 }, // Nombre
      2: { cellWidth: 40 }, // Curso
      3: { cellWidth: 35 }, // Fecha
      4: { cellWidth: 50 }  // Email
    }
  });

  // Agregar total de inscripciones al final
  const finalY = doc.lastAutoTable.finalY + 15;
  doc.setFontSize(14);
  doc.setFont(undefined, 'bold');
  doc.text(`TOTAL DE INSCRIPCIONES: ${students.length}`, 15, finalY);

  openPdfInNewTab(doc);
};

export const generateCashCutsPdf = async (cashCuts, dateRange, schoolSettings) => {
  const doc = new jsPDF();
  let startY = await drawHeader(doc, schoolSettings, 'Reporte de Cortes de Caja');

  doc.setFontSize(12);
  doc.text(`Periodo: ${format(parseISO(dateRange.from), 'dd/MM/yyyy')} - ${format(parseISO(dateRange.to), 'dd/MM/yyyy')}`, 15, startY);
  startY += 15;

  const totalAmount = cashCuts.reduce((sum, cut) => sum + Number(cut.total_amount), 0);

  const tableBody = cashCuts.map(cut => [
    `#${cut.cut_number}`,
    format(parseISO(cut.created_at), 'dd/MM/yyyy HH:mm'),
    `$${Number(cut.total_amount).toLocaleString('es-MX', { minimumFractionDigits: 2 })}`
  ]);
  tableBody.push([{ content: 'Total General:', styles: { fontStyle: 'bold' } }, '', { content: `$${totalAmount.toLocaleString('es-MX', { minimumFractionDigits: 2 })}`, styles: { fontStyle: 'bold' } }]);

  doc.autoTable({
    startY,
    head: [['# Corte', 'Fecha de Emisión', 'Monto Total']],
    body: tableBody,
    theme: 'striped',
    headStyles: { fillColor: [41, 128, 185] },
  });

  openPdfInNewTab(doc);
};

export const generatePaymentsByConceptPdf = async (payments, students, selectedConcept, dateRange, schoolSettings) => {
  const doc = new jsPDF();
  let startY = await drawHeader(doc, schoolSettings, `Reporte de Pagos - ${selectedConcept}`);

  // Filtrar pagos por concepto
  const conceptPayments = payments.filter(payment => payment.concept === selectedConcept);
  
  // Crear mapa de estudiantes para búsqueda rápida
  const studentsMap = students.reduce((map, student) => {
    map[student.id] = student;
    return map;
  }, {});

  // Preparar datos para la tabla
  const tableData = conceptPayments.map(payment => {
    const student = studentsMap[payment.student_id];
    const studentNumber = student?.student_number || 'N/A';
    const studentName = student ? `${student.first_name} ${student.last_name}` : 'Estudiante no encontrado';
    const paymentDate = payment.paid_date ? format(parseISO(payment.paid_date), 'dd/MM/yyyy') : 'N/A';
    
    return [
      studentNumber,
      studentName,
      `$${Number(payment.amount).toLocaleString('es-MX')}`,
      paymentDate
    ];
  });

  // Calcular totales
  const totalAmount = conceptPayments.reduce((sum, payment) => sum + Number(payment.amount), 0);
  const totalPayments = conceptPayments.length;

  // Información del reporte
  doc.setFontSize(12);
  doc.text(`Concepto: ${selectedConcept}`, 15, startY);
  doc.text(`Período: ${dateRange.from} al ${dateRange.to}`, 15, startY + 8);
  doc.text(`Total de pagos: ${totalPayments}`, 15, startY + 16);
  doc.text(`Monto total: $${totalAmount.toLocaleString('es-MX')}`, 15, startY + 24);

  // Tabla de pagos
  doc.autoTable({
    startY: startY + 35,
    head: [['# Alumno', 'Estudiante', 'Monto', 'Fecha de Pago']],
    body: tableData,
    styles: {
      fontSize: 10,
      cellPadding: 3
    },
    headStyles: {
      fillColor: [139, 92, 246],
      textColor: 255,
      fontStyle: 'bold'
    },
    alternateRowStyles: {
      fillColor: [245, 245, 245]
    },
    columnStyles: {
      0: { cellWidth: 25 },  // # Alumno
      1: { cellWidth: 70 },  // Estudiante
      2: { cellWidth: 40 },  // Monto
      3: { cellWidth: 40 }   // Fecha de Pago
    },
    margin: { left: 15, right: 15 }
  });

  // Resumen final
  const finalY = doc.lastAutoTable.finalY + 15;
  doc.setFontSize(12);
  doc.setFont(undefined, 'bold');
  doc.text(`RESUMEN:`, 15, finalY);
  doc.setFont(undefined, 'normal');
  doc.text(`Total de pagos procesados: ${totalPayments}`, 15, finalY + 10);
  doc.text(`Monto total recaudado: $${totalAmount.toLocaleString('es-MX')}`, 15, finalY + 18);

  // Pie de página
  const pageHeight = doc.internal.pageSize.height;
  doc.setFontSize(8);
  doc.text(`Generado el ${format(new Date(), 'dd/MM/yyyy HH:mm')}`, 15, pageHeight - 10);

  openPdfInNewTab(doc);
};