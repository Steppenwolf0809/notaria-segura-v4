import React, { useState, useEffect } from 'react';
import {
  Close as CloseIcon,
  Save as SaveIcon,
  Warning as AlertCircleIcon,
  Description as FileTextIcon,
  Person as UserIcon,
  Phone as PhoneIcon,
  Email as MailIcon,
  AttachMoney as DollarSignIcon
} from '@mui/icons-material';
import './EditDocumentModal.css';

const EditDocumentModal = ({ 
  documento, 
  isOpen, 
  onClose, 
  onSave, 
  userRole = 'matrizador' 
}) => {
  const [formData, setFormData] = useState({
    actoPrincipalDescripcion: '',
    clientName: '',
    clientPhone: '',
    clientEmail: '',
    detalle_documento: '',
    comentarios_recepcion: ''
  });
  
  const [errors, setErrors] = useState({});
  const [isSaving, setIsSaving] = useState(false);
  const [hasChanges, setHasChanges] = useState(false);
  const [initialData, setInitialData] = useState({});

  // Inicializar formulario cuando se abre el modal
  useEffect(() => {
    if (documento && isOpen) {
      const initialFormData = {
        actoPrincipalDescripcion: documento.actoPrincipalDescripcion || '',
        clientName: documento.clientName || '',
        clientPhone: documento.clientPhone || '',
        clientEmail: documento.clientEmail || '',
        detalle_documento: documento.detalle_documento || '',
        comentarios_recepcion: documento.comentarios_recepcion || ''
      };
      
      setFormData(initialFormData);
      setInitialData(initialFormData);
      setErrors({});
      setHasChanges(false);
    }
  }, [documento, isOpen]);

  // Detectar cambios
  useEffect(() => {
    if (Object.keys(initialData).length > 0) {
      const hasDataChanged = Object.keys(formData).some(key => {
        const current = formData[key];
        const initial = initialData[key];
        
        // Para strings, comparar como strings
        return String(current || '').trim() !== String(initial || '').trim();
      });
      
      setHasChanges(hasDataChanged);
    }
  }, [formData, initialData]);

  // Manejar keyboard shortcuts
  useEffect(() => {
    if (!isOpen) return;

    const handleKeyDown = (e) => {
      if (e.key === 'Escape') {
        onClose();
      } else if (e.ctrlKey && e.key === 's') {
        e.preventDefault();
        if (hasChanges && !isSaving) {
          handleSave();
        }
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, hasChanges, isSaving]);

  if (!isOpen) return null;

  // Función para validar y guardar
  const handleSave = async () => {
    const validationErrors = validateForm(formData);
    
    if (Object.keys(validationErrors).length > 0) {
      setErrors(validationErrors);
      return;
    }

    setIsSaving(true);
    
    try {
      await onSave(formData);
      // onSave debe manejar el cierre del modal y mostrar toast de éxito
    } catch (error) {
      // El componente padre maneja los errores
    } finally {
      setIsSaving(false);
    }
  };

  // Función de validación
  const validateForm = (data) => {
    const errors = {};
    
    if (!data.actoPrincipalDescripcion?.trim()) {
      errors.actoPrincipalDescripcion = 'El tipo de acto principal es obligatorio';
    } else if (data.actoPrincipalDescripcion.length < 5) {
      errors.actoPrincipalDescripcion = 'El tipo de acto debe ser más descriptivo (mínimo 5 caracteres)';
    } else if (data.actoPrincipalDescripcion.length > 300) {
      errors.actoPrincipalDescripcion = 'Descripción muy larga (máximo 300 caracteres)';
    }
    
    if (!data.clientName?.trim()) {
      errors.clientName = 'El nombre del compareciente es obligatorio';
    } else if (data.clientName.trim().length < 2) {
      errors.clientName = 'El nombre debe tener al menos 2 caracteres';
    } else if (data.clientName.length > 100) {
      errors.clientName = 'Nombre muy largo (máximo 100 caracteres)';
    }
    


    if (data.clientPhone && !/^[0-9+\-\s]{7,15}$/.test(data.clientPhone)) {
      errors.clientPhone = 'Formato de teléfono inválido (7-15 dígitos)';
    }

    if (data.clientEmail && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(data.clientEmail)) {
      errors.clientEmail = 'Formato de email inválido';
    }

    if (data.detalle_documento && data.detalle_documento.length > 500) {
      errors.detalle_documento = 'Detalle muy largo (máximo 500 caracteres)';
    }

    if (data.comentarios_recepcion && data.comentarios_recepcion.length > 300) {
      errors.comentarios_recepcion = 'Comentarios muy largos (máximo 300 caracteres)';
    }
    
    return errors;
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="edit-modal" onClick={e => e.stopPropagation()}>
        {/* Header del Modal */}
        <div className="modal-header">
          <div className="header-content">
            <FileTextIcon className="header-icon" />
            <div>
              <h2>Editar Información del Documento</h2>
              <p className="document-number">Doc: {documento?.protocolNumber}</p>
            </div>
          </div>
          <button 
            className="close-button" 
            onClick={onClose}
            title="Cerrar (Esc)"
          >
            <CloseIcon />
          </button>
        </div>

        {/* Contenido del Modal */}
        <div className="modal-content">
          
          {/* Sección: Acto Principal */}
          <div className="form-section highlight-section">
            <div className="section-header">
              <FileTextIcon className="section-icon" />
              <h3>📋 Acto Principal</h3>
              <span className="importance-badge">Aparece en mensaje al cliente</span>
            </div>
            
            <div className="form-group">
              <label className="form-label required">
                Tipo de Acto Principal:
              </label>
              <div className="input-wrapper">
                <textarea
                  className={`form-textarea ${errors.actoPrincipalDescripcion ? 'error' : ''}`}
                  value={formData.actoPrincipalDescripcion}
                  onChange={(e) => {
                    setFormData({ ...formData, actoPrincipalDescripcion: e.target.value });
                    if (errors.actoPrincipalDescripcion) {
                      setErrors({ ...errors, actoPrincipalDescripcion: null });
                    }
                  }}
                  placeholder="Ej: RECONOCIMIENTO DE FIRMAS DE VEHÍCULO, ESCRITURA PÚBLICA DE COMPRAVENTA..."
                  rows={3}
                />
                {errors.actoPrincipalDescripcion && (
                  <div className="error-message">
                    <AlertCircleIcon />
                    {errors.actoPrincipalDescripcion}
                  </div>
                )}
              </div>
              <div className="field-hint">
                💡 Este texto aparecerá en la notificación WhatsApp al cliente
              </div>
            </div>


          </div>

          {/* Sección: Información del Cliente */}
          <div className="form-section">
            <div className="section-header">
              <UserIcon className="section-icon" />
              <h3>👤 Información del Cliente</h3>
            </div>
            
            <div className="form-group">
              <label className="form-label required">Nombre Completo:</label>
              <div className="input-wrapper">
                <input
                  type="text"
                  className={`form-input ${errors.clientName ? 'error' : ''}`}
                  value={formData.clientName}
                  onChange={(e) => {
                    setFormData({ ...formData, clientName: e.target.value });
                    if (errors.clientName) {
                      setErrors({ ...errors, clientName: null });
                    }
                  }}
                  placeholder="Nombre completo del compareciente"
                />
                {errors.clientName && (
                  <div className="error-message">
                    <AlertCircleIcon />
                    {errors.clientName}
                  </div>
                )}
              </div>
            </div>

            <div className="form-row">
              <div className="form-group">
                <label className="form-label">Teléfono/WhatsApp:</label>
                <div className="input-wrapper">
                  <div className="input-with-icon">
                    <PhoneIcon className="input-icon" />
                    <input
                      type="tel"
                      className={`form-input ${errors.clientPhone ? 'error' : ''}`}
                      value={formData.clientPhone}
                      onChange={(e) => {
                        setFormData({ ...formData, clientPhone: e.target.value });
                        if (errors.clientPhone) {
                          setErrors({ ...errors, clientPhone: null });
                        }
                      }}
                      placeholder="099-123-4567"
                    />
                  </div>
                  {errors.clientPhone && (
                    <div className="error-message">
                      <AlertCircleIcon />
                      {errors.clientPhone}
                    </div>
                  )}
                </div>
              </div>
              
              <div className="form-group">
                <label className="form-label">Email:</label>
                <div className="input-wrapper">
                  <div className="input-with-icon">
                    <MailIcon className="input-icon" />
                    <input
                      type="email"
                      className={`form-input ${errors.clientEmail ? 'error' : ''}`}
                      value={formData.clientEmail}
                      onChange={(e) => {
                        setFormData({ ...formData, clientEmail: e.target.value });
                        if (errors.clientEmail) {
                          setErrors({ ...errors, clientEmail: null });
                        }
                      }}
                      placeholder="cliente@email.com"
                    />
                  </div>
                  {errors.clientEmail && (
                    <div className="error-message">
                      <AlertCircleIcon />
                      {errors.clientEmail}
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>

          {/* Sección: Detalles Adicionales */}
          <div className="form-section">
            <div className="section-header">
              <h3>📝 Detalles Adicionales</h3>
            </div>
            
            <div className="form-group">
              <label className="form-label">Detalle Específico del Documento:</label>
              <div className="input-wrapper">
                <textarea
                  className={`form-textarea ${errors.detalle_documento ? 'error' : ''}`}
                  value={formData.detalle_documento}
                  onChange={(e) => {
                    setFormData({ ...formData, detalle_documento: e.target.value });
                    if (errors.detalle_documento) {
                      setErrors({ ...errors, detalle_documento: null });
                    }
                  }}
                  placeholder="Información adicional sobre el documento (opcional)"
                  rows={3}
                />
                {errors.detalle_documento && (
                  <div className="error-message">
                    <AlertCircleIcon />
                    {errors.detalle_documento}
                  </div>
                )}
              </div>
            </div>

            <div className="form-group">
              <label className="form-label">Comentarios para Recepción:</label>
              <div className="input-wrapper">
                <textarea
                  className={`form-textarea ${errors.comentarios_recepcion ? 'error' : ''}`}
                  value={formData.comentarios_recepcion}
                  onChange={(e) => {
                    setFormData({ ...formData, comentarios_recepcion: e.target.value });
                    if (errors.comentarios_recepcion) {
                      setErrors({ ...errors, comentarios_recepcion: null });
                    }
                  }}
                  placeholder="Instrucciones especiales para la entrega (opcional)"
                  rows={2}
                />
                {errors.comentarios_recepcion && (
                  <div className="error-message">
                    <AlertCircleIcon />
                    {errors.comentarios_recepcion}
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* Footer del Modal */}
        <div className="modal-footer">
          <div className="footer-info">
            {hasChanges && (
              <div className="changes-indicator">
                <AlertCircleIcon />
                Hay cambios sin guardar
              </div>
            )}
          </div>
          
          <div className="footer-actions">
            <button 
              className="btn-secondary" 
              onClick={onClose}
              disabled={isSaving}
              title="Cancelar cambios (Esc)"
            >
              Cancelar
            </button>
            
            <button 
              className={`btn-primary ${!hasChanges ? 'disabled' : ''} ${isSaving ? 'loading' : ''}`}
              onClick={handleSave}
              disabled={!hasChanges || isSaving}
              title="Guardar cambios (Ctrl+S)"
            >
              {isSaving ? (
                <>
                  <div className="spinner"></div>
                  Guardando...
                </>
              ) : (
                <>
                  <SaveIcon />
                  Guardar Cambios
                </>
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default EditDocumentModal;