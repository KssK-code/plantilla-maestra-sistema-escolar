
import React, { useState, useEffect, useCallback } from 'react';
import { Helmet } from 'react-helmet-async';
import { motion } from 'framer-motion';
import { Toaster } from '@/components/ui/toaster';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/lib/customSupabaseClient';
import { useAuth } from '@/contexts/SupabaseAuthContext';
import Sidebar from '@/components/Sidebar';
import Dashboard from '@/components/Dashboard';
import StudentsSection from '@/components/StudentsSection';
import PaymentsSection from '@/components/PaymentsSection';
import SettingsSection from '@/components/SettingsSection';
import ReportsSection from '@/components/ReportsSection';
import CoursesSection from '@/components/CoursesSection';
import ScheduleSection from '@/components/ScheduleSection';
import AccountStatementSection from '@/components/AccountStatementSection';
import CashCutSection from '@/components/CashCutSection';
import UserManagementSection from '@/components/UserManagementSection';
import ConceptsManagementSection from '@/components/ConceptsManagementSection';
import Login from '@/components/Login';
import { Loader2 } from 'lucide-react';
import PlaceholderSection from '@/components/PlaceholderSection';
import AuditLogSection from '@/components/AuditLogSection';

const backgroundThemes = {
  default: { from: '#1e1b4b', via: '#4c1d95', to: '#0f172a' },
  sunset: { from: '#4a044e', via: '#c12b4b', to: '#f7b733' },
  ocean: { from: '#000428', via: '#004e92', to: '#1CB5E0' },
  forest: { from: '#134E5E', via: '#203A43', to: '#71B280' },
  lavender: { from: '#474350', via: '#9D50BB', to: '#D8B5FF' },
};


function App() {
  const { session, user, loading: authLoading } = useAuth();
  const [activeSection, setActiveSection] = useState('dashboard');
  const [students, setStudents] = useState([]);
  const [payments, setPayments] = useState([]);
  const [courses, setCourses] = useState([]);
  const [schedules, setSchedules] = useState([]);
  const [schoolSettings, setSchoolSettings] = useState(null);
  const [profile, setProfile] = useState(null);
  const [dataLoading, setDataLoading] = useState(true);
  const { toast } = useToast();

  const applyTheme = useCallback((settings) => {
    if (settings?.primary_color) {
      const color = settings.primary_color;
      document.documentElement.style.setProperty('--primary-hue', color.split(',')[0]);
      document.documentElement.style.setProperty('--primary-saturation', color.split(',')[1]);
      document.documentElement.style.setProperty('--primary-lightness', color.split(',')[2]);
    }

    if (settings?.background_theme) {
      const theme = backgroundThemes[settings.background_theme] || backgroundThemes.default;
      document.documentElement.style.setProperty('--bg-from', theme.from);
      document.documentElement.style.setProperty('--bg-via', theme.via);
      document.documentElement.style.setProperty('--bg-to', theme.to);
    }
  }, []);

  const handleSettingsUpdate = useCallback((newSettings) => {
    setSchoolSettings(newSettings);
    applyTheme(newSettings);
  }, [applyTheme]);
  
  const fetchSettings = useCallback(async () => {
    try {
      const { data, error } = await supabase.from('school_settings').select('*').limit(1).maybeSingle();
      if (error && error.code !== 'PGRST116') { // Ignore "no rows found" error
        throw error;
      }
      if (data) {
        handleSettingsUpdate(data);
      }
    } catch(error) {
       console.error("Error fetching settings:", error);
       toast({
        variant: "destructive",
        title: "Error de inicialización",
        description: "No se pudo cargar la configuración de la escuela. " + error.message,
      });
    }
  }, [handleSettingsUpdate, toast]);
  
  const fetchProfileAndData = useCallback(async () => {
    if (!user) return;
    setDataLoading(true);
    try {
      // Fetch profile first
      const { data: profileData, error: profileError } = await supabase
        .from('profiles')
        .select('full_name')
        .eq('id', user.id)
        .single();
      
      if (profileError) throw profileError;
      setProfile(profileData);

      // Fetch other data
      const [studentsRes, paymentsRes, coursesRes, schedulesRes] = await Promise.all([
        supabase.from('students').select('*, courses(name), schedules(*, courses(name))').order('created_at', { ascending: false }),
        supabase.from('payments').select('*, students(name)').order('created_at', { ascending: false }),
        supabase.from('courses').select('*').order('name', { ascending: true }),
        supabase.from('schedules').select('*, courses(name)').order('day_of_week').order('start_time')
      ]);

      if (studentsRes.error) throw studentsRes.error;
      if (paymentsRes.error) throw paymentsRes.error;
      if (coursesRes.error) throw coursesRes.error;
      if (schedulesRes.error) throw schedulesRes.error;

      setStudents(studentsRes.data);
      setPayments(paymentsRes.data);
      setCourses(coursesRes.data);
      setSchedules(schedulesRes.data);

    } catch (error) {
      toast({
        variant: "destructive",
        title: "Error al cargar los datos",
        description: "No se pudieron obtener los datos de Supabase. " + error.message,
      });
    } finally {
      setDataLoading(false);
    }
  }, [toast, user]);

  useEffect(() => {
    fetchSettings();
    if (session?.user) {
      fetchProfileAndData();
    } else {
      setDataLoading(false);
    }
  }, [session, fetchSettings, fetchProfileAndData]);

  const renderSection = () => {
    if (dataLoading && activeSection !== 'settings') {
      return (
        <div className="flex justify-center items-center h-full">
          <Loader2 className="h-12 w-12 animate-spin text-purple-400" />
        </div>
      );
    }
    
    const activeStudents = students.filter(s => s.status === 'active');

    switch (activeSection) {
      case 'dashboard':
        return <Dashboard students={students} payments={payments} schoolSettings={schoolSettings} />;
      case 'users':
        return <UserManagementSection />;
      case 'students':
        return <StudentsSection students={students} courses={courses} schedules={schedules} refreshData={fetchProfileAndData} />;
      case 'payments':
        return <PaymentsSection payments={payments} students={activeStudents} refreshData={fetchProfileAndData} schoolSettings={schoolSettings} />;
      case 'accountStatement':
        return <AccountStatementSection students={students} schoolSettings={schoolSettings} />;
      case 'cashCut':
        return <CashCutSection schoolSettings={schoolSettings} refreshData={fetchProfileAndData} />;
      case 'reports':
        return <ReportsSection schoolSettings={schoolSettings} />;
      case 'courses':
        return <CoursesSection refreshData={fetchProfileAndData} />;
      case 'schedule':
        return <ScheduleSection schedules={schedules} courses={courses} refreshData={fetchProfileAndData} schoolSettings={schoolSettings} />;
      case 'audit':
        return <AuditLogSection />;
      case 'concepts':
        return <ConceptsManagementSection />;
      case 'settings':
        return <SettingsSection onSettingsChange={handleSettingsUpdate} />;
      default:
        return <PlaceholderSection sectionName={activeSection} />;
    }
  };

  if (authLoading) {
    return (
      <div className="flex min-h-screen bg-gradient-to-br from-indigo-900 via-purple-900 to-slate-900 justify-center items-center">
        <Loader2 className="h-16 w-16 animate-spin text-white" />
      </div>
    );
  }

  if (!session) {
    return <Login />;
  }
  
  return (
    <>
      <Helmet>
        <title>{import.meta.env.VITE_SCHOOL_NAME} - Sistema de Gestión Escolar</title>
        <meta name="description" content="Sistema completo de gestión escolar para administrar estudiantes, pagos, cursos y más. Interfaz moderna y fácil de usar." />
      </Helmet>
      
      <div className="flex min-h-screen">
        <Sidebar activeSection={activeSection} setActiveSection={setActiveSection} schoolSettings={schoolSettings} profile={profile} />
        
        <main className="flex-1 overflow-auto">
          <motion.div
            key={activeSection}
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -20 }}
            transition={{ duration: 0.3 }}
            className="p-8"
          >
            {renderSection()}
          </motion.div>
        </main>
        
        <Toaster />
      </div>
    </>
  );
}

export default App;
