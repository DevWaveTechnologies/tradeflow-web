import { useCallback, useEffect, useState } from 'react'
import { Alert, Pressable, StyleSheet, Text, View } from 'react-native'
import { useAuth } from '../context/AuthContext'
import { registerForPushNotifications } from '../lib/pushNotifications'
import { supabase } from '../lib/supabase'

export default function WorkerPushStatus() {
  const { profile } = useAuth()
  const [registered, setRegistered] = useState(null)
  const [busy, setBusy] = useState(false)

  const checkRegistration = useCallback(async () => {
    if (!profile?.id || profile.role !== 'worker') {
      setRegistered(null)
      return
    }

    const { data, error } = await supabase
      .from('push_tokens')
      .select('id')
      .eq('user_id', profile.id)
      .limit(1)

    if (error) {
      setRegistered(false)
      return
    }

    setRegistered((data?.length ?? 0) > 0)
  }, [profile?.id, profile?.role])

  useEffect(() => {
    checkRegistration()
  }, [checkRegistration])

  async function handleRegister() {
    if (!profile?.id) return

    setBusy(true)
    const { error, token } = await registerForPushNotifications(profile.id)
    setBusy(false)

    if (error) {
      Alert.alert('Push registration failed', error.message)
      setRegistered(false)
      return
    }

    if (token) {
      setRegistered(true)
      Alert.alert(
        'Push registered',
        'This device can receive job alerts. Put the app in the background and ask admin to update a job.',
      )
    }

    await checkRegistration()
  }

  if (profile?.role !== 'worker' || registered === null) {
    return null
  }

  if (registered) {
    return (
      <View style={styles.bannerOk}>
        <Text style={styles.bannerOkText}>Push alerts enabled on this device</Text>
      </View>
    )
  }

  return (
    <View style={styles.bannerWarn}>
      <Text style={styles.bannerWarnText}>
        Push alerts not registered on this device yet (Supabase push_tokens is empty).
      </Text>
      <Pressable
        style={[styles.button, busy && styles.buttonDisabled]}
        onPress={handleRegister}
        disabled={busy}
      >
        <Text style={styles.buttonText}>{busy ? 'Registering…' : 'Register push alerts'}</Text>
      </Pressable>
    </View>
  )
}

const styles = StyleSheet.create({
  bannerOk: {
    marginTop: 8,
    marginBottom: 10,
    padding: 10,
    backgroundColor: '#ecfdf5',
    borderRadius: 12,
  },
  bannerOkText: {
    color: '#047857',
    fontSize: 13,
  },
  bannerWarn: {
    marginTop: 8,
    marginBottom: 10,
    padding: 12,
    backgroundColor: '#fffbeb',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#fcd34d',
  },
  bannerWarnText: {
    color: '#92400e',
    fontSize: 13,
    marginBottom: 10,
    lineHeight: 18,
  },
  button: {
    alignSelf: 'flex-start',
    backgroundColor: '#111827',
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 6,
  },
  buttonDisabled: {
    opacity: 0.6,
  },
  buttonText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '600',
  },
})
