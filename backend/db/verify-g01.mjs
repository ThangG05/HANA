import dotenv from 'dotenv';
import pg from 'pg';
import { createHash } from 'node:crypto';
import { resolve } from 'node:path';

dotenv.config({ path: resolve(process.cwd(), '../.env') });
const targetUrl = process.env.G01_VERIFY_DATABASE_URL;
if (!process.env.DATABASE_URL || !targetUrl) throw new Error('DATABASE_URL and G01_VERIFY_DATABASE_URL are required');

const queries = {
  columns: `SELECT c.table_name, c.column_name, c.ordinal_position, c.data_type, c.udt_name, c.is_nullable, c.column_default FROM information_schema.columns c WHERE c.table_schema='public' ORDER BY c.table_name, c.ordinal_position`,
  constraints: `SELECT cl.relname AS table_name, con.conname, pg_get_constraintdef(con.oid) AS definition FROM pg_constraint con JOIN pg_class cl ON cl.oid=con.conrelid JOIN pg_namespace n ON n.oid=cl.relnamespace WHERE n.nspname='public' ORDER BY cl.relname, con.conname`,
  indexes: `SELECT t.relname AS table_name, i.relname AS index_name, pg_get_indexdef(i.oid) AS definition FROM pg_index x JOIN pg_class i ON i.oid=x.indexrelid JOIN pg_class t ON t.oid=x.indrelid JOIN pg_namespace n ON n.oid=t.relnamespace WHERE n.nspname='public' ORDER BY t.relname, i.relname`,
  triggers: `SELECT c.relname AS table_name, t.tgname, pg_get_triggerdef(t.oid) AS definition FROM pg_trigger t JOIN pg_class c ON c.oid=t.tgrelid JOIN pg_namespace n ON n.oid=c.relnamespace WHERE n.nspname='public' AND NOT t.tgisinternal ORDER BY c.relname,t.tgname`,
  functions: `SELECT p.proname, pg_get_functiondef(p.oid) AS definition FROM pg_proc p JOIN pg_namespace n ON n.oid=p.pronamespace WHERE n.nspname='public' AND p.proname LIKE 'hana_%' ORDER BY p.proname`,
  views: `SELECT viewname, definition FROM pg_views WHERE schemaname='public' ORDER BY viewname`,
  rls: `SELECT relname, relrowsecurity, relforcerowsecurity FROM pg_class c JOIN pg_namespace n ON n.oid=c.relnamespace WHERE n.nspname='public' AND c.relkind='r' ORDER BY relname`,
  policies: `SELECT tablename, policyname, cmd, roles, qual, with_check FROM pg_policies WHERE schemaname='public' ORDER BY tablename,policyname`,
  roles: `SELECT ma_vai_tro, ten_vai_tro FROM public.vai_tro ORDER BY ma_vai_tro`,
  permissions: `SELECT v.ma_vai_tro, q.doi_tuong,q.hanh_dong,q.pham_vi FROM public.quyen_vai_tro q JOIN public.vai_tro v USING (vai_tro_id) ORDER BY v.ma_vai_tro,q.doi_tuong,q.hanh_dong,q.pham_vi`,
};

async function collect(url) {
  const db = new pg.Client({ connectionString: url });
  try {
    await db.connect();
    await db.query('BEGIN READ ONLY');
    const result = {};
    for (const [name, query] of Object.entries(queries)) {
      const rows = (await db.query(query)).rows;
      result[name] = { count: rows.length, digest: createHash('sha256').update(JSON.stringify(rows)).digest('hex') };
    }
    await db.query('ROLLBACK');
    return result;
  } finally { await db.end(); }
}

const [source, target] = await Promise.all([collect(process.env.DATABASE_URL), collect(targetUrl)]);
let mismatch = false;
for (const name of Object.keys(queries)) {
  const same = source[name].digest === target[name].digest;
  console.log(`${same ? 'OK' : 'DIFF'} ${name}: source=${source[name].count}, target=${target[name].count}`);
  mismatch ||= !same;
}
if (mismatch) process.exitCode = 1;
