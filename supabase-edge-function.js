// Supabase Edge Function para envío de emails
// Este código debe copiarse en tu proyecto de Supabase como Edge Function

import { serve } from "https://deno.land/std@0.168.0/http/server.ts"

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const { student, payment } = await req.json()

    if (!student || !payment) {
      throw new Error('Missing student or payment data')
    }

    if (!student.email) {
      throw new Error('Student email is required')
    }

    const schoolDisplayName = Deno.env.get('SCHOOL_DISPLAY_NAME') ?? 'CEEVA'

    // Try multiple logo sources for better compatibility
    const logoUrl = 'https://gvrgepdjxzhgqkmtwcvs.supabase.co/storage/v1/object/public/schoolassets/logo.png'
    const fallbackLogoUrl = 'https://via.placeholder.com/80x80/667eea/ffffff?text=[INICIALES]'
    
    // Create logo HTML with fallback
    const logoHtml = `
      <div style="margin-bottom: 15px;">
        <img src="${logoUrl}" alt="Logo Avanza" 
             style="max-width: 80px; max-height: 80px; border-radius: 8px; display: block; margin: 0 auto;" 
             onerror="this.onerror=null; this.src='${fallbackLogoUrl}'; this.style.backgroundColor='#667eea'; this.style.padding='10px';">
      </div>`
    
    // Check if payment has debt amount to display
    const hasDebt = payment.debt_amount && parseFloat(payment.debt_amount) > 0

    // Create email HTML
    const receiptHtml = `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; background-color: #f9f9f9;">
        <div style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); padding: 30px; text-align: center; color: white; border-radius: 10px 10px 0 0;">
          ${logoHtml}
          <h1 style="margin: 0; font-size: 28px;">${schoolDisplayName}</h1>
          <p style="margin: 10px 0 0 0; opacity: 0.9;">Comprobante de Pago</p>
        </div>
        <div style="background: white; padding: 30px; border-radius: 0 0 10px 10px; box-shadow: 0 4px 6px rgba(0,0,0,0.1);">
          <h2 style="color: #333; margin-top: 0;">Estimado/a ${student.name},</h2>
          <p style="color: #666; line-height: 1.6;">Hemos recibido su pago correctamente. A continuación los detalles:</p>
          
          <div style="background: #f8f9fa; padding: 20px; border-radius: 8px; margin: 20px 0;">
            <table style="width: 100%; border-collapse: collapse;">
              <tr><td style="padding: 8px 0; font-weight: bold; color: #333;">Concepto:</td><td style="padding: 8px 0; color: #666;">${payment.concept}</td></tr>
              <tr><td style="padding: 8px 0; font-weight: bold; color: #333;">Monto:</td><td style="padding: 8px 0; color: #666;">$${payment.amount}</td></tr>
              <tr><td style="padding: 8px 0; font-weight: bold; color: #333;">Fecha de Pago:</td><td style="padding: 8px 0; color: #666;">${payment.paid_date || new Date().toLocaleDateString('es-MX')}</td></tr>
              <tr><td style="padding: 8px 0; font-weight: bold; color: #333;">Estado:</td><td style="padding: 8px 0; color: #28a745; font-weight: bold;">PAGADO</td></tr>
            </table>
          </div>
          
          ${hasDebt ? `
          <div style="background: #fff3cd; border: 1px solid #ffeaa7; padding: 20px; border-radius: 8px; margin: 20px 0;">
            <h3 style="color: #856404; margin-top: 0; margin-bottom: 15px; font-size: 18px;">💰 Información de Adeudo</h3>
            <table style="width: 100%; border-collapse: collapse;">
              <tr><td style="padding: 12px 0; font-weight: bold; color: #856404; font-size: 16px;">Adeudo:</td><td style="padding: 12px 0; color: #856404; font-weight: bold; font-size: 16px;">$${payment.debt_amount}</td></tr>
            </table>
          </div>
          ` : ''}
          
          <p style="color: #666; line-height: 1.6;">Gracias por su pago puntual. Si tiene alguna pregunta, no dude en contactarnos.</p>
          
          <div style="text-align: center; margin-top: 30px; padding-top: 20px; border-top: 1px solid #eee;">
            <p style="color: #999; font-size: 14px; margin: 0;">${schoolDisplayName}</p>
            <p style="color: #999; font-size: 14px; margin: 5px 0 0 0;">Comprobante generado automáticamente</p>
          </div>
        </div>
      </div>
    `;

    // Send email via Resend API
    const emailResponse = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${Deno.env.get('RESEND_API_KEY')}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        from: 'admin@[DOMINIO_ESCUELA]',
        to: [student.email],
        subject: `Comprobante de Pago - ${payment.concept}`,
        html: receiptHtml,
        reply_to: 'admin@[DOMINIO_ESCUELA]',
      }),
    })

    if (!emailResponse.ok) {
      const errorData = await emailResponse.json()
      console.error('❌ Resend API Error:', errorData)
      throw new Error(errorData.message || 'Error al enviar el email')
    }

    const result = await emailResponse.json()
    console.log('✅ Email sent successfully:', result)
    
    return new Response(
      JSON.stringify({ success: true, data: result }),
      { 
        headers: { 
          ...corsHeaders, 
          'Content-Type': 'application/json' 
        } 
      }
    )

  } catch (error) {
    return new Response(
      JSON.stringify({ error: error.message }),
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
