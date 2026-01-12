import React, { useState, useEffect, useCallback } from 'react';
import { useAuthStore } from '../../store/auth-store';
import api from '../../services/api-client';

const EncuestasSatisfaccion = () => {
    const { token } = useAuthStore();
    const [encuestas, setEncuestas] = useState([]);
    const [estadisticas, setEstadisticas] = useState(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);

    // Paginación
    const [page, setPage] = useState(1);
    const [pagination, setPagination] = useState(null);
    const limit = 25;

    // Filtros
    const [filtroCalificacion, setFiltroCalificacion] = useState('');
    const [fechaDesde, setFechaDesde] = useState('');
    const [fechaHasta, setFechaHasta] = useState('');

    const fetchEstadisticas = useCallback(async () => {
        try {
            const params = new URLSearchParams();
            if (fechaDesde) params.append('fechaDesde', fechaDesde);
            if (fechaHasta) params.append('fechaHasta', fechaHasta);

            const response = await api.get(`/encuesta/admin/estadisticas?${params.toString()}`);
            if (response.data.success) {
                setEstadisticas(response.data.data);
            }
        } catch (err) {
            console.error('Error al cargar estadísticas:', err);
        }
    }, [fechaDesde, fechaHasta]);

    const fetchEncuestas = useCallback(async () => {
        setLoading(true);
        setError(null);
        try {
            const params = new URLSearchParams();
            params.append('page', page.toString());
            params.append('limit', limit.toString());
            if (filtroCalificacion) params.append('calificacion', filtroCalificacion);
            if (fechaDesde) params.append('fechaDesde', fechaDesde);
            if (fechaHasta) params.append('fechaHasta', fechaHasta);

            const response = await api.get(`/encuesta/admin?${params.toString()}`);
            if (response.data.success) {
                setEncuestas(response.data.data);
                setPagination(response.data.pagination);
            }
        } catch (err) {
            console.error('Error al cargar encuestas:', err);
            setError('Error al cargar las encuestas');
        } finally {
            setLoading(false);
        }
    }, [page, filtroCalificacion, fechaDesde, fechaHasta]);

    useEffect(() => {
        fetchEncuestas();
        fetchEstadisticas();
    }, [fetchEncuestas, fetchEstadisticas]);

    const handleFiltrar = () => {
        setPage(1);
        fetchEncuestas();
        fetchEstadisticas();
    };

    const handleLimpiarFiltros = () => {
        setFiltroCalificacion('');
        setFechaDesde('');
        setFechaHasta('');
        setPage(1);
    };

    const getEmojiCalificacion = (cal) => {
        const emojis = { 1: '😞', 2: '😕', 3: '😐', 4: '🙂', 5: '😍' };
        return emojis[cal] || '❓';
    };

    const formatDate = (dateStr) => {
        return new Date(dateStr).toLocaleDateString('es-EC', {
            day: '2-digit',
            month: '2-digit',
            year: 'numeric',
            hour: '2-digit',
            minute: '2-digit'
        });
    };

    const renderStars = (rating) => {
        return (
            <div style={{ display: 'flex', gap: '2px' }}>
                {[1, 2, 3, 4, 5].map((star) => (
                    <span key={star} style={{
                        color: star <= rating ? '#f59e0b' : '#d1d5db',
                        fontSize: '1.1rem'
                    }}>
                        ★
                    </span>
                ))}
            </div>
        );
    };

    return (
        <div style={{ padding: '24px', maxWidth: '1400px', margin: '0 auto' }}>
            {/* Header */}
            <div style={{ marginBottom: '24px' }}>
                <h1 style={{ fontSize: '1.75rem', fontWeight: 700, marginBottom: '8px' }}>
                    📊 Encuestas de Satisfacción
                </h1>
                <p style={{ color: '#64748b' }}>
                    Revisa los comentarios y calificaciones de los clientes
                </p>
            </div>

            {/* Stats Cards */}
            {estadisticas && (
                <div style={{
                    display: 'grid',
                    gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
                    gap: '16px',
                    marginBottom: '24px'
                }}>
                    <div style={{
                        background: 'linear-gradient(135deg, #3b82f6 0%, #1d4ed8 100%)',
                        borderRadius: '12px',
                        padding: '20px',
                        color: 'white'
                    }}>
                        <div style={{ fontSize: '0.875rem', opacity: 0.9 }}>Total Encuestas</div>
                        <div style={{ fontSize: '2rem', fontWeight: 700 }}>{estadisticas.total}</div>
                    </div>

                    <div style={{
                        background: 'linear-gradient(135deg, #f59e0b 0%, #d97706 100%)',
                        borderRadius: '12px',
                        padding: '20px',
                        color: 'white'
                    }}>
                        <div style={{ fontSize: '0.875rem', opacity: 0.9 }}>Promedio</div>
                        <div style={{ fontSize: '2rem', fontWeight: 700 }}>
                            {estadisticas.promedioCalificacion} ⭐
                        </div>
                    </div>

                    <div style={{
                        background: 'linear-gradient(135deg, #10b981 0%, #059669 100%)',
                        borderRadius: '12px',
                        padding: '20px',
                        color: 'white'
                    }}>
                        <div style={{ fontSize: '0.875rem', opacity: 0.9 }}>Info Clara</div>
                        <div style={{ fontSize: '2rem', fontWeight: 700 }}>
                            {estadisticas.porcentajeInfoClara}%
                        </div>
                    </div>

                    <div style={{
                        background: 'linear-gradient(135deg, #8b5cf6 0%, #7c3aed 100%)',
                        borderRadius: '12px',
                        padding: '20px',
                        color: 'white'
                    }}>
                        <div style={{ fontSize: '0.875rem', opacity: 0.9 }}>Trato Cordial</div>
                        <div style={{ fontSize: '2rem', fontWeight: 700 }}>
                            {estadisticas.porcentajeTratoCordial}%
                        </div>
                    </div>
                </div>
            )}

            {/* Distribution Chart */}
            {estadisticas && estadisticas.distribucion && (
                <div style={{
                    background: 'white',
                    borderRadius: '12px',
                    padding: '20px',
                    marginBottom: '24px',
                    boxShadow: '0 1px 3px rgba(0,0,0,0.1)'
                }}>
                    <h3 style={{ marginBottom: '16px', fontSize: '1rem', fontWeight: 600 }}>
                        Distribución de Calificaciones
                    </h3>
                    <div style={{ display: 'flex', gap: '16px', alignItems: 'flex-end', height: '120px' }}>
                        {[1, 2, 3, 4, 5].map((cal) => {
                            const count = estadisticas.distribucion[cal] || 0;
                            const maxCount = Math.max(...Object.values(estadisticas.distribucion), 1);
                            const height = (count / maxCount) * 100;
                            return (
                                <div key={cal} style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
                                    <span style={{ fontSize: '0.75rem', color: '#64748b', marginBottom: '4px' }}>{count}</span>
                                    <div style={{
                                        width: '100%',
                                        height: `${Math.max(height, 5)}%`,
                                        background: `linear-gradient(180deg, ${cal >= 4 ? '#10b981' : cal >= 3 ? '#f59e0b' : '#ef4444'} 0%, ${cal >= 4 ? '#059669' : cal >= 3 ? '#d97706' : '#dc2626'} 100%)`,
                                        borderRadius: '6px 6px 0 0',
                                        minHeight: '8px'
                                    }} />
                                    <span style={{ fontSize: '1.25rem', marginTop: '8px' }}>{getEmojiCalificacion(cal)}</span>
                                </div>
                            );
                        })}
                    </div>
                </div>
            )}

            {/* Filters */}
            <div style={{
                background: 'white',
                borderRadius: '12px',
                padding: '16px',
                marginBottom: '24px',
                boxShadow: '0 1px 3px rgba(0,0,0,0.1)',
                display: 'flex',
                flexWrap: 'wrap',
                gap: '12px',
                alignItems: 'flex-end'
            }}>
                <div>
                    <label style={{ display: 'block', fontSize: '0.75rem', color: '#64748b', marginBottom: '4px' }}>
                        Calificación
                    </label>
                    <select
                        value={filtroCalificacion}
                        onChange={(e) => setFiltroCalificacion(e.target.value)}
                        style={{
                            padding: '8px 12px',
                            border: '1px solid #e2e8f0',
                            borderRadius: '8px',
                            fontSize: '0.875rem',
                            minWidth: '140px'
                        }}
                    >
                        <option value="">Todas</option>
                        <option value="5">⭐⭐⭐⭐⭐ (5)</option>
                        <option value="4">⭐⭐⭐⭐ (4)</option>
                        <option value="3">⭐⭐⭐ (3)</option>
                        <option value="2">⭐⭐ (2)</option>
                        <option value="1">⭐ (1)</option>
                    </select>
                </div>

                <div>
                    <label style={{ display: 'block', fontSize: '0.75rem', color: '#64748b', marginBottom: '4px' }}>
                        Desde
                    </label>
                    <input
                        type="date"
                        value={fechaDesde}
                        onChange={(e) => setFechaDesde(e.target.value)}
                        style={{
                            padding: '8px 12px',
                            border: '1px solid #e2e8f0',
                            borderRadius: '8px',
                            fontSize: '0.875rem'
                        }}
                    />
                </div>

                <div>
                    <label style={{ display: 'block', fontSize: '0.75rem', color: '#64748b', marginBottom: '4px' }}>
                        Hasta
                    </label>
                    <input
                        type="date"
                        value={fechaHasta}
                        onChange={(e) => setFechaHasta(e.target.value)}
                        style={{
                            padding: '8px 12px',
                            border: '1px solid #e2e8f0',
                            borderRadius: '8px',
                            fontSize: '0.875rem'
                        }}
                    />
                </div>

                <button
                    onClick={handleFiltrar}
                    style={{
                        padding: '8px 16px',
                        background: '#3b82f6',
                        color: 'white',
                        border: 'none',
                        borderRadius: '8px',
                        fontSize: '0.875rem',
                        cursor: 'pointer',
                        fontWeight: 500
                    }}
                >
                    Aplicar
                </button>

                <button
                    onClick={handleLimpiarFiltros}
                    style={{
                        padding: '8px 16px',
                        background: '#f1f5f9',
                        color: '#64748b',
                        border: '1px solid #e2e8f0',
                        borderRadius: '8px',
                        fontSize: '0.875rem',
                        cursor: 'pointer'
                    }}
                >
                    Limpiar
                </button>
            </div>

            {/* Error */}
            {error && (
                <div style={{
                    background: '#fee2e2',
                    color: '#991b1b',
                    padding: '12px 16px',
                    borderRadius: '8px',
                    marginBottom: '16px'
                }}>
                    {error}
                </div>
            )}

            {/* Table */}
            <div style={{
                background: 'white',
                borderRadius: '12px',
                boxShadow: '0 1px 3px rgba(0,0,0,0.1)',
                overflow: 'hidden'
            }}>
                {loading ? (
                    <div style={{ padding: '40px', textAlign: 'center', color: '#64748b' }}>
                        Cargando encuestas...
                    </div>
                ) : encuestas.length === 0 ? (
                    <div style={{ padding: '40px', textAlign: 'center', color: '#64748b' }}>
                        No se encontraron encuestas
                    </div>
                ) : (
                    <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                        <thead>
                            <tr style={{ background: '#f8fafc', borderBottom: '1px solid #e2e8f0' }}>
                                <th style={{ padding: '12px 16px', textAlign: 'left', fontWeight: 600, fontSize: '0.875rem' }}>Fecha</th>
                                <th style={{ padding: '12px 16px', textAlign: 'center', fontWeight: 600, fontSize: '0.875rem' }}>Calificación</th>
                                <th style={{ padding: '12px 16px', textAlign: 'center', fontWeight: 600, fontSize: '0.875rem' }}>Info Clara</th>
                                <th style={{ padding: '12px 16px', textAlign: 'center', fontWeight: 600, fontSize: '0.875rem' }}>Trato Cordial</th>
                                <th style={{ padding: '12px 16px', textAlign: 'left', fontWeight: 600, fontSize: '0.875rem' }}>Trámite</th>
                                <th style={{ padding: '12px 16px', textAlign: 'left', fontWeight: 600, fontSize: '0.875rem' }}>Sugerencia</th>
                            </tr>
                        </thead>
                        <tbody>
                            {encuestas.map((enc) => (
                                <tr key={enc.id} style={{ borderBottom: '1px solid #e2e8f0' }}>
                                    <td style={{ padding: '12px 16px', fontSize: '0.875rem' }}>
                                        {formatDate(enc.createdAt)}
                                    </td>
                                    <td style={{ padding: '12px 16px', textAlign: 'center' }}>
                                        <span style={{ fontSize: '1.5rem' }}>{getEmojiCalificacion(enc.calificacion)}</span>
                                        <div>{renderStars(enc.calificacion)}</div>
                                    </td>
                                    <td style={{ padding: '12px 16px', textAlign: 'center' }}>
                                        <span style={{
                                            display: 'inline-block',
                                            padding: '4px 12px',
                                            borderRadius: '20px',
                                            fontSize: '0.75rem',
                                            fontWeight: 500,
                                            background: enc.infoClara ? '#d1fae5' : '#fee2e2',
                                            color: enc.infoClara ? '#065f46' : '#991b1b'
                                        }}>
                                            {enc.infoClara ? '✓ Sí' : '✗ No'}
                                        </span>
                                    </td>
                                    <td style={{ padding: '12px 16px', textAlign: 'center' }}>
                                        <span style={{
                                            display: 'inline-block',
                                            padding: '4px 12px',
                                            borderRadius: '20px',
                                            fontSize: '0.75rem',
                                            fontWeight: 500,
                                            background: enc.tratoCordial ? '#d1fae5' : '#fee2e2',
                                            color: enc.tratoCordial ? '#065f46' : '#991b1b'
                                        }}>
                                            {enc.tratoCordial ? '✓ Sí' : '✗ No'}
                                        </span>
                                    </td>
                                    <td style={{ padding: '12px 16px', fontSize: '0.875rem', color: '#64748b' }}>
                                        {enc.tramiteId || '-'}
                                    </td>
                                    <td style={{ padding: '12px 16px', fontSize: '0.875rem', maxWidth: '300px' }}>
                                        {enc.sugerencia ? (
                                            <span title={enc.sugerencia} style={{
                                                display: 'block',
                                                overflow: 'hidden',
                                                textOverflow: 'ellipsis',
                                                whiteSpace: 'nowrap'
                                            }}>
                                                {enc.sugerencia}
                                            </span>
                                        ) : (
                                            <span style={{ color: '#94a3b8' }}>—</span>
                                        )}
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                )}

                {/* Pagination */}
                {pagination && pagination.totalPages > 1 && (
                    <div style={{
                        display: 'flex',
                        justifyContent: 'space-between',
                        alignItems: 'center',
                        padding: '12px 16px',
                        borderTop: '1px solid #e2e8f0',
                        background: '#f8fafc'
                    }}>
                        <span style={{ fontSize: '0.875rem', color: '#64748b' }}>
                            Mostrando {((page - 1) * limit) + 1} - {Math.min(page * limit, pagination.total)} de {pagination.total}
                        </span>
                        <div style={{ display: 'flex', gap: '8px' }}>
                            <button
                                onClick={() => setPage(p => Math.max(1, p - 1))}
                                disabled={!pagination.hasPrev}
                                style={{
                                    padding: '6px 12px',
                                    border: '1px solid #e2e8f0',
                                    borderRadius: '6px',
                                    background: pagination.hasPrev ? 'white' : '#f1f5f9',
                                    cursor: pagination.hasPrev ? 'pointer' : 'not-allowed',
                                    fontSize: '0.875rem'
                                }}
                            >
                                ← Anterior
                            </button>
                            <span style={{
                                padding: '6px 12px',
                                fontSize: '0.875rem',
                                color: '#64748b'
                            }}>
                                Página {page} de {pagination.totalPages}
                            </span>
                            <button
                                onClick={() => setPage(p => p + 1)}
                                disabled={!pagination.hasNext}
                                style={{
                                    padding: '6px 12px',
                                    border: '1px solid #e2e8f0',
                                    borderRadius: '6px',
                                    background: pagination.hasNext ? 'white' : '#f1f5f9',
                                    cursor: pagination.hasNext ? 'pointer' : 'not-allowed',
                                    fontSize: '0.875rem'
                                }}
                            >
                                Siguiente →
                            </button>
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
};

export default EncuestasSatisfaccion;
