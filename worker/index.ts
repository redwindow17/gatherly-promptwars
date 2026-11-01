import { handleApi } from './api';
import { handleDemoVideo } from './demo-video';
export default {
  fetch(request: Request, env: Env): Promise<Response> {
    const pathname = new URL(request.url).pathname;
    if (pathname === '/demo/gatherly-demo.mp4') {
      return handleDemoVideo(request, env.ASSETS);
    }
    return pathname.startsWith('/api/') ? handleApi(request, env) : env.ASSETS.fetch(request);
  },
};
