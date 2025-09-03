import React, { useState } from 'react';
import {
  Box,
  Card,
  CardContent,
  Typography,
  Grid,
  Alert,
  Chip
} from '@mui/material';
import {
  Person as PersonIcon,
  Dashboard as DashboardIcon,
  Settings as SettingsIcon,
  Assessment as StatsIcon,
  Assignment as DocumentIcon,
  Security as SecurityIcon
} from '@mui/icons-material';
import useAuth from '../hooks/use-auth';
import AdminLayout from './AdminLayout';
import UserManagement from './admin/UserManagement';
import DocumentOversight from './admin/DocumentOversight';
import NotificationHistory from './admin/NotificationHistory';
import NotificationSettings from './admin/NotificationSettings';
import NotificationTemplates from './admin/NotificationTemplates';
import WhatsAppTemplates from './admin/WhatsAppTemplates';
import AdminSettings from './admin/AdminSettings';
import AdminDashboardMain from './admin/dashboards/AdminDashboardMain.jsx';

/**
 * Centro de administración - Panel principal para ADMIN
 * Ahora usando AdminLayout con sidebar como otros roles
 */
const AdminCenter = () => {
  const [currentView, setCurrentView] = useState('dashboard');

  /**
   * Manejar cambios de vista
   */
  const handleViewChange = (view) => {
    setCurrentView(view);
  };

  /**
   * Renderizar contenido según la vista actual
   */
  const handleDrillDown = (queryString) => {
    if (queryString) {
      const qs = queryString.startsWith('?') ? queryString : `?${queryString}`;
      try { window.history.replaceState(null, '', qs); } catch {}
    }
    setCurrentView('documents');
  };

  const renderContent = () => {
    switch (currentView) {
      case 'dashboard':
        return <AdminDashboard onDrillDown={handleDrillDown} />;
      
      case 'users':
        return <UserManagement />;
      
      case 'documents':
        return <DocumentOversight />;
      
      case 'notifications':
        return <NotificationHistory />;
      
      case 'notification-templates':
        return <NotificationTemplates />;
      
      case 'whatsapp-templates':
        return <WhatsAppTemplates />;
      
      case 'settings':
        return <AdminSettings />;
      
      default:
        return <AdminDashboard />;
    }
  };

  return (
    <AdminLayout currentView={currentView} onViewChange={handleViewChange}>
      {renderContent()}
    </AdminLayout>
  );
};

/**
 * Dashboard principal del administrador
 */
const AdminDashboard = ({ onDrillDown }) => {
  const { user } = useAuth();

  return (
    <Box>
      <Typography variant="h5" gutterBottom sx={{ display: 'flex', alignItems: 'center' }}>
        <DashboardIcon sx={{ mr: 1 }} />
        Panel de Control
      </Typography>
      <AdminDashboardMain onDrillDown={onDrillDown} />
    </Box>
  );
};


export default AdminCenter;
