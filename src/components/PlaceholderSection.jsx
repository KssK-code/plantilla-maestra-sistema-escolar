import React from 'react';
import { motion } from 'framer-motion';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Construction } from 'lucide-react';
import { toast } from '@/components/ui/use-toast';

const PlaceholderSection = ({ title, description, icon: Icon }) => {
  const handleFeatureRequest = () => {
    toast({
      title: "🚧 Esta funcionalidad aún no está implementada—¡pero no te preocupes! ¡Puedes solicitarla en tu próximo prompt! 🚀",
      description: "Estamos trabajando constantemente para mejorar el sistema.",
    });
  };

  return (
    <div className="space-y-6">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="text-center"
      >
        <h1 className="text-3xl font-bold gradient-text mb-2">{title}</h1>
        <p className="text-white/70">{description}</p>
      </motion.div>

      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.2 }}
        className="flex justify-center"
      >
        <Card className="glass-effect border-white/20 max-w-md">
          <CardHeader className="text-center">
            <div className="mx-auto mb-4 p-4 bg-gradient-to-r from-purple-600/30 to-pink-600/30 rounded-full w-fit">
              {Icon ? <Icon className="w-8 h-8 text-white" /> : <Construction className="w-8 h-8 text-white" />}
            </div>
            <CardTitle className="text-white">Próximamente</CardTitle>
          </CardHeader>
          <CardContent className="text-center space-y-4">
            <p className="text-white/70">
              Esta sección está en desarrollo. Pronto tendrás acceso a todas las funcionalidades.
            </p>
            <Button onClick={handleFeatureRequest} className="btn-primary">
              Solicitar Funcionalidad
            </Button>
          </CardContent>
        </Card>
      </motion.div>
    </div>
  );
};

export default PlaceholderSection;