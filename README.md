# 🎓 CEVM - Sistema de Gestión Educativa

Sistema integral de gestión educativa para **CEVM** (Centro de Estudios Virtual de México) en Zapopan, Jalisco.

## 🏫 Acerca de CEVM

Sistema desarrollado para optimizar la administración educativa, gestión de alumnos, pagos, y comunicación institucional.

**Ubicación:** Zapopan, Jalisco, México

## ✨ Características Principales

### 📊 Gestión Administrativa
- **Dashboard Interactivo** - Métricas en tiempo real
- **Usuarios y Permisos** - Control de acceso por roles (Admin/Recepcionista)
- **Configuración Institucional** - Personalización del sistema

### 👥 Gestión de Alumnos
- **Registro Completo** - Datos personales, contacto, y académicos
- **Búsqueda Avanzada** - Localización rápida de estudiantes
- **Expediente Digital** - Historial académico y pagos
- **Estado de Cuenta** - Consulta detallada por alumno

### 💰 Gestión de Pagos
- **Registro de Pagos** - Con conceptos personalizables
- **Vista por Bloques Mensuales** - Organización temporal
- **Comprobantes Automáticos** - Envío por email
- **Reimpresión** - Descarga de comprobantes en PDF
- **Corte de Caja** - Control de ingresos diarios

### 📚 Gestión Académica
- **Cursos** - Administración de programas educativos
- **Horarios** - Gestión de grupos y horarios
- **Conceptos de Pago** - Personalización de conceptos

### 📈 Reportes
- **Reporte de Inscripciones** - Lista completa en PDF
- **Reportes por Concepto** - Análisis de pagos
- **Exportación** - Documentos listos para imprimir

## 🛠️ Stack Tecnológico

- **Frontend:** React 18 + Vite
- **UI/UX:** Tailwind CSS + shadcn/ui + Framer Motion
- **Backend:** Supabase (Auth + Database + Edge Functions)
- **Emails:** Resend API
- **PDF:** jsPDF + jsPDF-AutoTable
- **Deployment:** Netlify

## 🚀 Instalación y Configuración

### Requisitos Previos
- Node.js 18.19.0 o superior
- npm 9.0.0 o superior
- Cuenta en Supabase
- Cuenta en Netlify
- Cuenta en Resend (para emails)

### Paso 1: Clonar e Instalar
```bash
git clone [URL-DEL-REPOSITORIO]
cd cevm-sistema-virtual
npm install
```

### Paso 2: Configurar Variables de Entorno
```bash
# Copiar el template
cp .env.template .env

# Editar .env con tus credenciales
# IMPORTANTE: Completa todos los campos marcados con [TU-...]
```

### Paso 3: Configurar Supabase
1. Crear nuevo proyecto en [supabase.com](https://supabase.com)
2. Ejecutar el script SQL: `database_setup.sql`
3. Configurar Edge Functions para envío de emails
4. Copiar URL y Anon Key al archivo `.env`

### Paso 4: Configurar Resend
1. Crear cuenta en [resend.com](https://resend.com)
2. Verificar dominio o usar dominio compartido
3. Generar API Key
4. Agregar al archivo `.env`

### Paso 5: Desarrollo Local
```bash
npm run dev
```

El sistema estará disponible en: `http://localhost:5173`

### Paso 6: Desplegar en Netlify
```bash
npm run build
```

Conectar repositorio en Netlify y configurar las variables de entorno.

## 📋 Configuración Inicial

### Crear Usuario Administrador
1. Acceder al sistema
2. Registrarse con email institucional
3. El primer usuario será Admin automáticamente

### Configurar Datos de la Escuela
1. Ir a "Ajustes"
2. Completar información institucional
3. Subir logo (opcional)

## 📖 Documentación Adicional

- `DESPLIEGUE-COMPLETO-PLUG-AND-PLAY.md` - Guía completa de despliegue
- `DATABASE-SCHEMA-GUIDE.md` - Estructura de base de datos
- `ERRORES-COMUNES-Y-SOLUCIONES.md` - Troubleshooting

## 🔒 Seguridad

- ✅ Autenticación con Supabase Auth
- ✅ Row Level Security (RLS) en base de datos
- ✅ Variables de entorno protegidas
- ✅ HTTPS en producción
- ✅ Validación de permisos por rol

## 📞 Soporte

Para soporte técnico o consultas:
- **Email:** [correo-soporte@cevm.edu.mx]
- **Sistema:** CEVM - Zapopan, Jalisco

## 📄 Licencia

Sistema propietario desarrollado para CEVM.
Todos los derechos reservados © 2025

---

**Desarrollado con ❤️ para CEVM**

## Orden de creación del admin (idempotente)

A partir del fix `admin-backfill-idempotente`, **el orden no importa**:

- ✅ **Opción A:** Correr `database_setup.sql` PRIMERO, luego crear admin en Auth → trigger dispara, profile creado automáticamente.
- ✅ **Opción B:** Crear admin en Auth PRIMERO, luego correr `database_setup.sql` → el bloque de backfill al final del script crea el profile retroactivo y asigna `role = 'admin'`.

Antes este flujo era frágil (Opción B fallaba silenciosamente). Ya no.

> Bug detectado en cliente IVIP. Propagado a plantilla para evitar repetición en futuros clientes.

---

## ⚠️ Logo del cliente (OBLIGATORIO antes de deploy)

`public/logo.png` viene con un **placeholder MEV genérico** (200x200, círculo navy con texto "MEV PLACEHOLDER"). Si la persona que despliega olvida reemplazarlo, el cliente verá un logo genérico en login, dashboard y comprobantes de pago.

**Antes de deploy a Netlify, ejecutar:**

```bash
# 1. Copiar logo real del cliente
cp ~/clientes-MEV/[CLIENTE]/assets-cliente/logos/[archivo].png public/logo.png

# 2. Verificar que se reemplazó correctamente
./scripts/verify-logo.sh
```

Si `verify-logo.sh` falla con "ERROR: ... muy pequeño" o "no es un PNG válido", **NO hacer deploy**.

**Bug histórico:** EDUXA (3-may-2026) entregó con logo invisible (1×1 px transparente, 70 bytes) en login + dashboard + comprobantes de pago. La plantilla ahora trae placeholder visible como red de seguridad visual + script `verify-logo.sh` como recordatorio activo.

### Cómo funciona la verificación del logo

El placeholder `public/logo.png` tiene embebido un marker invisible `MEV-PLACEHOLDER-DO-NOT-DEPLOY` en su metadata PNG (tEXt chunk).

Cuando ejecutas `./scripts/verify-logo.sh`:
- Si el logo es el placeholder → detecta el marker y FALLA con error
- Si el logo es el real del cliente → no tiene marker y PASA

**No tienes que hacer nada especial:** cuando copias el logo del cliente sobre `public/logo.png`, el marker desaparece automáticamente porque el archivo entero se reemplaza.
