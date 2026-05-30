import { Pressable, ScrollView, StyleSheet, Text } from 'react-native'

const TABS = [
  { id: 'jobs', label: 'Jobs' },
  { id: 'create', label: 'Create job' },
  { id: 'customers', label: 'Customers' },
]

export default function AdminNav({ page, onPageChange }) {
  return (
    <ScrollView
      horizontal
      showsHorizontalScrollIndicator={false}
      style={styles.navScroll}
      contentContainerStyle={styles.nav}
    >
      {TABS.map((tab) => (
        <Pressable
          key={tab.id}
          style={[styles.tab, page === tab.id && styles.tabActive]}
          onPress={() => onPageChange(tab.id)}
        >
          <Text style={[styles.tabText, page === tab.id && styles.tabTextActive]}>
            {tab.label}
          </Text>
        </Pressable>
      ))}
    </ScrollView>
  )
}

const styles = StyleSheet.create({
  navScroll: {
    flexGrow: 0,
    maxHeight: 36,
  },
  nav: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 16,
    paddingBottom: 8,
  },
  tab: {
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 6,
    backgroundColor: '#e5e7eb',
  },
  tabActive: {
    backgroundColor: '#111827',
  },
  tabText: {
    fontSize: 13,
    fontWeight: '500',
    color: '#374151',
  },
  tabTextActive: {
    color: '#fff',
    fontWeight: '600',
  },
})
