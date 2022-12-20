import { FastifyInstance } from "fastify";

async function routes(fastify: FastifyInstance) {
  fastify.get("/api/runs", async (req, res) => {
    const runs =
      fastify.db.preparedStatements.select.allFastestRunsNoAbuse.all();
    res.code(200).send(runs);
  });

  fastify.get("/api/users", async (req, res) => {
    const users = fastify.db.preparedStatements.select.allUsers.all();
    res.code(200).send(users);
  });
}

export default routes;
