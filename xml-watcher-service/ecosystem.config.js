/**
 * PM2 Ecosystem Configuration
 * Servicio XML Watcher para Notaría
 * 
 * Instrucciones de despliegue:
 * 1. npm install -g pm2
 * 2. cd C:\notaria-segura\xml-watcher-service
 * 3. npm install
 * 4. pm2 start ecosystem.config.js
 * 5. pm2 save
 * 6. pm2-startup install (para inicio automático con Windows)
 */

module.exports = {
    apps: [{
        name: 'xml-watcher',
        script: 'src/index.js',
        cwd: __dirname,
        interpreter: 'node',

        // Configuración de ejecución
        node_args: '--experimental-specifier-resolution=node',
        watch: false,
        instances: 1,

        // Reinicio automático
        autorestart: true,
        max_restarts: 10,
        restart_delay: 5000,
        min_uptime: 10000,

        // Variables de entorno
        env: {
            NODE_ENV: 'production'
        },

        // Logs
        error_file: 'logs/pm2-error.log',
        out_file: 'logs/pm2-out.log',
        log_date_format: 'YYYY-MM-DD HH:mm:ss Z',
        merge_logs: true,
        time: true,

        // Control de memoria (reiniciar si excede 500MB)
        max_memory_restart: '500M',

        // Manejo de señales de cierre
        kill_timeout: 5000,
        wait_ready: true,
        listen_timeout: 10000
    }]
};
