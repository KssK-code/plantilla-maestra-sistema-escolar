import React, { useMemo } from 'react';
import { motion } from 'framer-motion';
import MonthlyBlock from './MonthlyBlock';
import { format, parseISO, isAfter, isBefore } from 'date-fns';

const MonthlyBlocksContainer = ({ 
  payments, 
  students, 
  onEditPayment,
  onDeletePayment,
  onStatusChange,
  canDeletePayments = false,
  schoolSettings = null
}) => {
  // Agrupar pagos por mes y ordenar - Solución automática
  const paymentsByMonth = useMemo(() => {
    const currentDate = new Date();
    const currentYear = currentDate.getFullYear();
    const currentMonthKey = format(currentDate, 'yyyy-MM'); // Mes actual dinámico
    
    const grouped = payments.reduce((acc, payment) => {
      // Obtener fecha del pago
      let paymentDate = payment.paid_date || payment.payment_date;
      
      // Si no hay fecha, usar fecha actual
      if (!paymentDate) {
        paymentDate = format(currentDate, 'yyyy-MM-dd');
      }
      
      let monthKey;
      try {
        const parsedDate = parseISO(paymentDate);
        const paymentYear = parsedDate.getFullYear();
        
        // Usar la fecha real del pago para agrupación
        monthKey = format(parsedDate, 'yyyy-MM');
      } catch (error) {
        // Si hay error parseando la fecha, usar mes actual
        monthKey = currentMonthKey;
      }
      
      if (!acc[monthKey]) {
        acc[monthKey] = [];
      }
      acc[monthKey].push(payment);
      return acc;
    }, {});

    // Ordenar meses (más reciente primero)
    const sortedMonths = Object.keys(grouped).sort((a, b) => {
      return new Date(b + '-01') - new Date(a + '-01');
    });

    return sortedMonths.map(monthKey => ({
      monthKey,
      payments: grouped[monthKey]
    }));
  }, [payments]);

  // Determinar el mes actual
  const currentMonth = format(new Date(), 'yyyy-MM');

  // Actualizar estados automáticamente (pagos vencidos)
  const updateOverduePayments = () => {
    const today = new Date();
    payments.forEach(payment => {
      if (payment.status === 'pending' && payment.payment_date) {
        const paymentDate = parseISO(payment.payment_date);
        if (isBefore(paymentDate, today)) {
          // Este pago debería marcarse como vencido
          // La lógica de actualización se manejará en el componente padre
          console.log(`Pago ${payment.id} está vencido`);
        }
      }
    });
  };

  // Ejecutar verificación de pagos vencidos al cargar
  React.useEffect(() => {
    updateOverduePayments();
  }, [payments]);

  if (paymentsByMonth.length === 0) {
    return (
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="text-center py-12"
      >
        <div className="text-white/60 text-lg">
          📅 No hay pagos registrados
        </div>
        <div className="text-white/40 text-sm mt-2">
          Los pagos se organizarán automáticamente por mes cuando se agreguen
        </div>
      </motion.div>
    );
  }

  return (
    <div className="space-y-6">
      {paymentsByMonth.map(({ monthKey, payments: monthPayments }, index) => (
        <motion.div
          key={monthKey}
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: index * 0.1 }}
        >
          <MonthlyBlock
            monthKey={monthKey}
            monthData={monthPayments}
            students={students}
            isCurrentMonth={monthKey === currentMonth}
            onEditPayment={onEditPayment}
            onDeletePayment={onDeletePayment}
            onStatusChange={onStatusChange}
            canDeletePayments={canDeletePayments}
            schoolSettings={schoolSettings}
          />
        </motion.div>
      ))}
    </div>
  );
};

export default MonthlyBlocksContainer;
