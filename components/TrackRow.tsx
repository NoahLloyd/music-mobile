import { useRef } from 'react'
import { View, Text, Image, Pressable, Animated, PanResponder } from 'react-native'
import { Ionicons } from '@expo/vector-icons'
import { Track } from '@/shared/types'
import { usePlayerStore } from '@/stores/playerStore'

interface TrackRowProps {
  track: Track
  index: number
  onPlay: () => void
  onLongPress?: () => void
  onMenuPress?: () => void
}

function formatDuration(
  seconds: number | null,
  start?: number | null,
  end?: number | null
): string {
  if (!seconds && !end) return '--:--'
  const effective = (end || seconds || 0) - (start || 0)
  const mins = Math.floor(effective / 60)
  const secs = Math.floor(effective % 60)
  return `${mins}:${secs.toString().padStart(2, '0')}`
}

const SWIPE_THRESHOLD = 80

export default function TrackRow({ track, index, onPlay, onLongPress, onMenuPress }: TrackRowProps) {
  const currentTrack = usePlayerStore((s) => s.currentTrack)
  const isPlaying = usePlayerStore((s) => s.isPlaying)
  const addToQueue = usePlayerStore((s) => s.addToQueue)
  const isCurrent = currentTrack?.id === track.id

  const translateX = useRef(new Animated.Value(0)).current
  const showingQueue = useRef(false)

  const panResponder = useRef(
    PanResponder.create({
      onMoveShouldSetPanResponder: (_, gestureState) =>
        Math.abs(gestureState.dx) > 10 && Math.abs(gestureState.dx) > Math.abs(gestureState.dy),
      onPanResponderMove: (_, gestureState) => {
        if (gestureState.dx > 0) {
          translateX.setValue(Math.min(gestureState.dx, 120))
          showingQueue.current = gestureState.dx > SWIPE_THRESHOLD
        }
      },
      onPanResponderRelease: (_, gestureState) => {
        if (gestureState.dx > SWIPE_THRESHOLD) {
          addToQueue(track)
        }
        Animated.spring(translateX, {
          toValue: 0,
          useNativeDriver: true,
          tension: 40,
          friction: 8,
        }).start()
        showingQueue.current = false
      },
    })
  ).current

  const openMenu = () => {
    if (onMenuPress) onMenuPress()
    else if (onLongPress) onLongPress()
  }

  return (
    <View className="overflow-hidden">
      {/* Swipe background */}
      <View className="absolute inset-0 flex-row items-center pl-5 bg-accent/15">
        <Ionicons name="add-circle-outline" size={20} color="#22c55e" />
        <Text className="text-accent text-xs ml-2 font-medium">Queue</Text>
      </View>

      <Animated.View
        style={{ transform: [{ translateX }] }}
        {...panResponder.panHandlers}
      >
        <Pressable
          onPress={onPlay}
          onLongPress={onLongPress}
          className={`flex-row items-center gap-3 px-4 py-3 bg-surface-0 ${
            isCurrent ? 'bg-surface-2' : 'active:bg-surface-2'
          }`}
        >
          {/* Index / playing indicator */}
          <Pressable onPress={openMenu} className="w-8 items-center justify-center">
            {isCurrent && isPlaying ? (
              <Ionicons name="musical-note" size={14} color="rgba(255,255,255,0.4)" />
            ) : (
              <Text className="text-white/30 text-sm">{index + 1}</Text>
            )}
          </Pressable>

          {/* Artwork */}
          {track.artwork_url ? (
            <Image
              source={{ uri: track.artwork_url }}
              className="w-11 h-11 rounded-lg"
            />
          ) : (
            <View className="w-11 h-11 rounded-lg bg-surface-3 items-center justify-center">
              <Ionicons name="musical-note" size={18} color="rgba(255,255,255,0.15)" />
            </View>
          )}

          {/* Track info */}
          <View className="flex-1 min-w-0">
            <Text
              className={`text-sm ${isCurrent ? 'text-accent' : 'text-white'}`}
              numberOfLines={1}
            >
              {track.title}
            </Text>
            <Text className="text-xs text-white/40" numberOfLines={1}>
              {track.artist || 'Unknown'}
            </Text>
          </View>

          {/* Duration - tappable to open menu */}
          <Pressable onPress={openMenu} className="pl-2 pr-1 py-2">
            <Text className="text-xs text-white/30">
              {formatDuration(track.duration, track.start_time, track.end_time)}
            </Text>
          </Pressable>
        </Pressable>
      </Animated.View>
    </View>
  )
}
