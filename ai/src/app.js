import express from "express";
import morgan from 'morgan'


const app = express();
app.use(morgan('dev'));
app.use(express.json({ limit: "10mb" }));

app.get("/", (req, res) => {
    return res.status(200).json({
        status: "ok"
    });
})
app.get("/api/ai/healthz", (req, res) => {
    return res.status(200).json({
        status: "ok"
    });
})


export default app