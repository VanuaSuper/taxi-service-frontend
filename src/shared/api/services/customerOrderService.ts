import type { AxiosError } from 'axios'
import { apiClient } from '../apiClient'
import type { Order } from '../types/orderTypes'

function toErrorMessage(error: unknown, defaultMessage: string) {
  const axiosError = error as AxiosError<{ message?: string }>

  const messageFromServer = axiosError?.response?.data?.message
  if (messageFromServer) return messageFromServer

  if (error instanceof Error) return error.message
  return defaultMessage
}

export async function getCurrentCustomerOrder(): Promise<Order | null> {
  try {
    const res = await apiClient.get<Order | null>('/customers/orders/current')
    return res.data
  } catch (error) {
    throw new Error(toErrorMessage(error, 'Ошибка получения текущего заказа'))
  }
}

export async function cancelCustomerOrder(orderId: string | number): Promise<Order> {
  try {
    const res = await apiClient.post<Order>(`/customers/orders/${orderId}/cancel`)
    return res.data
  } catch (error) {
    throw new Error(toErrorMessage(error, 'Ошибка отмены заказа'))
  }
}

export async function getCustomerDriverPublic(driverId: string): Promise<{
  id: string
  name: string
  phone: string
}> {
  try {
    const res = await apiClient.get(`/customers/drivers/${driverId}/public`)
    return res.data
  } catch (error) {
    throw new Error(toErrorMessage(error, 'Ошибка получения данных водителя'))
  }
}
