import { Suspense, lazy } from "react";

// Port of the splite.tsx component. The Spline runtime is large, so it loads only when this section is rendered.
const Spline = lazy(() => import("@splinetool/react-spline"));

export default function SplineScene({ scene, className }) {
  return (
    <Suspense
      fallback={
        <div className="spline-loading" role="status" aria-label="Loading 3D scene">
          <span className="spline-loader" />
        </div>
      }
    >
      <Spline scene={scene} className={className} />
    </Suspense>
  );
}
