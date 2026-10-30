import { prisma } from "../db/prisma";
import { AccessRequest, AccessRequestStatus, Role, Node, User } from "@prisma/client";

export type AccessRequestWithDetails = AccessRequest & {
  node: Node;
  requester: Pick<User, "id" | "email" | "name">;
};

export class RequestRepository {
  async create(data: {
    nodeId: string;
    requesterId: string;
    requestedRole: Role;
    message?: string | null;
  }): Promise<AccessRequest> {
    return prisma.accessRequest.create({
      data: {
        ...data,
        status: AccessRequestStatus.PENDING,
      },
    });
  }

  async findById(id: string): Promise<(AccessRequest & { node: Node }) | null> {
    return prisma.accessRequest.findUnique({
      where: { id },
      include: { node: true },
    });
  }

  async findPendingByNodeAndRequester(nodeId: string, requesterId: string): Promise<AccessRequest | null> {
    return prisma.accessRequest.findFirst({
      where: {
        nodeId,
        requesterId,
        status: AccessRequestStatus.PENDING,
      },
    });
  }

  async listIncomingForOwner(ownerId: string): Promise<AccessRequestWithDetails[]> {
    return prisma.accessRequest.findMany({
      where: {
        node: { ownerId },
      },
      include: {
        node: true,
        requester: {
          select: { id: true, email: true, name: true },
        },
      },
      orderBy: { createdAt: "desc" },
    });
  }

  async listOutgoingForRequester(requesterId: string): Promise<Array<AccessRequest & { node: Node }>> {
    return prisma.accessRequest.findMany({
      where: { requesterId },
      include: { node: true },
      orderBy: { createdAt: "desc" },
    });
  }

  async resolve(
    id: string,
    status: AccessRequestStatus,
    resolvedById?: string
  ): Promise<AccessRequest> {
    return prisma.accessRequest.update({
      where: { id },
      data: {
        status,
        resolvedById: resolvedById || null,
        resolvedAt: new Date(),
      },
    });
  }
}

export const requestRepo = new RequestRepository();
