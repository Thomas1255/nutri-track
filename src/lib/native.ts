import { Capacitor } from '@capacitor/core'

export async function initializeNativeNavigation() {
  if (Capacitor.getPlatform() !== 'android') return
  const { App } = await import('@capacitor/app')
  await App.addListener('backButton', ({ canGoBack }) => {
    if (canGoBack) window.history.back()
    else void App.minimizeApp()
  })
}
