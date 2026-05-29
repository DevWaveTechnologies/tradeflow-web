import { ActivityIndicator, StyleSheet, Text, View } from 'react-native'
import { SafeAreaProvider } from 'react-native-safe-area-context'
import { StatusBar } from 'expo-status-bar'
import { AuthProvider, useAuth } from './context/AuthContext'
import AppHeader from './components/AppHeader'
import LoginScreen from './screens/LoginScreen'
import JobsScreen from './screens/JobsScreen'

function AppContent() {
  const { session, profile, profileError, loading } = useAuth()

  if (loading) {
    return (
      <View style={styles.centered}>
        <ActivityIndicator size="large" color="#111827" />
      </View>
    )
  }

  if (!session) {
    return <LoginScreen />
  }

  if (!profile) {
    return (
      <View style={styles.container}>
        <AppHeader title="TradeFlow" subtitle="Profile required" />
        <View style={styles.centeredContent}>
          <Text style={styles.errorTitle}>Account not linked</Text>
          <Text style={styles.errorText}>
            Add a row in public.users with your auth user id and role admin or worker.
          </Text>
          {session.user?.id ? (
            <Text style={styles.userId}>{session.user.id}</Text>
          ) : null}
          {profileError ? <Text style={styles.errorDetail}>{profileError}</Text> : null}
        </View>
      </View>
    )
  }

  if (profile.role !== 'admin' && profile.role !== 'worker') {
    return (
      <View style={styles.container}>
        <AppHeader title="TradeFlow" />
        <View style={styles.centeredContent}>
          <Text style={styles.errorText}>
            Unknown role &quot;{profile.role}&quot;. Use admin or worker.
          </Text>
        </View>
      </View>
    )
  }

  return <JobsScreen />
}

export default function App() {
  return (
    <SafeAreaProvider>
      <AuthProvider>
        <StatusBar style="dark" />
        <AppContent />
      </AuthProvider>
    </SafeAreaProvider>
  )
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f3f4f6',
  },
  centered: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#f3f4f6',
  },
  centeredContent: {
    flex: 1,
    justifyContent: 'center',
    padding: 24,
  },
  errorTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#111827',
    marginBottom: 8,
  },
  errorText: {
    fontSize: 15,
    color: '#6b7280',
    lineHeight: 22,
  },
  userId: {
    marginTop: 12,
    fontSize: 12,
    fontFamily: 'monospace',
    color: '#374151',
  },
  errorDetail: {
    marginTop: 8,
    fontSize: 13,
    color: '#dc2626',
  },
})
