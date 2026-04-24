// Respaldo Automático - Sistema Escolar Avanza
// Ejecutar: node respaldo-automatico.cjs

const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');
const path = require('path');

// Configuración - Leer desde archivo .env
require('dotenv').config();
const supabaseUrl = process.env.VITE_SUPABASE_URL || 'https://gvrgepdjxzhgqkmtwcvs.supabase.co';
const supabaseKey = process.env.VITE_SUPABASE_ANON_KEY;

const supabase = createClient(supabaseUrl, supabaseKey);

// Crear carpeta de respaldos
const backupDir = path.join(__dirname, 'respaldos');
if (!fs.existsSync(backupDir)) {
  fs.mkdirSync(backupDir);
}

// Fecha para el nombre del archivo
const fecha = new Date().toISOString().split('T')[0];
const archivoRespaldo = path.join(backupDir, `respaldo_[CODIGO]_${fecha}.json`);

async function hacerRespaldo() {
  console.log('🔄 Iniciando respaldo...');
  
  try {
    const respaldo = {
      fecha_respaldo: new Date().toISOString(),
      version: '1.0',
      sucursal: '[NOMBRE_SUCURSAL]',
      datos: {}
    };

    // Respaldar estudiantes
    console.log('📚 Respaldando estudiantes...');
    const { data: estudiantes, error: errorEstudiantes } = await supabase
      .from('students')
      .select('*');
    
    if (errorEstudiantes) {
      console.log('⚠️ Error al respaldar estudiantes:', errorEstudiantes.message);
    }
    respaldo.datos.estudiantes = estudiantes || [];

    // Respaldar pagos
    console.log('💰 Respaldando pagos...');
    const { data: pagos, error: errorPagos } = await supabase
      .from('payments')
      .select('*');
    
    if (errorPagos) {
      console.log('⚠️ Error al respaldar pagos:', errorPagos.message);
    }
    respaldo.datos.pagos = pagos || [];

    // Respaldar cursos
    console.log('🎓 Respaldando cursos...');
    const { data: cursos, error: errorCursos } = await supabase
      .from('courses')
      .select('*');
    
    if (errorCursos) {
      console.log('⚠️ Error al respaldar cursos:', errorCursos.message);
    }
    respaldo.datos.cursos = cursos || [];

    // Respaldar horarios
    console.log('⏰ Respaldando horarios...');
    const { data: horarios, error: errorHorarios } = await supabase
      .from('schedules')
      .select('*');
    
    if (errorHorarios) {
      console.log('⚠️ Error al respaldar horarios:', errorHorarios.message);
    }
    respaldo.datos.horarios = horarios || [];

    // Respaldar cortes de caja
    console.log('💵 Respaldando cortes de caja...');
    const { data: cortes, error: errorCortes } = await supabase
      .from('cash_cuts')
      .select('*');
    
    if (errorCortes) {
      console.log('⚠️ Error al respaldar cortes de caja:', errorCortes.message);
    }
    respaldo.datos.cortes_caja = cortes || [];

    // Respaldar usuarios
    console.log('👥 Respaldando usuarios...');
    const { data: usuarios, error: errorUsuarios } = await supabase
      .from('profiles')
      .select('*');
    
    if (errorUsuarios) {
      console.log('⚠️ Error al respaldar usuarios:', errorUsuarios.message);
    }
    respaldo.datos.usuarios = usuarios || [];

    // Guardar archivo
    fs.writeFileSync(archivoRespaldo, JSON.stringify(respaldo, null, 2));

    console.log('\n✅ ¡Respaldo completado exitosamente!');
    console.log(`📁 Archivo guardado en: ${archivoRespaldo}`);
    console.log(`📊 Datos respaldados:`);
    console.log(`   - Estudiantes: ${respaldo.datos.estudiantes.length}`);
    console.log(`   - Pagos: ${respaldo.datos.pagos.length}`);
    console.log(`   - Cursos: ${respaldo.datos.cursos.length}`);
    console.log(`   - Horarios: ${respaldo.datos.horarios.length}`);
    console.log(`   - Cortes de caja: ${respaldo.datos.cortes_caja.length}`);
    console.log(`   - Usuarios: ${respaldo.datos.usuarios.length}`);
    
    console.log('\n🌤️ Ahora puedes subir este archivo a tu nube preferida');
    console.log('💡 Tip: Comprime el archivo antes de subirlo para ahorrar espacio');

  } catch (error) {
    console.error('❌ Error al hacer respaldo:', error);
  }
}

// Ejecutar respaldo
hacerRespaldo();
