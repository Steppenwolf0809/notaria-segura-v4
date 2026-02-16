import { auth } from 'express-oauth2-jwt-bearer';
import dotenv from 'dotenv';

dotenv.config();

// Middleware de validación de JWT de Auth0
// Este middleware verifica que el token sea válido (firma, expiración, issuer, audience)
export const checkJwt = auth({
    audience: process.env.AUTH0_AUDIENCE,
    issuerBaseURL: `https://${process.env.AUTH0_DOMAIN}/`,
    tokenSigningAlg: 'RS256'
});

// Middleware opcional: si falla, no bloquea, pero deja constancia
// Útil para rutas híbridas o de transición
export const checkJwtOptional = (req, res, next) => {
    checkJwt(req, res, (err) => {
        if (err) {
            // Si hay error (token inválido o ausente), simplemente continuamos sin usuario
            req.auth = null;
        }
        next();
    });
};
