import React, { useMemo } from 'react';
import { motion } from 'framer-motion';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { TrendingUp, TrendingDown, DollarSign, Calendar, AlertTriangle, CheckCircle, Clock, Target } from 'lucide-react';
import { format, parseISO, startOfMonth, endOfMonth, isWithinInterval, addMonths, subMonths, isSameMonth, isBefore } from 'date-fns';
import { es } from 'date-fns/locale';

const PaymentsDashboard = ({ payments }) => {
  // Calcular estadísticas mensuales
  const monthlyStats = useMemo(() => {
    const now = new Date();
    const currentMonth = startOfMonth(now);
    const currentMonthEnd = endOfMonth(now);
    const previousMonth = startOfMonth(subMonths(now, 1));
    const previousMonthEnd = endOfMonth(subMonths(now, 1));

    const currentMonthPayments = payments.filter(payment => {
      if (!payment.payment_date) return false;
      const paymentDate = parseISO(payment.payment_date);
      return isSameMonth(paymentDate, currentMonth);
    });

    const previousMonthPayments = payments.filter(payment => {
      if (!payment.payment_date) return false;
      const paymentDate = parseISO(payment.payment_date);
      return isSameMonth(paymentDate, previousMonth);
    });

    const calculateStats = (monthPayments) => {
      return monthPayments.reduce((acc, payment) => {
        acc.total.amount += payment.amount;
        acc.total.count++;

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
        total: { amount: 0, count: 0 },
        pending: { amount: 0, count: 0 },
        paid: { amount: 0, count: 0 },
        overdue: { amount: 0, count: 0 }
      });
    };

    const current = calculateStats(currentMonthPayments);
    const previous = calculateStats(previousMonthPayments);

    // Calcular porcentajes de cambio
    const calculateChange = (current, previous) => {
      if (previous === 0) return current > 0 ? 100 : 0;
      return ((current - previous) / previous) * 100;
    };

    const changes = {
      totalAmount: calculateChange(current.total.amount, previous.total.amount),
      paidAmount: calculateChange(current.paid.amount, previous.paid.amount),
      pendingAmount: calculateChange(current.pending.amount, previous.pending.amount),
      overdueAmount: calculateChange(current.overdue.amount, previous.overdue.amount)
    };

    return {
      current,
      previous,
      changes,
      currentMonthName: format(currentMonth, 'MMMM yyyy', { locale: es }),
      previousMonthName: format(previousMonth, 'MMMM yyyy', { locale: es })
    };
  }, [payments]);

  // Calcular alertas y proyecciones
  const alerts = useMemo(() => {
    const now = new Date();
    const today = new Date();
    
    const upcomingDue = payments.filter(payment => {
      if (payment.status !== 'pending' || !payment.payment_date) return false;
      const paymentDate = parseISO(payment.payment_date);
      const daysUntilDue = Math.ceil((paymentDate - now) / (1000 * 60 * 60 * 24));
      return daysUntilDue >= 0 && daysUntilDue <= 7;
    });

    const overdue = payments.filter(payment => {
      return payment.status === 'overdue';
    });

    return {
      upcomingDue: upcomingDue.length,
      overdue: overdue.length,
      upcomingAmount: upcomingDue.reduce((sum, p) => sum + p.amount, 0),
      overdueAmount: overdue.reduce((sum, p) => sum + p.amount, 0)
    };
  }, [payments]);

  const StatCard = ({ title, value, change, icon: Icon, color, subtitle }) => (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      whileHover={{ scale: 1.02 }}
      transition={{ duration: 0.2 }}
    >
      <Card className="glass-effect border-white/20 hover:border-white/30 transition-all">
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium text-white/80">{title}</CardTitle>
          <Icon className={`h-4 w-4 ${color}`} />
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold text-white">{value}</div>
          {subtitle && <p className="text-xs text-white/60 mt-1">{subtitle}</p>}
          {change !== undefined && (
            <div className="flex items-center space-x-1 mt-2">
              {change >= 0 ? (
                <TrendingUp className="h-3 w-3 text-green-400" />
              ) : (
                <TrendingDown className="h-3 w-3 text-red-400" />
              )}
              <span className={`text-xs ${change >= 0 ? 'text-green-400' : 'text-red-400'}`}>
                {change >= 0 ? '+' : ''}{change.toFixed(1)}%
              </span>
              <span className="text-xs text-white/60">vs mes anterior</span>
            </div>
          )}
        </CardContent>
      </Card>
    </motion.div>
  );

  return (
    <div className="space-y-6">
      {/* Estadísticas principales */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <StatCard
          title="Ingresos del Mes"
          value={`$${monthlyStats.current.paid.amount.toLocaleString()}`}
          change={monthlyStats.changes.paidAmount}
          icon={DollarSign}
          color="text-green-400"
          subtitle={`${monthlyStats.current.paid.count} pagos recibidos`}
        />
        <StatCard
          title="Pendientes"
          value={`$${monthlyStats.current.pending.amount.toLocaleString()}`}
          change={monthlyStats.changes.pendingAmount}
          icon={Clock}
          color="text-yellow-400"
          subtitle={`${monthlyStats.current.pending.count} pagos pendientes`}
        />
        <StatCard
          title="Vencidos"
          value={`$${monthlyStats.current.overdue.amount.toLocaleString()}`}
          change={monthlyStats.changes.overdueAmount}
          icon={AlertTriangle}
          color="text-red-400"
          subtitle={`${monthlyStats.current.overdue.count} pagos vencidos`}
        />
        <StatCard
          title="Total del Mes"
          value={`$${monthlyStats.current.total.amount.toLocaleString()}`}
          change={monthlyStats.changes.totalAmount}
          icon={Target}
          color="text-blue-400"
          subtitle={`${monthlyStats.current.total.count} pagos totales`}
        />
      </div>

      {/* Alertas y notificaciones */}
      {(alerts.upcomingDue > 0 || alerts.overdue > 0) && (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="grid grid-cols-1 md:grid-cols-2 gap-6"
        >
          {alerts.upcomingDue > 0 && (
            <Card className="glass-effect border-yellow-400/30 bg-yellow-400/5">
              <CardHeader>
                <CardTitle className="text-yellow-400 flex items-center gap-2">
                  <Clock className="w-5 h-5" />
                  Próximos Vencimientos
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-white">
                  <div className="text-2xl font-bold">{alerts.upcomingDue}</div>
                  <div className="text-sm text-white/70">
                    pagos vencen en los próximos 7 días
                  </div>
                  <div className="text-lg font-semibold text-yellow-400 mt-2">
                    ${alerts.upcomingAmount.toLocaleString()}
                  </div>
                </div>
              </CardContent>
            </Card>
          )}

          {alerts.overdue > 0 && (
            <Card className="glass-effect border-red-400/30 bg-red-400/5">
              <CardHeader>
                <CardTitle className="text-red-400 flex items-center gap-2">
                  <AlertTriangle className="w-5 h-5" />
                  Pagos Vencidos
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-white">
                  <div className="text-2xl font-bold">{alerts.overdue}</div>
                  <div className="text-sm text-white/70">
                    pagos requieren atención inmediata
                  </div>
                  <div className="text-lg font-semibold text-red-400 mt-2">
                    ${alerts.overdueAmount.toLocaleString()}
                  </div>
                </div>
              </CardContent>
            </Card>
          )}
        </motion.div>
      )}

      {/* Resumen mensual */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
      >
        <Card className="glass-effect border-white/20">
          <CardHeader>
            <CardTitle className="text-white flex items-center gap-2">
              <Calendar className="w-5 h-5 text-blue-400" />
              Resumen Mensual - {monthlyStats.currentMonthName}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <div className="text-center">
                <div className="text-green-400 font-bold text-xl">
                  ${monthlyStats.current.paid.amount.toLocaleString()}
                </div>
                <div className="text-white/60 text-sm">Recaudado</div>
                <Badge variant="outline" className="bg-green-50 text-green-700 border-green-200 mt-1">
                  {monthlyStats.current.paid.count} pagos
                </Badge>
              </div>
              <div className="text-center">
                <div className="text-yellow-400 font-bold text-xl">
                  ${monthlyStats.current.pending.amount.toLocaleString()}
                </div>
                <div className="text-white/60 text-sm">Por Cobrar</div>
                <Badge variant="outline" className="bg-yellow-50 text-yellow-700 border-yellow-200 mt-1">
                  {monthlyStats.current.pending.count} pendientes
                </Badge>
              </div>
              <div className="text-center">
                <div className="text-red-400 font-bold text-xl">
                  ${monthlyStats.current.overdue.amount.toLocaleString()}
                </div>
                <div className="text-white/60 text-sm">Vencido</div>
                <Badge variant="outline" className="bg-red-50 text-red-700 border-red-200 mt-1">
                  {monthlyStats.current.overdue.count} vencidos
                </Badge>
              </div>
              <div className="text-center">
                <div className="text-blue-400 font-bold text-xl">
                  ${monthlyStats.current.total.amount.toLocaleString()}
                </div>
                <div className="text-white/60 text-sm">Total</div>
                <Badge variant="outline" className="bg-blue-50 text-blue-700 border-blue-200 mt-1">
                  {monthlyStats.current.total.count} registros
                </Badge>
              </div>
            </div>
          </CardContent>
        </Card>
      </motion.div>
    </div>
  );
};

export default PaymentsDashboard;
