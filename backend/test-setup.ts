// Bun test global setup — preload ก่อนทุก test file
// เพิ่ม global mocks หรือ env defaults ที่นี่
process.env.NODE_ENV = process.env.NODE_ENV ?? "test";
