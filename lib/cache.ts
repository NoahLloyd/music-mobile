import { File, Directory, Paths } from 'expo-file-system'
import { getAudioUrl } from './supabase'

const CACHE_DIR_NAME = 'audio-cache'

function getCacheDir(): Directory {
  return new Directory(Paths.document, CACHE_DIR_NAME)
}

function getCachedFile(trackId: string): File {
  return new File(getCacheDir(), `${trackId}.mp3`)
}

export async function getCachedOrRemoteUrl(trackId: string, storagePath: string): Promise<string> {
  const cached = getCachedFile(trackId)
  if (cached.exists) {
    return cached.uri
  }
  return getAudioUrl(storagePath)
}

export async function cacheTrack(trackId: string, storagePath: string): Promise<string> {
  const dir = getCacheDir()
  if (!dir.exists) {
    dir.create()
  }
  const cached = getCachedFile(trackId)
  if (cached.exists) return cached.uri

  const remoteUrl = await getAudioUrl(storagePath)
  const response = await fetch(remoteUrl)
  const blob = await response.blob()
  const reader = new FileReader()

  return new Promise<string>((resolve) => {
    reader.onload = () => {
      const base64 = (reader.result as string).split(',')[1]
      cached.create()
      cached.write(base64, { encoding: 'base64' })
      resolve(cached.uri)
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

export function isCached(trackId: string): boolean {
  return getCachedFile(trackId).exists
}

export function uncachedCount(trackIds: string[]): number {
  return trackIds.filter((id) => !getCachedFile(id).exists).length
}
