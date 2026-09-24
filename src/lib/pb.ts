import PocketBase from 'pocketbase'

// PocketBase URL, first non-empty of:
//   1. runtime config injected by the container at startup (env-config.js)
//   2. the Vite build-time variable
//   3. local PocketBase in dev; in production builds the same origin, where
//      nginx proxies /api/ to the PocketBase container
const runtimeUrl = (window as Window & { _env_?: { PB_URL?: string } })._env_?.PB_URL?.trim()
const buildUrl = import.meta.env.VITE_PB_URL?.trim()

const pbUrl: string =
  runtimeUrl || buildUrl || (import.meta.env.DEV ? 'http://127.0.0.1:8090' : '/')

const pb = new PocketBase(pbUrl)

// Keep the auth token refreshed automatically
pb.autoCancellation(false)

export default pb
