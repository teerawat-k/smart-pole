/**
 * Reorder record — ส่งมาแค่ { id, order } ตัวเดียว แล้ว function คำนวณ reorder ทั้งหมดให้
 *
 * @param delegate    Prisma model delegate เช่น `prisma.module`
 * @param id          ID ของ record ที่ย้าย
 * @param targetOrder ตำแหน่งใหม่ (0-based)
 * @param options.orderField  column ที่เก็บลำดับ (default: "order")
 * @param options.where       scope condition เพิ่มเติม เช่น `{ groupId: 1 }`
 */
export async function reorderRecord(
  // eslint-disable-next-line @typescript-eslint/no-explicit-any -- Prisma delegates มี type เฉพาะ model
  delegate: { findMany: (args: any) => any; update: (args: any) => any },
  id: number,
  targetOrder: number,
  options?: { orderField?: string; where?: Record<string, unknown> },
): Promise<void> {
  const orderField = options?.orderField ?? "order";
  const baseWhere = { deletedAt: null, ...options?.where };

  const items: { id: number }[] = await delegate.findMany({
    where: baseWhere,
    select: { id: true },
    orderBy: { [orderField]: "asc" },
  });

  const currentIndex = items.findIndex((item) => item.id === id);
  if (currentIndex === -1) return;

  const [moved] = items.splice(currentIndex, 1);
  items.splice(targetOrder, 0, moved);

  for (let index = 0; index < items.length; index++) {
    await delegate.update({ where: { id: items[index].id }, data: { [orderField]: index } });
  }
}
