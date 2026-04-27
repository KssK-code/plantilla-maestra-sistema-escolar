# Scripts del Sistema Escolar — Plantilla MEV

Esta carpeta contiene scripts utilitarios para el deploy y mantenimiento del sistema escolar.

> **Filosofía MEV:** El cliente NO toca nada técnico. Todo este setup lo realiza
> el equipo MEV (Kevin Serrano) ANTES de entregar el sistema al cliente.
> El cliente solo recibe URLs finales y credenciales de admin listas para usar.

---

## 🚀 deploy-edge-functions.sh

Despliega automáticamente todas las Edge Functions del repo a Supabase Cloud.

### Por qué existe

Sin este script, hay que ejecutar 4 comandos manualmente para cada cliente nuevo:
```bash
export SUPABASE_ACCESS_TOKEN="sbp_..."
npx supabase link --project-ref [REF]
npx supabase functions deploy user-management --no-verify-jwt
npx supabase functions deploy send-payment-receipt --no-verify-jwt
npx supabase functions deploy send-payment-receipt-v2 --no-verify-jwt
```

Sin las Edge Functions deployadas, el sistema escolar da error CORS al crear usuarios.

### Uso

```bash
# Opción 1: pasar token como argumento
./scripts/deploy-edge-functions.sh <PROJECT_REF> sbp_xxxxxxxxxxxxx

# Opción 2: usar variable de entorno
export SUPABASE_ACCESS_TOKEN="sbp_xxxxxxxxxxxxx"
./scripts/deploy-edge-functions.sh <PROJECT_REF>
```

### Dónde obtener los datos (solo MEV)

- **PROJECT_REF**: https://supabase.com/dashboard/project/<EL_REF_VA_AQUI>/settings/general
- **SUPABASE_ACCESS_TOKEN**: https://supabase.com/dashboard/account/tokens

### Cuándo ejecutarlo

Después de:
- Configurar el repo del sistema escolar del cliente
- Ejecutar database_setup.sql
- Antes del primer deploy a Netlify

---

## 🔄 Keep-Alive Supabase (.github/workflows/keep-alive.yml)

Workflow de GitHub Actions que pinguea Supabase cada 3 días para evitar
que el proyecto se pause por inactividad.

### Por qué existe

Free tier de Supabase pausa proyectos sin actividad después de 7 días.
Sin este workflow, el sistema del cliente queda offline y debe ser reactivado
manualmente desde el dashboard de Supabase.

### ⚙️ Setup obligatorio (lo hace MEV — NUNCA el cliente)

Este workflow viene incluido en la plantilla y se activa automáticamente al
clonar. Solo requiere agregar 2 secrets que MEV configura ANTES de entregar
el sistema al cliente:

**MEV hace estos pasos en cada combo:**

1. Ir a: `https://github.com/KssK-code/[REPO_CLIENTE]/settings/secrets/actions`

2. Click "New repository secret" y agregar:
   - **Name:** `SUPABASE_URL`
   - **Secret:** `https://[project-ref].supabase.co` (del `.env.local`)

3. Click "New repository secret" otra vez:
   - **Name:** `SUPABASE_ANON_KEY`
   - **Secret:** la anon key del `.env.local`

4. Validar que funciona:
   - Ir a `Actions` → `Keep Supabase Alive`
   - Click `Run workflow` → seleccionar branch `main` → `Run workflow`
   - Esperar 30 segundos y verificar check verde ✓

5. Repetir lo mismo en el repo de plataforma virtual del cliente

### El cliente NO toca esto

El cliente recibe el sistema con keep-alive YA configurado y funcionando.
El workflow corre solo, sin intervención humana, durante toda la vida del sistema.

### Tabla pinguada

El workflow pinguea la tabla `profiles` (existe en sistema escolar).
Si la tabla no existe en tu schema, modifica la línea del curl en el yml.

### Cron schedule

`30 12 */3 * *` = cada 3 días a las 12:30 UTC (6:30 AM México Centro).

Para sistema escolar usamos offset +30 min vs plataforma virtual para no
sobrecargar Supabase con pings simultáneos.

---

## 📋 Checklist de setup MEV para cliente nuevo

Después de crear el repo del cliente desde esta plantilla, MEV ejecuta:

- [ ] `database_setup.sql` con placeholders reemplazados
- [ ] Reemplazar `[NOMBRE_ESCUELA]` por nombre real del cliente en SQL
- [ ] `./scripts/deploy-edge-functions.sh <PROJECT_REF>`
- [ ] Configurar 2 secrets en GitHub (SUPABASE_URL + SUPABASE_ANON_KEY)
- [ ] Validar keep-alive con Run workflow manual
- [ ] Crear admin del cliente en Supabase Auth
- [ ] UPDATE profiles SET role='admin' para el admin
- [ ] Editar netlify.toml con vars reales
- [ ] Deploy a Netlify
- [ ] Smoke test final
- [ ] Generar PDF de entrega con logo cliente
- [ ] Enviar WhatsApp de bienvenida + Kit Marketing

**Solo después de los 12 puntos anteriores, el cliente recibe su sistema funcionando.**
