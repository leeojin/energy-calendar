import '@mantine/core/styles.css'
import '@mantine/notifications/styles.css'
import './styles/fonts.css'
import './styles/tokens.css'
import './styles/notebook.css'
import { MantineProvider } from '@mantine/core'
import { Notifications } from '@mantine/notifications'
import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { BrowserRouter } from 'react-router'
import App from './App.tsx'
import { SessionProvider } from './auth/SessionContext.tsx'
import { theme } from './theme.ts'

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <MantineProvider theme={theme} forceColorScheme="light">
      <Notifications position="bottom-center" />
      <BrowserRouter>
        <SessionProvider>
          <App />
        </SessionProvider>
      </BrowserRouter>
    </MantineProvider>
  </StrictMode>,
)
