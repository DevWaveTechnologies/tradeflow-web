import { useEffect, useState } from 'react'
import {
  ActivityIndicator,
  Alert,
  Image,
  Linking,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native'
import * as ImagePicker from 'expo-image-picker'
import { supabase } from '../lib/supabase'
import { formatNoteDate } from '../lib/jobUtils'
import {
  fetchJobPhotosWithUrls,
  formatPhotoError,
  photosByType,
  uploadJobPhotoFromUri,
} from '../lib/jobPhotos'

async function requestMediaPermission() {
  const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync()
  if (status !== 'granted') {
    Alert.alert('Permission needed', 'Allow photo library access to upload job photos.')
    return false
  }
  return true
}

async function requestCameraPermission() {
  const { status } = await ImagePicker.requestCameraPermissionsAsync()
  if (status !== 'granted') {
    Alert.alert('Permission needed', 'Allow camera access to take job photos.')
    return false
  }
  return true
}

function PhotoGallery({ photos }) {
  const visible = photos.filter((photo) => photo.url)

  if (visible.length === 0) {
    return <Text style={styles.empty}>No photos yet.</Text>
  }

  return (
    <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.galleryScroll}>
      {visible.map((photo) => (
        <Pressable
          key={photo.id}
          style={styles.photoCard}
          onPress={() => photo.url && Linking.openURL(photo.url)}
        >
          <Image source={{ uri: photo.url }} style={styles.photoImage} />
          <Text style={styles.photoMeta}>{formatNoteDate(photo.created_at)}</Text>
        </Pressable>
      ))}
    </ScrollView>
  )
}

function PhotoTypeSection({ title, description, photoType, photos, uploading, onPick }) {
  const typePhotos = photosByType(photos, photoType)

  return (
    <View style={styles.typeSection}>
      <Text style={styles.typeTitle}>{title}</Text>
      <Text style={styles.typeHint}>{description}</Text>

      <View style={styles.uploadRow}>
        <Pressable
          style={[styles.uploadButton, uploading && styles.uploadButtonDisabled]}
          onPress={() => onPick(photoType, 'camera')}
          disabled={uploading}
        >
          <Text style={styles.uploadButtonText}>Take photo</Text>
        </Pressable>
        <Pressable
          style={[styles.uploadButtonSecondary, uploading && styles.uploadButtonDisabled]}
          onPress={() => onPick(photoType, 'library')}
          disabled={uploading}
        >
          <Text style={styles.uploadButtonSecondaryText}>Choose photo</Text>
        </Pressable>
      </View>

      {uploading ? <ActivityIndicator color="#111827" style={styles.uploading} /> : null}
      <PhotoGallery photos={typePhotos} />
    </View>
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

  async function handlePick(photoType, source) {
    setErrorMessage('')

    if (source === 'camera') {
      const allowed = await requestCameraPermission()
      if (!allowed) return

      const result = await ImagePicker.launchCameraAsync({
        mediaTypes: ['images'],
        quality: 0.8,
      })

      if (result.canceled || !result.assets?.[0]) return
      await uploadAsset(photoType, result.assets[0])
      return
    }

    const allowed = await requestMediaPermission()
    if (!allowed) return

    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ['images'],
      quality: 0.8,
    })

    if (result.canceled || !result.assets?.[0]) return
    await uploadAsset(photoType, result.assets[0])
  }

  async function uploadAsset(photoType, asset) {
    setUploadingType(photoType)
    setErrorMessage('')

    try {
      const { error } = await uploadJobPhotoFromUri({
        supabase,
        jobId,
        authorId,
        photoType,
        uri: asset.uri,
        mimeType: asset.mimeType ?? 'image/jpeg',
      })

      if (error) {
        setErrorMessage(formatPhotoError(error))
        return
      }

      await loadPhotos()
      onRecorded?.()
    } catch (err) {
      setErrorMessage(formatPhotoError(err))
    } finally {
      setUploadingType(null)
    }
  }

  return (
    <View style={styles.section}>
      <Text style={styles.heading}>Photos</Text>
      <Text style={styles.hint}>
        Document the job with before and after photos for the customer record.
      </Text>

      {errorMessage ? <Text style={styles.error}>{errorMessage}</Text> : null}
      {loading ? <ActivityIndicator color="#111827" style={styles.loader} /> : null}

      <PhotoTypeSection
        title="Before photos"
        description="Site condition before work starts."
        photoType="before"
        photos={photos}
        uploading={uploadingType === 'before'}
        onPick={handlePick}
      />

      <PhotoTypeSection
        title="After photos"
        description="Completed work — great for showing customers."
        photoType="after"
        photos={photos}
        uploading={uploadingType === 'after'}
        onPick={handlePick}
      />
    </View>
  )
}

const styles = StyleSheet.create({
  section: {
    marginTop: 24,
  },
  heading: {
    fontSize: 17,
    fontWeight: '600',
    color: '#111827',
  },
  hint: {
    marginTop: 4,
    fontSize: 13,
    color: '#6b7280',
    lineHeight: 18,
  },
  loader: {
    marginTop: 12,
  },
  error: {
    marginTop: 8,
    color: '#dc2626',
    fontSize: 14,
  },
  typeSection: {
    marginTop: 16,
    padding: 14,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#e5e7eb',
    backgroundColor: '#fff',
  },
  typeTitle: {
    fontSize: 15,
    fontWeight: '700',
    color: '#111827',
  },
  typeHint: {
    marginTop: 4,
    fontSize: 13,
    color: '#6b7280',
  },
  uploadRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginTop: 12,
  },
  uploadButton: {
    backgroundColor: '#111827',
    borderRadius: 8,
    paddingHorizontal: 14,
    paddingVertical: 10,
  },
  uploadButtonSecondary: {
    borderWidth: 1,
    borderColor: '#d1d5db',
    borderRadius: 8,
    paddingHorizontal: 14,
    paddingVertical: 10,
    backgroundColor: '#fff',
  },
  uploadButtonDisabled: {
    opacity: 0.5,
  },
  uploadButtonText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '600',
  },
  uploadButtonSecondaryText: {
    color: '#111827',
    fontSize: 14,
    fontWeight: '600',
  },
  uploading: {
    marginTop: 10,
  },
  galleryScroll: {
    marginTop: 12,
  },
  photoCard: {
    width: 120,
    marginRight: 10,
  },
  photoImage: {
    width: 120,
    height: 120,
    borderRadius: 8,
    backgroundColor: '#e5e7eb',
  },
  photoMeta: {
    marginTop: 4,
    fontSize: 11,
    color: '#6b7280',
  },
  empty: {
    marginTop: 12,
    fontSize: 14,
    color: '#6b7280',
  },
})
