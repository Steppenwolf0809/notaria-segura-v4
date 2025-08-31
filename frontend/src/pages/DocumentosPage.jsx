import React from 'react';
import useAuth from '../hooks/use-auth';
import MatrizadorTabs from '../components/roles/MatrizadorTabs.jsx';
import ArchivoTabs from '../components/roles/ArchivoTabs.jsx';
import RecepcionGrouped from '../components/roles/RecepcionGrouped.jsx';
import { Box, Typography } from '@mui/material';

const DocumentosPage = () => {
  const { user } = useAuth();
  if (!user) return null;

  if (user.role === 'MATRIZADOR') return <MatrizadorTabs role="MATRIZADOR" />;
  if (user.role === 'ARCHIVO') return <ArchivoTabs />;
  if (user.role === 'RECEPCION') return <RecepcionGrouped />;

  return (
    <Box sx={{ p: 2 }}>
      <Typography>Vista Documentos disponible para Matrizador, Archivo y Recepción.</Typography>
    </Box>
  );
};

export default DocumentosPage;

