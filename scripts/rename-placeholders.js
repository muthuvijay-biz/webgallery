#!/usr/bin/env node
/*
  Migration: rename stored placeholders so storedName === displayName
  - Dry-run by default. Use --apply to perform changes.
  - Supports local filesystem (public/uploads) and Supabase (if USE_SUPABASE=true).
  - Will rename <name>.link -> <sanitized(displayName)> and move companion JSON too.
*/

const fs = require('fs').promises;
const path = require('path');
const { createClient } = require('@supabase/supabase-js');

const TYPES = ['images', 'videos', 'documents', 'audios'];
const ROOT = path.join(process.cwd(), 'public', 'uploads');
const USE_SUPABASE = String(process.env.USE_SUPABASE || 'false').toLowerCase() === 'true';
const SUPABASE_URL = process.env.SUPABASE_URL || '';
const SUPABASE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_SERVICE_ROLE || process.env.SUPABASE_SECRET_KEY || process.env.SUPABASE_SECRET || '';
const BUCKET = process.env.SUPABASE_BUCKET || '';

const sanitize = (s) => String(s || '').trim().replace(/[^a-zA-Z0-9.\-_]/g, '_') || `file_${Date.now()}`;

async function localDryRun() {
  const ops = [];
  for (const type of TYPES) {
    const dir = path.join(ROOT, type);
    try {
      await fs.access(dir);
    } catch (e) {
      continue;
    }
    const names = await fs.readdir(dir);
    for (const name of names) {
      if (name.endsWith('.json')) continue;
      if (!name.toLowerCase().endsWith('.link')) continue;
      const base = name.replace(/\.link$/i, '');
      const jsonPath = path.join(dir, `${name}.json`);
      let displayName = base;
      try {
        const j = await fs.readFile(jsonPath, 'utf8').then(JSON.parse).catch(() => null);
        if (j && j.displayName) displayName = String(j.displayName).trim();
      } catch (e) {}
      const newStored = sanitize(displayName);
      if (newStored === base) continue; // already matches
      ops.push({ mode: 'local', type, oldName: name, newName: newStored, jsonExists: Boolean(await fileExists(jsonPath)) });
    }
  }
  return ops;
}

async function localApply(ops) {
  for (const op of ops) {
    const dir = path.join(ROOT, op.type);
    const oldPath = path.join(dir, op.oldName);
    const oldJson = path.join(dir, `${op.oldName}.json`);
    const newPath = path.join(dir, op.newName);
    const newJson = path.join(dir, `${op.newName}.json`);

    // ensure target doesn't exist; if it does, append suffix
    let finalNewPath = newPath;
    let finalNewJson = newJson;
    let idx = 1;
    while (await fileExists(finalNewPath)) {
      finalNewPath = `${newPath}_${idx}`;
      finalNewJson = `${finalNewPath}.json`;
      idx++;
    }

    await fs.rename(oldPath, finalNewPath);
    if (await fileExists(oldJson)) {
      await fs.rename(oldJson, finalNewJson);
    }
    console.log(`RENAMED local: ${op.type}/${op.oldName} -> ${path.basename(finalNewPath)}`);
  }
}

async function fileExists(p) {
  try { await fs.access(p); return true; } catch (e) { return false; }
}

async function supabaseDryRun() {
  if (!SUPABASE_URL || !SUPABASE_KEY || !BUCKET) return [];
  const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);
  const ops = [];
  for (const type of TYPES) {
    const { data, error } = await supabase.storage.from(BUCKET).list(type, { limit: 1000 });
    if (error) continue;
    for (const item of data || []) {
      if (!item.name.toLowerCase().endsWith('.link')) continue;
      // fetch companion JSON (if any)
      let displayName = item.name.replace(/\.link$/i, '');
      try {
        const jsonPath = `${type}/${item.name}.json`;
        const { data: jsonSigned, error: jsonErr } = await supabase.storage.from(BUCKET).createSignedUrl(jsonPath, 60);
        if (!jsonErr && jsonSigned?.signedUrl) {
          const r = await fetch(jsonSigned.signedUrl);
          if (r.ok) {
            const j = await r.json().catch(() => null);
            if (j && j.displayName) displayName = String(j.displayName).trim();
          }
        }
      } catch (e) {}
      const newStored = sanitize(displayName);
      const base = item.name.replace(/\.link$/i, '');
      if (newStored === base) continue;
      ops.push({ mode: 'supabase', type, oldName: item.name, newName: newStored, jsonExists: true /* assume possible*/ });
    }
  }
  return ops;
}

async function supabaseApply(ops) {
  const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);
  for (const op of ops) {
    const oldPath = `${op.type}/${op.oldName}`;
    const newPath = `${op.type}/${op.newName}`;
    // download old file via signed URL
    const { data: signed, error: signErr } = await supabase.storage.from(BUCKET).createSignedUrl(oldPath, 60);
    if (signErr || !signed?.signedUrl) {
      console.warn('skip (no signed url):', oldPath);
      continue;
    }
    try {
      const res = await fetch(signed.signedUrl);
      if (!res.ok) { console.warn('skip download failed:', oldPath); continue; }
      const arr = await res.arrayBuffer();
      const buffer = Buffer.from(arr);
      // upload to new path
      const { error: upErr } = await supabase.storage.from(BUCKET).upload(newPath, buffer, { upsert: false });
      if (upErr) { console.warn('upload failed:', newPath, upErr); continue; }
      // migrate companion JSON if exists
      const oldJsonPath = `${oldPath}.json`;
      const { data: jsonSigned, error: jsonErr } = await supabase.storage.from(BUCKET).createSignedUrl(oldJsonPath, 60);
      if (!jsonErr && jsonSigned?.signedUrl) {
        const r2 = await fetch(jsonSigned.signedUrl);
        if (r2.ok) {
          const jsonBuf = await r2.arrayBuffer();
          const uploaded = await supabase.storage.from(BUCKET).upload(`${newPath}.json`, Buffer.from(jsonBuf), { upsert: false });
          if (uploaded.error) console.warn('json upload failed for', newPath);
        }
      }
      // remove old file + json
      await supabase.storage.from(BUCKET).remove([oldPath]).catch(() => {});
      await supabase.storage.from(BUCKET).remove([`${oldPath}.json`]).catch(() => {});
      console.log(`RENAMED supabase: ${oldPath} -> ${newPath}`);
    } catch (e) {
      console.warn('error migrating', oldPath, e.message || e);
    }
  }
}

(async function main() {
  const args = process.argv.slice(2);
  const apply = args.includes('--apply');
  console.log('Rename placeholders migration — dry-run by default');
  if (USE_SUPABASE) console.log('Mode: SUPABASE'); else console.log('Mode: local filesystem');

  const localOps = await localDryRun();
  const supaOps = USE_SUPABASE ? await supabaseDryRun() : [];
  const ops = [...localOps, ...supaOps];

  if (ops.length === 0) {
    console.log('No placeholder renames required.');
    process.exit(0);
  }

  console.log(`Found ${ops.length} candidate(s) to rename:`);
  ops.forEach((o, i) => {
    console.log(`${i + 1}. [${o.mode}] ${o.type}: ${o.oldName} -> ${o.newName}${o.jsonExists ? ' (+json)' : ''}`);
  });

  if (!apply) {
    console.log('\nDry-run complete. To apply these changes run:');
    console.log('  NODE_ENV=production pnpm migrate:rename-placeholders --apply');
    process.exit(0);
  }

  console.log('\nApplying changes...');
  try {
    if (localOps.length) await localApply(localOps);
    if (supaOps.length) await supabaseApply(supaOps);
    console.log('\nMigration complete. Please revalidate or restart the app to see updates.');
  } catch (e) {
    console.error('Migration failed:', e);
    process.exit(1);
  }
})();
