import kaplay from "kaplay";

const GAME_WIDTH = 1280; // Fixed width
const GAME_HEIGHT = 720; // Fixed height

const k = kaplay({
    width: GAME_WIDTH,
    height: GAME_HEIGHT,
    scaleToFit: false, // No scaling; keep the fixed size
});

// Load components
k.loadSprite("sooner", "../public/graphics/soon.png");
k.loadSprite("customBox", "../public/graphics/box.png");
k.loadSprite("background", "../public/graphics/background.png");
k.loadSprite("pill", "../public/graphics/pill.png"); // Load pill sprite
k.loadFont("mania", "../public/fonts/mania.ttf");
k.loadSound("racing", "../public/sounds/racing.mp3");
k.loadSound("destroy", "../public/sounds/destroy.mp3");
k.loadSound("jump", "../public/sounds/jump.mp3");
k.loadSound("collect", "../public/sounds/collect.mp3"); // Load collect sound
let music; // Define music variable to keep track of the music

function playRacingMusic() {
    if (music) {
        music.stop(); // Stop the current music if it is playing
    }
    music = k.play("racing", {
        loop: true,
        volume: 0.5 // Adjust the volume as needed
    });
}

let counter = 0; // Define counter globally
let highScore = localStorage.getItem("highScore") || 0; // Load high score from localStorage

// Function to center the canvas
function centerCanvas() {
    const { innerWidth, innerHeight } = window;
    const offsetX = (innerWidth - GAME_WIDTH) / 2;
    const offsetY = (innerHeight - GAME_HEIGHT) / 2;
    k.canvas.style.position = "absolute";
    k.canvas.style.left = `${offsetX}px`;
    k.canvas.style.top = `${offsetY}px`;
}

// Center the canvas initially and on window resize
window.addEventListener('resize', centerCanvas);
centerCanvas(); // Center the canvas initially

k.scene("game", () => {
    playRacingMusic(); // Start the music when the game scene is loaded

    k.setGravity(2000);

    // Add background sprites for looping
    const bgPieceWidth = 1280;
    const bgPieces = [
        k.add([k.sprite("background"), k.pos(0, 0), k.scale(1), k.layer("background")]),
        k.add([k.sprite("background"), k.pos(bgPieceWidth, 0), k.scale(1), k.layer("background")])
    ];

    const player = k.add([
        k.sprite("sooner"),
        k.pos(k.center()),
        k.area(),
        k.body(),
        k.offscreen()
    ]);

    // Keyboard control for jumping
    k.onKeyPress("space", () => {
        if (player.isGrounded()) {
            player.jump(700);
            k.play("jump", {
                volume: 0.2 // Adjust the volume as needed (0.0 to 1.0)
            });
        }
    });

    // Game Over when player falls offscreen
    player.onExitScreen(() => {
        k.play("destroy");
        k.go("gameover");
    });

    // Ground
    k.add([
        k.rect(k.width(), 300),
        k.pos(0, 500),
        k.area(),
        k.outline(3),
        k.body({ isStatic: true })
    ]);

    const counterUI = k.add([
        k.text(`SCORE: ${counter} | HIGH SCORE: ${highScore}`, { size: 32, font: "mania", align: "center" }),
        k.pos(k.center().x, 50),
        k.anchor("center"), // Center-align the text
        k.fixed()
    ]);

    let obstacles = []; // Array to store obstacles
    let pills = []; // Array to store pills

    // Spawn obstacles every second
    k.loop(1, () => {
        const speeds = [300, 500, 800];
        const currentSpeed = speeds[Math.floor(Math.random() * speeds.length)];

        const obstacle = k.add([
            k.sprite("customBox"),
            k.pos(1000, 500),
            k.area(),
            k.body(),
            k.outline(3),
            k.move(k.vec2(-1, 0), currentSpeed),
            k.scale(0.1),
            { passed: false } // Track if player has passed this obstacle
        ]);

        obstacles.push(obstacle);
    });

    // Spawn pills randomly with a 50% chance
    k.loop(5, () => {
        if (Math.random() < 0.5) { // 50% chance to spawn a pill
            const pill = k.add([
                k.sprite("pill"),
                k.pos(1000, Math.random() * 200 + 200), // Random height (200-400)
                k.area(),
                k.body({ isStatic: true }), // Make the pill static so it doesn't fall
                k.outline(3),
                k.move(k.vec2(-1, 0), 200), // Scroll from right to left
                k.scale(1.0), // Set scale to 1.0 for better visibility
                "floating" // Tag for floating behavior
            ]);

            // Add floating animation to the pill
            pill.onUpdate(() => {
                pill.pos.y += Math.sin(k.time() * 5) * 0.5; // Oscillate up and down
            });

            pills.push(pill);
        }
    });

    // Background scrolling logic
    k.onUpdate(() => {
        bgPieces.forEach(bg => bg.move(-100, 0));

        if (bgPieces[0].pos.x < -bgPieceWidth) {
            bgPieces[0].moveTo(bgPieces[1].pos.x + bgPieceWidth, 0);
            [bgPieces[0], bgPieces[1]] = [bgPieces[1], bgPieces[0]];
        }

        // Check for collisions between player and obstacles
        obstacles.forEach((obstacle) => {
            const playerPassedObstacle = player.pos.x + player.width / 2 > obstacle.pos.x + obstacle.width * obstacle.scale.x;

            if (!obstacle.passed && playerPassedObstacle) {
                obstacle.passed = true; // Mark as passed
                counter++; // Increase score
                if (counter > highScore) {
                    highScore = counter; // Update high score
                    localStorage.setItem("highScore", highScore); // Save high score to localStorage
                }
                counterUI.text = `SCORE: ${counter} | HIGH SCORE: ${highScore}`; // Update score display
            }
        });

        // Check for collisions between player and pills
        pills.forEach((pill, index) => {
            if (player.isColliding(pill)) {
                counter += 10; // Increase score by 10
                if (counter > highScore) {
                    highScore = counter; // Update high score
                    localStorage.setItem("highScore", highScore); // Save high score to localStorage
                }
                counterUI.text = `SCORE: ${counter} | HIGH SCORE: ${highScore}`; // Update score display
                pill.destroy(); // Remove the pill from the game
                pills.splice(index, 1); // Remove the pill from the array
                k.play("collect", { volume: 1 }); // Play collect sound
            }
        });

        // Remove off-screen obstacles and pills to optimize performance
        obstacles = obstacles.filter(obstacle => obstacle.pos.x > -50);
        pills = pills.filter(pill => pill.pos.x > -50);
    });
});

// Game Over Scene
k.scene("gameover", () => {
    // Add the same background to the gameover scene
    const bgPieceWidth = 1280;
    const bgPieces = [
        k.add([k.sprite("background"), k.pos(0, 0), k.scale(1), k.layer("background")]),
        k.add([k.sprite("background"), k.pos(bgPieceWidth, 0), k.scale(1), k.layer("background")])
    ];

    // Update high score if the current score is higher
    if (counter > highScore) {
        highScore = counter;
        localStorage.setItem("highScore", highScore); // Save high score to localStorage
    }

    // Display final score and high score
    k.add([
        k.text(`Maybe Next Time Sooner! \nFinal Score: ${counter} \nHigh Score: ${highScore} \nPress R to restart`, 
        { size: 32, font: "mania", align: "center" }),
        k.pos(k.center()),
        k.anchor("center") // Correct way to center text
    ]);

    // Restart game when the "R" key (in any language or layout) is pressed
    k.onKeyPress((key) => {
        if (key.toLowerCase() === "r") {
            counter = 0; // Reset counter when restarting the game
            k.go("game"); // Restart game
        }
    });

    // Background scrolling logic for game over scene
    k.onUpdate(() => {
        bgPieces.forEach(bg => bg.move(-100, 0));

        if (bgPieces[0].pos.x < -bgPieceWidth) {
            bgPieces[0].moveTo(bgPieces[1].pos.x + bgPieceWidth, 0);
            [bgPieces[0], bgPieces[1]] = [bgPieces[1], bgPieces[0]];
        }
    });
});

// Start scene
k.scene("start", () => {
    const bgPieceWidth = 1280;
    const bgPieces = [
        k.add([k.sprite("background"), k.pos(0, 0), k.scale(1), k.layer("background")]),
        k.add([k.sprite("background"), k.pos(bgPieceWidth, 0), k.scale(1), k.layer("background")])
    ];

    // Display start message
    k.add([
        k.text("Press R to Start", { size: 48, font: "mania", align: "center" }),
        k.pos(k.center()),
        k.anchor("center") // Center the text
    ]);

    // Display instructions
    k.add([
        k.text('Press the "Spacebar" to jump over the boxes \nCollect "The Red Pill" to get extra points \nIf you get pushed offscreen, you lose the game', 
        { size: 32, font: "mania", align: "center" }),
        k.pos(k.center().x, k.center().y + 100), // Position below the start message
        k.anchor("center")
    ]);

    // Start game when the "R" key is pressed
    k.onKeyPress((key) => {
        if (key.toLowerCase() === "r") {
            k.go("game"); // Go to game scene
        }
    });

    // Background scrolling logic for start scene
    k.onUpdate(() => {
        bgPieces.forEach(bg => bg.move(-100, 0));

        if (bgPieces[0].pos.x < -bgPieceWidth) {
            bgPieces[0].moveTo(bgPieces[1].pos.x + bgPieceWidth, 0);
            [bgPieces[0], bgPieces[1]] = [bgPieces[1], bgPieces[0]];
        }
    });
});

// Start game initially
k.go("start"); // Initially go to start scene instead of game scene
