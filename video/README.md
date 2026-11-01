# Demo video source

HyperFrames 0.8.226 composition: six scenes, 75 seconds, 1920×1080 at 30 fps. The production MP4, poster, and English captions are in `../public/demo/`.

The video uses real Gatherly screenshots with fictional authored starter data. It is a produced walkthrough, not a live screen recording or demonstration of Gemini responses. No sound is included; explanatory text and optional captions carry the story.

Install Node.js and put FFmpeg/FFprobe on PATH, then run these commands from this folder:

```sh
npx --yes hyperframes@0.8.226 browser ensure
npx --yes hyperframes@0.8.226 preview
npx --yes hyperframes@0.8.226 check
npx --yes hyperframes@0.8.226 render --fps 30 --crf 22 --workers 1 --no-best-effort --output ../public/demo/gatherly-demo.mp4
```

Edit `compositions/frames/01-welcome.html` through `06-try.html` to revise individual scenes. `STORYBOARD.md` records their timings and `frame.md` records the visual direction. The assembled `index.html` uses a local GSAP 3.15.0 runtime so the animation library does not depend on a CDN at render time.

Source Serif 4 and Inter are bundled in `assets/fonts/` with their SIL Open Font Licenses. The local aliases `Gatherly Serif` and `Gatherly Sans` keep preview and export typography consistent. Keep the explicit `@font-face` declarations in `index.html` when editing.

The completed composition passed HyperFrames lint, runtime, layout, motion, and contrast checks. Scene posters and cuts were visually inspected. The encoded MP4 was decoded completely and verified as H.264, yuv420p, 2,250 frames, exactly 75 seconds.
