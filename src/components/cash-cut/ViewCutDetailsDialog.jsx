import React from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { format, parseISO } from 'date-fns';

const ViewCutDetailsDialog = ({ isOpen, setIsOpen, cut, payments }) => {
  if (!cut) return null;
  
  const displayStartDate = cut.start_date ? format(parseISO(cut.start_date), 'dd/MM/yyyy') : 'N/A';
  const displayEndDate = cut.end_date ? format(parseISO(cut.end_date), 'dd/MM/yyyy') : 'N/A';


  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogContent className="glass-effect border-white/20 text-white max-w-2xl">
        <DialogHeader>
          <DialogTitle className="gradient-text">Detalle del Corte #{cut.cut_number}</DialogTitle>
          <DialogDescription className="text-white/60">
            Total: ${cut.total_amount.toLocaleString('es-MX', { minimumFractionDigits: 2 })} | Periodo: {displayStartDate} - {displayEndDate}
          </DialogDescription>
        </DialogHeader>
        <div className="max-h-[60vh] overflow-y-auto pr-2 mt-4">
            <Table>
                <TableHeader>
                    <TableRow className="border-white/20">
                        <TableHead className="text-white/80">Estudiante</TableHead>
                        <TableHead className="text-white/80">Concepto</TableHead>
                        <TableHead className="text-white/80 text-right">Monto</TableHead>
                    </TableRow>
                </TableHeader>
                <TableBody>
                {payments.map(p => (
                    <TableRow key={p.id} className="border-white/10">
                        <TableCell className="text-white font-medium">{p.students?.name}</TableCell>
                        <TableCell className="text-white/80">{p.concept}</TableCell>
                        <TableCell className="text-white/80 text-right">${p.amount.toLocaleString()}</TableCell>
                    </TableRow>
                ))}
                </TableBody>
            </Table>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default ViewCutDetailsDialog;