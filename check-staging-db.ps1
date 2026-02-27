if (-not $env:DATABASE_URL) {
  Write-Error 'DATABASE_URL no esta configurada.'
  exit 1
}

Push-Location backend

try {
@"
SELECT column_name, data_type
FROM information_schema.columns
WHERE table_name = 'invoices'
  AND column_name IN ('assignedToId', 'matrizador', 'documentId');
"@ | npx prisma db execute --url "$env:DATABASE_URL" --stdin
}
finally {
  Pop-Location
}
