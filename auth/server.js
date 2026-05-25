import app from "./src/app.js";
import connectDB from "./src/config/db.js";
app.listen(4001, async () => {
    await connectDB();
    console.log('Auth service running on port 4001');
});