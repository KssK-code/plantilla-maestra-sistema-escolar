// EDGE FUNCTION TEMPLATE:// Supabase Edge Function para envío de emails - PLANTILLA MAESTRA
// Este código debe copiarse en tu proyecto de Supabase como Edge Function
// PERSONALIZAR: Cambiar el branding por el nombre de tu escuela

import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { Resend } from "npm:resend@2.0.0"

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
}

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const requestData = await req.json()
    console.log('📥 Received request data:', JSON.stringify(requestData, null, 2))
    
    const { student, payment, isReprint = false } = requestData
    const studentEmail = student.email
    const studentName = student.full_name || student.name || 
                       (student.first_name && student.last_name ? 
                        `${student.first_name} ${student.last_name}` : 'Estudiante');
    const amount = payment.amount
    const concept = payment.concept
    const paymentDate = payment.payment_date || payment.paid_date || new Date().toLocaleDateString('es-MX')
    const receiptNumber = payment.receipt_number
    const schoolName = Deno.env.get('SCHOOL_DISPLAY_NAME') ?? 'CEEVA'
    const debtAmount = payment.debt_amount || 0
    const debtDescription = payment.debt_description || ""

    if (!student || !payment) {
      console.error('❌ Missing data - student:', !!student, 'payment:', !!payment)
      throw new Error('Missing student or payment data')
    }

    if (!studentEmail) {
      console.error('❌ Student data:', JSON.stringify(student, null, 2))
      throw new Error('Student email is required')
    }
    
    console.log('✅ Data validation passed')
    
    console.log('👤 Student:', studentName, '- Email:', studentEmail)
    console.log('💰 Payment:', concept, '- Amount:', amount)

    const resend = new Resend(Deno.env.get('RESEND_API_KEY'))

    // Template HTML con lógica defensiva para adeudo
    const htmlTemplate = `
    <!DOCTYPE html>
    <html>
    <head>
        <meta charset="utf-8">
        <style>
            body { font-family: Arial, sans-serif; margin: 0; padding: 20px; background-color: #f5f5f5; }
            .container { max-width: 600px; margin: 0 auto; background: white; border-radius: 8px; overflow: hidden; box-shadow: 0 2px 10px rgba(0,0,0,0.1); }
            .header { background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; padding: 30px; text-align: center; }
            .content { padding: 30px; }
            .receipt-info { background: #f8f9fa; padding: 20px; border-radius: 8px; margin: 20px 0; }
            .amount { font-size: 24px; font-weight: bold; color: #28a745; text-align: center; margin: 20px 0; }
            .debt-section { background: #fff3cd; border: 1px solid #ffeaa7; padding: 15px; border-radius: 8px; margin: 20px 0; }
            .footer { background: #f8f9fa; padding: 20px; text-align: center; color: #666; }
        </style>
    </head>
    <body>
        <div class="container">
            <h1 style="margin: 0; font-size: 28px;">${schoolName}</h1>
          <p style="margin: 10px 0 0 0; opacity: 0.9;">Comprobante de Pago</p>
          ${isReprint ? `<div style="background: rgba(255,255,255,0.2); padding: 8px 16px; border-radius: 20px; margin-top: 10px; font-size: 14px; font-weight: bold;">📄 Re impresión de tu pago del día: ${paymentDate}</div>` : ''}
            </div>
            
            <div class="content">
                <h2>¡Pago Recibido Exitosamente!</h2>
                
                <div class="receipt-info">
                    <h2 style="color: #333; margin-top: 0;">Estimado/a ${studentName},</h2>
                    <p><strong>Concepto:</strong> ${concept}</p>
                    <p><strong>Fecha de Pago:</strong> ${paymentDate}</p>
                    <p><strong>No. de Recibo:</strong> ${receiptNumber}</p>
                </div>
                
                <div class="amount">
                    Monto Pagado: $${amount}
                </div>
                
                ${debtAmount > 0 ? `
                <div class="debt-section">
                    <h3>📋 Información de Adeudo</h3>
                    <p><strong>Adeudo Pendiente:</strong> $${debtAmount}</p>
                    ${debtDescription ? `<p><strong>Concepto:</strong> ${debtDescription}</p>` : ''}
                    <p><em>Este adeudo aparece únicamente como información. No afecta el pago registrado.</em></p>
                </div>
                ` : ''}
                
                <p>Gracias por tu pago. Este comprobante confirma que hemos recibido tu pago correctamente.</p>
                
                <p>Si tienes alguna pregunta, no dudes en contactarnos.</p>
            </div>
            
            <div class="footer">
                <p>${schoolName}</p>
                <p>Sistema de Gestión Educativa</p>
            </div>
        </div>
    </body>
    </html>
    `

    const { data, error } = await resend.emails.send({
      from: `${schoolName} <noreply@DOMINIO_ESCUELA.com>`, // PERSONALIZAR DOMINIO
      to: [studentEmail],
      subject: `Comprobante de Pago - ${concept}`,
      html: htmlTemplate,
    })

    if (error) {
      console.error('Error sending email:', error)
      return new Response(
        JSON.stringify({ error: error.message }),
        { 
          status: 400, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        }
      )
    }

    return new Response(
      JSON.stringify({ success: true, data }),
      { 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      }
    )

  } catch (error) {
    console.error('❌ Edge Function Error:', error)
    console.error('❌ Error stack:', error.stack)
    
    return new Response(
      JSON.stringify({ 
        error: error.message,
        details: error.stack,
        timestamp: new Date().toISOString()
      }),
      { 
        status: 500,
        headers: { 
          ...corsHeaders, 
          'Content-Type': 'application/json' 
        } 
      }
    )
  }
})

/* 
INSTRUCCIONES DE CONFIGURACIÓN:

1. Crear Edge Function en Supabase:
   - Ir a Edge Functions en dashboard
   - Crear nueva función: "send-payment-receipt"
   - Copiar este código completo

2. Personalizar variables:
   - NOMBRE_ESCUELA: Cambiar por nombre real
   - DOMINIO_ESCUELA: Cambiar por dominio verificado en Resend

3. Variables de entorno en Supabase:
   - RESEND_API_KEY: API key de Resend

4. Verificar dominio en Resend:
   - https://resend.com/domains
   - Agregar y verificar dominio antes de usar

5. Probar función:
   - Crear pago con adeudo
   - Verificar que llegue email con adeudo mostrado
*/
