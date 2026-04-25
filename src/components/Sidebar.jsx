
import React from 'react';
import { motion } from 'framer-motion';
import { 
  LayoutDashboard, 
  Users, 
  UserCog,
  CreditCard, 
  Settings, 
  LogOut,
  FileText,
  BookOpen,
  Calendar,
  FileBarChart2,
  Scissors,
  History,
  Tags
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { resolveSchoolDisplayName, resolveBranchDisplayLabel } from '@/lib/utils';

const navItems = [
  { icon: LayoutDashboard, label: 'Dashboard', section: 'dashboard' },
  { icon: UserCog, label: 'Usuarios', section: 'users' },
  { icon: Users, label: 'Alumnos', section: 'students' },
  { icon: CreditCard, label: 'Pagos', section: 'payments' },
  { icon: FileBarChart2, label: 'Edo. de Cuenta', section: 'accountStatement' },
  { icon: Scissors, label: 'Corte de Caja', section: 'cashCut' },
  { icon: FileText, label: 'Reportes', section: 'reports' },
  { icon: BookOpen, label: 'Cursos', section: 'courses' },
  { icon: Calendar, label: 'Horarios', section: 'schedule' },
  { icon: Tags, label: 'Conceptos', section: 'concepts' },
  { icon: Settings, label: 'Ajustes', section: 'settings' },
];

const Sidebar = ({ activeSection, setActiveSection, schoolSettings, profile }) => {
  const handleLogout = () => {
    const keys = Object.keys(localStorage);
    for (let key of keys) {
      if (key.startsWith('sb-') || key.startsWith('supabase.auth.token')) {
        localStorage.removeItem(key);
      }
    }
    window.location.reload();
  };

  const profileName = profile?.full_name || 'Usuario';

  return (
    <motion.div 
      initial={{ x: -250 }}
      animate={{ x: 0 }}
      transition={{ duration: 0.5, type: 'spring', stiffness: 120 }}
      className="flex flex-col w-64 bg-slate-900/80 backdrop-blur-lg text-white border-r border-slate-700/50"
    >
      <div className="p-6 flex items-center space-x-4 border-b border-slate-700/50">
        <img
          src={schoolSettings?.logo_url || '/logo.png'}
          alt={resolveSchoolDisplayName(schoolSettings)}
          className="h-12 w-12 rounded-full object-cover bg-white/10"
        />
        <div>
          <p className="font-semibold text-lg">{resolveSchoolDisplayName(schoolSettings)}</p>
          <p className="text-xs text-slate-400">{resolveBranchDisplayLabel()}</p>
        </div>
      </div>

      <nav className="flex-1 px-4 py-6 space-y-2">
        {navItems.map((item) => (
          <Button
            key={item.section}
            variant={activeSection === item.section ? 'secondary' : 'ghost'}
            className="w-full justify-start"
            onClick={() => setActiveSection(item.section)}
          >
            <item.icon className="mr-3 h-5 w-5" />
            {item.label}
          </Button>
        ))}
      </nav>

      <div className="p-4 border-t border-slate-700/50">
        <div className="flex items-center space-x-3 mb-4">
          <div className="h-10 w-10 rounded-full bg-gradient-to-tr from-purple-600 to-indigo-600 flex items-center justify-center font-bold">
            {profileName.charAt(0)}
          </div>
          <div>
            <p className="font-medium text-sm">{profileName}</p>
            <p className="text-xs text-slate-400">Administrador</p>
          </div>
        </div>
        <Button variant="ghost" className="w-full justify-start text-red-400 hover:text-red-300 hover:bg-red-500/10" onClick={handleLogout}>
          <LogOut className="mr-3 h-5 w-5" />
          Cerrar Sesión
        </Button>
      </div>
    </motion.div>
  );
};

export default Sidebar;
