import { create } from 'zustand'
import { Track, Playlist, PlaylistTrack } from '@/shared/types'
import { supabase, getAudioUrl } from '@/lib/supabase'
import { File } from 'expo-file-system'
import * as DocumentPicker from 'expo-document-picker'
import { cacheTrackFromBytes } from '@/lib/cache'

interface LibraryState {
  tracks: Track[]
  archivedTracks: Track[]
  playlists: Playlist[]
  loading: boolean
  searchQuery: string
  lastError: string | null

  fetchTracks: () => Promise<void>
  fetchArchivedTracks: () => Promise<void>
  fetchPlaylists: () => Promise<void>
  updateTrack: (id: string, updates: Partial<Track>) => Promise<void>
  deleteTrack: (id: string) => Promise<void>
  archiveTrack: (id: string) => Promise<void>
  unarchiveTrack: (id: string) => Promise<void>
  createPlaylist: (name: string) => Promise<Playlist>
  deletePlaylist: (id: string) => Promise<void>
  renamePlaylist: (id: string, name: string) => Promise<void>
  getPlaylistTracks: (playlistId: string) => Promise<Track[]>
  addTrackToPlaylist: (playlistId: string, trackId: string) => Promise<void>
  removeTrackFromPlaylist: (playlistId: string, trackId: string) => Promise<void>
  setSearchQuery: (query: string) => void
  importFiles: () => Promise<Track[]>
}

export const useLibraryStore = create<LibraryState>((set, get) => ({
  tracks: [],
  archivedTracks: [],
  playlists: [],
  loading: false,
  searchQuery: '',
  lastError: null,

  fetchTracks: async () => {
    try {
      const { data, error } = await supabase
        .from('tracks')
        .select('*')
        .is('archived_at', null)
        .order('created_at', { ascending: false })
      if (error) {
        set({ lastError: `fetchTracks: ${error.message}` })
        return
      }
      set({ tracks: data ?? [], lastError: null })
    } catch (e: any) {
      set({ lastError: `fetchTracks exception: ${e.message || e}` })
    }
  },

  fetchArchivedTracks: async () => {
    try {
      const { data, error } = await supabase
        .from('tracks')
        .select('*')
        .not('archived_at', 'is', null)
        .order('archived_at', { ascending: false })
      if (error) return
      set({ archivedTracks: data ?? [] })
    } catch {}
  },

  fetchPlaylists: async () => {
    try {
      const { data, error } = await supabase
        .from('playlists')
        .select('*')
        .order('created_at', { ascending: false })
      if (error) {
        set({ lastError: `fetchPlaylists: ${error.message}` })
        return
      }
      set({ playlists: data ?? [] })
    } catch (e: any) {
      set({ lastError: `fetchPlaylists exception: ${e.message || e}` })
    }
  },

  updateTrack: async (id, updates) => {
    const { error } = await supabase.from('tracks').update(updates).eq('id', id)
    if (error) throw error
    set((state) => ({
      tracks: state.tracks.map((t) => (t.id === id ? { ...t, ...updates } : t)),
    }))
  },

  deleteTrack: async (id) => {
    await supabase.from('tracks').delete().eq('id', id)
    set((state) => ({
      tracks: state.tracks.filter((t) => t.id !== id),
      archivedTracks: state.archivedTracks.filter((t) => t.id !== id),
    }))
  },

  archiveTrack: async (id) => {
    const archivedAt = new Date().toISOString()
    const { error } = await supabase
      .from('tracks')
      .update({ archived_at: archivedAt })
      .eq('id', id)
    if (error) throw error
    set((state) => {
      const track = state.tracks.find((t) => t.id === id)
      return {
        tracks: state.tracks.filter((t) => t.id !== id),
        archivedTracks: track
          ? [{ ...track, archived_at: archivedAt }, ...state.archivedTracks]
          : state.archivedTracks,
      }
    })
  },

  unarchiveTrack: async (id) => {
    const { error } = await supabase
      .from('tracks')
      .update({ archived_at: null })
      .eq('id', id)
    if (error) throw error
    set((state) => {
      const track = state.archivedTracks.find((t) => t.id === id)
      return {
        archivedTracks: state.archivedTracks.filter((t) => t.id !== id),
        tracks: track
          ? [{ ...track, archived_at: null }, ...state.tracks]
          : state.tracks,
      }
    })
  },

  createPlaylist: async (name) => {
    const { data, error } = await supabase
      .from('playlists')
      .insert({ name })
      .select()
      .single()
    if (error) throw error
    set((state) => ({ playlists: [data, ...state.playlists] }))
    return data
  },

  deletePlaylist: async (id) => {
    await supabase.from('playlists').delete().eq('id', id)
    set((state) => ({ playlists: state.playlists.filter((p) => p.id !== id) }))
  },

  renamePlaylist: async (id, name) => {
    await supabase
      .from('playlists')
      .update({ name, updated_at: new Date().toISOString() })
      .eq('id', id)
    set((state) => ({
      playlists: state.playlists.map((p) => (p.id === id ? { ...p, name } : p)),
    }))
  },

  getPlaylistTracks: async (playlistId) => {
    const { data, error } = await supabase
      .from('playlist_tracks')
      .select('*, track:tracks(*)')
      .eq('playlist_id', playlistId)
      .order('position')
    if (error) throw error
    return (data as (PlaylistTrack & { track: Track })[]).map((pt) => pt.track)
  },

  addTrackToPlaylist: async (playlistId, trackId) => {
    const { data: existing } = await supabase
      .from('playlist_tracks')
      .select('position')
      .eq('playlist_id', playlistId)
      .order('position', { ascending: false })
      .limit(1)
    const nextPosition = existing && existing.length > 0 ? existing[0].position + 1 : 0
    await supabase.from('playlist_tracks').insert({
      playlist_id: playlistId,
      track_id: trackId,
      position: nextPosition,
    })
  },

  removeTrackFromPlaylist: async (playlistId, trackId) => {
    await supabase
      .from('playlist_tracks')
      .delete()
      .eq('playlist_id', playlistId)
      .eq('track_id', trackId)
  },

  setSearchQuery: (query) => set({ searchQuery: query }),

  // Import local files via document picker
  importFiles: async () => {
    set({ loading: true, lastError: null })
    try {
      const result = await DocumentPicker.getDocumentAsync({
        type: 'audio/*',
        multiple: true,
        copyToCacheDirectory: true,
      })

      if (result.canceled) {
        set({ loading: false })
        return []
      }

      const imported: Track[] = []

      for (const asset of result.assets) {
        try {
          const title = asset.name?.replace(/\.[^/.]+$/, '') || 'Unknown'
          const ext = asset.name?.match(/\.[^/.]+$/)?.[0] || '.mp3'

          // Read file and upload to Supabase Storage
          const file = new File(asset.uri)
          const fileContent = file.text()

          const fileName = `${Date.now()}-${title.replace(/[^a-zA-Z0-9]/g, '_').slice(0, 50)}${ext}`
          const storagePath = `tracks/${fileName}`

          // Read as blob for upload
          const response = await fetch(asset.uri)
          const blob = await response.blob()
          const bytes = new Uint8Array(await blob.arrayBuffer())

          const mimeMap: Record<string, string> = {
            '.mp3': 'audio/mpeg',
            '.m4a': 'audio/mp4',
            '.wav': 'audio/wav',
            '.flac': 'audio/flac',
            '.ogg': 'audio/ogg',
            '.aac': 'audio/aac',
          }

          const { error: uploadError } = await supabase.storage
            .from('audio-files')
            .upload(storagePath, bytes, {
              contentType: mimeMap[ext.toLowerCase()] || 'audio/mpeg',
              upsert: true,
            })

          if (uploadError) throw uploadError

          // Insert track into DB
          const { data: track, error: dbError } = await supabase
            .from('tracks')
            .insert({
              title,
              artist: null,
              duration: null,
              youtube_url: null,
              storage_path: storagePath,
              artwork_url: null,
              start_time: null,
              end_time: null,
            })
            .select()
            .single()

          if (dbError) throw dbError
          // Cache locally so it's available offline immediately
          cacheTrackFromBytes(track.id, bytes)
          imported.push(track)
        } catch (err: any) {
          console.error(`Failed to import ${asset.name}:`, err)
        }
      }

      if (imported.length > 0) {
        set((state) => ({ tracks: [...imported, ...state.tracks] }))
      }
      return imported
    } catch (error: any) {
      set({ lastError: error.message || String(error) })
      return []
    } finally {
      set({ loading: false })
    }
  },
}))
