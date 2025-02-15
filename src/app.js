import express from "express";
import cors from "cors";
import cookieParser from "cookie-parser";

// import routes
import clinicRouter from "./routes/clinic.routes.js";
import userRouter from "./routes/user.router.js";

// build express app
const app = express();

// middleware configuration
app.use(
  cors(
    //! cautions
    {
      origin: "*",
      credentials: true,
    }
  )
);
app.use(express.json({ limit: "16kb" }));
app.use(express.urlencoded({ extended: true, limit: "16kb" }));
app.use(express.static("public"));
app.use(cookieParser());

app.use("/api/v1/clinic", clinicRouter);
app.use("/api/v1/user", userRouter);

export { app };
