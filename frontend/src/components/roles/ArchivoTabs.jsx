import React from 'react';
import MatrizadorTabs from './MatrizadorTabs.jsx';
import { FLAGS } from '../../utils/flags';

const ArchivoTabs = () => {
  if (!FLAGS.DOCS_ARCHIVO_TABS) return null;
  return <MatrizadorTabs role="ARCHIVO" />;
};

export default ArchivoTabs;

