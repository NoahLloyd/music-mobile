import { createClient } from '@supabase/supabase-js'

const supabaseUrl = process.env.EXPO_PUBLIC_SUPABASE_URL || ''
const supabaseAnonKey = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY || ''

if (!supabaseUrl || !supabaseAnonKey) {
  console.warn('Missing Supabase env vars — check .env file and restart with --clear')
}

export const supabase = createClient(supabaseUrl, supabaseAnonKey)

export async function getAudioUrl(storagePath: string): Promise<string> {
  const { data } = supabase.storage.from('audio-files').getPublicUrl(storagePath)
  return data.publicUrl
}
