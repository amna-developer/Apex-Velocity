   const CONFIG = {
            modes: {
                // Stage 1: Coastal Cruise Environment & Street Obstacles
                basic: {
                    targetDistance: 1000,
                    speed: 7, 
                    bgColors: { asphalt: '#334155', lines: '#ffffff', shoulder: '#0d9488' }, // Dark slate asphalt, turquoise coast shoulder
                    obstacleTypes: ['oilSpill', 'trafficCone'],
                    spawnInterval: 110
                },
                // Stage 2: Arid Hot Desert Road & Heavy Roadblocks
                intermediate: {
                    targetDistance: 1500,
                    speed: 7, // Kept stable to prevent unplayable speed spikes
                    bgColors: { asphalt: '#1e293b', lines: '#f59e0b', shoulder: '#ea580c' }, // Deep blue road, blazing desert orange shoulder
                    obstacleTypes: ['barricade', 'tumbleweed'],
                    spawnInterval: 90
                },
                // Stage 3: Midnight Neon Cyber Grid & Plasma Threats
                advance: {
                    targetDistance: 2000,
                    speed: 7, 
                    bgColors: { asphalt: '#0f172a', lines: '#ec4899', shoulder: '#1e1b4b' }, // Midnight ink road, neon pink dividing lines, deep purple backdrop
                    obstacleTypes: ['plasmaBarrier', 'cyberMine'],
                    spawnInterval: 75
                }
            },
            cars: {
                ferrari: { type: 'ferrari', color: '#dc2626', turnSpeed: 6.5, width: 44, height: 78 },
                bmw: { type: 'bmw', color: '#1d4ed8', turnSpeed: 5.2, width: 44, height: 76 },
                porsche: { type: 'porsche', color: '#eab308', turnSpeed: 6.0, width: 44, height: 74 },
                f1: { type: 'f1', color: '#059669', turnSpeed: 7.8, width: 48, height: 84 }
            }
        };

        const state = {
            currentMode: 'basic',
            currentCar: 'ferrari',
            gameActive: false,
            distanceTraveled: 0,
            playerX: 0, 
            playerY: 0,
            obstacles: [],
            particles: [],
            keys: { Left: false, Right: false },
            animationFrameId: null,
            environmentStep: 0
        };

        const canvas = document.getElementById('gameCanvas');
        const ctx = canvas.getContext('2d');
        const mainMenu = document.getElementById('mainMenu');
        const screenOverlay = document.getElementById('screenOverlay');
        const overlayTitle = document.getElementById('overlayTitle');
        const overlayDesc = document.getElementById('overlayDesc');
        const hud = document.getElementById('hud');
        const mobileControls = document.getElementById('mobileControls');
        const hudDistance = document.getElementById('hudDistance');
        const hudTarget = document.getElementById('hudTarget');
        const hudSpeed = document.getElementById('hudSpeed');

        function resizeCanvas() {
            const container = document.getElementById('gameContainer');
            canvas.width = container.clientWidth;
            canvas.height = container.clientHeight;
            state.playerY = canvas.height - 150;
        }
        window.addEventListener('resize', resizeCanvas);
        resizeCanvas();

        document.querySelectorAll('.car-btn').forEach(button => {
            button.addEventListener('click', (e) => {
                e.preventDefault();
                document.querySelectorAll('.car-btn').forEach(b => b.classList.remove('active'));
                button.classList.add('active');
                state.currentCar = button.getAttribute('data-car');
            });
        });

        document.querySelectorAll('.mode-btn').forEach(button => {
            button.addEventListener('click', (e) => {
                e.preventDefault();
                document.querySelectorAll('.mode-btn').forEach(b => b.classList.remove('active'));
                button.classList.add('active');
                state.currentMode = button.getAttribute('data-mode');
            });
        });

        document.getElementById('startBtn').addEventListener('click', (e) => {
            e.preventDefault();
            startGame();
        });

        document.getElementById('restartBtn').addEventListener('click', (e) => {
            e.preventDefault();
            screenOverlay.classList.add('hidden');
            mainMenu.classList.remove('hidden');
        });

        window.addEventListener('keydown', (e) => {
            if (e.key === 'ArrowLeft' || e.key === 'a' || e.key === 'A') state.keys.Left = true;
            if (e.key === 'ArrowRight' || e.key === 'd' || e.key === 'D') state.keys.Right = true;
        });

        window.addEventListener('keyup', (e) => {
            if (e.key === 'ArrowLeft' || e.key === 'a' || e.key === 'A') state.keys.Left = false;
            if (e.key === 'ArrowRight' || e.key === 'd' || e.key === 'D') state.keys.Right = false;
        });

        const leftBtn = document.getElementById('leftBtn');
        const rightBtn = document.getElementById('rightBtn');

        leftBtn.addEventListener('touchstart', (e) => { e.preventDefault(); state.keys.Left = true; }, {passive: false});
        leftBtn.addEventListener('touchend', (e) => { e.preventDefault(); state.keys.Left = false; }, {passive: false});
        rightBtn.addEventListener('touchstart', (e) => { e.preventDefault(); state.keys.Right = true; }, {passive: false});
        rightBtn.addEventListener('touchend', (e) => { e.preventDefault(); state.keys.Right = false; }, {passive: false});

        function startGame() {
            mainMenu.classList.add('hidden');
            hud.classList.remove('hidden');
            
            if (window.innerWidth < 768 || 'ontouchstart' in window) {
                mobileControls.classList.remove('hidden');
            }
            
            state.gameActive = true;
            state.distanceTraveled = 0;
            state.playerX = canvas.width / 2;
            state.obstacles = [];
            state.particles = [];
            state.environmentStep = 0;

            const activeModeCfg = CONFIG.modes[state.currentMode];
            hudTarget.textContent = activeModeCfg.targetDistance;

            if (state.animationFrameId) cancelAnimationFrame(state.animationFrameId);
            state.animationFrameId = requestAnimationFrame(gameLoop);
        }

        function gameLoop() {
            if (!state.gameActive) return;
            updateGame();
            renderGame();
            state.animationFrameId = requestAnimationFrame(gameLoop);
        }

        function updateGame() {
            const modeConfig = CONFIG.modes[state.currentMode];
            const carConfig = CONFIG.cars[state.currentCar];

            state.distanceTraveled += modeConfig.speed * 0.06;
            state.environmentStep = (state.environmentStep + modeConfig.speed) % 100;
            
            hudDistance.textContent = Math.floor(state.distanceTraveled);
            hudSpeed.textContent = Math.floor(modeConfig.speed * 26);

            const roadWidth = canvas.width * 0.75;
            const roadLeftBoundary = (canvas.width - roadWidth) / 2 + (carConfig.width / 2);
            const roadRightBoundary = (canvas.width + roadWidth) / 2 - (carConfig.width / 2);

            if (state.keys.Left) state.playerX -= carConfig.turnSpeed;
            if (state.keys.Right) state.playerX += carConfig.turnSpeed;

            if (state.playerX < roadLeftBoundary) state.playerX = roadLeftBoundary;
            if (state.playerX > roadRightBoundary) state.playerX = roadRightBoundary;

            if (state.distanceTraveled >= modeConfig.targetDistance) {
                endGame(true);
                return;
            }

            // Controls dynamic hurdle creation
            if (Math.random() * 100 < 3.0) {
                if (state.obstacles.length === 0 || (canvas.height - state.obstacles[state.obstacles.length - 1].y) > modeConfig.spawnInterval) {
                    spawnObstacle(modeConfig.obstacleTypes);
                }
            }

            for (let i = state.obstacles.length - 1; i >= 0; i--) {
                let obs = state.obstacles[i];
                obs.y += modeConfig.speed;

                // Unique code physics for moving obstacles (Tumbleweed tumble pathing)
                if (obs.type === 'tumbleweed') {
                    obs.x += obs.vx;
                    // Bounce off boundaries of asphalt grid lane
                    const roadLeft = (canvas.width - roadWidth) / 2;
                    if (obs.x < roadLeft + 15 || obs.x > roadLeft + roadWidth - 15) {
                        obs.vx *= -1;
                    }
                }

                const pW = carConfig.width;
                const pH = carConfig.height;
                
                if (
                    state.playerX - pW/2 < obs.x + obs.w/2 &&
                    state.playerX + pW/2 > obs.x - obs.w/2 &&
                    state.playerY - pH/2 < obs.y + obs.h/2 &&
                    state.playerY + pH/2 > obs.y - obs.h/2
                ) {
                    createExplosion(state.playerX, state.playerY);
                    endGame(false);
                    return;
                }

                if (obs.y > canvas.height + 50) {
                    state.obstacles.splice(i, 1);
                }
            }

            for (let i = state.particles.length - 1; i >= 0; i--) {
                let p = state.particles[i];
                p.x += p.vx; p.y += p.vy; p.alpha -= 0.025;
                if (p.alpha <= 0) state.particles.splice(i, 1);
            }
        }

        function drawSelectedCar(gl, car) {
            const w = car.width;
            const h = car.height;

            if (car.type !== 'f1') {
                gl.fillStyle = '#111827';
                gl.fillRect(-w/2 - 2, -h/2 + 12, 5, 14);
                gl.fillRect(w/2 - 3, -h/2 + 12, 5, 14);
                gl.fillRect(-w/2 - 2, h/2 - 24, 5, 16);
                gl.fillRect(w/2 - 3, h/2 - 24, 5, 16);
            }

            switch(car.type) {
                case 'ferrari':
                    gl.fillStyle = car.color;
                    gl.beginPath();
                    gl.moveTo(-w/2, h/2 - 4);
                    gl.quadraticCurveTo(-w/2, -h/2, 0, -h/2);
                    gl.quadraticCurveTo(w/2, -h/2, w/2, h/2 - 4);
                    gl.closePath();
                    gl.fill();

                    gl.fillStyle = '#030712';
                    gl.beginPath();
                    gl.roundRect(-w/3, -h/6, (w/3)*2, h/4, [8, 8, 2, 2]);
                    gl.fill();

                    gl.fillStyle = '#111';
                    gl.fillRect(-w/2, h/2 - 6, 8, 4);
                    gl.fillRect(w/2 - 8, h/2 - 6, 8, 4);
                    break;

                case 'bmw':
                    gl.fillStyle = car.color;
                    gl.beginPath();
                    gl.roundRect(-w/2, -h/2, w, h, [6, 6, 4, 4]);
                    gl.fill();

                    gl.fillStyle = '#cbd5e1';
                    gl.fillRect(-w/5, -h/2, 3, h/2);
                    gl.fillRect(-w/5 + 6, -h/2, 3, h/2);

                    gl.fillStyle = '#0f172a';
                    gl.fillRect(-w/2.8, -h/6, (w/2.8)*2, h/4.5);

                    gl.fillStyle = '#000000';
                    gl.fillRect(-w/2 - 2, h/2 - 8, w + 4, 5);
                    break;

                case 'porsche':
                    gl.fillStyle = car.color;
                    gl.beginPath();
                    gl.moveTo(-w/2.4, -h/2);
                    gl.lineTo(w/2.4, -h/2);
                    gl.lineTo(w/2.2, 0);
                    gl.quadraticCurveTo(w/2, h/3, w/2, h/2);
                    gl.lineTo(-w/2, h/2);
                    gl.quadraticCurveTo(-w/2, h/3, -w/2.2, 0);
                    gl.closePath();
                    gl.fill();

                    gl.fillStyle = '#1e293b';
                    gl.beginPath();
                    gl.ellipse(0, -h/12, w/3, h/6, 0, 0, Math.PI * 2);
                    gl.fill();

                    gl.fillStyle = '#111';
                    gl.beginPath();
                    gl.roundRect(-w/2 + 2, h/2 - 10, w - 4, 7, [2]);
                    gl.fill();
                    break;

                case 'f1':
                    gl.fillStyle = car.color;
                    gl.fillRect(-w/6, -h/2 + 10, w/3, h - 20);
                    
                    gl.beginPath();
                    gl.roundRect(-w/3, -h/8, (w/3)*2, h/2.5, [12]);
                    gl.fill();

                    gl.fillStyle = '#111827';
                    gl.fillRect(-w/2, -h/2 + 10, w, 6);

                    gl.strokeStyle = '#374151';
                    gl.lineWidth = 3;
                    gl.beginPath();
                    gl.moveTo(-w/2, -h/3); gl.lineTo(w/2, -h/3);
                    gl.moveTo(-w/2, h/3); gl.lineTo(w/2, h/3);
                    gl.stroke();

                    gl.fillStyle = '#000000';
                    gl.fillRect(-w/2 - 3, -h/3 - 8, 8, 18);
                    gl.fillRect(w/2 - 5, -h/3 - 8, 8, 18);
                    gl.fillRect(-w/2 - 5, h/3 - 10, 10, 22);
                    gl.fillRect(w/2 - 5, h/3 - 10, 10, 22);

                    gl.strokeStyle = '#ffffff';
                    gl.lineWidth = 2;
                    gl.beginPath(); gl.arc(0, -h/20, w/8, 0, Math.PI, true); gl.stroke();

                    gl.fillStyle = '#111827';
                    gl.fillRect(-w/2 + 2, h/2 - 14, w - 4, 8);
                    break;
            }

            gl.fillStyle = Math.random() > 0.5 ? '#ff4400' : '#ff9900';
            gl.fillRect(-4, h/2, 8, 4 + Math.random()*6);
        }

        function renderGame() {
            const colors = CONFIG.modes[state.currentMode].bgColors;
            const car = CONFIG.cars[state.currentCar];

            ctx.fillStyle = '#0b0f19';
            ctx.fillRect(0, 0, canvas.width, canvas.height);

            const roadWidth = canvas.width * 0.75;
            const roadLeft = (canvas.width - roadWidth) / 2;

            // DRAW LEVEL ENVIRONMENT BACKGROUND (SHOULDERS)
            ctx.fillStyle = colors.shoulder;
            ctx.fillRect(0, 0, canvas.width, canvas.height);

            // SPECIAL IMMERSIVE ENVIRONMENT BACKGROUND EFFECTS
            if (state.currentMode === 'basic') {
                // Ocean shore sparkle lines
                ctx.fillStyle = 'rgba(255, 255, 255, 0.1)';
                for (let i = 0; i < canvas.height; i += 80) {
                    let offset = (state.environmentStep * 2 + i) % canvas.height;
                    ctx.fillRect(15, offset, 4, 30);
                    ctx.fillRect(canvas.width - 20, (canvas.height - offset), 4, 30);
                }
            } else if (state.currentMode === 'intermediate') {
                // Desert sand dunes highlights
                ctx.fillStyle = '#c2410c';
                for (let i = 0; i < canvas.height; i += 140) {
                    let offset = (state.environmentStep * 0.5 + i) % canvas.height;
                    ctx.fillRect(5, offset, roadLeft - 15, 3);
                    ctx.fillRect(roadLeft + roadWidth + 10, (offset + 60) % canvas.height, roadLeft - 15, 3);
                }
            } else if (state.currentMode === 'advance') {
                // Cyberpunk processing power grid gridlines
                ctx.strokeStyle = 'rgba(99, 102, 241, 0.15)';
                ctx.lineWidth = 1;
                for (let x = 0; x < canvas.width; x += 30) {
                    ctx.beginPath(); ctx.moveTo(x, 0); ctx.lineTo(x, canvas.height); ctx.stroke();
                }
            }

            // DRAW THE CENTRAL TRACK
            ctx.fillStyle = colors.asphalt;
            ctx.fillRect(roadLeft, 0, roadWidth, canvas.height);

            // TRACK DIVIDING TRACK LINES
            ctx.strokeStyle = colors.lines;
            ctx.lineWidth = 4;
            ctx.setLineDash([30, 40]);
            ctx.lineDashOffset = -state.environmentStep * 1.5;

            ctx.beginPath();
            ctx.moveTo(roadLeft + roadWidth / 3, 0); ctx.lineTo(roadLeft + roadWidth / 3, canvas.height);
            ctx.moveTo(roadLeft + (roadWidth / 3) * 2, 0); ctx.lineTo(roadLeft + (roadWidth / 3) * 2, canvas.height);
            ctx.stroke();
            ctx.setLineDash([]);

            // RENDER ACTIVE MODE HAZARDS
            state.obstacles.forEach(obs => {
                drawObstacleItem(ctx, obs);
            });

            ctx.save();
            ctx.translate(state.playerX, state.playerY);
            drawSelectedCar(ctx, car);
            ctx.restore();

            state.particles.forEach(p => {
                ctx.save();
                ctx.globalAlpha = p.alpha;
                ctx.fillStyle = p.color;
                ctx.beginPath();
                ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
                ctx.fill();
                ctx.restore();
            });
        }

        function spawnObstacle(types) {
            const type = types[Math.floor(Math.random() * types.length)];
            const roadWidth = canvas.width * 0.75;
            const roadLeft = (canvas.width - roadWidth) / 2;
            
            const targetLane = Math.floor(Math.random() * 3);
            const laneCenter = roadLeft + (roadWidth / 6) + targetLane * (roadWidth / 3);

            let obstacleDetails = { x: laneCenter, y: -50, type: type, w: 34, h: 34, vx: 0 };

            // Dynamic Custom Physics Variables Injection
            if (type === 'barricade') { obstacleDetails.w = 56; obstacleDetails.h = 24; }
            if (type === 'plasmaBarrier') { obstacleDetails.w = 68; obstacleDetails.h = 16; }
            if (type === 'tumbleweed') {
                obstacleDetails.w = 30;
                obstacleDetails.h = 30;
                obstacleDetails.vx = Math.random() > 0.5 ? 1.8 : -1.8; // Lateral tracking vector velocity
            }

            state.obstacles.push(obstacleDetails);
        }

        // --- EXCLUSIVE DESIGN PATTERNS FOR MODE HAZARDS ---
        function drawObstacleItem(gl, obj) {
            gl.save();
            gl.translate(obj.x, obj.y);

            switch(obj.type) {
                // --- BASIC STAGE STREET HAZARDS ---
                case 'trafficCone':
                    gl.fillStyle = '#f97316';
                    gl.beginPath();
                    gl.moveTo(0, -obj.h/2);
                    gl.lineTo(obj.w/2, obj.h/2);
                    gl.lineTo(-obj.w/2, obj.h/2);
                    gl.closePath();
                    gl.fill();
                    gl.fillStyle = '#ffffff';
                    gl.fillRect(-obj.w/4, -2, obj.w/2, 5);
                    break;

                case 'oilSpill':
                    gl.fillStyle = 'rgba(15, 23, 42, 0.9)';
                    gl.beginPath();
                    gl.ellipse(0, 0, obj.w/1.1, obj.h/2, 0, 0, Math.PI * 2);
                    gl.fill();
                    break;

                // --- INTERMEDIATE DESERT ROADBLOCK HAZARDS ---
                case 'barricade':
                    // Industrial construction safety roadblock striping
                    gl.fillStyle = '#eab308';
                    gl.fillRect(-obj.w/2, -obj.h/2, obj.w, obj.h);
                    gl.fillStyle = '#000000';
                    // Draw heavy vector hazard diagonal stripes
                    gl.lineWidth = 4;
                    for (let offset = -obj.w/2; offset < obj.w/2; offset += 12) {
                        gl.beginPath();
                        gl.moveTo(offset, -obj.h/2);
                        gl.lineTo(offset + 8, obj.h/2);
                        gl.stroke();
                    }
                    break;

                case 'tumbleweed':
                    // Tangled dynamic plant skeletal mesh pattern
                    gl.strokeStyle = '#7c2d12';
                    gl.lineWidth = 2;
                    let rotationalTick = (Date.now() / 120);
                    gl.rotate(rotationalTick);
                    gl.beginPath();
                    gl.arc(0, 0, obj.w/2, 0, Math.PI * 2);
                    gl.stroke();
                    // Inner tangle lines
                    gl.beginPath();
                    gl.moveTo(-obj.w/2, 0); gl.lineTo(obj.w/2, 0);
                    gl.moveTo(0, -obj.h/2); gl.lineTo(0, obj.h/2);
                    gl.stroke();
                    break;

                // --- ADVANCED FUTURISTIC GRID HAZARDS ---
                case 'plasmaBarrier':
                    // Energetic glowing laser barrier fence
                    let flashFactor = Math.random() > 0.5 ? '#f43f5e' : '#ec4899';
                    gl.fillStyle = flashFactor;
                    gl.shadowColor = flashFactor;
                    gl.shadowBlur = 15;
                    gl.fillRect(-obj.w/2, -obj.h/2, obj.w, obj.h);
                    // Light beam generator caps
                    gl.fillStyle = '#64748b';
                    gl.fillRect(-obj.w/2 - 2, -obj.h/2 - 2, 4, obj.h + 4);
                    gl.fillRect(obj.w/2 - 2, -obj.h/2 - 2, 4, obj.h + 4);
                    break;

                case 'cyberMine':
                    // Proximity ticking proximity bomb mine unit
                    gl.fillStyle = '#ef4444';
                    gl.beginPath(); gl.arc(0, 0, obj.w/3, 0, Math.PI * 2); gl.fill();
                    // Pulse aura wave circumference
                    gl.strokeStyle = 'rgba(239, 68, 68, 0.6)';
                    gl.lineWidth = 2;
                    let radiusPulse = (obj.w/3) * (Math.sin(Date.now() / 90) + 1.6);
                    gl.beginPath(); gl.arc(0, 0, radiusPulse, 0, Math.PI * 2); gl.stroke();
                    break;
            }
            gl.restore();
        }

        function createExplosion(x, y) {
            for (let i = 0; i < 30; i++) {
                state.particles.push({
                    x: x, y: y,
                    vx: (Math.random() - 0.5) * 8,
                    vy: (Math.random() - 0.5) * 8,
                    size: Math.random() * 4 + 2,
                    alpha: 1,
                    color: Math.random() > 0.4 ? '#ef4444' : '#f97316'
                });
            }
        }

        function endGame(isVictory) {
            state.gameActive = false;
            if (state.animationFrameId) cancelAnimationFrame(state.animationFrameId);

            hud.classList.add('hidden');
            mobileControls.classList.add('hidden');
            screenOverlay.classList.remove('hidden');

            if (isVictory) {
                overlayTitle.textContent = "VICTORY!";
                overlayTitle.className = "text-3xl font-black tracking-widest text-green-500 mb-2";
                overlayDesc.textContent = `Excellent driving! You finished the entire ${state.currentMode.toUpperCase()} track safely!`;
            } else {
                overlayTitle.textContent = "GAME OVER";
                overlayTitle.className = "text-3xl font-black tracking-widest text-red-500 mb-2";
                overlayDesc.textContent = "Wrecked! You hit a major road hazard.";
            }
        }
   