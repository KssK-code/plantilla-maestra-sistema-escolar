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
