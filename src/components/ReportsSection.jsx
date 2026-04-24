import React, { useState, useEffect, useCallback } from 'react';
import { motion } from 'framer-motion';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, PieChart, Pie, Cell } from 'recharts';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { DollarSign, Users, TrendingUp, FileText, Calendar, Loader2, Archive, UserPlus, BookOpen } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/lib/customSupabaseClient';
import { format, parseISO, startOfMonth, endOfMonth } from 'date-fns';
import { generateIncomeByConceptPdf, generateEnrollmentsPdf, generateCashCutsPdf } from '@/lib/pdfGenerator';

const CustomTooltip = ({ active, payload, label, formatter }) => {
  if (active && payload && payload.length) {
    return (
      <div className="p-2 bg-slate-800 border border-slate-700 rounded-lg text-white">
        <p className="label font-semibold">{label}</p>
        {payload.map((entry, index) => (
          <p key={`item-${index}`} style={{ color: entry.color }}>
            {`${entry.name}: ${formatter ? formatter(entry.value) : entry.value}`}
          </p>
        ))}
      </div>
    );
  }
  return null;
};

const ReportsSection = ({ schoolSettings }) => {
  const { toast } = useToast();
  const [loading, setLoading] = useState(false);
  const [reportData, setReportData] = useState({ payments: [], students: [], cashCuts: [] });
  const [paymentConcepts, setPaymentConcepts] = useState([]);
  const [selectedConcept, setSelectedConcept] = useState('');
  
  const today = new Date();
  const firstDayOfMonth = format(startOfMonth(today), 'yyyy-MM-dd');
  const lastDayOfMonth = format(endOfMonth(today), 'yyyy-MM-dd');

  const [dateRange, setDateRange] = useState({ from: firstDayOfMonth, to: lastDayOfMonth });

  const handleDateChange = (e) => {
    setDateRange(prev => ({ ...prev, [e.target.name]: e.target.value }));
  };

  const fetchReportData = useCallback(async () => {
    if (!dateRange.from || !dateRange.to) {
      toast({ variant: 'destructive', title: 'Fechas inválidas', description: 'Por favor, selecciona un rango de fechas válido.' });
      return;
    }
    setLoading(true);
    try {
      const [paymentsRes, studentsRes, cashCutsRes] = await Promise.all([
        supabase.from('payments').select('*, students(name)').gte('paid_date', dateRange.from).lte('paid_date', dateRange.to).eq('status', 'paid'),
        supabase.from('students').select('*').gte('enrollment_date', dateRange.from).lte('enrollment_date', dateRange.to),
        supabase.from('cash_cuts').select('*').gte('created_at', `${dateRange.from}T00:00:00Z`).lte('created_at', `${dateRange.to}T23:59:59Z`)
      ]);

      if (paymentsRes.error) throw paymentsRes.error;
      if (studentsRes.error) throw studentsRes.error;
      if (cashCutsRes.error) throw cashCutsRes.error;

      setReportData({ payments: paymentsRes.data, students: studentsRes.data, cashCuts: cashCutsRes.data });
      toast({ title: 'Reportes actualizados', description: `Mostrando datos desde ${dateRange.from} hasta ${dateRange.to}.` });
    } catch (error) {
      toast({ variant: 'destructive', title: 'Error al cargar datos', description: error.message });
    } finally {
      setLoading(false);
    }
  }, [dateRange, toast]);

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

  // Generar reporte por concepto
  const generateConceptReport = async () => {
    if (!selectedConcept) {
      toast({ variant: 'destructive', title: 'Concepto requerido', description: 'Selecciona un concepto para generar el reporte.' });
      return;
    }

    setLoading(true);
    try {
      const [paymentsRes, studentsRes] = await Promise.all([
        supabase.from('payments').select('*').gte('paid_date', dateRange.from).lte('paid_date', dateRange.to),
        supabase.from('students').select('*')
      ]);

      if (paymentsRes.error) throw paymentsRes.error;
      if (studentsRes.error) throw studentsRes.error;

      // Importar función de PDF dinámicamente
      const { generatePaymentsByConceptPdf } = await import('@/lib/pdfGenerator');
      await generatePaymentsByConceptPdf(paymentsRes.data, studentsRes.data, selectedConcept, dateRange, schoolSettings);
      
      toast({ title: 'Reporte generado', description: `Reporte de ${selectedConcept} generado exitosamente.` });
    } catch (error) {
      console.error('Error generating concept report:', error);
      toast({ variant: 'destructive', title: 'Error al generar reporte', description: error.message });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchReportData();
    loadPaymentConcepts();
  }, []);

  // --- Data Processing ---
  const totalRevenue = reportData.payments.reduce((sum, p) => sum + Number(p.amount), 0);
  const incomeByConcept = reportData.payments.reduce((acc, p) => {
    acc[p.concept] = (acc[p.concept] || 0) + Number(p.amount);
    return acc;
  }, {});
  const incomeByConceptData = Object.keys(incomeByConcept).map(concept => ({ name: concept, Ingresos: incomeByConcept[concept] }));
  const totalEnrollments = reportData.students.length;
  const studentsByCourseData = Object.entries(reportData.students.reduce((acc, s) => {
    acc[s.course] = (acc[s.course] || 0) + 1;
    return acc;
  }, {})).map(([name, value]) => ({ name, value }));
  const totalCashCutsValue = reportData.cashCuts.reduce((sum, c) => sum + Number(c.total_amount), 0);

  const kpiCards = [
    { title: 'Ingresos Totales', value: `$${totalRevenue.toLocaleString('es-MX')}`, icon: TrendingUp, color: 'text-green-400' },
    { title: 'Nuevas Inscripciones', value: totalEnrollments, icon: UserPlus, color: 'text-blue-400' },
    { title: 'Cursos Populares', value: studentsByCourseData[0]?.name || 'N/A', icon: BookOpen, color: 'text-purple-400' },
    { title: 'Total en Cortes', value: `$${totalCashCutsValue.toLocaleString('es-MX')}`, icon: Archive, color: 'text-yellow-400' },
  ];

  return (
    <div className="space-y-6">
      <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="flex justify-between items-center flex-wrap gap-4">
        <div>
          <h1 className="text-3xl font-bold gradient-text mb-2">Reportes Avanzados</h1>
          <p className="text-white/70">Genera reportes detallados con rangos de fecha personalizados.</p>
        </div>
      </motion.div>

      <Card className="glass-effect border-white/20">
        <CardHeader>
          <CardTitle className="text-white flex items-center gap-2"><Calendar className="w-5 h-5" />Seleccionar Periodo</CardTitle>
          <div className="flex flex-wrap items-end gap-4 pt-2">
            <div><Label htmlFor="from" className="text-white/80">Desde</Label><Input id="from" name="from" type="date" value={dateRange.from} onChange={handleDateChange} className="input-field" /></div>
            <div><Label htmlFor="to" className="text-white/80">Hasta</Label><Input id="to" name="to" type="date" value={dateRange.to} onChange={handleDateChange} className="input-field" /></div>
            <Button onClick={fetchReportData} className="btn-primary" disabled={loading}>
              {loading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
              Generar Reporte
            </Button>
          </div>
        </CardHeader>
      </Card>

      {loading ? (
        <div className="flex justify-center items-center h-64"><Loader2 className="h-12 w-12 animate-spin text-purple-400" /></div>
      ) : (
        <>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            {kpiCards.map((card, index) => (
              <motion.div key={card.title} initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: index * 0.1 }}>
                <Card className="glass-effect border-white/20 card-hover">
                  <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2"><CardTitle className="text-sm font-medium text-white/80">{card.title}</CardTitle><card.icon className={`h-5 w-5 ${card.color}`} /></CardHeader>
                  <CardContent><div className="text-2xl font-bold text-white">{card.value}</div></CardContent>
                </Card>
              </motion.div>
            ))}
          </div>

          <Tabs defaultValue="income">
            <TabsList className="grid w-full grid-cols-4 bg-white/10 border-white/20">
              <TabsTrigger value="income">Ingresos por Concepto</TabsTrigger>
              <TabsTrigger value="concept_report">Reportes por Concepto</TabsTrigger>
              <TabsTrigger value="enrollments">Inscripciones</TabsTrigger>
              <TabsTrigger value="cash_cuts">Cortes de Caja</TabsTrigger>
            </TabsList>

            <TabsContent value="income" className="mt-6">
              <Card className="glass-effect border-white/20">
                <CardHeader className="flex-row justify-between items-center">
                  <div>
                    <CardTitle className="text-white">Reporte de Ingresos por Concepto</CardTitle>
                    <CardDescription className="text-white/60">Desglose de ingresos pagados en el periodo seleccionado.</CardDescription>
                  </div>
                  <Button onClick={() => generateIncomeByConceptPdf(reportData.payments, dateRange, schoolSettings)} className="btn-secondary" disabled={reportData.payments.length === 0}><FileText className="w-4 h-4 mr-2" />Descargar PDF</Button>
                </CardHeader>
                <CardContent>
                  <div className="h-80"><ResponsiveContainer width="100%" height="100%"><BarChart data={incomeByConceptData}><XAxis dataKey="name" stroke="#9ca3af" fontSize={12} tickLine={false} axisLine={false} /><YAxis stroke="#9ca3af" fontSize={12} tickLine={false} axisLine={false} tickFormatter={(value) => `$${value/1000}k`} /><Tooltip content={<CustomTooltip formatter={(value) => `$${value.toLocaleString()}`} />} cursor={{ fill: 'rgba(139, 92, 246, 0.1)' }} /><Bar dataKey="Ingresos" fill="url(#colorIncome)" radius={[4, 4, 0, 0]} /><defs><linearGradient id="colorIncome" x1="0" y1="0" x2="0" y2="1"><stop offset="5%" stopColor="#8b5cf6" stopOpacity={0.8}/><stop offset="95%" stopColor="#a855f7" stopOpacity={0.2}/></linearGradient></defs></BarChart></ResponsiveContainer></div>
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="concept_report" className="mt-6">
              <Card className="glass-effect border-white/20">
                <CardHeader>
                  <CardTitle className="text-white">Reporte Detallado por Concepto</CardTitle>
                  <CardDescription className="text-white/60">Genera un reporte detallado de pagos filtrado por concepto específico.</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="flex gap-4 items-end">
                    <div className="flex-1">
                      <Label htmlFor="concept-select" className="text-white/80">Seleccionar Concepto</Label>
                      <Select value={selectedConcept} onValueChange={setSelectedConcept}>
                        <SelectTrigger className="input-field">
                          <SelectValue placeholder="Selecciona un concepto" />
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
                    <Button 
                      onClick={generateConceptReport} 
                      className="btn-primary" 
                      disabled={loading || !selectedConcept}
                    >
                      {loading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <FileText className="w-4 h-4 mr-2" />}
                      Generar PDF
                    </Button>
                  </div>
                  
                  {selectedConcept && (
                    <div className="p-4 bg-white/5 rounded-lg">
                      <p className="text-white/80 text-sm">
                        <strong>Concepto seleccionado:</strong> {selectedConcept}
                      </p>
                      <p className="text-white/60 text-sm mt-1">
                        El reporte incluirá todos los pagos de "{selectedConcept}" en el periodo seleccionado, 
                        mostrando nombre del estudiante, monto, fecha de pago y totales.
                      </p>
                    </div>
                  )}
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="enrollments" className="mt-6">
              <Card className="glass-effect border-white/20">
                <CardHeader className="flex-row justify-between items-center">
                  <div>
                    <CardTitle className="text-white">Reporte de Inscripciones</CardTitle>
                    <CardDescription className="text-white/60">Nuevos estudiantes registrados en el periodo.</CardDescription>
                  </div>
                  <Button onClick={() => generateEnrollmentsPdf(reportData.students, dateRange, schoolSettings)} className="btn-secondary" disabled={reportData.students.length === 0}><FileText className="w-4 h-4 mr-2" />Descargar PDF</Button>
                </CardHeader>
                <CardContent>
                  <div className="h-80"><ResponsiveContainer width="100%" height="100%"><PieChart><Pie data={studentsByCourseData} dataKey="value" nameKey="name" cx="50%" cy="50%" outerRadius={100} fill="#8b5cf6" label>{studentsByCourseData.map((entry, index) => (<Cell key={`cell-${index}`} fill={`hsl(262, 80%, ${50 + index * 5}%)`} />))}</Pie><Tooltip content={<CustomTooltip />} /></PieChart></ResponsiveContainer></div>
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="cash_cuts" className="mt-6">
              <Card className="glass-effect border-white/20">
                <CardHeader className="flex-row justify-between items-center">
                  <div>
                    <CardTitle className="text-white">Reporte de Cortes de Caja</CardTitle>
                    <CardDescription className="text-white/60">Resumen de cortes realizados en el periodo.</CardDescription>
                  </div>
                  <Button onClick={() => generateCashCutsPdf(reportData.cashCuts, dateRange, schoolSettings)} className="btn-secondary" disabled={reportData.cashCuts.length === 0}><FileText className="w-4 h-4 mr-2" />Descargar PDF</Button>
                </CardHeader>
                <CardContent>
                  <ul className="space-y-2">
                    {reportData.cashCuts.length > 0 ? reportData.cashCuts.map(cut => (
                      <li key={cut.id} className="flex justify-between items-center p-3 bg-white/5 rounded-lg">
                        <span className="font-medium text-white">Corte #{cut.cut_number}</span>
                        <span className="text-white/80">{format(parseISO(cut.created_at), 'dd MMM yyyy')}</span>
                        <span className="font-bold text-green-400">${Number(cut.total_amount).toLocaleString('es-MX')}</span>
                      </li>
                    )) : <p className="text-center text-white/60 py-8">No se encontraron cortes de caja en este periodo.</p>}
                  </ul>
                </CardContent>
              </Card>
            </TabsContent>
          </Tabs>
        </>
      )}
    </div>
  );
};

export default ReportsSection;