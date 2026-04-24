-- SCRIPT SQL COMPLETO PARA PLANTILLA MAESTRA
-- Incluye todas las mejoras de Avanza Virtual
-- Ejecutar después del database_setup.sql básico

-- 1. Agregar columnas de adeudo a pagos
ALTER TABLE payments ADD COLUMN IF NOT EXISTS debt_amount DECIMAL(10,2) DEFAULT 0;
ALTER TABLE payments ADD COLUMN IF NOT EXISTS debt_description TEXT;

-- 2. Actualizar políticas RLS para recepcionista en cash_cuts
DROP POLICY IF EXISTS "cash_cuts_select_policy" ON cash_cuts;
DROP POLICY IF EXISTS "cash_cuts_insert_policy" ON cash_cuts;
DROP POLICY IF EXISTS "cash_cuts_update_policy" ON cash_cuts;
DROP POLICY IF EXISTS "cash_cuts_delete_policy" ON cash_cuts;

CREATE POLICY "cash_cuts_select_policy" ON cash_cuts FOR SELECT USING (
  auth.jwt() ->> 'role' IN ('admin', 'recepcionista')
);

CREATE POLICY "cash_cuts_insert_policy" ON cash_cuts FOR INSERT WITH CHECK (
  auth.jwt() ->> 'role' IN ('admin', 'recepcionista')
);

CREATE POLICY "cash_cuts_update_policy" ON cash_cuts FOR UPDATE USING (
  auth.jwt() ->> 'role' IN ('admin', 'recepcionista')
);

CREATE POLICY "cash_cuts_delete_policy" ON cash_cuts FOR DELETE USING (
  auth.jwt() ->> 'role' = 'admin'
);

-- 3. Asegurar que payment_date sea el campo correcto (no paid_date)
-- Si existe paid_date, migrar datos y eliminar columna
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'payments' AND column_name = 'paid_date') THEN
    UPDATE payments SET payment_date = paid_date WHERE payment_date IS NULL AND paid_date IS NOT NULL;
    ALTER TABLE payments DROP COLUMN paid_date;
  END IF;
END $$;

-- 4. Verificar estructura de estudiantes (usar full_name)
ALTER TABLE students ADD COLUMN IF NOT EXISTS full_name TEXT;
UPDATE students SET full_name = name WHERE full_name IS NULL OR full_name = '';

-- 5. Comentarios para Edge Functions necesarias
/*
EDGE FUNCTIONS REQUERIDAS:

1. send-payment-receipt
   - Envío de comprobantes de pago por email
   - Incluye lógica para mostrar adeudo si existe
   - Usar plantilla HTML con branding personalizable

2. user-management (opcional)
   - Si se requiere gestión avanzada de usuarios
   - Alternativa: usar Supabase JS directamente
*/

-- 6. Datos de ejemplo para testing rápido
INSERT INTO payment_concepts (name, amount, description) VALUES 
('Colegiatura', 1500.00, 'Pago mensual de colegiatura'),
('Inscripción', 500.00, 'Pago único de inscripción')
ON CONFLICT (name) DO NOTHING;

-- Script completado
SELECT 'Base de datos actualizada con todas las mejoras de la plantilla maestra' as status;
