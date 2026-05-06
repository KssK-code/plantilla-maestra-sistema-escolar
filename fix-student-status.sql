-- ═══════════════════════════════════════════════════════
-- ⚠️ ESTE FIX YA ESTÁ MERGEADO EN database_setup.sql (5-may-2026)
-- ═══════════════════════════════════════════════════════
--
-- Este archivo se mantiene como migration script para clientes existentes
-- que fueron desplegados ANTES del 5-may-2026 y NO tienen la columna
-- status_change_date en su tabla students.
--
-- Para verificar si tu cliente está afectado:
--   SELECT EXISTS (
--     SELECT 1 FROM information_schema.columns
--     WHERE table_name = 'students' AND column_name = 'status_change_date'
--   );
--   -- true  = sano (NO ejecutar este script)
--   -- false = afectado (SÍ ejecutar este script)
--
-- ⚠️ Nota: el ALTER TABLE de abajo NO usa IF NOT EXISTS — fallará en clientes
-- nuevos post-5-may-2026 que ya tienen la columna desde database_setup.sql.
-- Eso es intencional: el script es solo para clientes legacy.
--
-- Bug 34 documentado en mev-tools/PLAYBOOK-BUGS-CONOCIDOS.md.
-- Cliente trigger: ONCA ACADEMY (#15). Vivido también en EDUXA (#12).
-- ═══════════════════════════════════════════════════════

-- Fix para columna faltante en tabla students
-- Agregar columna status_change_date para manejar cambios de estatus

-- Agregar columna status_change_date
ALTER TABLE students
ADD COLUMN status_change_date TIMESTAMP WITH TIME ZONE DEFAULT NOW();

-- Comentario sobre la columna
COMMENT ON COLUMN students.status_change_date IS 'Fecha del último cambio de estatus del estudiante';

-- Actualizar registros existentes con la fecha actual
UPDATE students 
SET status_change_date = NOW() 
WHERE status_change_date IS NULL;

-- Verificar que la columna se agregó correctamente
SELECT column_name, data_type, is_nullable 
FROM information_schema.columns 
WHERE table_name = 'students' 
AND column_name = 'status_change_date';
