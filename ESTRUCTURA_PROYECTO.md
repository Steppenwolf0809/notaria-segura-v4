.
├── backend
│   ├── .github
│   │   └── workflows
│   │       └── test-and-deploy.yml
│   ├── assets
│   │   └── images
│   │       ├── logo-notaria18.png
│   │       └── README.md
│   ├── docs
│   │   └── JWT-SECURITY.md
│   ├── fotos-escrituras
│   │   └── .htaccess
│   ├── prisma
│   │   ├── migrations
│   │   │   ├── 20250102200000_add_manual_escrituras_fields
│   │   │   │   └── migration.sql
│   │   │   ├── 20250106000000_add_pdf_fields_to_escrituras
│   │   │   │   └── migration.sql
│   │   │   ├── 20250106000001_add_hidden_pages_to_pdfs
│   │   │   │   └── migration.sql
│   │   │   ├── 20250113_add_formulario_uafe_tables
│   │   │   │   └── migration.sql
│   │   │   ├── 20250117000000_baseline
│   │   │   │   └── migration.sql
│   │   │   ├── 20250117000000_fix_role_enum_conversion
│   │   │   │   └── migration.sql
│   │   │   ├── 20250926000000_add_escrituras_qr_table
│   │   │   │   └── migration.sql
│   │   │   ├── 20251113183621_agregar_sistema_personal_pin
│   │   │   │   └── migration.sql
│   │   │   ├── 20251114000000_add_protocolo_uafe_system
│   │   │   │   └── migration.sql
│   │   │   ├── 20251115000000_add_representado_fields
│   │   │   │   └── migration.sql
│   │   │   ├── 20251117164900_add_formas_pago_array
│   │   │   │   └── migration.sql
│   │   │   ├── 20251117223902_make_documentId_optional_in_document_events
│   │   │   │   └── migration.sql
│   │   │   ├── 20251118000000_add_fecha_factura_to_documents
│   │   │   │   └── migration.sql
│   │   │   ├── 20260109230000_add_fechalisto_to_documents
│   │   │   │   └── migration.sql
│   │   │   ├── 20260110040000_cleanup_remove_group_columns
│   │   │   │   └── migration.sql
│   │   │   ├── 20260114_add_uafe_text_generation
│   │   │   │   └── migration.sql
│   │   │   ├── 20260117_add_billing_models
│   │   │   │   └── migration.sql
│   │   │   ├── add_billing_indexes.sql
│   │   │   ├── migration_lock.toml
│   │   │   └── temp_billing.sql
│   │   ├── prisma
│   │   │   └── dev.db
│   │   ├── schema-sqlite.prisma
│   │   └── schema.prisma
│   ├── qa
│   │   └── outputs
│   │       ├── example-test_A_001.txt
│   │       ├── example-test_A_002.txt
│   │       ├── example-test_B_001.txt
│   │       ├── example-test_B_002.txt
│   │       ├── example-test_C_001.txt
│   │       └── qa-report-1758065298137.json
│   ├── scripts
│   │   ├── backup.js
│   │   ├── check-database-status.js
│   │   ├── check-document-status.js
│   │   ├── check-document-types.js
│   │   ├── check-persona.js
│   │   ├── copy-db-to-staging.bat
│   │   ├── db-baseline.js
│   │   ├── debug-completitud.js
│   │   ├── debug-inconsistency.js
│   │   ├── debug-spouse-data.js
│   │   ├── deploy.sh
│   │   ├── diagnose-persona.js
│   │   ├── diagnose-railway.js
│   │   ├── emergency-deploy.js
│   │   ├── fix-stale-status.js
│   │   ├── health-check.js
│   │   ├── inspect-schema.js
│   │   ├── mark-baseline-migration.js
│   │   ├── migrate-add-reminder-template.js
│   │   ├── prepare-production-deploy.js
│   │   ├── railway-deploy.js
│   │   ├── README.md
│   │   ├── reconcile-schema.js
│   │   ├── recovery.js
│   │   ├── replace-console-logs.js
│   │   ├── reset-documents.js
│   │   ├── run-migrations.js
│   │   ├── setup-production-data.js
│   │   ├── sync-completitud.js
│   │   ├── test-text-generators.js
│   │   └── verify-comparecencia-fix.js
│   ├── src
│   │   ├── config
│   │   │   └── environment.js
│   │   ├── controllers
│   │   │   ├── .gitkeep
│   │   │   ├── admin-controller.js
│   │   │   ├── admin-document-controller.js
│   │   │   ├── admin-notification-controller.js
│   │   │   ├── admin-whatsapp-templates-controller.js
│   │   │   ├── archivo-bulk-controller.js
│   │   │   ├── archivo-controller.js
│   │   │   ├── auth-controller.js
│   │   │   ├── billing-controller.js
│   │   │   ├── bulk-operations-controller.js
│   │   │   ├── document-controller.js
│   │   │   ├── encuesta-controller.js
│   │   │   ├── escrituras-qr-controller.js
│   │   │   ├── formulario-uafe-controller.js
│   │   │   ├── personal-controller.js
│   │   │   ├── reception-bulk-controller.js
│   │   │   └── reception-controller.js
│   │   ├── data
│   │   │   └── extractos-referencia
│   │   │       ├── config
│   │   │       │   ├── fragmentos-representacion.json
│   │   │       │   ├── logica-deteccion.json
│   │   │       │   ├── patrones-procesamiento.json
│   │   │       │   ├── procesador-variables.json
│   │   │       │   └── reglas-genero.json
│   │   │       ├── examples
│   │   │       │   ├── poder-doble-beneficiario-ejemplo.txt
│   │   │       │   ├── poder-doble-empresa-ejemplo.txt
│   │   │       │   ├── poder-ejemplo-final.txt
│   │   │       │   ├── poder-natural-mixto-ejemplo.txt
│   │   │       │   └── respuesta-cursor-texto-exacto.md
│   │   │       ├── inputs
│   │   │       │   ├── poder-juridica.json
│   │   │       │   └── poder-natural.json
│   │   │       ├── pdf
│   │   │       │   ├── ActoNotarial-47179730.pdf
│   │   │       │   ├── ActoNotarial-47182796.pdf
│   │   │       │   ├── ActoNotarial-47690742.pdf
│   │   │       │   ├── ActoNotarial-47959304.pdf
│   │   │       │   ├── ActoNotarial-47962455.pdf
│   │   │       │   └── desktop.ini
│   │   │       └── templates
│   │   │           └── poder-universal.txt
│   │   ├── middleware
│   │   │   ├── .gitkeep
│   │   │   ├── api-key-middleware.js
│   │   │   ├── auth-middleware.js
│   │   │   ├── csrf-protection.js
│   │   │   ├── input-validation.js
│   │   │   ├── rate-limiter.js
│   │   │   ├── verify-formulario-uafe-session.js
│   │   │   └── verify-personal-session.js
│   │   ├── routes
│   │   │   ├── .gitkeep
│   │   │   ├── admin-routes.js
│   │   │   ├── alertas-routes.js
│   │   │   ├── archivo-routes.js
│   │   │   ├── auth-routes.js
│   │   │   ├── billing-routes.js
│   │   │   ├── document-routes.js
│   │   │   ├── encuesta-routes.js
│   │   │   ├── escrituras-qr-routes.js
│   │   │   ├── formulario-uafe-routes.js
│   │   │   ├── notifications-routes.js
│   │   │   ├── pdf-proxy-routes.js
│   │   │   ├── personal-routes.js
│   │   │   └── reception-routes.js
│   │   ├── services
│   │   │   ├── extractos
│   │   │   │   ├── engine.js
│   │   │   │   ├── index.js
│   │   │   │   ├── phrase-builder.js
│   │   │   │   └── poder.js
│   │   │   ├── .gitkeep
│   │   │   ├── actos-extractor-service.js
│   │   │   ├── advanced-extraction-service.js
│   │   │   ├── alertas-service.js
│   │   │   ├── bulk-status-service.js
│   │   │   ├── cache-service.js
│   │   │   ├── comparecencia-generator-service.js
│   │   │   ├── completitud-service.js
│   │   │   ├── cpanel-ftp-service.js
│   │   │   ├── data-quality-validator.js
│   │   │   ├── docx-generator.js
│   │   │   ├── encabezado-generator-service.js
│   │   │   ├── extraction-aggregator.js
│   │   │   ├── gemini-prompt-enhanced.js
│   │   │   ├── gemini-service.js
│   │   │   ├── import-koinor-service.js
│   │   │   ├── matrizador-assignment-service.js
│   │   │   ├── notarial-table-parser.js
│   │   │   ├── notarial-text-service.js
│   │   │   ├── ocr-service.js
│   │   │   ├── pdf-extractor-service.js
│   │   │   ├── pdf-parser-escrituras.js
│   │   │   ├── qr-generator-service.js
│   │   │   ├── universal-pdf-parser.js
│   │   │   ├── xml-parser-service.js
│   │   │   └── xml-watcher-service.js
│   │   ├── utils
│   │   │   ├── .gitkeep
│   │   │   ├── audit-logger.js
│   │   │   ├── billing-utils.js
│   │   │   ├── codigo-retiro.js
│   │   │   ├── ecuador-patterns.js
│   │   │   ├── emojis.js
│   │   │   ├── event-formatter.js
│   │   │   ├── http.js
│   │   │   ├── logger.js
│   │   │   ├── password-validator.js
│   │   │   ├── pdf-uafe-helpers.js
│   │   │   ├── pii-masking.js
│   │   │   ├── pin-validator.js
│   │   │   ├── safe-prisma.js
│   │   │   ├── status-transitions.js
│   │   │   ├── timezone.js
│   │   │   └── token-generator.js
│   │   └── db.js
│   ├── test
│   │   └── data
│   │       └── 05-versions-space.pdf
│   ├── tests
│   │   ├── role-system-unit.test.js
│   │   └── setup.js
│   ├── .env
│   ├── .env.example
│   ├── .env.local
│   ├── .env.production
│   ├── .env.staging.example
│   ├── .gitignore
│   ├── .node-version
│   ├── .nvmrc
│   ├── API_DOCUMENTATION.md
│   ├── jest.config.js
│   ├── nixpacks.toml
│   ├── package.json
│   ├── prismaschema.prisma8
│   ├── qa-gate-report.json
│   ├── server.js
│   └── setup-database.sh
├── docs
│   ├── features
│   │   ├── FUNCIONALIDAD_EDICION_DOCUMENTOS.md
│   │   └── IMPLEMENTACION_ROL_ARCHIVO_COMPLETA.md
│   ├── QR Code Generator Sign Up _ My QR Code_files
│   │   ├── 10988-aab5ffc1d4c94998.js.download
│   │   ├── 13047-affe51f1c08b8c2e.js.download
│   │   ├── 14077-a08817b89cbc450c.js.download
│   │   ├── 15828-aac90b9d430d9882.js.download
│   │   ├── 1858-2e6e32be4c1b7b82.js.download
│   │   ├── 23986-c9e64da8f9d61693.js.download
│   │   ├── 28382-9ebedc92dd7f135d.js.download
│   │   ├── 28a41e00-27170b97740228fc.js.download
│   │   ├── 45915-0e138612743f33d1.js.download
│   │   ├── 47976-c8710c8d2f150f0d.js.download
│   │   ├── 50920-542b71a0d601793a.js.download
│   │   ├── 51717-1f82908d0c7e1272.js.download
│   │   ├── 53109-236d4b872747e3b5.js.download
│   │   ├── 53471-981704ad2f21bbfb.js.download
│   │   ├── 5456-dad82afd8f68e83e.js.download
│   │   ├── 5827-20f9d135529ff966.js.download
│   │   ├── 59410-f9558a43445ebfa8.js.download
│   │   ├── 65006-552fc4ee807ed24b.js.download
│   │   ├── 66336-ce79c3b61ed0835d.js.download
│   │   ├── 68714-ac5b81da4494c7ef.js.download
│   │   ├── 68739-d7e19b557b884b67.js.download
│   │   ├── 69914-4bed7e32c2922b8d.js.download
│   │   ├── 73502-a3442fabd3fbe475.js.download
│   │   ├── 74362-b584d3d9701ef3b5.js.download
│   │   ├── 74789-c1eb3396ffdf8112.js.download
│   │   ├── 76020-6f57191b369378b1.js.download
│   │   ├── 783-03fb715458852b84.js.download
│   │   ├── 81060-b62188c67312aa23.js.download
│   │   ├── 83109-e62c5611c528ead9.js.download
│   │   ├── 85330-367d6b7f2b3e44ef.js.download
│   │   ├── 85cbaaa4a9159bf6.css
│   │   ├── 88113-67c118c8dae155f2.js.download
│   │   ├── 8845-6fe03755dced29a0.js.download
│   │   ├── 88562-8de81067c0886052.js.download
│   │   ├── 9647-1dff1a7b3e61338c.js.download
│   │   ├── analytics
│   │   ├── appleid.auth.js.download
│   │   ├── b45f6bc0568b5cd2.css
│   │   ├── b4ae2741a54a2a1d.css
│   │   ├── client
│   │   ├── ea6bfe462092152c.css
│   │   ├── gtm.js.download
│   │   ├── layout-d3daf1bc530759ab.js.download
│   │   ├── load-fonts
│   │   ├── main-app-219c4d0545c968f5.js.download
│   │   ├── not-found-5dd425f78ecfff2c.js.download
│   │   ├── page-12f9ae13ca3fb772.js.download
│   │   ├── page-aec8ebacc8592583.js.download
│   │   ├── polyfills-42372ed130431b0a.js.download
│   │   ├── script.js.download
│   │   ├── sdk.js.download
│   │   ├── sdk(1).js.download
│   │   ├── vcd15cbe7772f49c399c6a5babf22c1241717689176015
│   │   └── webpack-e597f0190bb5d4e7.js.download
│   ├── ux
│   │   ├── codex-roadmap-issues-v1.2.md
│   │   ├── diseno_de_busqueda_global_vs_filtrada_v_1.md
│   │   └── plan-roles-v1.2.md
│   ├── ActoNotarial-49590671.pdf
│   ├── auditoria-document-controller.md
│   ├── CONFIGURACION_FTP_HTACCESS.md
│   ├── CXC 20260114 (2).xls
│   ├── desktop.ini
│   ├── implementacion_gap_solver.md
│   ├── instrucciones_limpieza_estados.md
│   ├── INSTRUCCIONES_MEJORAS_SISTEMA_NOTARIAL_V2.md
│   ├── INSTRUCCIONES_NOTIFICATION_CENTER_WHATSAPP.md
│   ├── MEJORAS-PROMPT-GEMINI.md
│   ├── MODULO_FACTURACION_PAGOS.md
│   ├── MODULO_FORMULARIOS_UAFE.md
│   ├── MODULO_QR_ESCRITURAS.md
│   ├── PLAN_FORMULARIO_UAFE_REDACCION_AUTOMATICA.md
│   ├── POR COBRAR26 (1).xls
│   ├── QR Code Generator Sign Up _ My QR Code.html
│   ├── SOLUCION_NEGRITAS_PORTAPAPELES.md
│   ├── SOLUCION-GEMINI-404.md
│   ├── ui-audit.md
│   └── verificar.html
├── frontend
│   ├── docs
│   │   └── XSS-PROTECTION.md
│   ├── public
│   │   ├── logo-notaria18.jpg
│   │   └── vite.svg
│   ├── src
│   │   ├── assets
│   │   │   ├── images
│   │   │   │   ├── logo-gzs-complete.png
│   │   │   │   ├── logo-gzs-initials.png
│   │   │   │   └── logo-gzs-notaria18.png
│   │   │   └── react.svg
│   │   ├── components
│   │   │   ├── admin
│   │   │   │   ├── AdminFormulariosUAFE.jsx
│   │   │   │   ├── AdminSettings.jsx
│   │   │   │   ├── AnalisisUAFE.jsx
│   │   │   │   ├── BulkOperationsDialog.jsx
│   │   │   │   ├── ConfirmDialog.jsx
│   │   │   │   ├── DocumentOversight.jsx
│   │   │   │   ├── DocumentStatusTimeline.jsx
│   │   │   │   ├── EncuestasSatisfaccion.jsx
│   │   │   │   ├── NotificationCenter.jsx
│   │   │   │   ├── NotificationHistory.jsx
│   │   │   │   ├── NotificationSettings.jsx
│   │   │   │   ├── NotificationTemplates.jsx
│   │   │   │   ├── QROversight.jsx
│   │   │   │   ├── UserFormModal.jsx
│   │   │   │   ├── UserManagement.jsx
│   │   │   │   └── WhatsAppTemplates.jsx
│   │   │   ├── alertas
│   │   │   │   ├── AlertaItem.jsx
│   │   │   │   ├── AlertasModal.jsx
│   │   │   │   ├── AlertasPanel.jsx
│   │   │   │   └── ContadorAlertas.jsx
│   │   │   ├── archivo
│   │   │   │   ├── ListaArchivo.jsx
│   │   │   │   ├── NotificationHistory.jsx
│   │   │   │   └── SupervisionGeneral.jsx
│   │   │   ├── billing
│   │   │   │   ├── CarteraCobros.jsx
│   │   │   │   ├── DetalleFactura.jsx
│   │   │   │   ├── EstadoPago.jsx
│   │   │   │   ├── ImportarDatos.jsx
│   │   │   │   ├── ListaFacturas.jsx
│   │   │   │   ├── ListaPagos.jsx
│   │   │   │   └── Reportes.jsx
│   │   │   ├── bulk
│   │   │   │   ├── BulkActionToolbar.jsx
│   │   │   │   ├── BulkDeliveryModal.jsx
│   │   │   │   └── BulkStatusChangeModal.jsx
│   │   │   ├── Documents
│   │   │   │   ├── ActosPanel.jsx
│   │   │   │   ├── ConfirmationModal.jsx
│   │   │   │   ├── DocumentDetailModal.jsx
│   │   │   │   ├── DocumentEditModal.jsx
│   │   │   │   ├── DocumentsList.jsx
│   │   │   │   ├── DocumentTimeline.jsx
│   │   │   │   ├── EditDocumentModal.css
│   │   │   │   ├── EditDocumentModal.jsx
│   │   │   │   ├── ListView.jsx
│   │   │   │   ├── NotificationsHistory.jsx
│   │   │   │   ├── SearchAndFilters.jsx
│   │   │   │   ├── UndoToast.jsx
│   │   │   │   └── WhatsAppPreviewModal.jsx
│   │   │   ├── escrituras
│   │   │   │   ├── PDFPageManagerModal.jsx
│   │   │   │   ├── PDFUploaderModal.jsx
│   │   │   │   ├── PDFUploaderModalV2.jsx
│   │   │   │   └── SecurePDFViewer.jsx
│   │   │   ├── layout
│   │   │   │   ├── CajaLayout.jsx
│   │   │   │   └── Sidebar.jsx
│   │   │   ├── matrizador
│   │   │   │   ├── ExtractedDataForm.jsx
│   │   │   │   ├── GeneradorQR.jsx
│   │   │   │   ├── ManualEscrituraForm.jsx
│   │   │   │   ├── ModalEntregaMatrizador.jsx
│   │   │   │   ├── PDFUploader.jsx
│   │   │   │   └── QRDisplay.jsx
│   │   │   ├── MatrizadorDashboard
│   │   │   │   ├── KPISection.jsx
│   │   │   │   ├── ProgresoGeneral.jsx
│   │   │   │   └── WidgetsAtencion.jsx
│   │   │   ├── notifications
│   │   │   │   ├── ClientNotificationCard.jsx
│   │   │   │   ├── NotificationCenter.jsx
│   │   │   │   └── WhatsAppNotificationModal.jsx
│   │   │   ├── recepcion
│   │   │   │   ├── BulkDeliveryDialog.jsx
│   │   │   │   ├── DocumentosEnProceso.jsx
│   │   │   │   ├── DocumentosListos.jsx
│   │   │   │   ├── DocumentosUnificados.jsx
│   │   │   │   ├── EstadisticasRecepcion.jsx
│   │   │   │   ├── HistorialEntregas.jsx
│   │   │   │   ├── ModalEntrega.jsx
│   │   │   │   ├── NotificationHistory.jsx
│   │   │   │   ├── RecepcionMain.jsx
│   │   │   │   └── ReversionModal.jsx
│   │   │   ├── shared
│   │   │   │   ├── DateRangeFilter.jsx
│   │   │   │   ├── EditDocumentModal.jsx
│   │   │   │   └── UnifiedDocumentCard.jsx
│   │   │   ├── UI
│   │   │   │   ├── LoadMoreButton.jsx
│   │   │   │   └── SearchInput.jsx
│   │   │   ├── .gitkeep
│   │   │   ├── AdminCenter.jsx
│   │   │   ├── AdminLayout.jsx
│   │   │   ├── AdminRoute.jsx
│   │   │   ├── ArchivoCenter.jsx
│   │   │   ├── ArchivoDashboard.jsx
│   │   │   ├── ArchivoLayout.jsx
│   │   │   ├── BatchUpload.jsx
│   │   │   ├── CajaCenter.jsx
│   │   │   ├── CajaDashboard.jsx
│   │   │   ├── CajaStatsDashboard.jsx
│   │   │   ├── ChangePassword.jsx
│   │   │   ├── Dashboard.jsx
│   │   │   ├── DocumentCard.jsx
│   │   │   ├── DocumentCenter.jsx
│   │   │   ├── FormulariosUAFE.jsx
│   │   │   ├── GestionArchivo.jsx
│   │   │   ├── GestionDocumentos.jsx
│   │   │   ├── LoginForm.jsx
│   │   │   ├── MatrizadorCenter.jsx
│   │   │   ├── MatrizadorDashboard.jsx
│   │   │   ├── MatrizadorDashboardNew.jsx
│   │   │   ├── MatrizadorLayout.jsx
│   │   │   ├── ModalDatosRepresentado.jsx
│   │   │   ├── ProtectedRoute.jsx
│   │   │   ├── RecepcionCenter.jsx
│   │   │   ├── RecepcionDashboard.jsx
│   │   │   ├── RecepcionDashboardStats.jsx
│   │   │   ├── RecepcionLayout.jsx
│   │   │   ├── ReceptionCenter.jsx
│   │   │   ├── ResetearPinDialog.jsx
│   │   │   ├── TextosNotarialesPanel.jsx
│   │   │   ├── ThemeToggle.jsx
│   │   │   ├── Topbar.jsx
│   │   │   ├── UploadXML.jsx
│   │   │   ├── VistaPreviewFormulario.jsx
│   │   │   └── XmlUploadCenter.jsx
│   │   ├── config
│   │   │   ├── featureFlags.js
│   │   │   ├── nav-items.js
│   │   │   └── theme.js
│   │   ├── contexts
│   │   │   └── theme-ctx.jsx
│   │   ├── hooks
│   │   │   ├── .gitkeep
│   │   │   ├── use-auth.js
│   │   │   ├── useBulkActions.js
│   │   │   ├── useDebounce.js
│   │   │   ├── useDocumentHistory.js
│   │   │   ├── useDocuments.js
│   │   │   ├── usePagination.js
│   │   │   └── useStats.js
│   │   ├── pages
│   │   │   ├── .gitkeep
│   │   │   ├── DashboardPage.jsx
│   │   │   ├── LoginPage.jsx
│   │   │   ├── RecepcionPage.jsx
│   │   │   └── VerificacionPublica.jsx
│   │   ├── services
│   │   │   ├── .giteep
│   │   │   ├── admin-dashboard-service.js
│   │   │   ├── admin-notifications.js
│   │   │   ├── admin-service.js
│   │   │   ├── admin-supervision-service.js
│   │   │   ├── api-client.js
│   │   │   ├── archivo-service.js
│   │   │   ├── auth-service.js
│   │   │   ├── billing-service.js
│   │   │   ├── csrf-service.js
│   │   │   ├── document-service.js
│   │   │   ├── escrituras-qr-service.js
│   │   │   ├── notification-service.js
│   │   │   ├── notifications-service.js
│   │   │   └── reception-service.js
│   │   ├── store
│   │   │   ├── .gitkeep
│   │   │   ├── auth-store.js
│   │   │   ├── document-store.js
│   │   │   ├── receptions-store.js
│   │   │   ├── theme-store.js
│   │   │   └── unified-documents-store.js
│   │   ├── utils
│   │   │   ├── .gitkeep
│   │   │   ├── apiConfig.js
│   │   │   ├── currencyUtils.js
│   │   │   ├── dateUtils.js
│   │   │   ├── sanitize.jsx
│   │   │   ├── scrollUtils.js
│   │   │   ├── storage.js
│   │   │   └── whatsappUtils.js
│   │   ├── App.css
│   │   ├── App.jsx
│   │   ├── index.css
│   │   └── main.jsx
│   ├── .env.example
│   ├── .env.production
│   ├── .env.railway.example
│   ├── .gitignore
│   ├── AGREGAR_LOGO.md
│   ├── eslint.config.js
│   ├── index.html
│   ├── nixpacks.toml
│   ├── notaria-segura-frontend@1.0.0
│   ├── package.json
│   ├── README.md
│   ├── vite
│   └── vite.config.js
├── prisma
│   └── migrations
│       └── 20251118000000_add_performance_indexes
│           └── migration.sql
├── public-forms
│   ├── encuesta-satisfaccion-README.md
│   ├── encuesta-satisfaccion.html
│   ├── formulario-uafe.html
│   ├── README.md
│   └── registro-personal.html
├── qa
│   └── reports
│       ├── env-audit.json
│       ├── env-audit.md
│       ├── env-cleanup-plan.md
│       └── security-audit-2026-01-06.md
├── scripts
│   ├── auditoria-secuencias
│   │   ├── .env
│   │   ├── .env.example
│   │   ├── config.js
│   │   ├── index.js
│   │   ├── package-lock.json
│   │   ├── package.json
│   │   ├── README.md
│   │   └── reporte_auditoria_secuencias_20260114_162425.xlsx
│   ├── limpieza-estados
│   │   ├── .env
│   │   ├── .env.example
│   │   ├── cambios_2026-01-15T2002.xlsx
│   │   ├── excepciones.txt
│   │   ├── index.js
│   │   ├── package-lock.json
│   │   ├── package.json
│   │   └── README.md
│   ├── check-xml-structure.js
│   ├── debug-dashboard.js
│   ├── debug-history.js
│   ├── diagnose-deployment.js
│   ├── env-audit.mjs
│   ├── migrate-document-event-types.js
│   ├── recover-invoice-numbers.js
│   ├── recreate-users.js
│   ├── reproduce_pdf_issue.js
│   ├── reset-documents.sql
│   ├── resolve-p3009.sql
│   ├── run-migrations.js
│   ├── setup-production-data.js
│   ├── test-billing-utils.js
│   ├── test-koinor-import.js
│   ├── test-notarial-conversion.js
│   ├── verify-invoice-numbers.js
│   └── verify-production.js
├── services
│   └── pdf-extractor-python
│       ├── .venv
│       │   └── Lib
│       │       └── site-packages
│       │           └── pip
│       │               └── _internal
│       │                   └── operations
│       └── .env.example
├── xml-watcher-service
│   ├── src
│   │   ├── auth.js
│   │   ├── cli.cjs
│   │   ├── config.js
│   │   ├── index.js
│   │   ├── logger.js
│   │   ├── organizer.js
│   │   ├── sequence-tracker.js
│   │   ├── source-watcher.js
│   │   ├── uploader.js
│   │   └── watcher.js
│   ├── build-exe.js
│   ├── config.json
│   ├── ecosystem.config.js
│   ├── install-service.bat
│   ├── package-lock.json
│   ├── package.json
│   └── README.md
├── .deploy-touch
├── .dockerignore
├── .env
├── .env.production
├── .env.staging
├── .env.staging.example
├── .gitignore
├── .node-version
├── .nvmrc
├── .tmp_server.log
├── AGENTS.md
├── backup_prod.dump
├── CONFIGURACION_DOMINIO_QR.md
├── copy-db-to-local.bat
├── copy-db-to-staging.bat
├── cnotaria-segurabackend.env
├── deploy_rw.md
├── DESARROLLO_LOCAL.md
├── docker-compose.yml
├── ESTRUCTURA_PROYECTO.md
├── manual-migration-fix.sql
├── migrate_prod_to_staging.bat
├── nixpacks.toml
├── package-lock.json
├── package.json
├── Procfile
├── prod_backup_20260117.sql
├── prod_backup.sql
├── pués del merge
├── railway.toml
├── README.md
├── start-dev.bat
├── start-dev.sh
├── temp_prod.dump
├── temp_raw_pdf.txt
├── temp_tree_gen.js
└── verification_output.txt
