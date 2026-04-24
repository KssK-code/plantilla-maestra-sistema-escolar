
import React, { useState, useEffect, useCallback } from 'react';
import { motion } from 'framer-motion';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Loader2, History, User, Search, Clock } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/lib/customSupabaseClient';
import { format, parseISO } from 'date-fns';
import { es } from 'date-fns/locale';

const AuditLogSection = () => {
  const [logs, setLogs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const { toast } = useToast();

  const fetchLogs = useCallback(async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('audit_log')
        .select('*')
        .order('created_at', { ascending: false });

      if (error && error.code !== '42P01') { // 42P01: undefined_table. Ignore this error.
        throw error;
      }
      setLogs(data || []);
    } catch (error) {
      toast({
        variant: 'destructive',
        title: 'Error al cargar la bitácora',
        description: error.message,
      });
    } finally {
      setLoading(false);
    }
  }, [toast]);

  useEffect(() => {
    fetchLogs();
  }, [fetchLogs]);

  const filteredLogs = logs.filter(log => {
    const user = log.user_full_name?.toLowerCase() || '';
    const action = log.action?.toLowerCase() || '';
    const details = JSON.stringify(log.details)?.toLowerCase() || '';
    const search = searchTerm.toLowerCase();

    return user.includes(search) || action.includes(search) || details.includes(search);
  });
  
  const formatAction = (action) => {
    switch (action) {
      case 'delete_payment':
        return 'Pago Eliminado';
      case 'delete_cash_cut':
        return 'Corte de Caja Eliminado';
      default:
        return action;
    }
  }

  const renderDetails = (log) => {
    if (!log.details) return 'N/A';

    switch (log.action) {
      case 'delete_payment':
        return `Concepto: ${log.details.concept}, Monto: $${log.details.amount?.toLocaleString()}, Alumno: ${log.details.student_name}`;
      case 'delete_cash_cut':
        return `Corte #${log.details.cut_number}, Total: $${log.details.total_amount?.toLocaleString()}`;
      default:
        return JSON.stringify(log.details);
    }
  };

  if(loading){
    return <div className="flex justify-center items-center h-60"><Loader2 className="h-8 w-8 animate-spin text-purple-400" /></div>;
  }
  
  if (logs.length === 0) {
      return (
        <div className="space-y-6">
            <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}>
                <h1 className="text-3xl font-bold gradient-text mb-2">Bitácora de Actividad</h1>
                <p className="text-white/70">La funcionalidad de bitácora ha sido deshabilitada.</p>
            </motion.div>
             <Card className="glass-effect border-white/20">
                <CardHeader>
                    <CardTitle className="text-white flex items-center gap-2">
                        <History className="w-5 h-5" />
                        Información
                    </CardTitle>
                </CardHeader>
                <CardContent>
                    <p className="text-center py-10 text-white/60">
                        La tabla de bitácora (`audit_log`) fue eliminada para simplificar el sistema y resolver problemas de borrado.
                    </p>
                </CardContent>
             </Card>
        </div>
      );
  }

  return (
    <div className="space-y-6">
      <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}>
        <h1 className="text-3xl font-bold gradient-text mb-2">Bitácora de Actividad</h1>
        <p className="text-white/70">Registro de acciones importantes realizadas en el sistema.</p>
      </motion.div>

      <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }}>
        <Card className="glass-effect border-white/20">
          <CardHeader>
            <div className="flex justify-between items-center">
                <CardTitle className="text-white flex items-center gap-2">
                    <History className="w-5 h-5" />
                    Registros
                </CardTitle>
                <div className="relative">
                    <Search className="w-4 h-4 absolute left-3 top-1/2 transform -translate-y-1/2 text-white/60" />
                    <Input 
                        placeholder="Buscar por usuario, acción o detalle..." 
                        value={searchTerm} 
                        onChange={(e) => setSearchTerm(e.target.value)} 
                        className="input-field pl-10 w-80" 
                    />
                </div>
            </div>
          </CardHeader>
          <CardContent>
            <div className="overflow-x-auto">
                <Table>
                    <TableHeader>
                        <TableRow className="border-white/20">
                            <TableHead className="text-white/80">Fecha y Hora</TableHead>
                            <TableHead className="text-white/80">Usuario</TableHead>
                            <TableHead className="text-white/80">Acción</TableHead>
                            <TableHead className="text-white/80">Detalles</TableHead>
                        </TableRow>
                    </TableHeader>
                    <TableBody>
                    {filteredLogs.map(log => (
                        <TableRow key={log.id} className="border-white/10 hover:bg-white/5">
                            <TableCell className="text-white/80">
                                <div className="flex items-center gap-2">
                                    <Clock className="w-4 h-4"/>
                                    {format(parseISO(log.created_at), 'dd MMM yyyy, HH:mm:ss', { locale: es })}
                                </div>
                            </TableCell>
                            <TableCell className="text-white font-medium">
                                <div className="flex items-center gap-2">
                                    <User className="w-4 h-4"/>
                                    {log.user_full_name || 'Sistema'}
                                </div>
                            </TableCell>
                            <TableCell>
                                <span className="font-semibold text-yellow-300">{formatAction(log.action)}</span>
                            </TableCell>
                            <TableCell className="text-white/80 text-sm">{renderDetails(log)}</TableCell>
                        </TableRow>
                    ))}
                    </TableBody>
                </Table>
            </div>
          </CardContent>
        </Card>
      </motion.div>
    </div>
  );
};

export default AuditLogSection;
