import { useState } from 'react'
import { View, Text, FlatList } from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'
import { usePlayerStore } from '@/stores/playerStore'
import { Track } from '@/shared/types'
import TrackRow from '@/components/TrackRow'
import TrackMenu from '@/components/TrackMenu'
import TrackEditor from '@/components/TrackEditor'

export default function QueueScreen() {
  const queue = usePlayerStore((s) => s.queue)
  const queueIndex = usePlayerStore((s) => s.queueIndex)
  const currentTrack = usePlayerStore((s) => s.currentTrack)
  const setQueue = usePlayerStore((s) => s.setQueue)
  const removeFromQueue = usePlayerStore((s) => s.removeFromQueue)

  const [menuTrack, setMenuTrack] = useState<Track | null>(null)
  const [editTrack, setEditTrack] = useState<Track | null>(null)

  const upcoming = queue.slice(queueIndex + 1)

  return (
    <SafeAreaView className="flex-1 bg-surface-0" edges={['top']}>
      <View className="px-5 pt-2 pb-3">
        <Text className="text-2xl font-bold text-white">Queue</Text>
      </View>

      <FlatList
        data={[
          ...(currentTrack ? [{ type: 'header-now' as const }] : []),
          ...(currentTrack ? [{ type: 'now-playing' as const, track: currentTrack }] : []),
          { type: 'header-next' as const },
          ...upcoming.map((track, i) => ({
            type: 'upcoming' as const,
            track,
            originalIndex: queueIndex + 1 + i,
          })),
        ]}
        keyExtractor={(item, index) => {
          if ('track' in item && item.track) return item.track.id + index
          return item.type + index
        }}
        renderItem={({ item }) => {
          if (item.type === 'header-now') {
            return (
              <Text className="text-xs text-white/40 uppercase tracking-wider font-semibold px-5 pt-2 pb-1">
                Now Playing
              </Text>
            )
          }
          if (item.type === 'now-playing' && 'track' in item) {
            return (
              <TrackRow
                track={item.track}
                index={0}
                onPlay={() => {}}
                onLongPress={() => setMenuTrack(item.track)}
                onMenuPress={() => setMenuTrack(item.track)}
              />
            )
          }
          if (item.type === 'header-next') {
            return (
              <Text className="text-xs text-white/40 uppercase tracking-wider font-semibold px-5 pt-4 pb-1">
                Up Next {upcoming.length > 0 ? `(${upcoming.length})` : ''}
              </Text>
            )
          }
          if (item.type === 'upcoming' && 'track' in item) {
            return (
              <TrackRow
                track={item.track}
                index={('originalIndex' in item ? item.originalIndex - queueIndex : 0)}
                onPlay={() => {
                  if ('originalIndex' in item) {
                    setQueue(queue, item.originalIndex)
                  }
                }}
                onLongPress={() => setMenuTrack(item.track)}
                onMenuPress={() => setMenuTrack(item.track)}
              />
            )
          }
          return null
        }}
        ListEmptyComponent={
          <View className="items-center mt-20">
            <Text className="text-white/30 text-lg">Queue is empty</Text>
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
