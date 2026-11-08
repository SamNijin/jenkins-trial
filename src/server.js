const { createApp } = require('./app');

const port = process.env.PORT || 3000;
const server = createApp().listen(port, () => console.log(`todo-app listening on :${port}`));

// Graceful shutdown so container stops don't drop in-flight requests
for (const sig of ['SIGTERM', 'SIGINT']) {
  process.on(sig, () => {
    console.log(`${sig} received, shutting down`);
    server.close(() => process.exit(0));
  });
}
