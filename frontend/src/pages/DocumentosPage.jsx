import React from 'react';
import useAuth from '../hooks/use-auth';
import MatrizadorTabs from '../components/roles/MatrizadorTabs.jsx';
import ArchivoTabs from '../components/roles/ArchivoTabs.jsx';
import RecepcionGrouped from '../components/roles/RecepcionGrouped.jsx';
import { Box, Typography } from '@mui/material';
import { FLAGS } from '../utils/flags';
import DocumentosListos from '../components/recepcion/DocumentosListos.jsx';

const DocumentosPage = () => {
  const { user } = useAuth();
  if (!user) return null;

  if (user.role === 'MATRIZADOR') {
    return FLAGS.DOCS_MATRIZADOR_TABS ? <MatrizadorTabs role="MATRIZADOR" /> : null;
  }
  if (user.role === 'ARCHIVO') return <ArchivoTabs />;
  if (user.role === 'RECEPCION') {
    return FLAGS.DOCS_RECEPCION_GROUPED ? <RecepcionGrouped /> : <DocumentosListos />;
  }

  return (
    <Box sx={{ p: 2 }}>
      <Typography>Vista Documentos disponible para Matrizador, Archivo y Recepción.</Typography>
    </Box>
  );
};

export default DocumentosPage;

