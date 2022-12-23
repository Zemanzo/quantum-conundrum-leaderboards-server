import { FastifyReply, FastifyRequest } from "fastify";

export function getBody(req: FastifyRequest, res: FastifyReply) {
  try {
    const body = JSON.parse(req.body as string);
    return body;
  } catch {
    res.code(400).send({ error: "Request is malformed (invalid JSON)" });
  }
}
