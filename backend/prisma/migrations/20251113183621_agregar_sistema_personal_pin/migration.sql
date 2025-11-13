-- CreateTable
CREATE TABLE "personas_registradas" (
    "id" TEXT NOT NULL,
    "numeroIdentificacion" TEXT NOT NULL,
    "tipoPersona" TEXT NOT NULL,
    "pinHash" TEXT NOT NULL,
    "pinCreado" BOOLEAN NOT NULL DEFAULT false,
    "pinResetCount" INTEGER NOT NULL DEFAULT 0,
    "intentosFallidos" INTEGER NOT NULL DEFAULT 0,
    "bloqueadoHasta" TIMESTAMP(3),
    "ultimoAcceso" TIMESTAMP(3),
    "ultimoIntentoFallido" TIMESTAMP(3),
    "datosPersonaNatural" JSONB,
    "datosPersonaJuridica" JSONB,
    "completado" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "personas_registradas_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "sesiones_personales" (
    "id" TEXT NOT NULL,
    "personaId" TEXT NOT NULL,
    "token" TEXT NOT NULL,
    "expiraEn" TIMESTAMP(3) NOT NULL,
    "ultimaActividad" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "ipAddress" TEXT,
    "userAgent" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "sesiones_personales_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "auditoria_personas" (
    "id" TEXT NOT NULL,
    "personaId" TEXT NOT NULL,
    "tipo" TEXT NOT NULL,
    "descripcion" TEXT NOT NULL,
    "matrizadorId" INTEGER,
    "ipAddress" TEXT,
    "userAgent" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "auditoria_personas_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "personas_registradas_numeroIdentificacion_key" ON "personas_registradas"("numeroIdentificacion");

-- CreateIndex
CREATE INDEX "personas_registradas_numeroIdentificacion_idx" ON "personas_registradas"("numeroIdentificacion");

-- CreateIndex
CREATE INDEX "personas_registradas_bloqueadoHasta_idx" ON "personas_registradas"("bloqueadoHasta");

-- CreateIndex
CREATE UNIQUE INDEX "sesiones_personales_token_key" ON "sesiones_personales"("token");

-- CreateIndex
CREATE INDEX "sesiones_personales_token_idx" ON "sesiones_personales"("token");

-- CreateIndex
CREATE INDEX "sesiones_personales_personaId_idx" ON "sesiones_personales"("personaId");

-- CreateIndex
CREATE INDEX "sesiones_personales_expiraEn_idx" ON "sesiones_personales"("expiraEn");

-- CreateIndex
CREATE INDEX "auditoria_personas_personaId_idx" ON "auditoria_personas"("personaId");

-- CreateIndex
CREATE INDEX "auditoria_personas_tipo_idx" ON "auditoria_personas"("tipo");

-- CreateIndex
CREATE INDEX "auditoria_personas_createdAt_idx" ON "auditoria_personas"("createdAt");

-- AddForeignKey
ALTER TABLE "sesiones_personales" ADD CONSTRAINT "sesiones_personales_personaId_fkey" FOREIGN KEY ("personaId") REFERENCES "personas_registradas"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "auditoria_personas" ADD CONSTRAINT "auditoria_personas_personaId_fkey" FOREIGN KEY ("personaId") REFERENCES "personas_registradas"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "auditoria_personas" ADD CONSTRAINT "auditoria_personas_matrizadorId_fkey" FOREIGN KEY ("matrizadorId") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;
