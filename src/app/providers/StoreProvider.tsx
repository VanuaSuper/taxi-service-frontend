import type { PropsWithChildren, ReactElement } from 'react'

export const StoreProvider = ({ children }: PropsWithChildren): ReactElement => {
  return <>{children}</>
}
