import { Hono } from "hono"
import { upgradeWebSocket } from "hono/cloudflare-workers"

const app = new Hono()

const clients = new Set<WebSocket>()

app.use("*", async (c, next) => {
  console.log("Incoming request:", c.req.url)
  await next()
})

app.get("/", (c) => {
  return c.json({ clientCount: clients.size })
})

app.get(
  "/ws",
  upgradeWebSocket((c) => {
    console.log("Attempting WebSocket upgrade...")
    try {
      return {
        onOpen(evt, ws) {
          console.log("WebSocket opened")
          console.log("ws: ", ws)
          console.log("evt: ", evt)
          try {
            clients.add(ws)
            console.log("Client connected. Total clients:", clients.size)
          } catch (error) {
            console.error("Error in onOpen:", error)
          }
        },
        onMessage(event, ws) {
          try {
            console.log(`Message from client: ${event.data}`)
            const message = JSON.parse(event.data)
            clients.forEach((client) => {
              if (client !== ws) {
                client.send(JSON.stringify(message))
              }
            })
          } catch (error) {
            console.error("Error in onMessage:", error)
          }
        },
        onClose(evt, ws) {
          try {
            clients.delete(ws)
            console.log("Connection closed. Remaining clients:", clients.size)
          } catch (error) {
            console.error("Error in onClose:", error)
          }
        },
        onError(evt, ws) {
          try {
            clients.delete(ws)
            console.error("Error occurred:", evt)
          } catch (error) {
            console.error("Error in onError:", error)
          }
        },
      }
    } catch (error) {
      console.error("Error in WebSocket setup:", error)
      throw error
    }
  })
)

app.onError((err, c) => {
  console.error("Global error:", err)
  return c.text("Internal Server Error", 500)
})

export default app
