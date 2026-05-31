import { useCallback, useState } from 'react'
import { StyleSheet, View } from 'react-native'
import AppHeader from '../components/AppHeader'
import AdminNav from '../components/AdminNav'
import JobsScreen from './JobsScreen'
import CreateJobScreen from './CreateJobScreen'
import CustomersScreen from './CustomersScreen'

const SUBTITLES = {
  jobs: 'All jobs',
  create: 'New job',
  customers: 'Customers',
}

export default function AdminShellScreen() {
  const [page, setPage] = useState('jobs')
  const [hideChrome, setHideChrome] = useState(false)
  const [jobsRefreshKey, setJobsRefreshKey] = useState(0)

  function handlePageChange(next) {
    setPage(next)
    setHideChrome(false)
  }

  const handleJobCreated = useCallback(() => {
    setJobsRefreshKey((key) => key + 1)
    setPage('jobs')
  }, [])

  return (
    <View style={styles.container}>
      {!hideChrome ? (
        <>
          <AppHeader title="TradeFlow" subtitle={SUBTITLES[page] ?? 'Admin'} />
          <AdminNav page={page} onPageChange={handlePageChange} />
        </>
      ) : null}
      <View style={styles.content}>
        {page === 'jobs' ? (
          <JobsScreen
            embedded
            refreshKey={jobsRefreshKey}
            onSubViewChange={setHideChrome}
          />
        ) : page === 'create' ? (
          <CreateJobScreen onCreated={handleJobCreated} />
        ) : (
          <CustomersScreen embedded onSubViewChange={setHideChrome} />
        )}
      </View>
    </View>
  )
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f3f4f6',
  },
  content: {
    flex: 1,
  },
})
