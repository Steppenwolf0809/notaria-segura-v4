import React from 'react';
import useAuth from '../hooks/use-auth';
import MatrizadorTabs from '../modules/docs/roles/MatrizadorTabs';
import ArchivoTabs from '../modules/docs/roles/ArchivoTabs';

const FLAGS = {
  MATRIZADOR_TABS: (import.meta.env.VITE_DOCS_MATRIZADOR_TABS || 'false') === 'true',
  ARCHIVO_TABS: (import.meta.env.VITE_DOCS_ARCHIVO_TABS || 'false') === 'true'
};

export default function DocumentosPage() {
  const { user } = useAuth();
  const role = user?.role;

  if (role === 'MATRIZADOR' && FLAGS.MATRIZADOR_TABS) {
    return <MatrizadorTabs />;
  }
  if (role === 'ARCHIVO' && FLAGS.ARCHIVO_TABS) {
    return <ArchivoTabs />;
  }
  return null;
}


