import { handleApi } from './api';
export default {
  fetch(request: Request, env: Env): Promise<Response> {
    return new URL(request.url).pathname.startsWith('/api/')
      ? handleApi(request, env)
      : env.ASSETS.fetch(request);
  },
};
