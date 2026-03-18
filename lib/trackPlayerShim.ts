// Re-exports for files that import from this shim
import TrackPlayer, { useProgress, usePlaybackState } from 'react-native-track-player'

export function getTrackPlayer() {
  return TrackPlayer
}

export function useTrackPlayerProgress(interval = 250) {
  return useProgress(interval)
}

export function useTrackPlayerPlaybackState() {
  return usePlaybackState()
}

export const isTrackPlayerAvailable = true
