# Third-party notices

Prism shader source:
https://github.com/DavidHDev/react-bits/blob/main/src/content/Backgrounds/Prism/Prism.jsx

GradientWaves shader source:
https://github.com/DavidHDev/react-bits/blob/main/src/content/Backgrounds/GradientWaves/GradientWaves.jsx

GlassSurface material source:
https://github.com/DavidHDev/react-bits/blob/main/src/content/Components/GlassSurface/GlassSurface.jsx
https://github.com/DavidHDev/react-bits/blob/main/src/content/Components/GlassSurface/GlassSurface.css

LineSidebar, BorderGlow, GlassIcons and ProfileCard sources (JSX + CSS):
https://github.com/DavidHDev/react-bits/tree/main/src/content/Components/LineSidebar
https://github.com/DavidHDev/react-bits/tree/main/src/content/Components/BorderGlow
https://github.com/DavidHDev/react-bits/tree/main/src/content/Components/GlassIcons
https://github.com/DavidHDev/react-bits/tree/main/src/content/Components/ProfileCard

These components are by David Haz. This website replaces the React/OGL wrappers with native WebGL/DOM adapters. Prism adds viewport fitting, motion controls, visibility suspension and fallback. GlassSurface keeps RGB displacement and screen blending, scales displacement to button height, separates label and backdrop rendering, and provides frosted/no-filter fallbacks. LineSidebar uses semantic anchors, section tracking and responsive sizing. BorderGlow uses a separate directional border layer compatible with glass controls. GlassIcons use monochrome planes and persistent labels. ProfileCard uses a typographic photo placeholder, restrained glare and desktop pointer tilt. Interaction easing loops stop when settled; reduced-motion and coarse-pointer settings are respected. GradientWaves uses an animated native WebGL2 adapter fixed to the viewport, with a bounded buffer, 30 fps drawing, shared pause control, reduced-motion/visibility handling and an SVG fallback. CSS dims the background for readable portfolio content. No runtime CDN dependencies.

MIT + Commons Clause License Condition v1.0

Copyright (c) 2026 David Haz

Permission is hereby granted, free of charge, to any person obtaining a copy
of this software and associated documentation files (the "Software"), to deal
in the Software without restriction, including without limitation the rights
to use, copy, modify, merge, publish, and distribute the Software **as part of an application, website, or product**, subject to the following conditions:

The above copyright notice and this permission notice shall be included in all
copies or substantial portions of the Software.

## Commons Clause Restriction

You may use this Software, including for any commercial purpose, **so long as you do not sell, sublicense, or redistribute the components themselves-whether alone, in a bundle, or as a ported version.**

## No Warranty

THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE
SOFTWARE.

MouseSparkles: adapted from the React/TypeScript component supplied by the website owner in this task. The original particle colors, sizes and three fall keyframes are retained. The native adapter adds bounded particles, cleanup, fine-pointer-only operation, reduced-motion support and shared pause control. Its four-point star is an inline geometric SVG; no lucide-react code or runtime is bundled.
