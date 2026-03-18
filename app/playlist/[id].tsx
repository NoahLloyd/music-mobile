import { useEffect, useState } from 'react'
import { View, Text, FlatList, Pressable, TextInput, Alert } from 'react-native'
import { Ionicons } from '@expo/vector-icons'
import { SafeAreaView } from 'react-native-safe-area-context'
import { useLocalSearchParams, useRouter } from 'expo-router'
import { useLibraryStore } from '@/stores/libraryStore'
import { usePlayerStore } from '@/stores/playerStore'
import { Track } from '@/shared/types'
import TrackRow from '@/components/TrackRow'
import TrackMenu from '@/components/TrackMenu'
import TrackEditor from '@/components/TrackEditor'

export default function PlaylistScreen() {
  const { id } = useLocalSearchParams<{ id: string }>()
  const router = useRouter()
  const playlists = useLibraryStore((s) => s.playlists)
  const getPlaylistTracks = useLibraryStore((s) => s.getPlaylistTracks)
  const removeTrackFromPlaylist = useLibraryStore((s) => s.removeTrackFromPlaylist)
  const renamePlaylist = useLibraryStore((s) => s.renamePlaylist)
  const setQueue = usePlayerStore((s) => s.setQueue)

  const [tracks, setTracks] = useState<Track[]>([])
  const [editing, setEditing] = useState(false)
  const [editName, setEditName] = useState('')
  const [menuTrack, setMenuTrack] = useState<Track | null>(null)
  const [editTrack, setEditTrack] = useState<Track | null>(null)

  const playlist = playlists.find((p) => p.id === id)

  useEffect(() => {
    if (id) loadTracks()
  }, [id])

  const loadTracks = async () => {
    if (!id) return
    const t = await getPlaylistTracks(id)
    setTracks(t)
  }

  const handlePlay = (index: number) => {
    setQueue(tracks, index)
  }

  const handleRemove = async (trackId: string) => {
    if (!id) return
    await removeTrackFromPlaylist(id, trackId)
    loadTracks()
  }

  const handleRename = async () => {
    if (editName.trim() && id) {
      await renamePlaylist(id, editName.trim())
    }
    setEditing(false)
  }

  if (!playlist) return null

  return (
    <SafeAreaView className="flex-1 bg-surface-0" edges={['top']}>
      <View className="px-5 pt-2 pb-3">
        {/* Back button */}
        <Pressable onPress={() => router.back()} className="mb-3 flex-row items-center gap-1">
          <Ionicons name="chevron-back" size={18} color="#22c55e" />
          <Text className="text-accent text-sm">Back</Text>
        </Pressable>

        {/* Title */}
        {editing ? (
          <TextInput
            value={editName}
            onChangeText={setEditName}
            onSubmitEditing={handleRename}
            onBlur={handleRename}
            autoFocus
            className="text-2xl font-bold text-white bg-transparent border-b border-accent pb-1"
          />
        ) : (
          <Pressable
            onLongPress={() => {
              setEditName(playlist.name)
              setEditing(true)
            }}
          >
            <Text className="text-2xl font-bold text-white">{playlist.name}</Text>
          </Pressable>
        )}
        <Text className="text-sm text-white/30 mt-1">{tracks.length} tracks</Text>

        {tracks.length > 0 && (
          <Pressable
            onPress={() => handlePlay(0)}
            className="mt-4 bg-accent active:bg-accent-hover rounded-full py-2.5 px-6 self-start"
          >
            <Text className="text-black font-semibold text-sm">Play All</Text>
          </Pressable>
        )}
      </View>

      <FlatList
        data={tracks}
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
        ListEmptyComponent={
          <View className="items-center mt-16 px-6">
            <Text className="text-white/30 text-base">No tracks yet</Text>
            <Text className="text-white/20 text-sm mt-1 text-center">
              Long-press a track in your library to add it here
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
          onRemoveFromPlaylist={() => handleRemove(menuTrack.id)}
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
