import React, { useState } from 'react';
import {
    Dialog,
    DialogTitle,
    DialogContent,
    DialogActions,
    Button,
    TextField,
    Grid,
    Typography,
    MenuItem,
    CircularProgress,
    InputAdornment,
    IconButton
} from '@mui/material';
import { Search as SearchIcon } from '@mui/icons-material';
import apiClient from '../services/api-client';

const ModalDatosRepresentado = ({ open, onClose, onConfirm }) => {
    const [loading, setLoading] = useState(false);
    const [buscando, setBuscando] = useState(false);
    const [identificacion, setIdentificacion] = useState('');

    // Datos del formulairo
    const [formData, setFormData] = useState({
        identificacion: '',
        tipoIdentificacion: 'CEDULA',
        nombres: '',
        apellidos: '',
        razonSocial: '', // Para jurídica
        nacionalidad: 'ECUATORIANA',
        tipoPersona: 'NATURAL'
    });

    const handleChange = (field, value) => {
        setFormData(prev => ({ ...prev, [field]: value }));
    };

    const handleSearch = async () => {
        if (!formData.identificacion) return;

        setBuscando(true);
        try {
            // Usamos el endpoint existente de búsqueda de personas
            // Si no existe, usamos uno de registro civil o mock
            const response = await apiClient.get(`/formulario-uafe/buscar-representado/${formData.identificacion}`);

            if (response.data.success && response.data.encontrado) {
                const p = response.data.data;

                if (p.tipoPersona === 'NATURAL') {
                    // Mapeo inteligente de datos
                    let nombres = '';
                    let apellidos = '';
                    if (p.datosCompletos?.datosPersonales) {
                        nombres = p.datosCompletos.datosPersonales.nombres || '';
                        apellidos = p.datosCompletos.datosPersonales.apellidos || '';
                    } else if (p.nombreCompleto) {
                        // Intentar split básico si no hay estructurado
                        const parts = p.nombreCompleto.split(' ');
                        if (parts.length >= 2) {
                            apellidos = `${parts[0]} ${parts[1]}`;
                            nombres = parts.slice(2).join(' ');
                        } else {
                            nombres = p.nombreCompleto;
                        }
                    }

                    setFormData(prev => ({
                        ...prev,
                        tipoPersona: 'NATURAL',
                        nombres,
                        apellidos,
                        razonSocial: '',
                        representadoId: p.numeroIdentificacion // ID para vincular si ya existe
                    }));
                } else {
                    setFormData(prev => ({
                        ...prev,
                        tipoPersona: 'JURIDICA',
                        razonSocial: p.nombreCompleto || '',
                        nombres: '',
                        apellidos: '',
                        representadoId: p.numeroIdentificacion
                    }));
                }
            } else {
                // No encontrado, permitir ingreso manual
                // Limpiar ID vinculado
                setFormData(prev => ({ ...prev, representadoId: null }));
            }
        } catch (error) {
            console.error("Error buscando representado", error);
        } finally {
            setBuscando(false);
        }
    };

    const handleSubmit = () => {
        // Validaciones básicas
        if (!formData.identificacion) return;
        if (formData.tipoPersona === 'NATURAL' && (!formData.nombres || !formData.apellidos)) return;
        if (formData.tipoPersona === 'JURIDICA' && !formData.razonSocial) return;

        onConfirm({
            representadoId: formData.representadoId || null,
            datosRepresentado: {
                tipoIdentificacion: formData.tipoIdentificacion,
                identificacion: formData.identificacion,
                nombres: formData.nombres,
                apellidos: formData.apellidos,
                razonSocial: formData.razonSocial,
                nacionalidad: formData.nacionalidad,
                tipoPersona: formData.tipoPersona
            }
        });
    };

    return (
        <Dialog open={open} onClose={onClose} maxWidth="sm" fullWidth>
            <DialogTitle>Datos del Representado</DialogTitle>
            <DialogContent dividers>
                <Grid container spacing={2}>
                    <Grid item xs={12}>
                        <Typography variant="body2" color="text.secondary" gutterBottom>
                            Ingrese la identificación de la persona o empresa representada.
                        </Typography>
                    </Grid>

                    <Grid item xs={12} sm={6}>
                        <TextField
                            select
                            fullWidth
                            label="Tipo Persona"
                            value={formData.tipoPersona}
                            onChange={(e) => handleChange('tipoPersona', e.target.value)}
                            size="small"
                        >
                            <MenuItem value="NATURAL">Persona Natural</MenuItem>
                            <MenuItem value="JURIDICA">Persona Jurídica</MenuItem>
                        </TextField>
                    </Grid>

                    <Grid item xs={12} sm={6}>
                        <TextField
                            fullWidth
                            label="Identificación (Cédula/RUC)"
                            value={formData.identificacion}
                            onChange={(e) => handleChange('identificacion', e.target.value)}
                            size="small"
                            InputProps={{
                                endAdornment: (
                                    <InputAdornment position="end">
                                        <IconButton onClick={handleSearch} edge="end" disabled={buscando}>
                                            {buscando ? <CircularProgress size={20} /> : <SearchIcon />}
                                        </IconButton>
                                    </InputAdornment>
                                ),
                            }}
                        />
                    </Grid>

                    {formData.tipoPersona === 'NATURAL' ? (
                        <>
                            <Grid item xs={12} sm={6}>
                                <TextField
                                    fullWidth
                                    label="Nombres"
                                    value={formData.nombres}
                                    onChange={(e) => handleChange('nombres', e.target.value)}
                                    size="small"
                                />
                            </Grid>
                            <Grid item xs={12} sm={6}>
                                <TextField
                                    fullWidth
                                    label="Apellidos"
                                    value={formData.apellidos}
                                    onChange={(e) => handleChange('apellidos', e.target.value)}
                                    size="small"
                                />
                            </Grid>
                        </>
                    ) : (
                        <Grid item xs={12}>
                            <TextField
                                fullWidth
                                label="Razón Social"
                                value={formData.razonSocial}
                                onChange={(e) => handleChange('razonSocial', e.target.value)}
                                size="small"
                            />
                        </Grid>
                    )}

                    <Grid item xs={12} sm={6}>
                        <TextField
                            fullWidth
                            label="Nacionalidad"
                            value={formData.nacionalidad}
                            onChange={(e) => handleChange('nacionalidad', e.target.value)}
                            size="small"
                        />
                    </Grid>
                </Grid>
            </DialogContent>
            <DialogActions>
                <Button onClick={onClose}>Cancelar</Button>
                <Button onClick={handleSubmit} variant="contained" color="primary">
                    Guardar Representado
                </Button>
            </DialogActions>
        </Dialog>
    );
};

export default ModalDatosRepresentado;
