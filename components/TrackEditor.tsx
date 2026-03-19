import { useState } from 'react'
import { View, Text, TextInput, Pressable, Modal, ScrollView } from 'react-native'
import { Track } from '@/shared/types'
import { useLibraryStore } from '@/stores/libraryStore'

interface TrackEditorProps {
  track: Track
  visible: boolean
  onClose: () => void
}

export default function TrackEditor({ track, visible, onClose }: TrackEditorProps) {
  const updateTrack = useLibraryStore((s) => s.updateTrack)
  const [title, setTitle] = useState(track.title)
  const [artist, setArtist] = useState(track.artist || '')
  const [artworkUrl, setArtworkUrl] = useState(track.artwork_url || '')
  const [saving, setSaving] = useState(false)

  const handleSave = async () => {
    setSaving(true)
    try {
      await updateTrack(track.id, {
        title: title.trim() || track.title,
        artist: artist.trim() || null,
        artwork_url: artworkUrl.trim() || null,
      })
      onClose()
    } catch (err) {
      console.error('Failed to save:', err)
    } finally {
      setSaving(false)
    }
  }

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <Pressable className="flex-1 justify-end bg-black/50" onPress={onClose}>
        <Pressable className="bg-surface-1 rounded-t-3xl pb-8" onPress={() => {}}>
          <View className="items-center py-3">
            <View className="w-10 h-1 rounded-full bg-white/20" />
          </View>

          <ScrollView className="px-5">
            <Text className="text-lg font-semibold text-white mb-5">Edit Track</Text>

            <View className="mb-4">
              <Text className="text-xs text-white/40 uppercase tracking-wider mb-1.5">
                Title
              </Text>
              <TextInput
                value={title}
                onChangeText={setTitle}
                className="bg-surface-3 text-white text-sm rounded-xl px-4 py-3"
                placeholderTextColor="rgba(255,255,255,0.2)"
              />
            </View>

            <View className="mb-4">
              <Text className="text-xs text-white/40 uppercase tracking-wider mb-1.5">
                Artist
              </Text>
              <TextInput
                value={artist}
                onChangeText={setArtist}
                placeholder="Unknown"
                className="bg-surface-3 text-white text-sm rounded-xl px-4 py-3"
                placeholderTextColor="rgba(255,255,255,0.2)"
              />
            </View>

            <View className="mb-6">
              <Text className="text-xs text-white/40 uppercase tracking-wider mb-1.5">
                Artwork URL
              </Text>
              <TextInput
                value={artworkUrl}
                onChangeText={setArtworkUrl}
                placeholder="https://..."
                className="bg-surface-3 text-white text-sm rounded-xl px-4 py-3"
                placeholderTextColor="rgba(255,255,255,0.2)"
                autoCapitalize="none"
                autoCorrect={false}
              />
            </View>

            <View className="flex-row gap-3 mb-4">
              <Pressable
                onPress={onClose}
                className="flex-1 items-center py-3 rounded-xl bg-surface-3"
              >
                <Text className="text-white/50 text-sm font-medium">Cancel</Text>
              </Pressable>
              <Pressable
                onPress={handleSave}
                disabled={saving}
                className="flex-1 items-center py-3 rounded-xl bg-accent active:bg-accent-hover disabled:opacity-50"
              >
                <Text className="text-black text-sm font-semibold">
                  {saving ? 'Saving...' : 'Save'}
                </Text>
              </Pressable>
            </View>
          </ScrollView>
        </Pressable>
      </Pressable>
    </Modal>
  )
}
