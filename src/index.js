import { app } from "./app.js";
import dotenv from "dotenv";
import connectDB from "./db/index.js";

dotenv.config({
  path: "./.env",
});

connectDB()
  .then(() => {
    app.listen(process.env.PORT || 8000, () => {
      console.log(
        "\n Server is up and running on port ",
        process.env.PORT || 8000
      );
    });
  })
  .catch((error) => console.log("MongoDB connection Failed !! ", error));

export default app; // ✅ Required for Vercel deployment
