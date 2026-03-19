#!/bin/bash
# Patches react-native-track-player v4.1.2 for:
# 1. Kotlin 2.x nullability compatibility (Arguments.fromBundle)
# 2. RN 0.83 TurboModule interop (scope.launch returns Job, not Unit)
# 3. Android 12+ foreground service start restriction
# 4. New Architecture compatibility (reactHost instead of reactNativeHost)

MUSIC_MODULE="node_modules/react-native-track-player/android/src/main/java/com/doublesymmetry/trackplayer/module/MusicModule.kt"
MUSIC_SERVICE="node_modules/react-native-track-player/android/src/main/java/com/doublesymmetry/trackplayer/service/MusicService.kt"

# Fix MusicModule.kt
if [ -f "$MUSIC_MODULE" ]; then
  python3 -c "
with open('$MUSIC_MODULE', 'r') as f:
    content = f.read()

# Fix 1: Kotlin 2.x nullability on all Arguments.fromBundle calls
# Occurrence 1: getTrack - originalItem is nullable
content = content.replace(
    'callback.resolve(Arguments.fromBundle(musicService.tracks[index].originalItem))',
    'callback.resolve(musicService.tracks[index].originalItem?.let { Arguments.fromBundle(it) })'
)

# Occurrence 2: getActiveTrack - originalItem is nullable (multi-line)
content = content.replace(
    '''else Arguments.fromBundle(
                musicService.tracks[musicService.getCurrentTrackIndex()].originalItem
            )''',
    'else musicService.tracks[musicService.getCurrentTrackIndex()].originalItem?.let { Arguments.fromBundle(it) }'
)

# Occurrence 3: getProgress - bundle is non-null but make safe anyway
content = content.replace(
    'callback.resolve(Arguments.fromBundle(bundle))',
    'callback.resolve(bundle?.let { Arguments.fromBundle(it) })'
)

# Occurrence 4: getPlaybackState - getPlayerStateBundle might return nullable
content = content.replace(
    'callback.resolve(Arguments.fromBundle(musicService.getPlayerStateBundle(musicService.state)))',
    'callback.resolve(musicService.getPlayerStateBundle(musicService.state)?.let { Arguments.fromBundle(it) })'
)

# Fix 2: Change all scope.launch expression bodies to block bodies
lines = content.split('\n')
result = []
i = 0
while i < len(lines):
    line = lines[i]

    # Case 1: single-line '= scope.launch {'
    if '= scope.launch {' in line:
        new_line = line.replace('= scope.launch {', '{ scope.launch {')
        result.append(new_line)
        brace_count = 1
        i += 1
        while i < len(lines) and brace_count > 0:
            inner_line = lines[i]
            brace_count += inner_line.count('{') - inner_line.count('}')
            if brace_count == 0:
                result.append(inner_line)
                result.append('    }')
            else:
                result.append(inner_line)
            i += 1
        continue

    # Case 2: multi-line assignment with scope.launch on next line
    if i + 1 < len(lines) and 'scope.launch {' in lines[i + 1].strip():
        if line.rstrip().endswith('='):
            new_line = line.rstrip()[:-1] + '{'
            result.append(new_line)
            next_line = lines[i + 1]
            indent = len(next_line) - len(next_line.lstrip())
            result.append(' ' * indent + 'scope.launch {')
            i += 2
            brace_count = 1
            while i < len(lines) and brace_count > 0:
                inner_line = lines[i]
                brace_count += inner_line.count('{') - inner_line.count('}')
                if brace_count == 0:
                    result.append(inner_line)
                    result.append('    }')
                else:
                    result.append(inner_line)
                i += 1
            continue

    result.append(line)
    i += 1

with open('$MUSIC_MODULE', 'w') as f:
    f.write('\n'.join(result))
"
  echo "Patched MusicModule.kt"
fi

# Fix MusicService.kt
if [ -f "$MUSIC_SERVICE" ]; then
  python3 -c "
with open('$MUSIC_SERVICE', 'r') as f:
    content = f.read()

# Fix 1b: Null-safety for Arguments.fromBundle in emitList
content = content.replace(
    'data.forEach { payload.pushMap(Arguments.fromBundle(it)) }',
    'data.forEach { it?.let { bundle -> payload.pushMap(Arguments.fromBundle(bundle)) } }'
)

# Fix 3: Catch ForegroundServiceStartNotAllowedException on Android 12+
old_fg = '''        val notification = notificationBuilder.build()
        startForeground(EMPTY_NOTIFICATION_ID, notification)
        @Suppress(\"DEPRECATION\")
        stopForeground(true)'''

new_fg = '''        val notification = notificationBuilder.build()
        try {
            startForeground(EMPTY_NOTIFICATION_ID, notification)
            @Suppress(\"DEPRECATION\")
            stopForeground(true)
        } catch (e: Exception) {
            android.util.Log.w(\"MusicService\", \"startForeground blocked – will retry on playback\", e)
        }'''

if old_fg in content:
    content = content.replace(old_fg, new_fg)

# Fix 4: Replace reactNativeHost with new-arch compatible getReactContextCompat()
helper = '''    private fun getReactContextCompat(): com.facebook.react.bridge.ReactContext? {
        return try {
            (application as com.facebook.react.ReactApplication).reactHost?.currentReactContext
        } catch (e: Exception) {
            try {
                @Suppress(\"DEPRECATION\")
                reactNativeHost.reactInstanceManager.currentReactContext
            } catch (e2: Exception) {
                null
            }
        }
    }

'''

old_emit = '''    @MainThread
    private fun emit(event: String, data: Bundle? = null) {
        reactNativeHost.reactInstanceManager.currentReactContext
            ?.getJSModule(DeviceEventManagerModule.RCTDeviceEventEmitter::class.java)
            ?.emit(event, data?.let { Arguments.fromBundle(it) })
    }'''

new_emit = helper + '''    @MainThread
    private fun emit(event: String, data: Bundle? = null) {
        getReactContextCompat()
            ?.getJSModule(DeviceEventManagerModule.RCTDeviceEventEmitter::class.java)
            ?.emit(event, data?.let { Arguments.fromBundle(it) })
    }'''

if old_emit in content:
    content = content.replace(old_emit, new_emit)

old_emitlist = '''        reactNativeHost.reactInstanceManager.currentReactContext
            ?.getJSModule(DeviceEventManagerModule.RCTDeviceEventEmitter::class.java)
            ?.emit(event, payload)'''

new_emitlist = '''        getReactContextCompat()
            ?.getJSModule(DeviceEventManagerModule.RCTDeviceEventEmitter::class.java)
            ?.emit(event, payload)'''

if old_emitlist in content:
    content = content.replace(old_emitlist, new_emitlist)

with open('$MUSIC_SERVICE', 'w') as f:
    f.write(content)
"
  echo "Patched MusicService.kt"
fi
