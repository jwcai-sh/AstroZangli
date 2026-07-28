
// 声明全局变量
let canvas, ctx;
let angle = 0;
let stars = [];

// Load images
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

// 等待DOM加载完成后再初始化
document.addEventListener('DOMContentLoaded', function() {
  canvas = document.getElementById("solarSystemCanvas");
  if (!canvas) {
    console.error("Canvas element not found!");
    return;
  }
  ctx = canvas.getContext("2d");
  
  // Generate stars
  for (let i = 0; i < 200; i++) {
    stars.push({
      x: Math.random() * canvas.width,
      y: Math.random() * canvas.height,
      radius: Math.random() * 1 + 0.5,
      opacity: Math.random() * 0.5 + 0.5,
    });
  }

function drawBackground() {
    // 清除画布
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    // 只绘制星星
    stars.forEach((star) => {
        ctx.beginPath();
        ctx.arc(star.x, star.y, star.radius, 0, Math.PI * 2);
        ctx.fillStyle = `rgba(255, 255, 255, ${star.opacity})`;
        ctx.fill();
    });
}

function drawOrbit(radius) {
    ctx.beginPath();
    ctx.strokeStyle = "rgba(255, 255, 255, 0.2)";
    ctx.setLineDash([2, 2]);
    ctx.lineWidth = 0.5;
    ctx.arc(canvas.width / 2, canvas.height / 2, radius, 0, Math.PI * 2);
    ctx.stroke();
}

function drawPlanets(angle) {
    planets.forEach((planet, index) => {
        const x =
            canvas.width / 2 +
            planet.orbitRadius * Math.cos(angle * planet.speed);
        const y =
            canvas.height / 2 +
            planet.orbitRadius * Math.sin(angle * planet.speed);
        drawOrbit(planet.orbitRadius);
        ctx.drawImage(
            planet.image,
            x - planet.size / 2,
            y - planet.size / 2,
            planet.size,
            planet.size
        );

        if (index === 2) {
            // Earth
            const moonX = x + 10 * Math.cos(angle * 3); // Moon orbits faster than Earth
            const moonY = y + 10 * Math.sin(angle * 3);
            ctx.drawImage(moonImage, moonX - 2.5, moonY - 2.5, 5, 5);
        }
    });
}

function drawSun() {
    // 保存当前的绘图状态
    ctx.save();
    // 设置全局透明度（0-1之间，0.5表示50%透明度）
    ctx.globalAlpha = 0.7;
    ctx.drawImage(
        sunImage,
        canvas.width / 2 - 30,
        canvas.height / 2 - 30,
        60,
        60
    );
    // 恢复之前的绘图状态
    ctx.restore();
}

function drawSolarSystem() {
    drawBackground();
    drawSun();
    drawPlanets(angle);
    angle += 0.01;
    requestAnimationFrame(drawSolarSystem);
}

// Wait for all images to load before starting the animation
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
])
    .then(() => {
        drawSolarSystem();
    })
    .catch((error) => console.error("Error loading images:", error));
});


// 移除自动跳转功能，保持在当前页面

