/**
 * Adds sample travel posts for the city-based Journal: two about Honnavar, two about Bhatkal,
 * each with a featured photo uploaded to the site's image storage (Bunny CDN when BUNNY_* is set,
 * else Firebase Storage, like the admin panel's blog uploads). It goes through the app's data
 * layer, so defaults and unique keys match what the admin panel writes.
 *
 *   npm run seed:blogs                add or refresh the sample posts (safe to re-run)
 *   npm run seed:blogs -- --remove    delete them and their photos again
 *   npm run seed:blogs -- --dry-run   check the posts against an in-memory store; writes and uploads nothing
 *
 * The posts are published, so they show on the live site (homepage stories, /blog). The photos
 * are illustrative stock shots (the Honnavar coastline in scripts/assets and Unsplash images):
 * swap in real photos of each place, or remove the posts, before relying on them.
 */
import { readFile } from 'node:fs/promises'
import path from 'node:path'
import { DbClient } from '../lib/db/client'
import { FirestoreStore } from '../lib/db/firestore-store'
import { MemoryStore, type DocStore } from '../lib/db/store'
import type { DbResponse } from '../lib/db/types'
import { adminBucket, adminFirestore, storageBucketName } from '../lib/firebase/admin'
import { bunnyStorageConfig } from '../lib/bunny/config'
import { bunnyPublicUrl, bunnyRemove, bunnyUpload } from '../lib/bunny/storage'

const args = new Set(process.argv.slice(2))
const DRY_RUN = args.has('--dry-run')
const REMOVE = args.has('--remove')

const FOLDER = 'blog-images'
const unsplash = (id: string) => `https://images.unsplash.com/${id}?fm=jpg&fit=crop&w=1600&q=80`

interface SamplePost {
  /** Fixed, so re-running updates the same documents instead of adding copies */
  id: string
  slug: string
  title: string
  city: string
  tags: string[]
  excerpt: string
  /** A file in /public or an https URL */
  photo: string
  /** Under blog-images/ */
  photoPath: string
  daysAgo: number
  content: string
}

const POSTS: SamplePost[] = [
  {
    id: 'b10c0000-0000-4000-8000-000000000001',
    slug: 'honnavar-travel-guide',
    title: 'Honnavar Travel Guide: Beaches, Backwaters and Waterfalls',
    city: 'Honnavar',
    tags: ['Honnavar', 'Guide'],
    excerpt:
      'Where the Sharavathi river meets the Arabian Sea: quiet beaches, backwater boat rides and waterfalls, all within an easy drive of Honnavar.',
    photo: 'scripts/assets/honnavar-coast.jpg', // public/images/hero-background.png at 1600px
    photoPath: 'samples/honnavar-travel-guide.jpg',
    daysAgo: 1,
    content: `
<p>Honnavar is a quiet coastal town in Uttara Kannada, Karnataka, where the Sharavathi river meets the Arabian Sea. It makes an easy base for long beaches, slow boat rides on the river and day trips into the Western Ghats.</p>
<h2>Beaches</h2>
<ul>
  <li><strong>Kasarkod Eco Beach</strong>: a long, clean stretch of sand lined with casuarina trees, and one of India's Blue Flag beaches.</li>
  <li><strong>Apsarakonda</strong>: a small waterfall and a hilltop viewpoint a short walk from a rocky beach, lovely around sunset.</li>
  <li><strong>The river mouth</strong>: watch the fishing boats come in at dusk where the Sharavathi meets the sea.</li>
</ul>
<h2>Backwaters</h2>
<p>Boat rides on the Sharavathi wind past mangroves, river islands and fishing villages. Go early in the morning or late in the afternoon, when the light is soft and the birds are out.</p>
<h2>Day trips</h2>
<ul>
  <li><strong>Idagunji</strong>: the Mahaganapati temple, a short drive inland.</li>
  <li><strong>Jog Falls</strong>: the Sharavathi's famous falls in the Western Ghats, best after the monsoon.</li>
  <li><strong>Murudeshwar and Gokarna</strong>: temple towns and beaches to the south and north along the coast.</li>
</ul>
<h2>When to go</h2>
<p>October to March brings calm seas and pleasant days. The monsoon (June to September) turns everything green and fills the waterfalls, but beaches and boat trips may close.</p>
<h2>Getting there</h2>
<p>Honnavar is on the Konkan Railway and on NH 66, the coastal highway. The nearest airports are Mangaluru and Goa, each a few hours' drive away.</p>`,
  },
  {
    id: 'b10c0000-0000-4000-8000-000000000002',
    slug: 'sharavathi-backwaters-boat-ride-honnavar',
    title: 'A Slow Boat Ride on the Sharavathi Backwaters',
    city: 'Honnavar',
    tags: ['Honnavar', 'Backwaters'],
    excerpt:
      'Mangroves, river islands and fishing villages: what to expect on a boat ride up the Sharavathi from Honnavar, and how to plan it.',
    photo: unsplash('photo-1602216056096-3b40cc0c9944'),
    photoPath: 'samples/sharavathi-backwaters-boat-ride.jpg',
    daysAgo: 3,
    content: `
<p>The Sharavathi slows down as it nears Honnavar, spreading into calm backwaters between coconut groves and mangroves. A boat ride here is one of the most relaxing ways to spend a morning on this coast.</p>
<h2>What you'll see</h2>
<ul>
  <li>Mangrove channels and small river islands</li>
  <li>Fishing villages, nets drying in the sun and canoes heading out</li>
  <li>Kingfishers, egrets and, if you're lucky, a sea eagle overhead</li>
</ul>
<h2>Planning your ride</h2>
<ul>
  <li><strong>Timing</strong>: early morning or late afternoon, for soft light and cooler air.</li>
  <li><strong>Season</strong>: October to May. Rides may stop during the monsoon when the river runs high.</li>
  <li><strong>Booking</strong>: ask your stay to arrange a trusted local boat, and make sure life jackets are on board.</li>
  <li><strong>Carry</strong>: a hat, sunscreen, water, and a zip bag for your phone.</li>
</ul>
<p>Pair the ride with a sunset at Kasarkod Eco Beach for an easy, unhurried day in Honnavar.</p>`,
  },
  {
    id: 'b10c0000-0000-4000-8000-000000000003',
    slug: 'bhatkal-travel-guide',
    title: 'Bhatkal Travel Guide: Temples, Beaches and Bhatkali Biryani',
    city: 'Bhatkal',
    tags: ['Bhatkal', 'Guide'],
    excerpt:
      'Old stone temples, quiet beaches, Murudeshwar next door and the famous Bhatkali biryani: a short guide to Bhatkal.',
    photo: unsplash('photo-1507525428034-b723cf961d3e'),
    photoPath: 'samples/bhatkal-travel-guide.jpg',
    daysAgo: 2,
    content: `
<p>Bhatkal is an old port town in Uttara Kannada, south of Honnavar, with centuries of trading history, carved stone temples and a food culture all its own.</p>
<h2>Temples and heritage</h2>
<p>Walk through the old town to see stone temples such as the Khetapai Narayana temple, known for its carvings, and the Jain Chandranatheshwara basadi.</p>
<h2>Beaches and the sea</h2>
<ul>
  <li><strong>Bhatkal's beaches</strong>: quiet and uncrowded, best at sunrise and sunset.</li>
  <li><strong>Murudeshwar</strong>: a short drive north, with its giant Shiva statue and temple tower right on the shore.</li>
  <li><strong>Netrani Island</strong>: boats from Murudeshwar take divers and snorkellers out to its coral reefs (season permitting).</li>
</ul>
<h2>What to eat</h2>
<p>Bhatkal is the home of Navayath cooking, and <strong>Bhatkali biryani</strong> is the dish to try. Fresh seafood is everywhere along this coast.</p>
<h2>Getting there</h2>
<p>Bhatkal has a station on the Konkan Railway and sits on NH 66. Honnavar is about an hour's drive north.</p>`,
  },
  {
    id: 'b10c0000-0000-4000-8000-000000000004',
    slug: 'where-to-stay-in-bhatkal',
    title: 'Where to Stay in Bhatkal',
    city: 'Bhatkal',
    tags: ['Bhatkal', 'Stays'],
    excerpt:
      'Town centre, beachside or near Murudeshwar: how to pick the right base in and around Bhatkal.',
    photo: unsplash('photo-1520250497591-112f2f40a3f4'),
    photoPath: 'samples/where-to-stay-in-bhatkal.jpg',
    daysAgo: 4,
    content: `
<p>Where you stay shapes your trip to Bhatkal. Here is how the main areas compare.</p>
<h2>Town centre</h2>
<p>Close to the market, the railway station and the old temples. Good for short stays, food lovers and anyone travelling by train.</p>
<h2>By the beach</h2>
<p>Quieter stays near the coast, made for slow mornings and sunset walks. Check how far the nearest restaurants are before you book.</p>
<h2>Towards Murudeshwar</h2>
<p>A handy base for the temple, the beach and boat trips to Netrani Island, with Bhatkal a short drive away.</p>
<h2>What to look for</h2>
<ul>
  <li>Air conditioning from March to May, when the coast is hot and humid</li>
  <li>Power backup, especially during the monsoon</li>
  <li>Parking if you're driving along NH 66</li>
  <li>Recent guest reviews and clear check-in times</li>
</ul>
<p>Compare rooms, prices and reviews for stays in Bhatkal on Triplovia and book securely online.</p>`,
  },
]

function must<T>(result: DbResponse<T>, label: string): T {
  if (result.error) throw new Error(`${label}: ${result.error.message} (${result.error.code})`)
  return result.data
}

/**
 * The photo's bytes, already a JPEG at most 1600px wide: Unsplash resizes by URL, and local files
 * are kept that size in scripts/assets. No image library, so the script needs no extra dependency
 * (the Next build type-checks scripts too, and pnpm doesn't hoist next's optional sharp).
 */
async function loadPhoto(source: string): Promise<Buffer> {
  if (!source.startsWith('https://')) return readFile(path.join(process.cwd(), source))
  const res = await fetch(source)
  if (!res.ok) throw new Error(`Could not download ${source} (${res.status})`)
  return Buffer.from(await res.arrayBuffer())
}

/** Uploads to blog-images/<path> where the admin panel's uploads go, and returns the public URL */
async function uploadPhoto(photoPath: string, body: Buffer): Promise<string> {
  const objectPath = `${FOLDER}/${photoPath}`
  const bunny = bunnyStorageConfig()
  if (bunny) {
    await bunnyUpload(bunny, objectPath, body)
    return bunnyPublicUrl(bunny, objectPath)
  }
  await adminBucket().file(objectPath).save(body, { contentType: 'image/jpeg', resumable: false })
  return `https://firebasestorage.googleapis.com/v0/b/${storageBucketName()}/o/${encodeURIComponent(objectPath)}?alt=media`
}

async function removePhoto(photoPath: string) {
  const objectPath = `${FOLDER}/${photoPath}`
  const bunny = bunnyStorageConfig()
  if (bunny) await bunnyRemove(bunny, objectPath)
  await adminBucket()
    .file(objectPath)
    .delete({ ignoreNotFound: true })
    .catch(() => undefined)
}

/** The first super admin, as the posts' author (the admin Blog list shows their email) */
async function findAuthorId(): Promise<string | null> {
  const snap = await adminFirestore()
    .collection('_auth_users')
    .where('user_metadata.role', '==', 'super_admin')
    .limit(1)
    .get()
  return snap.empty ? null : snap.docs[0].id
}

async function main() {
  const store: DocStore = DRY_RUN ? new MemoryStore() : new FirestoreStore(adminFirestore)
  const db = new DbClient({ store, resolveActor: async () => ({ kind: 'service' }), auth: null, storage: null })

  if (REMOVE) {
    const deleted = must(await db.from('blogs').delete().in('id', POSTS.map((p) => p.id)).select('title'), 'delete posts')
    for (const post of POSTS) await removePhoto(post.photoPath)
    if (deleted.length === 0) console.log('Sample posts not found (photos removed if any were left).')
    for (const post of deleted) console.log(`Removed "${post.title}" and its photo.`)
    return
  }

  const authorId = DRY_RUN ? null : await findAuthorId()
  const now = Date.now()

  for (const post of POSTS) {
    const photo = await loadPhoto(post.photo)
    const imageUrl = DRY_RUN ? `https://example.invalid/${FOLDER}/${post.photoPath}` : await uploadPhoto(post.photoPath, photo)

    must(
      await db.from('blogs').upsert({
        id: post.id,
        title: post.title,
        slug: post.slug,
        excerpt: post.excerpt,
        content: post.content.trim(),
        featured_image: imageUrl,
        author_id: authorId,
        status: 'published',
        published_at: new Date(now - post.daysAgo * 24 * 60 * 60 * 1000).toISOString(),
        meta_title: post.title,
        meta_description: post.excerpt,
        tags: post.tags,
        city: post.city,
      }),
      `save "${post.title}"`
    )
    console.log(`${DRY_RUN ? '[dry run] ' : ''}${post.city}: "${post.title}" (${Math.round(photo.length / 1024)} KB photo) → /blog/${post.slug}`)
  }

  console.log(DRY_RUN ? '\nDry run: nothing written.' : '\nDone. Pick Honnavar or Bhatkal in the homepage search to see them.')
}

main().then(
  () => process.exit(0),
  (err) => {
    console.error(err)
    process.exit(1)
  }
)
