import { setupServer } from 'msw/node';
import { http, HttpResponse } from 'msw';

export const graphApiServer = setupServer();

export function startMswServer(): void {
  graphApiServer.listen({ onUnhandledRequest: 'bypass' });
}

export function stopMswServer(): void {
  graphApiServer.close();
}

export function resetMswHandlers(): void {
  graphApiServer.resetHandlers();
}

export { http, HttpResponse };
