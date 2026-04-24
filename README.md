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
