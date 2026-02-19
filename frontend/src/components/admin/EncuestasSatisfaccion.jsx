import React, { useState, useEffect, useCallback } from 'react';
import useAuthStore from '../../store/auth-store';
import api from '../../services/api-client';

const EncuestasSatisfaccion = ({ onOpenDocumentByTramite = null }) => {
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
        const stars = [];
        for (let i = 1; i <= 5; i++) {
            stars.push(
                <span key={i} style={{
                    color: i <= rating ? '#FBBF24' : '#E5E7EB',
                    fontSize: '1.2rem',
                    marginRight: '2px'
                }}>
                    ★
                </span>
            );
        }
        return <div style={{ display: 'flex', alignItems: 'center' }}>{stars}</div>;
    };

    const handleOpenDocument = (tramiteId) => {
        if (!tramiteId || typeof onOpenDocumentByTramite !== 'function') return;
        onOpenDocumentByTramite(tramiteId);
    };

    return (
        <div style={{ padding: '32px', maxWidth: '1400px', margin: '0 auto', fontFamily: 'Inter, system-ui, sans-serif' }}>
            {/* Header Section */}
            <div style={{ marginBottom: '32px', borderBottom: '1px solid #E2E8F0', paddingBottom: '16px' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '8px' }}>
                    <span style={{ fontSize: '2rem' }}>📊</span>
                    <h1 style={{ fontSize: '2.25rem', fontWeight: 800, color: '#1E293B', letterSpacing: '-0.025em' }}>
                        Métricas de Satisfacción
                    </h1>
                </div>
                <p style={{ color: '#64748B', fontSize: '1.125rem', fontWeight: 400 }}>
                    Analiza el feedback de tus clientes para elevar el estándar de servicio en la notaría.
                </p>
            </div>

            {/* Stats Overview */}
            {estadisticas && (
                <div style={{
                    display: 'grid',
                    gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))',
                    gap: '24px',
                    marginBottom: '40px'
                }}>
                    {/* Card: Total */}
                    <div style={{
                        background: '#FFFFFF',
                        borderRadius: '16px',
                        padding: '24px',
                        boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06)',
                        borderLeft: '4px solid #3B82F6'
                    }}>
                        <div style={{ color: '#64748B', fontSize: '0.875rem', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '8px' }}>
                            Volumen de Encuestas
                        </div>
                        <div style={{ display: 'flex', alignItems: 'baseline', gap: '8px' }}>
                            <span style={{ fontSize: '2.5rem', fontWeight: 800, color: '#1E293B' }}>{estadisticas.total}</span>
                            <span style={{ color: '#94A3B8', fontSize: '0.875rem' }}>registros</span>
                        </div>
                    </div>

                    {/* Card: Promedio */}
                    <div style={{
                        background: '#FFFFFF',
                        borderRadius: '16px',
                        padding: '24px',
                        boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06)',
                        borderLeft: '4px solid #F59E0B'
                    }}>
                        <div style={{ color: '#64748B', fontSize: '0.875rem', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '8px' }}>
                            Calificación Media
                        </div>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                            <span style={{ fontSize: '2.5rem', fontWeight: 800, color: '#1E293B' }}>{estadisticas.promedioCalificacion}</span>
                            <div style={{ display: 'flex', flexDirection: 'column' }}>
                                <span style={{ color: '#F59E0B', fontSize: '1.25rem' }}>★★★★★</span>
                                <span style={{ color: '#94A3B8', fontSize: '0.75rem' }}>Puntaje global</span>
                            </div>
                        </div>
                    </div>

                    {/* Card: Info Clara */}
                    <div style={{
                        background: '#FFFFFF',
                        borderRadius: '16px',
                        padding: '24px',
                        boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06)',
                        borderLeft: '4px solid #10B981'
                    }}>
                        <div style={{ color: '#64748B', fontSize: '0.875rem', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '8px' }}>
                            Claridad Informativa
                        </div>
                        <div style={{ fontSize: '2.5rem', fontWeight: 800, color: '#065F46' }}>
                            {estadisticas.porcentajeInfoClara}%
                        </div>
                        <div style={{ width: '100%', height: '6px', background: '#F1F5F9', borderRadius: '3px', marginTop: '12px' }}>
                            <div style={{ width: `${estadisticas.porcentajeInfoClara}%`, height: '100%', background: '#10B981', borderRadius: '3px' }} />
                        </div>
                    </div>

                    {/* Card: Cordialidad */}
                    <div style={{
                        background: '#FFFFFF',
                        borderRadius: '16px',
                        padding: '24px',
                        boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06)',
                        borderLeft: '4px solid #8B5CF6'
                    }}>
                        <div style={{ color: '#64748B', fontSize: '0.875rem', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '8px' }}>
                            Cordialidad en el Trato
                        </div>
                        <div style={{ fontSize: '2.5rem', fontWeight: 800, color: '#5B21B6' }}>
                            {estadisticas.porcentajeTratoCordial}%
                        </div>
                        <div style={{ width: '100%', height: '6px', background: '#F1F5F9', borderRadius: '3px', marginTop: '12px' }}>
                            <div style={{ width: `${estadisticas.porcentajeTratoCordial}%`, height: '100%', background: '#8B5CF6', borderRadius: '3px' }} />
                        </div>
                    </div>
                </div>
            )}

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 340px', gap: '32px', marginBottom: '40px' }}>
                {/* Distribution Chart */}
                <div style={{
                    background: '#FFFFFF',
                    borderRadius: '20px',
                    padding: '32px',
                    boxShadow: '0 1px 3px 0 rgba(0, 0, 0, 0.1)',
                    border: '1px solid #F1F5F9'
                }}>
                    <h3 style={{ fontSize: '1.25rem', fontWeight: 700, color: '#1E293B', marginBottom: '24px', display: 'flex', alignItems: 'center', gap: '8px' }}>
                        <span>📊</span> Distribución de Experiencias
                    </h3>
                    {estadisticas && estadisticas.distribucion && (
                        <div style={{ display: 'flex', gap: '24px', alignItems: 'flex-end', height: '180px', paddingBottom: '20px' }}>
                            {[1, 2, 3, 4, 5].map((cal) => {
                                const count = estadisticas.distribucion[cal] || 0;
                                const maxCount = Math.max(...Object.values(estadisticas.distribucion), 1);
                                const height = (count / maxCount) * 100;
                                const barColors = {
                                    1: '#EF4444', 2: '#F87171', 3: '#FBBF24', 4: '#34D399', 5: '#10B981'
                                };
                                return (
                                    <div key={cal} style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
                                        <span style={{ fontSize: '0.875rem', fontWeight: 600, color: '#64748B', marginBottom: '8px' }}>{count}</span>
                                        <div style={{
                                            width: '100%',
                                            height: `${Math.max(height, 5)}%`,
                                            background: barColors[cal],
                                            borderRadius: '8px 8px 4px 4px',
                                            transition: 'height 0.3s ease',
                                            boxShadow: 'inset 0 2px 4px rgba(255,255,255,0.2)'
                                        }} />
                                        <div style={{ fontSize: '1.5rem', marginTop: '12px' }}>{getEmojiCalificacion(cal)}</div>
                                    </div>
                                );
                            })}
                        </div>
                    )}
                </div>

                {/* Filters Panel */}
                <div style={{
                    background: '#F8FAF6',
                    borderRadius: '20px',
                    padding: '24px',
                    border: '1px solid #E2E8F0'
                }}>
                    <h3 style={{ fontSize: '1rem', fontWeight: 700, color: '#334155', marginBottom: '20px', display: 'flex', alignItems: 'center', gap: '8px' }}>
                        <span>🔍</span> Filtros Avanzados
                    </h3>

                    <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                        <div>
                            <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: 600, color: '#64748B', textTransform: 'uppercase', marginBottom: '6px' }}>
                                Nivel de Calificación
                            </label>
                            <select
                                value={filtroCalificacion}
                                onChange={(e) => setFiltroCalificacion(e.target.value)}
                                style={{
                                    width: '100%',
                                    padding: '10px 12px',
                                    borderRadius: '10px',
                                    border: '1px solid #CBD5E1',
                                    fontSize: '0.875rem',
                                    background: '#FFFFFF'
                                }}
                            >
                                <option value="">Todas las valoraciones</option>
                                <option value="5">Excelente (5 ⭐)</option>
                                <option value="4">Bueno (4 ⭐)</option>
                                <option value="3">Regular (3 ⭐)</option>
                                <option value="2">Insatisfecho (2 ⭐)</option>
                                <option value="1">Muy mal (1 ⭐)</option>
                            </select>
                        </div>

                        <div>
                            <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: 600, color: '#64748B', textTransform: 'uppercase', marginBottom: '6px' }}>
                                Período (Desde)
                            </label>
                            <input
                                type="date"
                                value={fechaDesde}
                                onChange={(e) => setFechaDesde(e.target.value)}
                                style={{ width: '100%', padding: '10px 12px', borderRadius: '10px', border: '1px solid #CBD5E1', fontSize: '0.875rem' }}
                            />
                        </div>

                        <div>
                            <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: 600, color: '#64748B', textTransform: 'uppercase', marginBottom: '6px' }}>
                                Período (Hasta)
                            </label>
                            <input
                                type="date"
                                value={fechaHasta}
                                onChange={(e) => setFechaHasta(e.target.value)}
                                style={{ width: '100%', padding: '10px 12px', borderRadius: '10px', border: '1px solid #CBD5E1', fontSize: '0.875rem' }}
                            />
                        </div>

                        <div style={{ display: 'flex', gap: '12px', marginTop: '8px' }}>
                            <button
                                onClick={handleFiltrar}
                                style={{
                                    flex: 2,
                                    padding: '12px',
                                    background: '#1E293B',
                                    color: '#FFFFFF',
                                    border: 'none',
                                    borderRadius: '10px',
                                    fontWeight: 600,
                                    cursor: 'pointer',
                                    fontSize: '0.875rem'
                                }}
                            >
                                Aplicar Filtros
                            </button>
                            <button
                                onClick={handleLimpiarFiltros}
                                style={{
                                    flex: 1,
                                    padding: '12px',
                                    background: '#F1F5F9',
                                    color: '#64748B',
                                    border: '1px solid #E2E8F0',
                                    borderRadius: '10px',
                                    fontWeight: 600,
                                    cursor: 'pointer',
                                    fontSize: '0.875rem'
                                }}
                            >
                                Limpiar
                            </button>
                        </div>
                    </div>
                </div>
            </div>

            {/* Main Table */}
            <div style={{
                background: '#FFFFFF',
                borderRadius: '20px',
                boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.05)',
                border: '1px solid #E2E8F0',
                overflow: 'hidden'
            }}>
                <div style={{ padding: '24px', borderBottom: '1px solid #F1F5F9', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <h3 style={{ fontSize: '1.25rem', fontWeight: 700, color: '#1E293B' }}>Listado de Valoraciones Recientes</h3>
                    {pagination && (
                        <span style={{ fontSize: '0.875rem', color: '#64748B' }}>
                            Total: <strong>{pagination.total}</strong> respuestas
                        </span>
                    )}
                </div>

                {loading ? (
                    <div style={{ padding: '60px', textAlign: 'center' }}>
                        <div style={{ display: 'inline-block', width: '32px', height: '32px', border: '3px solid #F3F4F6', borderTopColor: '#3B82F6', borderRadius: '50%', animation: 'spin 1s linear infinite' }} />
                        <p style={{ marginTop: '16px', color: '#64748B', fontWeight: 500 }}>Sincronizando encuestas...</p>
                    </div>
                ) : encuestas.length === 0 ? (
                    <div style={{ padding: '80px', textAlign: 'center' }}>
                        <div style={{ fontSize: '3rem', marginBottom: '16px' }}>🏜️</div>
                        <h4 style={{ color: '#1E293B', fontSize: '1.125rem', fontWeight: 600 }}>Sin resultados</h4>
                        <p style={{ color: '#64748B' }}>No hay encuestas que coincidan con los filtros seleccionados.</p>
                    </div>
                ) : (
                    <div style={{ overflowX: 'auto' }}>
                        <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                            <thead>
                                <tr style={{ background: '#F8FAFC' }}>
                                    <th style={{ padding: '16px 24px', textAlign: 'left', fontSize: '0.75rem', fontWeight: 700, color: '#64748B', textTransform: 'uppercase' }}>Fecha y Hora</th>
                                    <th style={{ padding: '16px 24px', textAlign: 'center', fontSize: '0.75rem', fontWeight: 700, color: '#64748B', textTransform: 'uppercase' }}>Calificación</th>
                                    <th style={{ padding: '16px 24px', textAlign: 'center', fontSize: '0.75rem', fontWeight: 700, color: '#64748B', textTransform: 'uppercase' }}>Info Clara</th>
                                    <th style={{ padding: '16px 24px', textAlign: 'center', fontSize: '0.75rem', fontWeight: 700, color: '#64748B', textTransform: 'uppercase' }}>Trato Cordial</th>
                                    <th style={{ padding: '16px 24px', textAlign: 'left', fontSize: '0.75rem', fontWeight: 700, color: '#64748B', textTransform: 'uppercase' }}>ID Trámite</th>
                                    <th style={{ padding: '16px 24px', textAlign: 'left', fontSize: '0.75rem', fontWeight: 700, color: '#64748B', textTransform: 'uppercase' }}>Sugerencias del Cliente</th>
                                </tr>
                            </thead>
                            <tbody>
                                {encuestas.map((enc) => (
                                    <tr key={enc.id} style={{ borderBottom: '1px solid #F1F5F9', transition: 'background 0.2s' }}>
                                        <td style={{ padding: '20px 24px', fontSize: '0.875rem', color: '#475569', fontWeight: 500 }}>
                                            {formatDate(enc.createdAt)}
                                        </td>
                                        <td style={{ padding: '20px 24px', textAlign: 'center' }}>
                                            <div style={{ fontSize: '1.75rem', marginBottom: '4px' }}>{getEmojiCalificacion(enc.calificacion)}</div>
                                            {renderStars(enc.calificacion)}
                                        </td>
                                        <td style={{ padding: '20px 24px', textAlign: 'center' }}>
                                            <span style={{
                                                padding: '6px 14px',
                                                borderRadius: '8px',
                                                fontSize: '0.75rem',
                                                fontWeight: 700,
                                                background: enc.infoClara ? '#D1FAE5' : '#FEE2E2',
                                                color: enc.infoClara ? '#065F46' : '#991B1B'
                                            }}>
                                                {enc.infoClara ? '✓ EXPLICACIÓN CLARA' : '✗ CONFUSO'}
                                            </span>
                                        </td>
                                        <td style={{ padding: '20px 24px', textAlign: 'center' }}>
                                            <span style={{
                                                padding: '6px 14px',
                                                borderRadius: '8px',
                                                fontSize: '0.75rem',
                                                fontWeight: 700,
                                                background: enc.tratoCordial ? '#DBEAFE' : '#FEE2E2',
                                                color: enc.tratoCordial ? '#1E40AF' : '#991B1B'
                                            }}>
                                                {enc.tratoCordial ? '✓ TRATO CORDIAL' : '✗ DESCORTÉS'}
                                            </span>
                                        </td>
                                        <td style={{ padding: '20px 24px', fontSize: '0.875rem', color: '#1E293B', fontWeight: 700 }}>
                                            {enc.tramiteId ? (
                                                <button
                                                    type="button"
                                                    onClick={() => handleOpenDocument(enc.tramiteId)}
                                                    disabled={typeof onOpenDocumentByTramite !== 'function'}
                                                    style={{
                                                        padding: 0,
                                                        border: 'none',
                                                        background: 'transparent',
                                                        fontSize: '0.875rem',
                                                        fontWeight: 700,
                                                        fontFamily: 'inherit',
                                                        color: typeof onOpenDocumentByTramite === 'function' ? '#1D4ED8' : '#1E293B',
                                                        textDecoration: typeof onOpenDocumentByTramite === 'function' ? 'underline' : 'none',
                                                        textUnderlineOffset: '3px',
                                                        cursor: typeof onOpenDocumentByTramite === 'function' ? 'pointer' : 'default'
                                                    }}
                                                    title={typeof onOpenDocumentByTramite === 'function' ? 'Abrir documento relacionado' : ''}
                                                >
                                                    {enc.tramiteId}
                                                </button>
                                            ) : '-'}
                                        </td>
                                        <td style={{ padding: '20px 24px', maxWidth: '350px' }}>
                                            {enc.sugerencia ? (
                                                <div style={{
                                                    background: '#F8FAFC',
                                                    padding: '12px',
                                                    borderRadius: '10px',
                                                    fontSize: '0.875rem',
                                                    color: '#475569',
                                                    lineHeight: '1.5',
                                                    border: '1px solid #F1F5F9'
                                                }}>
                                                    {enc.sugerencia}
                                                </div>
                                            ) : (
                                                <span style={{ color: '#CBD5E1', fontSize: '0.875rem', fontStyle: 'italic' }}>Sin comentarios adicionales</span>
                                            )}
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                )}

                {/* Pagination */}
                {pagination && pagination.totalPages > 1 && (
                    <div style={{
                        display: 'flex',
                        justifyContent: 'space-between',
                        alignItems: 'center',
                        padding: '20px 24px',
                        background: '#F8FAFC',
                        borderTop: '1px solid #E2E8F0'
                    }}>
                        <span style={{ fontSize: '0.875rem', color: '#64748B' }}>
                            Mostrando registros <strong>{((page - 1) * limit) + 1}</strong> al <strong>{Math.min(page * limit, pagination.total)}</strong>
                        </span>
                        <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                            <button
                                onClick={() => setPage(p => Math.max(1, p - 1))}
                                disabled={!pagination.hasPrev}
                                style={{
                                    padding: '8px 16px',
                                    border: '1px solid #E2E8F0',
                                    borderRadius: '10px',
                                    background: pagination.hasPrev ? '#FFFFFF' : '#F1F5F9',
                                    cursor: pagination.hasPrev ? 'pointer' : 'not-allowed',
                                    fontSize: '0.875rem',
                                    fontWeight: 600,
                                    color: '#475569'
                                }}
                            >
                                Anterior
                            </button>
                            <div style={{ padding: '0 12px', fontSize: '0.875rem', color: '#1E293B', fontWeight: 600 }}>
                                {page} / {pagination.totalPages}
                            </div>
                            <button
                                onClick={() => setPage(p => p + 1)}
                                disabled={!pagination.hasNext}
                                style={{
                                    padding: '8px 16px',
                                    border: '1px solid #E2E8F0',
                                    borderRadius: '10px',
                                    background: pagination.hasNext ? '#FFFFFF' : '#F1F5F9',
                                    cursor: pagination.hasNext ? 'pointer' : 'not-allowed',
                                    fontSize: '0.875rem',
                                    fontWeight: 600,
                                    color: '#475569'
                                }}
                            >
                                Siguiente
                            </button>
                        </div>
                    </div>
                )}
            </div>

            <style>{`
                @keyframes spin {
                    from { transform: rotate(0deg); }
                    to { transform: rotate(360deg); }
                }
                tr:hover {
                    background-color: #FAFAFA !important;
                }
            `}</style>
        </div>
    );
};

export default EncuestasSatisfaccion;

