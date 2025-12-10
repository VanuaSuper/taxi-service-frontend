import { z } from 'zod'

export const customerRegistrationSchema = z.object({
  email: z.string().email('Некорректный email'),
  password: z.string().min(6, 'Пароль должен быть не менее 6 символов'),
  name: z.string().min(2, 'Имя должно быть не менее 2 символов'),
  phone: z.string().regex(/^\+7\s\(\d{3}\)\s\d{3}-\d{2}-\d{2}$/, 'Некорректный номер телефона')
})

export const driverRegistrationSchema = customerRegistrationSchema.extend({
  licenseNumber: z.string().min(6, 'Номер водительского удостоверения обязателен'),
  carModel: z.string().min(2, 'Модель автомобиля обязательна'),
  carColor: z.string().min(2, 'Цвет автомобиля обязателен'),
  plateNumber: z.string().min(6, 'Государственный номер обязателен')
})

export const loginSchema = z.object({
  email: z.string().email('Некорректный email'),
  password: z.string().min(6, 'Пароль должен быть не менее 6 символов')
})