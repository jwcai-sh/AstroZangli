"use client";

import React, { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";

const TibetanStarMap: React.FC = () => {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const router = useRouter();
  const [showLogin, setShowLogin] = useState(false); // 控制浮窗显示
  const [formData, setFormData] = useState({ name: "", email: "", password: "" });

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    function resizeCanvas() {
      const container = canvas?.parentElement;
      if (!container) return;
      const width = Math.min(container.clientWidth * 0.9, 600);
      const height = Math.min(container.clientHeight * 0.9, 1200);
      if (canvas) {
        canvas.width = width;
        canvas.height = height;
      }
    }

    window.addEventListener("resize", resizeCanvas);
    resizeCanvas();

    // === 加载图片 ===
    const sunImage = new Image();
    const mercuryImage = new Image();
    const venusImage = new Image();
    const earthImage = new Image();
    const moonImage = new Image();
    const marsImage = new Image();
    const jupiterImage = new Image();
    const saturnImage = new Image();
    const uranusImage = new Image();
    const neptuneImage = new Image();

    sunImage.src =
      "https://img.alicdn.com/imgextra/i1/O1CN01oVLbLx22VlN34KDQs_!!6000000007126-2-tps-800-800.png";
    mercuryImage.src =
      "https://img.alicdn.com/imgextra/i2/O1CN01UjgqIB1SrRxQfrflh_!!6000000002300-2-tps-800-800.png";
    venusImage.src =
      "https://img.alicdn.com/imgextra/i3/O1CN01JGEgLU1dfxnVvp91R_!!6000000003764-2-tps-800-800.png";
    earthImage.src =
      "https://img.alicdn.com/imgextra/i4/O1CN01R6wlzD1IhhMlBcGLg_!!6000000000925-2-tps-800-800.png";
    moonImage.src =
      "https://img.alicdn.com/imgextra/i4/O1CN01Ad5SeB20tv1nfRoA2_!!6000000006908-2-tps-800-800.png";
    marsImage.src =
      "https://img.alicdn.com/imgextra/i1/O1CN01OlZAk81OVEHJ0pazq_!!6000000001710-2-tps-800-800.png";
    jupiterImage.src =
      "https://img.alicdn.com/imgextra/i2/O1CN01MA3Mk51bAhWxWxHim_!!6000000003425-2-tps-800-800.png";
    saturnImage.src =
      "https://img.alicdn.com/imgextra/i2/O1CN01NG2FjS1XDDEofNNhg_!!6000000002889-2-tps-800-800.png";
    uranusImage.src =
      "https://img.alicdn.com/imgextra/i1/O1CN01wnxTX51xIPkTHqPBr_!!6000000006420-2-tps-800-800.png";
    neptuneImage.src =
      "https://img.alicdn.com/imgextra/i1/O1CN01LTf0rT25zwJWsIDkD_!!6000000007598-2-tps-800-800.png";

    const planets = [
      { image: mercuryImage, size: 5, orbitRadius: 60, speed: 4.16 },
      { image: venusImage, size: 8, orbitRadius: 90, speed: 1.61 },
      { image: earthImage, size: 10, orbitRadius: 120, speed: 1 },
      { image: marsImage, size: 7, orbitRadius: 150, speed: 0.53 },
      { image: jupiterImage, size: 12, orbitRadius: 180, speed: 0.084 },
      { image: saturnImage, size: 24, orbitRadius: 210, speed: 0.0339 },
      { image: uranusImage, size: 9, orbitRadius: 240, speed: 0.0119 },
      { image: neptuneImage, size: 8, orbitRadius: 270, speed: 0.0061 },
    ];

    let angle = 0;

    const stars: { x: number; y: number; radius: number; opacity: number }[] = [];
    for (let i = 0; i < 200; i++) {
      stars.push({
        x: Math.random() * canvas.width,
        y: Math.random() * canvas.height,
        radius: Math.random() * 1 + 0.5,
        opacity: Math.random() * 0.5 + 0.5,
      });
    }

    function drawBackground() {
      if (!ctx || !canvas) return;
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      stars.forEach((star) => {
        ctx.beginPath();
        ctx.arc(star.x, star.y, star.radius, 0, Math.PI * 2);
        ctx.fillStyle = `rgba(255,255,255,${star.opacity})`;
        ctx.fill();
      });
    }

    function drawOrbit(radius: number) {
      if (!ctx || !canvas) return;
      ctx.beginPath();
      ctx.strokeStyle = "rgba(255,255,255,0.2)";
      ctx.setLineDash([2, 2]);
      ctx.lineWidth = 0.5;
      ctx.arc(canvas.width / 2, canvas.height / 2, radius, 0, Math.PI * 2);
      ctx.stroke();
    }

    function drawPlanets(angle: number) {
      if (!ctx || !canvas) return;
      planets.forEach((planet, index) => {
        const x = canvas.width / 2 + planet.orbitRadius * Math.cos(angle * planet.speed);
        const y = canvas.height / 2 + planet.orbitRadius * Math.sin(angle * planet.speed);
        drawOrbit(planet.orbitRadius);
        ctx.drawImage(planet.image, x - planet.size / 2, y - planet.size / 2, planet.size, planet.size);

        if (index === 2) {
          const moonX = x + 10 * Math.cos(angle * 3);
          const moonY = y + 10 * Math.sin(angle * 3);
          ctx.drawImage(moonImage, moonX - 2.5, moonY - 2.5, 5, 5);
        }
      });
    }

    function drawSun() {
      if (!ctx || !canvas) return;
      ctx.save();
      ctx.globalAlpha = 0.7;
      ctx.drawImage(sunImage, canvas.width / 2 - 30, canvas.height / 2 - 30, 60, 60);
      ctx.restore();
    }

    function drawSolarSystem() {
      drawBackground();
      drawSun();
      drawPlanets(angle);
      angle += 0.01;
      requestAnimationFrame(drawSolarSystem);
    }

    Promise.all([
      sunImage.decode(),
      mercuryImage.decode(),
      venusImage.decode(),
      earthImage.decode(),
      moonImage.decode(),
      marsImage.decode(),
      jupiterImage.decode(),
      saturnImage.decode(),
      uranusImage.decode(),
      neptuneImage.decode(),
    ]).then(() => drawSolarSystem());

    return () => {
      window.removeEventListener("resize", resizeCanvas);
    };
  }, []);

  // 登录提交
  const handleLogin = (e: React.FormEvent) => {
    e.preventDefault();
    console.log("登录信息：", formData);
    setShowLogin(false);
    router.push("/cal"); // 登录后跳转
  };

  return (
    <div className="relative flex justify-center items-center w-full h-screen bg-[#050608] overflow-hidden">
      {/* 背景图 */}
      <div
        className="absolute opacity-30 -z-10"
        style={{
          top: "50%",
          left: "50%",
          transform: "translate(-50%, -50%)",
          width: "80vmin",
          height: "80vmin",
          background: "url('/pho/solarbackground.png') no-repeat center center",
          backgroundSize: "contain",
        }}
      />

      {/* 文本 */}
      <div className="absolute top-[10vh] left-1/2 -translate-x-1/2 text-center text-white/80 text-xl md:text-2xl leading-relaxed tracking-wide w-11/12 font-serif z-50">
        我们凝望星辰,<br />星辰是否也在回望我们？
      </div>

      {/* 按钮区 */}
      <div className="absolute bottom-[10vh] left-1/2 -translate-x-1/2 flex gap-5 z-50">
        <button
          className="px-6 py-3 text-lg font-sans text-white border border-white/40 rounded-lg bg-white/10 backdrop-blur-sm cursor-pointer transition-colors hover:bg-white/20"
          onClick={() => router.push("/cal")}
        >
          藏历星图
        </button>
        <button
          className="px-6 py-3 text-lg font-sans text-white border border-blue-400/40 rounded-lg bg-blue-600/20 backdrop-blur-sm cursor-pointer transition-colors hover:bg-blue-600/30"
          onClick={() => setShowLogin(true)}
        >
          登录
        </button>
      </div>

      {/* 登录浮窗 */}
      {showLogin && (
        <div className="fixed inset-0 flex items-center justify-center bg-black/50 z-50">
          <div className="bg-[#111] text-white rounded-xl shadow-lg p-6 w-[90%] max-w-md">
            <h2 className="text-2xl mb-4 text-center">登录</h2>
            <form onSubmit={handleLogin} className="space-y-4">
              <input
                type="text"
                placeholder="姓名"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                className="w-full p-2 rounded bg-[#222] border border-gray-600 focus:outline-none"
                required
              />
              <input
                type="email"
                placeholder="邮箱"
                value={formData.email}
                onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                className="w-full p-2 rounded bg-[#222] border border-gray-600 focus:outline-none"
                required
              />
              <input
                type="password"
                placeholder="密码"
                value={formData.password}
                onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                className="w-full p-2 rounded bg-[#222] border border-gray-600 focus:outline-none"
                required
              />
              <div className="flex justify-end gap-3">
                <button
                  type="button"
                  onClick={() => setShowLogin(false)}
                  className="px-4 py-2 rounded bg-gray-600 hover:bg-gray-700"
                >
                  取消
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 rounded bg-blue-600 hover:bg-blue-700"
                >
                  提交
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* 画布 */}
      <canvas
        ref={canvasRef}
        className="border border-slate-800 bg-transparent relative w-[90vw] h-[90vh] max-w-[600px] max-h-[1200px]"
      />
    </div>
  );
};

export default TibetanStarMap;
