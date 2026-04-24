import { useState, useEffect } from 'react';
import { useAuth } from '@/contexts/SupabaseAuthContext';
import { supabase } from '@/lib/customSupabaseClient';

export const useRolePermissions = () => {
  const { user } = useAuth();
  const [userRole, setUserRole] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchUserRole = async () => {
      if (!user) {
        setUserRole(null);
        setLoading(false);
        return;
      }

      try {
        const { data, error } = await supabase
          .from('profiles')
          .select('role')
          .eq('id', user.id)
          .single();

        if (error) {
          console.error('Error fetching user role:', error);
          setUserRole('receptionist'); // Default fallback
        } else {
          setUserRole(data?.role || 'receptionist');
        }
      } catch (error) {
        console.error('Error in fetchUserRole:', error);
        setUserRole('receptionist'); // Default fallback
      } finally {
        setLoading(false);
      }
    };

    fetchUserRole();
  }, [user]);

  // Permission checks
  const isAdmin = userRole === 'admin';
  const isReceptionist = userRole === 'receptionist';

  // Specific permissions
  const canDeleteUsers = isAdmin;
  const canDeletePayments = isAdmin;
  const canDeleteCashCuts = isAdmin;
  const canManageSettings = isAdmin;
  const canInviteUsers = isAdmin;

  // General permissions (both roles)
  const canViewStudents = true;
  const canCreateStudents = true;
  const canEditStudents = true;
  const canViewPayments = true;
  const canCreatePayments = true;
  const canViewCourses = true;
  const canCreateCourses = true;
  const canViewSchedules = true;
  const canCreateSchedules = true;
  const canViewReports = true;
  const canCreateCashCuts = true;
  const canViewCashCuts = true;

  return {
    userRole,
    loading,
    isAdmin,
    isReceptionist,
    
    // Deletion permissions (admin only)
    canDeleteUsers,
    canDeletePayments,
    canDeleteCashCuts,
    canManageSettings,
    canInviteUsers,
    
    // General permissions (both roles)
    canViewStudents,
    canCreateStudents,
    canEditStudents,
    canViewPayments,
    canCreatePayments,
    canViewCourses,
    canCreateCourses,
    canViewSchedules,
    canCreateSchedules,
    canViewReports,
    canCreateCashCuts,
    canViewCashCuts,
  };
};
