#!/usr/bin/env node
/**
 * Applies the field index overrides in firestore.indexes.json (collection-group indexes for
 * nested tables, see lib/db/layout.ts) using the Admin service account — an alternative to
 * `firebase deploy --only firestore:indexes` that needs no Firebase CLI login.
 *
 *   node --env-file=.env scripts/deploy-firestore-indexes.mjs
 *
 * Index builds run in the background; until one finishes, the app falls back to scanning
 * that collection group, so nothing breaks while they build.
 */
import { readFileSync } from 'node:fs'
import { cert } from 'firebase-admin/app'

const key = JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT_KEY || 'null') ?? {
  project_id: process.env.FIREBASE_PROJECT_ID,
  client_email: process.env.FIREBASE_CLIENT_EMAIL,
  private_key: (process.env.FIREBASE_PRIVATE_KEY || '').replace(/\\n/g, '\n'),
}
const credential = cert({ projectId: key.project_id, clientEmail: key.client_email, privateKey: key.private_key })
const { access_token: token } = await credential.getAccessToken()

const { fieldOverrides = [] } = JSON.parse(readFileSync(new URL('../firestore.indexes.json', import.meta.url), 'utf8'))
const base = `https://firestore.googleapis.com/v1/projects/${key.project_id}/databases/(default)/collectionGroups`

const toIndex = (fieldPath, spec) => ({
  queryScope: spec.queryScope,
  fields: [spec.arrayConfig ? { fieldPath, arrayConfig: spec.arrayConfig } : { fieldPath, order: spec.order }],
})

let failed = 0
for (const override of fieldOverrides) {
  const url = `${base}/${override.collectionGroup}/fields/${override.fieldPath}?updateMask=indexConfig`
  const res = await fetch(url, {
    method: 'PATCH',
    headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({ indexConfig: { indexes: override.indexes.map((spec) => toIndex(override.fieldPath, spec)) } }),
  })
  const label = `${override.collectionGroup}.${override.fieldPath}`.padEnd(40)
  if (res.ok) {
    console.log(`${label} building`)
  } else {
    failed++
    const body = await res.json().catch(() => ({}))
    console.log(`${label} FAILED ${res.status} ${body.error?.message ?? ''}`)
  }
}
console.log(failed ? `\n${failed} override(s) failed` : '\nAll index overrides submitted. Builds finish in a few minutes (Firebase console → Firestore → Indexes → Single field).')
process.exit(failed ? 1 : 0)
