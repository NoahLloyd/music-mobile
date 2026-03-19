import { useState } from 'react'
import { View, Text, FlatList } from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'
import { usePlayerStore } from '@/stores/playerStore'
import { Track } from '@/shared/types'
import TrackRow from '@/components/TrackRow'
import TrackMenu from '@/components/TrackMenu'
import TrackEditor from '@/components/TrackEditor'

type ListItem =
  | { type: 'header'; label: string; key: string }
  | { type: 'track'; track: Track; queueIndex: number; key: string }

export default function QueueScreen() {
  const currentTrack = usePlayerStore((s) => s.currentTrack)
  const manualQueue = usePlayerStore((s) => s.manualQueue)
  const playlistSource = usePlayerStore((s) => s.playlistSource)
  const playlistSourceIndex = usePlayerStore((s) => s.playlistSourceIndex)
  const play = usePlayerStore((s) => s.play)
  const removeFromQueue = usePlayerStore((s) => s.removeFromQueue)

  const [menuTrack, setMenuTrack] = useState<Track | null>(null)
  const [editTrack, setEditTrack] = useState<Track | null>(null)

  const upcomingPlaylist = playlistSource.slice(playlistSourceIndex)

  const items: ListItem[] = []

  if (currentTrack) {
    items.push({ type: 'header', label: 'Now Playing', key: 'h-now' })
    items.push({ type: 'track', track: currentTrack, queueIndex: -1, key: `now-${currentTrack.id}` })
  }

  if (manualQueue.length > 0) {
    items.push({ type: 'header', label: `Next Up (${manualQueue.length})`, key: 'h-manual' })
    manualQueue.forEach((track, i) => {
      items.push({ type: 'track', track, queueIndex: i, key: `mq-${track.id}-${i}` })
    })
  }

  if (upcomingPlaylist.length > 0) {
    items.push({ type: 'header', label: `Playing From Playlist (${upcomingPlaylist.length})`, key: 'h-playlist' })
    upcomingPlaylist.forEach((track, i) => {
      items.push({ type: 'track', track, queueIndex: -1, key: `pl-${track.id}-${i}` })
    })
  }

  return (
    <SafeAreaView className="flex-1 bg-surface-0" edges={['top']}>
      <View className="px-5 pt-2 pb-3">
        <Text className="text-2xl font-bold text-white">Queue</Text>
      </View>

      <FlatList
        data={items}
        keyExtractor={(item) => item.key}
        renderItem={({ item }) => {
          if (item.type === 'header') {
            return (
              <Text className="text-xs text-white/40 uppercase tracking-wider font-semibold px-5 pt-4 pb-1">
                {item.label}
              </Text>
            )
          }
          return (
            <TrackRow
              track={item.track}
              index={item.queueIndex >= 0 ? item.queueIndex : 0}
              onPlay={() => {
                if (item.queueIndex === -1) return // now playing or playlist item
                // Playing from manual queue: remove it and play
                removeFromQueue(item.queueIndex)
                play(item.track)
              }}
              onLongPress={() => setMenuTrack(item.track)}
              onMenuPress={() => setMenuTrack(item.track)}
            />
          )
        }}
        ListEmptyComponent={
          <View className="items-center mt-20">
            <Text className="text-white/30 text-lg">Queue is empty</Text>
            <Text className="text-white/20 text-sm mt-2 text-center px-8">
              Swipe right on a track to add it, or tap play on a playlist
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
