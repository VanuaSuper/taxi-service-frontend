import { useState } from 'react'
import { Controller, useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import {
  driverApplicationSchema,
  type DriverApplicationForm as DriverApplicationFormValues
} from '../../../../shared/lib/schemas/authSchemas'
import {
  buildBelarusFullPhone,
  formatBelarusPhoneLocal,
  getBelarusLocalPhone
} from '../../../../shared/lib/formatters/formatBelarusPhoneLocal'
import { FormInput } from '../../../../shared/ui/form/FormInput'
import { FormPhoneInputBy } from '../../../../shared/ui/form/FormPhoneInputBy'
import { FormSubmitButton } from '../../../../shared/ui/form/FormSubmitButton'
import { FormError } from '../../../../shared/ui/form/FormError'

export function DriverApplicationForm() {
  const [serverError, setServerError] = useState<string | null>(null)
  const [successMessage, setSuccessMessage] = useState<string | null>(null)

  const {
    register,
    control,
    handleSubmit,
    reset,
    formState: { errors }
  } = useForm<DriverApplicationFormValues>({
    resolver: zodResolver(driverApplicationSchema),
    defaultValues: {
      name: '',
      phone: ''
    }
  })

  const onSubmit = handleSubmit(async () => {
    setServerError(null)
    setSuccessMessage(
      'Заявка отправлена. Мы проверим данные и после этого вы сможете войти как водитель.'
    )
    reset()
  })

  return (
    <form onSubmit={onSubmit} className="space-y-6">
      <FormError message={serverError ?? undefined} />
      {successMessage && (
        <p className="rounded-xl border border-green-200 bg-green-50 px-4 py-3 text-sm text-green-800">
          {successMessage}
        </p>
      )}

      <FormInput
        label="ФИО"
        type="text"
        autoComplete="name"
        error={errors.name?.message}
        {...register('name')}
      />

      <Controller
        control={control}
        name="phone"
        render={({ field }) => (
          <FormPhoneInputBy
            label="Телефон"
            type="tel"
            inputMode="tel"
            autoComplete="tel"
            placeholder="(29) 123-45-67"
            error={errors.phone?.message}
            name={field.name}
            value={getBelarusLocalPhone(field.value)}
            onBlur={field.onBlur}
            onChange={(e) => {
              const local = formatBelarusPhoneLocal(e.target.value)
              field.onChange(buildBelarusFullPhone(local))
            }}
            ref={field.ref}
          />
        )}
      />

      <FormSubmitButton>Отправить заявку</FormSubmitButton>
    </form>
  )
 }
