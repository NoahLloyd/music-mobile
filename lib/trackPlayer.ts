import TrackPlayer, {
  AppKilledPlaybackBehavior,
  Capability,
  Event,
  RepeatMode,
} from 'react-native-track-player'
import { usePlayerStore } from '@/stores/playerStore'

export function registerPlayback() {
  try {
    TrackPlayer.registerPlaybackService(() => playbackService)
  } catch (e) {
    console.warn('Failed to register playback service:', e)
  }
}

export async function setupPlayer(): Promise<boolean> {
  try {
    await TrackPlayer.getActiveTrack()
    return true
  } catch {
    try {
      await TrackPlayer.setupPlayer()
      await TrackPlayer.updateOptions({
        android: {
          appKilledPlaybackBehavior: AppKilledPlaybackBehavior.ContinuePlayback,
        },
        capabilities: [
          Capability.Play,
          Capability.Pause,
          Capability.SkipToNext,
          Capability.SkipToPrevious,
          Capability.SeekTo,
        ],
        compactCapabilities: [
          Capability.Play,
          Capability.Pause,
          Capability.SkipToNext,
        ],
      })
      await TrackPlayer.setRepeatMode(RepeatMode.Off)
      return true
    } catch (e) {
      console.warn('Track player setup failed:', e)
      return false
    }
  }
}

async function playbackService() {
  TrackPlayer.addEventListener(Event.RemotePause, () => {
    usePlayerStore.getState().pause()
  })
  TrackPlayer.addEventListener(Event.RemotePlay, () => {
    usePlayerStore.getState().resume()
  })
  TrackPlayer.addEventListener(Event.RemoteNext, () => {
    usePlayerStore.getState().next()
  })
  TrackPlayer.addEventListener(Event.RemotePrevious, () => {
    usePlayerStore.getState().previous()
  })
  TrackPlayer.addEventListener(Event.RemoteSeek, (event) => {
    TrackPlayer.seekTo(event.position)
  })
  // Auto-advance when a track finishes
  TrackPlayer.addEventListener(Event.PlaybackQueueEnded, (event) => {
    if (event.track !== undefined) {
      usePlayerStore.getState().next()
    }
  })
}
