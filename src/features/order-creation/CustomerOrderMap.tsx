import { useCallback, useEffect, useRef } from 'react'
import { loadYmaps } from '../../shared/lib/ymaps'
import {
  getCachedRouteInfo,
  reverseGeocodeToAddress,
  setCachedRouteInfo,
} from '../../shared/lib/ymaps/ymapsServices'
import {
  type ActivePoint,
  type Coords,
  type RouteInfo,
  useOrderCreationStore,
} from '../../shared/lib/stores/orderCreationStore'
import { OrderPanelForm } from './OrderPanelForm'

export function CustomerOrderMap() {
  const activePoint = useOrderCreationStore((s) => s.activePoint)
  const pointACoords = useOrderCreationStore((s) => s.pointACoords)
  const pointBCoords = useOrderCreationStore((s) => s.pointBCoords)
  const routeBuildRequestId = useOrderCreationStore((s) => s.routeBuildRequestId)

  const setFromAddress = useOrderCreationStore((s) => s.setFromAddress)
  const setToAddress = useOrderCreationStore((s) => s.setToAddress)
  const setPointACoords = useOrderCreationStore((s) => s.setPointACoords)
  const setPointBCoords = useOrderCreationStore((s) => s.setPointBCoords)
  const setRouteInfo = useOrderCreationStore((s) => s.setRouteInfo)
  const setIsRouteLoading = useOrderCreationStore((s) => s.setIsRouteLoading)
  const setError = useOrderCreationStore((s) => s.setError)
  const setSuccessMessage = useOrderCreationStore((s) => s.setSuccessMessage)

  const mapContainerRef = useRef<HTMLDivElement | null>(null)
  const mapRef = useRef<any>(null)
  const ymapsRef = useRef<any>(null)
  const pointAPlacemarkRef = useRef<any>(null)
  const pointBPlacemarkRef = useRef<any>(null)
  const activePointRef = useRef<ActivePoint>('A')
  const multiRouteRef = useRef<any>(null)

  useEffect(() => {
    activePointRef.current = activePoint
  }, [activePoint])

  useEffect(() => {
    let isCancelled = false

    async function init() {
      try {
        const ymaps = await loadYmaps()
        ymapsRef.current = ymaps

        if (isCancelled) return
        if (!mapContainerRef.current) return

        const map = new ymaps.Map(
          mapContainerRef.current,
          {
            center: [55.1848, 30.2016],
            zoom: 12,
            controls: [],
          },
          {
            suppressMapOpenBlock: true,
          }
        )

        mapRef.current = map

        map.events.add('click', async (e: any) => {
          const coords = e.get('coords') as Coords

          setSuccessMessage(null)

          const point = activePointRef.current
          if (point === 'A') {
            setPointACoords(coords)
          } else {
            setPointBCoords(coords)
          }

          try {
            const address = await reverseGeocodeToAddress(coords)
            if (point === 'A') {
              setFromAddress(address)
            } else {
              setToAddress(address)
            }
          } catch {
            // игнорируем ошибки reverse-geocode, чтобы клик по карте всегда работал
          }
        })
      } catch (e) {
        if (isCancelled) return
        setError(e instanceof Error ? e.message : 'Unknown error')
      } finally {
        if (isCancelled) return
      }
    }

    init()

    return () => {
      isCancelled = true
      if (mapRef.current) {
        mapRef.current.destroy()
        mapRef.current = null
      }
      ymapsRef.current = null
      pointAPlacemarkRef.current = null
      pointBPlacemarkRef.current = null
      multiRouteRef.current = null
    }
  }, [])

  useEffect(() => {
    const map = mapRef.current
    const ymaps = ymapsRef.current
    if (!map || !ymaps) return

    if (!pointACoords) {
      if (pointAPlacemarkRef.current) {
        map.geoObjects.remove(pointAPlacemarkRef.current)
        pointAPlacemarkRef.current = null
      }
      return
    }

    if (!pointAPlacemarkRef.current) {
      pointAPlacemarkRef.current = new ymaps.Placemark(
        pointACoords,
        { iconCaption: 'A' },
        { preset: 'islands#blueStretchyIcon' }
      )
      map.geoObjects.add(pointAPlacemarkRef.current)
    } else {
      pointAPlacemarkRef.current.geometry.setCoordinates(pointACoords)
    }
  }, [pointACoords])

  useEffect(() => {
    const map = mapRef.current
    const ymaps = ymapsRef.current
    if (!map || !ymaps) return

    if (!pointBCoords) {
      if (pointBPlacemarkRef.current) {
        map.geoObjects.remove(pointBPlacemarkRef.current)
        pointBPlacemarkRef.current = null
      }
      return
    }

    if (!pointBPlacemarkRef.current) {
      pointBPlacemarkRef.current = new ymaps.Placemark(
        pointBCoords,
        { iconCaption: 'B' },
        { preset: 'islands#redStretchyIcon' }
      )
      map.geoObjects.add(pointBPlacemarkRef.current)
    } else {
      pointBPlacemarkRef.current.geometry.setCoordinates(pointBCoords)
    }
  }, [pointBCoords])

  useEffect(() => {
    const map = mapRef.current

    if (map && multiRouteRef.current) {
      map.geoObjects.remove(multiRouteRef.current)
      multiRouteRef.current = null
    }
  }, [pointACoords, pointBCoords])

  const buildRoute = useCallback(() => {
    const map = mapRef.current
    const ymaps = ymapsRef.current
    if (!map || !ymaps) return
    if (!pointACoords || !pointBCoords) return

    const { key: routeKey, routeInfo: cachedRouteInfo } = getCachedRouteInfo(
      pointACoords,
      pointBCoords
    )
    if (cachedRouteInfo) {
      setError(null)
      setIsRouteLoading(false)
      setRouteInfo(cachedRouteInfo)
      setSuccessMessage(null)
      return
    }

    setError(null)
    setIsRouteLoading(true)
    setRouteInfo(null)
    setSuccessMessage(null)

    if (multiRouteRef.current) {
      map.geoObjects.remove(multiRouteRef.current)
      multiRouteRef.current = null
    }

    const multiRoute = new ymaps.multiRouter.MultiRoute(
      {
        referencePoints: [pointACoords, pointBCoords],
        params: {
          routingMode: 'auto',
          reverseGeocoding: false,
          results: 1,
        },
      },
      {
        boundsAutoApply: true,
        wayPointVisible: false,
      }
    )

    multiRouteRef.current = multiRoute
    map.geoObjects.add(multiRoute)

    const onUpdate = () => {
      const activeRoute = multiRoute.getActiveRoute()
      if (!activeRoute) return

      const distance = activeRoute.properties.get('distance')
      const duration = activeRoute.properties.get('duration')

      const distanceText = distance?.text
      const durationText = duration?.text
      const distanceMeters = distance?.value
      const durationSeconds = duration?.value

      if (
        typeof distanceText === 'string' &&
        typeof durationText === 'string' &&
        typeof distanceMeters === 'number' &&
        typeof durationSeconds === 'number'
      ) {
        const nextRouteInfo: RouteInfo = {
          distanceText,
          durationText,
          distanceMeters,
          durationSeconds,
        }

        setRouteInfo(nextRouteInfo)
        setIsRouteLoading(false)

        setCachedRouteInfo(routeKey, nextRouteInfo)
      }
    }

    const onError = () => {
      setIsRouteLoading(false)
      setError('Не удалось построить маршрут')
    }

    multiRoute.events.add('update', onUpdate)
    multiRoute.model.events.add('requestsuccess', onUpdate)
    multiRoute.model.events.add('requestfail', onError)
  }, [pointACoords, pointBCoords, setError, setIsRouteLoading, setRouteInfo, setSuccessMessage])

  useEffect(() => {
    if (!pointACoords || !pointBCoords) return
    buildRoute()
  }, [pointACoords, pointBCoords, buildRoute])

  useEffect(() => {
    if (!routeBuildRequestId) return
    buildRoute()
  }, [routeBuildRequestId, buildRoute])

  return (
    <div className="relative w-full h-[calc(100vh-56px)]">
      <div ref={mapContainerRef} className="w-full h-full" />

      <OrderPanelForm />
    </div>
  )
}
