import React, { useState, useEffect, useMemo } from 'react';
import { motion } from 'framer-motion';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { 
  FileText, 
  Search, 
  Plus, 
  Phone, 
  UserCheck, 
  DollarSign, 
  BookOpen, 
  AlertCircle,
  Edit,
  Trash2,
  Loader2,
  Clock,
  User,
  ChevronDown,
  Check
} from 'lucide-react';
import { useToast } from '@/components/ui/use-toast';
import { supabase } from '@/lib/customSupabaseClient';
import { format, parseISO } from 'date-fns';
import { es } from 'date-fns/locale';
import { useAuth } from '@/contexts/SupabaseAuthContext';
import { useRolePermissions } from '@/hooks/useRolePermissions';

// Categorías de notas con iconos y colores
const NOTE_CATEGORIES = [
  { value: 'phone', label: 'Llamada Telefónica', icon: Phone, color: 'bg-blue-500', textColor: 'text-blue-500' },
  { value: 'agreement', label: 'Acuerdo/Compromiso', icon: UserCheck, color: 'bg-green-500', textColor: 'text-green-500' },
  { value: 'payment', label: 'Seguimiento de Pago', icon: DollarSign, color: 'bg-yellow-500', textColor: 'text-yellow-500' },
  { value: 'academic', label: 'Asunto Académico', icon: BookOpen, color: 'bg-purple-500', textColor: 'text-purple-500' },
  { value: 'general', label: 'Nota General', icon: FileText, color: 'bg-gray-500', textColor: 'text-gray-500' },
];

const StudentRecordSection = ({ students }) => {
  const [selectedStudentId, setSelectedStudentId] = useState('');
  const [studentData, setStudentData] = useState(null);
  const [notes, setNotes] = useState([]);
  const [loading, setLoading] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  const [isAddNoteOpen, setIsAddNoteOpen] = useState(false);
  const [isEditNoteOpen, setIsEditNoteOpen] = useState(false);
  const [editingNote, setEditingNote] = useState(null);
  const [formData, setFormData] = useState({
    category: 'general',
    content: '',
    is_important: false
  });
  const { toast } = useToast();
  const { user } = useAuth();
  const { canDelete } = useRolePermissions();

  // Obtener el nombre del estudiante según la estructura de datos
  const getStudentName = (student) => {
    return student.full_name || student.name || `${student.first_name || ''} ${student.last_name || ''}`.trim();
  };

  // Filtrar estudiantes basado en el término de búsqueda (nombre o número de alumno)
  const filteredStudents = useMemo(() => {
    if (!searchTerm.trim()) {
      return students.slice(0, 10); // Mostrar solo los primeros 10 si no hay búsqueda
    }
    
    const searchLower = searchTerm.toLowerCase().trim();
    return students.filter(student => {
      const studentName = getStudentName(student).toLowerCase();
      const studentNumber = student.student_number ? String(student.student_number).toLowerCase() : '';
      
      return studentName.includes(searchLower) || studentNumber.includes(searchLower);
    }).slice(0, 20); // Limitar a 20 resultados
  }, [students, searchTerm]);

  // Cerrar dropdown al hacer clic fuera
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (!event.target.closest('.student-search-container')) {
        setIsDropdownOpen(false);
      }
    };

    if (isDropdownOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [isDropdownOpen]);

  // Cargar datos del estudiante y sus notas
  const fetchStudentRecord = async (studentId) => {
    if (!studentId) return;

    setLoading(true);
    try {
      // Obtener datos del estudiante (sin JOIN para evitar errores)
      const { data: student, error: studentError } = await supabase
        .from('students')
        .select('*')
        .eq('id', studentId)
        .single();
      
      if (studentError) throw studentError;
      setStudentData(student);

      // Obtener notas del estudiante (sin JOIN para evitar errores)
      const { data: notesData, error: notesError } = await supabase
        .from('student_notes')
        .select('*')
        .eq('student_id', studentId)
        .order('created_at', { ascending: false });

      if (notesError) throw notesError;
      setNotes(notesData || []);
    } catch (error) {
      toast({
        variant: 'destructive',
        title: 'Error al cargar expediente',
        description: error.message,
      });
    } finally {
      setLoading(false);
    }
  };

  // Cuando se selecciona un estudiante
  useEffect(() => {
    if (selectedStudentId) {
      fetchStudentRecord(selectedStudentId);
    } else {
      setStudentData(null);
      setNotes([]);
    }
  }, [selectedStudentId]);

  // Resetear formulario
  const resetForm = () => {
    setFormData({
      category: 'general',
      content: '',
      is_important: false
    });
  };

  // Agregar nueva nota
  const handleAddNote = async () => {
    if (!formData.content.trim()) {
      toast({
        variant: 'destructive',
        title: 'Error',
        description: 'El contenido de la nota es requerido',
      });
      return;
    }

    try {
      const { data, error } = await supabase
        .from('student_notes')
        .insert([{
          student_id: selectedStudentId,
          category: formData.category,
          content: formData.content.trim(),
          is_important: formData.is_important,
          created_by: user.id
        }])
        .select('*');

      if (error) throw error;

      setNotes([data[0], ...notes]);
      setIsAddNoteOpen(false);
      resetForm();
      
      toast({
        title: 'Nota agregada',
        description: 'La nota se ha guardado correctamente',
      });
    } catch (error) {
      toast({
        variant: 'destructive',
        title: 'Error al guardar nota',
        description: error.message,
      });
    }
  };

  // Editar nota
  const handleEditNote = async () => {
    if (!formData.content.trim()) {
      toast({
        variant: 'destructive',
        title: 'Error',
        description: 'El contenido de la nota es requerido',
      });
      return;
    }

    try {
      const { error } = await supabase
        .from('student_notes')
        .update({
          category: formData.category,
          content: formData.content.trim(),
          is_important: formData.is_important,
          updated_at: new Date().toISOString()
        })
        .eq('id', editingNote.id);

      if (error) throw error;

      // Actualizar la lista de notas
      setNotes(notes.map(note => 
        note.id === editingNote.id 
          ? { ...note, category: formData.category, content: formData.content.trim(), is_important: formData.is_important }
          : note
      ));
      
      setIsEditNoteOpen(false);
      setEditingNote(null);
      resetForm();
      
      toast({
        title: 'Nota actualizada',
        description: 'La nota se ha actualizado correctamente',
      });
    } catch (error) {
      toast({
        variant: 'destructive',
        title: 'Error al actualizar nota',
        description: error.message,
      });
    }
  };

  // Eliminar nota
  const handleDeleteNote = async (noteId) => {
    if (!confirm('¿Estás seguro de que deseas eliminar esta nota?')) return;

    try {
      const { error } = await supabase
        .from('student_notes')
        .delete()
        .eq('id', noteId);

      if (error) throw error;

      setNotes(notes.filter(note => note.id !== noteId));
      
      toast({
        title: 'Nota eliminada',
        description: 'La nota se ha eliminado correctamente',
      });
    } catch (error) {
      toast({
        variant: 'destructive',
        title: 'Error al eliminar nota',
        description: error.message,
      });
    }
  };

  // Abrir modal de edición
  const openEditNote = (note) => {
    setEditingNote(note);
    setFormData({
      category: note.category,
      content: note.content,
      is_important: note.is_important
    });
    setIsEditNoteOpen(true);
  };

  // Obtener el ícono y color de la categoría
  const getCategoryInfo = (categoryValue) => {
    return NOTE_CATEGORIES.find(cat => cat.value === categoryValue) || NOTE_CATEGORIES[4];
  };

  return (
    <div className="space-y-6">
      {/* Header y Buscador */}
      <Card className="bg-slate-800/95 border-slate-700">
        <CardHeader>
          <CardTitle className="text-white flex items-center gap-2">
            <FileText className="w-6 h-6 text-purple-400" />
            Expediente del Alumno
          </CardTitle>
          <CardDescription className="text-slate-300">
            Gestiona anotaciones, acuerdos y seguimiento de cada estudiante
          </CardDescription>

          {/* Buscador de estudiantes */}
          <div className="mt-4 student-search-container relative">
            <Label className="text-slate-200 font-medium mb-2 block">
              Buscar Estudiante
            </Label>
            <div className="relative">
              <Input
                type="text"
                value={searchTerm}
                onChange={(e) => {
                  setSearchTerm(e.target.value);
                  setIsDropdownOpen(true);
                }}
                onFocus={() => setIsDropdownOpen(true)}
                placeholder="Buscar por nombre o número de alumno..."
                className="bg-slate-700/50 border-slate-600 text-white placeholder-slate-400 focus:border-purple-400 focus:ring-purple-400/20 pl-10 pr-10"
                autoComplete="off"
              />
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-slate-400 w-4 h-4" />
              <ChevronDown 
                className={`absolute right-3 top-1/2 transform -translate-y-1/2 text-slate-400 h-4 w-4 transition-transform ${
                  isDropdownOpen ? 'rotate-180' : ''
                }`}
                onClick={() => setIsDropdownOpen(!isDropdownOpen)}
              />
            </div>
            
            {/* Dropdown de resultados */}
            {isDropdownOpen && filteredStudents.length > 0 && (
              <div className="absolute z-50 w-full mt-1 bg-slate-800 border border-slate-600 rounded-md shadow-lg max-h-60 overflow-auto">
                {filteredStudents.map(student => (
                  <div
                    key={student.id}
                    className={`px-3 py-2 cursor-pointer hover:bg-slate-700 ${
                      selectedStudentId === student.id ? 'bg-purple-600/20' : ''
                    }`}
                    onClick={() => {
                      setSelectedStudentId(student.id);
                      setSearchTerm(getStudentName(student));
                      setIsDropdownOpen(false);
                    }}
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <span className="text-white">
                          {getStudentName(student)}
                        </span>
                        {student.student_number && (
                          <span className="text-sm text-blue-400 font-semibold">
                            #{student.student_number}
                          </span>
                        )}
                      </div>
                      {selectedStudentId === student.id && (
                        <Check className="h-4 w-4 text-purple-400" />
                      )}
                    </div>
                    {student.email && (
                      <div className="text-sm text-slate-400">
                        {student.email}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Contador de resultados */}
          {searchTerm && (
            <p className="text-sm text-slate-400 mt-2">
              {filteredStudents.length} estudiante{filteredStudents.length !== 1 ? 's' : ''} encontrado{filteredStudents.length !== 1 ? 's' : ''}
            </p>
          )}
        </CardHeader>
      </Card>

      {/* Información del Estudiante Seleccionado */}
      {selectedStudentId && studentData && !loading && (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.3 }}
        >
          <Card className="bg-slate-800/95 border-slate-700">
            <CardHeader>
              <div className="flex justify-between items-start">
                <div>
                  <CardTitle className="text-white text-2xl">
                    {getStudentName(studentData)}
                  </CardTitle>
                  <div className="flex gap-4 mt-2 text-slate-300">
                    {studentData.student_number && (
                      <p className="text-sm">
                        <span className="text-slate-400">Número:</span>{' '}
                        <span className="text-blue-400 font-semibold">#{studentData.student_number}</span>
                      </p>
                    )}
                    {studentData.course && (
                      <p className="text-sm">
                        <span className="text-slate-400">Curso:</span>{' '}
                        {studentData.course}
                      </p>
                    )}
                    {studentData.email && (
                      <p className="text-sm">
                        <span className="text-slate-400">Email:</span>{' '}
                        {studentData.email}
                      </p>
                    )}
                  </div>
                </div>
                <Button
                  onClick={() => setIsAddNoteOpen(true)}
                  className="bg-purple-600 hover:bg-purple-700 text-white"
                >
                  <Plus className="w-4 h-4 mr-2" />
                  Nueva Nota
                </Button>
              </div>

              {/* Resumen rápido */}
              <div className="grid grid-cols-4 gap-4 mt-4">
                <div className="bg-slate-700/50 p-3 rounded-lg">
                  <p className="text-slate-400 text-xs">Total de Notas</p>
                  <p className="text-white text-2xl font-bold">{notes.length}</p>
                </div>
                <div className="bg-slate-700/50 p-3 rounded-lg">
                  <p className="text-slate-400 text-xs">Importantes</p>
                  <p className="text-yellow-400 text-2xl font-bold">
                    {notes.filter(n => n.is_important).length}
                  </p>
                </div>
                <div className="bg-slate-700/50 p-3 rounded-lg">
                  <p className="text-slate-400 text-xs">Última Nota</p>
                  <p className="text-white text-sm">
                    {notes.length > 0 ? format(parseISO(notes[0].created_at), 'dd/MM/yyyy', { locale: es }) : 'N/A'}
                  </p>
                </div>
                <div className="bg-slate-700/50 p-3 rounded-lg">
                  <p className="text-slate-400 text-xs">Seguimientos</p>
                  <p className="text-white text-2xl font-bold">
                    {notes.filter(n => n.category === 'payment' || n.category === 'agreement').length}
                  </p>
                </div>
              </div>
            </CardHeader>
          </Card>

          {/* Timeline de Notas */}
          <Card className="bg-slate-800/95 border-slate-700">
            <CardHeader>
              <CardTitle className="text-white">Timeline de Anotaciones</CardTitle>
              <CardDescription className="text-slate-300">
                Historial completo de interacciones y notas
              </CardDescription>
            </CardHeader>
            <CardContent>
              {notes.length === 0 ? (
                <div className="text-center py-12">
                  <FileText className="w-16 h-16 text-slate-600 mx-auto mb-4" />
                  <p className="text-slate-400 text-lg">No hay notas registradas</p>
                  <p className="text-slate-500 text-sm mt-2">Agrega la primera nota para este estudiante</p>
                </div>
              ) : (
                <div className="space-y-4">
                  {notes.map((note, index) => {
                    const categoryInfo = getCategoryInfo(note.category);
                    const CategoryIcon = categoryInfo.icon;
                    
                    return (
                      <motion.div
                        key={note.id}
                        initial={{ opacity: 0, x: -20 }}
                        animate={{ opacity: 1, x: 0 }}
                        transition={{ delay: index * 0.05 }}
                        className={`bg-slate-700/50 p-4 rounded-lg border-l-4 ${
                          note.is_important ? 'border-yellow-500' : categoryInfo.color
                        }`}
                      >
                        <div className="flex justify-between items-start mb-2">
                          <div className="flex items-center gap-2">
                            <CategoryIcon className={`w-5 h-5 ${categoryInfo.textColor}`} />
                            <Badge variant="outline" className={`${categoryInfo.textColor} border-current`}>
                              {categoryInfo.label}
                            </Badge>
                            {note.is_important && (
                              <Badge variant="outline" className="text-yellow-500 border-yellow-500">
                                ⭐ Importante
                              </Badge>
                            )}
                          </div>
                          <div className="flex gap-2">
                            <Button
                              size="sm"
                              variant="ghost"
                              onClick={() => openEditNote(note)}
                              className="text-blue-400 hover:text-blue-300 hover:bg-blue-400/10"
                            >
                              <Edit className="w-4 h-4" />
                            </Button>
                            {canDelete && (
                              <Button
                                size="sm"
                                variant="ghost"
                                onClick={() => handleDeleteNote(note.id)}
                                className="text-red-400 hover:text-red-300 hover:bg-red-400/10"
                              >
                                <Trash2 className="w-4 h-4" />
                              </Button>
                            )}
                          </div>
                        </div>
                        
                        <p className="text-white mb-3 whitespace-pre-wrap">{note.content}</p>
                        
                        <div className="flex items-center gap-4 text-xs text-slate-400">
                          <div className="flex items-center gap-1">
                            <Clock className="w-3 h-3" />
                            {format(parseISO(note.created_at), "dd 'de' MMMM 'de' yyyy 'a las' HH:mm", { locale: es })}
                          </div>
                          {note.created_by && (
                            <div className="flex items-center gap-1">
                              <User className="w-3 h-3" />
                              Registrado por usuario
                            </div>
                          )}
                        </div>
                      </motion.div>
                    );
                  })}
                </div>
              )}
            </CardContent>
          </Card>
        </motion.div>
      )}

      {/* Loading State */}
      {loading && (
        <div className="flex items-center justify-center py-12">
          <Loader2 className="w-8 h-8 animate-spin text-purple-400" />
          <span className="ml-2 text-slate-400">Cargando expediente...</span>
        </div>
      )}

      {/* Modal Agregar Nota */}
      <Dialog open={isAddNoteOpen} onOpenChange={setIsAddNoteOpen}>
        <DialogContent className="bg-slate-800 border-slate-700 text-white">
          <DialogHeader>
            <DialogTitle>Agregar Nueva Nota</DialogTitle>
            <DialogDescription className="text-slate-300">
              Registra una nueva anotación para el expediente del estudiante
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            <div>
              <Label className="text-slate-200 mb-2 block">Categoría</Label>
              <Select value={formData.category} onValueChange={(value) => setFormData({ ...formData, category: value })}>
                <SelectTrigger className="bg-slate-700/50 border-slate-600 text-white">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent className="bg-slate-800 border-slate-700">
                  {NOTE_CATEGORIES.map(cat => {
                    const Icon = cat.icon;
                    return (
                      <SelectItem key={cat.value} value={cat.value} className="text-white">
                        <div className="flex items-center gap-2">
                          <Icon className={`w-4 h-4 ${cat.textColor}`} />
                          {cat.label}
                        </div>
                      </SelectItem>
                    );
                  })}
                </SelectContent>
              </Select>
            </div>

            <div>
              <Label className="text-slate-200 mb-2 block">Contenido de la Nota</Label>
              <Textarea
                value={formData.content}
                onChange={(e) => setFormData({ ...formData, content: e.target.value })}
                placeholder="Escribe aquí los detalles de la conversación, acuerdo o seguimiento..."
                className="bg-slate-700/50 border-slate-600 text-white placeholder-slate-400 min-h-[120px]"
                rows={5}
              />
            </div>

            <div className="flex items-center gap-2">
              <input
                type="checkbox"
                id="is_important"
                checked={formData.is_important}
                onChange={(e) => setFormData({ ...formData, is_important: e.target.checked })}
                className="w-4 h-4 rounded border-slate-600 bg-slate-700 text-yellow-500 focus:ring-yellow-500"
              />
              <Label htmlFor="is_important" className="text-slate-200 cursor-pointer">
                Marcar como importante ⭐
              </Label>
            </div>
          </div>

          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => {
                setIsAddNoteOpen(false);
                resetForm();
              }}
              className="border-slate-600 text-slate-300 hover:bg-slate-700"
            >
              Cancelar
            </Button>
            <Button
              onClick={handleAddNote}
              className="bg-purple-600 hover:bg-purple-700 text-white"
            >
              Guardar Nota
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Modal Editar Nota */}
      <Dialog open={isEditNoteOpen} onOpenChange={setIsEditNoteOpen}>
        <DialogContent className="bg-slate-800 border-slate-700 text-white">
          <DialogHeader>
            <DialogTitle>Editar Nota</DialogTitle>
            <DialogDescription className="text-slate-300">
              Modifica la información de esta anotación
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            <div>
              <Label className="text-slate-200 mb-2 block">Categoría</Label>
              <Select value={formData.category} onValueChange={(value) => setFormData({ ...formData, category: value })}>
                <SelectTrigger className="bg-slate-700/50 border-slate-600 text-white">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent className="bg-slate-800 border-slate-700">
                  {NOTE_CATEGORIES.map(cat => {
                    const Icon = cat.icon;
                    return (
                      <SelectItem key={cat.value} value={cat.value} className="text-white">
                        <div className="flex items-center gap-2">
                          <Icon className={`w-4 h-4 ${cat.textColor}`} />
                          {cat.label}
                        </div>
                      </SelectItem>
                    );
                  })}
                </SelectContent>
              </Select>
            </div>

            <div>
              <Label className="text-slate-200 mb-2 block">Contenido de la Nota</Label>
              <Textarea
                value={formData.content}
                onChange={(e) => setFormData({ ...formData, content: e.target.value })}
                placeholder="Escribe aquí los detalles de la conversación, acuerdo o seguimiento..."
                className="bg-slate-700/50 border-slate-600 text-white placeholder-slate-400 min-h-[120px]"
                rows={5}
              />
            </div>

            <div className="flex items-center gap-2">
              <input
                type="checkbox"
                id="is_important_edit"
                checked={formData.is_important}
                onChange={(e) => setFormData({ ...formData, is_important: e.target.checked })}
                className="w-4 h-4 rounded border-slate-600 bg-slate-700 text-yellow-500 focus:ring-yellow-500"
              />
              <Label htmlFor="is_important_edit" className="text-slate-200 cursor-pointer">
                Marcar como importante ⭐
              </Label>
            </div>
          </div>

          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => {
                setIsEditNoteOpen(false);
                setEditingNote(null);
                resetForm();
              }}
              className="border-slate-600 text-slate-300 hover:bg-slate-700"
            >
              Cancelar
            </Button>
            <Button
              onClick={handleEditNote}
              className="bg-purple-600 hover:bg-purple-700 text-white"
            >
              Actualizar Nota
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default StudentRecordSection;
