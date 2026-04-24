import React, { useState, useEffect, useMemo } from 'react';
import { motion } from 'framer-motion';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter, DialogClose } from '@/components/ui/dialog';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Plus, Search, Edit, UserCog, Mail, Phone, User, Book, Loader2, Clock, UserCheck, UserX, GraduationCap } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/lib/customSupabaseClient';
import { format, parseISO } from 'date-fns';
import { Textarea } from '@/components/ui/textarea';
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group";

const daysOfWeek = ['Domingo', 'Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado'];

/** Normaliza estados históricos para unificar "baja temporal" como inactive. */
function normalizeStudentStatus(status) {
  if (status === 'temporary_leave') return 'inactive';
  return status || 'active';
}

/** Horario opcional: null si no hay selección válida (evita enviar "none" o strings vacíos). */
function normalizeScheduleId(value) {
  if (value === undefined || value === null || value === '' || value === 'none') return null;
  if (typeof value === 'number' && Number.isFinite(value)) return value;
  const s = String(value).trim();
  if (!s || s === 'none') return null;
  if (/^\d+$/.test(s)) return parseInt(s, 10);
  return s;
}

/**
 * Solo columnas válidas para students (evita 400 por campos extra del formulario).
 * schedule_id puede ser null si no hay horario.
 */
function buildStudentRow(formData, student) {
  const scheduleId = normalizeScheduleId(formData.schedule_id);
  return {
    student_number: formData.student_number?.trim() || null,
    name: formData.name?.trim(),
    email: formData.email?.trim() || null,
    phone: formData.phone?.trim() || null,
    address: formData.address?.trim() || null,
    birth_date: formData.birth_date?.trim() || null,
    course: formData.course?.trim() || null,
    status: formData.status || 'active',
    schedule_id: scheduleId,
    enrollment_date: student?.enrollment_date || new Date().toISOString().split('T')[0],
  };
}

// Función para obtener el siguiente número de estudiante disponible
// Detecta secuencias continuas y evita saltos anómalos (ej: 63 → 101)
const getNextStudentNumber = (students) => {
  try {
    if (!students || students.length === 0) {
      return '1'; // Primer estudiante
    }
    
    // Obtener el siguiente número de estudiante disponible
    const existingNumbers = students
      .map(s => parseInt(s.student_number))
      .filter(num => !isNaN(num) && num < 1000) // Filtrar números razonables
      .sort((a, b) => a - b);
    
    if (existingNumbers.length === 0) {
      return '1';
    }
    
    // Detectar secuencia continua y evitar saltos anómalos
    // Si hay un salto grande (>10), usar el número antes del salto + 1
    let sequentialMax = 0;
    for (let i = 0; i < existingNumbers.length - 1; i++) {
      const current = existingNumbers[i];
      const next = existingNumbers[i + 1];
      
      // Si hay un salto mayor a 10, el número actual es el último de la secuencia
      if (next - current > 10) {
        sequentialMax = current;
        break;
      }
    }
    
    // Si no se encontró salto, usar el máximo normal
    if (sequentialMax === 0) {
      sequentialMax = existingNumbers[existingNumbers.length - 1];
    }
    
    const nextNumber = sequentialMax + 1;
    return String(nextNumber);
  } catch (error) {
    console.error('Error calculando siguiente número:', error);
    return '1';
  }
};

const StudentForm = ({ open, setOpen, student, courses, schedules, refreshData, students }) => {
  const [formData, setFormData] = useState({});
  const [isSubmitting, setIsSubmitting] = useState(false);
  const { toast } = useToast();

  const initialFormState = useMemo(() => ({
    student_number: '',
    name: '',
    email: '',
    phone: '',
    address: '',
    birth_date: '',
    course: '',
    status: 'active',
    schedule_id: 'none'
  }), []);

  useEffect(() => {
    if (open) {
      if (student) {
        setFormData({
          student_number: student.student_number || '',
          name: student.name || '',
          email: student.email || '',
          phone: student.phone || '',
          address: student.address || '',
          birth_date: student.birth_date || '',
          course: student.course || '',
          status: student.status || 'active',
          schedule_id: student.schedule_id || 'none'
        });
      } else {
        // Para nuevo estudiante, auto-asignar número
        const nextNumber = getNextStudentNumber(students);
        setFormData({
          ...initialFormState,
          student_number: nextNumber
        });
      }
    }
  }, [student, open, initialFormState, students]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setIsSubmitting(true);
    
    const dataToSave = buildStudentRow(formData, student);

    try {
      let error;
      if (student) {
        ({ error } = await supabase.from('students').update(dataToSave).eq('id', student.id));
      } else {
        ({ error } = await supabase.from('students').insert([dataToSave]));
      }
      
      if (error) throw error;
      
      toast({
        title: `Estudiante ${student ? 'actualizado' : 'agregado'}`,
        description: `El estudiante se ha ${student ? 'actualizado' : 'guardado'} correctamente.`,
      });
      refreshData();
      setOpen(false);
    } catch (error) {
      let errorMessage = error.message;
      
      // Manejo específico para número de estudiante duplicado
      if (error.code === '23505' && error.message && error.message.includes('students_student_number_key')) {
        errorMessage = 'Ya existe un estudiante con este número. Por favor, usa un número diferente.';
      }
      
      toast({
        variant: "destructive",
        title: "Error al guardar el estudiante",
        description: errorMessage,
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const formatScheduleLabel = (schedule) => {
    if (!schedule) return "Horario no disponible";
    
    // Manejar diferentes estructuras de datos del horario
    const courseName = schedule.courses?.name || schedule.course_name || 'Curso';
    const day = daysOfWeek[schedule.day_of_week] || 'Día desc.';
    const startTime = schedule.start_time ? schedule.start_time.slice(0, 5) : '00:00';
    const endTime = schedule.end_time ? schedule.end_time.slice(0, 5) : '00:00';
    
    // Agregar información del grupo - PRIORIZAR meeting_id para sistemas virtuales
    let additionalInfo = '';
    if (schedule.meeting_id) {
      // Para sistemas virtuales (Avanza Virtual)
      additionalInfo += ` (Grupo ${schedule.meeting_id})`;
    } else if (schedule.classroom) {
      // Para sistemas presenciales (Polanco)
      additionalInfo += ` (Grupo ${schedule.classroom})`;
    } else if (schedule.location) {
      // Para sistemas con campo location (Ciudad Obregón)
      additionalInfo += ` (Grupo ${schedule.location})`;
    } else if (schedule.instructor) {
      // Fallback: mostrar instructor
      additionalInfo += ` (Prof: ${schedule.instructor})`;
    } else {
      // Último fallback: usar ID del horario
      const groupId = schedule.id ? String(schedule.id).slice(-4).toUpperCase() : 'XXXX';
      additionalInfo += ` (Grupo ${groupId})`;
    }
    
    return `${courseName} - ${day} ${startTime}-${endTime}${additionalInfo}`;
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogContent className="bg-slate-800/95 backdrop-blur-md border-slate-600/30 text-white shadow-2xl max-w-2xl">
        <DialogHeader>
          <DialogTitle className="text-white text-xl font-semibold">{student ? 'Editar Estudiante' : 'Nuevo Estudiante'}</DialogTitle>
          <DialogDescription className="text-slate-300">
            {student ? 'Actualiza los datos del estudiante.' : 'Completa los campos para registrar un nuevo estudiante.'}
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <Label htmlFor="student_number" className="text-slate-200 font-medium mb-2 block">Número de Estudiante</Label>
            <Input 
              id="student_number" 
              value={formData.student_number || ''} 
              onChange={(e) => setFormData(prev => ({ ...prev, student_number: e.target.value }))} 
              className="bg-slate-700/50 border-slate-600 text-white placeholder-slate-400 focus:border-blue-400 focus:ring-blue-400/20" 
              placeholder="Se asigna automáticamente"
              required 
            />
          </div>
          <div>
            <Label htmlFor="name" className="text-slate-200 font-medium mb-2 block">Nombre Completo</Label>
            <Input id="name" value={formData.name || ''} onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))} className="bg-slate-700/50 border-slate-600 text-white placeholder-slate-400 focus:border-blue-400 focus:ring-blue-400/20" required />
          </div>
          <div>
            <Label htmlFor="email" className="text-slate-200 font-medium mb-2 block">Email</Label>
            <Input id="email" type="email" value={formData.email || ''} onChange={(e) => setFormData(prev => ({ ...prev, email: e.target.value }))} className="bg-slate-700/50 border-slate-600 text-white placeholder-slate-400 focus:border-blue-400 focus:ring-blue-400/20" required />
          </div>
          <div>
            <Label htmlFor="phone" className="text-slate-200 font-medium mb-2 block">Teléfono</Label>
            <Input id="phone" value={formData.phone || ''} onChange={(e) => setFormData(prev => ({ ...prev, phone: e.target.value }))} className="bg-slate-700/50 border-slate-600 text-white placeholder-slate-400 focus:border-blue-400 focus:ring-blue-400/20" />
          </div>
          <div>
            <Label htmlFor="address" className="text-slate-200 font-medium mb-2 block">Dirección</Label>
            <Input id="address" value={formData.address || ''} onChange={(e) => setFormData(prev => ({ ...prev, address: e.target.value }))} className="bg-slate-700/50 border-slate-600 text-white placeholder-slate-400 focus:border-blue-400 focus:ring-blue-400/20" required />
          </div>
          <div>
            <Label htmlFor="birth_date" className="text-slate-200 font-medium mb-2 block">Fecha de Nacimiento</Label>
            <Input id="birth_date" type="date" value={formData.birth_date || ''} onChange={(e) => setFormData(prev => ({ ...prev, birth_date: e.target.value }))} className="bg-slate-700/50 border-slate-600 text-white placeholder-slate-400 focus:border-blue-400 focus:ring-blue-400/20" required />
          </div>
          <div>
            <Label htmlFor="course" className="text-slate-200 font-medium mb-2 block">Curso</Label>
            <Select onValueChange={(value) => setFormData(prev => ({ ...prev, course: value }))} value={formData.course || ''}>
              <SelectTrigger className="bg-slate-700/50 border-slate-600 text-white focus:border-blue-400 focus:ring-blue-400/20">
                <SelectValue placeholder="Selecciona un curso">
                  {formData.course ? 
                    courses.find(c => String(c.name) === String(formData.course))?.name || 'Curso seleccionado'
                    : 'Selecciona un curso'
                  }
                </SelectValue>
              </SelectTrigger>
              <SelectContent className="bg-slate-800 border-slate-600">
                {courses.map(c => (
                  <SelectItem key={c.name} value={c.name} className="text-white hover:bg-slate-700 focus:bg-slate-700">
                    {c.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div>
            <Label htmlFor="schedule_id" className="text-slate-200 font-medium mb-2 block">Horario</Label>
            <Select onValueChange={(value) => setFormData(prev => ({ ...prev, schedule_id: value }))} value={formData.schedule_id || 'none'}>
              <SelectTrigger className="bg-slate-700/50 border-slate-600 text-white focus:border-blue-400 focus:ring-blue-400/20">
                <SelectValue placeholder="Selecciona un horario" className="text-white">
                  {formData.schedule_id && formData.schedule_id !== 'none' ? 
                    (() => {
                      const selectedSchedule = schedules.find(s => String(s.id) === String(formData.schedule_id));
                      return selectedSchedule ? formatScheduleLabel(selectedSchedule) : 'Horario seleccionado';
                    })()
                    : formData.schedule_id === 'none' 
                      ? 'Sin horario asignado' 
                      : 'Selecciona un horario'
                  }
                </SelectValue>
              </SelectTrigger>
              <SelectContent className="bg-slate-800 border-slate-600 max-h-60 overflow-y-auto">
                <SelectItem value="none" className="text-white hover:bg-slate-700 focus:bg-slate-700">
                  Sin horario asignado
                </SelectItem>
                {schedules.map(s => (
                  <SelectItem key={s.id} value={s.id} className="text-white hover:bg-slate-700 focus:bg-slate-700">
                    {formatScheduleLabel(s)}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <DialogFooter className="gap-2">
            <DialogClose asChild>
              <Button type="button" variant="secondary" className="bg-slate-600 hover:bg-slate-500 text-white border-slate-500">
                Cancelar
              </Button>
            </DialogClose>
            <Button type="submit" className="bg-blue-600 hover:bg-blue-700 text-white flex-1" disabled={isSubmitting}>
              {isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              {student ? 'Actualizar' : 'Registrar'} Estudiante
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
};

const StatusManagementDialog = ({ open, setOpen, student, refreshData }) => {
  const [status, setStatus] = useState(normalizeStudentStatus(student?.status));
  const [notes, setNotes] = useState(student?.status_notes || '');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const { toast } = useToast();

  useEffect(() => {
    if (student) {
      setStatus(normalizeStudentStatus(student.status));
      setNotes(student.status_notes || '');
    }
  }, [student]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setIsSubmitting(true);
    try {
      const dataToUpdate = {
        status: normalizeStudentStatus(status),
        status_notes: notes,
        status_change_date: new Date().toISOString().split('T')[0],
      };

      if (normalizeStudentStatus(status) === 'inactive' || status === 'definitive_leave') {
        dataToUpdate.schedule_id = null;
      }

      const { error } = await supabase
        .from('students')
        .update(dataToUpdate)
        .eq('id', student.id);

      if (error) throw error;

      toast({
        title: "Estatus actualizado",
        description: `El estatus de ${student.name} ha sido actualizado.`,
      });
      refreshData();
      setOpen(false);
    } catch (error) {
      toast({
        variant: "destructive",
        title: "Error al actualizar estatus",
        description: error.message,
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogContent className="glass-effect border-white/20 text-white">
        <DialogHeader>
          <DialogTitle className="gradient-text">Gestionar Estatus de {student?.name}</DialogTitle>
          <DialogDescription className="text-white/60">
            Actualiza el estado del estudiante. Esto afectará su conteo en la población activa.
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <Label htmlFor="status" className="text-white/80">Nuevo Estatus</Label>
            <Select onValueChange={setStatus} value={status}>
              <SelectTrigger className="input-field"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="active">Activo (Reingreso)</SelectItem>
                <SelectItem value="inactive">Baja Temporal</SelectItem>
                <SelectItem value="definitive_leave">Baja Definitiva</SelectItem>
                <SelectItem value="graduated">Graduado</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div>
            <Label htmlFor="notes" className="text-white/80">Notas / Motivo del cambio</Label>
            <Textarea id="notes" value={notes} onChange={(e) => setNotes(e.target.value)} className="input-field" placeholder="Ej: Baja por motivos personales..." />
          </div>
          <DialogFooter>
            <DialogClose asChild><Button type="button" variant="secondary" className="btn-secondary">Cancelar</Button></DialogClose>
            <Button type="submit" className="btn-primary" disabled={isSubmitting}>
              {isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Actualizar Estatus
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
};

const StudentsSection = ({ students, courses, schedules, refreshData }) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('active');
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [isStatusDialogOpen, setIsStatusDialogOpen] = useState(false);
  const [selectedStudent, setSelectedStudent] = useState(null);

  const filteredStudents = useMemo(() => {
    return students
      .filter(student => {
        const normalizedStatus = normalizeStudentStatus(student.status);
        if (statusFilter === 'all') return true;
        if (statusFilter === 'inactive') return [
          'inactive', 'temporary_leave', 'baja_temporal', 'definitive_leave'
        ].includes(normalizedStatus || student.status);
        return normalizedStatus === statusFilter;
      })
      .filter(student =>
        (student.name?.toLowerCase() || '').includes(searchTerm.toLowerCase()) ||
        (student.email?.toLowerCase() || '').includes(searchTerm.toLowerCase()) ||
        (student.course?.toLowerCase() || '').includes(searchTerm.toLowerCase())
      );
  }, [students, searchTerm, statusFilter]);

  const handleEdit = (student) => {
    setSelectedStudent(student);
    setIsFormOpen(true);
  };

  const handleStatusManagement = (student) => {
    setSelectedStudent(student);
    setIsStatusDialogOpen(true);
  };

  const openNewStudentDialog = () => {
    setSelectedStudent(null);
    setIsFormOpen(true);
  };

  const getStatusBadge = (status) => {
    switch (normalizeStudentStatus(status)) {
      case 'active': return <Badge className="status-paid capitalize"><UserCheck className="w-3 h-3 mr-1" />Activo</Badge>;
      case 'inactive': return <Badge className="status-pending capitalize"><UserX className="w-3 h-3 mr-1" />Baja Temporal</Badge>;
      case 'definitive_leave': return <Badge className="status-overdue capitalize"><UserX className="w-3 h-3 mr-1" />Baja Definitiva</Badge>;
      case 'graduated': return <Badge variant="default" className="bg-blue-500/20 text-blue-300 capitalize"><GraduationCap className="w-3 h-3 mr-1" />Graduado</Badge>;
      default: return <Badge variant="secondary" className="capitalize">{status}</Badge>;
    }
  };

  const formatScheduleLabel = (schedule) => {
    if (!schedule) return <span className="text-white/50">No asignado</span>;
    
    const day = daysOfWeek[schedule.day_of_week] || 'Día desc.';
    const startTime = schedule.start_time.slice(0, 5);
    const endTime = schedule.end_time.slice(0, 5);
    const courseName = schedule.courses?.name || schedule.course_name || 'Curso desc.';
    
    // Agregar información del grupo - PRIORIZAR meeting_id para sistemas virtuales
    let additionalInfo = '';
    if (schedule.meeting_id) {
      // Para sistemas virtuales (Avanza Virtual)
      additionalInfo += ` (Grupo ${schedule.meeting_id})`;
    } else if (schedule.classroom) {
      // Para sistemas presenciales (Polanco)
      additionalInfo += ` (Grupo ${schedule.classroom})`;
    } else if (schedule.location) {
      // Para sistemas con campo location (Ciudad Obregón)
      additionalInfo += ` (Grupo ${schedule.location})`;
    } else if (schedule.instructor) {
      // Fallback: mostrar instructor
      additionalInfo += ` (Prof: ${schedule.instructor})`;
    } else {
      // Último fallback: usar ID del horario
      const groupId = schedule.id ? String(schedule.id).slice(-4).toUpperCase() : 'XXXX';
      additionalInfo += ` (Grupo ${groupId})`;
    }
    
    return `${courseName} - ${day} ${startTime}-${endTime}${additionalInfo}`;
  };

  return (
    <div className="space-y-6">
      <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="flex flex-col gap-4 sm:flex-row sm:justify-between sm:items-center">
        <div><h1 className="text-2xl sm:text-3xl font-bold gradient-text mb-2">Gestión de Estudiantes</h1><p className="text-white/70 text-sm sm:text-base">Administra la información de todos los estudiantes</p></div>
        <Button onClick={openNewStudentDialog} className="btn-primary w-full sm:w-auto"><Plus className="w-4 h-4 mr-2" />Nuevo Estudiante</Button>
      </motion.div>

      <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }}>
        <Card className="glass-effect border-white/20">
          <CardHeader>
            <div className="flex flex-col gap-4 sm:flex-row sm:justify-between sm:items-center">
              <CardTitle className="text-white flex items-center gap-2 text-base sm:text-lg"><User className="w-5 h-5" />Lista de Estudiantes ({filteredStudents.length})</CardTitle>
              <div className="flex flex-col gap-3 w-full sm:w-auto sm:flex-row sm:items-center sm:gap-4">
                <ToggleGroup type="single" value={statusFilter} onValueChange={(value) => value && setStatusFilter(value)} className="bg-white/10 p-1 rounded-lg w-full sm:w-auto justify-between sm:justify-start">
                  <ToggleGroupItem value="active" aria-label="Activos">Activos</ToggleGroupItem>
                  <ToggleGroupItem value="inactive" aria-label="Inactivos">Bajas</ToggleGroupItem>
                  <ToggleGroupItem value="all" aria-label="Todos">Todos</ToggleGroupItem>
                </ToggleGroup>
                <div className="relative w-full sm:w-64"><Search className="w-4 h-4 absolute left-3 top-1/2 transform -translate-y-1/2 text-white/60" /><Input placeholder="Buscar estudiantes..." value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} className="input-field pl-10 w-full" /></div>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            <div className="space-y-3 md:hidden">
              {filteredStudents.map((student, index) => (
                <motion.div
                  key={student.id}
                  initial={{ opacity: 0, y: 8 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: index * 0.04 }}
                  className="rounded-xl border border-white/15 bg-white/5 p-4"
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <p className="text-white font-semibold truncate">{student.name}</p>
                      <p className="text-xs text-white/70 truncate">{student.email}</p>
                      <p className="text-xs text-white/60 mt-1">{student.phone || 'Sin teléfono'}</p>
                    </div>
                    {getStatusBadge(student.status)}
                  </div>
                  <div className="mt-3 space-y-1 text-sm text-white/80">
                    <p className="truncate"><span className="text-white/60">Curso:</span> {student.course || 'N/A'}</p>
                    <p className="truncate"><span className="text-white/60">Horario:</span> {formatScheduleLabel(student.schedules)}</p>
                    <p><span className="text-white/60">Inscripción:</span> {student.enrollment_date ? format(parseISO(student.enrollment_date), 'dd MMM yyyy') : 'N/A'}</p>
                  </div>
                  <div className="mt-3 flex gap-2 justify-end">
                    <Button variant="ghost" size="sm" onClick={() => handleEdit(student)} className="text-blue-400 hover:text-blue-300 hover:bg-blue-500/20"><Edit className="w-4 h-4" /></Button>
                    <Button variant="ghost" size="sm" onClick={() => handleStatusManagement(student)} className="text-yellow-400 hover:text-yellow-300 hover:bg-yellow-500/20"><UserCog className="w-4 h-4" /></Button>
                  </div>
                </motion.div>
              ))}
            </div>
            <div className="hidden md:block overflow-x-auto">
              <Table>
                <TableHeader><TableRow className="border-white/20"><TableHead className="text-white/80 min-w-[180px]">Nombre</TableHead><TableHead className="text-white/80 hidden md:table-cell">Contacto</TableHead><TableHead className="text-white/80 min-w-[140px]">Curso</TableHead><TableHead className="text-white/80 hidden lg:table-cell">Horario</TableHead><TableHead className="text-white/80 min-w-[130px]">Estado</TableHead><TableHead className="text-white/80 hidden md:table-cell">Inscripción</TableHead><TableHead className="text-white/80 text-right min-w-[90px]">Acciones</TableHead></TableRow></TableHeader>
                <TableBody>
                  {filteredStudents.map((student, index) => (
                    <motion.tr key={student.id} initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: index * 0.05 }} className="border-white/10 hover:bg-white/5">
                      <TableCell className="text-white font-medium">
                        <div className="flex flex-col">
                          <span>{student.name}</span>
                          <span className="text-xs text-white/60 md:hidden">{student.email}</span>
                        </div>
                      </TableCell>
                      <TableCell className="text-white/80 hidden md:table-cell">
                        <div className="flex items-center gap-2 text-sm"><Mail className="w-4 h-4" />{student.email}</div>
                        <div className="flex items-center gap-2 text-sm mt-1"><Phone className="w-4 h-4" />{student.phone || 'N/A'}</div>
                      </TableCell>
                      <TableCell className="text-white/80"><div className="flex items-center gap-2"><Book className="w-4 h-4" />{student.course}</div></TableCell>
                      <TableCell className="text-white/80 hidden lg:table-cell"><div className="flex items-center gap-2"><Clock className="w-4 h-4" />{formatScheduleLabel(student.schedules)}</div></TableCell>
                      <TableCell>{getStatusBadge(student.status)}</TableCell>
                      <TableCell className="text-white/80 hidden md:table-cell">{student.enrollment_date ? format(parseISO(student.enrollment_date), 'dd MMM yyyy') : 'N/A'}</TableCell>
                      <TableCell className="text-right">
                        <div className="flex gap-2 justify-end">
                          <Button variant="ghost" size="sm" onClick={() => handleEdit(student)} className="text-blue-400 hover:text-blue-300 hover:bg-blue-500/20"><Edit className="w-4 h-4" /></Button>
                          <Button variant="ghost" size="sm" onClick={() => handleStatusManagement(student)} className="text-yellow-400 hover:text-yellow-300 hover:bg-yellow-500/20"><UserCog className="w-4 h-4" /></Button>
                        </div>
                      </TableCell>
                    </motion.tr>
                  ))}
                </TableBody>
              </Table>
            </div>
          </CardContent>
        </Card>
      </motion.div>
      {isFormOpen && <StudentForm open={isFormOpen} setOpen={setIsFormOpen} student={selectedStudent} courses={courses} schedules={schedules} refreshData={refreshData} students={students} />}
      {isStatusDialogOpen && <StatusManagementDialog open={isStatusDialogOpen} setOpen={setIsStatusDialogOpen} student={selectedStudent} refreshData={refreshData} />}
    </div>
  );
};

export default StudentsSection;