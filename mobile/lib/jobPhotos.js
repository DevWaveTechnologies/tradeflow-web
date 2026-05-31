import { File } from 'expo-file-system'

export const JOB_PHOTOS_BUCKET = 'job-photos'

const SIGNED_URL_TTL = 60 * 60

export function formatPhotoError(error) {
  if (!error) return ''

  const message = error.message ?? String(error)
  const code = error.code ?? ''

  if (
    code === 'PGRST205' ||
    code === '42P01' ||
    message.includes('job_photos') ||
    message.includes('schema cache')
  ) {
    return 'Photo storage is not set up in Supabase. Run fix-job-photos-storage.sql in the SQL Editor.'
  }

  if (message.toLowerCase().includes('network request failed')) {
    return 'Could not read the photo file. Try again or pick from your gallery.'
  }

  if (message.toLowerCase().includes('bucket not found')) {
    return 'Storage bucket "job-photos" is missing. Run fix-job-photos-storage.sql in Supabase.'
  }

  return message
}

function extensionFromMime(mime) {
  if (mime === 'image/png') return 'png'
  if (mime === 'image/webp') return 'webp'
  if (mime === 'image/heic' || mime === 'image/heif') return 'heic'
  return 'jpg'
}

export function normalizeImageMimeType(uri, mimeType) {
  if (mimeType && mimeType.startsWith('image/')) {
    return mimeType
  }

  const lower = uri.toLowerCase()
  if (lower.includes('.png')) return 'image/png'
  if (lower.includes('.webp')) return 'image/webp'
  if (lower.includes('.heic') || lower.includes('.heif')) return 'image/heic'
  return 'image/jpeg'
}

export function buildStoragePath(jobId, photoType, mimeType) {
  const ext = extensionFromMime(mimeType)
  const id =
    globalThis.crypto?.randomUUID?.() ?? `${Date.now()}-${Math.random().toString(36).slice(2)}`
  return `${jobId}/${photoType}/${id}.${ext}`
}

async function uriToArrayBuffer(uri) {
  const file = new File(uri)

  if (!file.exists) {
    throw new Error('Could not read photo from device.')
  }

  return file.arrayBuffer()
}

export async function fetchJobPhotosWithUrls(supabase, jobId) {
  const { data: photos, error } = await supabase
    .from('job_photos')
    .select('id, photo_type, storage_path, created_at, author_id')
    .eq('job_id', jobId)
    .order('created_at', { ascending: false })

  if (error) {
    return { photos: [], error }
  }

  const rows = photos ?? []
  const withUrls = await Promise.all(
    rows.map(async (photo) => {
      const { data: signed } = await supabase.storage
        .from(JOB_PHOTOS_BUCKET)
        .createSignedUrl(photo.storage_path, SIGNED_URL_TTL)

      return {
        ...photo,
        url: signed?.signedUrl ?? null,
      }
    }),
  )

  return { photos: withUrls, error: null }
}

export async function uploadJobPhotoFromUri({
  supabase,
  jobId,
  authorId,
  photoType,
  uri,
  mimeType = 'image/jpeg',
}) {
  const resolvedMime = normalizeImageMimeType(uri, mimeType)
  const storagePath = buildStoragePath(jobId, photoType, resolvedMime)

  let fileBody
  try {
    fileBody = await uriToArrayBuffer(uri)
  } catch (readError) {
    return {
      error: {
        message: readError.message ?? 'Could not read photo from device.',
      },
    }
  }

  const { error: uploadError } = await supabase.storage
    .from(JOB_PHOTOS_BUCKET)
    .upload(storagePath, fileBody, {
      contentType: resolvedMime,
      upsert: false,
    })

  if (uploadError) {
    return { error: uploadError }
  }

  const { error: insertError } = await supabase.from('job_photos').insert({
    job_id: jobId,
    author_id: authorId,
    photo_type: photoType,
    storage_path: storagePath,
  })

  if (insertError) {
    await supabase.storage.from(JOB_PHOTOS_BUCKET).remove([storagePath])
    return { error: insertError }
  }

  return { error: null }
}

export function photosByType(photos, photoType) {
  return photos.filter((photo) => photo.photo_type === photoType)
}
