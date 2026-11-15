import { notifications } from '@mantine/notifications'

export function notifyError(message: string): void {
  notifications.show({ message, className: 'toast-err' })
}
