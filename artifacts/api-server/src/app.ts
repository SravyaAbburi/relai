import express, { type Express } from "express";
import cors from "cors";
import validateImageRoute from "./routes/validateImage";
import pinoHttp from "pino-http";
import router from "./routes";
import { logger } from "./lib/logger";

const app: Express = express();
app.get("/", (req, res) => {
  res.send("API is running");
});
app.use(
  pinoHttp({
    logger,
    serializers: {
      req(req) {
        return {
          id: req.id,
          method: req.method,
          url: req.url?.split("?")[0],
        };
      },
      res(res) {
        return {
          statusCode: res.statusCode,
        };
      },
    },
  }),
);
app.use(cors());
app.use(express.json({ limit: "50mb" }));
app.use("/api/validate-image", validateImageRoute);
app.use("/api/validate-audio", validateImageRoute);
app.use("/api/validate-text", validateImageRoute);
app.use("/api/validate-video", validateImageRoute);
app.use("/api/validate-document", validateImageRoute);
app.use(express.urlencoded({ extended: true, limit: "50mb" }));

app.use("/api", router);

export default app;
