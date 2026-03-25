import PocketBase from 'pocketbase'

// Runtime config injected by the container at startup (env-config.js).
// Falls back to the Vite build-time variable, then localhost for local dev.
const pbUrl: string =
  (window as Record<string, any>)._env_?.PB_URL ??
  import.meta.env.VITE_PB_URL ??
  'http://127.0.0.1:8090'

const pb = new PocketBase(pbUrl)

// Keep the auth token refreshed automatically
pb.autoCancellation(false)

export default pb
