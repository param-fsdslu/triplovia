# Image storage (including 360° photos)

All hotel, room and 360° uploads use the same server-side storage adapter. Local `.env` values do not automatically become Netlify Functions environment variables.

## Netlify setup

In the Triplovia site's **Project configuration → Environment variables**, copy these values from the working local `.env`:

| Variable | Value / source |
| --- | --- |
| `BUNNY_STORAGE_ZONE` | `triplovia` |
| `BUNNY_STORAGE_PASSWORD` | Storage zone → FTP & API Access → writable password. Keep private. |
| `BUNNY_CDN_URL` | `https://triplovia.b-cdn.net` |
| `BUNNY_STORAGE_REGION` | Empty for Frankfurt; otherwise the zone's primary region code. |

Use the **Production** deploy context and **All scopes**, or include both **Builds** and **Functions**. Create a new deploy after saving. Do not put the storage password in `netlify.toml` or use a `NEXT_PUBLIC_` variable for it.

Netlify reference: https://docs.netlify.com/build/functions/environment-variables/

## Diagnose without changing data

```sh
node --env-file=.env scripts/check-storage.mjs
```

This checks Bunny zone access and Firebase bucket metadata. It does not upload or delete files, change bookings, or print passwords.

Checked on 2026-11-05: local Bunny configuration is accessible (HTTP 200). The configured Firebase bucket `triploviia.firebasestorage.app` returns 404: the bucket does not exist. If deployed code falls back to that bucket because Bunny settings are absent, uploads fail. Partial Bunny settings now report the missing variable names instead of silently using Firebase. A Firebase upload 404 reports the missing bucket rather than “Object not found”.

After deploying, upload a 2:1 JPEG/PNG/WebP panorama at least 2000 px wide under the hotel's Images tab. Check the saved thumbnail and 360° preview, then check the hotel page. The browser resizes large panoramas before upload.
