import fs from 'fs-extra';
import path from 'path';
import AdmZip from 'adm-zip';
import prettyBytes from 'pretty-bytes';

function daysAgo(num) {
  const d = new Date();
  d.setDate(d.getDate() - num);
  d.setHours(0, 0, 0, 0);
  return d;
}

export class Organizer {
  constructor({ folders, settings, logger }) {
    this.folders = folders;
    this.settings = settings;
    this.logger = logger;
  }

  async ensureStructure() {
    await fs.ensureDir(this.folders.processed);
    await fs.ensureDir(this.folders.errors);
    await fs.ensureDir(this.folders.archived);
  }

  async cleanup() {
    if (!this.settings.cleanup.enabled) return;
    await this.ensureStructure();
    const start = Date.now();
    this.logger.info('Limpieza automática iniciada');

    const processedFreed = await this.deleteOlderThan(this.folders.processed, this.settings.cleanup.keepProcessedDays, true);
    const errorsFreed = await this.deleteOlderThan(this.folders.errors, this.settings.cleanup.keepErrorsDays, false);

    const elapsed = ((Date.now() - start) / 1000).toFixed(1);
    this.logger.info(`Limpieza completada en ${elapsed}s. Espacio liberado aprox: ${prettyBytes(processedFreed + errorsFreed)}`);
  }

  async deleteOlderThan(baseDir, keepDays, compress) {
    let freed = 0;
    const cutoff = daysAgo(keepDays);
    const entries = await fs.readdir(baseDir).catch(() => []);
    for (const name of entries) {
      const full = path.join(baseDir, name);
      const stat = await fs.stat(full).catch(() => null);
      if (!stat || !stat.isDirectory()) continue;
      // directorios YYYY-MM-DD
      const dirDate = new Date(name);
      if (isNaN(dirDate.getTime())) continue;
      if (dirDate < cutoff) {
        if (compress && this.settings.cleanup.compressOldFiles) {
          const zipName = `${path.basename(baseDir)}_${dirDate.toISOString().slice(0, 7)}.zip`;
          const zipPath = path.join(this.folders.archived, zipName);
          await this.addDirToZip(full, zipPath);
        }
        freed += await this.removeDirSize(full);
        await fs.remove(full);
      }
    }
    return freed;
  }

  async addDirToZip(dirPath, zipPath) {
    const zip = new AdmZip();
    zip.addLocalFolder(dirPath);
    zip.writeZip(zipPath);
    this.logger.info(`Comprimido: ${dirPath} -> ${zipPath}`);
  }

  async removeDirSize(dirPath) {
    let total = 0;
    const walk = async (p) => {
      const items = await fs.readdir(p).catch(() => []);
      for (const it of items) {
        const full = path.join(p, it);
        const st = await fs.stat(full).catch(() => null);
        if (!st) continue;
        if (st.isDirectory()) await walk(full);
        else total += st.size;
      }
    };
    await walk(dirPath);
    return total;
  }
}


