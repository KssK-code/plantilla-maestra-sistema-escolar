
import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter, DialogClose } from '@/components/ui/dialog';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/lib/customSupabaseClient';
import { Plus, Edit, Trash2, Loader2, Search, Filter, Calendar, DollarSign, BarChart3, List } from 'lucide-react';
import { format, parseISO, isBefore } from 'date-fns';
import { useRolePermissions } from '@/hooks/useRolePermissions';
import MonthlyBlocksContainer from './payments/MonthlyBlocksContainer';
import PaymentsDashboard from './payments/PaymentsDashboard';
import { useAuth } from '@/contexts/SupabaseAuthContext';

const getLocalDateString = () => {
    const date = new Date();
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
};

// Componente de búsqueda de estudiantes con autocompletado
// NOTA: Adaptable según estructura de datos del sistema:
// - Para first_name + last_name: usar `${student.first_name} ${student.last_name}`
// - Para campo único name: usar student.name
// - Para campo full_name: usar student.full_name
const StudentSearchField = ({ students, selectedStudentId, onStudentSelect }) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [isOpen, setIsOpen] = useState(false);
  const [filteredStudents, setFilteredStudents] = useState([]);
  
  // Filtrar estudiantes basado en el término de búsqueda
  useEffect(() => {
    if (searchTerm.trim() === '') {
      setFilteredStudents(students.slice(0, 10)); // Mostrar solo los primeros 10 si no hay búsqueda
    } else {
      const filtered = students.filter(student => {
        // ADAPTABLE: Cambiar según estructura de datos del sistema
        const fullName = student.full_name ? student.full_name.toLowerCase() : 
                        student.name ? student.name.toLowerCase() :
                        `${student.first_name || ''} ${student.last_name || ''}`.toLowerCase();
        const searchLower = searchTerm.toLowerCase();
        return fullName.includes(searchLower);
      });
      setFilteredStudents(filtered.slice(0, 20)); // Limitar a 20 resultados
    }
  }, [searchTerm, students]);
  
  // Obtener el estudiante seleccionado
  const selectedStudent = students.find(s => String(s.id) === String(selectedStudentId));
  
  const handleStudentSelect = (student) => {
    onStudentSelect(student.id);
    // ADAPTABLE: Cambiar según estructura de datos del sistema
    const displayName = student.full_name || student.name || `${student.first_name || ''} ${student.last_name || ''}`;
    setSearchTerm(displayName);
    setIsOpen(false);
  };
  
  const handleInputChange = (e) => {
    const value = e.target.value;
    setSearchTerm(value);
    setIsOpen(true);
    
    // Si se borra el campo, limpiar la selección
    if (value.trim() === '') {
      onStudentSelect('');
    }
  };
  
  // Establecer el valor inicial cuando se selecciona un estudiante externamente
  useEffect(() => {
    if (selectedStudent && !searchTerm) {
      // ADAPTABLE: Cambiar según estructura de datos del sistema
      const displayName = selectedStudent.full_name || selectedStudent.name || `${selectedStudent.first_name || ''} ${selectedStudent.last_name || ''}`;
      setSearchTerm(displayName);
    } else if (!selectedStudentId) {
      setSearchTerm('');
    }
  }, [selectedStudent, selectedStudentId]);
  
  return (
    <div className="relative">
      <Label htmlFor="student_search" className="text-white/80">
        Estudiante
      </Label>
      <div className="relative">
        <Input
          id="student_search"
          type="text"
          value={searchTerm}
          onChange={handleInputChange}
          onFocus={() => setIsOpen(true)}
          placeholder="Buscar por nombre o apellido..."
          className="input-field pr-10"
          autoComplete="off"
        />
        <Search className="absolute right-3 top-1/2 transform -translate-y-1/2 text-slate-400 w-4 h-4" />
      </div>
      
      {/* Dropdown de resultados */}
      {isOpen && filteredStudents.length > 0 && (
        <div className="absolute z-50 w-full mt-1 bg-slate-800 border border-slate-600 rounded-md shadow-lg max-h-60 overflow-y-auto">
          {filteredStudents.map(student => {
            // ADAPTABLE: Cambiar según estructura de datos del sistema
            const displayName = student.full_name || student.name || `${student.first_name || ''} ${student.last_name || ''}`;
            return (
              <div
                key={student.id}
                onClick={() => handleStudentSelect(student)}
                className="px-3 py-2 cursor-pointer hover:bg-slate-700 text-white border-b border-slate-700 last:border-b-0 transition-colors"
              >
                <div className="font-medium">
                  {displayName}
                </div>
                {student.email && (
                  <div className="text-sm text-slate-400">
                    {student.email}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
      
      {/* Cerrar dropdown al hacer click fuera */}
      {isOpen && (
        <div 
          className="fixed inset-0 z-40" 
          onClick={() => setIsOpen(false)}
        />
      )}
    </div>
  );
};

const PaymentForm = ({ open, setOpen, payment, students, refreshData }) => {
  const [formData, setFormData] = useState({ student_id: '', amount: '', concept: '', due_date: '', status: 'pending', debt_amount: '', debt_description: '' });
  const [paymentConcepts, setPaymentConcepts] = useState([]);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const { toast } = useToast();

  // Cargar conceptos de pago dinámicos
  const loadPaymentConcepts = async () => {
    try {
      const { data, error } = await supabase
        .from('payment_concepts')
        .select('*')
        .eq('active', true)
        .order('name');
      
      if (error) throw error;
      setPaymentConcepts(data || []);
    } catch (error) {
      console.error('Error loading payment concepts:', error);
      // Fallback a conceptos predeterminados
      setPaymentConcepts([
        { id: 1, name: 'Colegiatura Enfermeria' },
        { id: 2, name: 'Colegiatura Podologia' },
        { id: 3, name: 'Colegiatura Preparatoria' },
        { id: 4, name: 'Colegiatura Secundaria' },
        { id: 5, name: 'Inscripcion' },
        { id: 6, name: 'Re inscripcion' },
        { id: 7, name: 'Certificacion' }
      ]);
    }
  };

  useEffect(() => {
    if (open) {
      loadPaymentConcepts();
    }
  }, [open]);

  useEffect(() => {
    if (payment) {
      setFormData({ 
        student_id: payment.student_id || '', 
        amount: payment.amount || '', 
        concept: payment.concept || '', 
        due_date: payment.due_date ? format(parseISO(payment.due_date), 'yyyy-MM-dd') : '', 
        status: payment.status || 'pending',
        debt_amount: payment.debt_amount || '',
        debt_description: payment.debt_description || ''
      });
    } else {
      setFormData({ student_id: '', amount: '', concept: '', due_date: '', status: 'pending', debt_amount: '', debt_description: '' });
    }
  }, [payment, open]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setIsSubmitting(true);
    
    // DEBUG: Ver valores del formulario
    console.log('🐛 DEBUG formData antes de guardar:', {
      debt_amount: formData.debt_amount,
      debt_amount_type: typeof formData.debt_amount,
      debt_description: formData.debt_description,
      formData_completo: formData
    });
    
    // Objeto simplificado - solo campos que existen en la BD
    const dataToSave = { 
      student_id: formData.student_id,
      amount: parseFloat(formData.amount),
      concept: formData.concept,
      status: formData.status
    };
    
    // Solo agregar campos opcionales si no están vacíos
    if (formData.due_date) {
      dataToSave.due_date = formData.due_date;
    }
    
    if (formData.status === 'paid') {
      dataToSave.paid_date = payment?.paid_date || getLocalDateString();
    }
    
    // DEBUG: Ver datos que se envían a Supabase
    console.log('📦 DEBUG dataToSave para Supabase:', dataToSave);
    
    try {
      let savedPayment;
      if (payment) {
        const { data, error } = await supabase.from('payments').update(dataToSave).eq('id', payment.id).select().single();
        if (error) throw error;
        savedPayment = data;
      } else {
        const { data, error } = await supabase.from('payments').insert([dataToSave]).select().single();
        if (error) throw error;
        savedPayment = data;
      }
      
      toast({
        title: `Pago ${payment ? 'actualizado' : 'registrado'}`,
        description: `El pago se ha ${payment ? 'actualizado' : 'guardado'} correctamente.`,
      });

      refreshData();
      setOpen(false);
    } catch (error) {
      toast({ variant: "destructive", title: "Error al guardar el pago", description: error.message });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogContent className="bg-slate-800 border-slate-600 text-white">
        <DialogHeader>
          <DialogTitle className="gradient-text">{payment ? 'Editar Pago' : 'Registrar Nuevo Pago'}</DialogTitle>
          <DialogDescription className="text-white/60">{payment ? 'Actualiza los detalles del pago.' : 'Completa los campos para registrar un nuevo pago.'}</DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <StudentSearchField 
            students={students}
            selectedStudentId={formData.student_id}
            onStudentSelect={(studentId) => setFormData(prev => ({ ...prev, student_id: studentId }))}
          />
          <div><Label htmlFor="amount" className="text-white/80">Monto Pagado</Label><Input id="amount" type="number" step="0.01" value={formData.amount} onChange={(e) => setFormData(prev => ({ ...prev, amount: e.target.value }))} className="input-field" required /></div>
          <div>
            <Label htmlFor="concept" className="text-white/80">Concepto</Label>
            <Select value={formData.concept} onValueChange={(value) => setFormData(prev => ({ ...prev, concept: value }))}>
              <SelectTrigger className="input-field">
                <SelectValue placeholder="Seleccionar concepto" />
              </SelectTrigger>
              <SelectContent>
                {paymentConcepts.map(concept => (
                  <SelectItem key={concept.id} value={concept.name}>
                    {concept.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div><Label htmlFor="due_date" className="text-white/80">Fecha de Vencimiento</Label><Input id="due_date" type="date" value={formData.due_date} onChange={(e) => setFormData(prev => ({ ...prev, due_date: e.target.value }))} className="input-field" required /></div>
          <div>
            <Label htmlFor="debt_amount" className="text-white/80">Adeudo Restante (Opcional)</Label>
            <Input id="debt_amount" type="number" step="0.01" value={formData.debt_amount} onChange={(e) => setFormData(prev => ({ ...prev, debt_amount: e.target.value }))} className="input-field" placeholder="Ej: 500.00" />
          </div>
          <div>
            <Label htmlFor="debt_description" className="text-white/80">Concepto del Adeudo (Opcional)</Label>
            <Input id="debt_description" type="text" value={formData.debt_description} onChange={(e) => setFormData(prev => ({ ...prev, debt_description: e.target.value }))} className="input-field" placeholder="Ej: Mensualidad Febrero" />
          </div>
          <div>
            <Label htmlFor="status" className="text-white/80">Estado</Label>
            <Select onValueChange={(value) => setFormData(prev => ({ ...prev, status: value }))} value={formData.status}>
              <SelectTrigger className="input-field"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="pending">Pendiente</SelectItem>
                <SelectItem value="paid">Pagado</SelectItem>
                <SelectItem value="overdue">Vencido</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <DialogFooter>
            <DialogClose asChild><Button type="button" variant="secondary" className="btn-secondary">Cancelar</Button></DialogClose>
            <Button type="submit" className="w-full btn-primary" disabled={isSubmitting}>
              {isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              {payment ? 'Actualizar Pago' : 'Registrar Pago'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
};

const PaymentsSection = ({ payments, students, refreshData, schoolSettings }) => {
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingPayment, setEditingPayment] = useState(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [viewMode, setViewMode] = useState('blocks'); // 'blocks' o 'dashboard'
  const { toast } = useToast();
  const { canDeletePayments } = useRolePermissions();

  const filteredPayments = payments.filter(payment => {
    const studentName = payment.students?.name || '';
    const matchesSearch = studentName.toLowerCase().includes(searchTerm.toLowerCase()) || payment.concept.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesStatus = statusFilter === 'all' || payment.status === statusFilter;
    return matchesSearch && matchesStatus;
  });

  const handleEdit = (payment) => {
    setEditingPayment(payment);
    setIsDialogOpen(true);
  };
  
  const openNewDialog = () => {
    setEditingPayment(null);
    setIsDialogOpen(true);
  };

  // Funciones para manejar acciones de pagos
  const handleStatusChange = async (paymentId, newStatus) => {
    try {
      console.log(`🔄 Cambiando estado del pago ${paymentId} a ${newStatus}`);
      
      const updateData = { status: newStatus };
      
      // Si se marca como pagado, agregar fecha de pago
      if (newStatus === 'paid') {
        updateData.payment_date = new Date().toISOString().split('T')[0];
      }
      
      const { error } = await supabase
        .from('payments')
        .update(updateData)
        .eq('id', paymentId);
      
      if (error) throw error;
      
      toast({ title: "Estado actualizado", description: `Pago marcado como ${newStatus}` });

      refreshData();
    } catch (error) {
      toast({ variant: "destructive", title: "Error al actualizar estado", description: error.message });
    }
  };

  const handleDelete = async (paymentToDelete) => {
    if (!window.confirm("¿Estás seguro de que quieres eliminar este pago? Esta acción no se puede deshacer.")) return;

    try {
      console.log('🗑️ Iniciando eliminación del pago:', paymentToDelete.id, paymentToDelete.concept);
      
      const { data: deleteData, error } = await supabase
        .from('payments')
        .delete()
        .eq('id', paymentToDelete.id)
        .select(); // Agregar select para ver qué se eliminó
        
      console.log('🗑️ Resultado de eliminación:', { deleteData, error });
      
      if (error) {
        console.error('❌ Error en eliminación:', error);
        throw error;
      }
      
      if (!deleteData || deleteData.length === 0) {
        console.warn('⚠️ No se eliminó ningún registro. Posible problema de permisos RLS.');
        throw new Error('No se pudo eliminar el pago. Verifique los permisos.');
      }
      
      console.log('✅ Pago eliminado exitosamente, refrescando datos...');
      toast({ title: "Pago eliminado", description: "El registro del pago ha sido eliminado." });
      
      await refreshData();
      
      console.log('✅ Datos refrescados');
      
    } catch (error) {
      console.error('❌ Error completo en eliminación:', error);
      toast({ variant: "destructive", title: "Error al eliminar", description: error.message });
    }
  };

  const getStatusBadge = (status) => {
    switch (status) {
      case 'paid': return <Badge className="status-paid"><CheckCircle className="w-3 h-3 mr-1" />Pagado</Badge>;
      case 'pending': return <Badge className="status-pending"><Clock className="w-3 h-3 mr-1" />Pendiente</Badge>;
      case 'overdue': return <Badge className="status-overdue"><AlertCircle className="w-3 h-3 mr-1" />Vencido</Badge>;
      default: return <Badge variant="secondary">{status}</Badge>;
    }
  };

  const totalPending = payments.filter(p => p.status === 'pending').reduce((sum, p) => sum + p.amount, 0);
  const totalPaid = payments.filter(p => p.status === 'paid').reduce((sum, p) => sum + p.amount, 0);
  const totalOverdue = payments.filter(p => p.status === 'overdue').reduce((sum, p) => sum + p.amount, 0);

  return (
    <div className="space-y-6">
      {/* Header con controles de vista */}
      <motion.div 
        initial={{ opacity: 0, y: 20 }} 
        animate={{ opacity: 1, y: 0 }} 
        className="flex flex-wrap justify-between items-start gap-3"
      >
        <div>
          <h1 className="text-3xl font-bold gradient-text mb-2">
            Gestión de Cobranza por Bloques Mensuales
          </h1>
          <p className="text-white/70">
            Sistema organizacional cronológico para mejor control de flujo de efectivo
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2 w-full sm:w-auto justify-end">
          <Button onClick={openNewDialog} className="btn-primary w-full sm:w-auto sm:order-last">
            <Plus className="w-4 h-4 mr-2" />Nuevo Pago
          </Button>
          {/* Selector de vista */}
          <div className="flex bg-white/10 rounded-lg p-1">
            <Button
              variant={viewMode === 'dashboard' ? 'default' : 'ghost'}
              size="sm"
              onClick={() => setViewMode('dashboard')}
              className={`${
                viewMode === 'dashboard'
                  ? 'bg-white text-black'
                  : 'text-white hover:bg-white/20'
              }`}
            >
              <BarChart3 className="w-4 h-4 mr-2" />
              Dashboard
            </Button>
            <Button
              variant={viewMode === 'blocks' ? 'default' : 'ghost'}
              size="sm"
              onClick={() => setViewMode('blocks')}
              className={`${
                viewMode === 'blocks'
                  ? 'bg-white text-black'
                  : 'text-white hover:bg-white/20'
              }`}
            >
              <List className="w-4 h-4 mr-2" />
              Bloques
            </Button>
          </div>
        </div>
      </motion.div>

      {/* Contenido según vista seleccionada */}
      <motion.div
        key={viewMode}
        initial={{ opacity: 0, x: 20 }}
        animate={{ opacity: 1, x: 0 }}
        transition={{ duration: 0.3 }}
      >
        {viewMode === 'dashboard' ? (
          <PaymentsDashboard payments={payments} />
        ) : (
          <MonthlyBlocksContainer
            payments={payments}
            students={students}
            onEditPayment={handleEdit}
            onDeletePayment={handleDelete}
            onStatusChange={handleStatusChange}
            canDeletePayments={canDeletePayments}
            schoolSettings={schoolSettings}
          />
        )}
      </motion.div>
      <PaymentForm open={isDialogOpen} setOpen={setIsDialogOpen} payment={editingPayment} students={students} refreshData={refreshData} />
    </div>
  );
};

export default PaymentsSection;
