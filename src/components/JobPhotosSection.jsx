import { useEffect, useRef, useState } from 'react'
import { formatNoteDate } from '../lib/jobUtils'
import {
  fetchJobPhotosWithUrls,
  formatPhotoError,
  photosByType,
  uploadJobPhoto,
} from '../lib/jobPhotos'
import { supabase } from '../lib/supabase'

function PhotoGallery({ photos, emptyLabel }) {
  const visible = photos.filter((photo) => photo.url)

  if (visible.length === 0) {
    return <p className="text-sm text-gray-500">{emptyLabel}</p>
  }

  return (
    <ul className="mt-3 flex flex-wrap gap-2">
      {visible.map((photo) => (
        <li
          key={photo.id}
          className="shrink-0 overflow-hidden rounded border bg-white"
          style={{ width: 80 }}
        >
          <a href={photo.url} target="_blank" rel="noreferrer" title="Open full size">
            <img
              src={photo.url}
              alt="Job photo"
              style={{ width: 80, height: 80, objectFit: 'cover', display: 'block' }}
            />
          </a>
          <p className="truncate px-1 py-0.5 text-[10px] leading-tight text-gray-500">
            {formatNoteDate(photo.created_at)}
          </p>
        </li>
      ))}
    </ul>
  )
}

function PhotoTypeSection({ title, description, photoType, photos, uploading, onUpload }) {
  const inputRef = useRef(null)
  const typePhotos = photosByType(photos, photoType)

  return (
    <section className="rounded-lg border bg-white p-4">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h4 className="font-semibold text-gray-900">{title}</h4>
          <p className="mt-1 text-sm text-gray-600">{description}</p>
        </div>
        <button
          type="button"
          onClick={() => inputRef.current?.click()}
          disabled={uploading}
          className="rounded bg-gray-900 px-3 py-2 text-sm font-medium text-white disabled:opacity-50"
        >
          {uploading ? 'Uploading…' : 'Upload photo'}
        </button>
        <input
          ref={inputRef}
          type="file"
          accept="image/*"
          capture="environment"
          className="hidden"
          onChange={(event) => {
            const file = event.target.files?.[0]
            event.target.value = ''
            if (file) onUpload(file)
          }}
        />
      </div>
      <PhotoGallery photos={typePhotos} emptyLabel="No photos yet." />
    </section>
  )
}

export default function JobPhotosSection({ jobId, authorId, onRecorded }) {
  const [photos, setPhotos] = useState([])
  const [loading, setLoading] = useState(true)
  const [errorMessage, setErrorMessage] = useState('')
  const [uploadingType, setUploadingType] = useState(null)

  useEffect(() => {
    loadPhotos()
  }, [jobId])

  async function loadPhotos() {
    setLoading(true)
    const { photos: nextPhotos, error } = await fetchJobPhotosWithUrls(supabase, jobId)
    setLoading(false)

    if (error) {
      setErrorMessage(formatPhotoError(error))
      return
    }

    setPhotos(nextPhotos)
    setErrorMessage('')
  }

  async function handleUpload(photoType, file) {
    if (!file.type.startsWith('image/') && !file.name.match(/\.(jpe?g|png|webp|heic|heif)$/i)) {
      setErrorMessage('Please choose an image file.')
      return
    }

    setErrorMessage('')
    setUploadingType(photoType)

    const { error } = await uploadJobPhoto({
      supabase,
      jobId,
      authorId,
      photoType,
      file,
    })

    setUploadingType(null)

    if (error) {
      setErrorMessage(formatPhotoError(error))
      return
    }

    await loadPhotos()
    onRecorded?.()
  }

  return (
    <section className="mt-8 text-left">
      <h3 className="text-lg font-semibold text-gray-900">Photos</h3>
      <p className="mt-1 text-sm text-gray-600">
        Document the job with before and after photos for the customer record.
      </p>

      {errorMessage ? <p className="mt-3 text-sm text-red-600">{errorMessage}</p> : null}
      {loading ? <p className="mt-4 text-sm text-gray-500">Loading photos…</p> : null}

      <div className="mt-4 space-y-4">
        <PhotoTypeSection
          title="Before photos"
          description="Site condition before work starts."
          photoType="before"
          photos={photos}
          uploading={uploadingType === 'before'}
          onUpload={(file) => handleUpload('before', file)}
        />
        <PhotoTypeSection
          title="After photos"
          description="Completed work — great for showing customers."
          photoType="after"
          photos={photos}
          uploading={uploadingType === 'after'}
          onUpload={(file) => handleUpload('after', file)}
        />
      </div>
    </section>
  )
}
