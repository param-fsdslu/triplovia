#!/usr/bin/env node
/**
 * One-time copy of the Supabase project into Firebase.
 *
 *   node --env-file=.env scripts/migrate-supabase-to-firebase.mjs --dry-run
 *   node --env-file=.env scripts/migrate-supabase-to-firebase.mjs
 *   node --env-file=.env scripts/migrate-supabase-to-firebase.mjs --only=users --password-hashes=hashes.json
 *   add --reset to delete ALL existing Firestore data first (e.g. after a layout change)
 *
 * Steps (each re-runnable; documents are overwritten, not duplicated):
 *   tables   every table in lib/db/schema.ts → Firestore (same ids), using the layout in
 *            lib/db/layout.ts: child tables are subcollections of their parent row
 *            (hotels/{id}/room_types/{id}/room_type_images/{id}). Also writes the `_unique`
 *            sentinel docs the data layer uses for unique constraints. Supabase Storage URLs
 *            inside rows (image_url, blog HTML, …) are rewritten to Firebase.
 *   users    auth.users → Firebase Auth (same uid, so user_id columns stay valid) and the
 *            `_auth_users` collection (user_metadata with roles, timestamps).
 *            Supabase's admin API does not expose password hashes. To keep passwords, export
 *            them in the Supabase SQL editor and pass the file with --password-hashes:
 *              select json_agg(json_build_object('id', id, 'hash', encrypted_password))
 *              from auth.users;
 *            Without it, users sign in again via "Forgot password".
 *   storage  every object in every Supabase bucket → Firebase Storage at <bucket>/<path>
 *
 * Needs: NEXT_PUBLIC_SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY and the Firebase Admin
 * credentials the app uses (see lib/firebase/admin.ts).
 */
import { createHash } from 'node:crypto'
import { readFileSync } from 'node:fs'
import { cert, initializeApp } from 'firebase-admin/app'
import { getAuth } from 'firebase-admin/auth'
import { getFirestore } from 'firebase-admin/firestore'
import { getStorage } from 'firebase-admin/storage'
import { TABLES } from '../lib/db/schema.ts'

const args = Object.fromEntries(
  process.argv.slice(2).map((arg) => {
    const [key, value] = arg.replace(/^--/, '').split('=')
    return [key, value ?? true]
  })
)
const DRY_RUN = Boolean(args['dry-run'])
const STEPS = args.only ? String(args.only).split(',') : ['tables', 'users', 'storage']

const SUPABASE_URL = (process.env.NEXT_PUBLIC_SUPABASE_URL || '').replace(/\/$/, '')
const SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY
if (!SUPABASE_URL || !SERVICE_KEY) {
  console.error('NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY are required')
  process.exit(1)
}

/* --------------------------------- firebase -------------------------------- */

function firebaseCredential() {
  if (process.env.FIREBASE_SERVICE_ACCOUNT_KEY) {
    const parsed = JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT_KEY)
    return cert({ projectId: parsed.project_id, clientEmail: parsed.client_email, privateKey: parsed.private_key.replace(/\\n/g, '\n') })
  }
  const projectId = process.env.FIREBASE_PROJECT_ID || process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID
  return cert({
    projectId,
    clientEmail: process.env.FIREBASE_CLIENT_EMAIL,
    privateKey: (process.env.FIREBASE_PRIVATE_KEY || '').replace(/\\n/g, '\n'),
  })
}

const BUCKET = process.env.FIREBASE_STORAGE_BUCKET || process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET
let firebase = null
function fb() {
  if (!firebase) {
    const app = initializeApp({ credential: firebaseCredential(), storageBucket: BUCKET })
    const db = getFirestore(app)
    db.settings({ ignoreUndefinedProperties: true })
    firebase = { db, auth: getAuth(app), bucket: getStorage(app).bucket(BUCKET) }
  }
  return firebase
}

/* --------------------------------- supabase -------------------------------- */

const supabaseHeaders = { apikey: SERVICE_KEY, Authorization: `Bearer ${SERVICE_KEY}` }

async function supabaseJson(path, init = {}) {
  const res = await fetch(`${SUPABASE_URL}${path}`, { ...init, headers: { ...supabaseHeaders, ...(init.headers || {}) } })
  if (!res.ok) throw new Error(`${init.method || 'GET'} ${path} → ${res.status} ${await res.text()}`)
  return res
}

async function countRows(table) {
  const res = await supabaseJson(`/rest/v1/${table}?select=*`, { method: 'HEAD', headers: { Prefer: 'count=exact' } })
  return Number((res.headers.get('content-range') || '*/0').split('/')[1])
}

async function* fetchRows(table, pageSize = 1000) {
  for (let from = 0; ; from += pageSize) {
    const res = await supabaseJson(`/rest/v1/${table}?select=*`, {
      headers: { Range: `${from}-${from + pageSize - 1}`, 'Range-Unit': 'items' },
    })
    const rows = await res.json()
    yield* rows
    if (rows.length < pageSize) return
  }
}

/* ------------------------------ value transforms ---------------------------- */

const storageUrlPattern = new RegExp(
  `${SUPABASE_URL.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}/storage/v1/object/public/([^/"'\\s?]+)/([^"'\\s?)]+)(\\?[^"'\\s)]*)?`,
  'g'
)

function firebaseUrl(objectPath) {
  return `https://firebasestorage.googleapis.com/v0/b/${BUCKET}/o/${encodeURIComponent(objectPath)}?alt=media`
}

function rewriteUrls(value) {
  if (typeof value === 'string') {
    return value.replace(storageUrlPattern, (_m, bucket, path) => firebaseUrl(`${bucket}/${decodeURIComponent(path)}`))
  }
  if (Array.isArray(value)) return value.map(rewriteUrls)
  if (value && typeof value === 'object') {
    return Object.fromEntries(Object.entries(value).map(([k, v]) => [k, rewriteUrls(v)]))
  }
  return value
}

/** Same document format as lib/db/values.ts encodeRow (NULL columns are left out) */
function toDocument(table, row) {
  const columns = TABLES[table].columns
  const doc = {}
  for (const [key, raw] of Object.entries(row)) {
    const value = rewriteUrls(raw)
    const type = columns[key]?.type
    if (value === null || value === undefined) continue
    else if (type === 'json') doc[key] = JSON.stringify(value)
    else if ((type === 'timestamptz' || type === 'timestamp') && typeof value === 'string') doc[key] = new Date(value).toISOString()
    else if ((type === 'numeric' || type === 'int') && typeof value === 'string') doc[key] = Number(value)
    else doc[key] = value
  }
  return doc
}

/** Same ids as lib/db/mutations.ts uniqueKeys */
function uniqueSentinels(table, doc) {
  const out = []
  for (const columns of TABLES[table].unique) {
    const values = columns.map((c) => doc[c])
    if (values.some((v) => v === null || v === undefined)) continue
    const hash = createHash('sha256').update(JSON.stringify(values)).digest('hex').slice(0, 40)
    out.push({
      id: `${table}__${columns.join('+')}__${hash}`,
      data: { table, row_id: String(doc[TABLES[table].pk]), columns, created_at: new Date().toISOString() },
    })
  }
  return out
}

/* ---------------------------------- steps ---------------------------------- */

async function resetFirestore() {
  console.log('\n== reset: deleting all existing Firestore data ==')
  for (const collection of await fb().db.listCollections()) {
    await fb().db.recursiveDelete(collection)
    console.log(`deleted ${collection.id}`)
  }
}

async function migrateTables() {
  console.log('\n== tables ==')
  if (DRY_RUN) {
    let total = 0
    for (const table of Object.keys(TABLES).sort()) {
      const count = await countRows(table).catch((e) => `error: ${e.message}`)
      console.log(`${table.padEnd(28)} ${count}`)
      if (typeof count === 'number') total += count
    }
    console.log(`total rows: ${total}`)
    return
  }

  // Load everything first: a child's path needs its parent's path (same rules as lib/db/layout.ts)
  const docsByTable = new Map()
  for (const table of Object.keys(TABLES)) {
    const docs = new Map()
    for await (const row of fetchRows(table)) {
      const doc = toDocument(table, row)
      docs.set(String(doc[TABLES[table].pk]), doc)
    }
    docsByTable.set(table, docs)
  }

  const pathCache = new Map()
  function pathFor(table, doc) {
    const id = String(doc[TABLES[table].pk])
    const cacheKey = `${table}/${id}`
    if (pathCache.has(cacheKey)) return pathCache.get(cacheKey)
    const parent = TABLES[table].parent
    let path = null
    if (!parent) {
      path = `${table}/${id}`
    } else {
      const parentDoc = docsByTable.get(parent.table).get(String(doc[parent.column]))
      const parentPath = parentDoc ? pathFor(parent.table, parentDoc) : null
      if (parentPath) path = `${parentPath}/${table}/${id}`
    }
    pathCache.set(cacheKey, path)
    return path
  }

  const writer = fb().db.bulkWriter()
  let total = 0
  for (const table of Object.keys(TABLES).sort()) {
    let n = 0
    for (const doc of docsByTable.get(table).values()) {
      const path = pathFor(table, doc)
      if (!path) {
        console.warn(`  skipped ${table}/${doc[TABLES[table].pk]}: parent row not found`)
        continue
      }
      writer.set(fb().db.doc(path), doc)
      for (const s of uniqueSentinels(table, doc)) writer.set(fb().db.collection('_unique').doc(s.id), s.data)
      n++
    }
    total += n
    if (n > 0) console.log(`${table.padEnd(28)} ${n} rows${TABLES[table].parent ? `  (under ${TABLES[table].parent.table})` : ''}`)
  }
  await writer.close()
  console.log(`total rows: ${total}`)
}

async function fetchAllUsers() {
  const users = []
  for (let page = 1; ; page++) {
    const res = await supabaseJson(`/auth/v1/admin/users?page=${page}&per_page=1000`)
    const body = await res.json()
    const batch = body.users ?? []
    users.push(...batch)
    if (batch.length < 1000) return users
  }
}

async function migrateUsers() {
  console.log('\n== users ==')
  if (DRY_RUN) {
    const res = await supabaseJson('/auth/v1/admin/users?page=1&per_page=1')
    console.log(`supabase users: ${res.headers.get('x-total-count') ?? 'unknown'}`)
    return
  }
  const users = await fetchAllUsers()
  console.log(`supabase users: ${users.length}`)

  const hashes = new Map()
  if (args['password-hashes']) {
    const rows = JSON.parse(readFileSync(String(args['password-hashes']), 'utf8'))
    for (const r of rows) if (r.hash) hashes.set(r.id, r.hash)
    console.log(`password hashes loaded: ${hashes.size}`)
  }

  const records = users.map((u) => {
    const record = {
      uid: u.id,
      email: u.email,
      emailVerified: Boolean(u.email_confirmed_at),
      displayName: u.user_metadata?.full_name || undefined,
    }
    const hash = hashes.get(u.id)
    if (hash) record.passwordHash = Buffer.from(hash)
    return record
  })

  for (let i = 0; i < records.length; i += 1000) {
    const batch = records.slice(i, i + 1000)
    const withHash = batch.filter((r) => r.passwordHash)
    const withoutHash = batch.filter((r) => !r.passwordHash)
    if (withHash.length) {
      const result = await fb().auth.importUsers(withHash, { hash: { algorithm: 'BCRYPT' } })
      result.errors.forEach((e) => console.error(`  import failed for ${withHash[e.index].email}: ${e.error.message}`))
    }
    if (withoutHash.length) {
      const result = await fb().auth.importUsers(withoutHash)
      result.errors.forEach((e) => console.error(`  import failed for ${withoutHash[e.index].email}: ${e.error.message}`))
    }
  }

  const writer = fb().db.bulkWriter()
  for (const u of users) {
    const ts = (v) => (v ? new Date(v).toISOString() : null)
    const meta = u.user_metadata ?? {}
    writer.set(fb().db.collection('_auth_users').doc(u.id), {
      id: u.id,
      email: u.email ? u.email.toLowerCase() : null,
      user_metadata: meta,
      app_metadata: u.app_metadata ?? {},
      created_at: ts(u.created_at),
      updated_at: ts(u.updated_at) ?? ts(u.created_at),
      last_sign_in_at: ts(u.last_sign_in_at),
      email_confirmed_at: ts(u.email_confirmed_at),
    })

    // Profile row like lib/firebase/auth/users.ts syncProfile (the Supabase trigger
    // never backfilled existing users, so profiles may be missing). Merge keeps any
    // profile data copied by the tables step.
    const first = meta.first_name || null
    const last = meta.last_name || null
    const profile = {
      id: u.id,
      email: u.email ?? null,
      role: meta.role ?? null,
      hotel_ids: meta.hotel_ids ? JSON.stringify(meta.hotel_ids) : null,
      created_at: ts(u.created_at),
      updated_at: ts(u.updated_at) ?? ts(u.created_at),
    }
    if (first) profile.first_name = first
    if (last) profile.last_name = last
    if (first || last) profile.full_name = first && last ? `${first} ${last}` : first || last
    for (const key of Object.keys(profile)) if (profile[key] === null) delete profile[key]
    writer.set(fb().db.collection('profiles').doc(u.id), profile, { merge: true })
  }
  await writer.close()
  console.log(`imported ${users.length} users (${hashes.size ? 'with' : 'without'} passwords)`)
}

async function listObjects(bucket, prefix = '') {
  const out = []
  for (let offset = 0; ; offset += 1000) {
    const res = await supabaseJson(`/storage/v1/object/list/${bucket}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ prefix, limit: 1000, offset, sortBy: { column: 'name', order: 'asc' } }),
    })
    const entries = await res.json()
    for (const entry of entries) {
      const path = prefix ? `${prefix}/${entry.name}` : entry.name
      if (entry.id === null) out.push(...(await listObjects(bucket, path))) // folder
      else out.push({ path, contentType: entry.metadata?.mimetype })
    }
    if (entries.length < 1000) return out
  }
}

async function migrateStorage() {
  console.log('\n== storage ==')
  const buckets = await (await supabaseJson('/storage/v1/bucket')).json()
  for (const { name: bucket } of buckets) {
    const objects = await listObjects(bucket)
    if (DRY_RUN) {
      console.log(`${bucket.padEnd(20)} ${objects.length} objects`)
      continue
    }
    let copied = 0
    for (const obj of objects) {
      const res = await supabaseJson(`/storage/v1/object/${bucket}/${obj.path.split('/').map(encodeURIComponent).join('/')}`)
      const body = Buffer.from(await res.arrayBuffer())
      await fb().bucket.file(`${bucket}/${obj.path}`).save(body, {
        resumable: false,
        contentType: obj.contentType || res.headers.get('content-type') || 'application/octet-stream',
        metadata: { cacheControl: 'public, max-age=3600' },
      })
      copied++
    }
    console.log(`${bucket.padEnd(20)} ${copied} objects copied`)
  }
}

console.log(`Supabase ${SUPABASE_URL} → Firebase ${BUCKET ?? '(bucket not set)'}${DRY_RUN ? '  [dry run: counting only]' : ''}`)
if (args.reset && !DRY_RUN) await resetFirestore()
if (STEPS.includes('tables')) await migrateTables()
if (STEPS.includes('users')) await migrateUsers()
if (STEPS.includes('storage')) await migrateStorage()
console.log('\nDone.')
