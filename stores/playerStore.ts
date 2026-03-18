import { create } from 'zustand'
import TrackPlayer from 'react-native-track-player'
import { Track } from '@/shared/types'
import { getCachedOrRemoteUrl } from '@/lib/cache'

interface PlayerState {
  currentTrack: Track | null
  isPlaying: boolean
  progress: number
  duration: number
  queue: Track[]
  queueIndex: number

  play: (track?: Track) => void
  pause: () => void
  resume: () => void
  next: () => void
  previous: () => void
  seek: (time: number) => void
  setQueue: (tracks: Track[], startIndex?: number) => void
  addToQueue: (track: Track) => void
  playNext: (track: Track) => void
  removeFromQueue: (index: number) => void
  setProgress: (progress: number) => void
  setDuration: (duration: number) => void
}

async function loadTrackToPlayer(track: Track): Promise<void> {
  try {
    const url = await getCachedOrRemoteUrl(track.id, track.storage_path)
    await TrackPlayer.reset()
    await TrackPlayer.add({
      id: track.id,
      url,
      title: track.title,
      artist: track.artist || 'Unknown',
      artwork: track.artwork_url || undefined,
    })
    await TrackPlayer.play()
    if (track.start_time) {
      await TrackPlayer.seekTo(track.start_time)
    }
  } catch (e) {
    console.warn('Failed to load track:', e)
  }
}

export const usePlayerStore = create<PlayerState>((set, get) => ({
  currentTrack: null,
  isPlaying: false,
  progress: 0,
  duration: 0,
  queue: [],
  queueIndex: -1,

  play: (track) => {
    if (track) {
      const { queue } = get()
      const index = queue.findIndex((t) => t.id === track.id)
      if (index >= 0) {
        set({ queueIndex: index })
      }
      set({ currentTrack: track, isPlaying: true })
      loadTrackToPlayer(track)
    } else {
      get().resume()
    }
  },

  pause: () => {
    TrackPlayer.pause()
    set({ isPlaying: false })
  },

  resume: () => {
    TrackPlayer.play()
    set({ isPlaying: true })
  },

  next: () => {
    const { queue, queueIndex } = get()
    if (queueIndex < queue.length - 1) {
      const nextIndex = queueIndex + 1
      const nextTrack = queue[nextIndex]
      set({ queueIndex: nextIndex, currentTrack: nextTrack, isPlaying: true })
      loadTrackToPlayer(nextTrack)
    } else {
      TrackPlayer.pause()
      set({ isPlaying: false })
    }
  },

  previous: () => {
    const { queue, queueIndex, progress, currentTrack } = get()
    const startTime = currentTrack?.start_time || 0
    if (progress - startTime > 3) {
      TrackPlayer.seekTo(startTime)
      return
    }
    if (queueIndex > 0) {
      const prevIndex = queueIndex - 1
      const prevTrack = queue[prevIndex]
      set({ queueIndex: prevIndex, currentTrack: prevTrack, isPlaying: true })
      loadTrackToPlayer(prevTrack)
    }
  },

  seek: (time) => {
    TrackPlayer.seekTo(time)
  },

  setQueue: (tracks, startIndex = 0) => {
    set({ queue: tracks, queueIndex: startIndex })
    if (tracks.length > 0) {
      const track = tracks[startIndex]
      set({ currentTrack: track, isPlaying: true })
      loadTrackToPlayer(track)
    }
  },

  addToQueue: (track) => {
    set((state) => ({ queue: [...state.queue, track] }))
  },

  playNext: (track) => {
    set((state) => {
      const newQueue = [...state.queue]
      newQueue.splice(state.queueIndex + 1, 0, track)
      return { queue: newQueue }
    })
  },

  removeFromQueue: (index) => {
    set((state) => {
      const newQueue = [...state.queue]
      newQueue.splice(index, 1)
      const newIndex = index < state.queueIndex ? state.queueIndex - 1 : state.queueIndex
      return { queue: newQueue, queueIndex: newIndex }
    })
  },

  setProgress: (progress) => set({ progress }),
  setDuration: (duration) => set({ duration }),
}))
