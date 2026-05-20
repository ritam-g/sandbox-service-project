import app from "./src/app.js";

const PORT = Number(process.env.PORT || 3000);

// Bind to all interfaces so the service is reachable from Docker, Kind, and Codespaces port forwarding.
app.listen(PORT, "0.0.0.0", () => {
    console.log(`AI server is running on port ${PORT}`);
});
