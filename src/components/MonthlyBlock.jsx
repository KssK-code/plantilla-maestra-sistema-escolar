import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { ChevronDown, ChevronUp, Search, DollarSign, Calendar, CheckCircle, AlertCircle, Clock, Edit, Trash2 } from 'lucide-react';
import { format, parseISO } from 'date-fns';
import { es } from 'date-fns/locale';
import { useToast } from '@/hooks/use-toast';

const MonthlyBlock = ({ 
  monthKey, 
  monthData, 
  students, 
  isCurrentMonth = false,
  onEditPayment,
  onDeletePayment,
  onStatusChange,
  canDeletePayments = false
}) => {
  const [isExpanded, setIsExpanded] = useState(isCurrentMonth);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const { toast } = useToast();

  // Calcular estadísticas del mes
  const stats = monthData.reduce((acc, payment) => {
    acc.total += payment.amount;
    acc.count++;
    
    switch (payment.status) {
      case 'pending':
        acc.pending.amount += payment.amount;
        acc.pending.count++;
        break;
      case 'paid':
        acc.paid.amount += payment.amount;
        acc.paid.count++;
        break;
      case 'overdue':
        acc.overdue.amount += payment.amount;
        acc.overdue.count++;
        break;
    }
    return acc;
  }, {
    total: 0,
    count: 0,
    pending: { amount: 0, count: 0 },
    paid: { amount: 0, count: 0 },
    overdue: { amount: 0, count: 0 }
  });

  // Filtrar pagos
  const filteredPayments = monthData.filter(payment => {
    const studentName = payment.students ? 
      payment.students.full_name || `${payment.students.first_name || ''} ${payment.students.last_name || ''}` : '';
    const matchesSearch = studentName.toLowerCase().includes(searchTerm.toLowerCase()) || 
                         payment.concept.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesStatus = statusFilter === 'all' || payment.status === statusFilter;
    return matchesSearch && matchesStatus;
  });

  // SISTEMA COMPLETAMENTE AUTOMÁTICO - Funciona para siempre
  let monthName;
  const currentDate = new Date();
  
  try {
    // Si monthKey es válido, usar el mes real
    if (monthKey && monthKey.match(/^\d{4}-\d{2}$/)) {
      // Usar parseISO para evitar problemas de zona horaria
      const monthDate = parseISO(monthKey + '-01');
      monthName = format(monthDate, 'MMMM yyyy', { locale: es })
        .replace(/^\w/, c => c.toUpperCase());
    } else {
      // Si no hay monthKey válido, usar mes actual
      monthName = format(currentDate, 'MMMM yyyy', { locale: es })
        .replace(/^\w/, c => c.toUpperCase());
    }
  } catch (error) {
    // Fallback: usar mes actual si hay cualquier error
    monthName = format(currentDate, 'MMMM yyyy', { locale: es })
      .replace(/^\w/, c => c.toUpperCase());
  }

  const getStatusBadge = (status) => {
    switch (status) {
      case 'pending':
        return <Badge variant="outline" className="bg-yellow-50 text-yellow-700 border-yellow-200"><Clock className="w-3 h-3 mr-1" />Pendiente</Badge>;
      case 'paid':
        return <Badge variant="outline" className="bg-green-50 text-green-700 border-green-200"><CheckCircle className="w-3 h-3 mr-1" />Pagado</Badge>;
      case 'overdue':
        return <Badge variant="outline" className="bg-red-50 text-red-700 border-red-200"><AlertCircle className="w-3 h-3 mr-1" />Vencido</Badge>;
      default:
        return <Badge variant="outline">{status}</Badge>;
    }
  };

  const handleStatusChange = async (paymentId, newStatus) => {
    await onStatusChange(paymentId, newStatus);
  };


  return (
    <Card className={`glass-effect border-white/20 ${isCurrentMonth ? 'ring-2 ring-blue-400/50' : ''}`}>
      <CardHeader 
        className="cursor-pointer hover:bg-white/5 transition-colors"
        onClick={() => setIsExpanded(!isExpanded)}
      >
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Calendar className="w-5 h-5 text-blue-400" />
            <CardTitle className="text-white text-lg">
              📅 {monthName}
              {isCurrentMonth && <span className="ml-2 text-sm text-blue-400">(Mes Actual)</span>}
            </CardTitle>
          </div>
          {isExpanded ? <ChevronUp className="w-5 h-5 text-white/60" /> : <ChevronDown className="w-5 h-5 text-white/60" />}
        </div>
        
        {/* Resumen del mes */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mt-4">
          <div className="text-center">
            <div className="text-yellow-400 font-bold text-lg">
              ${stats.pending.amount.toLocaleString()}
            </div>
            <div className="text-white/60 text-sm">💰 Pendientes ({stats.pending.count})</div>
          </div>
          <div className="text-center">
            <div className="text-green-400 font-bold text-lg">
              ${stats.paid.amount.toLocaleString()}
            </div>
            <div className="text-white/60 text-sm">✅ Recibidos ({stats.paid.count})</div>
          </div>
          <div className="text-center">
            <div className="text-red-400 font-bold text-lg">
              ${stats.overdue.amount.toLocaleString()}
            </div>
            <div className="text-white/60 text-sm">⚠️ Vencidos ({stats.overdue.count})</div>
          </div>
          <div className="text-center">
            <div className="text-blue-400 font-bold text-lg">
              ${stats.total.toLocaleString()}
            </div>
            <div className="text-white/60 text-sm">📊 Total Mes ({stats.count})</div>
          </div>
        </div>
      </CardHeader>

      <AnimatePresence>
        {isExpanded && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.3 }}
          >
            <CardContent className="pt-0">
              {/* Filtros */}
              <div className="flex flex-col md:flex-row gap-4 mb-6">
                <div className="flex-1">
                  <div className="relative">
                    <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-white/40 w-4 h-4" />
                    <Input
                      placeholder="Buscar estudiante o concepto..."
                      value={searchTerm}
                      onChange={(e) => setSearchTerm(e.target.value)}
                      className="pl-10 bg-white/10 border-white/20 text-white placeholder:text-white/40"
                    />
                  </div>
                </div>
                <Select value={statusFilter} onValueChange={setStatusFilter}>
                  <SelectTrigger className="w-full md:w-48 bg-white/10 border-white/20 text-white">
                    <SelectValue placeholder="Filtrar por estado" />
                  </SelectTrigger>
                  <SelectContent className="bg-slate-800 border-slate-600">
                    <SelectItem value="all" className="text-white hover:bg-slate-700 focus:bg-slate-700">Todos los estados</SelectItem>
                    <SelectItem value="pending" className="text-white hover:bg-slate-700 focus:bg-slate-700">Pendientes</SelectItem>
                    <SelectItem value="paid" className="text-white hover:bg-slate-700 focus:bg-slate-700">Pagados</SelectItem>
                    <SelectItem value="overdue" className="text-white hover:bg-slate-700 focus:bg-slate-700">Vencidos</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {/* Lista de pagos */}
              {filteredPayments.length > 0 ? (
                <div className="overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow className="border-white/20">
                        <TableHead className="text-white/80">Estudiante</TableHead>
                        <TableHead className="text-white/80">Concepto</TableHead>
                        <TableHead className="text-white/80">Monto</TableHead>
                        <TableHead className="text-white/80">Fecha Venc.</TableHead>
                        <TableHead className="text-white/80">Estado</TableHead>
                        <TableHead className="text-white/80">Acciones</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {filteredPayments.map((payment) => (
                        <TableRow key={payment.id} className="border-white/10 hover:bg-white/5">
                          <TableCell className="text-white">
                            {payment.students ? 
                              payment.students.full_name || 'Sin nombre' : 
                              'Sin estudiante'
                            }
                          </TableCell>
                          <TableCell className="text-white/80">{payment.concept}</TableCell>
                          <TableCell className="text-white font-semibold">
                            ${payment.amount.toLocaleString()}
                          </TableCell>
                          <TableCell className="text-white/80">
                            {payment.payment_date ? format(parseISO(payment.payment_date), 'dd/MM/yyyy') : '-'}
                          </TableCell>
                          <TableCell>{getStatusBadge(payment.status)}</TableCell>
                          <TableCell>
                            <div className="flex gap-2">
                              <Button
                                variant="ghost"
                                size="icon"
                                className="h-8 w-8 text-blue-400 hover:text-blue-300"
                                onClick={() => onEditPayment(payment)}
                              >
                                <Edit className="w-4 h-4" />
                              </Button>
                              {canDeletePayments && (
                                <Button
                                  variant="ghost"
                                  size="icon"
                                  className="h-8 w-8 text-red-400 hover:text-red-300"
                                  onClick={() => onDeletePayment(payment)}
                                >
                                  <Trash2 className="w-4 h-4" />
                                </Button>
                              )}
                              {payment.status === 'pending' && (
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  className="text-green-400 hover:text-green-300"
                                  onClick={() => handleStatusChange(payment.id, 'paid')}
                                >
                                  Marcar Pagado
                                </Button>
                              )}
                            </div>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              ) : (
                <div className="text-center py-8 text-white/60">
                  {monthData.length === 0 ? 
                    'No hay pagos registrados en este mes' : 
                    'No se encontraron pagos con los filtros aplicados'
                  }
                </div>
              )}
            </CardContent>
          </motion.div>
        )}
      </AnimatePresence>
    </Card>
  );
};

export default MonthlyBlock;
