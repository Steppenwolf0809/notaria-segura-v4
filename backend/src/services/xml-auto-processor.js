import fs from 'fs'
import path from 'path'
import prisma from '../db.js'
import MatrizadorAssignmentService from './matrizador-assignment-service.js'
import { parseXmlDocument } from './xml-parser-service.js'

/**
 * Procesador automático de archivos XML desde el filesystem
 * - Reutiliza el parser existente
 * - Crea documentos en BD con usuario de sistema
 * - Maneja duplicados y errores
 * - Mueve archivos a carpetas de éxito/errores
 */
export class XmlAutoProcessor {
  constructor(options) {
    this.processedFolder = options.processedFolder
    this.errorFolder = options.errorFolder
    this.systemUserEmail = options.systemUserEmail || 'system@notaria.local'
  }

  async ensureDirectories() {
    for (const dir of [this.processedFolder, this.errorFolder]) {
      await fs.promises.mkdir(dir, { recursive: true }).catch(() => {})
    }
  }

  getDatedSubfolder(base) {
    const d = new Date()
    const y = d.getFullYear()
    const m = String(d.getMonth() + 1).padStart(2, '0')
    const day = String(d.getDate()).padStart(2, '0')
    return path.join(base, `${y}-${m}-${day}`)
  }

  async moveToProcessed(filePath, originalName) {
    const destDir = this.getDatedSubfolder(this.processedFolder)
    await fs.promises.mkdir(destDir, { recursive: true })
    const destPath = path.join(destDir, path.basename(originalName))
    await fs.promises.rename(filePath, destPath).catch(async () => {
      // Si rename falla (cruzando discos), usar copy+unlink
      await fs.promises.copyFile(filePath, destPath)
      await fs.promises.unlink(filePath)
    })
    return destPath
  }

  async moveToError(filePath, originalName, errorMessage) {
    const destDir = this.getDatedSubfolder(this.errorFolder)
    await fs.promises.mkdir(destDir, { recursive: true })
    const baseName = path.basename(originalName)
    const destPath = path.join(destDir, baseName)
    await fs.promises.copyFile(filePath, destPath).catch(async () => {
      // Si copiar falla, intentar mover
      await fs.promises.rename(filePath, destPath)
    })
    // Crear .log con detalle de error
    const logPath = path.join(destDir, `${baseName}.log.txt`)
    const logContent = `Fecha: ${new Date().toISOString()}\nArchivo: ${baseName}\nError: ${errorMessage}\n`
    await fs.promises.writeFile(logPath, logContent, 'utf8')
    // Borrar original si aún existe
    try { await fs.promises.unlink(filePath) } catch {}
    return { destPath, logPath }
  }

  async getSystemUser() {
    // Buscar o crear usuario sistema (rol ADMIN inactivo)
    let user = await prisma.user.findFirst({ where: { email: this.systemUserEmail } })
    if (!user) {
      user = await prisma.user.create({
        data: {
          email: this.systemUserEmail,
          password: '!' + Math.random().toString(36),
          firstName: 'Sistema',
          lastName: 'Automático',
          role: 'ADMIN',
          isActive: true
        }
      })
    }
    return user
  }

  async processFile(filePath) {
    const originalName = path.basename(filePath)
    console.log(`📥 Procesando XML: ${originalName}`)

    try {
      await this.ensureDirectories()

      const xmlContent = await fs.promises.readFile(filePath, 'utf8')
      if (!xmlContent || xmlContent.trim().length === 0) {
        throw new Error('Archivo vacío')
      }

      // Parsear XML
      const parsedData = await parseXmlDocument(xmlContent)

      // Detección de duplicados
      const existing = await prisma.document.findUnique({ where: { protocolNumber: parsedData.protocolNumber } })
      if (existing) {
        console.log(`🔁 Duplicado detectado: ${parsedData.protocolNumber}. Moviendo a procesados sin crear.`)
        await this.moveToProcessed(filePath, originalName)
        return { success: true, duplicated: true, documentId: existing.id, protocolNumber: parsedData.protocolNumber }
      }

      // Usuario sistema
      const systemUser = await this.getSystemUser()

      // Crear documento
      const document = await prisma.document.create({
        data: {
          protocolNumber: parsedData.protocolNumber,
          clientName: parsedData.clientName,
          clientId: parsedData.clientId,
          clientPhone: parsedData.clientPhone,
          clientEmail: parsedData.clientEmail,
          documentType: parsedData.documentType,
          actoPrincipalDescripcion: parsedData.actoPrincipalDescripcion,
          actoPrincipalValor: parsedData.actoPrincipalValor,
          totalFactura: parsedData.totalFactura,
          matrizadorName: parsedData.matrizadorName,
          itemsSecundarios: parsedData.itemsSecundarios,
          xmlOriginal: parsedData.xmlOriginal,
          createdById: systemUser.id
        }
      })

      // Registrar evento
      try {
        await prisma.documentEvent.create({
          data: {
            documentId: document.id,
            userId: systemUser.id,
            eventType: 'DOCUMENT_CREATED',
            description: 'Documento creado desde XML por Sistema Automático',
            details: {
              protocolNumber: parsedData.protocolNumber,
              documentType: parsedData.documentType,
              clientName: parsedData.clientName,
              source: 'XML_WATCHER',
              fileName: originalName,
              totalFactura: parsedData.totalFactura,
              timestamp: new Date().toISOString()
            },
            ipAddress: 'system',
            userAgent: 'xml-auto-processor'
          }
        })
      } catch (e) {
        console.warn('⚠️ Error registrando evento automático:', e.message)
      }

      // Asignación automática de matrizador (misma lógica que upload manual)
      try {
        const assignment = await MatrizadorAssignmentService.autoAssignDocument(
          document.id,
          parsedData.matrizadorName
        )
        if (assignment?.assigned) {
          // Reemplazar referencia de document por la versión asignada
          // para efectos de logging
        }
      } catch (e) {
        console.warn('⚠️ Error en asignación automática:', e.message)
      }

      // Mover a procesados
      await this.moveToProcessed(filePath, originalName)

      console.log(`✅ Procesado OK: ${originalName} → documento ${document.id}`)
      return { success: true, duplicated: false, documentId: document.id, protocolNumber: parsedData.protocolNumber }
    } catch (error) {
      console.error(`❌ Error procesando ${originalName}:`, error.message)
      await this.moveToError(filePath, originalName, error.message)
      return { success: false, error: error.message }
    }
  }
}

export default XmlAutoProcessor


