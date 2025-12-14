import { useEffect, useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import {
  cancelCustomerOrder,
  getCustomerDriverPublic,
  getCurrentCustomerOrder,
} from '../../shared/api/services/customerOrderService'
import { createReview } from '../../shared/api/services/reviewService'
import { useAuthStore } from '../../shared/lib/stores/authStore'
import { useOrderCreationStore } from '../../shared/lib/stores/orderCreationStore'
import type { Order } from '../../shared/api/types/orderTypes'

function getCustomerStatusLabel(status: Order['status']): string {
  if (status === 'searching_driver') return 'Ищем водителя'
  if (status === 'accepted') return 'Водитель в пути'
  if (status === 'arrived') return 'Водитель на месте'
  if (status === 'in_progress') return 'Поездка началась'
  if (status === 'finished') return 'Поездка завершена'
  if (status === 'canceled_by_customer') return 'Отменён'
  return status
}

export function CustomerOrderTracker() {
  const queryClient = useQueryClient()
  const { user } = useAuthStore()

  const [reviewRating, setReviewRating] = useState(5)
  const [reviewText, setReviewText] = useState('')

  const activeOrder = useOrderCreationStore((s) => s.activeOrder)
  const setActiveOrder = useOrderCreationStore((s) => s.setActiveOrder)
  const resetAll = useOrderCreationStore((s) => s.resetAll)

  const currentOrderQuery = useQuery<Order | null>({
    queryKey: ['customer', 'currentOrder'],
    queryFn: getCurrentCustomerOrder,
    enabled: Boolean(user),
    refetchInterval: 3000,
  })

  useEffect(() => {
    if (currentOrderQuery.data) {
      setActiveOrder(currentOrderQuery.data)
      return
    }

    if (currentOrderQuery.data === null) {
      if (activeOrder?.status === 'finished') return
      setActiveOrder(null)
    }
  }, [activeOrder?.status, currentOrderQuery.data, setActiveOrder])

  const cancelMutation = useMutation({
    mutationFn: (orderId: string | number) => cancelCustomerOrder(orderId),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ['customer', 'currentOrder'] })
      setActiveOrder(null)
      resetAll()
    },
  })

  const createReviewMutation = useMutation({
    mutationFn: (payload: {
      orderId: string | number
      driverId: string
      customerId: string
      rating: number
      text?: string
      createdAt: string
    }) => createReview(payload),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ['customer', 'currentOrder'] })
      setActiveOrder(null)
      resetAll()
    },
  })

  const orderCandidate = currentOrderQuery.data ?? activeOrder

  const driverPublicQuery = useQuery({
    queryKey: ['customer', 'driverPublic', orderCandidate?.driverId],
    queryFn: () => getCustomerDriverPublic(String(orderCandidate?.driverId ?? '')),
    enabled: Boolean(user && orderCandidate?.driverId),
  })

  if (currentOrderQuery.isLoading && !activeOrder) {
    return (
      <div className="absolute top-4 left-4 right-4 md:right-auto md:w-[420px] bg-white/95 backdrop-blur rounded-lg border border-gray-200 p-4 shadow">
        <p className="text-gray-600">Загрузка заказа...</p>
      </div>
    )
  }

  const order = orderCandidate

  if (!order) {
    return null
  }

  const safeOrder = order

  const canCancel = safeOrder.status === 'searching_driver'

  const isFinished = safeOrder.status === 'finished'
  const canSendReview = Boolean(user) && Boolean(safeOrder.driverId)

  async function handleSubmitReview() {
    if (!user) return
    if (!safeOrder.driverId) return

    const nextRating = Number(reviewRating)
    if (!Number.isFinite(nextRating) || nextRating < 1 || nextRating > 5) return

    await createReviewMutation.mutateAsync({
      orderId: safeOrder.id,
      driverId: safeOrder.driverId,
      customerId: user.id,
      rating: nextRating,
      text: reviewText.trim() ? reviewText.trim() : undefined,
      createdAt: new Date().toISOString(),
    })
  }

  return (
    <div className="absolute top-4 left-4 right-4 md:right-auto md:w-[420px] bg-white/95 backdrop-blur rounded-lg border border-gray-200 p-4 shadow">
      <div className="flex items-start justify-between gap-3">
        <h2 className="text-base font-semibold">Текущий заказ</h2>
        <div className="text-xs text-gray-500">#{safeOrder.id}</div>
      </div>

      <div className="mt-3 grid gap-2 text-sm text-gray-800">
        <div>
          <div className="text-xs text-gray-500">Подача</div>
          <div className="font-semibold text-gray-900">{safeOrder.fromAddress ?? 'Точка A'}</div>
        </div>

        <div>
          <div className="text-xs text-gray-500">Куда</div>
          <div className="font-semibold text-gray-900">{safeOrder.toAddress ?? 'Точка B'}</div>
        </div>

        <div>
          <div className="text-xs text-gray-500">Статус</div>
          <div className="font-medium text-gray-900">{getCustomerStatusLabel(safeOrder.status)}</div>
        </div>

        {safeOrder.driverId ? (
          <div>
            <div className="text-xs text-gray-500">Водитель</div>
            <div className="font-medium text-gray-900">
              {driverPublicQuery.isLoading
                ? 'Загрузка…'
                : driverPublicQuery.error
                  ? 'Не удалось загрузить'
                  : driverPublicQuery.data?.name ?? '—'}
            </div>
            {driverPublicQuery.data?.phone ? (
              <div className="text-xs text-gray-500 mt-1">
                Телефон: {driverPublicQuery.data.phone}
              </div>
            ) : null}
          </div>
        ) : null}
      </div>

      <div className="mt-3">
        {canCancel ? (
          <button
            className="btn btn-outline px-4 py-2 disabled:opacity-50 disabled:cursor-not-allowed"
            onClick={() => cancelMutation.mutate(safeOrder.id)}
            disabled={cancelMutation.isPending}
          >
            Отменить заказ
          </button>
        ) : null}
      </div>

      {isFinished ? (
        <div className="mt-4 border-t border-gray-200 pt-4">
          <h3 className="text-base font-semibold">Поездка завершена</h3>
          <p className="text-sm text-gray-600 mt-1">
            Оцени водителя, пожалуйста (это поможет улучшить сервис)
          </p>

          {!canSendReview ? (
            <p className="text-sm text-gray-600 mt-2">
              Не удалось отправить отзыв: нет данных о водителе.
            </p>
          ) : (
            <div className="mt-3">
              <label className="block text-sm font-medium text-gray-700">
                Оценка
              </label>
              <select
                className="mt-1 w-full rounded-md border border-gray-300 bg-white px-3 py-2 text-sm"
                value={reviewRating}
                onChange={(e) => setReviewRating(Number(e.target.value))}
                disabled={createReviewMutation.isPending}
              >
                <option value={5}>5</option>
                <option value={4}>4</option>
                <option value={3}>3</option>
                <option value={2}>2</option>
                <option value={1}>1</option>
              </select>

              <label className="block text-sm font-medium text-gray-700 mt-3">
                Комментарий
              </label>
              <textarea
                className="mt-1 w-full min-h-[90px] rounded-md border border-gray-300 bg-white px-3 py-2 text-sm"
                value={reviewText}
                onChange={(e) => setReviewText(e.target.value)}
                placeholder="Если есть что сказать — напиши пару слов"
                disabled={createReviewMutation.isPending}
              />

              <button
                className="btn btn-primary px-4 py-2 mt-3 disabled:opacity-50 disabled:cursor-not-allowed"
                onClick={() => void handleSubmitReview()}
                disabled={createReviewMutation.isPending}
              >
                Отправить отзыв
              </button>
            </div>
          )}
        </div>
      ) : null}

      {currentOrderQuery.error ? (
        <p className="text-sm text-red-600 mt-3">{String(currentOrderQuery.error)}</p>
      ) : null}
      {cancelMutation.error ? (
        <p className="text-sm text-red-600 mt-3">{String(cancelMutation.error)}</p>
      ) : null}
      {createReviewMutation.error ? (
        <p className="text-sm text-red-600 mt-3">{String(createReviewMutation.error)}</p>
      ) : null}
    </div>
  )
}
