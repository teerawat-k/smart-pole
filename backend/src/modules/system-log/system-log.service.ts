import { systemLogRepository } from "./system-log.repository";

export const systemLogService = {
  list: systemLogRepository.findMany.bind(systemLogRepository),
};
