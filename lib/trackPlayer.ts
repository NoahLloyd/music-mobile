import TrackPlayer, {
  AppKilledPlaybackBehavior,
  Capability,
  Event,
  RepeatMode,
} from 'react-native-track-player'

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
  TrackPlayer.addEventListener(Event.RemotePause, () => TrackPlayer.pause())
  TrackPlayer.addEventListener(Event.RemotePlay, () => TrackPlayer.play())
  TrackPlayer.addEventListener(Event.RemoteNext, () => TrackPlayer.skipToNext())
  TrackPlayer.addEventListener(Event.RemotePrevious, () => TrackPlayer.skipToPrevious())
  TrackPlayer.addEventListener(Event.RemoteSeek, (event) => {
    TrackPlayer.seekTo(event.position)
  })
}
