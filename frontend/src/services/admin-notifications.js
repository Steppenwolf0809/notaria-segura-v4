/**
 * Simple notification service functions for admin operations
 */
class AdminNotificationService {
  constructor(token) {
    this.token = token;
    this.baseUrl = 'http://localhost:3001/api/admin/notifications';
  }

  async getStats() {
    const response = await fetch(`${this.baseUrl}/stats`, {
      headers: {
        'Authorization': `Bearer ${this.token}`,
        'Content-Type': 'application/json'
      }
    });

    if (!response.ok) {
      throw new Error('Error al obtener estadísticas');
    }

    const data = await response.json();
    return data.data;
  }

  async getHistory(filters = {}) {
    const params = new URLSearchParams(filters).toString();
    const url = params ? `${this.baseUrl}/history?${params}` : `${this.baseUrl}/history`;
    
    const response = await fetch(url, {
      headers: {
        'Authorization': `Bearer ${this.token}`,
        'Content-Type': 'application/json'
      }
    });

    if (!response.ok) {
      throw new Error('Error al obtener historial');
    }

    const data = await response.json();
    return data.data;
  }

  async getFailedNotifications() {
    const response = await fetch(`${this.baseUrl}/failed`, {
      headers: {
        'Authorization': `Bearer ${this.token}`,
        'Content-Type': 'application/json'
      }
    });

    if (!response.ok) {
      throw new Error('Error al obtener notificaciones fallidas');
    }

    const data = await response.json();
    return data.data;
  }

  async retryNotification(notificationId) {
    const response = await fetch(`${this.baseUrl}/retry/${notificationId}`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${this.token}`,
        'Content-Type': 'application/json'
      }
    });

    if (!response.ok) {
      throw new Error('Error al reintentar notificación');
    }

    return await response.json();
  }

  async retryAllFailed() {
    const response = await fetch(`${this.baseUrl}/retry-all`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${this.token}`,
        'Content-Type': 'application/json'
      }
    });

    if (!response.ok) {
      throw new Error('Error al reintentar notificaciones');
    }

    return await response.json();
  }

  async getSettings() {
    const response = await fetch(`${this.baseUrl}/settings`, {
      headers: {
        'Authorization': `Bearer ${this.token}`,
        'Content-Type': 'application/json'
      }
    });

    if (!response.ok) {
      throw new Error('Error al obtener configuración');
    }

    const data = await response.json();
    return data.data;
  }

  async updateSettings(settings) {
    const response = await fetch(`${this.baseUrl}/settings`, {
      method: 'PUT',
      headers: {
        'Authorization': `Bearer ${this.token}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(settings)
    });

    if (!response.ok) {
      throw new Error('Error al actualizar configuración');
    }

    return await response.json();
  }

  async getTemplates() {
    const response = await fetch(`${this.baseUrl}/templates`, {
      headers: {
        'Authorization': `Bearer ${this.token}`,
        'Content-Type': 'application/json'
      }
    });

    if (!response.ok) {
      throw new Error('Error al obtener plantillas');
    }

    const data = await response.json();
    return data.data;
  }

  async createTemplate(template) {
    const response = await fetch(`${this.baseUrl}/templates`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${this.token}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(template)
    });

    if (!response.ok) {
      throw new Error('Error al crear plantilla');
    }

    return await response.json();
  }

  async updateTemplate(templateId, template) {
    const response = await fetch(`${this.baseUrl}/templates/${templateId}`, {
      method: 'PUT',
      headers: {
        'Authorization': `Bearer ${this.token}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(template)
    });

    if (!response.ok) {
      throw new Error('Error al actualizar plantilla');
    }

    return await response.json();
  }

  async deleteTemplate(templateId) {
    const response = await fetch(`${this.baseUrl}/templates/${templateId}`, {
      method: 'DELETE',
      headers: {
        'Authorization': `Bearer ${this.token}`,
        'Content-Type': 'application/json'
      }
    });

    if (!response.ok) {
      throw new Error('Error al eliminar plantilla');
    }

    return await response.json();
  }

  async sendTest(testData) {
    const response = await fetch(`${this.baseUrl}/test`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${this.token}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(testData)
    });

    if (!response.ok) {
      throw new Error('Error al enviar notificación de prueba');
    }

    return await response.json();
  }
}

export default AdminNotificationService;