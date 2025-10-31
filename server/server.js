import express from "express";

const app = express();
const PORT = process.env.PORT || 1967;

// Allow Vite client to connect from localhost:5173
app.use((_req, res, next) => {
  res.setHeader("Access-Control-Allow-Origin", "*");
  next();
});

// SSE endpoint
app.get("/api/events", (req, res) => {
  res.writeHead(200, {
    "Content-Type": "text/event-stream",
    "Cache-Control": "no-cache",
    Connection: "keep-alive",
  });

  const send = (event) => {
    res.write(`data: ${JSON.stringify(event)}\n\n`);
  };

  let counter = 0;
  const interval = setInterval(() => {
    counter++;
    const evt = {
      type: "span",
      ts: new Date().toISOString(),
      sessionId: "live-demo",
      provider: "demo",
      level: "info",
      ctx: { traceId: "demo-trace", spanId: `evt-${counter}` },
      operation: "demo:heartbeat",
      durationMs: Math.floor(Math.random() * 1000),
      status: "ok",
      attrs: { seq: counter },
    };
    send(evt);
  }, 1000);

  req.on("close", () => clearInterval(interval));
});

app.listen(PORT, () =>
  console.log(`✅ SSE server running at http://localhost:${PORT}/api/events`)
);
