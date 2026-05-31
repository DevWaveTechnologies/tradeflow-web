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
    return 'Photo storage is not set up in Supabase yet. Run supabase/fix-job-photos-storage.sql in the SQL Editor, then refresh this page.'
  }

  if (message.toLowerCase().includes('bucket not found')) {
    return 'Storage bucket "job-photos" is missing. Run supabase/fix-job-photos-storage.sql in the Supabase SQL Editor.'
  }

  return message
}

export function normalizeImageMimeType(file) {
  if (file.type && file.type.startsWith('image/')) {
    return file.type
  }

  const name = file.name?.toLowerCase() ?? ''
  if (name.endsWith('.png')) return 'image/png'
  if (name.endsWith('.webp')) return 'image/webp'
  if (name.endsWith('.heic') || name.endsWith('.heif')) return 'image/heic'
  return 'image/jpeg'
}

function extensionFromMime(mime) {
  if (mime === 'image/png') return 'png'
  if (mime === 'image/webp') return 'webp'
  if (mime === 'image/heic' || mime === 'image/heif') return 'heic'
  return 'jpg'
}

export function buildStoragePath(jobId, photoType, mimeType) {
  const ext = extensionFromMime(mimeType)
  return `${jobId}/${photoType}/${crypto.randomUUID()}.${ext}`
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

export async function uploadJobPhoto({ supabase, jobId, authorId, photoType, file }) {
  const resolvedMime = normalizeImageMimeType(file)
  const storagePath = buildStoragePath(jobId, photoType, resolvedMime)

  const { error: uploadError } = await supabase.storage
    .from(JOB_PHOTOS_BUCKET)
    .upload(storagePath, file, {
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
