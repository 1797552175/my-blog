// Chrome DevTools 会请求此路径，返回 200 避免控制台 404
export function GET() {
  return Response.json({});
}
