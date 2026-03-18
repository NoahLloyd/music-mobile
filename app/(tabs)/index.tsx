import { useState, useMemo, useCallback } from 'react'
import { View, Text, TextInput, FlatList, RefreshControl } from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'
import { useLibraryStore } from '@/stores/libraryStore'
import { usePlayerStore } from '@/stores/playerStore'
import { Track } from '@/shared/types'
import TrackRow from '@/components/TrackRow'
import TrackMenu from '@/components/TrackMenu'
import TrackEditor from '@/components/TrackEditor'

export default function LibraryScreen() {
  const tracks = useLibraryStore((s) => s.tracks)
  const searchQuery = useLibraryStore((s) => s.searchQuery)
  const setSearchQuery = useLibraryStore((s) => s.setSearchQuery)
  const fetchTracks = useLibraryStore((s) => s.fetchTracks)
  const lastError = useLibraryStore((s) => s.lastError)
  const setQueue = usePlayerStore((s) => s.setQueue)

  const [refreshing, setRefreshing] = useState(false)
  const [menuTrack, setMenuTrack] = useState<Track | null>(null)
  const [editTrack, setEditTrack] = useState<Track | null>(null)

  const filtered = useMemo(() => {
    if (!searchQuery.trim()) return tracks
    const q = searchQuery.toLowerCase()
    return tracks.filter(
      (t) =>
        t.title.toLowerCase().includes(q) ||
        (t.artist && t.artist.toLowerCase().includes(q))
    )
  }, [tracks, searchQuery])

  const onRefresh = useCallback(async () => {
    setRefreshing(true)
    await fetchTracks()
    setRefreshing(false)
  }, [])

  const handlePlay = (index: number) => {
    setQueue(filtered, index)
  }

  return (
    <SafeAreaView className="flex-1 bg-surface-0" edges={['top']}>
      <View className="px-5 pt-2 pb-3">
        <Text className="text-2xl font-bold text-white mb-4">Library</Text>
        <TextInput
          value={searchQuery}
          onChangeText={setSearchQuery}
          placeholder="Search tracks..."
          className="bg-surface-2 text-white text-sm rounded-2xl px-4 py-3"
          placeholderTextColor="rgba(255,255,255,0.25)"
        />
      </View>

      {lastError && (
        <View style={{ margin: 16, padding: 12, backgroundColor: 'rgba(239,68,68,0.15)', borderRadius: 12, borderWidth: 1, borderColor: 'rgba(239,68,68,0.2)' }}>
          <Text style={{ color: '#f87171', fontSize: 12, fontFamily: 'monospace' }}>{lastError}</Text>
          <Text style={{ color: 'rgba(255,255,255,0.3)', fontSize: 10, marginTop: 6, fontFamily: 'monospace' }}>
            URL: {process.env.EXPO_PUBLIC_SUPABASE_URL ? '✓ set' : '✗ missing'}{'\n'}
            KEY: {process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY ? '✓ set' : '✗ missing'}
          </Text>
        </View>
      )}

      <FlatList
        data={filtered}
        keyExtractor={(item) => item.id}
        renderItem={({ item, index }) => (
          <TrackRow
            track={item}
            index={index}
            onPlay={() => handlePlay(index)}
            onLongPress={() => setMenuTrack(item)}
            onMenuPress={() => setMenuTrack(item)}
          />
        )}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            tintColor="#22c55e"
          />
        }
        ListEmptyComponent={
          <View className="items-center mt-20 px-6">
            <Text className="text-white/30 text-lg mb-2">No tracks yet</Text>
            <Text className="text-white/20 text-sm text-center">
              Download some music from the Add tab to get started
            </Text>
            {!lastError && (
              <Text style={{ color: 'rgba(255,255,255,0.15)', fontSize: 10, marginTop: 16, fontFamily: 'monospace', textAlign: 'center' }}>
                ENV: URL={process.env.EXPO_PUBLIC_SUPABASE_URL ? 'set' : 'MISSING'} KEY={process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY ? 'set' : 'MISSING'}
              </Text>
            )}
          </View>
        }
        contentContainerStyle={{ paddingBottom: 120 }}
      />

      {menuTrack && (
        <TrackMenu
          track={menuTrack}
          visible={!!menuTrack}
          onClose={() => setMenuTrack(null)}
          onEdit={() => {
            setEditTrack(menuTrack)
            setMenuTrack(null)
          }}
        />
      )}

      {editTrack && (
        <TrackEditor
          track={editTrack}
          visible={!!editTrack}
          onClose={() => setEditTrack(null)}
        />
      )}
    </SafeAreaView>
  )
}
