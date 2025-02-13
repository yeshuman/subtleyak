import { z } from "zod";
import { MedusaRequest, MedusaResponse } from "@medusajs/framework/http";
import { PostAdminCreateVehicleBody } from "./validators";
import { createVehicleBodyWorkflow } from "../../../../workflows/create-vehicle-body";

type QueryResponse = {
  data: any[];
  metadata: {
    count: number;
    take: number;
    skip: number;
  };
};

export const GET = async (req: MedusaRequest, res: MedusaResponse) => {
  const query = req.scope.resolve("query");

  const queryOptions = {
    entity: "vehicle_body",
    ...req.queryConfig,
  };

  const { data: vehicle_bodies, metadata } = (await query.graph(
    queryOptions
  )) as QueryResponse;

  res.json({
    vehicle_bodies,
    count: metadata.count,
    limit: metadata.take,
    offset: metadata.skip,
  });
};

type PostAdminCreateVehicleBodyType = z.infer<
  typeof PostAdminCreateVehicleBody
>;

export const POST = async (
  req: MedusaRequest<PostAdminCreateVehicleBodyType>,
  res: MedusaResponse
) => {
  const { result } = await createVehicleBodyWorkflow(req.scope).run({
    input: req.validatedBody,
  });

  res.json({ vehicle_body: result });
}; 