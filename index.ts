import { serve } from "@hono/node-server";
import { serveStatic } from "@hono/node-server/serve-static";
import { Hono } from "hono";
import { logger } from "hono/logger";
import { Server } from "socket.io";

// use variables for typesafe Context
type Variables = {
  io: Server;
};

const app = new Hono<{ Variables: Variables }>();

// set io to the context, so we can use it in other handlers
app.use(async (c, next) => {
  c.set("io", io);
  await next();
});
app.use(logger());

app.post("/message", async (c) => {
  const io = c.get("io"); // get io from context
  const body = await c.req.json();

  console.log("message via post: " + body.message);
  io.emit("chat message", body.message);

  return c.json({ message: "ok" });
});
app.post("/message8", async (c) => {
  const io = c.get("io"); // get io from context
  const body = await c.req.json();

  console.log("message via post: " + body.message);
  io.emit("chat5 message", body.message);

  return c.json({ message: "ok" });
});
// create a socket.io server
const io = new Server();
io.on("connection", (socket) => {
  console.log("a user connected");

  socket.on("disconnect", () => {
    console.log("user disconnected");
  });

  socket.on("chat message", (msg) => {
    console.log("message via chat: " + msg);
    io.emit("chat message", msg);
  });
});

app.use(serveStatic({ root: "public" }));

const honoServer = serve(app, (info) =>
  console.log(`Listening on ${info.address}:${info.port}`)
);

// attach the socket.io server to the Hono server
io.attach(honoServer);
