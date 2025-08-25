import axios from 'axios';

export class AuthClient {
  constructor({ apiUrl, email, password, logger }) {
    this.apiUrl = apiUrl.replace(/\/$/, '');
    this.email = email;
    this.password = password;
    this.logger = logger;
    this.token = null;
    this.tokenExpiresAt = 0;
    this.client = axios.create({ baseURL: this.apiUrl, timeout: 30000 });
  }

  async login() {
    try {
      const res = await this.client.post('/auth/login', {
        email: this.email,
        password: this.password
      });
      const token = res.data?.data?.token || res.data?.token;
      if (!token) throw new Error('Token no recibido');
      this.setToken(token);
      this.logger.info(`Autenticado como: ${this.email}`);
      return token;
    } catch (err) {
      this.logger.error(`Error autenticando: ${err.response?.status} ${err.message}`);
      throw err;
    }
  }

  setToken(token) {
    this.token = token;
    // Asumimos expiración de 24h si no hay endpoint dedicated refresh
    this.tokenExpiresAt = Date.now() + 23 * 60 * 60 * 1000; // 23h margen
  }

  isTokenValid() {
    return !!this.token && Date.now() < this.tokenExpiresAt;
  }

  async getAuthHeader() {
    if (!this.isTokenValid()) {
      await this.login();
    }
    return { Authorization: `Bearer ${this.token}` };
  }

  async withAuth(requestFn, attempt = 0) {
    try {
      const headers = await this.getAuthHeader();
      return await requestFn(headers);
    } catch (err) {
      if (err.response?.status === 401 && attempt < 1) {
        this.logger.warn('Token expirado, reautenticando...');
        await this.login();
        return this.withAuth(requestFn, attempt + 1);
      }
      throw err;
    }
  }
}


