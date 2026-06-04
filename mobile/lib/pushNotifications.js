import { Platform } from 'react-native'
import * as Device from 'expo-device'
import * as Notifications from 'expo-notifications'
import Constants from 'expo-constants'
import { supabase } from './supabase'

Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldPlaySound: true,
    shouldSetBadge: false,
    shouldShowBanner: true,
    shouldShowList: true,
  }),
})

function getExpoProjectId() {
  return (
    Constants.expoConfig?.extra?.eas?.projectId ??
    Constants.easConfig?.projectId ??
    null
  )
}

export async function registerForPushNotifications(userId) {
  if (!userId) return { error: new Error('Missing user id') }

  if (!Device.isDevice) {
    return { error: new Error('Push notifications require a physical device.') }
  }

  if (Platform.OS === 'android') {
    await Notifications.setNotificationChannelAsync('default', {
      name: 'TradeFlow',
      importance: Notifications.AndroidImportance.MAX,
      vibrationPattern: [0, 250, 250, 250],
      lockscreenVisibility: Notifications.AndroidNotificationVisibility.PUBLIC,
      bypassDnd: false,
    })
  }

  const { status: existingStatus } = await Notifications.getPermissionsAsync()
  let finalStatus = existingStatus

  if (existingStatus !== 'granted') {
    const { status } = await Notifications.requestPermissionsAsync()
    finalStatus = status
  }

  if (finalStatus !== 'granted') {
    return { error: new Error('Notification permission was denied.') }
  }

  const projectId = getExpoProjectId()
  if (!projectId) {
    return {
      error: new Error(
        'Expo project ID missing in this build. Reinstall the latest EAS development APK.',
      ),
    }
  }

  let token
  try {
    const tokenResponse = await Notifications.getExpoPushTokenAsync({ projectId })
    token = tokenResponse.data
  } catch (err) {
    const message = err?.message ?? String(err)
    if (/fcm|firebase|credentials/i.test(message)) {
      return {
        error: new Error(
          'Android push credentials missing. On expo.dev → tradeflow-mobile → Credentials → Android, configure FCM, then rebuild the app.',
        ),
      }
    }
    return { error: new Error(`Could not get push token: ${message}`) }
  }

  const platform =
    Platform.OS === 'ios' ? 'ios' : Platform.OS === 'android' ? 'android' : 'unknown'

  const { error } = await supabase.from('push_tokens').upsert(
    {
      user_id: userId,
      token,
      platform,
      updated_at: new Date().toISOString(),
    },
    { onConflict: 'user_id,token' },
  )

  if (error) {
    const detail =
      error.code === '23503'
        ? 'Profile missing in database. Add your user to public.profiles.'
        : error.message
    console.warn('push_tokens upsert failed:', detail)
    return { error: new Error(detail) }
  }

  console.log('Push token registered for worker', userId.slice(0, 8) + '…')
  return { token, error: null }
}

export async function removePushToken(userId) {
  if (!userId) return

  await supabase.from('push_tokens').delete().eq('user_id', userId)
}

export function addNotificationResponseListener(handler) {
  return Notifications.addNotificationResponseReceivedListener(handler)
}
