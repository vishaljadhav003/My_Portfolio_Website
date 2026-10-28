import { useEffect, useRef } from "react";
import { useReducedMotion, useThemeAttr } from "../hooks.js";
import { cssColor01 } from "../utils.js";

// A rotating 3D neural network drawn with raw WebGL: nodes on a sphere, linked to near neighbours.
// Nodes pulse, links fire, and the whole field follows the pointer and the scroll position.

const NODE_COUNT = 96;
const MAX_LINKS_PER_NODE = 3;
const LINK_DISTANCE = 0.62;

const NODE_VERT = `
attribute vec3 aPos;
attribute float aPhase;
uniform mat4 uMvp;
uniform float uTime;
uniform float uSize;
varying float vAlpha;
void main() {
  vec4 p = uMvp * vec4(aPos, 1.0);
  gl_Position = p;
  float pulse = 0.5 + 0.5 * sin(uTime * 1.4 + aPhase * 6.2831);
  gl_PointSize = uSize * (0.9 + 0.9 * pulse) * (3.4 / p.w);
  vAlpha = clamp(1.25 - (p.w - 2.4) * 0.45, 0.15, 1.0) * (0.55 + 0.45 * pulse);
}`;

const NODE_FRAG = `
precision mediump float;
uniform vec3 uColor;
varying float vAlpha;
void main() {
  float d = length(gl_PointCoord - 0.5);
  if (d > 0.5) discard;
  gl_FragColor = vec4(uColor, smoothstep(0.5, 0.05, d) * vAlpha);
}`;

const LINK_VERT = `
attribute vec3 aPos;
attribute float aPhase;
uniform mat4 uMvp;
uniform float uTime;
varying float vAlpha;
void main() {
  vec4 p = uMvp * vec4(aPos, 1.0);
  gl_Position = p;
  float fire = 0.5 + 0.5 * sin(uTime * 1.1 + aPhase * 6.2831);
  vAlpha = clamp(1.25 - (p.w - 2.4) * 0.45, 0.1, 1.0) * (0.16 + 0.62 * pow(fire, 3.0));
}`;

const LINK_FRAG = `
precision mediump float;
uniform vec3 uColor;
varying float vAlpha;
void main() {
  gl_FragColor = vec4(uColor, vAlpha);
}`;

// Seeded random so the graph looks the same on every load.
function mulberry32(seed) {
  let a = seed;
  return () => {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function buildGraph() {
  const rand = mulberry32(7);
  const golden = Math.PI * (3 - Math.sqrt(5));
  const points = [];
  for (let i = 0; i < NODE_COUNT; i++) {
    const y = 1 - (i / (NODE_COUNT - 1)) * 2;
    const radius = Math.sqrt(1 - y * y);
    const theta = golden * i;
    const k = 0.88 + 0.24 * rand();
    points.push([Math.cos(theta) * radius * k, y * k, Math.sin(theta) * radius * k, rand()]);
  }

  const degree = new Array(NODE_COUNT).fill(0);
  const linkPositions = [];
  const linkPhases = [];
  for (let i = 0; i < NODE_COUNT; i++) {
    for (let j = i + 1; j < NODE_COUNT && degree[i] < MAX_LINKS_PER_NODE; j++) {
      const dx = points[i][0] - points[j][0];
      const dy = points[i][1] - points[j][1];
      const dz = points[i][2] - points[j][2];
      if (Math.hypot(dx, dy, dz) < LINK_DISTANCE && degree[j] < MAX_LINKS_PER_NODE + 1) {
        degree[i]++;
        degree[j]++;
        const phase = rand();
        linkPositions.push(...points[i].slice(0, 3), ...points[j].slice(0, 3));
        linkPhases.push(phase, phase);
      }
    }
  }

  return {
    nodePositions: new Float32Array(points.flatMap((p) => [p[0], p[1], p[2]])),
    nodePhases: new Float32Array(points.map((p) => p[3])),
    linkPositions: new Float32Array(linkPositions),
    linkPhases: new Float32Array(linkPhases),
  };
}

// Column-major 4x4 helpers
const perspective = (fovy, aspect, near, far) => {
  const f = 1 / Math.tan(fovy / 2);
  const nf = 1 / (near - far);
  return [f / aspect, 0, 0, 0, 0, f, 0, 0, 0, 0, (far + near) * nf, -1, 0, 0, 2 * far * near * nf, 0];
};
const translate = (x, y, z) => [1, 0, 0, 0, 0, 1, 0, 0, 0, 0, 1, 0, x, y, z, 1];
const rotateX = (a) => {
  const c = Math.cos(a), s = Math.sin(a);
  return [1, 0, 0, 0, 0, c, s, 0, 0, -s, c, 0, 0, 0, 0, 1];
};
const rotateY = (a) => {
  const c = Math.cos(a), s = Math.sin(a);
  return [c, 0, -s, 0, 0, 1, 0, 0, s, 0, c, 0, 0, 0, 0, 1];
};
const multiply = (a, b) => {
  const out = new Array(16).fill(0);
  for (let col = 0; col < 4; col++) {
    for (let row = 0; row < 4; row++) {
      for (let k = 0; k < 4; k++) out[col * 4 + row] += a[k * 4 + row] * b[col * 4 + k];
    }
  }
  return out;
};

function buildProgram(gl, vertSource, fragSource) {
  const make = (type, source) => {
    const shader = gl.createShader(type);
    gl.shaderSource(shader, source);
    gl.compileShader(shader);
    if (!gl.getShaderParameter(shader, gl.COMPILE_STATUS)) {
      console.warn(gl.getShaderInfoLog(shader));
      return null;
    }
    return shader;
  };
  const vs = make(gl.VERTEX_SHADER, vertSource);
  const fs = make(gl.FRAGMENT_SHADER, fragSource);
  if (!vs || !fs) return null;
  const program = gl.createProgram();
  gl.attachShader(program, vs);
  gl.attachShader(program, fs);
  gl.linkProgram(program);
  return gl.getProgramParameter(program, gl.LINK_STATUS) ? program : null;
}

export default function NeuralField({ className }) {
  const canvasRef = useRef(null);
  const colorRef = useRef([0.1, 0.9, 0.64]);
  const reduced = useReducedMotion();
  const theme = useThemeAttr();

  useEffect(() => {
    colorRef.current = cssColor01("--accent");
  }, [theme]);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return undefined;
    const gl = canvas.getContext("webgl", { antialias: true, alpha: true, premultipliedAlpha: true });
    if (!gl) return undefined;

    const nodeProgram = buildProgram(gl, NODE_VERT, NODE_FRAG);
    const linkProgram = buildProgram(gl, LINK_VERT, LINK_FRAG);
    if (!nodeProgram || !linkProgram) return undefined;

    const graph = buildGraph();
    const makeBuffer = (data) => {
      const buffer = gl.createBuffer();
      gl.bindBuffer(gl.ARRAY_BUFFER, buffer);
      gl.bufferData(gl.ARRAY_BUFFER, data, gl.STATIC_DRAW);
      return buffer;
    };
    const buffers = {
      nodePos: makeBuffer(graph.nodePositions),
      nodePhase: makeBuffer(graph.nodePhases),
      linkPos: makeBuffer(graph.linkPositions),
      linkPhase: makeBuffer(graph.linkPhases),
    };

    gl.enable(gl.BLEND);
    gl.blendFuncSeparate(gl.SRC_ALPHA, gl.ONE_MINUS_SRC_ALPHA, gl.ONE, gl.ONE_MINUS_SRC_ALPHA);

    const bindAttrib = (program, name, buffer, size) => {
      const loc = gl.getAttribLocation(program, name);
      gl.bindBuffer(gl.ARRAY_BUFFER, buffer);
      gl.enableVertexAttribArray(loc);
      gl.vertexAttribPointer(loc, size, gl.FLOAT, false, 0, 0);
    };

    const locs = {
      nodeMvp: gl.getUniformLocation(nodeProgram, "uMvp"),
      nodeTime: gl.getUniformLocation(nodeProgram, "uTime"),
      nodeSize: gl.getUniformLocation(nodeProgram, "uSize"),
      nodeColor: gl.getUniformLocation(nodeProgram, "uColor"),
      linkMvp: gl.getUniformLocation(linkProgram, "uMvp"),
      linkTime: gl.getUniformLocation(linkProgram, "uTime"),
      linkColor: gl.getUniformLocation(linkProgram, "uColor"),
    };

    const target = { yaw: 0, pitch: 0 };
    const current = { yaw: 0, pitch: 0 };
    let raf = 0;
    let visible = true;
    let disposed = false;
    const t0 = performance.now();

    const resize = () => {
      const dpr = Math.min(window.devicePixelRatio || 1, window.innerWidth < 700 ? 1.5 : 2);
      const w = Math.max(1, Math.round(canvas.clientWidth * dpr));
      const h = Math.max(1, Math.round(canvas.clientHeight * dpr));
      if (canvas.width !== w || canvas.height !== h) {
        canvas.width = w;
        canvas.height = h;
      }
      gl.viewport(0, 0, w, h);
    };

    const render = (now) => {
      const time = (now - t0) / 1000;
      const scrollSpin = window.scrollY * 0.0016;
      current.yaw += (target.yaw - current.yaw) * 0.06;
      current.pitch += (target.pitch - current.pitch) * 0.06;

      const aspect = canvas.width / canvas.height;
      const spin = reduced ? 0.6 : time * 0.16;
      const proj = perspective((40 * Math.PI) / 180, aspect, 0.1, 20);
      const view = translate(0, 0, -3.1);
      const model = multiply(rotateX(0.35 + current.pitch), rotateY(spin + scrollSpin + current.yaw));
      const mvp = multiply(proj, multiply(view, model));
      const color = colorRef.current;
      const dpr = canvas.width / Math.max(canvas.clientWidth, 1);

      gl.clearColor(0, 0, 0, 0);
      gl.clear(gl.COLOR_BUFFER_BIT);

      gl.useProgram(linkProgram);
      bindAttrib(linkProgram, "aPos", buffers.linkPos, 3);
      bindAttrib(linkProgram, "aPhase", buffers.linkPhase, 1);
      gl.uniformMatrix4fv(locs.linkMvp, false, new Float32Array(mvp));
      gl.uniform1f(locs.linkTime, time);
      gl.uniform3f(locs.linkColor, color[0], color[1], color[2]);
      gl.drawArrays(gl.LINES, 0, graph.linkPositions.length / 3);

      gl.useProgram(nodeProgram);
      bindAttrib(nodeProgram, "aPos", buffers.nodePos, 3);
      bindAttrib(nodeProgram, "aPhase", buffers.nodePhase, 1);
      gl.uniformMatrix4fv(locs.nodeMvp, false, new Float32Array(mvp));
      gl.uniform1f(locs.nodeTime, time);
      gl.uniform1f(locs.nodeSize, 6 * dpr);
      gl.uniform3f(locs.nodeColor, color[0], color[1], color[2]);
      gl.drawArrays(gl.POINTS, 0, NODE_COUNT);
    };

    const loop = (now) => {
      raf = 0;
      if (disposed || !visible) return;
      render(now);
      raf = requestAnimationFrame(loop);
    };

    const start = () => {
      if (reduced) {
        resize();
        render(performance.now());
      } else if (!raf) {
        raf = requestAnimationFrame(loop);
      }
    };

    const onPointer = (event) => {
      target.yaw = (event.clientX / window.innerWidth - 0.5) * 0.9;
      target.pitch = (event.clientY / window.innerHeight - 0.5) * 0.5;
    };
    window.addEventListener("pointermove", onPointer, { passive: true });

    const resizeObserver = new ResizeObserver(() => {
      resize();
      if (reduced) render(performance.now());
    });
    resizeObserver.observe(canvas);

    const visibility = new IntersectionObserver(
      (entries) => {
        visible = entries[0].isIntersecting;
        if (visible) start();
        else if (raf) {
          cancelAnimationFrame(raf);
          raf = 0;
        }
      },
      { threshold: 0 }
    );
    visibility.observe(canvas);

    resize();
    start();

    return () => {
      disposed = true;
      if (raf) cancelAnimationFrame(raf);
      window.removeEventListener("pointermove", onPointer);
      resizeObserver.disconnect();
      visibility.disconnect();
      gl.deleteProgram(nodeProgram);
      gl.deleteProgram(linkProgram);
      Object.values(buffers).forEach((buffer) => gl.deleteBuffer(buffer));
      // Do not call loseContext(): React StrictMode re-runs this effect on the same canvas in development.
    };
  }, [reduced]);

  return <canvas ref={canvasRef} className={className} aria-hidden="true" />;
}
