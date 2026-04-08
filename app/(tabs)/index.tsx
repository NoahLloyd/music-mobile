import { useState, useMemo, useCallback, useEffect } from 'react'
import { View, Text, TextInput, FlatList, RefreshControl, Pressable } from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'
import { Ionicons } from '@expo/vector-icons'
import { useLibraryStore } from '@/stores/libraryStore'
import { usePlayerStore } from '@/stores/playerStore'
import { Track } from '@/shared/types'
import { uncachedCount, cacheTrack } from '@/lib/cache'
import TrackRow from '@/components/TrackRow'
import TrackMenu from '@/components/TrackMenu'
import TrackEditor from '@/components/TrackEditor'

export default function LibraryScreen() {
  const tracks = useLibraryStore((s) => s.tracks)
  const searchQuery = useLibraryStore((s) => s.searchQuery)
  const setSearchQuery = useLibraryStore((s) => s.setSearchQuery)
  const fetchTracks = useLibraryStore((s) => s.fetchTracks)
  const lastError = useLibraryStore((s) => s.lastError)
  const playPlaylist = usePlayerStore((s) => s.playPlaylist)
  const setAllTracks = usePlayerStore((s) => s.setAllTracks)

  const [refreshing, setRefreshing] = useState(false)
  const [menuTrack, setMenuTrack] = useState<Track | null>(null)
  const [editTrack, setEditTrack] = useState<Track | null>(null)
  const [downloading, setDownloading] = useState(false)
  const [uncached, setUncached] = useState(0)

  // Check how many tracks need downloading
  useEffect(() => {
    if (tracks.length > 0) {
      setUncached(uncachedCount(tracks))
    } else {
      setUncached(0)
    }
  }, [tracks])

  const downloadAll = useCallback(async () => {
    setDownloading(true)
    for (const track of tracks) {
      try {
        await cacheTrack(track.id, track.storage_path, track.processed_storage_path)
        setUncached((prev) => Math.max(0, prev - 1))
      } catch {}
    }
    setUncached(0)
    setDownloading(false)
  }, [tracks])

  // Keep the player store's allTracks in sync with the library
  useEffect(() => {
    setAllTracks(tracks)
  }, [tracks])

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

  // Re-check cache status when the screen regains focus (e.g. after playing tracks)
  const currentTrack = usePlayerStore((s) => s.currentTrack)
  useEffect(() => {
    if (tracks.length > 0) {
      setUncached(uncachedCount(tracks))
    }
  }, [currentTrack])

  const handlePlay = (index: number) => {
    playPlaylist(filtered, index)
  }

  return (
    <SafeAreaView className="flex-1 bg-surface-0" edges={['top']}>
      <View className="px-5 pt-2 pb-3">
        <View className="flex-row items-center justify-between mb-4">
          <Text className="text-2xl font-bold text-white">Library</Text>
          {uncached > 0 && (
            <Pressable
              onPress={downloadAll}
              disabled={downloading}
              className="flex-row items-center bg-surface-2 rounded-full px-3.5 py-2 active:opacity-70 disabled:opacity-50"
            >
              <Ionicons
                name="cloud-download-outline"
                size={16}
                color="rgba(255,255,255,0.5)"
                style={{ marginRight: 6 }}
              />
              <Text className="text-white/50 text-xs font-medium">
                {downloading ? `Downloading...` : `Download ${uncached}`}
              </Text>
            </Pressable>
          )}
        </View>
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
              Import some music from the Add tab to get started
            </Text>
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
