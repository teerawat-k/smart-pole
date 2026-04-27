// Health endpoint สำหรับ Docker healthcheck
export function GET() {
  return Response.json({ success: true, data: { status: "ok" } });
}
