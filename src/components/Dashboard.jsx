import React from 'react';
import { motion } from 'framer-motion';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Users, CreditCard, GraduationCap, AlertCircle, CheckCircle } from 'lucide-react';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';
import { resolveBranchDisplayLabel, resolveSchoolDisplayName } from '@/lib/utils';

const Dashboard = ({ students, payments, schoolSettings }) => {
  const totalStudents = students.filter(s => s.status === 'active').length;
  const totalRevenue = payments.reduce((sum, payment) => sum + parseFloat(payment.amount), 0);
  const pendingPayments = payments.filter(p => p.status === 'pending');
  const paidPaymentsCount = payments.filter(p => p.status === 'paid').length;

  const stats = [
    {
      title: 'Estudiantes Activos',
      value: totalStudents,
      icon: Users,
      color: 'from-blue-500 to-cyan-500',
      change: '+12%'
    },
    {
      title: 'Ingresos Totales',
      value: `$${totalRevenue.toLocaleString()}`,
      icon: CreditCard,
      color: 'from-green-500 to-emerald-500',
      change: '+8%'
    },
    {
      title: 'Pagos Pendientes',
      value: pendingPayments.length,
      icon: AlertCircle,
      color: 'from-yellow-500 to-orange-500',
      change: '-5%'
    },
    {
      title: 'Pagos Completados',
      value: paidPaymentsCount,
      icon: CheckCircle,
      color: 'from-purple-500 to-pink-500',
      change: '+15%'
    }
  ];

  return (
    <div className="space-y-6">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="mb-8 flex items-center justify-between"
      >
        <div>
          <h1 className="text-3xl font-bold gradient-text mb-2">{resolveSchoolDisplayName(schoolSettings)} - Dashboard</h1>
          <p className="text-white/70">Sistema de Gestión Educativa - {resolveBranchDisplayLabel()}</p>
        </div>
        {schoolSettings?.logo_url && (
          <motion.img
            src={schoolSettings.logo_url}
            alt="Logo de la escuela"
            className="h-20 w-20 object-contain"
            initial={{ opacity: 0, scale: 0.5 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.5 }}
          />
        )}
      </motion.div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {stats.map((stat, index) => {
          const Icon = stat.icon;
          return (
            <motion.div
              key={stat.title}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: index * 0.1 }}
            >
              <Card className="glass-effect border-white/20 card-hover">
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium text-white/80">
                    {stat.title}
                  </CardTitle>
                  <div className={`p-2 rounded-lg bg-gradient-to-r ${stat.color}`}>
                    <Icon className="h-4 w-4 text-white" />
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold text-white">{stat.value}</div>
                  <p className="text-xs text-green-400 mt-1">
                    {stat.change} desde el mes pasado
                  </p>
                </CardContent>
              </Card>
            </motion.div>
          );
        })}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <motion.div
          initial={{ opacity: 0, x: -20 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ delay: 0.4 }}
        >
          <Card className="glass-effect border-white/20">
            <CardHeader>
              <CardTitle className="text-white flex items-center gap-2">
                Actividad Reciente
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div className="flex items-center justify-between p-3 bg-white/5 rounded-lg">
                  <div>
                    <p className="text-white font-medium">Nuevo estudiante registrado</p>
                    <p className="text-white/60 text-sm">Hace 2 horas</p>
                  </div>
                  <div className="w-2 h-2 bg-green-400 rounded-full"></div>
                </div>
                <div className="flex items-center justify-between p-3 bg-white/5 rounded-lg">
                  <div>
                    <p className="text-white font-medium">Pago recibido - $500</p>
                    <p className="text-white/60 text-sm">Hace 4 horas</p>
                  </div>
                  <div className="w-2 h-2 bg-blue-400 rounded-full"></div>
                </div>
                <div className="flex items-center justify-between p-3 bg-white/5 rounded-lg">
                  <div>
                    <p className="text-white font-medium">Recordatorio de pago enviado</p>
                    <p className="text-white/60 text-sm">Hace 1 día</p>
                  </div>
                  <div className="w-2 h-2 bg-yellow-400 rounded-full"></div>
                </div>
              </div>
            </CardContent>
          </Card>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, x: 20 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ delay: 0.5 }}
        >
          <Card className="glass-effect border-white/20">
            <CardHeader>
              <CardTitle className="text-white flex items-center gap-2">
                <GraduationCap className="w-5 h-5" />
                Próximos Vencimientos
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {pendingPayments.slice(0, 3).map((payment) => (
                  <div key={payment.id} className="flex items-center justify-between p-3 bg-white/5 rounded-lg">
                    <div>
                      <p className="text-white font-medium">
                        {students.find(s => s.id === payment.student_id)?.name || 'Estudiante'}
                      </p>
                      <p className="text-white/60 text-sm">${payment.amount}</p>
                    </div>
                    <div className="text-right">
                      <p className="text-yellow-400 text-sm font-medium">Vence pronto</p>
                      <p className="text-white/60 text-xs">{format(new Date(payment.due_date), 'dd/MM/yyyy', { locale: es })}</p>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </motion.div>
      </div>
    </div>
  );
};

export default Dashboard;