import { z } from "zod";
import { requestRepo } from "../repositories/request.repo";
import { nodeRepo } from "../repositories/node.repo";
import { permissionRepo } from "../repositories/permission.repo";
import { notificationRepo } from "../repositories/notification.repo";
import { auditService } from "./audit.service";
import { ConflictError, ForbiddenError, NotFoundError } from "../errors";
import { AccessRequestStatus, Role } from "@prisma/client";

export const CreateRequestSchema = z.object({
  requestedRole: z.enum(["VIEWER", "EDITOR"]).default("VIEWER"),
  message: z.string().max(500).optional(),
});

export const ResolveRequestSchema = z.object({
  decision: z.enum(["APPROVED", "DENIED"]),
});

export class AccessRequestService {
  async createRequest(
    actor: { id: string },
    nodeId: string,
    input: z.infer<typeof CreateRequestSchema>
  ) {
    const data = CreateRequestSchema.parse(input);
    const node = await nodeRepo.findById(nodeId);
    if (!node) throw new NotFoundError("Node not found");

    if (node.ownerId === actor.id) {
      throw new ConflictError("You are already the owner of this item");
    }

    const existingPending = await requestRepo.findPendingByNodeAndRequester(nodeId, actor.id);
    if (existingPending) {
      throw new ConflictError("You already have a pending access request for this item");
    }

    const request = await requestRepo.create({
      nodeId,
      requesterId: actor.id,
      requestedRole: data.requestedRole as Role,
      message: data.message,
    });

    // Notify node owner
    await notificationRepo.create({
      userId: node.ownerId,
      type: "access_request.created",
      payload: {
        requestId: request.id,
        nodeId: node.id,
        nodeName: node.name,
        requestedRole: request.requestedRole,
        requesterId: actor.id,
      },
    });

    await auditService.log({
      actorId: actor.id,
      action: "access_request.create",
      nodeId,
      metadata: { requestId: request.id, requestedRole: request.requestedRole },
    });

    return request;
  }

  async resolveRequest(
    actor: { id: string },
    requestId: string,
    input: z.infer<typeof ResolveRequestSchema>
  ) {
    const data = ResolveRequestSchema.parse(input);
    const request = await requestRepo.findById(requestId);
    if (!request) throw new NotFoundError("Access request not found");

    // Only owner of the node can approve or deny access requests
    if (request.node.ownerId !== actor.id) {
      throw new ForbiddenError("Only the item owner can approve or deny access requests");
    }

    if (request.status !== AccessRequestStatus.PENDING) {
      throw new ConflictError(`This request has already been ${request.status.toLowerCase()}`);
    }

    const newStatus =
      data.decision === "APPROVED"
        ? AccessRequestStatus.APPROVED
        : AccessRequestStatus.DENIED;

    const resolved = await requestRepo.resolve(requestId, newStatus, actor.id);

    if (data.decision === "APPROVED") {
      // Upsert permission
      await permissionRepo.upsert(
        request.nodeId,
        request.requesterId,
        request.requestedRole,
        actor.id
      );
    }

    // Notify requester
    await notificationRepo.create({
      userId: request.requesterId,
      type: "access_request.resolved",
      payload: {
        requestId: request.id,
        nodeId: request.node.id,
        nodeName: request.node.name,
        status: newStatus,
      },
    });

    await auditService.log({
      actorId: actor.id,
      action: `access_request.${data.decision.toLowerCase()}`,
      nodeId: request.nodeId,
      metadata: { requestId, decision: data.decision },
    });

    return resolved;
  }

  async listIncoming(actor: { id: string }) {
    return requestRepo.listIncomingForOwner(actor.id);
  }

  async listOutgoing(actor: { id: string }) {
    return requestRepo.listOutgoingForRequester(actor.id);
  }
}

export const accessRequestService = new AccessRequestService();
