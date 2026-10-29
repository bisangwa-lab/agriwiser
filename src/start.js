import { createCsrfMiddleware, createStart } from "@tanstack/react-start";
import { authMiddleware, base44RequestMiddleware } from "@/lib/auth-middleware";
import { errorCaptureFunctionMiddleware, errorCaptureRequestMiddleware } from "@/lib/error-capture";

// Every server function and server route gets `context.getBase44()`, acting as the visitor.
// Error capture goes first, so it sees what the other middlewares and the handlers throw.
const csrfMiddleware = createCsrfMiddleware({ filter: (context) => context.handlerType === "serverFn" });

export const startInstance = createStart(() => ({
  requestMiddleware: [errorCaptureRequestMiddleware, csrfMiddleware, base44RequestMiddleware],
  functionMiddleware: [errorCaptureFunctionMiddleware, authMiddleware],
}));
