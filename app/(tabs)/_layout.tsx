import { useState } from 'react'
import { Tabs } from 'expo-router'
import { View, Platform, Pressable } from 'react-native'
import { Ionicons } from '@expo/vector-icons'
import { usePlayerStore } from '@/stores/playerStore'
import PlayerBar from '@/components/PlayerBar'
import PlayerSheet from '@/components/PlayerSheet'

export default function TabLayout() {
  const currentTrack = usePlayerStore((s) => s.currentTrack)
  const [showPlayer, setShowPlayer] = useState(false)

  return (
    <View style={{ flex: 1, backgroundColor: '#0a0a0a' }}>
      <Tabs
        screenOptions={{
          headerShown: false,
          tabBarStyle: {
            backgroundColor: '#0a0a0a',
            borderTopWidth: 0.5,
            borderTopColor: 'rgba(255,255,255,0.06)',
            height: Platform.OS === 'android' ? 72 : 88,
            paddingTop: 8,
            paddingBottom: Platform.OS === 'android' ? 20 : 30,
            elevation: 0,
          },
          tabBarActiveTintColor: '#22c55e',
          tabBarInactiveTintColor: 'rgba(255,255,255,0.3)',
          tabBarLabelStyle: {
            fontSize: 10,
            fontWeight: '600',
            letterSpacing: 0.3,
            marginTop: 2,
          },
          sceneStyle: { backgroundColor: '#0a0a0a' },
        }}
      >
        <Tabs.Screen
          name="index"
          options={{
            title: 'Library',
            tabBarIcon: ({ color, size }) => (
              <Ionicons name="library" size={20} color={color} />
            ),
          }}
        />
        <Tabs.Screen
          name="playlists"
          options={{
            title: 'Playlists',
            tabBarIcon: ({ color, size }) => (
              <Ionicons name="albums-outline" size={20} color={color} />
            ),
          }}
        />
        <Tabs.Screen
          name="add"
          options={{
            title: 'Add',
            tabBarIcon: ({ color, size }) => (
              <Ionicons name="add-circle-outline" size={22} color={color} />
            ),
          }}
        />
        <Tabs.Screen
          name="queue"
          options={{
            title: 'Queue',
            tabBarIcon: ({ color, size }) => (
              <Ionicons name="list" size={20} color={color} />
            ),
          }}
        />
      </Tabs>
      {currentTrack && (
        <View
          style={{
            position: 'absolute',
            left: 0,
            right: 0,
            bottom: Platform.OS === 'android' ? 72 : 88,
          }}
        >
          <Pressable onPress={() => setShowPlayer(true)}>
            <PlayerBar />
          </Pressable>
        </View>
      )}
      <PlayerSheet visible={showPlayer} onClose={() => setShowPlayer(false)} />
    </View>
  )
}
