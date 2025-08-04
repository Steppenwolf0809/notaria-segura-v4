import React from 'react';

/**
 * Componente para mostrar estadísticas del dashboard de recepción
 */
function EstadisticasRecepcion({ estadisticas }) {
  const stats = [
    {
      name: 'Documentos Listos',
      value: estadisticas.documentosListos || 0,
      icon: '📋',
      color: 'bg-blue-500',
      textColor: 'text-blue-600',
      bgColor: 'bg-blue-50'
    },
    {
      name: 'Entregados Hoy',
      value: estadisticas.documentosEntregadosHoy || 0,
      icon: '✅',
      color: 'bg-green-500',
      textColor: 'text-green-600',
      bgColor: 'bg-green-50'
    },
    {
      name: 'Entregados Esta Semana',
      value: estadisticas.documentosEntregadosSemana || 0,
      icon: '📈',
      color: 'bg-purple-500',
      textColor: 'text-purple-600',
      bgColor: 'bg-purple-50'
    },
    {
      name: 'Grupos Listos',
      value: estadisticas.gruposListos || 0,
      icon: '📦',
      color: 'bg-orange-500',
      textColor: 'text-orange-600',
      bgColor: 'bg-orange-50'
    }
  ];

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
      {stats.map((stat, index) => (
        <div
          key={index}
          className={`${stat.bgColor} rounded-lg p-6 border border-gray-200`}
        >
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600 truncate">
                {stat.name}
              </p>
              <p className={`text-2xl font-bold ${stat.textColor}`}>
                {stat.value}
              </p>
            </div>
            <div className={`${stat.color} rounded-md p-3`}>
              <span className="text-white text-xl">
                {stat.icon}
              </span>
            </div>
          </div>
          
          {/* Indicador de estado */}
          {stat.name === 'Documentos Listos' && stat.value > 0 && (
            <div className="mt-2">
              <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
                Pendientes de entrega
              </span>
            </div>
          )}
          
          {stat.name === 'Entregados Hoy' && stat.value > 0 && (
            <div className="mt-2">
              <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800">
                ✓ Completados
              </span>
            </div>
          )}
        </div>
      ))}
    </div>
  );
}

export default EstadisticasRecepcion;