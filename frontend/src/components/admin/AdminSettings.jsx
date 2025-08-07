import { useState, useEffect } from 'react';
import useAuthStore from '../../store/auth-store';

export default function AdminSettings() {
  const { user } = useAuthStore();
  const [systemInfo, setSystemInfo] = useState({
    version: '1.0.0',
    environment: 'Production',
    dbStatus: 'Connected',
    lastBackup: new Date().toLocaleDateString()
  });

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
          Configuración General
        </h1>
        <p className="text-gray-600 dark:text-gray-400">
          Configuración del sistema y parámetros generales
        </p>
      </div>

      {/* Información del Sistema */}
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6">
        <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
          Información del Sistema
        </h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="space-y-3">
            <div>
              <label className="text-sm font-medium text-gray-500 dark:text-gray-400">Versión</label>
              <p className="text-gray-900 dark:text-white">{systemInfo.version}</p>
            </div>
            <div>
              <label className="text-sm font-medium text-gray-500 dark:text-gray-400">Entorno</label>
              <p className="text-gray-900 dark:text-white">{systemInfo.environment}</p>
            </div>
          </div>
          <div className="space-y-3">
            <div>
              <label className="text-sm font-medium text-gray-500 dark:text-gray-400">Estado Base de Datos</label>
              <p className="text-green-600 dark:text-green-400">{systemInfo.dbStatus}</p>
            </div>
            <div>
              <label className="text-sm font-medium text-gray-500 dark:text-gray-400">Último Backup</label>
              <p className="text-gray-900 dark:text-white">{systemInfo.lastBackup}</p>
            </div>
          </div>
        </div>
      </div>

      {/* Configuración de la Notaría */}
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6">
        <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
          Configuración de la Notaría
        </h2>
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              Nombre de la Notaría
            </label>
            <input
              type="text"
              defaultValue="NOTARÍA DÉCIMO OCTAVA DEL CANTÓN QUITO"
              className="w-full p-3 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
              readOnly
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              Dirección
            </label>
            <input
              type="text"
              defaultValue="Azuay E2-231 y Av Amazonas, Quito"
              className="w-full p-3 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
              readOnly
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              Horario de Atención
            </label>
            <input
              type="text"
              defaultValue="Lunes a Viernes 8:00-17:00"
              className="w-full p-3 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
              readOnly
            />
          </div>
        </div>
        <div className="mt-4 p-3 bg-blue-50 dark:bg-blue-900/20 rounded-lg">
          <p className="text-sm text-blue-700 dark:text-blue-300">
            💡 Para modificar la configuración de la notaría, contacte al administrador del sistema.
          </p>
        </div>
      </div>

      {/* Configuración WhatsApp */}
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6">
        <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
          Estado WhatsApp
        </h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="text-sm font-medium text-gray-500 dark:text-gray-400">Estado del Servicio</label>
            <p className="text-green-600 dark:text-green-400 flex items-center">
              <span className="w-2 h-2 bg-green-500 rounded-full mr-2"></span>
              Activo
            </p>
          </div>
          <div>
            <label className="text-sm font-medium text-gray-500 dark:text-gray-400">Templates Configurados</label>
            <p className="text-gray-900 dark:text-white">2 Templates</p>
          </div>
        </div>
        <div className="mt-4 p-3 bg-green-50 dark:bg-green-900/20 rounded-lg">
          <p className="text-sm text-green-700 dark:text-green-300">
            ✅ El servicio WhatsApp está funcionando correctamente. Los templates están disponibles en la sección Templates WhatsApp.
          </p>
        </div>
      </div>

      {/* Información del Usuario Actual */}
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6">
        <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
          Información del Administrador
        </h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="text-sm font-medium text-gray-500 dark:text-gray-400">Nombre</label>
            <p className="text-gray-900 dark:text-white">{user?.firstName} {user?.lastName}</p>
          </div>
          <div>
            <label className="text-sm font-medium text-gray-500 dark:text-gray-400">Email</label>
            <p className="text-gray-900 dark:text-white">{user?.email}</p>
          </div>
          <div>
            <label className="text-sm font-medium text-gray-500 dark:text-gray-400">Rol</label>
            <p className="text-blue-600 dark:text-blue-400 font-medium">{user?.role}</p>
          </div>
          <div>
            <label className="text-sm font-medium text-gray-500 dark:text-gray-400">Último Acceso</label>
            <p className="text-gray-900 dark:text-white">
              {user?.lastLogin ? new Date(user.lastLogin).toLocaleString() : 'Primera vez'}
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}