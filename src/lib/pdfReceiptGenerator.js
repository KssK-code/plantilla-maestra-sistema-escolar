import { toast } from '@/hooks/use-toast';
import { resolveBranchDisplayLabel, getPublicCeevaLogoUrl } from './utils';

// Función principal para descargar comprobante de pago en PDF
export async function downloadPaymentReceiptPDF(student, payment) {
  try {
    console.log('🔄 Iniciando descarga de PDF (html2pdf)...');
    
    const html2pdf = (await import('html2pdf.js')).default;
    
    // Crear contenido HTML para el PDF
    const htmlContent = createReceiptHTML(student, payment);
    
    // Configuración del PDF
    const options = {
      margin: 0.5,
      filename: `comprobante-pago-${getStudentName(student).replace(/\s+/g, '-')}-${Date.now()}.pdf`,
      image: { type: 'jpeg', quality: 0.98 },
      html2canvas: { scale: 2, useCORS: true },
      jsPDF: { unit: 'in', format: 'letter', orientation: 'portrait' }
    };
    
    // Generar y descargar PDF
    await html2pdf().set(options).from(htmlContent).save();
    
    console.log('✅ PDF descargado exitosamente (html2pdf)');
    return { success: true };
    
  } catch (error) {
    console.error('❌ Error en html2pdf:', error);
    return { success: false, error: error.message };
  }
}

// Función alternativa usando jsPDF (fallback) - VERSIÓN ROBUSTA UNIVERSAL
export async function downloadPaymentReceiptPDFAlternative(student, payment, schoolSettings = null) {
  try {
    console.log('🔄 Iniciando descarga de PDF alternativo (jsPDF)...');
    
    const { jsPDF } = await import('jspdf');
    
    const pdf = new jsPDF();
    
    // Preparar datos del estudiante (compatible con TODAS las estructuras)
    const studentName = getStudentName(student);
    const studentNumber = getStudentNumber(student);
    const studentCourse = getStudentCourse(student);
    
    // Preparar datos del pago (compatible con TODAS las estructuras)
    const paymentConcept = getPaymentConcept(payment);
    const paymentAmount = getPaymentAmount(payment);
    const paymentDate = getPaymentDate(payment);
    
    // Detectar nombre del sistema automáticamente
    const systemName = detectSystemName();
  
    let startY = 15;
    
    // Intentar cargar logo desde schoolSettings (igual que en pdfGenerator.js)
    if (schoolSettings?.logo_url) {
      try {
        console.log('📸 Cargando logo desde:', schoolSettings.logo_url);
        const response = await fetch(schoolSettings.logo_url);
        const blob = await response.blob();
        const imgData = await new Promise((resolve, reject) => {
          const reader = new FileReader();
          reader.onloadend = () => resolve(reader.result);
          reader.onerror = reject;
          reader.readAsDataURL(blob);
        });
        const img = new Image();
        img.src = imgData;
        await new Promise(resolve => { img.onload = resolve });
        const imgWidth = 30;
        const imgHeight = (img.height * imgWidth) / img.width;
        pdf.addImage(imgData, 'PNG', 15, startY, imgWidth, imgHeight);
        console.log('✅ Logo cargado exitosamente');
        startY = 22;
      } catch (e) {
        console.warn('⚠️ Error cargando logo, continuando sin logo:', e);
        startY = 15;
      }
    } else {
      await loadSystemLogo(pdf);
    }
  
    // Header con información completa de la escuela
    pdf.setFontSize(16);
    pdf.setFont('helvetica', 'bold');
    pdf.text(
      `${import.meta.env.VITE_SCHOOL_NAME} - ${import.meta.env.VITE_BRANCH_NAME}`,
      105,
      startY,
      { align: 'center' }
    );
    
    // Dirección y contacto
    pdf.setFontSize(9);
    pdf.setFont('helvetica', 'normal');
    pdf.text(resolveBranchDisplayLabel(), 105, startY + 7, { align: 'center' });
    
    // Línea separadora
    pdf.setLineWidth(0.5);
    pdf.line(20, startY + 13, 190, startY + 13);

    // Subtítulo
    pdf.setFontSize(14);
    pdf.setFont('helvetica', 'bold');
    pdf.text('Comprobante de Pago', 105, startY + 21, { align: 'center' });

    pdf.setTextColor(0, 0, 0);

    let yPosition = startY + 32;
    
    // Información del estudiante
    pdf.setFontSize(14);
    pdf.setFont('helvetica', 'bold');
    pdf.text('Información del Estudiante', 20, yPosition);
    yPosition += 10;
  
    pdf.setFont('helvetica', 'normal');
    pdf.setFontSize(10);
    pdf.text(`Nombre: ${studentName}`, 20, yPosition);
    yPosition += 8;
    pdf.text(`Número de Estudiante: #${studentNumber}`, 20, yPosition);
    yPosition += 8;
    pdf.text(`Curso: ${studentCourse}`, 20, yPosition);
    yPosition += 15;
  
    // Detalles del pago
    pdf.setFontSize(14);
    pdf.setFont('helvetica', 'bold');
    pdf.text('Detalles del Pago', 20, yPosition);
    yPosition += 10;
  
    pdf.setFont('helvetica', 'normal');
    pdf.setFontSize(10);
    pdf.text(`Concepto: ${paymentConcept}`, 20, yPosition);
    yPosition += 8;
    pdf.text(`Monto: $${paymentAmount}`, 20, yPosition);
    yPosition += 8;
    pdf.text(`Fecha de Pago: ${paymentDate}`, 20, yPosition);
    yPosition += 8;
    
    // Referencia (si existe)
    if (payment.reference) {
      pdf.text(`Referencia: ${payment.reference}`, 20, yPosition);
      yPosition += 8;
    }
    
    yPosition += 10;
  
    // Información de deuda (si existe)
    if (payment.debt_info) {
      pdf.setFontSize(14);
      pdf.setFont('helvetica', 'bold');
      pdf.text('Información de Deuda', 20, yPosition);
      yPosition += 10;
      
      pdf.setFont('helvetica', 'normal');
      pdf.setFontSize(10);
      pdf.text(`Deuda Total: $${payment.debt_info.total_debt?.toLocaleString('es-MX', { minimumFractionDigits: 2 }) || '0.00'}`, 20, yPosition);
      yPosition += 8;
      pdf.text(`Saldo Pendiente: $${payment.debt_info.remaining_debt?.toLocaleString('es-MX', { minimumFractionDigits: 2 }) || '0.00'}`, 20, yPosition);
      yPosition += 15;
    }

    // Footer
    pdf.setFontSize(8);
    pdf.setFont('helvetica', 'italic');
    pdf.text(`Comprobante generado automáticamente - ${new Date().toLocaleDateString('es-MX')}`, 
             105, 280, { align: 'center' });
    
    // Descargar
    const filename = `comprobante-pago-${studentName.replace(/\s+/g, '-')}-${Date.now()}.pdf`;
    pdf.save(filename);
    
    console.log('✅ PDF descargado exitosamente (alternativo)');
    return { success: true };
    
  } catch (error) {
    console.error('❌ Error en jsPDF alternativo:', error);
    return { success: false, error: error.message };
  }
}

// ==================== FUNCIONES AUXILIARES ROBUSTAS ====================

// Función para obtener nombre del estudiante (compatible con todas las estructuras)
function getStudentName(student) {
  // Prioridad: name > full_name > first_name + last_name > fallback
  if (student.name) return student.name.trim();
  if (student.full_name) return student.full_name.trim();
  
  const firstName = student.first_name || '';
  const lastName = student.last_name || '';
  const fullName = `${firstName} ${lastName}`.trim();
  
  return fullName || 'Sin nombre';
}

// Función para obtener número de estudiante
function getStudentNumber(student) {
  return student.student_number || student.number || student.id || 'Sin número';
}

// Función para obtener curso del estudiante
function getStudentCourse(student) {
  return student.course || student.course_name || student.programa || 'Sin especificar';
}

// Función para obtener concepto del pago
function getPaymentConcept(payment) {
  return payment.concept || payment.description || payment.concepto || 'Sin especificar';
}

// Función para obtener monto del pago
function getPaymentAmount(payment) {
  const amount = payment.amount || payment.monto || 0;
  return amount.toLocaleString('es-MX', { minimumFractionDigits: 2 });
}

// Función para obtener fecha del pago
function getPaymentDate(payment) {
  // Prioridad: paid_date > payment_date > fecha_pago > created_at
  const dateField = payment.paid_date || payment.payment_date || payment.fecha_pago || payment.created_at;
  
  if (!dateField) return 'Sin fecha';
  
  try {
    return new Date(dateField).toLocaleDateString('es-MX');
  } catch (error) {
    console.warn('Error parsing date:', error);
    return 'Sin fecha';
  }
}

function detectSystemName() {
  return import.meta.env.VITE_SCHOOL_NAME || 'Sistema Educativo';
}

// Función para cargar logo del sistema automáticamente
function publicAssetUrl(path) {
  const normalized = path.startsWith('/') ? path : `/${path}`;
  if (typeof window !== 'undefined' && window.location?.origin) {
    return `${window.location.origin}${normalized}`;
  }
  return normalized;
}

async function loadSystemLogo(pdf) {
  // Lista de posibles logos en orden de prioridad
  const possibleLogos = [
    '/logo-cjvb.png',
    '/logo-polanco.png',
    '/logo-avanza.png', 
    '/avanza-logo.png.png',
    '/logo.png',
    '/assets/logo.png'
  ];
  
  for (const logoPath of possibleLogos) {
    try {
      const response = await fetch(publicAssetUrl(logoPath));
      if (!response.ok) continue;
      
      const blob = await response.blob();
      const imgData = await new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onloadend = () => resolve(reader.result);
        reader.onerror = reject;
        reader.readAsDataURL(blob);
      });
      
      const img = new Image();
      img.src = imgData;
      await new Promise(resolve => { img.onload = resolve });
      
      // Calcular dimensiones manteniendo proporción
      const imgWidth = 60;
      const imgHeight = (img.height * imgWidth) / img.width;
      
      // Agregar imagen al PDF
      pdf.addImage(imgData, 'PNG', 75, 8, imgWidth, imgHeight);
      
      console.log(`✅ Logo cargado exitosamente: ${logoPath}`);
      return; // Salir si se carga exitosamente
      
    } catch (logoError) {
      console.warn(`⚠️ No se pudo cargar logo ${logoPath}:`, logoError);
      continue; // Intentar con el siguiente logo
    }
  }
  
  console.warn('⚠️ No se pudo cargar ningún logo, continuando sin logo');
}

// Función para crear HTML del comprobante (compatible con todas las estructuras)
function createReceiptHTML(student, payment) {
  const studentName = getStudentName(student);
  const studentNumber = getStudentNumber(student);
  const studentCourse = getStudentCourse(student);
  const paymentConcept = getPaymentConcept(payment);
  const paymentAmount = getPaymentAmount(payment);
  const paymentDate = getPaymentDate(payment);
  const systemName = detectSystemName();
  const logoSrc = getPublicCeevaLogoUrl();

  return `
    <div style="font-family: Arial, sans-serif; max-width: 800px; margin: 0 auto; padding: 20px;">
      <!-- Header limpio sin fondo de color -->
      <div style="text-align: center; margin-bottom: 30px; padding: 20px; border-bottom: 2px solid #333;">
        <img src="${logoSrc}" alt="Logo ${systemName}" style="max-width: 150px; height: auto; margin-bottom: 10px;" crossorigin="anonymous" onerror="this.style.display='none'">
        <h1 style="margin: 10px 0; color: #333; font-size: 24px;">${systemName}</h1>
        <h2 style="margin: 5px 0; color: #666; font-size: 18px;">Comprobante de Pago</h2>
      </div>

      <!-- Información del estudiante -->
      <div style="margin-bottom: 25px;">
        <h3 style="color: #333; border-bottom: 1px solid #ddd; padding-bottom: 5px;">Información del Estudiante</h3>
        <p><strong>Nombre:</strong> ${studentName}</p>
        <p><strong>Número de Estudiante:</strong> #${studentNumber}</p>
        <p><strong>Curso:</strong> ${studentCourse}</p>
      </div>

      <!-- Detalles del pago -->
      <div style="margin-bottom: 25px;">
        <h3 style="color: #333; border-bottom: 1px solid #ddd; padding-bottom: 5px;">Detalles del Pago</h3>
        <p><strong>Concepto:</strong> ${paymentConcept}</p>
        <p><strong>Monto:</strong> $${paymentAmount}</p>
        <p><strong>Fecha de Pago:</strong> ${paymentDate}</p>
        ${payment.reference ? `<p><strong>Referencia:</strong> ${payment.reference}</p>` : ''}
      </div>

      ${payment.debt_info ? `
      <!-- Información de deuda -->
      <div style="margin-bottom: 25px;">
        <h3 style="color: #333; border-bottom: 1px solid #ddd; padding-bottom: 5px;">Información de Deuda</h3>
        <p><strong>Deuda Total:</strong> $${payment.debt_info.total_debt?.toLocaleString('es-MX', { minimumFractionDigits: 2 }) || '0.00'}</p>
        <p><strong>Saldo Pendiente:</strong> $${payment.debt_info.remaining_debt?.toLocaleString('es-MX', { minimumFractionDigits: 2 }) || '0.00'}</p>
      </div>
      ` : ''}

      <!-- Footer -->
      <div style="text-align: center; margin-top: 40px; padding-top: 20px; border-top: 1px solid #ddd;">
        <p style="font-size: 12px; color: #666; font-style: italic;">
          Comprobante generado automáticamente - ${new Date().toLocaleDateString('es-MX')}
        </p>
      </div>
    </div>
  `;
}
