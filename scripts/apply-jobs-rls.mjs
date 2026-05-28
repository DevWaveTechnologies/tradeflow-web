/**
 * Applies RLS insert policies on public.jobs via Supabase Management API.
 *
 * 1. Create a token: https://supabase.com/dashboard/account/tokens
 * 2. Add to .env: SUPABASE_ACCESS_TOKEN=sbp_...
 * 3. Run: node scripts/apply-jobs-rls.mjs
 */

import { readFileSync } from 'fs'
import { fileURLToPath } from 'url'
import { dirname, join } from 'path'

const projectRef = 'gdhcanxkffzqfgoiuwji'

function loadEnv() {
  try {
    const envPath = join(dirname(fileURLToPath(import.meta.url)), '..', '.env')
    const raw = readFileSync(envPath, 'utf8')
    for (const line of raw.split('\n')) {
      const match = line.match(/^([^#=]+)=(.*)$/)
      if (match) process.env[match[1].trim()] = match[2].trim()
    }
  } catch {
    // .env optional if token is already in environment
  }
}

loadEnv()

const token = process.env.SUPABASE_ACCESS_TOKEN
if (!token) {
  console.error(
    'Missing SUPABASE_ACCESS_TOKEN.\n' +
      'Create one at https://supabase.com/dashboard/account/tokens\n' +
      'Then add to .env: SUPABASE_ACCESS_TOKEN=sbp_...',
  )
  process.exit(1)
}

const sql = `
DROP POLICY IF EXISTS "Allow anon insert on jobs" ON public.jobs;
DROP POLICY IF EXISTS "Allow authenticated insert on jobs" ON public.jobs;

CREATE POLICY "Allow anon insert on jobs"
ON public.jobs
FOR INSERT
TO anon
WITH CHECK (true);

CREATE POLICY "Allow authenticated insert on jobs"
ON public.jobs
FOR INSERT
TO authenticated
WITH CHECK (true);
`.trim()

const res = await fetch(
  `https://api.supabase.com/v1/projects/${projectRef}/database/query`,
  {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ query: sql }),
  },
)

const body = await res.text()
if (!res.ok) {
  console.error('Failed:', res.status, body)
  process.exit(1)
}

console.log('RLS policies applied successfully.')
console.log(body)
