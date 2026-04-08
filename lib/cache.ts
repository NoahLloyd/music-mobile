import { File, Directory, Paths } from 'expo-file-system'
import { getAudioUrl } from './supabase'

const CACHE_DIR_NAME = 'audio-cache'

function getCacheDir(): Directory {
  return new Directory(Paths.document, CACHE_DIR_NAME)
}

function getCachedFile(trackId: string): File {
  return new File(getCacheDir(), `${trackId}.mp3`)
}

function getProcessedCachedFile(trackId: string): File {
  return new File(getCacheDir(), `${trackId}.processed.m4a`)
}

export async function getCachedOrRemoteUrl(
  trackId: string,
  storagePath: string,
  processedStoragePath?: string | null,
): Promise<string> {
  // Prefer processed file if available
  if (processedStoragePath) {
    const processedCached = getProcessedCachedFile(trackId)
    if (processedCached.exists) {
      return processedCached.uri
    }
    return getAudioUrl(processedStoragePath)
  }
  const cached = getCachedFile(trackId)
  if (cached.exists) {
    return cached.uri
  }
  return getAudioUrl(storagePath)
}

export async function cacheTrack(
  trackId: string,
  storagePath: string,
  processedStoragePath?: string | null,
): Promise<string> {
  const dir = getCacheDir()
  if (!dir.exists) {
    dir.create()
  }

  // If processed file exists, cache that instead of the original
  if (processedStoragePath) {
    const processedCached = getProcessedCachedFile(trackId)
    if (processedCached.exists) return processedCached.uri
    return downloadToFile(processedStoragePath, processedCached)
  }

  const cached = getCachedFile(trackId)
  if (cached.exists) return cached.uri
  return downloadToFile(storagePath, cached)
}

async function downloadToFile(storagePath: string, file: File): Promise<string> {
  const remoteUrl = await getAudioUrl(storagePath)
  const response = await fetch(remoteUrl)
  const blob = await response.blob()
  const reader = new FileReader()

  return new Promise<string>((resolve, reject) => {
    reader.onload = () => {
      const base64 = (reader.result as string).split(',')[1]
      file.create()
      file.write(base64, { encoding: 'base64' })
      resolve(file.uri)
    }
    reader.onerror = () => {
      reject(reader.error ?? new Error('FileReader failed'))
    }
    reader.readAsDataURL(blob)
  })
}

export function cacheTrackFromBytes(trackId: string, bytes: Uint8Array): string {
  const dir = getCacheDir()
  if (!dir.exists) {
    dir.create()
  }
  const cached = getCachedFile(trackId)
  if (cached.exists) return cached.uri

  // Convert Uint8Array to base64
  let binary = ''
  for (let i = 0; i < bytes.length; i++) {
    binary += String.fromCharCode(bytes[i])
  }
  const base64 = btoa(binary)

  cached.create()
  cached.write(base64, { encoding: 'base64' })
  return cached.uri
}

export function isCached(trackId: string, hasProcessed?: boolean): boolean {
  if (hasProcessed) {
    return getProcessedCachedFile(trackId).exists
  }
  return getCachedFile(trackId).exists
}

export function uncachedCount(tracks: { id: string; processed_storage_path?: string | null }[]): number {
  return tracks.filter((t) => {
    if (t.processed_storage_path) {
      return !getProcessedCachedFile(t.id).exists
    }
    return !getCachedFile(t.id).exists
  }).length
}
