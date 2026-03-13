/**
 * This script documents the raw SQL queries that need notary_id filters.
 * The actual fixes are applied via code edits, not this script.
 *
 * Pattern: After whereSql is built, add:
 *   whereSql = Prisma.sql`${whereSql} AND d.notary_id = ${req.user.notaryId}`;
 *
 * For standalone queries without whereSql, add WHERE notary_id = X directly.
 */
console.log('This is a documentation script. Fixes are applied via code edits.');
