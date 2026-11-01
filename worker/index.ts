import { handleApi } from './api';
import { handleDemoVideo } from './demo-video';
import videoMetadata from './video-metadata.json';
export default {
  fetch(request: Request, env: Env): Promise<Response> {
    const pathname = new URL(request.url).pathname;
    if (pathname === '/demo/gatherly-demo.mp4') {
      return handleDemoVideo(request, env.ASSETS, videoMetadata.bytes);
    }
    return pathname.startsWith('/api/') ? handleApi(request, env) : env.ASSETS.fetch(request);
  },
};
