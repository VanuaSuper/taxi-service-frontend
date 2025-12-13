import { loadYmaps } from './loadYmaps'

export type Coords = [number, number]

type RouteInfo = {
  distanceText: string
  durationText: string
  distanceMeters: number
  durationSeconds: number
}

type RouteCacheValue = {
  routeInfo: RouteInfo
}

type GeocodeCacheValue = {
  coords: Coords
}

type SuggestCacheValue = {
  suggestions: string[]
}

const routeCache = new Map<string, RouteCacheValue>()
const geocodeCache = new Map<string, GeocodeCacheValue>()
const suggestCache = new Map<string, SuggestCacheValue>()

function buildRouteCacheKey(a: Coords, b: Coords) {
  const fmt = (n: number) => n.toFixed(6)
  return `${fmt(a[0])},${fmt(a[1])}__${fmt(b[0])},${fmt(b[1])}`
}

function buildGeocodeCacheKey(address: string) {
  return address.trim().toLowerCase()
}

function buildSuggestCacheKey(query: string) {
  return query.trim().toLowerCase()
}

export async function suggestAddress(queryRaw: string): Promise<string[]> {
  const ymaps = await loadYmaps()

  const query = (queryRaw ?? '').trim()
  if (query.length < 3) {
    return []
  }

  const key = buildSuggestCacheKey(query)
  const cached = suggestCache.get(key)
  if (cached) {
    return cached.suggestions
  }

  const res = await ymaps.suggest(query, { results: 5 })
  const suggestions = Array.isArray(res)
    ? res
        .map((item: any) => (typeof item?.value === 'string' ? item.value : null))
        .filter(Boolean)
    : []

  suggestCache.set(key, { suggestions })

  return suggestions
}

export async function geocodeToCoords(address: string): Promise<Coords> {
  const ymaps = await loadYmaps()

  const key = buildGeocodeCacheKey(address)
  const cached = geocodeCache.get(key)
  if (cached) {
    return cached.coords
  }

  const res = await ymaps.geocode(address, { results: 1 })
  const first = res.geoObjects.get(0)
  if (!first) {
    throw new Error('Адрес не найден')
  }

  const coords = first.geometry.getCoordinates() as Coords

  geocodeCache.set(key, { coords })

  return coords
}

export async function reverseGeocodeToAddress(coords: Coords): Promise<string> {
  const ymaps = await loadYmaps()

  const res = await ymaps.geocode(coords, { results: 1 })
  const first = res.geoObjects.get(0)
  if (!first) {
    throw new Error('Адрес не найден')
  }

  const addressLine =
    typeof first.getAddressLine === 'function'
      ? (first.getAddressLine() as string)
      : (first.properties?.get?.('text') as string | undefined)

  const address = (addressLine ?? '').trim()
  if (!address) {
    throw new Error('Адрес не найден')
  }

  return address
}

export function getCachedRouteInfo(a: Coords, b: Coords) {
  const key = buildRouteCacheKey(a, b)
  const cached = routeCache.get(key)
  return cached ? { key, routeInfo: cached.routeInfo } : { key, routeInfo: null }
}

export function setCachedRouteInfo(routeKey: string, routeInfo: RouteInfo) {
  routeCache.set(routeKey, { routeInfo })
}
