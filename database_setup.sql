-- [NOMBRE_ESCUELA] - Sistema de Control Escolar - Database Schema
-- NOTA: el placeholder [NOMBRE_ESCUELA] es reemplazado automaticamente por mev-deploy.sh
-- Zapopan, Jalisco
-- Execute this SQL in your Supabase SQL Editor

-- Create profiles table for user management
CREATE TABLE IF NOT EXISTS profiles (
    id UUID REFERENCES auth.users(id) ON DELETE CASCADE PRIMARY KEY,
    full_name TEXT,
    email TEXT,
    role TEXT DEFAULT 'user',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create school_settings table
CREATE TABLE IF NOT EXISTS school_settings (
    id SERIAL PRIMARY KEY,
    school_name TEXT DEFAULT 'Mi Instituto',
    school_address TEXT,
    school_phone TEXT,
    school_email TEXT,
    logo_url TEXT,
    primary_color TEXT DEFAULT '225, 100%, 13%',
    background_theme TEXT DEFAULT 'default',
    notifications_overdue_payments BOOLEAN DEFAULT true,
    notifications_upcoming_payments BOOLEAN DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create courses table
CREATE TABLE IF NOT EXISTS courses (
    id SERIAL PRIMARY KEY,
    name TEXT NOT NULL,
    description TEXT,
    duration TEXT,
    price DECIMAL(10,2),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create schedules table
CREATE TABLE IF NOT EXISTS schedules (
    id SERIAL PRIMARY KEY,
    course_id INTEGER REFERENCES courses(id) ON DELETE CASCADE,
    day_of_week INTEGER NOT NULL, -- 0=Sunday, 1=Monday, etc.
    start_time TIME NOT NULL,
    end_time TIME NOT NULL,
    location TEXT,
    instructor TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create students table
CREATE TABLE IF NOT EXISTS students (
    id SERIAL PRIMARY KEY,
    name TEXT NOT NULL,
    email TEXT,
    phone TEXT,
    course TEXT,
    status TEXT DEFAULT 'active', -- active, inactive, graduated, suspended
    status_notes TEXT,
    enrollment_date DATE DEFAULT CURRENT_DATE,
    schedule_id INTEGER REFERENCES schedules(id) ON DELETE SET NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create payments table
CREATE TABLE IF NOT EXISTS payments (
    id SERIAL PRIMARY KEY,
    student_id INTEGER REFERENCES students(id) ON DELETE CASCADE,
    amount DECIMAL(10,2) NOT NULL,
    concept TEXT NOT NULL,
    status TEXT DEFAULT 'pending', -- pending, paid, overdue
    due_date DATE,
    paid_date DATE,
    created_date DATE DEFAULT CURRENT_DATE,
    debt_amount DECIMAL(10,2),
    cash_cut_id INTEGER,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create payment_concepts table
CREATE TABLE IF NOT EXISTS payment_concepts (
    id SERIAL PRIMARY KEY,
    name VARCHAR(100) NOT NULL UNIQUE,
    active BOOLEAN DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create cash_cuts table
CREATE TABLE IF NOT EXISTS cash_cuts (
    id SERIAL PRIMARY KEY,
    cut_number INTEGER NOT NULL,
    start_date DATE NOT NULL,
    end_date DATE NOT NULL,
    total_amount DECIMAL(10,2) NOT NULL,
    payment_count INTEGER NOT NULL,
    details JSONB, -- Store breakdown and payment IDs
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create document_templates table
CREATE TABLE IF NOT EXISTS document_templates (
    id SERIAL PRIMARY KEY,
    name TEXT NOT NULL,
    type TEXT NOT NULL, -- certificate, diploma, transcript, etc.
    content TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create issued_documents table
CREATE TABLE IF NOT EXISTS issued_documents (
    id SERIAL PRIMARY KEY,
    student_id INTEGER REFERENCES students(id) ON DELETE CASCADE,
    template_id INTEGER REFERENCES document_templates(id) ON DELETE CASCADE,
    document_type TEXT NOT NULL,
    status TEXT DEFAULT 'issued', -- issued, revoked
    folio TEXT UNIQUE NOT NULL,
    issue_date TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create attendance table
CREATE TABLE IF NOT EXISTS attendance (
    id SERIAL PRIMARY KEY,
    student_id INTEGER REFERENCES students(id) ON DELETE CASCADE,
    schedule_id INTEGER REFERENCES schedules(id) ON DELETE CASCADE,
    date DATE NOT NULL,
    status TEXT DEFAULT 'present', -- present, absent, late
    notes TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(student_id, schedule_id, date)
);

-- Create audit_log table
CREATE TABLE IF NOT EXISTS audit_log (
    id SERIAL PRIMARY KEY,
    user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
    action TEXT NOT NULL,
    table_name TEXT,
    record_id INTEGER,
    old_values JSONB,
    new_values JSONB,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_students_status ON students(status);
CREATE INDEX IF NOT EXISTS idx_students_course ON students(course);
CREATE INDEX IF NOT EXISTS idx_payments_student_id ON payments(student_id);
CREATE INDEX IF NOT EXISTS idx_payments_status ON payments(status);
CREATE INDEX IF NOT EXISTS idx_payments_due_date ON payments(due_date);
CREATE INDEX IF NOT EXISTS idx_schedules_course_id ON schedules(course_id);
CREATE INDEX IF NOT EXISTS idx_attendance_student_schedule ON attendance(student_id, schedule_id);
CREATE INDEX IF NOT EXISTS idx_audit_log_created_at ON audit_log(created_at);

-- Insert default school settings
INSERT INTO school_settings (
    school_name, 
    school_email,
    notifications_overdue_payments,
    notifications_upcoming_payments
) VALUES (
    '[NOMBRE_ESCUELA]',
    'admin@[DOMINIO_ESCUELA]',
    true,
    true
) ON CONFLICT DO NOTHING;

-- ============================================================================
-- DEPRECATED: cursos demo CEVM eliminados (27-abr-2026)
-- ============================================================================
-- Razon: este seed insertaba cursos hardcoded de CEVM que no aplican a clientes
-- nuevos. Cada cliente crea sus propios cursos desde el panel admin del sistema
-- escolar. Los placeholders genericos contaminaban la marca de cada cliente.
-- ============================================================================

-- Enable Row Level Security on all tables
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE school_settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE courses ENABLE ROW LEVEL SECURITY;
ALTER TABLE schedules ENABLE ROW LEVEL SECURITY;
ALTER TABLE students ENABLE ROW LEVEL SECURITY;
ALTER TABLE payments ENABLE ROW LEVEL SECURITY;
ALTER TABLE cash_cuts ENABLE ROW LEVEL SECURITY;
ALTER TABLE document_templates ENABLE ROW LEVEL SECURITY;
ALTER TABLE issued_documents ENABLE ROW LEVEL SECURITY;
ALTER TABLE attendance ENABLE ROW LEVEL SECURITY;
ALTER TABLE audit_log ENABLE ROW LEVEL SECURITY;

-- Create RLS policies (allow authenticated users to access all data for now)
-- You can make these more restrictive based on roles later

-- Profiles policies
CREATE POLICY "Users can view all profiles" ON profiles FOR SELECT USING (auth.role() = 'authenticated');
CREATE POLICY "Users can update own profile" ON profiles FOR UPDATE USING (auth.uid() = id);

-- School settings policies
CREATE POLICY "Public can read school settings" ON school_settings FOR SELECT USING (true);
CREATE POLICY "Users can update school settings" ON school_settings FOR UPDATE USING (auth.role() = 'authenticated');

-- General policies for other tables (allow all operations for authenticated users)
CREATE POLICY "Authenticated users can access courses" ON courses FOR ALL USING (auth.role() = 'authenticated');
CREATE POLICY "Authenticated users can access schedules" ON schedules FOR ALL USING (auth.role() = 'authenticated');
CREATE POLICY "Authenticated users can access students" ON students FOR ALL USING (auth.role() = 'authenticated');
CREATE POLICY "Authenticated users can access payments" ON payments FOR ALL USING (auth.role() = 'authenticated');
CREATE POLICY "Authenticated users can access cash_cuts" ON cash_cuts FOR ALL USING (auth.role() = 'authenticated');
CREATE POLICY "Authenticated users can access document_templates" ON document_templates FOR ALL USING (auth.role() = 'authenticated');
CREATE POLICY "Authenticated users can access issued_documents" ON issued_documents FOR ALL USING (auth.role() = 'authenticated');
CREATE POLICY "Authenticated users can access attendance" ON attendance FOR ALL USING (auth.role() = 'authenticated');
CREATE POLICY "Authenticated users can access audit_log" ON audit_log FOR ALL USING (auth.role() = 'authenticated');

-- Create function to handle user profile creation
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
    INSERT INTO public.profiles (id, full_name, email)
    VALUES (new.id, new.raw_user_meta_data->>'full_name', new.email);
    RETURN new;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create trigger for new user registration
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
    AFTER INSERT ON auth.users
    FOR EACH ROW EXECUTE PROCEDURE public.handle_new_user();

-- Create function to update timestamps
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Add update triggers to all tables
CREATE TRIGGER update_profiles_updated_at BEFORE UPDATE ON profiles FOR EACH ROW EXECUTE PROCEDURE update_updated_at_column();
CREATE TRIGGER update_school_settings_updated_at BEFORE UPDATE ON school_settings FOR EACH ROW EXECUTE PROCEDURE update_updated_at_column();
CREATE TRIGGER update_courses_updated_at BEFORE UPDATE ON courses FOR EACH ROW EXECUTE PROCEDURE update_updated_at_column();
CREATE TRIGGER update_schedules_updated_at BEFORE UPDATE ON schedules FOR EACH ROW EXECUTE PROCEDURE update_updated_at_column();
CREATE TRIGGER update_students_updated_at BEFORE UPDATE ON students FOR EACH ROW EXECUTE PROCEDURE update_updated_at_column();
CREATE TRIGGER update_payments_updated_at BEFORE UPDATE ON payments FOR EACH ROW EXECUTE PROCEDURE update_updated_at_column();
CREATE TRIGGER update_payment_concepts_updated_at BEFORE UPDATE ON payment_concepts FOR EACH ROW EXECUTE PROCEDURE update_updated_at_column();
CREATE TRIGGER update_cash_cuts_updated_at BEFORE UPDATE ON cash_cuts FOR EACH ROW EXECUTE PROCEDURE update_updated_at_column();
CREATE TRIGGER update_document_templates_updated_at BEFORE UPDATE ON document_templates FOR EACH ROW EXECUTE PROCEDURE update_updated_at_column();
CREATE TRIGGER update_issued_documents_updated_at BEFORE UPDATE ON issued_documents FOR EACH ROW EXECUTE PROCEDURE update_updated_at_column();
CREATE TRIGGER update_attendance_updated_at BEFORE UPDATE ON attendance FOR EACH ROW EXECUTE PROCEDURE update_updated_at_column();

-- Insert universal payment concepts (aplican a cualquier instituto)
-- Cada cliente puede agregar mas desde el panel admin segun su oferta educativa
INSERT INTO payment_concepts (name, active) VALUES 
('Inscripción', true),
('Re inscripción', true),
('Mensualidad', true),
('Certificación', true),
('Examen Extraordinario', true),
('Constancia', true),
('Credencial', true),
('Material didáctico', true)
ON CONFLICT (name) DO NOTHING;

-- Grant necessary permissions
GRANT USAGE ON ALL SEQUENCES IN SCHEMA public TO anon, authenticated;
GRANT ALL ON ALL TABLES IN SCHEMA public TO anon, authenticated;
GRANT ALL ON ALL ROUTINES IN SCHEMA public TO anon, authenticated;

-- Success message
SELECT 'Database schema created successfully! You can now use your school management system.' as status;

-- ============================================================
-- FIXES OBLIGATORIOS (evitan bugs en cada cliente nuevo)
-- ============================================================

-- 1. Columna student_number (siempre falta en schema base)
ALTER TABLE public.students
ADD COLUMN IF NOT EXISTS student_number TEXT;

-- 2. FK students → courses (PostgREST la necesita para joins)
ALTER TABLE public.students
ADD COLUMN IF NOT EXISTS course_id INTEGER REFERENCES public.courses(id);

-- 3. FK schedules → courses (ya existe pero por si acaso)
ALTER TABLE public.schedules
ADD COLUMN IF NOT EXISTS course_id INTEGER REFERENCES public.courses(id);

-- 4. schedule_id nullable (el form no siempre lo tiene)
ALTER TABLE public.students
ALTER COLUMN schedule_id DROP NOT NULL;

-- 5. course nullable (campo legacy, no siempre se llena)
ALTER TABLE public.students
ALTER COLUMN course DROP NOT NULL;

-- 6. Recargar schema cache de PostgREST
NOTIFY pgrst, 'reload schema';

-- 8. Columna teacher en courses
ALTER TABLE public.courses ADD COLUMN IF NOT EXISTS teacher TEXT;

-- 9. Columnas de fechas en schedules
ALTER TABLE public.schedules ADD COLUMN IF NOT EXISTS start_date DATE;
ALTER TABLE public.schedules ADD COLUMN IF NOT EXISTS end_date DATE;

-- 10. Columnas address y birth_date en students (el form siempre las envía)
-- Bug detectado en IVIP: PostgREST devuelve 400 PGRST204 si la columna no existe
ALTER TABLE public.students ADD COLUMN IF NOT EXISTS address TEXT;
ALTER TABLE public.students ADD COLUMN IF NOT EXISTS birth_date DATE;

-- 11. Unique constraint student_number (manejo de duplicados en frontend)
DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'students_student_number_key'
  ) THEN
    ALTER TABLE public.students ADD CONSTRAINT students_student_number_key UNIQUE (student_number);
  END IF;
END $$;

-- ============================================================

-- ============================================================================
-- LIMPIEZA FINAL (debe ser la ULTIMA sentencia del archivo)
-- ============================================================================
-- Eliminar trigger duplicado del sistema escolar para evitar conflicto
-- con el trigger de la plataforma virtual cuando comparten Supabase.
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;


-- ============================================================
-- BACKFILL ADMIN — Idempotente
-- ============================================================
-- Caso típico: el admin se crea en Supabase Auth dashboard
-- ANTES de correr este script. El trigger on_auth_user_created
-- aún no existe en ese momento → no dispara → admin queda sin
-- profile y no puede entrar al sistema.
--
-- Este bloque inserta profile para CUALQUIER usuario de
-- auth.users que aún no tenga uno, asignando role='admin'
-- al primer usuario encontrado.
--
-- Es idempotente: se puede correr N veces sin efectos adversos.
-- Bug detectado en cliente IVIP (Instituto Virtual Internacional
-- del Pacífico). Fix propagado a plantilla maestra.
-- ============================================================

INSERT INTO profiles (id, email, role, full_name)
SELECT
  u.id,
  u.email,
  'admin'::text,
  COALESCE(u.raw_user_meta_data->>'full_name', 'Administrador')::text
FROM auth.users u
LEFT JOIN profiles p ON p.id = u.id
WHERE p.id IS NULL;

-- Promover a admin al primer usuario si existen perfiles sin admin
UPDATE profiles
SET role = 'admin'
WHERE id = (
  SELECT id FROM profiles
  ORDER BY created_at ASC
  LIMIT 1
)
AND NOT EXISTS (SELECT 1 FROM profiles WHERE role = 'admin');

-- ============================================================================
-- RLS POLICIES — FIX SANTA BARBARA 28-abr-2026
-- ============================================================================
-- 9 tablas tenían RLS habilitado pero políticas FOR ALL con auth.role()
-- deprecado, sin distinción admin/staff para tablas sensibles.
-- Síntoma: frontend puede recibir null silenciosamente → dashboards vacíos.
-- Detectado en cliente Santa Barbara (28-abr-2026).
-- Patrón idéntico al bug RLS de plantilla virtual (mergeado mismo día).
-- ============================================================================

-- Función is_admin() con SECURITY DEFINER (evita recursión RLS)
CREATE OR REPLACE FUNCTION public.is_admin()
RETURNS BOOLEAN
LANGUAGE sql
SECURITY DEFINER
STABLE
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.profiles
    WHERE id = auth.uid() AND role = 'admin'
  );
$$;

GRANT EXECUTE ON FUNCTION public.is_admin() TO authenticated;

-- Grupo A: tablas operativas (staff puede ver todo)
DROP POLICY IF EXISTS "students: lectura" ON public.students;
CREATE POLICY "students: lectura" ON public.students
FOR SELECT TO authenticated USING (true);

DROP POLICY IF EXISTS "attendance: lectura" ON public.attendance;
CREATE POLICY "attendance: lectura" ON public.attendance
FOR SELECT TO authenticated USING (true);

DROP POLICY IF EXISTS "schedules: lectura" ON public.schedules;
CREATE POLICY "schedules: lectura" ON public.schedules
FOR SELECT TO authenticated USING (true);

DROP POLICY IF EXISTS "courses: lectura" ON public.courses;
CREATE POLICY "courses: lectura" ON public.courses
FOR SELECT TO authenticated USING (true);

DROP POLICY IF EXISTS "document_templates: lectura" ON public.document_templates;
CREATE POLICY "document_templates: lectura" ON public.document_templates
FOR SELECT TO authenticated USING (true);

DROP POLICY IF EXISTS "issued_documents: lectura" ON public.issued_documents;
CREATE POLICY "issued_documents: lectura" ON public.issued_documents
FOR SELECT TO authenticated USING (true);

-- Grupo B: tablas sensibles (solo admin)
DROP POLICY IF EXISTS "audit_log: admin lee" ON public.audit_log;
CREATE POLICY "audit_log: admin lee" ON public.audit_log
FOR SELECT TO authenticated USING (public.is_admin());

DROP POLICY IF EXISTS "cash_cuts: admin lee" ON public.cash_cuts;
CREATE POLICY "cash_cuts: admin lee" ON public.cash_cuts
FOR SELECT TO authenticated USING (public.is_admin());

DROP POLICY IF EXISTS "payments: admin lee" ON public.payments;
CREATE POLICY "payments: admin lee" ON public.payments
FOR SELECT TO authenticated USING (public.is_admin());
