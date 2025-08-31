import React, { useState } from 'react';
import { Dialog, DialogTitle, DialogContent, DialogActions, Button, TextField, Grid } from '@mui/material';

const DeliverModal = ({ open, onClose, role, onConfirm }) => {
  const [form, setForm] = useState({
    verificationCode: '',
    receiverName: '',
    receiverIdNumber: '',
    receiverRelation: '',
    deliveryNotes: ''
  });
  const set = (k, v) => setForm((f) => ({ ...f, [k]: v }));

  const handleConfirm = () => {
    // Validations per role
    if (role === 'RECEPCION') {
      if (!form.verificationCode || !form.receiverName || !form.receiverIdNumber || !form.receiverRelation) return;
    } else {
      if (!form.receiverName) return;
    }
    onConfirm?.(form);
  };

  const recepcion = role === 'RECEPCION';

  return (
    <Dialog open={open} onClose={onClose} fullWidth maxWidth="sm">
      <DialogTitle>Entregar documento</DialogTitle>
      <DialogContent>
        <Grid container spacing={2} sx={{ mt: 0.5 }}>
          {recepcion && (
            <Grid item xs={12} sm={6}>
              <TextField label="Código verificación" value={form.verificationCode} onChange={(e) => set('verificationCode', e.target.value)} fullWidth />
            </Grid>
          )}
          <Grid item xs={12} sm={recepcion ? 6 : 12}>
            <TextField label="Nombre de quien retira" value={form.receiverName} onChange={(e) => set('receiverName', e.target.value)} fullWidth />
          </Grid>
          {recepcion && (
            <>
              <Grid item xs={12} sm={6}>
                <TextField label="Cédula" value={form.receiverIdNumber} onChange={(e) => set('receiverIdNumber', e.target.value)} fullWidth />
              </Grid>
              <Grid item xs={12} sm={6}>
                <TextField label="Relación" value={form.receiverRelation} onChange={(e) => set('receiverRelation', e.target.value)} fullWidth />
              </Grid>
              <Grid item xs={12}>
                <TextField label="Observaciones" value={form.deliveryNotes} onChange={(e) => set('deliveryNotes', e.target.value)} fullWidth multiline rows={2} />
              </Grid>
            </>
          )}
        </Grid>
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose}>Cancelar</Button>
        <Button variant="contained" onClick={handleConfirm}>Confirmar entrega</Button>
      </DialogActions>
    </Dialog>
  );
};

export default DeliverModal;

