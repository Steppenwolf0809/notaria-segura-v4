import dotenv from 'dotenv';

dotenv.config({ path: './.env' });

export function requireApiKey(req, res, next) {
  try {
    const provided = req.header('x-api-key') || req.query.api_key || '';
    const expected = process.env.API_SECRET_KEY || '';

    if (!expected) {
      return res.status(500).json({ success: false, message: 'API key no configurada en el servidor' });
    }

    if (!provided || provided !== expected) {
      return res.status(401).json({ success: false, message: 'API key inválida' });
    }

    next();
  } catch (err) {
    return res.status(500).json({ success: false, message: 'Error validando API key' });
  }
}

export default requireApiKey;

