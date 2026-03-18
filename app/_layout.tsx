import { useEffect, useState } from 'react'
import { View, Platform } from 'react-native'
import { Stack } from 'expo-router'
import { StatusBar } from 'expo-status-bar'
import { setupPlayer, registerPlayback } from '@/lib/trackPlayer'
import { useLibraryStore } from '@/stores/libraryStore'
import * as NavigationBar from 'expo-navigation-bar'

import '../global.css'

export default function RootLayout() {
  const [playerReady, setPlayerReady] = useState(false)
  const fetchTracks = useLibraryStore((s) => s.fetchTracks)
  const fetchPlaylists = useLibraryStore((s) => s.fetchPlaylists)
  const fetchArchivedTracks = useLibraryStore((s) => s.fetchArchivedTracks)

  useEffect(() => {
    registerPlayback()
    setupPlayer().then(setPlayerReady)
    fetchTracks()
    fetchPlaylists()
    fetchArchivedTracks()

    // Make Android nav bar dark
    if (Platform.OS === 'android') {
      NavigationBar.setBackgroundColorAsync('#0a0a0a').catch(() => {})
      NavigationBar.setButtonStyleAsync('light').catch(() => {})
    }
  }, [])

  return (
    <View style={{ flex: 1, backgroundColor: '#0a0a0a' }}>
      <StatusBar style="light" />
      <Stack
        screenOptions={{
          headerShown: false,
          contentStyle: { backgroundColor: '#0a0a0a' },
          animation: 'slide_from_right',
        }}
      />
    </View>
  )
}
