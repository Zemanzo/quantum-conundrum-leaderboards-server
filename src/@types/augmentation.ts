import Database from "../database/Database";

declare module "fastify" {
  export interface FastifyInstance {
    db: Database;
  }
}
