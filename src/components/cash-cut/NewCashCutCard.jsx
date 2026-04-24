import React from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Loader2, Archive, Calendar, AlertTriangle } from 'lucide-react';

const NewCashCutCard = ({ startDate, setStartDate, endDate, setEndDate, payments, loading, totalAmount, isProcessing, fetchPayments, handlePerformCut }) => {
  return (
    <Card className="lg:col-span-2 glass-effect border-white/20">
      <CardHeader>
        <CardTitle className="text-white">Realizar Nuevo Corte</CardTitle>
        <CardDescription className="text-white/60">Selecciona un rango de fechas para ver los pagos y realizar el corte.</CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="flex gap-4 items-end">
          <div className="flex-1">
            <Label htmlFor="start-date" className="text-white/80">Fecha de Inicio</Label>
            <Input id="start-date" type="date" value={startDate} onChange={e => setStartDate(e.target.value)} className="input-field" />
          </div>
          <div className="flex-1">
            <Label htmlFor="end-date" className="text-white/80">Fecha de Fin</Label>
            <Input id="end-date" type="date" value={endDate} onChange={e => setEndDate(e.target.value)} className="input-field" />
          </div>
          <Button onClick={fetchPayments} className="btn-secondary" disabled={loading}>
            {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Calendar className="w-4 h-4" />}
          </Button>
        </div>
        
        <div className="p-4 bg-purple-500/10 border border-purple-500/30 rounded-lg text-center">
          <p className="text-sm text-purple-300">Total a Cortar</p>
          <p className="text-3xl font-bold text-white">${totalAmount.toLocaleString('es-MX', { minimumFractionDigits: 2 })}</p>
          <p className="text-xs text-white/60">{payments.length} pagos encontrados</p>
        </div>

        {payments.length > 0 ? (
          <div className="max-h-60 overflow-y-auto pr-2">
            <Table>
              <TableHeader><TableRow className="border-white/20"><TableHead className="text-white/80">Estudiante</TableHead><TableHead className="text-white/80">Concepto</TableHead><TableHead className="text-white/80 text-right">Monto</TableHead></TableRow></TableHeader>
              <TableBody>
                {payments.map(p => (
                  <TableRow key={p.id} className="border-white/10"><TableCell className="text-white font-medium">{p.students?.name}</TableCell><TableCell className="text-white/80">{p.concept}</TableCell><TableCell className="text-white/80 text-right">${p.amount.toLocaleString()}</TableCell></TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        ) : (
          <div className="text-center py-8 text-white/60 flex flex-col items-center gap-2">
            <AlertTriangle className="w-8 h-8 text-yellow-400"/>
            <p>No hay pagos disponibles para este rango de fechas.</p>
            <p className="text-xs">Asegúrate que los pagos estén marcados como "Pagado" y no pertenezcan a un corte anterior.</p>
          </div>
        )}

        <Button onClick={handlePerformCut} className="w-full btn-primary" disabled={isProcessing || payments.length === 0}>
          {isProcessing ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Archive className="mr-2 h-4 w-4" />}
          {isProcessing ? 'Procesando...' : 'Realizar Corte y Descargar PDF'}
        </Button>
      </CardContent>
    </Card>
  );
};

export default NewCashCutCard;