import { defineConfig, Plugin } from 'vite'
import react from '@vitejs/plugin-react'
import os from 'os'

function getLanIp(): string {
  const interfaces = os.networkInterfaces()
  const candidates: { ip: string; priority: number }[] = []

  for (const [name, addrs] of Object.entries(interfaces)) {
    if (!addrs) continue
    const lowerName = name.toLowerCase()
    const isVirtual =
      lowerName.includes('vethernet') ||
      lowerName.includes('virtualbox') ||
      lowerName.includes('vmware') ||
      lowerName.includes('hyper-v') ||
      lowerName.includes('loopback') ||
      lowerName.includes('wsl')

    for (const addr of addrs) {
      if (addr.family === 'IPv4' && !addr.internal) {
        if (
          addr.address.startsWith('192.168.56.') ||
          addr.address.startsWith('127.') ||
          addr.address.startsWith('169.254.')
        ) {
          continue
        }
        let priority = 0
        if (!isVirtual) {
          if (lowerName.includes('wi-fi') || lowerName.includes('wlan') || lowerName.includes('wireless')) {
            priority += 20
          } else if (lowerName.includes('ethernet') || lowerName.includes('eth') || lowerName.includes('en')) {
            priority += 10
          } else {
            priority += 5
          }
        } else {
          priority -= 10
        }
        candidates.push({ ip: addr.address, priority })
      }
    }
  }

  candidates.sort((a, b) => b.priority - a.priority)
  return candidates[0]?.ip || '127.0.0.1'
}

function networkOutputPlugin(): Plugin {
  return {
    name: 'network-output-filter',
    configureServer(server) {
      server.printUrls = () => {
        const address = server.httpServer?.address()
        const port = (typeof address === 'object' && address?.port) || server.config.server.port || 5173
        const protocol = server.config.server.https ? 'https' : 'http'
        const base = server.config.base || '/'
        const cleanBase = base === '/' ? '/' : base
        const lanIp = getLanIp()

        server.config.logger.info(
          `  \x1b[32m➜\x1b[0m  \x1b[1mLocal\x1b[0m:   \x1b[36m${protocol}://localhost:${port}${cleanBase}\x1b[0m\n` +
          `  \x1b[32m➜\x1b[0m  \x1b[1mNetwork\x1b[0m: \x1b[36m${protocol}://${lanIp}:${port}${cleanBase}\x1b[0m\n` +
          `  \x1b[32m➜\x1b[0m  \x1b[2mpress \x1b[1mh + enter\x1b[22m to show help\x1b[0m`,
          { clear: !server.config.logger.hasWarned }
        )
      }
    }
  }
}

export default defineConfig({
  plugins: [react(), networkOutputPlugin()],
  server: {
    host: '0.0.0.0',
    port: 5173,
    proxy: {
      '/api': {
        target: 'http://127.0.0.1:8000',
        changeOrigin: true,
      },
      '/media': {
        target: 'http://127.0.0.1:8000',
        changeOrigin: true,
      },
    }
  }
})


