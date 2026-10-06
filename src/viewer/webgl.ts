/** True when a WebGL context can be created (released immediately). Kept free of three.js imports
 * so the main bundle stays small; three.js loads only with the viewer chunk. */
export function webglAvailable(): boolean {
  try {
    const c = document.createElement("canvas");
    const gl = (c.getContext("webgl2") || c.getContext("webgl")) as WebGLRenderingContext | null;
    gl?.getExtension("WEBGL_lose_context")?.loseContext();
    return !!gl;
  } catch {
    return false;
  }
}
