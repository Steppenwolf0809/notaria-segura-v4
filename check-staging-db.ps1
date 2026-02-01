$env:DATABASE_URL="postgresql://postgres:vzdzHHIVerdjgzWlmfARWiSsbTBSJfvw@gondola.proxy.rlwy.net:39316/railway"
cd backend
npx prisma db execute --url "$env:DATABASE_URL" --stdin <<'SQL'
SELECT column_name, data_type 
FROM information_schema.columns 
WHERE table_name = 'invoices' 
AND column_name IN ('assignedToId', 'matrizador', 'documentId');
SQL
