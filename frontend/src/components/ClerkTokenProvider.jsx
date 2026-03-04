import { useEffect } from 'react';
import { useAuth } from '@clerk/clerk-react';
import { setClerkTokenGetter } from '../services/api-client';

/**
 * Componente invisible que registra el getter de token de Clerk
 * en el api-client para que los interceptores de axios puedan obtener
 * el token sin depender de hooks de React.
 */
function ClerkTokenProvider({ children }) {
  const { getToken } = useAuth();

  useEffect(() => {
    setClerkTokenGetter(getToken);
  }, [getToken]);

  return children;
}

export default ClerkTokenProvider;
