import React, { useState, useEffect, useCallback } from 'react';
import { motion } from 'framer-motion';
import { Loader2 } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/lib/customSupabaseClient';
import { format, parseISO, startOfDay, endOfDay } from 'date-fns';
import { generateCashCutPdf } from '@/lib/pdfGenerator';
import { useRolePermissions } from '@/hooks/useRolePermissions';
import ViewCutDetailsDialog from '@/components/cash-cut/ViewCutDetailsDialog';
import NewCashCutCard from '@/components/cash-cut/NewCashCutCard';
import RecentCutsCard from '@/components/cash-cut/RecentCutsCard';

const CashCutSection = ({ schoolSettings }) => {
  const [startDate, setStartDate] = useState(format(new Date(), 'yyyy-MM-dd'));
  const [endDate, setEndDate] = useState(format(new Date(), 'yyyy-MM-dd'));
  const [payments, setPayments] = useState([]);
  const [cashCuts, setCashCuts] = useState([]);
  const [loading, setLoading] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const { toast } = useToast();
  const { canDeleteCashCuts } = useRolePermissions();

  const [viewingCut, setViewingCut] = useState(null);
  const [viewingCutPayments, setViewingCutPayments] = useState([]);
  const [isViewDialogOpen, setIsViewDialogOpen] = useState(false);

  const fetchPayments = useCallback(async () => {
    if (!startDate || !endDate) return;
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('payments')
        .select('*, students(name)')
        .eq('status', 'paid')
        .is('cash_cut_id', null)
        .gte('paid_date', startDate)
        .lte('paid_date', endDate)
        .order('paid_date', { ascending: false });

      if (error) throw error;
      setPayments(data);
    } catch (error) {
      toast({ variant: 'destructive', title: 'Error al cargar pagos', description: error.message });
    } finally {
      setLoading(false);
    }
  }, [startDate, endDate, toast]);

  const fetchCashCuts = useCallback(async () => {
    try {
      const { data, error } = await supabase
        .from('cash_cuts')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(10);
      if (error) throw error;
      setCashCuts(data);
    } catch (error) {
      toast({ variant: 'destructive', title: 'Error al cargar cortes', description: error.message });
    }
  }, [toast]);

  useEffect(() => {
    fetchPayments();
    fetchCashCuts();
  }, [fetchPayments, fetchCashCuts]);

  const handlePerformCut = async () => {
    if (payments.length === 0) {
      toast({ variant: 'destructive', title: 'No hay pagos para procesar', description: 'Selecciona un rango de fechas con pagos pagados y no incluidos en cortes anteriores.' });
      return;
    }
    setIsProcessing(true);
    try {
      const totalAmount = payments.reduce((sum, p) => sum + p.amount, 0);
      const breakdown = payments.reduce((acc, p) => {
        acc[p.concept] = (acc[p.concept] || 0) + p.amount;
        return acc;
      }, {});
      const paymentIds = payments.map(p => p.id);

      // Generate next cut number
      const { data: lastCut } = await supabase
        .from('cash_cuts')
        .select('cut_number')
        .order('cut_number', { ascending: false })
        .limit(1);
      
      const nextCutNumber = lastCut && lastCut.length > 0 ? lastCut[0].cut_number + 1 : 1;

      const { data: cutData, error: cutError } = await supabase
        .from('cash_cuts')
        .insert({
          cut_number: nextCutNumber,
          start_date: startDate,
          end_date: endDate,
          total_amount: totalAmount,
          payment_count: payments.length,
          details: { breakdown, paymentIds }
        })
        .select()
        .single();

      if (cutError) throw cutError;

      const { error: updateError } = await supabase
        .from('payments')
        .update({ cash_cut_id: cutData.id })
        .in('id', paymentIds);

      if (updateError) throw updateError;

      toast({ title: '¡Corte de caja exitoso!', description: `Se ha generado el corte #${cutData.cut_number} con un total de $${totalAmount.toLocaleString()}.` });
      
      const cutPaymentsFullData = await fetchPaymentsForCut(cutData);
      await generateCashCutPdf(cutData, cutPaymentsFullData, schoolSettings);
      
      fetchPayments();
      fetchCashCuts();
    } catch (error) {
      toast({ variant: 'destructive', title: 'Error al realizar el corte', description: error.message });
    } finally {
      setIsProcessing(false);
    }
  };

  const fetchPaymentsForCut = async (cut) => {
    const paymentIds = cut.details.paymentIds || [];
    if (paymentIds.length === 0) return [];

    const { data, error } = await supabase
        .from('payments')
        .select('*, students(name)')
        .in('id', paymentIds);
    if(error) throw error;
    return data;
  }

  const handleDownloadPdf = async (cut) => {
    try {
        const cutPayments = await fetchPaymentsForCut(cut);
        await generateCashCutPdf(cut, cutPayments, schoolSettings);
    } catch (error) {
        toast({ variant: 'destructive', title: 'Error al generar PDF', description: error.message });
    }
  }

  const handleViewDetails = async (cut) => {
    try {
        const cutPayments = await fetchPaymentsForCut(cut);
        setViewingCutPayments(cutPayments);
        setViewingCut(cut);
        setIsViewDialogOpen(true);
    } catch (error) {
        toast({ variant: 'destructive', title: 'Error al ver detalles', description: error.message });
    }
  };

  const handleDeleteCut = async (cut) => {
    if (!window.confirm(`¿Estás seguro de que quieres eliminar el corte #${cut.cut_number}? Esta acción es irreversible.`)) return;
    
    try {
        const paymentIds = cut.details.paymentIds || [];
        if (paymentIds.length > 0) {
            const { error: updateError } = await supabase
                .from('payments')
                .update({ cash_cut_id: null })
                .in('id', paymentIds);
            if (updateError) throw updateError;
        }

        const { error: deleteError } = await supabase
            .from('cash_cuts')
            .delete()
            .eq('id', cut.id);
        if (deleteError) throw deleteError;

        toast({ title: 'Corte eliminado', description: `El corte #${cut.cut_number} ha sido eliminado y los pagos han sido liberados.` });
        fetchCashCuts();
        fetchPayments();
    } catch(error) {
        toast({ variant: 'destructive', title: 'Error al eliminar corte', description: error.message });
    }
  }

  const totalAmount = payments.reduce((sum, p) => sum + p.amount, 0);

  return (
    <div className="space-y-6">
      <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold gradient-text mb-2">Corte de Caja</h1>
          <p className="text-white/70">Realiza cortes de caja por periodos y consulta el historial.</p>
        </div>
      </motion.div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <NewCashCutCard
          startDate={startDate}
          setStartDate={setStartDate}
          endDate={endDate}
          setEndDate={setEndDate}
          payments={payments}
          loading={loading}
          totalAmount={totalAmount}
          isProcessing={isProcessing}
          fetchPayments={fetchPayments}
          handlePerformCut={handlePerformCut}
        />
        <RecentCutsCard
          cashCuts={cashCuts}
          handleDownloadPdf={handleDownloadPdf}
          handleViewDetails={handleViewDetails}
          handleDeleteCut={canDeleteCashCuts ? handleDeleteCut : null}
          canDelete={canDeleteCashCuts}
        />
      </div>
      <ViewCutDetailsDialog isOpen={isViewDialogOpen} setIsOpen={setIsViewDialogOpen} cut={viewingCut} payments={viewingCutPayments}/>
    </div>
  );
};

export default CashCutSection;
