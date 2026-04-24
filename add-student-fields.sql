-- Agregar campos de dirección y fecha de nacimiento a la tabla students

-- Agregar columna de dirección
ALTER TABLE students 
ADD COLUMN address TEXT;

-- Agregar columna de fecha de nacimiento
ALTER TABLE students 
ADD COLUMN birth_date DATE;

-- Agregar comentarios para documentar las columnas
COMMENT ON COLUMN students.address IS 'Dirección completa del estudiante';
COMMENT ON COLUMN students.birth_date IS 'Fecha de nacimiento del estudiante';

-- Verificar que las columnas se agregaron correctamente
SELECT column_name, data_type, is_nullable 
FROM information_schema.columns 
WHERE table_name = 'students' 
AND column_name IN ('address', 'birth_date')
ORDER BY column_name;
