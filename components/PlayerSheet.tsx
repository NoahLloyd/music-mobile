import { View, Text, Image, Pressable, Modal } from 'react-native'
import { Ionicons } from '@expo/vector-icons'
import { usePlayerStore } from '@/stores/playerStore'
import Slider from '@react-native-community/slider'
import { useProgress } from 'react-native-track-player'

interface PlayerSheetProps {
  visible: boolean
  onClose: () => void
}

function formatTime(seconds: number): string {
  if (!seconds || isNaN(seconds)) return '0:00'
  const mins = Math.floor(seconds / 60)
  const secs = Math.floor(seconds % 60)
  return `${mins}:${secs.toString().padStart(2, '0')}`
}

export default function PlayerSheet({ visible, onClose }: PlayerSheetProps) {
  const currentTrack = usePlayerStore((s) => s.currentTrack)
  const isPlaying = usePlayerStore((s) => s.isPlaying)
  const pause = usePlayerStore((s) => s.pause)
  const resume = usePlayerStore((s) => s.resume)
  const next = usePlayerStore((s) => s.next)
  const previous = usePlayerStore((s) => s.previous)
  const seek = usePlayerStore((s) => s.seek)

  const progress = useProgress(250)

  if (!currentTrack) return null

  const isProcessed = !!currentTrack.processed_storage_path
  const effectiveDuration = isProcessed ? progress.duration : (currentTrack.end_time || progress.duration)
  const effectiveStart = isProcessed ? 0 : (currentTrack.start_time || 0)

  return (
    <Modal visible={visible} animationType="slide" onRequestClose={onClose}>
      <View className="flex-1 bg-surface-0 px-6 pt-16 pb-16">
        {/* Close handle */}
        <Pressable onPress={onClose} className="items-center mb-8">
          <View className="w-10 h-1 rounded-full bg-white/20" />
        </Pressable>

        {/* Artwork */}
        <View className="items-center mb-10 flex-1 justify-center">
          {currentTrack.artwork_url ? (
            <Image
              source={{ uri: currentTrack.artwork_url }}
              className="w-72 h-72 rounded-2xl"
              resizeMode="cover"
            />
          ) : (
            <View className="w-72 h-72 rounded-2xl bg-surface-2 items-center justify-center">
              <Ionicons name="musical-note" size={64} color="rgba(255,255,255,0.08)" />
            </View>
          )}
        </View>

        {/* Track info */}
        <View className="mb-6">
          <Text className="text-xl font-bold text-white" numberOfLines={1}>
            {currentTrack.title}
          </Text>
          <Text className="text-base text-white/40 mt-1" numberOfLines={1}>
            {currentTrack.artist || 'Unknown'}
          </Text>
        </View>

        {/* Progress slider */}
        <View className="mb-2">
          <Slider
            value={progress.position}
            minimumValue={effectiveStart}
            maximumValue={effectiveDuration || 1}
            onSlidingComplete={seek}
            minimumTrackTintColor="#22c55e"
            maximumTrackTintColor="rgba(255,255,255,0.1)"
            thumbTintColor="#22c55e"
          />
          <View className="flex-row justify-between px-1">
            <Text className="text-xs text-white/30">
              {formatTime(progress.position - effectiveStart)}
            </Text>
            <Text className="text-xs text-white/30">
              {formatTime(effectiveDuration - effectiveStart)}
            </Text>
          </View>
        </View>

        {/* Controls */}
        <View className="flex-row items-center justify-center gap-10 mt-4 mb-4">
          <Pressable onPress={previous} className="p-3">
            <Ionicons name="play-back" size={28} color="rgba(255,255,255,0.5)" />
          </Pressable>
          <Pressable
            onPress={() => (isPlaying ? pause() : resume())}
            className="w-16 h-16 rounded-full bg-white items-center justify-center"
          >
            <Ionicons
              name={isPlaying ? 'pause' : 'play'}
              size={28}
              color="black"
              style={isPlaying ? undefined : { marginLeft: 3 }}
            />
          </Pressable>
          <Pressable onPress={next} className="p-3">
            <Ionicons name="play-forward" size={28} color="rgba(255,255,255,0.5)" />
          </Pressable>
        </View>
      </View>
    </Modal>
  )
}
