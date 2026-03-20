# Music (Mobile)

A React Native mobile music player. Paste a YouTube link, it downloads the audio. Drop in files you already have. Everything syncs via Supabase and plays offline.

No subscriptions, no ads, no catalogue gaps.

This is the mobile companion to [Music Desktop](https://github.com/NoahLloyd/music-desktop) — an Electron app with the same library and Supabase backend.

## Features

- Import local audio files
- Background playback with lock screen controls
- Playlists and queue management
- Smart auto-play with weighted shuffle (avoids recently played tracks)
- Cloud sync via Supabase

## Tech Stack

- React Native (Expo SDK 55)
- TypeScript
- NativeWind (Tailwind CSS)
- Zustand for state management
- react-native-track-player for audio
- Supabase (storage + database)

## Setup

1. Clone the repo and install dependencies:
   ```
   npm install
   ```

2. Copy `.env.example` to `.env` and fill in your Supabase credentials:
   ```
   cp .env.example .env
   ```

3. Start the dev server:
   ```
   npm start
   ```

## License

[MIT](LICENSE)
