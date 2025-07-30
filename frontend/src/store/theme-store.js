import { create } from 'zustand'
import { persist } from 'zustand/middleware'

/**
 * Store para gestión del tema (modo claro/oscuro)
 * Persiste la preferencia del usuario en localStorage
 */
const useThemeStore = create(
  persist(
    (set) => ({
      // Estado inicial: modo claro
      isDarkMode: false,
      
      // Función para alternar entre modos
      toggleTheme: () => set((state) => ({ 
        isDarkMode: !state.isDarkMode 
      })),
      
      // Función para establecer modo específico
      setTheme: (isDark) => set({ isDarkMode: isDark })
    }),
    {
      name: 'notaria-theme', // Clave en localStorage
      version: 1, // Versión para migraciones futuras
    }
  )
)

export default useThemeStore 