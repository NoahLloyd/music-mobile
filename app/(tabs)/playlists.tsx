import { useState } from 'react'
import { View, Text, TextInput, FlatList, Pressable, Alert } from 'react-native'
import { Ionicons } from '@expo/vector-icons'
import { SafeAreaView } from 'react-native-safe-area-context'
import { useRouter } from 'expo-router'
import { useLibraryStore } from '@/stores/libraryStore'
import { usePlayerStore } from '@/stores/playerStore'

export default function PlaylistsScreen() {
  const playlists = useLibraryStore((s) => s.playlists)
  const createPlaylist = useLibraryStore((s) => s.createPlaylist)
  const deletePlaylist = useLibraryStore((s) => s.deletePlaylist)
  const getPlaylistTracks = useLibraryStore((s) => s.getPlaylistTracks)
  const playPlaylist = usePlayerStore((s) => s.playPlaylist)
  const router = useRouter()

  const [isCreating, setIsCreating] = useState(false)
  const [newName, setNewName] = useState('')

  const handleCreate = async () => {
    if (!newName.trim()) return
    const playlist = await createPlaylist(newName.trim())
    setNewName('')
    setIsCreating(false)
    router.push(`/playlist/${playlist.id}`)
  }

  const handleDelete = (id: string, name: string) => {
    Alert.alert('Delete Playlist', `Delete "${name}"?`, [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Delete',
        style: 'destructive',
        onPress: () => deletePlaylist(id),
      },
    ])
  }

  const handlePlayPlaylist = async (id: string) => {
    const tracks = await getPlaylistTracks(id)
    if (tracks.length > 0) {
      playPlaylist(tracks)
    }
  }

  return (
    <SafeAreaView className="flex-1 bg-surface-0" edges={['top']}>
      <View className="px-5 pt-2 pb-3 flex-row items-center justify-between">
        <Text className="text-2xl font-bold text-white">Playlists</Text>
        <Pressable
          onPress={() => setIsCreating(true)}
          className="bg-surface-2 px-4 py-2 rounded-full"
        >
          <Text className="text-accent text-sm font-semibold">+ New</Text>
        </Pressable>
      </View>

      {isCreating && (
        <View className="px-5 pb-3 flex-row gap-3">
          <TextInput
            value={newName}
            onChangeText={setNewName}
            placeholder="Playlist name"
            autoFocus
            onSubmitEditing={handleCreate}
            className="flex-1 bg-surface-2 text-white text-sm rounded-xl px-4 py-3"
            placeholderTextColor="rgba(255,255,255,0.25)"
            returnKeyType="done"
          />
          <Pressable
            onPress={() => {
              setIsCreating(false)
              setNewName('')
            }}
            className="justify-center px-3"
          >
            <Text className="text-white/40 text-sm">Cancel</Text>
          </Pressable>
        </View>
      )}

      <FlatList
        data={playlists}
        keyExtractor={(item) => item.id}
        renderItem={({ item }) => (
          <Pressable
            onPress={() => router.push(`/playlist/${item.id}`)}
            onLongPress={() => handleDelete(item.id, item.name)}
            className="flex-row items-center px-5 py-4 active:bg-surface-2"
          >
            <View className="w-14 h-14 rounded-xl bg-surface-2 items-center justify-center mr-4">
              <Ionicons name="musical-notes" size={22} color="rgba(255,255,255,0.2)" />
            </View>
            <View className="flex-1">
              <Text className="text-white text-base font-medium" numberOfLines={1}>
                {item.name}
              </Text>
              <Text className="text-white/30 text-sm mt-0.5">Playlist</Text>
            </View>
            <Pressable
              onPress={() => handlePlayPlaylist(item.id)}
              className="w-10 h-10 rounded-full bg-accent items-center justify-center ml-2"
              hitSlop={8}
            >
              <Ionicons name="play" size={18} color="black" style={{ marginLeft: 2 }} />
            </Pressable>
          </Pressable>
        )}
        ListEmptyComponent={
          <View className="items-center mt-20 px-6">
            <Text className="text-white/30 text-lg mb-2">No playlists</Text>
            <Text className="text-white/20 text-sm text-center">
              Tap "+ New" to create your first playlist
            </Text>
          </View>
        }
        contentContainerStyle={{ paddingBottom: 120 }}
      />
    </SafeAreaView>
  )
}
