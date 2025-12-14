import type { AxiosError } from 'axios'
import { apiClient } from '../apiClient'
import type { Order, OrderStatus } from '../types/orderTypes'

function toErrorMessage(error: unknown, defaultMessage: string) {
  const axiosError = error as AxiosError<{ message?: string }>

  const messageFromServer = axiosError?.response?.data?.message
  if (messageFromServer) return messageFromServer

  if (error instanceof Error) return error.message
  return defaultMessage
}

export async function driverGoOnline() {
  try {
    const res = await apiClient.post('/drivers/me/online')
    return res.data
  } catch (error) {
    throw new Error(toErrorMessage(error, 'Ошибка перехода в режим онлайн'))
  }
}

export async function driverGoOffline() {
  try {
    const res = await apiClient.post('/drivers/me/offline')
    return res.data
  } catch (error) {
    throw new Error(toErrorMessage(error, 'Ошибка выхода из режима онлайн'))
  }
}

export async function updateDriverLocation(coords: {
  lat: number
  lon: number
}): Promise<{ id: string; userId: string; isOnline: boolean; coords: [number, number] | null; updatedAt: string }> {
  try {
    const res = await apiClient.post('/drivers/me/location', coords)
    return res.data
  } catch (error) {
    throw new Error(toErrorMessage(error, 'Ошибка отправки геолокации'))
  }
}

export async function getDriverCustomerPublic(customerId: string): Promise<{
  id: string
  name: string
  phone: string
}> {
  try {
    const res = await apiClient.get(`/drivers/customers/${customerId}/public`)
    return res.data
  } catch (error) {
    throw new Error(toErrorMessage(error, 'Ошибка получения данных клиента'))
  }
}

export async function getAvailableDriverOrders(): Promise<Order[]> {
  try {
    const res = await apiClient.get<Order[]>('/drivers/orders/available')
    return res.data
  } catch (error) {
    throw new Error(toErrorMessage(error, 'Ошибка получения доступных заказов'))
  }
}

export async function getCurrentDriverOrder(): Promise<Order | null> {
  try {
    const res = await apiClient.get<Order | null>('/drivers/orders/current')
    return res.data
  } catch (error) {
    throw new Error(toErrorMessage(error, 'Ошибка получения текущего заказа'))
  }
}

export async function acceptDriverOrder(orderId: string | number): Promise<Order> {
  try {
    const res = await apiClient.post<Order>(`/drivers/orders/${orderId}/accept`)
    return res.data
  } catch (error) {
    throw new Error(toErrorMessage(error, 'Ошибка принятия заказа'))
  }
}

export async function setDriverOrderStatus(
  orderId: string | number,
  status: Exclude<OrderStatus, 'searching_driver'>
): Promise<Order> {
  try {
    const res = await apiClient.post<Order>(`/drivers/orders/${orderId}/status`, {
      status,
    })
    return res.data
  } catch (error) {
    throw new Error(toErrorMessage(error, 'Ошибка изменения статуса заказа'))
  }
}
