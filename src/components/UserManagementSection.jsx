import React, { useState, useEffect, useCallback } from 'react';
import { motion } from 'framer-motion';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter, DialogClose } from '@/components/ui/dialog';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '@/components/ui/alert-dialog';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { UserPlus, Mail, Loader2, Trash2, Shield, ShieldCheck } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/lib/customSupabaseClient';
import { useAuth } from '@/contexts/SupabaseAuthContext';
import { useRolePermissions } from '@/hooks/useRolePermissions';

function buildFunctionAuthHeaders(session) {
  const token = session?.access_token;
  if (!token) {
    throw new Error('Sesión expirada o no autenticada. Inicia sesión de nuevo.');
  }
  return { Authorization: `Bearer ${token}` };
}

const CreateUserDialog = ({ open, setOpen, refreshUsers, session }) => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [fullName, setFullName] = useState('');
  const [role, setRole] = useState('receptionist');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const { toast } = useToast();

  const handleSubmit = async (e) => {
    e.preventDefault();
    setIsSubmitting(true);
    try {
      const {
        data: { session: activeSession },
        error: sessionError,
      } = await supabase.auth.getSession();
      if (sessionError) throw sessionError;

      const authHeaders = buildFunctionAuthHeaders(activeSession || session);
      const response = await fetch(
        `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/user-management`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            apikey: import.meta.env.VITE_SUPABASE_ANON_KEY,
            ...authHeaders,
          },
          body: JSON.stringify({
            action: 'createUser',
            payload: { email, password, fullName, role },
          }),
        }
      );

      const result = await response.json().catch(() => ({}));
      if (!response.ok) {
        throw new Error(result?.error || 'Error al crear usuario');
      }

      toast({
        title: 'Usuario creado exitosamente',
        description: `${fullName} puede iniciar sesión con ${email}.`,
      });
      refreshUsers();
      setOpen(false);
      setEmail('');
      setPassword('');
      setFullName('');
      setRole('receptionist');
    } catch (error) {
      toast({
        variant: 'destructive',
        title: 'Error al crear usuario',
        description: error.message,
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogContent className="glass-effect border-white/20 text-white">
        <DialogHeader>
          <DialogTitle className="gradient-text">Crear Nuevo Usuario</DialogTitle>
          <DialogDescription className="text-white/60">
            El usuario podrá iniciar sesión inmediatamente con el email y contraseña proporcionados.
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
           <div>
            <Label htmlFor="fullName" className="text-white/80">Nombre Completo</Label>
            <Input id="fullName" type="text" value={fullName} onChange={(e) => setFullName(e.target.value)} className="bg-slate-700/80 border-slate-500 text-white placeholder-slate-400 focus:border-blue-400" required />
          </div>
          <div>
            <Label htmlFor="email" className="text-white/80">Email</Label>
            <Input id="email" type="email" value={email} onChange={(e) => setEmail(e.target.value)} className="bg-slate-700/80 border-slate-500 text-white placeholder-slate-400 focus:border-blue-400" required />
          </div>
          <div>
            <Label htmlFor="password" className="text-white/80">Contraseña</Label>
            <Input id="password" type="password" value={password} onChange={(e) => setPassword(e.target.value)} className="bg-slate-700/80 border-slate-500 text-white placeholder-slate-400 focus:border-blue-400" required minLength={6} />
          </div>
          <div>
            <Label htmlFor="role" className="text-white/80">Rol del Usuario</Label>
            <Select value={role} onValueChange={setRole}>
              <SelectTrigger className="bg-slate-700/80 border-slate-500 text-white">
                <SelectValue placeholder="Seleccionar rol" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="receptionist">
                  <div className="flex items-center gap-2">
                    <Shield className="w-4 h-4" />
                    Recepcionista
                  </div>
                </SelectItem>
                <SelectItem value="admin">
                  <div className="flex items-center gap-2">
                    <ShieldCheck className="w-4 h-4" />
                    Administrador
                  </div>
                </SelectItem>
              </SelectContent>
            </Select>
          </div>
          <DialogFooter>
            <DialogClose asChild><Button type="button" variant="secondary" className="btn-secondary">Cancelar</Button></DialogClose>
            <Button type="submit" className="btn-primary" disabled={isSubmitting}>
              {isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Crear Usuario
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
};

const InviteUserDialog = ({ open, setOpen, refreshUsers, session }) => {
  const [email, setEmail] = useState('');
  const [fullName, setFullName] = useState('');
  const [role, setRole] = useState('receptionist');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const { toast } = useToast();

  const handleSubmit = async (e) => {
    e.preventDefault();
    setIsSubmitting(true);
    try {
      const { error } = await supabase.functions.invoke('user-management', {
        headers: buildFunctionAuthHeaders(session),
        body: { action: 'inviteUser', payload: { email, fullName, role } },
      });

      if (error) throw error;
      
      toast({
        title: 'Invitación enviada',
        description: `Se ha enviado una invitación a ${email}.`,
      });
      refreshUsers();
      setOpen(false);
      setEmail('');
      setFullName('');
      setRole('receptionist');
    } catch (error) {
      toast({
        variant: 'destructive',
        title: 'Error al invitar usuario',
        description: error.message,
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogContent className="glass-effect border-white/20 text-white">
        <DialogHeader>
          <DialogTitle className="gradient-text">Invitar Nuevo Usuario</DialogTitle>
          <DialogDescription className="text-white/60">
            El nuevo usuario recibirá un email para configurar su contraseña y acceder al sistema.
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
           <div>
            <Label htmlFor="fullName" className="text-white/80">Nombre Completo</Label>
            <Input id="fullName" type="text" value={fullName} onChange={(e) => setFullName(e.target.value)} className="input-field" required />
          </div>
          <div>
            <Label htmlFor="email" className="text-white/80">Email del Usuario</Label>
            <Input id="email" type="email" value={email} onChange={(e) => setEmail(e.target.value)} className="input-field" required />
          </div>
          <div>
            <Label htmlFor="role" className="text-white/80">Rol del Usuario</Label>
            <Select value={role} onValueChange={setRole}>
              <SelectTrigger className="input-field">
                <SelectValue placeholder="Seleccionar rol" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="receptionist">
                  <div className="flex items-center gap-2">
                    <Shield className="w-4 h-4" />
                    Recepcionista
                  </div>
                </SelectItem>
                <SelectItem value="admin">
                  <div className="flex items-center gap-2">
                    <ShieldCheck className="w-4 h-4" />
                    Administrador
                  </div>
                </SelectItem>
              </SelectContent>
            </Select>
          </div>
          <DialogFooter>
            <DialogClose asChild><Button type="button" variant="secondary" className="btn-secondary">Cancelar</Button></DialogClose>
            <Button type="submit" className="btn-primary" disabled={isSubmitting}>
              {isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Enviar Invitación
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
};

const DeleteUserDialog = ({ open, setOpen, user, refreshUsers, session }) => {
    const [isSubmitting, setIsSubmitting] = useState(false);
    const { toast } = useToast();
  
    const handleDelete = async () => {
      setIsSubmitting(true);
      try {
        const { error } = await supabase.functions.invoke('user-management', {
          headers: buildFunctionAuthHeaders(session),
          body: { action: 'deleteUser', payload: { userId: user.id } },
        });
  
        if (error) throw error;
  
        toast({
          title: 'Usuario eliminado',
          description: `El usuario ${user.email} ha sido eliminado del sistema.`,
        });
        refreshUsers();
        setOpen(false);
      } catch (error) {
        toast({
          variant: 'destructive',
          title: 'Error al eliminar el usuario',
          description: error.message,
        });
      } finally {
        setIsSubmitting(false);
      }
    };
  
    return (
        <AlertDialog open={open} onOpenChange={setOpen}>
            <AlertDialogContent className="glass-effect border-white/20 text-white">
                <AlertDialogHeader>
                <AlertDialogTitle className="gradient-text">¿Estás seguro?</AlertDialogTitle>
                <AlertDialogDescription className="text-white/60">
                    Esta acción es irreversible. El usuario <span className="font-bold text-white">{user?.email}</span> será eliminado permanentemente.
                </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                <AlertDialogCancel asChild><Button variant="secondary" className="btn-secondary">Cancelar</Button></AlertDialogCancel>
                <AlertDialogAction asChild><Button onClick={handleDelete} className="btn-danger" disabled={isSubmitting}>
                    {isSubmitting ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Trash2 className="mr-2 h-4 w-4" />}
                    Sí, eliminar usuario
                </Button></AlertDialogAction>
                </AlertDialogFooter>
            </AlertDialogContent>
        </AlertDialog>
    );
};

const UserManagementSection = () => {
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
  const [isInviteDialogOpen, setIsInviteDialogOpen] = useState(false);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [selectedUser, setSelectedUser] = useState(null);
  const { toast } = useToast();
  const { user: currentUser, session } = useAuth();
  const { canDeleteUsers, canInviteUsers, isAdmin } = useRolePermissions();

  const fetchUsers = useCallback(async () => {
    setLoading(true);
    try {
      // Consultar directamente la tabla profiles
      const { data: profiles, error: profileError } = await supabase
        .from('profiles')
        .select('id, full_name, email, role')
        .order('created_at', { ascending: false });

      if (profileError) throw profileError;

      setUsers(profiles || []);
    } catch (error) {
      toast({
        variant: 'destructive',
        title: 'Error al cargar usuarios',
        description: error.message,
      });
    } finally {
      setLoading(false);
    }
  }, [toast]);

  useEffect(() => {
    fetchUsers();
  }, [fetchUsers]);

  const handleDeleteClick = (user) => {
    setSelectedUser(user);
    setIsDeleteDialogOpen(true);
  };

  return (
    <div className="space-y-6">
      <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold gradient-text mb-2">Gestión de Usuarios</h1>
          <p className="text-white/70">Invita y administra a los usuarios del sistema.</p>
        </div>
        {canInviteUsers && (
          <Button onClick={() => setIsCreateDialogOpen(true)} className="btn-primary"><UserPlus className="w-4 h-4 mr-2" />Crear Usuario</Button>
        )}
      </motion.div>

      <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }}>
        <Card className="glass-effect border-white/20">
          <CardHeader>
            <CardTitle className="text-white">Lista de Usuarios</CardTitle>
          </CardHeader>
          <CardContent>
            {loading ? (
              <div className="flex justify-center items-center h-40"><Loader2 className="h-8 w-8 animate-spin text-purple-400" /></div>
            ) : (
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader><TableRow className="border-white/20"><TableHead className="text-white/80">Nombre</TableHead><TableHead className="text-white/80">Email</TableHead><TableHead className="text-white/80">Rol</TableHead><TableHead className="text-white/80 text-right">Acciones</TableHead></TableRow></TableHeader>
                  <TableBody>
                    {users.map((user, index) => (
                      <motion.tr key={user.id} initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: index * 0.05 }} className="border-white/10 hover:bg-white/5">
                        <TableCell className="text-white font-medium">{user.full_name || user.user_metadata?.full_name || 'No asignado'}</TableCell>
                        <TableCell className="text-white/80"><div className="flex items-center gap-2"><Mail className="w-4 h-4" />{user.email}</div></TableCell>
                        <TableCell className="text-white/80">
                          <div className="flex items-center gap-2">
                            {user.role === 'admin' ? (
                              <><ShieldCheck className="w-4 h-4 text-yellow-400" />Administrador</>
                            ) : (
                              <><Shield className="w-4 h-4 text-blue-400" />Recepcionista</>
                            )}
                          </div>
                        </TableCell>
                        <TableCell className="text-right">
                          {canDeleteUsers && user.id !== currentUser?.id && (
                            <Button variant="ghost" size="sm" onClick={() => handleDeleteClick(user)} className="text-red-400 hover:text-red-300 hover:bg-red-500/20">
                              <Trash2 className="w-4 h-4" />
                            </Button>
                          )}
                          {user.id === currentUser?.id && (
                            <span className="text-xs text-white/40">Usuario actual</span>
                          )}
                          {!canDeleteUsers && user.id !== currentUser?.id && (
                            <span className="text-xs text-white/40">Sin permisos</span>
                          )}
                        </TableCell>
                      </motion.tr>
                    ))}
                  </TableBody>
                </Table>
              </div>
            )}
          </CardContent>
        </Card>
      </motion.div>
      <CreateUserDialog open={isCreateDialogOpen} setOpen={setIsCreateDialogOpen} refreshUsers={fetchUsers} session={session} />
      <InviteUserDialog open={isInviteDialogOpen} setOpen={setIsInviteDialogOpen} refreshUsers={fetchUsers} session={session} />
      {selectedUser && <DeleteUserDialog open={isDeleteDialogOpen} setOpen={setIsDeleteDialogOpen} user={selectedUser} refreshUsers={fetchUsers} session={session} />}
    </div>
  );
};

export default UserManagementSection;