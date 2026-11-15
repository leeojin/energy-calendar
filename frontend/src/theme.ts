import { createTheme } from '@mantine/core'

export const theme = createTheme({
  fontFamily: "'SUIT Variable', system-ui, sans-serif",
  radius: { xs: '4px', sm: '8px', lg: '14px' },
  components: {
    Button: {
      vars: (_theme: unknown, props: { size?: string }) => {
        const height = props.size === 'lg' ? '44px' : props.size === 'sm' ? '30px' : '36px'
        return { root: { '--button-height': height } }
      },
    },
  },
})
