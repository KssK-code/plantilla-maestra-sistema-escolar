import React, { useState, useEffect, useCallback, useRef } from 'react';
import { motion } from 'framer-motion';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { supabase } from '@/lib/customSupabaseClient';
import { useToast } from '@/hooks/use-toast';
import { Building, Bell, Palette, Download, Save, Loader2, Upload } from 'lucide-react';
import { Switch } from '@/components/ui/switch';
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

const backgroundThemes = {
  default: { name: 'Navy INEV', from: '#001040', via: '#000820', to: '#000412' },
  sunset: { name: 'Atardecer', from: '#4a044e', via: '#c12b4b', to: '#f7b733' },
  ocean: { name: 'Océano Profundo', from: '#000428', via: '#004e92', to: '#1CB5E0' },
  forest: { name: 'Bosque Místico', from: '#134E5E', via: '#203A43', to: '#71B280' },
  lavender: { name: 'Lavanda Relajante', from: '#474350', via: '#9D50BB', to: '#D8B5FF' },
};

const SettingsSection = ({ onSettingsChange }) => {
  const [settings, setSettings] = useState({
    school_name: '',
    school_address: '',
    school_phone: '',
    school_email: '',
    logo_url: '',
    primary_color: '225, 100%, 13%',
    background_theme: 'default',
    notifications_overdue_payments: true,
    notifications_upcoming_payments: true,
  });
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);
  const { toast } = useToast();
  const fileInputRef = useRef(null);

  const fetchSettings = useCallback(async () => {
    setLoading(true);
    try {
      let { data, error } = await supabase.from('school_settings').select('*').limit(1).maybeSingle();
      
      if (error) throw error;

      if (data) {
        setSettings(prev => ({ ...prev, ...data }));
        if (onSettingsChange) onSettingsChange(data);
      } else {
        const { data: insertData, error: insertError } = await supabase.from('school_settings').insert([{}]) .select().single();
        if(insertError) throw insertError;
        setSettings(prev => ({ ...prev, ...insertData }));
        if (onSettingsChange) onSettingsChange(insertData);
        toast({ title: "Configuración inicial creada", description: "Hemos preparado tu panel de configuración por primera vez." });
      }
    } catch (error) {
      toast({ variant: "destructive", title: "Error al cargar la configuración", description: error.message });
    } finally {
      setLoading(false);
    }
  }, [toast, onSettingsChange]);

  useEffect(() => {
    fetchSettings();
  }, [fetchSettings]);

  const handleInputChange = (e) => {
    const { id, value } = e.target;
    setSettings(prev => ({ ...prev, [id]: value }));
  };

  const handleSwitchChange = (id, checked) => {
    setSettings(prev => ({ ...prev, [id]: checked }));
  };
  
  const handleSettingsUpdate = (update) => {
    const updatedSettings = { ...settings, ...update };
    setSettings(updatedSettings);
    if (onSettingsChange) onSettingsChange(updatedSettings);
  };


  const handleSaveSettings = async (e) => {
    e?.preventDefault();
    setSaving(true);
    try {
      const { id, created_at, ...updateData } = settings;
      updateData.updated_at = new Date();

      const { data, error } = await supabase.from('school_settings').update(updateData).eq('id', settings.id).select().single();
      if (error) throw error;
      
      setSettings(data);
      if (onSettingsChange) onSettingsChange(data);
      toast({ title: "¡Configuración guardada!", description: "Tus cambios se han guardado correctamente." });
    } catch (error) {
      toast({ variant: "destructive", title: "Error al guardar la configuración", description: error.message });
    } finally {
      setSaving(false);
    }
  };

  const handleLogoUpload = async (event) => {
    const file = event.target.files[0];
    if (!file) return;
    setUploading(true);
    try {
      if (settings.logo_url) {
        const oldLogoPath = settings.logo_url.split('/schoolassets/')[1];
        if (oldLogoPath) {
          await supabase.storage.from('schoolassets').remove([oldLogoPath]);
        }
      }

      const fileExt = file.name.split('.').pop();
      const fileName = `logo_${Date.now()}.${fileExt}`;
      const filePath = `logos/${fileName}`;

      const { error: uploadError } = await supabase.storage.from('schoolassets').upload(filePath, file);
      if (uploadError) throw uploadError;

      const { data: { publicUrl } } = supabase.storage.from('schoolassets').getPublicUrl(filePath);
      
      handleSettingsUpdate({ logo_url: publicUrl });
      toast({ title: "Logo actualizado", description: "El nuevo logo se ha subido y guardado." });
    } catch (error) {
      toast({ variant: "destructive", title: "Error al subir el logo", description: error.message });
    } finally {
      setUploading(false);
    }
  };

  const exportToCsv = (data, filename) => {
    if (data.length === 0) {
      toast({ variant: 'destructive', title: 'No hay datos para exportar' });
      return;
    }
    const headers = Object.keys(data[0]);
    const csvContent = [
      headers.join(','),
      ...data.map(row => headers.map(header => JSON.stringify(row[header])).join(','))
    ].join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    if (link.download !== undefined) {
      const url = URL.createObjectURL(blob);
      link.setAttribute('href', url);
      link.setAttribute('download', `${filename}.csv`);
      link.style.visibility = 'hidden';
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    }
    toast({ title: 'Exportación completa', description: `${filename}.csv ha sido descargado.` });
  };

  const handleExport = async (type) => {
    try {
      const { data, error } = await supabase.from(type).select('*');
      if (error) throw error;
      exportToCsv(data, type);
    } catch (error) {
      toast({ variant: 'destructive', title: `Error al exportar ${type}`, description: error.message });
    }
  };

  if (loading) {
    return <div className="flex justify-center items-center h-full"><Loader2 className="h-12 w-12 animate-spin text-purple-400" /></div>;
  }

  const colorOptions = [
    { name: 'Púrpura (Default)', value: '262, 83%, 58%' },
    { name: 'Azul', value: '221, 83%, 53%' },
    { name: 'Verde', value: '142, 76%, 36%' },
    { name: 'Rojo', value: '0, 72%, 51%' },
    { name: 'Naranja', value: '25, 95%, 53%' },
    { name: 'Rosa', value: '330, 81%, 60%' },
    { name: 'Cian', value: '187, 77%, 45%' },
    { name: 'Amarillo', value: '45, 93%, 47%' },
  ];

  return (
    <div className="space-y-6">
      <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}>
        <h1 className="text-3xl font-bold gradient-text mb-2">Configuración del Sistema</h1>
        <p className="text-white/70">Personaliza las opciones y configuraciones generales de EduManager</p>
      </motion.div>

      <Tabs defaultValue="general" className="w-full">
        <TabsList className="grid w-full grid-cols-4 bg-white/10 border-white/20">
          <TabsTrigger value="general">Información</TabsTrigger>
          <TabsTrigger value="appearance">Apariencia</TabsTrigger>
          <TabsTrigger value="notifications">Notificaciones</TabsTrigger>
          <TabsTrigger value="data">Datos</TabsTrigger>
        </TabsList>
        
        <form onSubmit={handleSaveSettings}>
          <TabsContent value="general" className="mt-6">
            <Card className="glass-effect border-white/20">
              <CardHeader><CardTitle className="text-white flex items-center gap-2"><Building className="w-5 h-5" />Información de la Escuela</CardTitle><CardDescription className="text-white/60">Actualiza los datos principales de tu institución.</CardDescription></CardHeader>
              <CardContent className="space-y-4">
                <div><Label htmlFor="school_name" className="text-white/80">Nombre de la Escuela</Label><Input id="school_name" value={settings.school_name || ''} onChange={handleInputChange} className="input-field" /></div>
                <div><Label htmlFor="school_address" className="text-white/80">Dirección</Label><Input id="school_address" value={settings.school_address || ''} onChange={handleInputChange} className="input-field"/></div>
                <div><Label htmlFor="school_phone" className="text-white/80">Teléfono</Label><Input id="school_phone" value={settings.school_phone || ''} onChange={handleInputChange} className="input-field"/></div>
                <div><Label htmlFor="school_email" className="text-white/80">Email de Contacto</Label><Input id="school_email" type="email" value={settings.school_email || ''} onChange={handleInputChange} className="input-field"/></div>
              </CardContent>
            </Card>
          </TabsContent>
          
          <TabsContent value="appearance" className="mt-6">
            <Card className="glass-effect border-white/20">
              <CardHeader><CardTitle className="text-white flex items-center gap-2"><Palette className="w-5 h-5" />Apariencia y Tema</CardTitle><CardDescription className="text-white/60">Personaliza el logo y los colores de la aplicación.</CardDescription></CardHeader>
              <CardContent className="space-y-8">
                <div className="flex items-center space-x-4">
                  {settings.logo_url ? (
                    <img src={settings.logo_url} alt="Logo actual de la escuela" className="h-20 w-20 rounded-full object-cover bg-white/20" />
                  ) : (
                    <div className="h-20 w-20 rounded-full bg-white/20 flex items-center justify-center">
                      <span className="text-xs text-white/50">Logo</span>
                    </div>
                  )}
                  <div><p className="text-white font-semibold">Logo de la escuela</p><p className="text-white/60 text-sm">Sube el logo de tu institución.</p></div>
                  <Button type="button" className="btn-secondary ml-auto" onClick={() => fileInputRef.current.click()} disabled={uploading}>
                    {uploading ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Upload className="w-4 h-4 mr-2" />}
                    Cambiar Logo
                  </Button>
                  <input type="file" ref={fileInputRef} onChange={handleLogoUpload} className="hidden" accept="image/png, image/jpeg, image/svg+xml" />
                </div>
                <div>
                  <Label className="text-white/80">Color Primario</Label><p className="text-white/60 text-sm mb-2">Selecciona el color que representará a tu marca.</p>
                  <div className="flex flex-wrap gap-4">
                    {colorOptions.map(color => (
                      <motion.div
                        key={color.value}
                        whileHover={{ scale: 1.1 }}
                        whileTap={{ scale: 0.9 }}
                        onClick={() => handleSettingsUpdate({ primary_color: color.value })}
                        className={`w-10 h-10 rounded-full cursor-pointer transition-all ${settings.primary_color === color.value ? 'ring-2 ring-offset-2 ring-offset-slate-900 ring-white' : ''}`}
                        style={{ backgroundColor: `hsl(${color.value.replace(/,/g, ' ').replace(/%/g, '')})` }}
                        title={color.name}
                      ></motion.div>
                    ))}
                  </div>
                </div>
                 <div>
                  <Label className="text-white/80">Tema de Fondo</Label><p className="text-white/60 text-sm mb-2">Cambia el ambiente visual de toda la aplicación.</p>
                  <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                    {Object.entries(backgroundThemes).map(([key, theme]) => (
                      <motion.div
                        key={key}
                        whileHover={{ scale: 1.05 }}
                        whileTap={{ scale: 0.95 }}
                        onClick={() => handleSettingsUpdate({ background_theme: key })}
                        className={`p-2 rounded-lg cursor-pointer transition-all border-2 ${settings.background_theme === key ? 'border-white' : 'border-transparent'}`}
                      >
                        <div className="w-full h-16 rounded-md" style={{ background: `linear-gradient(to right, ${theme.from}, ${theme.via}, ${theme.to})` }}></div>
                        <p className="text-white text-sm mt-2 text-center">{theme.name}</p>
                      </motion.div>
                    ))}
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="notifications" className="mt-6">
            <Card className="glass-effect border-white/20">
              <CardHeader><CardTitle className="text-white flex items-center gap-2"><Bell className="w-5 h-5" />Notificaciones</CardTitle><CardDescription className="text-white/60">Configura qué notificaciones por correo electrónico se enviarán.</CardDescription></CardHeader>
              <CardContent className="space-y-4">
                <div className="flex items-center justify-between p-4 rounded-lg bg-white/5">
                  <div><Label htmlFor="notifications_overdue_payments" className="font-semibold text-white">Alertas de Pagos Vencidos</Label><p className="text-sm text-white/60">Enviar un correo cuando un pago ha vencido.</p></div>
                  <Switch id="notifications_overdue_payments" checked={settings.notifications_overdue_payments} onCheckedChange={(checked) => handleSwitchChange('notifications_overdue_payments', checked)} />
                </div>
                <div className="flex items-center justify-between p-4 rounded-lg bg-white/5">
                  <div><Label htmlFor="notifications_upcoming_payments" className="font-semibold text-white">Recordatorios de Próximos Pagos</Label><p className="text-sm text-white/60">Enviar un recordatorio 3 días antes del vencimiento.</p></div>
                  <Switch id="notifications_upcoming_payments" checked={settings.notifications_upcoming_payments} onCheckedChange={(checked) => handleSwitchChange('notifications_upcoming_payments', checked)} />
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="data" className="mt-6">
            <Card className="glass-effect border-white/20">
              <CardHeader><CardTitle className="text-white flex items-center gap-2"><Download className="w-5 h-5" />Gestión de Datos</CardTitle><CardDescription className="text-white/60">Exporta los datos de tu sistema en formato CSV.</CardDescription></CardHeader>
              <CardContent className="space-y-4">
                <div className="flex justify-between items-center p-4 rounded-lg bg-white/5"><p className="font-semibold text-white">Exportar Estudiantes</p><Button type="button" className="btn-secondary" onClick={() => handleExport('students')}>Exportar CSV</Button></div>
                <div className="flex justify-between items-center p-4 rounded-lg bg-white/5"><p className="font-semibold text-white">Exportar Pagos</p><Button type="button" className="btn-secondary" onClick={() => handleExport('payments')}>Exportar CSV</Button></div>
              </CardContent>
            </Card>
          </TabsContent>
          
          <div className="mt-6">
            <Button type="submit" className="w-full btn-primary" disabled={saving}>
              {saving ? <><Loader2 className="mr-2 h-4 w-4 animate-spin" /> Guardando...</> : <><Save className="w-4 h-4 mr-2" /> Guardar Toda la Configuración</>}
            </Button>
          </div>
        </form>
      </Tabs>
    </div>
  );
};

export default SettingsSection;