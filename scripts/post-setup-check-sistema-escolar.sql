-- ============================================================
-- POST-SETUP CHECK — Sistema Escolar MEV
-- ============================================================
-- Ejecutar DESPUÉS de correr database_setup.sql del sistema escolar.
-- 
-- USO desde Claude Code Desktop:
--   psql -f scripts/post-setup-check-sistema-escolar.sql
-- ============================================================

\echo ''
\echo '════════════════════════════════════════════════════════'
\echo '  POST-SETUP CHECK — Sistema Escolar'
\echo '════════════════════════════════════════════════════════'
\echo ''

-- ─── CHECK 1: 12 tablas creadas ─────────────────────────────
SELECT
  'Tablas creadas en schema public (>=12)' AS check_name,
  COUNT(*) AS valor,
  CASE WHEN COUNT(*) >= 12 THEN '✅ OK' ELSE '❌ FAIL' END AS resultado
FROM information_schema.tables
WHERE table_schema = 'public';

-- ─── CHECK 2: profiles existe ───────────────────────────────
SELECT
  'Tabla profiles existe' AS check_name,
  COUNT(*)::text AS valor,
  CASE WHEN COUNT(*) = 1 THEN '✅ OK' ELSE '❌ FAIL' END AS resultado
FROM information_schema.tables
WHERE table_schema = 'public' AND table_name = 'profiles';

-- ─── CHECK 3: students.address columna ──────────────────────
SELECT
  'students.address columna existe' AS check_name,
  COUNT(*)::text AS valor,
  CASE WHEN COUNT(*) = 1 THEN '✅ OK' ELSE '❌ FAIL' END AS resultado
FROM information_schema.columns
WHERE table_name = 'students' AND column_name = 'address';

-- ─── CHECK 4: students.birth_date columna ───────────────────
SELECT
  'students.birth_date columna existe' AS check_name,
  COUNT(*)::text AS valor,
  CASE WHEN COUNT(*) = 1 THEN '✅ OK' ELSE '❌ FAIL' END AS resultado
FROM information_schema.columns
WHERE table_name = 'students' AND column_name = 'birth_date';

-- ─── CHECK 5: schedule_id NULLABLE ──────────────────────────
SELECT
  'students.schedule_id NULLABLE' AS check_name,
  is_nullable AS valor,
  CASE WHEN is_nullable = 'YES' THEN '✅ OK' ELSE '❌ FAIL' END AS resultado
FROM information_schema.columns
WHERE table_name = 'students' AND column_name = 'schedule_id';

-- ─── CHECK 6: course NULLABLE ───────────────────────────────
SELECT
  'students.course NULLABLE' AS check_name,
  COALESCE(is_nullable, 'N/A') AS valor,
  CASE 
    WHEN is_nullable IS NULL THEN '⚠️ columna no existe (OK si modelo cambió)'
    WHEN is_nullable = 'YES' THEN '✅ OK' 
    ELSE '❌ FAIL' 
  END AS resultado
FROM information_schema.columns
WHERE table_name = 'students' AND column_name = 'course';

-- ─── CHECK 7: Trigger on_auth_user_created NO existe ────────
-- (regla MEV: lo eliminamos para evitar conflictos)
SELECT
  'Trigger on_auth_user_created eliminado' AS check_name,
  COUNT(*)::text AS valor,
  CASE WHEN COUNT(*) = 0 THEN '✅ OK' ELSE '❌ FAIL (debe NO existir)' END AS resultado
FROM information_schema.triggers
WHERE trigger_name = 'on_auth_user_created';

-- ─── CHECK 8: school_settings tiene datos ───────────────────
SELECT
  'school_settings con datos del cliente' AS check_name,
  COUNT(*)::text AS valor,
  CASE WHEN COUNT(*) >= 1 THEN '✅ OK' ELSE '❌ FAIL' END AS resultado
FROM school_settings;

-- ─── CHECK 9: school_settings NO contiene placeholder ───────
SELECT
  'school_settings NO tiene [NOMBRE_ESCUELA]' AS check_name,
  COUNT(*)::text AS valor,
  CASE WHEN COUNT(*) = 0 THEN '✅ OK' ELSE '❌ FAIL — actualizar manualmente' END AS resultado
FROM school_settings
WHERE school_name LIKE '%[NOMBRE_ESCUELA]%' 
   OR school_name LIKE '%NOMBRE_ESCUELA%';

-- ─── CHECK 10: RLS school_settings activo ───────────────────
SELECT
  'RLS school_settings activado' AS check_name,
  rowsecurity::text AS valor,
  CASE WHEN rowsecurity THEN '✅ OK' ELSE '❌ FAIL' END AS resultado
FROM pg_tables
WHERE tablename = 'school_settings' AND schemaname = 'public';

-- ─── CHECK 11: Admin profile existe (después de crear admin Auth) ───
SELECT
  'Admin profile con role=admin' AS check_name,
  COUNT(*)::text AS valor,
  CASE WHEN COUNT(*) >= 1 THEN '✅ OK' ELSE '⚠️ Crear admin en Auth + correr backfill' END AS resultado
FROM profiles
WHERE role = 'admin';

\echo ''
\echo '════════════════════════════════════════════════════════'
\echo '  Si TODO sale ✅, el sistema escolar está listo.'
\echo '  Si CHECK 11 sale ⚠️, crear admin en Supabase Auth'
\echo '  y volver a correr database_setup.sql (backfill).'
\echo '════════════════════════════════════════════════════════'
\echo ''

-- ============================================================================
-- CHECK 13: Cobertura de políticas RLS en TODAS las tablas
-- ============================================================================
-- Detecta tablas con RLS habilitado pero sin políticas SELECT.
-- Sin este check, frontend recibe null silenciosamente → dashboards vacíos.
-- ============================================================================
WITH tablas_sin_policy AS (
  SELECT c.relname as tabla
  FROM pg_class c
  LEFT JOIN pg_policy p ON p.polrelid = c.oid AND p.polcmd = 'r'
  WHERE c.relnamespace = 'public'::regnamespace
    AND c.relkind = 'r'
    AND c.relrowsecurity = true
  GROUP BY c.relname
  HAVING COUNT(p.oid) = 0
)
SELECT
  CASE
    WHEN COUNT(*) = 0 THEN '✅ CHECK 13: Todas las tablas con RLS tienen al menos 1 SELECT policy'
    ELSE '❌ FAIL CHECK 13: ' || COUNT(*) || ' tablas sin SELECT policy: ' || string_agg(tabla, ', ')
  END as resultado
FROM tablas_sin_policy;
