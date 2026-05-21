import { useEffect, useRef } from "react";

const WIDTH = 960;
const HEIGHT = 540;
const CONTROL_KEYS = new Set([
  "ArrowUp",
  "ArrowDown",
  "ArrowLeft",
  "ArrowRight",
  "Digit1",
  "Digit2",
  "Digit3",
  "Digit4",
  "Enter",
  "KeyA",
  "KeyD",
  "KeyR",
  "KeyS",
  "KeyW",
  "Space"
]);

function clamp(value, min, max) {
  return Math.min(max, Math.max(min, value));
}

function randomBetween(min, max) {
  return min + Math.random() * (max - min);
}

function isTypingTarget(target) {
  return target?.closest?.("input, textarea, select, button, [contenteditable='true']");
}

function makeInput() {
  return {
    x: 0,
    y: 0,
    action: false,
    actionPressed: false,
    restartPressed: false,
    numberPressed: null,
    pointer: { active: false, pressed: false, released: false, x: 0, y: 0 },
    keys: new Set()
  };
}

function updateKeyboardInput(input) {
  const left = input.keys.has("ArrowLeft") || input.keys.has("KeyA");
  const right = input.keys.has("ArrowRight") || input.keys.has("KeyD");
  const up = input.keys.has("ArrowUp") || input.keys.has("KeyW");
  const down = input.keys.has("ArrowDown") || input.keys.has("KeyS");

  input.x = Number(right) - Number(left);
  input.y = Number(down) - Number(up);
  input.action = input.keys.has("Space") || input.keys.has("Enter") || input.pointer.active;
}

function applyGamepad(input) {
  const [pad] = navigator.getGamepads ? navigator.getGamepads().filter(Boolean) : [];
  if (!pad) return;

  const axisX = Math.abs(pad.axes[0] ?? 0) > 0.18 ? pad.axes[0] : 0;
  const axisY = Math.abs(pad.axes[1] ?? 0) > 0.18 ? pad.axes[1] : 0;
  const dpadX = Number(pad.buttons[15]?.pressed) - Number(pad.buttons[14]?.pressed);
  const dpadY = Number(pad.buttons[13]?.pressed) - Number(pad.buttons[12]?.pressed);

  input.x = dpadX || axisX || input.x;
  input.y = dpadY || axisY || input.y;
  input.action = Boolean(pad.buttons[0]?.pressed || pad.buttons[1]?.pressed || input.action);
  input.actionPressed = Boolean(pad.buttons[0]?.pressed || input.actionPressed);
  input.restartPressed = Boolean(pad.buttons[9]?.pressed || input.restartPressed);
}

function makeGamePackage(gamePackage) {
  const colors = gamePackage.visuals?.colors ?? ["#35e8ff", "#ff3df2", "#ffd166"];
  const tuning = gamePackage.gameplay?.tuning ?? {};
  return { colors, tuning, score: 0, message: "", over: false };
}

function drawBackground(ctx, colors) {
  ctx.fillStyle = "#070a12";
  ctx.fillRect(0, 0, WIDTH, HEIGHT);

  ctx.strokeStyle = `${colors[0]}55`;
  ctx.lineWidth = 1;
  for (let x = 0; x <= WIDTH; x += 48) {
    ctx.beginPath();
    ctx.moveTo(x, 112);
    ctx.lineTo(x - 180, HEIGHT);
    ctx.stroke();
  }
  for (let y = 112; y <= HEIGHT; y += 42) {
    ctx.beginPath();
    ctx.moveTo(0, y);
    ctx.lineTo(WIDTH, y);
    ctx.stroke();
  }
}

function drawText(ctx, text, x, y, size = 22, color = "#eef6ff", align = "left") {
  ctx.fillStyle = color;
  ctx.font = `800 ${size}px Inter, system-ui, sans-serif`;
  ctx.textAlign = align;
  ctx.textBaseline = "middle";
  ctx.fillText(text, x, y);
}

function drawButton(ctx, rect, label, active, colors) {
  ctx.fillStyle = active ? `${colors[0]}33` : "rgba(255,255,255,0.06)";
  ctx.strokeStyle = active ? colors[0] : "rgba(255,255,255,0.18)";
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.roundRect(rect.x, rect.y, rect.w, rect.h, 8);
  ctx.fill();
  ctx.stroke();
  drawText(ctx, label, rect.x + rect.w / 2, rect.y + rect.h / 2, 16, "#eef6ff", "center");
}

function contains(rect, point) {
  return point.x >= rect.x && point.x <= rect.x + rect.w && point.y >= rect.y && point.y <= rect.y + rect.h;
}

function drawGameHud(ctx, game, label) {
  drawText(ctx, label, 28, 72, 18, "#91a4b8");
  drawText(ctx, `Score ${Math.floor(game.score)}`, 28, 102, 28);
  if (game.message) drawText(ctx, game.message, WIDTH / 2, 102, 20, "#ffd166", "center");
  if (game.over) {
    ctx.fillStyle = "rgba(7,10,18,0.72)";
    ctx.fillRect(0, 0, WIDTH, HEIGHT);
    drawText(ctx, "Game Over", WIDTH / 2, HEIGHT / 2 - 24, 42, "#eef6ff", "center");
    drawText(ctx, "Press R or Space to restart", WIDTH / 2, HEIGHT / 2 + 24, 20, "#91a4b8", "center");
  }
}

function makeFlappy(gamePackage) {
  const game = makeGamePackage(gamePackage);
  const speed = game.tuning.speed ?? 200;
  const gravity = game.tuning.gravity ?? 600;
  const jump = game.tuning.jump ?? -320;
  const gap = game.tuning.gap ?? 150;
  const bird = { x: 170, y: 230, vy: 0, r: 21 };
  const pipes = Array.from({ length: 4 }, (_, index) => ({
    x: WIDTH + index * 250,
    gapY: randomBetween(155, 380),
    passed: false
  }));

  function reset() {
    game.score = 0;
    game.over = false;
    game.message = "";
    bird.y = 230;
    bird.vy = 0;
    pipes.forEach((pipe, index) => {
      pipe.x = WIDTH + index * 250;
      pipe.gapY = randomBetween(155, 380);
      pipe.passed = false;
    });
  }

  return {
    update(dt, input) {
      if (game.over) {
        if (input.restartPressed || input.actionPressed) reset();
        return;
      }
      if (input.actionPressed || input.pointer.pressed) bird.vy = jump;
      bird.vy += gravity * dt;
      bird.y += bird.vy * dt;

      pipes.forEach(pipe => {
        pipe.x -= speed * dt;
        if (pipe.x < -80) {
          pipe.x = WIDTH + 170;
          pipe.gapY = randomBetween(145, 390);
          pipe.passed = false;
        }
        if (!pipe.passed && pipe.x + 58 < bird.x) {
          game.score += 1;
          pipe.passed = true;
        }
        const hitX = bird.x + bird.r > pipe.x && bird.x - bird.r < pipe.x + 58;
        const hitY = bird.y - bird.r < pipe.gapY - gap / 2 || bird.y + bird.r > pipe.gapY + gap / 2;
        if (hitX && hitY) game.over = true;
      });

      if (bird.y < 112 || bird.y > HEIGHT - 24) game.over = true;
    },
    draw(ctx) {
      drawBackground(ctx, game.colors);
      pipes.forEach(pipe => {
        ctx.fillStyle = game.colors[1];
        ctx.fillRect(pipe.x, 112, 58, pipe.gapY - gap / 2 - 112);
        ctx.fillRect(pipe.x, pipe.gapY + gap / 2, 58, HEIGHT - pipe.gapY);
      });
      ctx.fillStyle = game.colors[0];
      ctx.beginPath();
      ctx.arc(bird.x, bird.y, bird.r, 0, Math.PI * 2);
      ctx.fill();
      drawGameHud(ctx, game, "Flappy: tap Space to jump through gates");
    }
  };
}

function makeRunner(gamePackage) {
  const game = makeGamePackage(gamePackage);
  const lanes = game.tuning.lanes ?? 3;
  const laneYs = Array.from({ length: lanes }, (_, index) => 210 + index * 70);
  const runner = { x: 150, lane: Math.floor(lanes / 2), y: 0, jump: 0, vy: 0, lives: 3 };
  const obstacles = Array.from({ length: 4 }, (_, index) => ({ x: WIDTH + index * 230, lane: index % lanes, hit: false }));
  const coins = Array.from({ length: 5 }, (_, index) => ({ x: WIDTH + index * 180 + 100, lane: (index + 1) % lanes, taken: false }));
  let laneCooldown = 0;

  function reset() {
    game.score = 0;
    game.over = false;
    runner.lives = 3;
    runner.lane = Math.floor(lanes / 2);
    obstacles.forEach((obstacle, index) => {
      obstacle.x = WIDTH + index * 230;
      obstacle.lane = Math.floor(Math.random() * lanes);
      obstacle.hit = false;
    });
  }

  function recycle(item, offset = 0) {
    item.x = WIDTH + randomBetween(120, 360) + offset;
    item.lane = Math.floor(Math.random() * lanes);
    item.hit = false;
    item.taken = false;
  }

  return {
    update(dt, input) {
      if (game.over) {
        if (input.restartPressed || input.actionPressed) reset();
        return;
      }
      laneCooldown -= dt;
      if (laneCooldown <= 0 && Math.abs(input.y) > 0.4) {
        runner.lane = clamp(runner.lane + Math.sign(input.y), 0, lanes - 1);
        laneCooldown = 0.18;
      }
      if ((input.actionPressed || input.pointer.pressed) && runner.jump === 0) runner.vy = -520;
      runner.vy += 1120 * dt;
      runner.jump = clamp(runner.jump + runner.vy * dt, -96, 0);
      if (runner.jump === 0) runner.vy = 0;

      const speed = game.tuning.speed ?? 330;
      runner.y = laneYs[runner.lane] + runner.jump;
      obstacles.forEach(obstacle => {
        obstacle.x -= speed * dt;
        if (obstacle.x < -60) recycle(obstacle);
        const hit = Math.abs(obstacle.x - runner.x) < 42 && obstacle.lane === runner.lane && runner.jump > -42 && !obstacle.hit;
        if (hit) {
          obstacle.hit = true;
          runner.lives -= 1;
          game.message = `${runner.lives} lives left`;
          if (runner.lives <= 0) game.over = true;
        }
      });
      coins.forEach(coin => {
        coin.x -= speed * dt;
        if (coin.x < -40) recycle(coin, 280);
        if (!coin.taken && Math.abs(coin.x - runner.x) < 42 && coin.lane === runner.lane) {
          coin.taken = true;
          game.score += 25;
        }
      });
      game.score += dt * 3;
    },
    draw(ctx) {
      drawBackground(ctx, game.colors);
      laneYs.forEach(y => {
        ctx.strokeStyle = "rgba(255,255,255,0.2)";
        ctx.lineWidth = 3;
        ctx.beginPath();
        ctx.moveTo(70, y + 24);
        ctx.lineTo(WIDTH - 70, y + 24);
        ctx.stroke();
      });
      coins.forEach(coin => {
        if (coin.taken) return;
        ctx.fillStyle = game.colors[2];
        ctx.beginPath();
        ctx.arc(coin.x, laneYs[coin.lane], 12, 0, Math.PI * 2);
        ctx.fill();
      });
      obstacles.forEach(obstacle => {
        ctx.fillStyle = obstacle.hit ? "#ff4d6d66" : game.colors[1];
        ctx.fillRect(obstacle.x - 18, laneYs[obstacle.lane] - 32, 36, 58);
      });
      ctx.fillStyle = game.colors[0];
      ctx.fillRect(runner.x - 18, runner.y - 42, 36, 54);
      drawText(ctx, `Lives ${runner.lives}`, WIDTH - 130, 62, 22);
      drawGameHud(ctx, game, "Runner: Up/Down change lane, Space jumps");
    }
  };
}

function makeClicker(gamePackage) {
  const game = makeGamePackage(gamePackage);
  const clickValue = game.tuning.baseClick ?? 1;
  const buttons = [
    { label: "Click +", cost: 25, level: 0, rect: { x: 610, y: 170, w: 220, h: 54 } },
    { label: "Auto", cost: 75, level: 0, rect: { x: 610, y: 245, w: 220, h: 54 } },
    { label: "Factory", cost: 180, level: 0, rect: { x: 610, y: 320, w: 220, h: 54 } }
  ];
  let pulse = 0;

  function buy(button) {
    if (game.score < button.cost) return;
    game.score -= button.cost;
    button.level += 1;
    button.cost = Math.ceil(button.cost * (game.tuning.multiplier ?? 1.24));
  }

  return {
    update(dt, input) {
      const passive = buttons[1].level * 2 + buttons[2].level * 8;
      game.score += passive * dt;
      pulse = Math.max(0, pulse - dt * 4);
      if (input.actionPressed || input.pointer.pressed) {
        const point = input.pointer;
        const button = buttons.find(item => contains(item.rect, point));
        if (button) buy(button);
        else {
          game.score += clickValue + buttons[0].level;
          pulse = 1;
        }
      }
    },
    draw(ctx) {
      drawBackground(ctx, game.colors);
      ctx.fillStyle = game.colors[2];
      ctx.beginPath();
      ctx.arc(310, 275, 90 + pulse * 14, 0, Math.PI * 2);
      ctx.fill();
      drawText(ctx, "TAP", 310, 275, 28, "#061018", "center");
      buttons.forEach(button => drawButton(ctx, button.rect, `${button.label} L${button.level} - ${button.cost}`, game.score >= button.cost, game.colors));
      drawGameHud(ctx, game, "Clicker: click token, buy upgrades, earn passively");
    }
  };
}

function makeMatch3(gamePackage) {
  const game = makeGamePackage(gamePackage);
  const size = Math.min(game.tuning.grid ?? 7, 8);
  const colorCount = Math.min(game.tuning.colors ?? 5, 6);
  const palette = [...game.colors, "#ffffff", "#67ffb4", "#ff4d6d"].slice(0, colorCount);
  const board = Array.from({ length: size }, () => Array.from({ length: size }, () => Math.floor(Math.random() * colorCount)));
  const cell = 46;
  const origin = { x: WIDTH / 2 - (size * cell) / 2, y: 130 };
  let cursor = { row: 0, col: 0 };
  let selected = null;
  let moves = game.tuning.moves ?? 32;
  let moveCooldown = 0;

  function cellAt(point) {
    const col = Math.floor((point.x - origin.x) / cell);
    const row = Math.floor((point.y - origin.y) / cell);
    return row >= 0 && row < size && col >= 0 && col < size ? { row, col } : null;
  }

  function findMatches() {
    const matches = new Set();
    for (let row = 0; row < size; row += 1) {
      let run = 1;
      for (let col = 1; col <= size; col += 1) {
        if (col < size && board[row][col] === board[row][col - 1]) run += 1;
        else {
          if (run >= 3) for (let index = col - run; index < col; index += 1) matches.add(`${row},${index}`);
          run = 1;
        }
      }
    }
    for (let col = 0; col < size; col += 1) {
      let run = 1;
      for (let row = 1; row <= size; row += 1) {
        if (row < size && board[row][col] === board[row - 1][col]) run += 1;
        else {
          if (run >= 3) for (let index = row - run; index < row; index += 1) matches.add(`${index},${col}`);
          run = 1;
        }
      }
    }
    return matches;
  }

  function resolveMatches() {
    let matches = findMatches();
    while (matches.size) {
      game.score += matches.size * 10;
      matches.forEach(key => {
        const [row, col] = key.split(",").map(Number);
        board[row][col] = null;
      });
      for (let col = 0; col < size; col += 1) {
        const column = board.map(row => row[col]).filter(value => value !== null);
        while (column.length < size) column.unshift(Math.floor(Math.random() * colorCount));
        for (let row = 0; row < size; row += 1) board[row][col] = column[row];
      }
      matches = findMatches();
    }
  }

  function choose(tile) {
    if (!tile || moves <= 0) return;
    if (!selected) {
      selected = tile;
      return;
    }
    const distance = Math.abs(tile.row - selected.row) + Math.abs(tile.col - selected.col);
    if (distance === 1) {
      const temp = board[tile.row][tile.col];
      board[tile.row][tile.col] = board[selected.row][selected.col];
      board[selected.row][selected.col] = temp;
      moves -= 1;
      resolveMatches();
    }
    selected = null;
  }

  resolveMatches();

  return {
    update(dt, input) {
      moveCooldown -= dt;
      if (moveCooldown <= 0 && (input.x || input.y)) {
        cursor.col = clamp(cursor.col + Math.sign(input.x), 0, size - 1);
        cursor.row = clamp(cursor.row + Math.sign(input.y), 0, size - 1);
        moveCooldown = 0.14;
      }
      if (input.pointer.pressed) choose(cellAt(input.pointer));
      if (input.actionPressed) choose(cursor);
      game.message = `${moves} moves`;
    },
    draw(ctx) {
      drawBackground(ctx, game.colors);
      for (let row = 0; row < size; row += 1) {
        for (let col = 0; col < size; col += 1) {
          const x = origin.x + col * cell;
          const y = origin.y + row * cell;
          ctx.fillStyle = palette[board[row][col]];
          ctx.beginPath();
          ctx.roundRect(x + 5, y + 5, cell - 10, cell - 10, 9);
          ctx.fill();
        }
      }
      [selected, cursor].filter(Boolean).forEach((tile, index) => {
        ctx.strokeStyle = index === 0 ? "#ffd166" : "#ffffff";
        ctx.lineWidth = 4;
        ctx.strokeRect(origin.x + tile.col * cell + 3, origin.y + tile.row * cell + 3, cell - 6, cell - 6);
      });
      drawGameHud(ctx, game, "Match-3: select adjacent tiles to swap");
    }
  };
}

function makeMemory(gamePackage) {
  const game = makeGamePackage(gamePackage);
  const pairs = Math.min(game.tuning.pairs ?? 8, 10);
  const values = Array.from({ length: pairs }, (_, index) => index).flatMap(value => [value, value]).sort(() => Math.random() - 0.5);
  const cols = 5;
  const cards = values.map((value, index) => ({
    value,
    x: 250 + (index % cols) * 92,
    y: 135 + Math.floor(index / cols) * 92,
    revealed: false,
    matched: false
  }));
  let cursor = 0;
  let open = [];
  let wait = 0;

  function flip(index) {
    const card = cards[index];
    if (!card || card.matched || card.revealed || wait > 0) return;
    card.revealed = true;
    open.push(card);
    if (open.length === 2) {
      if (open[0].value === open[1].value) {
        open.forEach(item => {
          item.matched = true;
        });
        game.score += 50;
        open = [];
      } else {
        wait = 0.7;
      }
    }
  }

  return {
    update(dt, input) {
      if (wait > 0) {
        wait -= dt;
        if (wait <= 0) {
          open.forEach(card => {
            card.revealed = false;
          });
          open = [];
        }
      }
      if (input.x || input.y) {
        const next = cursor + Math.sign(input.x) + Math.sign(input.y) * cols;
        cursor = clamp(next, 0, cards.length - 1);
      }
      if (input.pointer.pressed) {
        const clicked = cards.findIndex(card => contains({ x: card.x, y: card.y, w: 70, h: 70 }, input.pointer));
        flip(clicked);
      }
      if (input.actionPressed) flip(cursor);
      if (cards.every(card => card.matched)) game.message = "Board clear";
    },
    draw(ctx) {
      drawBackground(ctx, game.colors);
      cards.forEach((card, index) => {
        ctx.fillStyle = card.matched ? `${game.colors[1]}66` : card.revealed ? game.colors[2] : game.colors[0];
        ctx.beginPath();
        ctx.roundRect(card.x, card.y, 70, 70, 8);
        ctx.fill();
        if (card.revealed || card.matched) drawText(ctx, String(card.value + 1), card.x + 35, card.y + 35, 24, "#061018", "center");
        if (index === cursor) {
          ctx.strokeStyle = "#ffffff";
          ctx.lineWidth = 3;
          ctx.strokeRect(card.x - 4, card.y - 4, 78, 78);
        }
      });
      drawGameHud(ctx, game, "Memory: flip cards and find pairs");
    }
  };
}

function makeQuiz(gamePackage) {
  const game = makeGamePackage(gamePackage);
  const buttons = [0, 1, 2, 3].map(index => ({ x: 180 + (index % 2) * 310, y: 270 + Math.floor(index / 2) * 80, w: 270, h: 56 }));
  let question;
  let timer = game.tuning.seconds ?? 16;
  let streak = 0;

  function nextQuestion() {
    const a = Math.floor(randomBetween(2, 13));
    const b = Math.floor(randomBetween(2, 13));
    const answer = a + b;
    const options = [answer, answer + 1, answer - 1, answer + Math.floor(randomBetween(3, 8))].sort(() => Math.random() - 0.5);
    question = { text: `${a} + ${b} = ?`, options, answer };
    timer = game.tuning.seconds ?? 16;
  }

  function answer(index) {
    if (index == null) return;
    if (question.options[index] === question.answer) {
      streak += 1;
      game.score += 100 + streak * 20;
      game.message = `Streak ${streak}`;
    } else {
      streak = 0;
      game.score = Math.max(0, game.score - (game.tuning.penalty ?? 20));
      game.message = "Miss";
    }
    nextQuestion();
  }

  nextQuestion();

  return {
    update(dt, input) {
      timer -= dt;
      if (timer <= 0) {
        streak = 0;
        game.message = "Time";
        nextQuestion();
      }
      if (input.numberPressed) answer(input.numberPressed - 1);
      if (input.pointer.pressed) answer(buttons.findIndex(button => contains(button, input.pointer)));
    },
    draw(ctx) {
      drawBackground(ctx, game.colors);
      drawText(ctx, question.text, WIDTH / 2, 180, 48, "#eef6ff", "center");
      buttons.forEach((button, index) => drawButton(ctx, button, `${index + 1}. ${question.options[index]}`, false, game.colors));
      drawText(ctx, `Time ${Math.ceil(timer)}`, WIDTH - 120, 62, 22, "#ffd166");
      drawGameHud(ctx, game, "Quiz: click answers or press 1-4");
    }
  };
}

function makeDrawing(gamePackage) {
  const game = makeGamePackage(gamePackage);
  const strokes = [];
  const prompt = gamePackage.customization?.prompt ?? "quick sketch";
  const area = { x: 180, y: 138, w: 600, h: 300 };
  const clearButton = { x: 675, y: 466, w: 104, h: 48 };
  const brush = { x: area.x + area.w / 2, y: area.y + area.h / 2 };
  let color = game.colors[0];
  let current = null;
  const palette = game.colors.map((item, index) => ({ x: 205 + index * 58, y: 470, w: 42, h: 42, color: item }));

  function addBrushPoint() {
    if (!current) {
      current = { color, points: [] };
      strokes.push(current);
    }
    current.points.push({ x: brush.x, y: brush.y });
    game.score = strokes.reduce((total, stroke) => total + stroke.points.length, 0);
  }

  return {
    update(dt, input) {
      if (input.restartPressed) {
        strokes.length = 0;
        game.score = 0;
      }
      if (input.pointer.pressed) {
        const swatch = palette.find(item => contains(item, input.pointer));
        if (swatch) {
          color = swatch.color;
          return;
        }
        if (contains(clearButton, input.pointer)) {
          strokes.length = 0;
          game.score = 0;
          return;
        }
      }
      brush.x = clamp(brush.x + input.x * 320 * dt, area.x + 8, area.x + area.w - 8);
      brush.y = clamp(brush.y + input.y * 320 * dt, area.y + 8, area.y + area.h - 8);
      if (input.pointer.active && contains(area, input.pointer)) {
        brush.x = input.pointer.x;
        brush.y = input.pointer.y;
        addBrushPoint();
      } else if (input.action) {
        addBrushPoint();
      } else {
        current = null;
      }
    },
    draw(ctx) {
      drawBackground(ctx, game.colors);
      ctx.fillStyle = "#f7fbff";
      ctx.fillRect(area.x, area.y, area.w, area.h);
      ctx.strokeStyle = game.colors[0];
      ctx.lineWidth = 4;
      ctx.strokeRect(area.x, area.y, area.w, area.h);
      ctx.strokeStyle = "rgba(7, 10, 18, 0.1)";
      ctx.lineWidth = 1;
      for (let x = area.x + 40; x < area.x + area.w; x += 40) {
        ctx.beginPath();
        ctx.moveTo(x, area.y);
        ctx.lineTo(x, area.y + area.h);
        ctx.stroke();
      }
      for (let y = area.y + 40; y < area.y + area.h; y += 40) {
        ctx.beginPath();
        ctx.moveTo(area.x, y);
        ctx.lineTo(area.x + area.w, y);
        ctx.stroke();
      }
      strokes.forEach(stroke => {
        ctx.strokeStyle = stroke.color;
        ctx.lineWidth = 7;
        ctx.lineCap = "round";
        ctx.beginPath();
        stroke.points.forEach((point, index) => {
          if (index === 0) ctx.moveTo(point.x, point.y);
          else ctx.lineTo(point.x, point.y);
        });
        ctx.stroke();
      });
      if (strokes.length === 0) {
        drawText(ctx, "Draw here", area.x + area.w / 2, area.y + area.h / 2 - 12, 32, "#0b111b", "center");
        drawText(ctx, `Prompt: ${prompt.slice(0, 44)}`, area.x + area.w / 2, area.y + area.h / 2 + 28, 18, "#4c5b6c", "center");
      }
      palette.forEach(item => {
        ctx.fillStyle = item.color;
        ctx.fillRect(item.x, item.y, item.w, item.h);
        if (item.color === color) {
          ctx.strokeStyle = "#ffffff";
          ctx.lineWidth = 3;
          ctx.strokeRect(item.x - 4, item.y - 4, item.w + 8, item.h + 8);
        }
      });
      drawButton(ctx, clearButton, "Clear", false, game.colors);
      ctx.strokeStyle = color;
      ctx.lineWidth = 3;
      ctx.beginPath();
      ctx.arc(brush.x, brush.y, 10, 0, Math.PI * 2);
      ctx.stroke();
      drawGameHud(ctx, game, "Drawing: drag or hold Space and steer brush");
    }
  };
}

function makeRacing(gamePackage) {
  const game = makeGamePackage(gamePackage);
  const car = { x: WIDTH / 2, y: HEIGHT - 110, speed: 0 };
  const traffic = Array.from({ length: game.tuning.traffic ?? 5 }, (_, index) => ({
    x: randomBetween(260, 700),
    y: -index * 160,
    w: 44,
    h: 72
  }));

  return {
    update(dt, input) {
      car.speed = clamp(car.speed + (input.action ? 420 : -180) * dt, 120, 460);
      car.x = clamp(car.x + input.x * 360 * dt, 225, 735);
      traffic.forEach(item => {
        item.y += car.speed * dt;
        if (item.y > HEIGHT + 80) {
          item.y = randomBetween(-260, -80);
          item.x = randomBetween(260, 700);
          game.score += 20;
        }
        if (Math.abs(item.x - car.x) < 44 && Math.abs(item.y - car.y) < 72) {
          game.score = Math.max(0, game.score - 40);
          item.y = -120;
        }
      });
      game.score += dt * car.speed * 0.02;
    },
    draw(ctx) {
      drawBackground(ctx, game.colors);
      ctx.fillStyle = "#121a27";
      ctx.fillRect(220, 100, 540, 430);
      ctx.strokeStyle = "#ffffff55";
      ctx.setLineDash([28, 26]);
      ctx.lineWidth = 5;
      ctx.beginPath();
      ctx.moveTo(490, 100);
      ctx.lineTo(490, 530);
      ctx.stroke();
      ctx.setLineDash([]);
      traffic.forEach(item => {
        ctx.fillStyle = game.colors[1];
        ctx.fillRect(item.x - item.w / 2, item.y - item.h / 2, item.w, item.h);
      });
      ctx.fillStyle = game.colors[2];
      ctx.fillRect(car.x - 24, car.y - 42, 48, 84);
      drawGameHud(ctx, game, "Racing: steer, hold Space/Button A for throttle");
    }
  };
}

function makeIdle(gamePackage) {
  const game = makeGamePackage(gamePackage);
  const generatorCount = game.tuning.generators ?? 5;
  const nodes = Array.from({ length: generatorCount }, (_, index) => ({
    label: ["Ore", "Forge", "Bot", "Lab", "Portal", "Core", "Vault"][index] ?? `Node ${index + 1}`,
    level: index === 0 ? 1 : 0,
    unlocked: index === 0,
    progress: 0,
    rate: 0.18 + index * 0.08,
    value: 2 + index * 5,
    cost: Math.round(35 * (index + 1) ** 1.7),
    x: 150 + (index % 4) * 175,
    y: 185 + Math.floor(index / 4) * 130
  }));
  const upgradeButtons = nodes.map((node, index) => ({
    node,
    rect: { x: 70 + index * 126, y: 462, w: 112, h: 46 }
  }));
  let selected = 0;
  let selectCooldown = 0;

  function incomePerSecond() {
    return nodes.reduce((total, node) => (node.unlocked ? total + node.level * node.value * node.rate : total), 0);
  }

  function buy(node) {
    if (!node.unlocked) {
      const previous = nodes[nodes.indexOf(node) - 1];
      if (!previous || previous.level < 2 || game.score < node.cost) return;
      game.score -= node.cost;
      node.unlocked = true;
      node.level = 1;
      node.cost = Math.ceil(node.cost * 1.42);
      game.message = `${node.label} online`;
      return;
    }
    if (game.score < node.cost) return;
    game.score -= node.cost;
    node.level += 1;
    node.cost = Math.ceil(node.cost * (1.32 + node.level * 0.03));
    game.message = `${node.label} L${node.level}`;
  }

  return {
    update(dt, input) {
      selectCooldown -= dt;
      if (selectCooldown <= 0 && input.x) {
        selected = clamp(selected + Math.sign(input.x), 0, nodes.length - 1);
        selectCooldown = 0.14;
      }
      if (input.actionPressed) buy(nodes[selected]);
      if (input.pointer.pressed) {
        const button = upgradeButtons.find(item => contains(item.rect, input.pointer));
        if (button) buy(button.node);
      }
      nodes.forEach((node, index) => {
        if (!node.unlocked) {
          const previous = nodes[index - 1];
          if (previous?.level >= 2) game.message = `${node.label} unlock ready`;
          return;
        }
        node.progress += dt * node.rate * Math.max(1, node.level);
        while (node.progress >= 1) {
          node.progress -= 1;
          game.score += node.value * node.level;
        }
      });
    },
    draw(ctx) {
      drawBackground(ctx, game.colors);
      drawText(ctx, `Rate ${incomePerSecond().toFixed(1)}/s`, WIDTH - 142, 102, 22, "#ffd166");
      nodes.forEach((node, index) => {
        const active = index === selected;
        ctx.strokeStyle = active ? "#ffffff" : node.unlocked ? game.colors[index % game.colors.length] : "rgba(255,255,255,0.2)";
        ctx.lineWidth = active ? 4 : 2;
        ctx.fillStyle = node.unlocked ? "rgba(255,255,255,0.07)" : "rgba(255,255,255,0.025)";
        ctx.beginPath();
        ctx.roundRect(node.x - 54, node.y - 44, 108, 88, 10);
        ctx.fill();
        ctx.stroke();
        ctx.fillStyle = node.unlocked ? game.colors[index % game.colors.length] : "#4c5b6c";
        ctx.beginPath();
        ctx.arc(node.x, node.y - 12, 21, 0, Math.PI * 2);
        ctx.fill();
        if (node.unlocked) {
          ctx.strokeStyle = "#061018";
          ctx.lineWidth = 6;
          ctx.beginPath();
          ctx.arc(node.x, node.y - 12, 27, -Math.PI / 2, -Math.PI / 2 + Math.PI * 2 * node.progress);
          ctx.stroke();
        }
        drawText(ctx, node.label, node.x, node.y + 24, 15, "#eef6ff", "center");
        drawText(ctx, node.unlocked ? `L${node.level}` : "LOCK", node.x, node.y + 43, 13, "#91a4b8", "center");
        if (index > 0) {
          ctx.strokeStyle = `${game.colors[1]}66`;
          ctx.lineWidth = 3;
          ctx.beginPath();
          ctx.moveTo(nodes[index - 1].x + 58, nodes[index - 1].y);
          ctx.lineTo(node.x - 58, node.y);
          ctx.stroke();
        }
      });
      upgradeButtons.forEach((button, index) => {
        const label = button.node.unlocked ? `${button.node.label} ${button.node.cost}` : `Unlock ${button.node.cost}`;
        drawButton(ctx, button.rect, label, game.score >= button.node.cost || index === 0, game.colors);
      });
      drawGameHud(ctx, game, "Idle Factory: automate nodes, upgrade lines, unlock chains");
    }
  };
}

function makeMinigames(gamePackage) {
  const game = makeGamePackage(gamePackage);
  const player = { x: WIDTH / 2 };
  const targets = Array.from({ length: 5 }, (_, index) => ({ x: randomBetween(120, 840), y: -index * 90, good: index % 3 !== 0 }));
  let lives = game.tuning.lives ?? 4;

  return {
    update(dt, input) {
      player.x = clamp(player.x + input.x * 420 * dt, 70, WIDTH - 70);
      targets.forEach(target => {
        target.y += 250 * dt;
        if (target.y > HEIGHT + 30) {
          target.y = randomBetween(-180, -40);
          target.x = randomBetween(100, 860);
          target.good = Math.random() > 0.25;
        }
        if (Math.abs(target.x - player.x) < 48 && Math.abs(target.y - 445) < 30) {
          if (target.good) game.score += 30;
          else lives -= 1;
          target.y = -80;
          target.x = randomBetween(100, 860);
          target.good = Math.random() > 0.25;
        }
      });
      if (lives <= 0) game.over = true;
      if (game.over && (input.restartPressed || input.actionPressed)) {
        lives = game.tuning.lives ?? 4;
        game.score = 0;
        game.over = false;
      }
    },
    draw(ctx) {
      drawBackground(ctx, game.colors);
      targets.forEach(target => {
        ctx.fillStyle = target.good ? game.colors[0] : "#ff4d6d";
        ctx.beginPath();
        ctx.arc(target.x, target.y, 20, 0, Math.PI * 2);
        ctx.fill();
      });
      ctx.fillStyle = game.colors[2];
      ctx.fillRect(player.x - 52, 445, 104, 18);
      drawText(ctx, `Lives ${lives}`, WIDTH - 130, 62, 22);
      drawGameHud(ctx, game, "Mini-game: catch blue targets, avoid red");
    }
  };
}

function makeArenaBattle(gamePackage) {
  const game = makeGamePackage(gamePackage);
  const player = { x: WIDTH / 2, y: HEIGHT / 2 + 50, health: game.tuning.health ?? 4, cooldown: 0, invuln: 0 };
  const bullets = [];
  const explosions = [];
  const enemyCount = game.tuning.enemies ?? 6;
  const enemies = Array.from({ length: enemyCount }, (_, index) => ({
    x: 120 + (index % 4) * 210,
    y: 150 + Math.floor(index / 4) * 70,
    health: 2
  }));

  function spawn(enemy) {
    enemy.x = randomBetween(90, WIDTH - 90);
    enemy.y = randomBetween(125, 210);
    enemy.health = 2 + Math.floor(game.score / 500);
  }

  function shoot() {
    if (player.cooldown > 0) return;
    const target = enemies.reduce((closest, enemy) => {
      const distance = Math.hypot(enemy.x - player.x, enemy.y - player.y);
      return !closest || distance < closest.distance ? { enemy, distance } : closest;
    }, null)?.enemy;
    const angle = target ? Math.atan2(target.y - player.y, target.x - player.x) : -Math.PI / 2;
    bullets.push({ x: player.x, y: player.y, vx: Math.cos(angle) * 560, vy: Math.sin(angle) * 560 });
    player.cooldown = game.tuning.fireRate ?? 0.34;
  }

  function reset() {
    game.score = 0;
    game.over = false;
    player.x = WIDTH / 2;
    player.y = HEIGHT / 2 + 50;
    player.health = game.tuning.health ?? 4;
    enemies.forEach(spawn);
    bullets.length = 0;
    explosions.length = 0;
  }

  return {
    update(dt, input) {
      if (game.over) {
        if (input.restartPressed || input.actionPressed) reset();
        return;
      }
      player.x = clamp(player.x + input.x * 310 * dt, 45, WIDTH - 45);
      player.y = clamp(player.y + input.y * 310 * dt, 125, HEIGHT - 55);
      player.cooldown -= dt;
      player.invuln -= dt;
      if (input.action || input.pointer.pressed) shoot();

      bullets.forEach(bullet => {
        bullet.x += bullet.vx * dt;
        bullet.y += bullet.vy * dt;
      });
      for (let index = bullets.length - 1; index >= 0; index -= 1) {
        const bullet = bullets[index];
        if (bullet.x < -20 || bullet.x > WIDTH + 20 || bullet.y < 90 || bullet.y > HEIGHT + 20) bullets.splice(index, 1);
      }

      enemies.forEach(enemy => {
        const angle = Math.atan2(player.y - enemy.y, player.x - enemy.x);
        enemy.x += Math.cos(angle) * (game.tuning.speed ?? 120) * dt;
        enemy.y += Math.sin(angle) * (game.tuning.speed ?? 120) * dt;
        if (Math.hypot(player.x - enemy.x, player.y - enemy.y) < 34 && player.invuln <= 0) {
          player.health -= 1;
          player.invuln = 0.85;
          game.message = `${player.health} HP`;
          if (player.health <= 0) game.over = true;
        }
        bullets.forEach((bullet, bulletIndex) => {
          if (Math.hypot(bullet.x - enemy.x, bullet.y - enemy.y) < 28) {
            bullets.splice(bulletIndex, 1);
            enemy.health -= 1;
            explosions.push({ x: enemy.x, y: enemy.y, t: 0.25 });
            if (enemy.health <= 0) {
              game.score += 100;
              spawn(enemy);
            }
          }
        });
      });
      explosions.forEach(explosion => {
        explosion.t -= dt;
      });
      for (let index = explosions.length - 1; index >= 0; index -= 1) {
        if (explosions[index].t <= 0) explosions.splice(index, 1);
      }
    },
    draw(ctx) {
      drawBackground(ctx, game.colors);
      ctx.strokeStyle = `${game.colors[2]}44`;
      ctx.strokeRect(90, 118, WIDTH - 180, HEIGHT - 170);
      enemies.forEach(enemy => {
        ctx.fillStyle = game.colors[1];
        ctx.fillRect(enemy.x - 20, enemy.y - 20, 40, 40);
        ctx.fillStyle = "#070a12";
        ctx.fillRect(enemy.x - 8, enemy.y - 8, 6, 6);
        ctx.fillRect(enemy.x + 4, enemy.y - 8, 6, 6);
      });
      bullets.forEach(bullet => {
        ctx.fillStyle = game.colors[2];
        ctx.beginPath();
        ctx.arc(bullet.x, bullet.y, 5, 0, Math.PI * 2);
        ctx.fill();
      });
      explosions.forEach(explosion => {
        ctx.strokeStyle = game.colors[2];
        ctx.lineWidth = 4;
        ctx.beginPath();
        ctx.arc(explosion.x, explosion.y, 28 * (1 - explosion.t), 0, Math.PI * 2);
        ctx.stroke();
      });
      ctx.fillStyle = player.invuln > 0 ? "#ffffff" : game.colors[0];
      ctx.beginPath();
      ctx.moveTo(player.x, player.y - 26);
      ctx.lineTo(player.x - 24, player.y + 20);
      ctx.lineTo(player.x + 24, player.y + 20);
      ctx.closePath();
      ctx.fill();
      drawText(ctx, `HP ${player.health}`, WIDTH - 110, 102, 22, "#ffd166");
      drawGameHud(ctx, game, "AI Arena: move, hold Space/click to fire at robots");
    }
  };
}

function makeCyberRunner(gamePackage) {
  const game = makeGamePackage(gamePackage);
  const lanes = game.tuning.lanes ?? 3;
  const laneXs = Array.from({ length: lanes }, (_, index) => 270 + index * (420 / Math.max(1, lanes - 1)));
  const vehicle = { lane: Math.floor(lanes / 2), x: laneXs[Math.floor(lanes / 2)], lives: 3 };
  const traffic = Array.from({ length: game.tuning.traffic ?? 6 }, (_, index) => ({ lane: index % lanes, y: -index * 105, hit: false }));
  const shards = Array.from({ length: 6 }, (_, index) => ({ lane: (index + 1) % lanes, y: -index * 120 - 60, taken: false }));
  let laneCooldown = 0;

  function recycle(item) {
    item.lane = Math.floor(Math.random() * lanes);
    item.y = randomBetween(-220, -70);
    item.hit = false;
    item.taken = false;
  }

  function reset() {
    game.score = 0;
    game.over = false;
    vehicle.lives = 3;
    traffic.forEach(recycle);
    shards.forEach(recycle);
  }

  return {
    update(dt, input) {
      if (game.over) {
        if (input.restartPressed || input.actionPressed) reset();
        return;
      }
      laneCooldown -= dt;
      if (laneCooldown <= 0 && Math.abs(input.x) > 0.4) {
        vehicle.lane = clamp(vehicle.lane + Math.sign(input.x), 0, lanes - 1);
        laneCooldown = 0.15;
      }
      vehicle.x += (laneXs[vehicle.lane] - vehicle.x) * 12 * dt;
      const speed = (game.tuning.speed ?? 330) * (input.action ? (game.tuning.boost ?? 1.55) : 1);
      traffic.forEach(car => {
        car.y += speed * dt;
        if (car.y > HEIGHT + 70) recycle(car);
        if (!car.hit && car.lane === vehicle.lane && Math.abs(car.y - 428) < 54) {
          car.hit = true;
          vehicle.lives -= 1;
          game.message = `${vehicle.lives} lives`;
          if (vehicle.lives <= 0) game.over = true;
        }
      });
      shards.forEach(shard => {
        shard.y += speed * dt;
        if (shard.y > HEIGHT + 40) recycle(shard);
        if (!shard.taken && shard.lane === vehicle.lane && Math.abs(shard.y - 428) < 52) {
          shard.taken = true;
          game.score += input.action ? 60 : 35;
        }
      });
      game.score += dt * speed * 0.025;
    },
    draw(ctx) {
      drawBackground(ctx, game.colors);
      ctx.fillStyle = "#101725";
      ctx.fillRect(220, 110, 520, 410);
      laneXs.forEach(x => {
        ctx.strokeStyle = `${game.colors[0]}66`;
        ctx.setLineDash([20, 22]);
        ctx.lineWidth = 4;
        ctx.beginPath();
        ctx.moveTo(x, 110);
        ctx.lineTo(x, 520);
        ctx.stroke();
      });
      ctx.setLineDash([]);
      traffic.forEach(car => {
        ctx.fillStyle = car.hit ? "#ff4d6d66" : game.colors[1];
        ctx.fillRect(laneXs[car.lane] - 24, car.y - 34, 48, 68);
      });
      shards.forEach(shard => {
        if (shard.taken) return;
        ctx.fillStyle = game.colors[2];
        ctx.beginPath();
        ctx.moveTo(laneXs[shard.lane], shard.y - 16);
        ctx.lineTo(laneXs[shard.lane] + 16, shard.y);
        ctx.lineTo(laneXs[shard.lane], shard.y + 16);
        ctx.lineTo(laneXs[shard.lane] - 16, shard.y);
        ctx.closePath();
        ctx.fill();
      });
      ctx.fillStyle = game.colors[0];
      ctx.beginPath();
      ctx.roundRect(vehicle.x - 34, 398, 68, 60, 12);
      ctx.fill();
      drawText(ctx, `Lives ${vehicle.lives}`, WIDTH - 130, 102, 22);
      drawGameHud(ctx, game, "Cyber Runner: switch lanes, hold Space to boost");
    }
  };
}

function makeSpaceShooter(gamePackage) {
  const game = makeGamePackage(gamePackage);
  const player = { x: WIDTH / 2, y: HEIGHT - 64, lives: game.tuning.lives ?? 4, cooldown: 0 };
  const bullets = [];
  const enemyBullets = [];
  const enemies = Array.from({ length: game.tuning.enemies ?? 6 }, (_, index) => ({
    x: 170 + (index % 6) * 120,
    y: 150 + Math.floor(index / 6) * 56,
    alive: true
  }));
  const boss = { x: WIDTH / 2, y: 100, health: game.tuning.bossHealth ?? 52, max: game.tuning.bossHealth ?? 52, cooldown: 0 };

  function reset() {
    game.score = 0;
    game.over = false;
    player.x = WIDTH / 2;
    player.y = HEIGHT - 64;
    player.lives = game.tuning.lives ?? 4;
    boss.health = boss.max;
    bullets.length = 0;
    enemyBullets.length = 0;
    enemies.forEach((enemy, index) => {
      enemy.x = 170 + (index % 6) * 120;
      enemy.y = 150 + Math.floor(index / 6) * 56;
      enemy.alive = true;
    });
  }

  function shoot() {
    if (player.cooldown > 0) return;
    bullets.push({ x: player.x, y: player.y - 26, vy: -(game.tuning.bulletSpeed ?? 480) });
    player.cooldown = 0.16;
  }

  return {
    update(dt, input) {
      if (game.over) {
        if (input.restartPressed || input.actionPressed) reset();
        return;
      }
      player.x = clamp(player.x + input.x * 380 * dt, 40, WIDTH - 40);
      player.y = clamp(player.y + input.y * 280 * dt, 260, HEIGHT - 40);
      player.cooldown -= dt;
      boss.cooldown -= dt;
      if (input.action || input.pointer.pressed) shoot();

      bullets.forEach(bullet => {
        bullet.y += bullet.vy * dt;
      });
      enemyBullets.forEach(bullet => {
        bullet.y += 270 * dt;
      });

      enemies.forEach(enemy => {
        if (!enemy.alive) return;
        enemy.x += Math.sin(performance.now() / 500 + enemy.y) * 18 * dt;
        if (Math.random() < 0.008) enemyBullets.push({ x: enemy.x, y: enemy.y + 18 });
        bullets.forEach((bullet, bulletIndex) => {
          if (Math.abs(bullet.x - enemy.x) < 25 && Math.abs(bullet.y - enemy.y) < 24) {
            bullets.splice(bulletIndex, 1);
            enemy.alive = false;
            game.score += 80;
          }
        });
      });

      if (boss.health > 0) {
        boss.x = WIDTH / 2 + Math.sin(performance.now() / 700) * 210;
        if (boss.cooldown <= 0) {
          enemyBullets.push({ x: boss.x - 40, y: boss.y + 34 }, { x: boss.x + 40, y: boss.y + 34 });
          boss.cooldown = 0.65;
        }
        bullets.forEach((bullet, bulletIndex) => {
          if (Math.abs(bullet.x - boss.x) < 88 && Math.abs(bullet.y - boss.y) < 36) {
            bullets.splice(bulletIndex, 1);
            boss.health -= 1;
            game.score += 15;
            if (boss.health <= 0) game.message = "Boss defeated";
          }
        });
      }

      enemyBullets.forEach((bullet, index) => {
        if (Math.abs(bullet.x - player.x) < 22 && Math.abs(bullet.y - player.y) < 28) {
          enemyBullets.splice(index, 1);
          player.lives -= 1;
          game.message = `${player.lives} lives`;
          if (player.lives <= 0) game.over = true;
        }
      });
      for (let index = bullets.length - 1; index >= 0; index -= 1) if (bullets[index].y < 70) bullets.splice(index, 1);
      for (let index = enemyBullets.length - 1; index >= 0; index -= 1) if (enemyBullets[index].y > HEIGHT + 20) enemyBullets.splice(index, 1);
    },
    draw(ctx) {
      drawBackground(ctx, game.colors);
      for (let index = 0; index < 70; index += 1) {
        ctx.fillStyle = index % 3 === 0 ? game.colors[0] : "#ffffff";
        ctx.fillRect((index * 137) % WIDTH, 100 + ((index * 73) % 420), 2, 2);
      }
      if (boss.health > 0) {
        ctx.fillStyle = game.colors[0];
        ctx.fillRect(boss.x - 95, boss.y - 24, 190, 48);
        ctx.fillStyle = "#ff4d6d";
        ctx.fillRect(boss.x - 95, boss.y - 46, 190 * (boss.health / boss.max), 8);
      }
      enemies.forEach(enemy => {
        if (!enemy.alive) return;
        ctx.fillStyle = game.colors[1];
        ctx.beginPath();
        ctx.moveTo(enemy.x, enemy.y + 22);
        ctx.lineTo(enemy.x - 24, enemy.y - 16);
        ctx.lineTo(enemy.x + 24, enemy.y - 16);
        ctx.closePath();
        ctx.fill();
      });
      ctx.fillStyle = game.colors[2];
      bullets.forEach(bullet => ctx.fillRect(bullet.x - 3, bullet.y - 12, 6, 20));
      ctx.fillStyle = "#ff4d6d";
      enemyBullets.forEach(bullet => {
        ctx.beginPath();
        ctx.arc(bullet.x, bullet.y, 6, 0, Math.PI * 2);
        ctx.fill();
      });
      ctx.fillStyle = game.colors[0];
      ctx.beginPath();
      ctx.moveTo(player.x, player.y - 30);
      ctx.lineTo(player.x - 28, player.y + 26);
      ctx.lineTo(player.x + 28, player.y + 26);
      ctx.closePath();
      ctx.fill();
      drawText(ctx, `Lives ${player.lives}`, WIDTH - 130, 102, 22);
      drawGameHud(ctx, game, "Space Shooter: move and hold Space/click to fire");
    }
  };
}

function makeRuntime(gamePackage) {
  const makers = {
    "ai-arena": makeArenaBattle,
    "cyber-runner": makeCyberRunner,
    clicker: makeClicker,
    drawing: makeDrawing,
    flappy: makeFlappy,
    idle: makeIdle,
    match3: makeMatch3,
    memory: makeMemory,
    minigames: makeMinigames,
    quiz: makeQuiz,
    racing: makeRacing,
    runner: makeRunner,
    "space-shooter": makeSpaceShooter
  };

  return (makers[gamePackage.templateId] ?? makeFlappy)(gamePackage);
}

export function ThreePreview({ gamePackage }) {
  const mountRef = useRef(null);
  const runtimeRef = useRef(null);
  const inputRef = useRef(makeInput());

  useEffect(() => {
    const mount = mountRef.current;
    if (!mount) return undefined;

    const canvas = document.createElement("canvas");
    const ctx = canvas.getContext("2d");
    canvas.width = WIDTH;
    canvas.height = HEIGHT;
    canvas.tabIndex = 0;
    mount.appendChild(canvas);

    runtimeRef.current = makeRuntime(gamePackage);

    let lastTime = performance.now();
    let animationId = 0;

    function frame(time) {
      const dt = Math.min(0.033, (time - lastTime) / 1000);
      lastTime = time;
      const input = inputRef.current;
      updateKeyboardInput(input);
      applyGamepad(input);
      runtimeRef.current.update(dt, input);
      runtimeRef.current.draw(ctx);
      input.actionPressed = false;
      input.restartPressed = false;
      input.numberPressed = null;
      input.pointer.pressed = false;
      input.pointer.released = false;
      animationId = requestAnimationFrame(frame);
    }

    function setPointer(event, active) {
      const rect = canvas.getBoundingClientRect();
      inputRef.current.pointer.x = ((event.clientX - rect.left) / rect.width) * WIDTH;
      inputRef.current.pointer.y = ((event.clientY - rect.top) / rect.height) * HEIGHT;
      inputRef.current.pointer.active = active;
    }

    function handlePointerDown(event) {
      canvas.focus();
      setPointer(event, true);
      inputRef.current.pointer.pressed = true;
      inputRef.current.actionPressed = true;
    }

    function handlePointerMove(event) {
      setPointer(event, inputRef.current.pointer.active);
    }

    function handlePointerUp(event) {
      setPointer(event, false);
      inputRef.current.pointer.released = true;
    }

    function handleKeyDown(event) {
      if (isTypingTarget(event.target)) return;
      if (!CONTROL_KEYS.has(event.code)) return;
      event.preventDefault();
      if (!inputRef.current.keys.has(event.code)) {
        if (event.code === "Space" || event.code === "Enter") inputRef.current.actionPressed = true;
        if (event.code === "KeyR") inputRef.current.restartPressed = true;
        if (event.code.startsWith("Digit")) inputRef.current.numberPressed = Number(event.code.replace("Digit", ""));
      }
      inputRef.current.keys.add(event.code);
    }

    function handleKeyUp(event) {
      if (!CONTROL_KEYS.has(event.code)) return;
      event.preventDefault();
      inputRef.current.keys.delete(event.code);
    }

    window.addEventListener("keydown", handleKeyDown);
    window.addEventListener("keyup", handleKeyUp);
    canvas.addEventListener("pointerdown", handlePointerDown);
    canvas.addEventListener("pointermove", handlePointerMove);
    canvas.addEventListener("pointerup", handlePointerUp);
    canvas.addEventListener("pointerleave", handlePointerUp);
    animationId = requestAnimationFrame(frame);

    return () => {
      window.removeEventListener("keydown", handleKeyDown);
      window.removeEventListener("keyup", handleKeyUp);
      canvas.removeEventListener("pointerdown", handlePointerDown);
      canvas.removeEventListener("pointermove", handlePointerMove);
      canvas.removeEventListener("pointerup", handlePointerUp);
      canvas.removeEventListener("pointerleave", handlePointerUp);
      cancelAnimationFrame(animationId);
      mount.removeChild(canvas);
    };
  }, [gamePackage]);

  return (
    <div className="three-preview-wrap">
      <div
        className="three-preview"
        ref={mountRef}
        role="application"
        aria-label={`${gamePackage.templateName} playable game. Use WASD or arrow keys, Space, touch, or a connected controller.`}
      />
      <div className="player-controls" aria-label="Player controls">
        <span>Move <kbd>WASD</kbd> <kbd>Arrows</kbd></span>
        <span>Action <kbd>Space</kbd> <kbd>Click</kbd></span>
        <span>More <kbd>1-4</kbd> <kbd>R</kbd></span>
      </div>
    </div>
  );
}
