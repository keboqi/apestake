export function onRequest() {
  return Response.json({ message: "Function works!", timestamp: Date.now() });
} 