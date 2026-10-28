import { useEffect, useRef, useState } from "react";
import { motion, useMotionValue, useSpring, useTransform } from "framer-motion";
import { useReducedMotion, useThemeAttr } from "../hooks.js";
import { cssColor01 } from "../utils.js";

// Raw WebGL (no library). The portrait is a texture on a full-screen quad.
// Effects: pixelated-to-sharp reveal with a sweep line, pointer ripple with RGB split,
// a soft light that follows the cursor, and a wobble driven by scroll speed.

const VERT = `
attribute vec2 aPos;
varying vec2 vUv;
void main() {
  vUv = aPos * 0.5 + 0.5;
  gl_Position = vec4(aPos, 0.0, 1.0);
}`;

const FRAG = `
#ifdef GL_FRAGMENT_PRECISION_HIGH
precision highp float;
#else
precision mediump float;
#endif
varying vec2 vUv;
uniform sampler2D uTex;
uniform vec2 uMouse;
uniform vec2 uRes;
uniform vec3 uAccent;
uniform float uTime;
uniform float uReveal;
uniform float uHover;
uniform float uVel;

vec3 sampleTex(vec2 uv) {
  return texture2D(uTex, clamp(uv, 0.001, 0.999)).rgb;
}

void main() {
  vec2 uv = vUv;
  float aspect = uRes.x / uRes.y;
  vec2 p = (uv - uMouse) * vec2(aspect, 1.0);
  float d = length(p);
  vec2 dir = normalize(p + vec2(0.0001));

  float wave = sin(d * 34.0 - uTime * 4.0) * exp(-d * 6.0) * uHover;
  vec2 offset = dir * wave * 0.014;
  offset += 0.0025 * vec2(sin(uv.y * 14.0 + uTime * 1.2), cos(uv.x * 12.0 + uTime));
  offset.y += uVel * 0.02 * sin(uv.x * 6.0 + uTime * 2.0);
  vec2 suv = uv + offset;

  float r = smoothstep(0.0, 1.0, uReveal);
  float blocks = mix(18.0, 640.0, r * r);
  vec2 q = floor(suv * blocks) / blocks;
  suv = mix(q, suv, step(0.98, uReveal));

  float split = 0.0016 + abs(wave) * 0.03 + abs(uVel) * 0.012;
  vec3 col = vec3(sampleTex(suv + dir * split).r, sampleTex(suv).g, sampleTex(suv - dir * split).b);

  col += uAccent * exp(-d * 4.5) * (0.08 + 0.14 * uHover);
  float vignette = smoothstep(1.15, 0.35, length((uv - 0.5) * vec2(1.0, 1.15)));
  col *= mix(0.9, 1.0, vignette);

  float front = uReveal * 1.25;
  float sweep = smoothstep(0.03, 0.0, abs((1.0 - uv.y) - front)) * (1.0 - step(0.999, uReveal));
  col += uAccent * sweep * 0.9;
  float mask = smoothstep(0.0, 0.05, front - (1.0 - uv.y));

  gl_FragColor = vec4(col * mask, mask);
}`;

function compile(gl, type, source) {
  const shader = gl.createShader(type);
  gl.shaderSource(shader, source);
  gl.compileShader(shader);
  if (!gl.getShaderParameter(shader, gl.COMPILE_STATUS)) {
    console.warn(gl.getShaderInfoLog(shader));
    return null;
  }
  return shader;
}

export default function PhotoGL({ src, alt, width, height, ready = true }) {
  const wrapRef = useRef(null);
  const canvasRef = useRef(null);
  const readyRef = useRef(ready);
  const pointer = useRef({ x: 0.5, y: 0.5, hover: 0 });
  const accentRef = useRef([0.3, 0.73, 0.66]);
  const [glOn, setGlOn] = useState(false);
  const reduced = useReducedMotion();
  const theme = useThemeAttr();

  // 3D tilt
  const tiltX = useMotionValue(0);
  const tiltY = useMotionValue(0);
  const rotateX = useSpring(useTransform(tiltY, [-0.5, 0.5], [7, -7]), { stiffness: 140, damping: 16 });
  const rotateY = useSpring(useTransform(tiltX, [-0.5, 0.5], [-9, 9]), { stiffness: 140, damping: 16 });

  useEffect(() => {
    readyRef.current = ready;
  }, [ready]);

  useEffect(() => {
    accentRef.current = cssColor01("--accent");
  }, [theme]);

  useEffect(() => {
    const canvas = canvasRef.current;
    const wrap = wrapRef.current;
    if (!canvas || !wrap) return undefined;

    const gl =
      canvas.getContext("webgl", { premultipliedAlpha: true, antialias: false, alpha: true }) ||
      canvas.getContext("experimental-webgl");
    if (!gl) return undefined;

    const vs = compile(gl, gl.VERTEX_SHADER, VERT);
    const fs = compile(gl, gl.FRAGMENT_SHADER, FRAG);
    if (!vs || !fs) return undefined;
    const program = gl.createProgram();
    gl.attachShader(program, vs);
    gl.attachShader(program, fs);
    gl.linkProgram(program);
    if (!gl.getProgramParameter(program, gl.LINK_STATUS)) return undefined;
    gl.useProgram(program);

    const buffer = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, buffer);
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1, -1, 1, -1, -1, 1, 1, 1]), gl.STATIC_DRAW);
    const posLoc = gl.getAttribLocation(program, "aPos");
    gl.enableVertexAttribArray(posLoc);
    gl.vertexAttribPointer(posLoc, 2, gl.FLOAT, false, 0, 0);

    const uni = (name) => gl.getUniformLocation(program, name);
    const u = {
      tex: uni("uTex"), mouse: uni("uMouse"), res: uni("uRes"), accent: uni("uAccent"),
      time: uni("uTime"), reveal: uni("uReveal"), hover: uni("uHover"), vel: uni("uVel"),
    };

    const texture = gl.createTexture();
    let disposed = false;
    let loaded = false;
    let visible = true;
    let raf = 0;
    let revealStart = null;
    let lastY = window.scrollY;
    let vel = 0;
    const smooth = { x: 0.5, y: 0.5, hover: 0 };
    const t0 = performance.now();

    const draw = (reveal, time, hover, velocity) => {
      gl.clearColor(0, 0, 0, 0);
      gl.clear(gl.COLOR_BUFFER_BIT);
      gl.uniform1i(u.tex, 0);
      gl.uniform2f(u.mouse, smooth.x, smooth.y);
      gl.uniform2f(u.res, canvas.width, canvas.height);
      gl.uniform3f(u.accent, ...accentRef.current);
      gl.uniform1f(u.time, time);
      gl.uniform1f(u.reveal, reveal);
      gl.uniform1f(u.hover, hover);
      gl.uniform1f(u.vel, velocity);
      gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4);
    };

    const resize = () => {
      const dpr = Math.min(window.devicePixelRatio || 1, 2);
      const w = Math.max(1, Math.round(wrap.clientWidth * dpr));
      const h = Math.max(1, Math.round(wrap.clientHeight * dpr));
      if (canvas.width !== w || canvas.height !== h) {
        canvas.width = w;
        canvas.height = h;
      }
      gl.viewport(0, 0, w, h);
      if (loaded && (reduced || !raf)) draw(1, 0, 0, 0);
    };

    const frame = (now) => {
      raf = 0;
      if (disposed || !visible) return;
      if (readyRef.current && revealStart === null) revealStart = now;
      const reveal = revealStart === null ? 0 : Math.min((now - revealStart) / 1700, 1);

      const target = pointer.current;
      smooth.x += (target.x - smooth.x) * 0.12;
      smooth.y += (target.y - smooth.y) * 0.12;
      smooth.hover += (target.hover - smooth.hover) * 0.08;

      const y = window.scrollY;
      const speed = ((y - lastY) / Math.max(window.innerHeight, 1)) * 0.8;
      lastY = y;
      vel += (Math.max(-1, Math.min(1, speed)) - vel) * 0.12;

      draw(reveal, (now - t0) / 1000, smooth.hover, vel);
      raf = requestAnimationFrame(frame);
    };

    const start = () => {
      if (reduced) {
        draw(1, 0, 0, 0);
      } else if (!raf && loaded && visible) {
        raf = requestAnimationFrame(frame);
      }
    };

    const image = new Image();
    image.decoding = "async";
    image.onload = () => {
      if (disposed) return;
      gl.activeTexture(gl.TEXTURE0);
      gl.bindTexture(gl.TEXTURE_2D, texture);
      gl.pixelStorei(gl.UNPACK_FLIP_Y_WEBGL, true);
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
      gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, image);
      loaded = true;
      resize();
      setGlOn(true);
      start();
    };
    image.src = src;

    const resizeObserver = new ResizeObserver(resize);
    resizeObserver.observe(wrap);

    const visibility = new IntersectionObserver(
      (entries) => {
        visible = entries[0].isIntersecting;
        if (visible) start();
        else if (raf) {
          cancelAnimationFrame(raf);
          raf = 0;
        }
      },
      { threshold: 0.05 }
    );
    visibility.observe(wrap);

    const onLost = (event) => {
      event.preventDefault();
      setGlOn(false);
    };
    canvas.addEventListener("webglcontextlost", onLost);

    return () => {
      disposed = true;
      if (raf) cancelAnimationFrame(raf);
      resizeObserver.disconnect();
      visibility.disconnect();
      canvas.removeEventListener("webglcontextlost", onLost);
      gl.deleteTexture(texture);
      gl.deleteBuffer(buffer);
      gl.deleteProgram(program);
      // Do not call loseContext(): React StrictMode re-runs this effect on the same canvas in development.
    };
  }, [src, reduced]);

  const onPointerMove = (event) => {
    const rect = wrapRef.current.getBoundingClientRect();
    const nx = (event.clientX - rect.left) / rect.width;
    const ny = (event.clientY - rect.top) / rect.height;
    pointer.current.x = Math.min(1, Math.max(0, nx));
    pointer.current.y = Math.min(1, Math.max(0, 1 - ny));
    pointer.current.hover = 1;
    tiltX.set(nx - 0.5);
    tiltY.set(ny - 0.5);
  };

  const onPointerLeave = () => {
    pointer.current.hover = 0;
    tiltX.set(0);
    tiltY.set(0);
  };

  return (
    <motion.div
      ref={wrapRef}
      className="photo"
      style={{ rotateX, rotateY, transformPerspective: 1000 }}
      onPointerMove={onPointerMove}
      onPointerLeave={onPointerLeave}
    >
      <img className="photo-img" data-gl={glOn ? "on" : "off"} src={src} alt={alt} width={width} height={height} decoding="async" />
      <canvas ref={canvasRef} className="photo-canvas" data-gl={glOn ? "on" : "off"} aria-hidden="true" />
    </motion.div>
  );
}
