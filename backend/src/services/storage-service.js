import { S3Client, PutObjectCommand, GetObjectCommand, DeleteObjectCommand } from '@aws-sdk/client-s3';
import path from 'path';
import crypto from 'crypto';

// ── Configuration ────────────────────────────────────────────────
const R2_ACCOUNT_ID = process.env.R2_ACCOUNT_ID;
const R2_ACCESS_KEY_ID = process.env.R2_ACCESS_KEY_ID;
const R2_SECRET_ACCESS_KEY = process.env.R2_SECRET_ACCESS_KEY;
const R2_BUCKET_NAME = process.env.R2_BUCKET_NAME || 'notaria-segura-files';

const isConfigured = R2_ACCOUNT_ID && R2_ACCESS_KEY_ID && R2_SECRET_ACCESS_KEY;

let s3Client = null;

function getClient() {
  if (!isConfigured) {
    throw new Error('Cloudflare R2 no está configurado. Verifique las variables R2_ACCOUNT_ID, R2_ACCESS_KEY_ID, R2_SECRET_ACCESS_KEY.');
  }
  if (!s3Client) {
    s3Client = new S3Client({
      region: 'auto',
      endpoint: `https://${R2_ACCOUNT_ID}.r2.cloudflarestorage.com`,
      credentials: {
        accessKeyId: R2_ACCESS_KEY_ID,
        secretAccessKey: R2_SECRET_ACCESS_KEY,
      },
    });
  }
  return s3Client;
}

// ── Helpers ──────────────────────────────────────────────────────

/**
 * Genera una key única para el archivo en R2.
 * Formato: {notaryId}/{folder}/{timestamp}-{random}.{ext}
 */
function generateKey(notaryId, folder, originalFilename) {
  const ext = path.extname(originalFilename).toLowerCase();
  const timestamp = Date.now();
  const random = crypto.randomBytes(4).toString('hex');
  return `${notaryId}/${folder}/${timestamp}-${random}${ext}`;
}

// ── Public API ───────────────────────────────────────────────────

/**
 * Sube un archivo a Cloudflare R2.
 * @param {Buffer} buffer - Contenido del archivo
 * @param {Object} options
 * @param {number} options.notaryId - ID de la notaría (multi-tenant)
 * @param {string} options.folder - Carpeta lógica (ej: 'minutas', 'reportes')
 * @param {string} options.filename - Nombre original del archivo
 * @param {string} [options.contentType] - MIME type
 * @returns {Promise<{key: string, url: string}>} Key en R2 y URL de acceso
 */
export async function uploadFile(buffer, { notaryId, folder, filename, contentType }) {
  const client = getClient();
  const key = generateKey(notaryId, folder, filename);

  await client.send(new PutObjectCommand({
    Bucket: R2_BUCKET_NAME,
    Key: key,
    Body: buffer,
    ContentType: contentType || 'application/octet-stream',
  }));

  return {
    key,
    url: `https://${R2_ACCOUNT_ID}.r2.cloudflarestorage.com/${R2_BUCKET_NAME}/${key}`,
  };
}

/**
 * Descarga un archivo desde Cloudflare R2.
 * @param {string} key - Key del archivo en R2
 * @returns {Promise<{buffer: Buffer, contentType: string}>}
 */
export async function downloadFile(key) {
  const client = getClient();

  const response = await client.send(new GetObjectCommand({
    Bucket: R2_BUCKET_NAME,
    Key: key,
  }));

  const chunks = [];
  for await (const chunk of response.Body) {
    chunks.push(chunk);
  }

  return {
    buffer: Buffer.concat(chunks),
    contentType: response.ContentType || 'application/octet-stream',
  };
}

/**
 * Elimina un archivo de Cloudflare R2.
 * @param {string} key - Key del archivo en R2
 */
export async function deleteFile(key) {
  const client = getClient();

  await client.send(new DeleteObjectCommand({
    Bucket: R2_BUCKET_NAME,
    Key: key,
  }));
}

/**
 * Verifica si R2 está configurado y accesible.
 * @returns {boolean}
 */
export function isStorageConfigured() {
  return isConfigured;
}

export default {
  uploadFile,
  downloadFile,
  deleteFile,
  isStorageConfigured,
};
