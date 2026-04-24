-- ========================================
-- TABLA STUDENT_NOTES - EXPEDIENTE DEL ALUMNO
-- ========================================
-- Sistema de gestión de notas y anotaciones para expedientes de estudiantes
-- Incluye categorización, marcado de importancia y registro de usuario
-- Compatible con estructura UUID (Polanco, Avanza Virtual) e INTEGER (Ciudad Obregón)

-- IMPORTANTE: Verifica el tipo de dato de students.id antes de ejecutar
-- Para UUID: Usa este script tal cual
-- Para INTEGER: Cambia 'UUID' por 'INTEGER' y 'gen_random_uuid()' por 'SERIAL'

CREATE TABLE IF NOT EXISTS student_notes (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  student_id UUID NOT NULL REFERENCES students(id) ON DELETE CASCADE,
  category VARCHAR(50) NOT NULL DEFAULT 'general',
  content TEXT NOT NULL,
  is_important BOOLEAN DEFAULT FALSE,
  created_by UUID REFERENCES profiles(id) ON DELETE SET NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Índices para mejorar el rendimiento de consultas
CREATE INDEX IF NOT EXISTS idx_student_notes_student_id ON student_notes(student_id);
CREATE INDEX IF NOT EXISTS idx_student_notes_created_at ON student_notes(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_student_notes_category ON student_notes(category);
CREATE INDEX IF NOT EXISTS idx_student_notes_is_important ON student_notes(is_important);
CREATE INDEX IF NOT EXISTS idx_student_notes_created_by ON student_notes(created_by);

-- Función para actualizar updated_at automáticamente
CREATE OR REPLACE FUNCTION update_student_notes_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = CURRENT_TIMESTAMP;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger que ejecuta la función en cada UPDATE
CREATE TRIGGER trigger_update_student_notes_updated_at
  BEFORE UPDATE ON student_notes
  FOR EACH ROW
  EXECUTE FUNCTION update_student_notes_updated_at();

-- Habilitar Row Level Security (RLS)
ALTER TABLE student_notes ENABLE ROW LEVEL SECURITY;

-- Política: Los usuarios autenticados pueden ver todas las notas
CREATE POLICY "Users can view all student notes"
  ON student_notes FOR SELECT
  TO authenticated
  USING (true);

-- Política: Los usuarios autenticados pueden crear notas
CREATE POLICY "Users can create student notes"
  ON student_notes FOR INSERT
  TO authenticated
  WITH CHECK (true);

-- Política: Los usuarios pueden actualizar sus propias notas
CREATE POLICY "Users can update their own student notes"
  ON student_notes FOR UPDATE
  TO authenticated
  USING (created_by = auth.uid());

-- Política: Solo admin puede eliminar notas
CREATE POLICY "Only admin can delete student notes"
  ON student_notes FOR DELETE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role = 'admin'
    )
  );

-- Comentarios para documentación de la tabla
COMMENT ON TABLE student_notes IS 'Tabla para almacenar notas y anotaciones del expediente de cada estudiante';
COMMENT ON COLUMN student_notes.id IS 'Identificador único de la nota';
COMMENT ON COLUMN student_notes.student_id IS 'ID del estudiante al que pertenece la nota';
COMMENT ON COLUMN student_notes.category IS 'Categoría de la nota: phone, agreement, payment, academic, general';
COMMENT ON COLUMN student_notes.content IS 'Contenido de la nota';
COMMENT ON COLUMN student_notes.is_important IS 'Indica si la nota está marcada como importante';
COMMENT ON COLUMN student_notes.created_by IS 'UUID del usuario que creó la nota';
COMMENT ON COLUMN student_notes.created_at IS 'Fecha y hora de creación';
COMMENT ON COLUMN student_notes.updated_at IS 'Fecha y hora de última actualización';
