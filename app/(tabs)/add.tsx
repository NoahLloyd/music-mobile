import { useState } from 'react'
import { View, Text, Pressable } from 'react-native'
import { Ionicons } from '@expo/vector-icons'
import { SafeAreaView } from 'react-native-safe-area-context'
import { useLibraryStore } from '@/stores/libraryStore'

export default function AddScreen() {
  const importFiles = useLibraryStore((s) => s.importFiles)
  const loading = useLibraryStore((s) => s.loading)
  const lastError = useLibraryStore((s) => s.lastError)
  const [importStatus, setImportStatus] = useState<string | null>(null)

  const handleImport = async () => {
    setImportStatus('Selecting files...')
    const imported = await importFiles()
    if (imported.length > 0) {
      setImportStatus(`Imported ${imported.length} track(s)`)
    } else {
      setImportStatus(null)
    }
    setTimeout(() => setImportStatus(null), 3000)
  }

  return (
    <SafeAreaView className="flex-1 bg-surface-0" edges={['top']}>
      <View className="px-5 pt-2 pb-3">
        <Text className="text-2xl font-bold text-white mb-6">Add Music</Text>

        {/* File import */}
        <View>
          <Text className="text-xs text-white/40 uppercase tracking-wider font-semibold mb-3">
            Import Files
          </Text>
          <Pressable
            onPress={handleImport}
            disabled={loading}
            className="border border-dashed border-white/10 rounded-2xl py-16 items-center active:border-accent active:bg-accent/5 disabled:opacity-50"
          >
            <Ionicons name="document-outline" size={32} color="rgba(255,255,255,0.15)" style={{ marginBottom: 12 }} />
            <Text className="text-white/40 text-sm">
              Tap to browse audio files
            </Text>
            <Text className="text-white/15 text-xs mt-1.5">
              mp3, m4a, wav, flac, ogg, aac
            </Text>
          </Pressable>

          {importStatus && (
            <Text className="mt-3 text-xs text-white/40">{importStatus}</Text>
          )}

          {lastError && !loading && (
            <View className="mt-3 bg-red-500/10 border border-red-500/15 rounded-xl p-3">
              <Text className="text-red-400/80 text-xs">{lastError}</Text>
            </View>
          )}
        </View>
      </View>
    </SafeAreaView>
  )
}
