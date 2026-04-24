import React, { useState, useEffect, useCallback } from 'react';
import { motion } from 'framer-motion';
import { supabase } from '@/lib/customSupabaseClient';
import { useToast } from '@/hooks/use-toast';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { PlusCircle, FileText, Edit, Trash2, Search, Loader2, FileSignature, BookOpen, Award, ClipboardList, GraduationCap, Printer } from 'lucide-react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter, DialogClose } from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { format } from 'date-fns';

const DocumentIcon = ({ type }) => {
  const icons = {
    Certificado: <GraduationCap className="w-6 h-6 text-purple-400" />,
    Constancia: <FileSignature className="w-6 h-6 text-blue-400" />,
    Diploma: <Award className="w-6 h-6 text-yellow-400" />,
    Boleta: <ClipboardList className="w-6 h-6 text-green-400" />,
    Kardex: <BookOpen className="w-6 h-6 text-pink-400" />,
    default: <FileText className="w-6 h-6 text-gray-400" />,
  };
  return icons[type] || icons.default;
};

const TemplateForm = ({ open, setOpen, template, refreshData }) => {
  const [formData, setFormData] = useState({ name: '', type: '', content: '' });
  const [isSubmitting, setIsSubmitting] = useState(false);
  const { toast } = useToast();

  useEffect(() => {
    if (template) setFormData({ name: template.name, type: template.type, content: template.content || '' });
    else setFormData({ name: '', type: '', content: '' });
  }, [template, open]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setIsSubmitting(true);
    try {
      let error;
      if (template) ({ error } = await supabase.from('document_templates').update({ ...formData, updated_at: new Date() }).eq('id', template.id));
      else ({ error } = await supabase.from('document_templates').insert([{ ...formData }]));
      if (error) throw error;
      toast({ title: `Plantilla ${template ? 'actualizada' : 'creada'}`, description: `La plantilla se ha ${template ? 'actualizado' : 'guardado'} correctamente.` });
      refreshData();
      setOpen(false);
    } catch (error) {
      toast({ variant: "destructive", title: "Error al guardar la plantilla", description: error.message });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogContent className="glass-effect border-purple-500/50 text-white"><DialogHeader><DialogTitle className="gradient-text">{template ? 'Editar Plantilla' : 'Crear Nueva Plantilla'}</DialogTitle><DialogDescription className="text-white/70">{template ? 'Modifica los detalles de la plantilla.' : 'Completa los campos para crear una nueva plantilla.'}</DialogDescription></DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2"><Label htmlFor="name" className="text-white">Nombre</Label><Input id="name" value={formData.name} onChange={(e) => setFormData({...formData, name: e.target.value})} className="input-field" placeholder="Ej: Certificado de Estudios" required /></div>
          <div className="space-y-2"><Label htmlFor="type" className="text-white">Tipo</Label><Select onValueChange={(value) => setFormData({...formData, type: value})} value={formData.type}><SelectTrigger className="input-field"><SelectValue placeholder="Selecciona un tipo" /></SelectTrigger><SelectContent><SelectItem value="Certificado">Certificado</SelectItem><SelectItem value="Constancia">Constancia</SelectItem><SelectItem value="Diploma">Diploma</SelectItem><SelectItem value="Boleta">Boleta</SelectItem><SelectItem value="Kardex">Kardex</SelectItem></SelectContent></Select></div>
          <div className="space-y-2"><Label htmlFor="content" className="text-white">Contenido</Label><Textarea id="content" value={formData.content} onChange={(e) => setFormData({...formData, content: e.target.value})} className="input-field h-40" placeholder="Usa variables como {nombre_estudiante}, {fecha}, {curso}, etc." /><p className="text-xs text-white/50">Próximamente: Editor visual drag & drop.</p></div>
          <DialogFooter><DialogClose asChild><Button type="button" variant="secondary" className="btn-secondary">Cancelar</Button></DialogClose><Button type="submit" className="btn-primary" disabled={isSubmitting}>{isSubmitting ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Guardar'}</Button></DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
};

const GenerateDocumentForm = ({ open, setOpen, students, templates, refreshData }) => {
    const [formData, setFormData] = useState({ student_id: '', template_id: '' });
    const [isSubmitting, setIsSubmitting] = useState(false);
    const { toast } = useToast();

    const handleSubmit = async (e) => {
        e.preventDefault();
        setIsSubmitting(true);
        try {
            const template = templates.find(t => t.id === formData.template_id);
            if (!template) throw new Error("Plantilla no encontrada");

            const dataToInsert = {
                student_id: formData.student_id,
                template_id: formData.template_id,
                document_type: template.type,
                status: 'issued',
                folio: `DOC-${Date.now()}`,
                issue_date: new Date().toISOString()
            };

            const { error } = await supabase.from('issued_documents').insert([dataToInsert]);
            if (error) throw error;
            
            toast({ title: 'Documento generado', description: 'El documento ha sido generado y registrado exitosamente.' });
            refreshData();
            setOpen(false);
        } catch (error) {
            toast({ variant: 'destructive', title: 'Error al generar documento', description: error.message });
        } finally {
            setIsSubmitting(false);
        }
    };

    return (
        <Dialog open={open} onOpenChange={setOpen}>
            <DialogContent className="glass-effect text-white">
                <DialogHeader><DialogTitle className="gradient-text">Generar Nuevo Documento</DialogTitle><DialogDescription className="text-white/70">Selecciona el estudiante y la plantilla para generar un nuevo documento.</DialogDescription></DialogHeader>
                <form onSubmit={handleSubmit} className="space-y-4">
                    <div><Label className="text-white/80">Estudiante</Label><Select onValueChange={(v) => setFormData({...formData, student_id: v})}><SelectTrigger className="input-field"><SelectValue placeholder="Selecciona un estudiante..." /></SelectTrigger><SelectContent>{students.map(s => <SelectItem key={s.id} value={s.id}>{s.name}</SelectItem>)}</SelectContent></Select></div>
                    <div><Label className="text-white/80">Plantilla</Label><Select onValueChange={(v) => setFormData({...formData, template_id: v})}><SelectTrigger className="input-field"><SelectValue placeholder="Selecciona una plantilla..." /></SelectTrigger><SelectContent>{templates.map(t => <SelectItem key={t.id} value={t.id}>{t.name} ({t.type})</SelectItem>)}</SelectContent></Select></div>
                    <DialogFooter><DialogClose asChild><Button type="button" variant="secondary" className="btn-secondary">Cancelar</Button></DialogClose><Button type="submit" className="btn-primary" disabled={isSubmitting}>{isSubmitting ? <Loader2 className="w-4 h-4 animate-spin"/> : "Generar Documento"}</Button></DialogFooter>
                </form>
            </DialogContent>
        </Dialog>
    );
};

const DocumentsSection = ({ students, refreshData: refreshAllData }) => {
  const [documents, setDocuments] = useState([]);
  const [templates, setTemplates] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [isTemplateFormOpen, setIsTemplateFormOpen] = useState(false);
  const [isGenerateFormOpen, setIsGenerateFormOpen] = useState(false);
  const [selectedTemplate, setSelectedTemplate] = useState(null);
  const { toast } = useToast();

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const [docsRes, templatesRes] = await Promise.all([
        supabase.from('issued_documents').select('*, students(name, course)'),
        supabase.from('document_templates').select('*').order('name', { ascending: true })
      ]);
      if (docsRes.error) throw docsRes.error;
      if (templatesRes.error) throw templatesRes.error;
      setDocuments(docsRes.data);
      setTemplates(templatesRes.data);
    } catch (error) {
      toast({ variant: "destructive", title: "Error al cargar datos", description: error.message });
    } finally {
      setLoading(false);
    }
  }, [toast]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);
  
  const handleFinalRefresh = () => {
    fetchData();
    if(refreshAllData) refreshAllData();
  };

  const handlePrint = (doc) => {
    const template = templates.find(t => t.id === doc.template_id);
    if (!template) {
        toast({variant: 'destructive', title: 'Plantilla no encontrada'});
        return;
    }
    const student = students.find(s => s.id === doc.student_id);
    let content = template.content;
    content = content.replace(/{nombre_estudiante}/g, student?.name || 'N/A');
    content = content.replace(/{fecha}/g, format(new Date(doc.issue_date), 'dd/MM/yyyy'));
    content = content.replace(/{curso}/g, student?.course || 'N/A');
    content = content.replace(/{folio}/g, doc.folio || 'N/A');

    const printWindow = window.open('', '_blank');
    printWindow.document.write(`<html><head><title>Imprimir Documento</title></head><body>${content}</body></html>`);
    printWindow.document.close();
    printWindow.print();
  };

  const handleDeleteTemplate = async (templateId) => {
    if (!window.confirm("¿Estás seguro de que quieres eliminar esta plantilla?")) return;
    try {
      const { error } = await supabase.from('document_templates').delete().eq('id', templateId);
      if (error) throw error;
      toast({ title: "Plantilla eliminada" });
      fetchData();
    } catch(error) {
       toast({ variant: "destructive", title: "Error al eliminar plantilla", description: error.message });
    }
  };

  const filteredDocuments = documents.filter(doc =>
    doc.students?.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    doc.document_type.toLowerCase().includes(searchTerm.toLowerCase()) ||
    doc.folio?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const getStatusVariant = (status) => {
    switch (status) {
      case 'issued': return 'paid';
      case 'draft': return 'pending';
      case 'canceled': return 'overdue';
      default: return 'default';
    }
  };

  if (loading) return <div className="flex justify-center items-center h-full"><Loader2 className="h-12 w-12 animate-spin text-purple-400" /></div>;

  return (
    <div className="space-y-6">
      <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="flex justify-between items-center">
        <div><h1 className="text-3xl font-bold gradient-text mb-2">Gestión de Documentos</h1><p className="text-white/70">Administra certificados, constancias y documentos oficiales.</p></div>
        <Button className="btn-primary" onClick={() => setIsGenerateFormOpen(true)}><PlusCircle className="w-4 h-4 mr-2" />Generar Documento</Button>
      </motion.div>

      <Tabs defaultValue="management">
        <TabsList className="grid w-full grid-cols-2 bg-white/10 border-white/20"><TabsTrigger value="management">Gestión</TabsTrigger><TabsTrigger value="templates">Plantillas</TabsTrigger></TabsList>
        <TabsContent value="management" className="mt-6 space-y-4">
          <div className="relative"><Search className="absolute left-3 top-1/2 -translate-y-1/2 text-white/50" /><Input placeholder="Buscar por estudiante, tipo o folio..." className="input-field pl-10" value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} /></div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {filteredDocuments.map((doc, index) => (
              <motion.div key={doc.id} initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: index * 0.05 }}>
                <Card className="glass-effect border-purple-500/30 card-hover h-full flex flex-col">
                  <CardHeader><div className="flex justify-between items-start"><div><CardTitle className="text-white flex items-center gap-2"><DocumentIcon type={doc.document_type} />{doc.document_type}</CardTitle><CardDescription className="text-white/60 mt-1">Folio: {doc.folio || 'N/A'}</CardDescription></div><Badge variant={getStatusVariant(doc.status)} className="capitalize">{doc.status}</Badge></div></CardHeader>
                  <CardContent className="flex-grow"><p className="text-white/80">Estudiante: <span className="font-semibold">{doc.students?.name || 'No asignado'}</span></p><p className="text-white/80">Emitido: <span className="font-semibold">{doc.issue_date ? format(new Date(doc.issue_date), 'dd/MM/yyyy') : 'Pendiente'}</span></p></CardContent>
                  <div className="p-4 pt-0 flex justify-end gap-2"><Button variant="ghost" size="icon" onClick={() => handlePrint(doc)}><Printer className="w-4 h-4 text-cyan-400" /></Button></div>
                </Card>
              </motion.div>
            ))}
          </div>
        </TabsContent>
        <TabsContent value="templates" className="mt-6 space-y-4">
            <div className="flex justify-between items-center"><div><h2 className="text-2xl font-semibold text-white">Plantillas</h2><p className="text-white/70">Crea y gestiona tus plantillas.</p></div><Button className="btn-secondary" onClick={() => {setSelectedTemplate(null); setIsTemplateFormOpen(true);}}><PlusCircle className="w-4 h-4 mr-2" />Crear Plantilla</Button></div>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mt-6">
                {templates.map((template, index) => (
                <motion.div key={template.id} initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: index * 0.05 }}>
                    <Card className="glass-effect border-white/20 card-hover"><CardHeader><CardTitle className="text-white flex items-center gap-3"><DocumentIcon type={template.type} />{template.name}</CardTitle></CardHeader>
                    <CardContent><p className="text-white/70 text-sm">Tipo: {template.type}</p><div className="flex justify-end gap-2 mt-4"><Button variant="ghost" size="icon" onClick={() => {setSelectedTemplate(template); setIsTemplateFormOpen(true);}}><Edit className="w-4 h-4 text-yellow-400" /></Button><Button variant="ghost" size="icon" onClick={() => handleDeleteTemplate(template.id)}><Trash2 className="w-4 h-4 text-red-400" /></Button></div></CardContent></Card>
                </motion.div>
                ))}
            </div>
        </TabsContent>
      </Tabs>
      <TemplateForm open={isTemplateFormOpen} setOpen={setIsTemplateFormOpen} template={selectedTemplate} refreshData={handleFinalRefresh} />
      <GenerateDocumentForm open={isGenerateFormOpen} setOpen={setIsGenerateFormOpen} students={students} templates={templates} refreshData={handleFinalRefresh} />
    </div>
  );
};

export default DocumentsSection;