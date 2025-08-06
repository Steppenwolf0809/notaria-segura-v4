import React, { useState, useEffect, useCallback } from 'react';
import {
  Box,
  Card,
  CardContent,
  Typography,
  Button,
  TextField,
  InputAdornment,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  TablePagination,
  Paper,
  Avatar,
  Chip,
  IconButton,
  Switch,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Tooltip,
  Alert,
  Skeleton,
  Grid,
  Divider
} from '@mui/material';
import {
  Search as SearchIcon,
  Add as AddIcon,
  Edit as EditIcon,
  Delete as DeleteIcon,
  Refresh as RefreshIcon,
  Person as PersonIcon,
  FilterList as FilterIcon,
  TrendingUp as StatsIcon
} from '@mui/icons-material';
import { toast } from 'react-toastify';
import adminService from '../../services/admin-service';
import useAuthStore from '../../store/auth-store';
import UserFormModal from './UserFormModal';
import ConfirmDialog from './ConfirmDialog';
import { useDebounce } from '../../hooks/useDebounce';

/**
 * Componente principal de gestión de usuarios para administradores
 * Incluye tabla, filtros, búsqueda, creación, edición y eliminación
 */
const UserManagement = () => {
  const { token, user: currentUser } = useAuthStore();

  // Estado de datos
  const [users, setUsers] = useState([]);
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // Estado de paginación y filtros
  const [page, setPage] = useState(0);
  const [rowsPerPage, setRowsPerPage] = useState(10);
  const [totalCount, setTotalCount] = useState(0);
  const [search, setSearch] = useState('');
  const [roleFilter, setRoleFilter] = useState('');
  const [statusFilter, setStatusFilter] = useState('');

  // Estado de modales
  const [showUserForm, setShowUserForm] = useState(false);
  const [selectedUser, setSelectedUser] = useState(null);
  const [confirmDialog, setConfirmDialog] = useState({
    open: false,
    type: 'warning',
    title: '',
    message: '',
    details: null,
    action: null
  });

  // Debounce para búsqueda
  const debouncedSearch = useDebounce(search, 500);

  /**
   * Cargar usuarios con filtros y paginación
   */
  const loadUsers = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);

      const params = {
        page: page + 1,
        limit: rowsPerPage,
        search: debouncedSearch || undefined,
        role: roleFilter || undefined,
        status: statusFilter !== '' ? statusFilter : undefined
      };

      const response = await adminService.getUsers(params, token);
      
      if (response.success) {
        setUsers(response.data.users.map(adminService.formatUser));
        setTotalCount(response.data.pagination.totalCount);
      }
    } catch (error) {
      console.error('Error cargando usuarios:', error);
      setError(error.message || 'Error al cargar los usuarios');
      toast.error('Error al cargar los usuarios');
    } finally {
      setLoading(false);
    }
  }, [page, rowsPerPage, debouncedSearch, roleFilter, statusFilter, token]);

  /**
   * Cargar estadísticas de usuarios
   */
  const loadStats = useCallback(async () => {
    try {
      const response = await adminService.getUserStats(token);
      if (response.success) {
        setStats(response.data);
      }
    } catch (error) {
      console.error('Error cargando estadísticas:', error);
    }
  }, [token]);

  // Cargar datos iniciales
  useEffect(() => {
    loadUsers();
  }, [loadUsers]);

  useEffect(() => {
    loadStats();
  }, [loadStats]);

  /**
   * Manejar cambio de página
   */
  const handleChangePage = (event, newPage) => {
    setPage(newPage);
  };

  /**
   * Manejar cambio de filas por página
   */
  const handleChangeRowsPerPage = (event) => {
    setRowsPerPage(parseInt(event.target.value, 10));
    setPage(0);
  };

  /**
   * Abrir modal de creación de usuario
   */
  const handleCreateUser = () => {
    setSelectedUser(null);
    setShowUserForm(true);
  };

  /**
   * Abrir modal de edición de usuario
   */
  const handleEditUser = (user) => {
    setSelectedUser(user);
    setShowUserForm(true);
  };

  /**
   * Manejar usuario guardado (crear/editar)
   */
  const handleUserSaved = (savedUser) => {
    loadUsers();
    loadStats();
  };

  /**
   * Cambiar estado de usuario (activar/desactivar)
   */
  const handleToggleUserStatus = async (user) => {
    const newStatus = !user.isActive;
    const action = newStatus ? 'activar' : 'desactivar';

    // Prevenir desactivación del propio admin
    if (user.id === currentUser.id && !newStatus) {
      toast.error('No puedes desactivar tu propia cuenta');
      return;
    }

    setConfirmDialog({
      open: true,
      type: newStatus ? 'success' : 'warning',
      title: `${action.charAt(0).toUpperCase() + action.slice(1)} Usuario`,
      message: `¿Estás seguro de que quieres ${action} al usuario ${user.fullName}?`,
      details: {
        Email: user.email,
        Rol: user.role,
        'Estado Actual': user.statusText,
        'Nuevo Estado': newStatus ? 'Activo' : 'Inactivo'
      },
      confirmText: action.charAt(0).toUpperCase() + action.slice(1),
      action: async () => {
        try {
          const response = await adminService.toggleUserStatus(user.id, newStatus, token);
          
          if (response.success) {
            toast.success(`Usuario ${action}do exitosamente`);
            loadUsers();
            loadStats();
          }
        } catch (error) {
          console.error(`Error al ${action} usuario:`, error);
          toast.error(error.message || `Error al ${action} el usuario`);
        }
      }
    });
  };

  /**
   * Eliminar usuario
   */
  const handleDeleteUser = (user) => {
    // Prevenir eliminación del propio admin
    if (user.id === currentUser.id) {
      toast.error('No puedes eliminar tu propia cuenta');
      return;
    }

    setConfirmDialog({
      open: true,
      type: 'error',
      title: 'Eliminar Usuario',
      message: `¿Estás seguro de que quieres eliminar al usuario ${user.fullName}?`,
      details: {
        Email: user.email,
        Rol: user.role,
        Estado: user.statusText,
        'Fecha Creación': user.createdAtFormatted
      },
      confirmText: 'Eliminar',
      action: async () => {
        try {
          const response = await adminService.deleteUser(user.id, token);
          
          if (response.success) {
            toast.success('Usuario eliminado exitosamente');
            loadUsers();
            loadStats();
          }
        } catch (error) {
          console.error('Error eliminando usuario:', error);
          toast.error(error.message || 'Error al eliminar el usuario');
        }
      }
    });
  };

  /**
   * Cerrar modal de confirmación
   */
  const handleCloseConfirmDialog = () => {
    setConfirmDialog(prev => ({ ...prev, open: false }));
  };

  /**
   * Ejecutar acción confirmada
   */
  const handleConfirmAction = async () => {
    if (confirmDialog.action) {
      await confirmDialog.action();
    }
    handleCloseConfirmDialog();
  };

  /**
   * Obtener color del rol
   */
  const getRoleColor = (role) => {
    const roleOption = adminService.getRoleOptions().find(r => r.value === role);
    return roleOption?.color || '#6b7280';
  };

  /**
   * Renderizar estadísticas
   */
  const renderStats = () => {
    if (!stats) return null;

    return (
      <Grid container spacing={3} sx={{ mb: 3 }}>
        <Grid item xs={12} sm={6} md={3}>
          <Card>
            <CardContent sx={{ textAlign: 'center' }}>
              <Typography variant="h4" color="primary">
                {stats.totalUsers}
              </Typography>
              <Typography variant="body2" color="text.secondary">
                Total Usuarios
              </Typography>
            </CardContent>
          </Card>
        </Grid>
        <Grid item xs={12} sm={6} md={3}>
          <Card>
            <CardContent sx={{ textAlign: 'center' }}>
              <Typography variant="h4" color="success.main">
                {stats.activeUsers}
              </Typography>
              <Typography variant="body2" color="text.secondary">
                Usuarios Activos
              </Typography>
            </CardContent>
          </Card>
        </Grid>
        <Grid item xs={12} sm={6} md={3}>
          <Card>
            <CardContent sx={{ textAlign: 'center' }}>
              <Typography variant="h4" color="warning.main">
                {stats.inactiveUsers}
              </Typography>
              <Typography variant="body2" color="text.secondary">
                Usuarios Inactivos
              </Typography>
            </CardContent>
          </Card>
        </Grid>
        <Grid item xs={12} sm={6} md={3}>
          <Card>
            <CardContent sx={{ textAlign: 'center' }}>
              <Typography variant="h4" color="info.main">
                {Object.keys(stats.roleStats).length}
              </Typography>
              <Typography variant="body2" color="text.secondary">
                Roles Diferentes
              </Typography>
            </CardContent>
          </Card>
        </Grid>
      </Grid>
    );
  };

  const roleOptions = adminService.getRoleOptions();

  return (
    <Box>
      {/* Header */}
      <Box sx={{ display: 'flex', alignItems: 'center', mb: 3 }}>
        <PersonIcon sx={{ fontSize: 32, color: 'primary.main', mr: 2 }} />
        <Typography variant="h4" component="h1" sx={{ flexGrow: 1 }}>
          Gestión de Usuarios
        </Typography>
        <Button
          variant="contained"
          startIcon={<AddIcon />}
          onClick={handleCreateUser}
          sx={{ ml: 2 }}
        >
          Crear Usuario
        </Button>
      </Box>

      {/* Estadísticas */}
      {renderStats()}

      {/* Filtros y búsqueda */}
      <Card sx={{ mb: 3 }}>
        <CardContent>
          <Grid container spacing={2} alignItems="center">
            <Grid item xs={12} md={4}>
              <TextField
                fullWidth
                placeholder="Buscar por nombre, apellido o email..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                InputProps={{
                  startAdornment: (
                    <InputAdornment position="start">
                      <SearchIcon color="action" />
                    </InputAdornment>
                  )
                }}
              />
            </Grid>
            <Grid item xs={12} md={3}>
              <FormControl fullWidth>
                <InputLabel>Filtrar por Rol</InputLabel>
                <Select
                  value={roleFilter}
                  onChange={(e) => setRoleFilter(e.target.value)}
                  startAdornment={
                    <InputAdornment position="start">
                      <FilterIcon color="action" />
                    </InputAdornment>
                  }
                >
                  <MenuItem value="">Todos los roles</MenuItem>
                  {roleOptions.map((role) => (
                    <MenuItem key={role.value} value={role.value}>
                      {role.label}
                    </MenuItem>
                  ))}
                </Select>
              </FormControl>
            </Grid>
            <Grid item xs={12} md={3}>
              <FormControl fullWidth>
                <InputLabel>Estado</InputLabel>
                <Select
                  value={statusFilter}
                  onChange={(e) => setStatusFilter(e.target.value)}
                >
                  <MenuItem value="">Todos</MenuItem>
                  <MenuItem value="true">Activos</MenuItem>
                  <MenuItem value="false">Inactivos</MenuItem>
                </Select>
              </FormControl>
            </Grid>
            <Grid item xs={12} md={2}>
              <Button
                fullWidth
                variant="outlined"
                startIcon={<RefreshIcon />}
                onClick={loadUsers}
                disabled={loading}
              >
                Actualizar
              </Button>
            </Grid>
          </Grid>
        </CardContent>
      </Card>

      {/* Error */}
      {error && (
        <Alert severity="error" sx={{ mb: 3 }}>
          {error}
        </Alert>
      )}

      {/* Tabla de usuarios */}
      <Card>
        <TableContainer>
          <Table>
            <TableHead>
              <TableRow>
                <TableCell>Usuario</TableCell>
                <TableCell>Email</TableCell>
                <TableCell>Rol</TableCell>
                <TableCell align="center">Estado</TableCell>
                <TableCell>Creado</TableCell>
                <TableCell>Último Login</TableCell>
                <TableCell align="center">Acciones</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {loading ? (
                // Skeleton loading
                Array.from(new Array(rowsPerPage)).map((_, index) => (
                  <TableRow key={index}>
                    <TableCell>
                      <Box sx={{ display: 'flex', alignItems: 'center' }}>
                        <Skeleton variant="circular" width={40} height={40} sx={{ mr: 2 }} />
                        <Skeleton variant="text" width={120} />
                      </Box>
                    </TableCell>
                    <TableCell><Skeleton variant="text" width={180} /></TableCell>
                    <TableCell><Skeleton variant="rectangular" width={80} height={24} /></TableCell>
                    <TableCell><Skeleton variant="rectangular" width={60} height={24} /></TableCell>
                    <TableCell><Skeleton variant="text" width={100} /></TableCell>
                    <TableCell><Skeleton variant="text" width={100} /></TableCell>
                    <TableCell>
                      <Box sx={{ display: 'flex', gap: 1 }}>
                        <Skeleton variant="circular" width={32} height={32} />
                        <Skeleton variant="circular" width={32} height={32} />
                      </Box>
                    </TableCell>
                  </TableRow>
                ))
              ) : users.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={7} align="center" sx={{ py: 4 }}>
                    <Typography variant="body2" color="text.secondary">
                      No se encontraron usuarios
                    </Typography>
                  </TableCell>
                </TableRow>
              ) : (
                users.map((user) => (
                  <TableRow key={user.id} hover>
                    <TableCell>
                      <Box sx={{ display: 'flex', alignItems: 'center' }}>
                        <Avatar
                          sx={{
                            bgcolor: getRoleColor(user.role),
                            width: 40,
                            height: 40,
                            mr: 2,
                            fontSize: '0.875rem'
                          }}
                        >
                          {user.firstName.charAt(0)}{user.lastName.charAt(0)}
                        </Avatar>
                        <Box>
                          <Typography variant="body2" fontWeight="medium">
                            {user.fullName}
                          </Typography>
                          <Typography variant="caption" color="text.secondary">
                            ID: {user.id}
                          </Typography>
                        </Box>
                      </Box>
                    </TableCell>
                    <TableCell>
                      <Typography variant="body2">
                        {user.email}
                      </Typography>
                    </TableCell>
                    <TableCell>
                      <Chip
                        label={user.role}
                        size="small"
                        sx={{
                          bgcolor: getRoleColor(user.role),
                          color: 'white',
                          fontWeight: 'medium'
                        }}
                      />
                    </TableCell>
                    <TableCell align="center">
                      <Tooltip title={`${user.isActive ? 'Desactivar' : 'Activar'} usuario`}>
                        <Switch
                          checked={user.isActive}
                          onChange={() => handleToggleUserStatus(user)}
                          color="success"
                          disabled={user.id === currentUser.id} // No puede desactivarse a sí mismo
                        />
                      </Tooltip>
                    </TableCell>
                    <TableCell>
                      <Typography variant="body2">
                        {user.createdAtFormatted}
                      </Typography>
                    </TableCell>
                    <TableCell>
                      <Typography variant="body2">
                        {user.lastLoginFormatted}
                      </Typography>
                    </TableCell>
                    <TableCell align="center">
                      <Box sx={{ display: 'flex', gap: 0.5 }}>
                        <Tooltip title="Editar usuario">
                          <IconButton
                            size="small"
                            onClick={() => handleEditUser(user)}
                            color="primary"
                          >
                            <EditIcon fontSize="small" />
                          </IconButton>
                        </Tooltip>
                        <Tooltip title="Eliminar usuario">
                          <IconButton
                            size="small"
                            onClick={() => handleDeleteUser(user)}
                            color="error"
                            disabled={user.id === currentUser.id} // No puede eliminarse a sí mismo
                          >
                            <DeleteIcon fontSize="small" />
                          </IconButton>
                        </Tooltip>
                      </Box>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </TableContainer>

        {/* Paginación */}
        <TablePagination
          component="div"
          count={totalCount}
          page={page}
          onPageChange={handleChangePage}
          rowsPerPage={rowsPerPage}
          onRowsPerPageChange={handleChangeRowsPerPage}
          labelRowsPerPage="Filas por página:"
          labelDisplayedRows={({ from, to, count }) => 
            `${from}-${to} de ${count !== -1 ? count : `más de ${to}`}`
          }
        />
      </Card>

      {/* Modal de formulario de usuario */}
      <UserFormModal
        open={showUserForm}
        onClose={() => setShowUserForm(false)}
        user={selectedUser}
        onUserSaved={handleUserSaved}
      />

      {/* Modal de confirmación */}
      <ConfirmDialog
        open={confirmDialog.open}
        onClose={handleCloseConfirmDialog}
        onConfirm={handleConfirmAction}
        title={confirmDialog.title}
        message={confirmDialog.message}
        details={confirmDialog.details}
        type={confirmDialog.type}
        confirmText={confirmDialog.confirmText}
      />
    </Box>
  );
};

export default UserManagement;