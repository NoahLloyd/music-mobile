import { View, Text, Image, Pressable } from 'react-native'
import { Ionicons } from '@expo/vector-icons'
import { usePlayerStore } from '@/stores/playerStore'
import { useEffect, useRef } from 'react'
import { useProgress, usePlaybackState, State } from 'react-native-track-player'

export default function PlayerBar() {
  const currentTrack = usePlayerStore((s) => s.currentTrack)
  const isPlaying = usePlayerStore((s) => s.isPlaying)
  const pause = usePlayerStore((s) => s.pause)
  const resume = usePlayerStore((s) => s.resume)
  const next = usePlayerStore((s) => s.next)
  const setProgress = usePlayerStore((s) => s.setProgress)
  const setDuration = usePlayerStore((s) => s.setDuration)

  const progress = useProgress(250)
  const playbackState = usePlaybackState()
  const lastAdvancedTrackId = useRef<string | null>(null)

  useEffect(() => {
    setProgress(progress.position)
    setDuration(progress.duration)

    if (
      currentTrack?.end_time &&
      progress.position >= currentTrack.end_time &&
      lastAdvancedTrackId.current !== currentTrack.id
    ) {
      lastAdvancedTrackId.current = currentTrack.id
      next()
    }
  }, [progress.position])

  useEffect(() => {
    const playing = playbackState.state === State.Playing
    if (playing !== isPlaying) {
      usePlayerStore.setState({ isPlaying: playing })
    }
  }, [playbackState.state])

  if (!currentTrack) return null

  const effectiveDuration = currentTrack.end_time || progress.duration || 1
  const effectiveStart = currentTrack.start_time || 0
  const progressPct =
    ((progress.position - effectiveStart) / (effectiveDuration - effectiveStart)) * 100

  return (
    <View className="bg-surface-1 border-t border-white/5">
      <View className="h-0.5 bg-surface-3">
        <View
          className="h-full bg-accent"
          style={{ width: `${Math.min(Math.max(progressPct, 0), 100)}%` }}
        />
      </View>

      <View className="flex-row items-center px-4 py-2.5 gap-3">
        {currentTrack.artwork_url ? (
          <Image
            source={{ uri: currentTrack.artwork_url }}
            className="w-10 h-10 rounded-lg"
          />
        ) : (
          <View className="w-10 h-10 rounded-lg bg-surface-3 items-center justify-center">
            <Ionicons name="musical-note" size={16} color="rgba(255,255,255,0.15)" />
          </View>
        )}

        <View className="flex-1 min-w-0">
          <Text className="text-sm text-white" numberOfLines={1}>
            {currentTrack.title}
          </Text>
          <Text className="text-xs text-white/35" numberOfLines={1}>
            {currentTrack.artist || 'Unknown'}
          </Text>
        </View>

        <Pressable onPress={() => (isPlaying ? pause() : resume())} className="p-2">
          <Ionicons
            name={isPlaying ? 'pause' : 'play'}
            size={22}
            color="white"
          />
        </Pressable>

        <Pressable onPress={next} className="p-2">
          <Ionicons name="play-forward" size={18} color="rgba(255,255,255,0.4)" />
        </Pressable>
      </View>
    </View>
  )
}
