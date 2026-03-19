import { create } from 'zustand'
import TrackPlayer from 'react-native-track-player'
import { Track } from '@/shared/types'
import { getCachedOrRemoteUrl } from '@/lib/cache'

interface PlayerState {
  currentTrack: Track | null
  isPlaying: boolean
  progress: number
  duration: number

  // Manual queue: songs the user explicitly added (highest priority)
  manualQueue: Track[]

  // Playlist source: when user hits play on a playlist, these are the
  // "recommendations" that play after the manual queue is empty
  playlistSource: Track[]
  playlistSourceIndex: number

  // History of recently played track IDs to avoid repeats in auto-pick
  playHistory: string[]

  // All library tracks reference (set by the library store)
  allTracks: Track[]

  play: (track: Track) => void
  pause: () => void
  resume: () => void
  next: () => void
  previous: () => void
  seek: (time: number) => void
  addToQueue: (track: Track) => void
  playNext: (track: Track) => void
  removeFromQueue: (index: number) => void
  playPlaylist: (tracks: Track[], startIndex?: number) => void
  setAllTracks: (tracks: Track[]) => void
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

function addToHistory(history: string[], trackId: string): string[] {
  const filtered = history.filter((id) => id !== trackId)
  return [trackId, ...filtered].slice(0, 50) // Keep last 50
}

function pickAutoTrack(allTracks: Track[], history: string[], currentId?: string): Track | null {
  if (allTracks.length === 0) return null

  // Filter out current track
  const candidates = allTracks.filter((t) => t.id !== currentId)
  if (candidates.length === 0) return allTracks[0]

  // Score by recency in history — lower index = more recent = higher penalty
  const scored = candidates.map((track) => {
    const histIndex = history.indexOf(track.id)
    // Not in history = best score (100), recently played = low score
    const score = histIndex === -1 ? 100 : Math.min(histIndex, 50)
    // Add some randomness
    return { track, score: score + Math.random() * 10 }
  })

  scored.sort((a, b) => b.score - a.score)
  return scored[0].track
}

export const usePlayerStore = create<PlayerState>((set, get) => ({
  currentTrack: null,
  isPlaying: false,
  progress: 0,
  duration: 0,
  manualQueue: [],
  playlistSource: [],
  playlistSourceIndex: 0,
  playHistory: [],
  allTracks: [],

  play: (track) => {
    const history = addToHistory(get().playHistory, track.id)
    set({ currentTrack: track, isPlaying: true, playHistory: history })
    loadTrackToPlayer(track)
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
    const { manualQueue, playlistSource, playlistSourceIndex, allTracks, playHistory, currentTrack } = get()

    // Priority 1: manual queue
    if (manualQueue.length > 0) {
      const [nextTrack, ...rest] = manualQueue
      const history = addToHistory(playHistory, nextTrack.id)
      set({
        currentTrack: nextTrack,
        isPlaying: true,
        manualQueue: rest,
        playHistory: history,
      })
      loadTrackToPlayer(nextTrack)
      return
    }

    // Priority 2: playlist source
    if (playlistSource.length > 0 && playlistSourceIndex < playlistSource.length) {
      const nextTrack = playlistSource[playlistSourceIndex]
      const history = addToHistory(playHistory, nextTrack.id)
      set({
        currentTrack: nextTrack,
        isPlaying: true,
        playlistSourceIndex: playlistSourceIndex + 1,
        playHistory: history,
      })
      loadTrackToPlayer(nextTrack)
      return
    }

    // Priority 3: auto-pick from library
    const autoTrack = pickAutoTrack(allTracks, playHistory, currentTrack?.id)
    if (autoTrack) {
      const history = addToHistory(playHistory, autoTrack.id)
      set({
        currentTrack: autoTrack,
        isPlaying: true,
        playHistory: history,
        // Clear exhausted playlist source
        playlistSource: [],
        playlistSourceIndex: 0,
      })
      loadTrackToPlayer(autoTrack)
    } else {
      TrackPlayer.pause()
      set({ isPlaying: false })
    }
  },

  previous: () => {
    const { progress, currentTrack, playHistory, allTracks } = get()
    const startTime = currentTrack?.start_time || 0

    // If more than 3 seconds in, restart current track
    if (progress - startTime > 3) {
      TrackPlayer.seekTo(startTime)
      return
    }

    // Otherwise pick from history (skip index 0 which is current)
    if (playHistory.length > 1) {
      const prevId = playHistory[1]
      const prevTrack = allTracks.find((t) => t.id === prevId)
      if (prevTrack) {
        set({ currentTrack: prevTrack, isPlaying: true })
        loadTrackToPlayer(prevTrack)
        return
      }
    }

    // Fallback: restart current
    TrackPlayer.seekTo(startTime)
  },

  seek: (time) => {
    TrackPlayer.seekTo(time)
  },

  addToQueue: (track) => {
    set((state) => ({ manualQueue: [...state.manualQueue, track] }))
  },

  playNext: (track) => {
    set((state) => ({ manualQueue: [track, ...state.manualQueue] }))
  },

  removeFromQueue: (index) => {
    set((state) => {
      const newQueue = [...state.manualQueue]
      newQueue.splice(index, 1)
      return { manualQueue: newQueue }
    })
  },

  playPlaylist: (tracks, startIndex = 0) => {
    if (tracks.length === 0) return
    const track = tracks[startIndex]
    const history = addToHistory(get().playHistory, track.id)
    set({
      currentTrack: track,
      isPlaying: true,
      // Set remaining playlist tracks as the source (after the starting track)
      playlistSource: tracks,
      playlistSourceIndex: startIndex + 1,
      playHistory: history,
    })
    loadTrackToPlayer(track)
  },

  setAllTracks: (tracks) => set({ allTracks: tracks }),
  setProgress: (progress) => set({ progress }),
  setDuration: (duration) => set({ duration }),
}))
