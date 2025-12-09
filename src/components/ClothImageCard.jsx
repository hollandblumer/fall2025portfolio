import { useEffect, useRef } from "react";

export default function ClothImageCard({ img, alt = "Project" }) {
  const containerRef = useRef(null);
  const canvasRef = useRef(null);

  useEffect(() => {
    const container = containerRef.current;
    const canvas = canvasRef.current;
    if (!container || !canvas) return;

    const ctx = canvas.getContext("2d");
    let animationId;

    // Size canvas to container
    const resize = () => {
      const rect = container.getBoundingClientRect();
      const width = rect.width;
      const height = rect.height;
      canvas.width = width;
      canvas.height = height;
    };
    resize();
    window.addEventListener("resize", resize);

    // ---- Cloth parameters (scaled a bit for per-card use) ----
    const accuracy = 4;
    let gravity = 300;
    const clothY = 14;
    const clothX = 22;
    const tearDist = 60;
    const friction = 0.98;
    const bounce = 0.4;

    // Compute spacing based on canvas size
    const spacingX = canvas.width / clothX;
    const spacingY = canvas.height / clothY;

    // Mouse for interaction
    const mouse = {
      cut: 8,
      influence: 40,
      down: false,
      button: 1,
      x: 0,
      y: 0,
      px: 0,
      py: 0,
    };

    function setMouse(e) {
      const rect = canvas.getBoundingClientRect();
      mouse.px = mouse.x;
      mouse.py = mouse.y;
      mouse.x = e.clientX - rect.left;
      mouse.y = e.clientY - rect.top;
    }

    const onDown = (e) => {
      mouse.button = e.which || 1;
      mouse.down = true;
      setMouse(e);
    };
    const onMove = (e) => setMouse(e);
    const onUp = () => {
      mouse.down = false;
    };
    const onContextMenu = (e) => e.preventDefault();

    canvas.addEventListener("mousedown", onDown);
    canvas.addEventListener("mousemove", onMove);
    window.addEventListener("mouseup", onUp);
    canvas.addEventListener("contextmenu", onContextMenu);

    class Point {
      constructor(x, y) {
        this.x = x;
        this.y = y;
        this.px = x;
        this.py = y;
        this.vx = 0;
        this.vy = 0;
        this.pinX = null;
        this.pinY = null;
        this.constraints = [];
      }

      update(delta) {
        if (this.pinX !== null && this.pinY !== null) return;

        if (mouse.down) {
          const dx = this.x - mouse.x;
          const dy = this.y - mouse.y;
          const dist = Math.sqrt(dx * dx + dy * dy);

          if (mouse.button === 1 && dist < mouse.influence) {
            this.px = this.x - (mouse.x - mouse.px);
            this.py = this.y - (mouse.y - mouse.py);
          } else if (dist < mouse.cut) {
            this.constraints = [];
          }
        }

        this.addForce(0, gravity);

        const nx = this.x + (this.x - this.px) * friction + this.vx * delta;
        const ny = this.y + (this.y - this.py) * friction + this.vy * delta;

        this.px = this.x;
        this.py = this.y;

        this.x = nx;
        this.y = ny;

        this.vx = 0;
        this.vy = 0;

        // Bounds
        if (this.x >= canvas.width) {
          this.px = canvas.width + (canvas.width - this.px) * bounce;
          this.x = canvas.width;
        } else if (this.x <= 0) {
          this.px *= -1 * bounce;
          this.x = 0;
        }

        if (this.y >= canvas.height) {
          this.py = canvas.height + (canvas.height - this.py) * bounce;
          this.y = canvas.height;
        } else if (this.y <= 0) {
          this.py *= -1 * bounce;
          this.y = 0;
        }
      }

      resolve() {
        if (this.pinX !== null && this.pinY !== null) {
          this.x = this.pinX;
          this.y = this.pinY;
          return;
        }
        this.constraints.forEach((c) => c.resolve());
      }

      drawConstraints() {
        this.constraints.forEach((c) => c.draw());
      }

      attach(point) {
        this.constraints.push(new Constraint(this, point));
      }

      free(constraint) {
        const index = this.constraints.indexOf(constraint);
        if (index !== -1) this.constraints.splice(index, 1);
      }

      addForce(x, y) {
        this.vx += x;
        this.vy += y;
      }

      pin(x, y) {
        this.pinX = x;
        this.pinY = y;
      }
    }

    class Constraint {
      constructor(p1, p2) {
        this.p1 = p1;
        this.p2 = p2;
        this.length =
          Math.hypot(canvas.width / clothX, canvas.height / clothY) * 0.7; // a bit stretchy
      }

      resolve() {
        const dx = this.p1.x - this.p2.x;
        const dy = this.p1.y - this.p2.y;
        const dist = Math.sqrt(dx * dx + dy * dy);

        if (dist < this.length) return;

        if (dist > tearDist) this.p1.free(this);

        const diff = (this.length - dist) / dist;
        const mul = diff * 0.5 * (1 - this.length / dist);

        const px = dx * mul;
        const py = dy * mul;

        if (this.p1.pinX === null) this.p1.x += px;
        if (this.p1.pinY === null) this.p1.y += py;
        if (this.p2.pinX === null) this.p2.x -= px;
        if (this.p2.pinY === null) this.p2.y -= py;
      }

      draw() {
        ctx.moveTo(this.p1.x, this.p1.y);
        ctx.lineTo(this.p2.x, this.p2.y);
      }
    }

    class Cloth {
      constructor() {
        this.points = [];

        for (let y = 0; y <= clothY; y++) {
          for (let x = 0; x <= clothX; x++) {
            const px = x * spacingX;
            const py = y * spacingY;
            const point = new Point(px, py);

            // Pin ONLY the four corners
            const isLeft = x === 0;
            const isRight = x === clothX;
            const isTop = y === 0;
            const isBottom = y === clothY;

            if (
              (isLeft && isTop) ||
              (isRight && isTop) ||
              (isRight && isBottom) ||
              (isLeft && isBottom)
            ) {
              point.pin(px, py);
            }

            if (x !== 0) {
              point.attach(this.points[this.points.length - 1]);
            }
            if (y !== 0) {
              point.attach(this.points[x + (y - 1) * (clothX + 1)]);
            }

            this.points.push(point);
          }
        }
      }

      update(delta) {
        let i = accuracy;
        while (i--) {
          this.points.forEach((p) => p.resolve());
        }
        this.points.forEach((p) => p.update(delta));
      }

      // Build a smooth blob path from the outer ring of points
      buildPath() {
        const boundary = [];

        // top edge (left → right)
        for (let x = 0; x <= clothX; x++) {
          boundary.push(this.points[x]);
        }

        // right edge (top → bottom, skipping the first)
        for (let y = 1; y <= clothY; y++) {
          const idx = y * (clothX + 1) + clothX;
          boundary.push(this.points[idx]);
        }

        // bottom edge (right → left, skipping the first)
        for (let x = clothX - 1; x >= 0; x--) {
          const idx = clothY * (clothX + 1) + x;
          boundary.push(this.points[idx]);
        }

        // left edge (bottom → top, skipping first and last)
        for (let y = clothY - 1; y > 0; y--) {
          const idx = y * (clothX + 1);
          boundary.push(this.points[idx]);
        }

        if (!boundary.length) return;

        ctx.beginPath();
        const first = boundary[0];
        ctx.moveTo(first.x, first.y);

        for (let i = 1; i < boundary.length + 1; i++) {
          const p = boundary[i % boundary.length];
          const prev = boundary[(i - 1) % boundary.length];
          const midX = (prev.x + p.x) / 2;
          const midY = (prev.y + p.y) / 2;
          ctx.quadraticCurveTo(prev.x, prev.y, midX, midY);
        }

        ctx.closePath();
      }
    }

    const cloth = new Cloth();

    // Load image
    const image = new Image();
    image.crossOrigin = "anonymous";
    image.src = img;

    let lastTime = performance.now();

    function loop(now) {
      const delta = Math.min(0.032, (now - lastTime) / 1000); // clamp
      lastTime = now;

      ctx.clearRect(0, 0, canvas.width, canvas.height);

      cloth.update(delta);

      if (image.complete && image.naturalWidth > 0) {
        // Blob outline
        cloth.buildPath();

        // Clip and draw image inside
        ctx.save();
        ctx.clip();
        ctx.drawImage(image, 0, 0, canvas.width, canvas.height);
        ctx.restore();
      } else {
        // Fallback: draw constraints if image not loaded yet
        ctx.beginPath();
        cloth.points.forEach((p) => p.drawConstraints && p.drawConstraints());
        ctx.strokeStyle = "#555";
        ctx.stroke();
      }

      animationId = requestAnimationFrame(loop);
    }

    animationId = requestAnimationFrame(loop);

    return () => {
      cancelAnimationFrame(animationId);
      window.removeEventListener("resize", resize);
      canvas.removeEventListener("mousedown", onDown);
      canvas.removeEventListener("mousemove", onMove);
      window.removeEventListener("mouseup", onUp);
      canvas.removeEventListener("contextmenu", onContextMenu);
    };
  }, [img]);

  return (
    <div
      ref={containerRef}
      className="project-frame soft-cloth-frame"
      style={{
        position: "relative",
        overflow: "hidden",
      }}
    >
      <canvas
        ref={canvasRef}
        className="soft-cloth-canvas"
        style={{ width: "100%", height: "100%", display: "block" }}
      />
    </div>
  );
}
