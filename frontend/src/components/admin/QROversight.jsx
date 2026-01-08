import React, { useState, useEffect } from 'react';
import {
    Box,
    Typography,
    Grid,
    Card,
    CardContent,
    LinearProgress,
    Table,
    TableBody,
    TableCell,
    TableContainer,
    TableHead,
    TableRow,
    Paper,
    CircularProgress,
    Alert,
    Divider,
    Chip
} from '@mui/material';
import {
    QrCode as QrCodeIcon,
    EmojiEvents as TrophyIcon,
    Timeline as TimelineIcon,
    History as HistoryIcon
} from '@mui/icons-material';
import { getSupervisionStats } from '../../services/admin-supervision-service';
import { getEscrituras } from '../../services/escrituras-qr-service';

const QROversight = () => {
    const [stats, setStats] = useState(null);
    const [recentQRs, setRecentQRs] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);

    useEffect(() => {
        loadData();
    }, []);

    const loadData = async () => {
        try {
            setLoading(true);
            // Obtener stats del dashboard (que ahora incluye qrStats)
            const dashData = await getSupervisionStats({ limit: 1 });
            setStats(dashData.kpis?.qrStats || { totalMonthly: 0, limit: 50, byMatrixer: [] });

            // Obtener escrituras recientes
            const qrData = await getEscrituras({ limit: 10 });
            // La respuesta viene como { success: true, data: { data: [...], meta: ... } }
            // O a veces directamente data si el servicio lo maneja distinto, pero sendPaginated usa data.data
            setRecentQRs(qrData.data?.data || qrData.data || []);

            setError(null);
        } catch (err) {
            console.error('Error cargando datos de QR:', err);
            setError('No se pudieron cargar las estadísticas de QR.');
        } finally {
            setLoading(false);
        }
    };

    if (loading) {
        return (
            <Box sx={{ display: 'flex', justifyContent: 'center', p: 4 }}>
                <CircularProgress />
            </Box>
        );
    }

    if (error) {
        return <Alert severity="error" sx={{ m: 2 }}>{error}</Alert>;
    }

    const { totalMonthly = 0, limit = 50, byMatrixer = [] } = stats || {};
    const progress = Math.min((totalMonthly / limit) * 100, 100);

    return (
        <Box>
            <Box sx={{ display: 'flex', alignItems: 'center', mb: 3 }}>
                <QrCodeIcon sx={{ mr: 1, fontSize: 32, color: 'primary.main' }} />
                <Typography variant="h5" fontWeight="bold">Gestión de Códigos QR</Typography>
            </Box>

            <Grid container spacing={3}>
                {/* Cuota Mensual */}
                <Grid item xs={12} md={6}>
                    <Card elevation={0} sx={{ border: '1px solid', borderColor: 'divider', height: '100%', borderRadius: 3 }}>
                        <CardContent>
                            <Typography variant="subtitle1" fontWeight="600" gutterBottom sx={{ display: 'flex', alignItems: 'center' }}>
                                <TimelineIcon sx={{ mr: 1, color: 'primary.main' }} /> Uso Mensual (Cuota)
                            </Typography>
                            <Box sx={{ mt: 3, mb: 1 }}>
                                <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 1 }}>
                                    <Typography variant="h4" fontWeight="bold">{totalMonthly}</Typography>
                                    <Typography variant="body2" color="text.secondary" sx={{ alignSelf: 'flex-end' }}>
                                        Límite: {limit} / mes
                                    </Typography>
                                </Box>
                                <LinearProgress
                                    variant="determinate"
                                    value={progress}
                                    sx={{ height: 10, borderRadius: 5 }}
                                    color={progress > 90 ? 'error' : progress > 70 ? 'warning' : 'primary'}
                                />
                            </Box>
                            <Typography variant="caption" color="text.secondary">
                                Se han generado {totalMonthly} códigos QR de los {limit} permitidos para este mes.
                            </Typography>
                        </CardContent>
                    </Card>
                </Grid>

                {/* Top Matrizadores QR */}
                <Grid item xs={12} md={6}>
                    <Card elevation={0} sx={{ border: '1px solid', borderColor: 'divider', height: '100%', borderRadius: 3 }}>
                        <CardContent>
                            <Typography variant="subtitle1" fontWeight="600" gutterBottom sx={{ display: 'flex', alignItems: 'center' }}>
                                <TrophyIcon sx={{ mr: 1, color: 'warning.main' }} /> QR por Matrizador (Mes)
                            </Typography>
                            <Box sx={{ mt: 2 }}>
                                {byMatrixer.length > 0 ? (
                                    byMatrixer.sort((a, b) => b.count - a.count).map((m, index) => (
                                        <Box key={m.matrixerId} sx={{ display: 'flex', alignItems: 'center', mb: 1.5 }}>
                                            <Typography variant="body2" sx={{ width: 30, fontWeight: 'bold', color: 'text.secondary' }}>
                                                #{index + 1}
                                            </Typography>
                                            <Box sx={{ flex: 1 }}>
                                                <Typography variant="body2">{m.name}</Typography>
                                                <LinearProgress
                                                    variant="determinate"
                                                    value={(m.count / Math.max(...byMatrixer.map(x => x.count))) * 100}
                                                    sx={{ height: 4, borderRadius: 2, mt: 0.5 }}
                                                />
                                            </Box>
                                            <Typography variant="body2" fontWeight="bold" sx={{ ml: 2 }}>
                                                {m.count}
                                            </Typography>
                                        </Box>
                                    ))
                                ) : (
                                    <Typography variant="body2" color="text.secondary" sx={{ fontStyle: 'italic', textAlign: 'center', py: 2 }}>
                                        No hay QRs generados este mes.
                                    </Typography>
                                )}
                            </Box>
                        </CardContent>
                    </Card>
                </Grid>

                {/* Historial Reciente */}
                <Grid item xs={12}>
                    <Card elevation={0} sx={{ border: '1px solid', borderColor: 'divider', borderRadius: 3 }}>
                        <CardContent>
                            <Typography variant="subtitle1" fontWeight="600" gutterBottom sx={{ display: 'flex', alignItems: 'center' }}>
                                <HistoryIcon sx={{ mr: 1, color: 'info.main' }} /> Escrituras QR Recientes
                            </Typography>
                            <TableContainer component={Box} sx={{ mt: 2 }}>
                                <Table size="small">
                                    <TableHead>
                                        <TableRow>
                                            <TableCell>Token</TableCell>
                                            <TableCell>N° Escritura</TableCell>
                                            <TableCell>Fecha</TableCell>
                                            <TableCell>Matrizador</TableCell>
                                            <TableCell>Estado</TableCell>
                                            <TableCell align="right">Vistas</TableCell>
                                        </TableRow>
                                    </TableHead>
                                    <TableBody>
                                        {recentQRs.length > 0 ? (
                                            recentQRs.map((qr) => (
                                                <TableRow key={qr.id} hover>
                                                    <TableCell sx={{ fontFamily: 'monospace', fontWeight: 'bold' }}>{qr.token}</TableCell>
                                                    <TableCell>{qr.numeroEscritura || 'N/A'}</TableCell>
                                                    <TableCell>{new Date(qr.createdAt).toLocaleDateString()}</TableCell>
                                                    <TableCell>
                                                        {qr.creador ? `${qr.creador.firstName} ${qr.creador.lastName}` : 'N/A'}
                                                    </TableCell>
                                                    <TableCell>
                                                        <Chip
                                                            label={qr.estado?.toUpperCase()}
                                                            size="small"
                                                            color={qr.estado === 'activo' ? 'success' : 'default'}
                                                            variant="outlined"
                                                        />
                                                    </TableCell>
                                                    <TableCell align="right">{qr.pdfViewCount || 0}</TableCell>
                                                </TableRow>
                                            ))
                                        ) : (
                                            <TableRow>
                                                <TableCell colSpan={6} align="center">No hay registros recientes.</TableCell>
                                            </TableRow>
                                        )}
                                    </TableBody>
                                </Table>
                            </TableContainer>
                        </CardContent>
                    </Card>
                </Grid>
            </Grid>
        </Box>
    );
};

export default QROversight;
