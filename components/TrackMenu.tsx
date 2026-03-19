import { View, Text, Pressable, Modal } from 'react-native'
import { Ionicons } from '@expo/vector-icons'
import { Track } from '@/shared/types'
import { usePlayerStore } from '@/stores/playerStore'
import { useLibraryStore } from '@/stores/libraryStore'

interface TrackMenuProps {
  track: Track
  visible: boolean
  onClose: () => void
  onEdit: () => void
  onRemoveFromPlaylist?: () => void
}

export default function TrackMenu({
  track,
  visible,
  onClose,
  onEdit,
  onRemoveFromPlaylist,
}: TrackMenuProps) {
  const addToQueue = usePlayerStore((s) => s.addToQueue)
  const playNext = usePlayerStore((s) => s.playNext)
  const playlists = useLibraryStore((s) => s.playlists)
  const addTrackToPlaylist = useLibraryStore((s) => s.addTrackToPlaylist)
  const deleteTrack = useLibraryStore((s) => s.deleteTrack)
  const archiveTrack = useLibraryStore((s) => s.archiveTrack)
  const unarchiveTrack = useLibraryStore((s) => s.unarchiveTrack)

  const isArchived = track.archived_at != null

  const menuItem = (
    label: string,
    icon: keyof typeof Ionicons.glyphMap,
    onPress: () => void,
    danger = false
  ) => (
    <Pressable
      key={label}
      onPress={() => {
        onPress()
        onClose()
      }}
      className="flex-row items-center gap-3 px-5 py-3.5 active:bg-surface-3"
    >
      <Ionicons
        name={icon}
        size={18}
        color={danger ? '#f87171' : 'rgba(255,255,255,0.5)'}
      />
      <Text className={`text-[15px] ${danger ? 'text-red-400' : 'text-white'}`}>
        {label}
      </Text>
    </Pressable>
  )

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <Pressable className="flex-1 justify-end bg-black/50" onPress={onClose}>
        <Pressable className="bg-surface-1 rounded-t-3xl pb-10" onPress={() => {}}>
          {/* Handle */}
          <View className="items-center py-3">
            <View className="w-10 h-1 rounded-full bg-white/20" />
          </View>

          {/* Header */}
          <View className="px-5 pb-3 border-b border-white/5">
            <Text className="text-white font-semibold text-base" numberOfLines={1}>
              {track.title}
            </Text>
            <Text className="text-white/40 text-sm mt-0.5">
              {track.artist || 'Unknown'}
            </Text>
          </View>

          {/* Actions */}
          {menuItem('Play Next', 'play-forward', () => playNext(track))}
          {menuItem('Add to Queue', 'list', () => addToQueue(track))}
          {menuItem('Edit Track', 'pencil', onEdit)}

          {isArchived
            ? menuItem('Unarchive', 'arrow-undo', () => unarchiveTrack(track.id))
            : menuItem('Archive', 'archive-outline', () => archiveTrack(track.id))}

          {playlists.length > 0 && (
            <View className="border-t border-white/5">
              <Text className="px-5 pt-3 pb-1 text-xs text-white/30 uppercase tracking-wider">
                Add to Playlist
              </Text>
              {playlists.map((p) =>
                menuItem(p.name, 'musical-notes-outline', () =>
                  addTrackToPlaylist(p.id, track.id)
                )
              )}
            </View>
          )}

          <View className="border-t border-white/5 mt-1">
            {onRemoveFromPlaylist &&
              menuItem('Remove from Playlist', 'remove-circle-outline', onRemoveFromPlaylist, true)}
            {menuItem('Delete Track', 'trash-outline', () => deleteTrack(track.id), true)}
          </View>
        </Pressable>
      </Pressable>
    </Modal>
  )
}
