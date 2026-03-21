import PocketBase from 'pocketbase'

/**
 * Singleton PocketBase client.
 * The URL is read from the env variable VITE_PB_URL (defaults to localhost:8090).
 * Import `pb` wherever you need to query or subscribe to data.
 */
const pb = new PocketBase(import.meta.env.VITE_PB_URL ?? 'http://127.0.0.1:8090')

// Keep the auth token refreshed automatically
pb.autoCancellation(false)

export default pb
