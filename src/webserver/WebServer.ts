import fastify from "fastify";
import fastifyCors from "@fastify/cors";
import Database from "../database/Database";
import apiRoutes from "./api/api";

class WebServer {
  server;

  constructor(db: Database) {
    this.server = fastify({
      logger: false,
    });

    /**
     * Middleware
     */
    // Cors
    this.server.register(fastifyCors, {
      origin: ["http://localhost:3000"],
    });

    // Add some objects to the instance, so we can access it on all our routes.
    this.server.decorate("db", db);

    /**
     * Routes
     */
    this.server.register((instance, opts, next) => {
      instance.register(apiRoutes);
      instance.get("/*", (req, res) => {
        res.code(404).send({ error: "endpoint not found" });
      });
      next();
    });

    this.server.addHook("onError", async (request, reply, error) => {
      console.error(error);
    });

    /**
     * Start listening
     */
    this.server.listen(3006, (err, address) => {
      if (err) {
        console.error(err);
        process.exit(1);
      } else {
        console.log(`🌐 public endpoints available at port ${address}`);
      }
    });
  }
}

export default WebServer;
