import type { Prisma, PoleStatus } from "@prisma/client";
import { prisma } from "@/plugins/prisma";
import type { PrismaTx } from "@/common/utils/prisma-tx";

const POLE_LIST_SELECT = {
  id: true,
  poleName: true,
  installPlace: true,
  poleStatus: true,
  lastSeenAt: true,
  hasCamera: true,
  hasPm25Sensor: true,
  hasTempHumidity: true,
  hasLed: true,
  createdAt: true,
  updatedAt: true,
} satisfies Prisma.PoleSelect;

const POLE_DETAIL_SELECT = {
  id: true,
  poleName: true,
  installPlace: true,
  ddnsHostname: true,
  ipCamera: true,
  cameraModel: true,
  latitude: true,
  longitude: true,
  hasCamera: true,
  hasPm25Sensor: true,
  hasTempHumidity: true,
  hasLed: true,
  poleStatus: true,
  lastSeenAt: true,
  maintenanceReason: true,
  mqttUsername: true,
  createdAt: true,
  updatedAt: true,
} satisfies Prisma.PoleSelect;

const POLE_LOOKUP_SELECT = {
  id: true,
  poleName: true,
  installPlace: true,
  hasCamera: true,
  hasPm25Sensor: true,
  hasTempHumidity: true,
} satisfies Prisma.PoleSelect;

export const poleRepository = {
  async findMany(params: {
    page: number;
    limit: number;
    search?: string;
    poleStatus?: PoleStatus;
    hasCamera?: boolean;
  }) {
    const where: Prisma.PoleWhereInput = {
      deletedAt: null,
      ...(params.poleStatus && { poleStatus: params.poleStatus }),
      ...(params.hasCamera !== undefined && { hasCamera: params.hasCamera }),
      ...(params.search && {
        OR: [
          { poleName: { contains: params.search, mode: "insensitive" } },
          { installPlace: { contains: params.search, mode: "insensitive" } },
        ],
      }),
    };

    const [data, total] = await prisma.$transaction([
      prisma.pole.findMany({
        where,
        select: POLE_LIST_SELECT,
        orderBy: { createdAt: "desc" },
        skip: (params.page - 1) * params.limit,
        take: params.limit,
      }),
      prisma.pole.count({ where }),
    ]);
    return { data, total };
  },

  async findById(id: number) {
    return prisma.pole.findFirst({
      where: { id, deletedAt: null },
      select: POLE_DETAIL_SELECT,
    });
  },

  async findByName(poleName: string) {
    return prisma.pole.findFirst({
      where: { poleName, deletedAt: null },
      select: { id: true, poleName: true },
    });
  },

  async findByMqttUsername(mqttUsername: string) {
    return prisma.pole.findFirst({
      where: { mqttUsername, deletedAt: null },
      select: { id: true, poleName: true, mqttPasswordHash: true },
    });
  },

  async findByDdnsHostname(ddnsHostname: string) {
    return prisma.pole.findFirst({
      where: { ddnsHostname, deletedAt: null },
      select: { id: true },
    });
  },

  async findLookup() {
    return prisma.pole.findMany({
      where: { deletedAt: null },
      select: POLE_LOOKUP_SELECT,
      orderBy: { poleName: "asc" },
    });
  },

  async create(
    data: {
      poleName: string;
      installPlace: string;
      ddnsHostname?: string;
      ipCamera?: string;
      cameraModel?: string;
      latitude?: number;
      longitude?: number;
      hasCamera?: boolean;
      hasPm25Sensor?: boolean;
      hasTempHumidity?: boolean;
      hasLed?: boolean;
      mqttUsername: string;
      mqttPasswordHash: string;
      createdBy: number;
    },
    tx?: PrismaTx,
  ) {
    const client = tx ?? prisma;
    return client.pole.create({
      data,
      select: POLE_DETAIL_SELECT,
    });
  },

  async update(
    id: number,
    data: Partial<{
      installPlace: string;
      ddnsHostname: string;
      ipCamera: string;
      cameraModel: string;
      latitude: number;
      longitude: number;
      hasCamera: boolean;
      hasPm25Sensor: boolean;
      hasTempHumidity: boolean;
      hasLed: boolean;
      updatedBy: number;
    }>,
    tx?: PrismaTx,
  ) {
    const client = tx ?? prisma;
    return client.pole.update({
      where: { id },
      data,
      select: POLE_DETAIL_SELECT,
    });
  },

  async updateStatus(
    id: number,
    status: PoleStatus,
    extras?: { lastSeenAt?: Date; maintenanceReason?: string | null; updatedBy?: number },
    tx?: PrismaTx,
  ) {
    const client = tx ?? prisma;
    return client.pole.update({
      where: { id },
      data: {
        poleStatus: status,
        ...(extras?.lastSeenAt && { lastSeenAt: extras.lastSeenAt }),
        ...(extras?.maintenanceReason !== undefined && { maintenanceReason: extras.maintenanceReason }),
        ...(extras?.updatedBy !== undefined && { updatedBy: extras.updatedBy }),
      },
      select: POLE_DETAIL_SELECT,
    });
  },

  async updateMqttCredential(
    id: number,
    data: { mqttUsername: string; mqttPasswordHash: string; updatedBy: number },
    tx?: PrismaTx,
  ) {
    const client = tx ?? prisma;
    return client.pole.update({
      where: { id },
      data,
      select: { id: true, mqttUsername: true },
    });
  },

  async softDelete(id: number, deletedBy: number, tx?: PrismaTx) {
    const client = tx ?? prisma;
    return client.pole.update({
      where: { id },
      data: { deletedAt: new Date(), deletedBy },
    });
  },
};
