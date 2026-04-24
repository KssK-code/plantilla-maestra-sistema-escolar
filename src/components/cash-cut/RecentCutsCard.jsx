
import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Archive, Download, Eye, Trash2 } from 'lucide-react';
import { format, parseISO } from 'date-fns';

const RecentCutsCard = ({ cashCuts, handleDownloadPdf, handleViewDetails, handleDeleteCut, canDelete = true }) => {
  const cuts = cashCuts || [];

  return (
    <Card className="glass-effect border-white/20 lg:col-span-1">
      <CardHeader>
        <CardTitle className="text-white flex items-center gap-2"><Archive className="w-5 h-5" />Cortes Recientes</CardTitle>
      </CardHeader>
      <CardContent>
        <ScrollArea className="h-96">
          <div className="space-y-4 pr-4">
            {cuts.length > 0 ? (
              cuts.map(cut => (
                <div key={cut.id} className="flex items-center justify-between p-3 bg-white/5 rounded-lg hover:bg-white/10 transition-colors">
                  <div>
                    <p className="font-semibold text-white">Corte #{cut.cut_number}</p>
                    <p className="text-sm text-white/60">
                      {format(parseISO(cut.start_date), 'dd/MM/yy')} - {format(parseISO(cut.end_date), 'dd/MM/yy')}
                    </p>
                  </div>
                  <div className="flex items-center gap-4">
                    <p className="text-lg font-bold text-green-400">${cut.total_amount.toLocaleString()}</p>
                    <div className="flex gap-1">
                      <Button variant="ghost" size="icon" className="h-8 w-8 text-blue-400 hover:text-blue-300" onClick={() => handleViewDetails(cut)}><Eye className="w-4 h-4" /></Button>
                      <Button variant="ghost" size="icon" className="h-8 w-8 text-green-400 hover:text-green-300" onClick={() => handleDownloadPdf(cut)}><Download className="w-4 h-4" /></Button>
                      {canDelete && handleDeleteCut && (
                        <Button variant="ghost" size="icon" className="h-8 w-8 text-red-400 hover:text-red-300" onClick={() => handleDeleteCut(cut)}><Trash2 className="w-4 h-4" /></Button>
                      )}
                      {!canDelete && (
                        <Button variant="ghost" size="icon" className="h-8 w-8 text-gray-500" disabled title="Sin permisos para eliminar"><Trash2 className="w-4 h-4" /></Button>
                      )}
                    </div>
                  </div>
                </div>
              ))
            ) : (
              <div className="text-center text-white/60 py-10">No hay cortes de caja recientes.</div>
            )}
          </div>
        </ScrollArea>
      </CardContent>
    </Card>
  );
};

export default RecentCutsCard;