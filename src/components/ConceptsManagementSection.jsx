import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
import { Trash2, Edit, Plus, Save, X, Tags } from 'lucide-react';
import { supabase } from '@/lib/customSupabaseClient';
import { useAuth } from '@/contexts/SupabaseAuthContext';

const ConceptsManagementSection = () => {
  const [concepts, setConcepts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [editingId, setEditingId] = useState(null);
  const [editingName, setEditingName] = useState('');
  const [newConceptName, setNewConceptName] = useState('');
  const [addingNew, setAddingNew] = useState(false);
  const { user } = useAuth();

  useEffect(() => {
    loadConcepts();
  }, []);

  const loadConcepts = async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('payment_concepts')
        .select('*')
        .order('name');
      
      if (error) throw error;
      setConcepts(data || []);
    } catch (error) {
      console.error('Error loading concepts:', error);
      alert('Error al cargar conceptos');
    } finally {
      setLoading(false);
    }
  };

  const handleAddConcept = async () => {
    if (!newConceptName.trim()) {
      alert('Ingresa un nombre para el concepto');
      return;
    }

    // Verificar duplicados
    const exists = concepts.some(concept => 
      concept.name.toLowerCase() === newConceptName.trim().toLowerCase()
    );
    
    if (exists) {
      alert('Ya existe un concepto con ese nombre');
      return;
    }

    try {
      const { data, error } = await supabase
        .from('payment_concepts')
        .insert([{ name: newConceptName.trim() }])
        .select();
      
      if (error) throw error;
      
      setConcepts([...concepts, ...data]);
      setNewConceptName('');
      setAddingNew(false);
      alert('Concepto agregado exitosamente');
    } catch (error) {
      console.error('Error adding concept:', error);
      alert('Error al agregar concepto');
    }
  };

  const handleEditConcept = async (id) => {
    if (!editingName.trim()) {
      alert('Ingresa un nombre para el concepto');
      return;
    }

    // Verificar duplicados (excluyendo el concepto actual)
    const exists = concepts.some(concept => 
      concept.id !== id && concept.name.toLowerCase() === editingName.trim().toLowerCase()
    );
    
    if (exists) {
      alert('Ya existe un concepto con ese nombre');
      return;
    }

    try {
      const { error } = await supabase
        .from('payment_concepts')
        .update({ name: editingName.trim() })
        .eq('id', id);
      
      if (error) throw error;
      
      setConcepts(concepts.map(concept => 
        concept.id === id ? { ...concept, name: editingName.trim() } : concept
      ));
      setEditingId(null);
      setEditingName('');
      alert('Concepto actualizado exitosamente');
    } catch (error) {
      console.error('Error updating concept:', error);
      alert('Error al actualizar concepto');
    }
  };

  const handleToggleActive = async (id, currentActive) => {
    try {
      const { error } = await supabase
        .from('payment_concepts')
        .update({ active: !currentActive })
        .eq('id', id);
      
      if (error) throw error;
      
      setConcepts(concepts.map(concept => 
        concept.id === id ? { ...concept, active: !currentActive } : concept
      ));
    } catch (error) {
      console.error('Error toggling concept status:', error);
      alert('Error al cambiar estado del concepto');
    }
  };

  const handleDeleteConcept = async (id) => {
    if (!confirm('¿Estás seguro de que deseas eliminar este concepto?')) {
      return;
    }

    try {
      const { error } = await supabase
        .from('payment_concepts')
        .delete()
        .eq('id', id);
      
      if (error) throw error;
      
      setConcepts(concepts.filter(concept => concept.id !== id));
      alert('Concepto eliminado exitosamente');
    } catch (error) {
      console.error('Error deleting concept:', error);
      alert('Error al eliminar concepto');
    }
  };

  const startEdit = (concept) => {
    setEditingId(concept.id);
    setEditingName(concept.name);
  };

  const cancelEdit = () => {
    setEditingId(null);
    setEditingName('');
  };

  const cancelAdd = () => {
    setAddingNew(false);
    setNewConceptName('');
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-purple-600"></div>
      </div>
    );
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="space-y-6"
    >
      <div className="flex items-center gap-3 mb-6">
        <Tags className="h-8 w-8 text-purple-400" />
        <h1 className="text-3xl font-bold text-white">Gestión de Conceptos</h1>
      </div>

      {/* Botón para agregar nuevo concepto */}
      <Card className="bg-slate-800/50 border-slate-700">
        <CardHeader>
          <CardTitle className="text-white flex items-center gap-2">
            <Plus className="h-5 w-5" />
            Agregar Nuevo Concepto
          </CardTitle>
        </CardHeader>
        <CardContent>
          {!addingNew ? (
            <Button 
              onClick={() => setAddingNew(true)}
              className="bg-purple-600 hover:bg-purple-700 text-white"
            >
              <Plus className="h-4 w-4 mr-2" />
              Nuevo Concepto
            </Button>
          ) : (
            <div className="flex gap-3 items-end">
              <div className="flex-1">
                <Label htmlFor="newConcept" className="text-slate-200">
                  Nombre del Concepto
                </Label>
                <Input
                  id="newConcept"
                  value={newConceptName}
                  onChange={(e) => setNewConceptName(e.target.value)}
                  placeholder="Ej: Colegiatura Medicina"
                  className="bg-slate-700/50 border-slate-600 text-white placeholder-slate-400 focus:border-purple-500"
                  onKeyPress={(e) => e.key === 'Enter' && handleAddConcept()}
                />
              </div>
              <Button 
                onClick={handleAddConcept}
                className="bg-green-600 hover:bg-green-700 text-white"
              >
                <Save className="h-4 w-4 mr-2" />
                Guardar
              </Button>
              <Button 
                onClick={cancelAdd}
                variant="outline"
                className="border-slate-600 text-slate-300 hover:bg-slate-700"
              >
                <X className="h-4 w-4 mr-2" />
                Cancelar
              </Button>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Lista de conceptos */}
      <Card className="bg-slate-800/50 border-slate-700">
        <CardHeader>
          <CardTitle className="text-white">Conceptos de Pago ({concepts.length})</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {concepts.map((concept) => (
              <div
                key={concept.id}
                className="flex items-center justify-between p-4 bg-slate-700/30 rounded-lg border border-slate-600"
              >
                <div className="flex items-center gap-4 flex-1">
                  {editingId === concept.id ? (
                    <div className="flex gap-3 items-center flex-1">
                      <Input
                        value={editingName}
                        onChange={(e) => setEditingName(e.target.value)}
                        className="bg-slate-700/50 border-slate-600 text-white placeholder-slate-400 focus:border-purple-500"
                        onKeyPress={(e) => e.key === 'Enter' && handleEditConcept(concept.id)}
                      />
                      <Button 
                        onClick={() => handleEditConcept(concept.id)}
                        size="sm"
                        className="bg-green-600 hover:bg-green-700 text-white"
                      >
                        <Save className="h-4 w-4" />
                      </Button>
                      <Button 
                        onClick={cancelEdit}
                        size="sm"
                        variant="outline"
                        className="border-slate-600 text-slate-300 hover:bg-slate-700"
                      >
                        <X className="h-4 w-4" />
                      </Button>
                    </div>
                  ) : (
                    <>
                      <span className="text-white font-medium flex-1">{concept.name}</span>
                      <Badge 
                        variant={concept.active ? "default" : "secondary"}
                        className={concept.active ? "bg-green-600 text-white" : "bg-slate-600 text-slate-300"}
                      >
                        {concept.active ? 'Activo' : 'Inactivo'}
                      </Badge>
                    </>
                  )}
                </div>

                {editingId !== concept.id && (
                  <div className="flex items-center gap-3">
                    <div className="flex items-center gap-2">
                      <Label htmlFor={`switch-${concept.id}`} className="text-slate-300 text-sm">
                        {concept.active ? 'Activo' : 'Inactivo'}
                      </Label>
                      <Switch
                        id={`switch-${concept.id}`}
                        checked={concept.active}
                        onCheckedChange={() => handleToggleActive(concept.id, concept.active)}
                      />
                    </div>
                    <Button
                      onClick={() => startEdit(concept)}
                      size="sm"
                      variant="outline"
                      className="border-slate-600 text-slate-300 hover:bg-slate-700"
                    >
                      <Edit className="h-4 w-4" />
                    </Button>
                    <Button
                      onClick={() => handleDeleteConcept(concept.id)}
                      size="sm"
                      variant="outline"
                      className="border-red-600 text-red-400 hover:bg-red-600 hover:text-white"
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                )}
              </div>
            ))}

            {concepts.length === 0 && (
              <div className="text-center py-8 text-slate-400">
                No hay conceptos de pago configurados.
                <br />
                Agrega el primer concepto usando el botón de arriba.
              </div>
            )}
          </div>
        </CardContent>
      </Card>
    </motion.div>
  );
};

export default ConceptsManagementSection;
