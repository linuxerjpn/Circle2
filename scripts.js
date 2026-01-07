/* vim:set foldmethod=marker: */

/**
 * @fileOverview 円を連続して並べていって図形を描画するプログラム 
 * javascript言語ベースのp5js言語で開発. <br/>
 * ～備忘録～<br/>
 * @author MURAYAMA, Yoshiyuki
 * @version 1.0.0
 */

/** GlobalConst ちゃちゃっと作ったらびっくりするくらい汚くなり、
 * 今見返したらびっくりした。とりあえず、リファクタリングのために、
 * 定数とかを静的なGlobalConstクラスに彫りこんでおくことにする.
 */
class gc {
  static BTN_RUN_B_Y = 100;//B途中スタート・ストップボタンのY座標

}

// ===== 図形描画用 =====
let circles = [];
const CIRCLE_RADIUS = 200;   // ← 後で数字をいじるだけ
const CIRCLE_GAP = CIRCLE_RADIUS ;
const DRAW_DURATION = 1000; // 1秒

let btnDraw;
let btnReset;
let arcs = [];
const UNIT = 200; //グリッドサイズ
const R = UNIT;

const BASE_WIDTH = 800;
const BASE_HEIGHT = 600;

let offsetX = 0;
let offsetY = 0; //キャンバスの平行移動
let wholeScale = 1;
let dragging = false;
let lastMouseX, lastMouseY;

// ドラッグ用
let lastTouchX = null;
let lastTouchY = null;
let lastTouchDist = null; //ピンチズーム用

let fillLayer;//塗専用
let layerUnion;     // 薄紫用（和集合）
let layerOverlap;  // 薄黄色用（積集合）

// 塗り用（必ず「円」）
let discs = [];





/** ブラウザの画面の横幅いっぱい.
 * @type {Number}
 */
var iWidth = window.innerWidth;
/** ブラウザの画面の縦幅いっぱい. 
 * @type {Number} 
 */
var iHeight = window.innerHeight;

/** リセットボタンが押下された.
 */
function onMousePressedReset() { /**{{{*/
}
/**}}}*/

/** setup()関数の先頭に記述してあるため、setup()よりも先に呼び出される.
 * スマホ・タブレット（iOS・Android）か、PCかをuserAgentを調べることで、判別する.
 * これにより、isPCにtrueかfalseが入るため、これ以降のプログラムでは、isPCを見れば、
 * PCかどうかがわかる.
 */
function preload() { /** {{{*/
 
	if(navigator.userAgent.match(/(iPhone|iPad|iPod|Android)/i)){
		// スマホ・タブレット（iOS・Android）の場合の処理を記述
		isPC = false;
	}else{
		// PCの場合の処理を記述
		isPC = true;
	}
	// setupより先に実行
	//font = loadFont("Meiryo.ttf");
  audioCtx = new (window.AudioContext || window.webkitAudioContext)();
  angleMode(RADIANS);
}
/**}}}*/

//---------------------------------------
// ★ iPad（ピンチでズーム）
//---------------------------------------
function touchMoved(event) { /**{{{*/
   // 2本指（ピンチズーム）
  if (touches.length == 2) {
    let t1 = touches[0];
    let t2 = touches[1];

    let dx = t1.x - t2.x;
    let dy = t1.y - t2.y;
    let dist = sqrt(dx*dx + dy*dy);

    if (lastTouchDist !== null) {
      let change = dist / lastTouchDist;

      // ピンチ中心
      let cx = (t1.x + t2.x) / 2;
      let cy = (t1.y + t2.y) / 2;

      // ズーム前の世界座標
      const wx = (cx - offsetX) / wholeScale;
      const wy = (cy - offsetY) / wholeScale;

      // ズーム
      wholeScale *= change;

      // ズーム後のオフセット補正
      offsetX = cx - wx * wholeScale;
      offsetY = cy - wy * wholeScale;
    }
    lastTouchDist = dist;
    return false;
  }

  // 1本指（パン）
  if (touches.length == 1) {
    if (isDragging) {
    let x = touches[0].x;
    let y = touches[0].y;

    offsetX += x - lastTouchX;
    offsetY += y - lastTouchY;

    lastTouchX = x;
    lastTouchY = y;
  }

  // スクロール禁止（重要）
    return false;
  }
  return false;
}
/**}}}*/


function touchEnded() { /**{{{*/
   if (touches.length < 2) {
    lastTouchDist = null;
     isDragging = false;
  }
}

/**}}}*/

/** 文字を強制的に数値に変換する.しかもエラーは一切出さないようにする.
 * @param str 読み込んだ文字列
 * @return 数値 文字列として読み込めなかったら0
 */
function atoiLike(str) { /** {{{*/
  if (!str) return 0;
  
  //全角→半角変換
  const hankaku = str.replace(/[０-９.ー]/g, function (ch) {
    return String.fromCharCode(ch.charCodeAt(0) - 0xFEE0 );
  });

  const match = hankaku.match(/-?\d+(\.\d+)?/);
  return match ? parseFloat( match[0] ) : 0;
    
}
/**}}}*/

/** 最初に1回だけ実行. 初期値の図形情報を詰め込むのはここ.
 * 
 */
function setup(){ /** {{{*/
	preload();

	window.addEventListener("touchstart", function(ev) {
	  const t = ev.target;
	  if ( t ) {
	    const tag = t.tagName;
	    if ( tag === 'BUTTON' || tag === 'INPUT' || t.closest && t.closest('button, input, textarea, .p5ui') ) {
	      //ui要素なら何もしない
	      return;
	    }
	  }
	  //それ以外では、スクロールを無効化
	  ev.preventDefault();
	} , { passive: false });

	window.addEventListener("touchmove", function (ev) {
	  const t = ev.target;
	  if (t) {
	    const tag = t.tagName;
	    if (tag === 'BUTTON' || tag === 'INPUT' || t.closest && t.closest('button, input, textarea, .p5ui')) {
	      return;
	    }
	  }
	  ev.preventDefault();
	}, { passive: false });

	cursor('pointer');
	//キャンバスを作成
	textSize( 20 );
	createCanvas(iWidth, iHeight);
	drawBackground();
	fillLayer = createGraphics(iWidth, iHeight);

layerUnion   = createGraphics(iWidth, iHeight);
layerOverlap = createGraphics(iWidth, iHeight);
  
  lastMouseX = mouseX;
  lastMouseY = mouseY;
  btnDraw = createButton("作図");
  btnDraw.position(20, 20);
  //btnDraw.mousePressed(addCircle);
  btnDraw.mousePressed(addArc);
  btnDraw.addClass("p5ui");

  btnReset = createButton("リセット");
  btnReset.position(80, 20);
  btnReset.mousePressed(resetCircles);
  btnReset.addClass("p5ui");
}
/**}}}*/

function drawFills() {
  const ctx = drawingContext;

  // --- 薄紫（円の和集合） ---
  noStroke();
  fill(220,200,240);
  for (let d of discs) {
    ellipse(d.cx, d.cy, d.r*2, d.r*2);
  }

  // --- 薄黄色（円の積集合） ---
  for (let i = 0; i < discs.length; i++) {
    for (let j = i+1; j < discs.length; j++) {
      ctx.save();

      ctx.beginPath();
      ctx.arc(discs[i].cx, discs[i].cy, discs[i].r, 0, TWO_PI);
      ctx.clip();

      ctx.beginPath();
      ctx.arc(discs[j].cx, discs[j].cy, discs[j].r, 0, TWO_PI);
      ctx.clip();

      fill(255,245,200);
      rect(0,0,width,height);

      ctx.restore();
    }
  }
}


function drawLines() {
  for (let a of arcs) {
    drawAnimatedArc(a);
  }
}



function clipArc(ctx, a) {
  // 円
  ctx.beginPath();
  ctx.arc(a.cx, a.cy, a.r, 0, TWO_PI);
  ctx.clip();

  // 角度扇形
  ctx.beginPath();
  ctx.moveTo(a.cx, a.cy);
  ctx.arc(a.cx, a.cy, a.r,
          a.startAngle, a.endAngle);
  ctx.closePath();
  ctx.clip();
}

function rebuildUnionLayer() {
  const g = layerUnion;
  const ctx = g.drawingContext;
  g.clear();

  ctx.fillStyle = "rgba(220,200,240,0.8)";
  ctx.globalCompositeOperation = "source-over";

  for (let d of discs) {
    ctx.beginPath();
    ctx.arc(d.cx, d.cy, d.r, 0, Math.PI * 2);
    ctx.fill();
  }
}



function yyyrebuildUnionLayer() {
  const g = layerUnion;
  const ctx = g.drawingContext;
  g.clear();

  ctx.fillStyle = "rgb(220,200,240,0.6)";
  //ctx.fillStyle = "rgb(220,0,0,0.6)";

  for (let a of arcs) {
    if (!a.finished) continue;

    ctx.beginPath();
    const startX = a.cx + a.r * 2 * Math.cos(a.startAngle);
    const startY = a.cy + a.r * 2 * Math.sin(a.startAngle);
    ctx.moveTo(startX, startY);
    ctx.arc(a.cx, a.cy, a.r * 2, a.startAngle, a.endAngle);
    ctx.closePath();
    ctx.fill();
  }
}





function bbbrebuildUnionLayer() {
  const g = layerUnion;
  const ctx = g.drawingContext;
  g.clear();

  //ctx.fillStyle = "rgb(220,200,240,0.4)";
  ctx.fillStyle = "rgb(220,0,0,0.4)";

  for (let a of arcs) {
    if (!a.finished) continue;

    ctx.beginPath();
    // 円弧開始点の座標を計算
    const startX = a.cx + a.r * 2 * Math.cos(a.startAngle);
    const startY = a.cy + a.r * 2 * Math.sin(a.startAngle);
    ctx.moveTo(startX, startY);
    ctx.arc(a.cx, a.cy, a.r * 2, a.startAngle, a.endAngle);
    // 円弧の終点に戻るための線を引く（直線部分）
    ctx.closePath();
    ctx.fill();
  }
}


/** 薄紫のみの塗*/
function aaarebuildUnionLayer() {
  const g = layerUnion;
  const ctx = g.drawingContext;
  g.clear();

  ctx.fillStyle = "rgb(220,200,240)";

  for (let a of arcs) {
    if (!a.finished) continue;

    ctx.beginPath();
    ctx.moveTo(a.cx, a.cy);
    ctx.arc(a.cx, a.cy, a.r * 2, a.startAngle, a.endAngle);
    ctx.closePath();
    ctx.fill();
  }
}

function rebuildOverlapLayer() {
  const g = layerOverlap;
  const ctx = g.drawingContext;
  g.clear();

  for (let i = 0; i < discs.length; i++) {
    for (let j = i + 1; j < discs.length; j++) {

      ctx.save();

      // ① まず黄色を全面に敷く
      ctx.fillStyle = "rgba(255,245,200,0.9)";
      ctx.fillRect(0, 0, g.width, g.height);

      // ② 円①で切る
      ctx.globalCompositeOperation = "destination-in";
      ctx.beginPath();
      ctx.arc(discs[i].cx, discs[i].cy, discs[i].r, 0, Math.PI * 2);
      ctx.fill();

      // ③ 円②で切る
      ctx.beginPath();
      ctx.arc(discs[j].cx, discs[j].cy, discs[j].r, 0, Math.PI * 2);
      ctx.fill();

      ctx.restore();
    }
  }
}



function yyyrebuildOverlapLayer() {
  const g = layerOverlap;
  const ctx = g.drawingContext;
  g.clear();

  // 全体を一度だけ薄黄色で塗りつぶし（背景色）
  ctx.fillStyle = "rgba(255, 245, 200, 0.3)";
  ctx.fillRect(0, 0, g.width, g.height);

  for (let i = 0; i < arcs.length; i++) {
    if (!arcs[i].finished) continue;

    for (let j = i + 1; j < arcs.length; j++) {
      if (!arcs[j].finished) continue;

      ctx.save();

      ctx.globalCompositeOperation = "destination-in";

      [arcs[i], arcs[j]].forEach(a => {
        ctx.beginPath();
        ctx.moveTo(a.cx, a.cy);
        ctx.arc(a.cx, a.cy, a.r * 2, a.startAngle, a.endAngle);
        ctx.closePath();
        ctx.fill();
      });

      ctx.restore();
    }
  }
}



function gggrebuildOverlapLayer() {
  const g = layerOverlap;
  const ctx = g.drawingContext;
  g.clear();

  // 1. 黄色を全体に一度だけ塗る
  //ctx.fillStyle = "rgb(255,245,200,0.5)";
  ctx.fillStyle = "rgb(0,0,200,0.8)";
  ctx.fillRect(0, 0, g.width, g.height);

  // 2. クリップや合成操作で重なり部分のみ残す
  ctx.globalCompositeOperation = "destination-in";

  ctx.beginPath();
  for (let i = 0; i < arcs.length; i++) {
    if (!arcs[i].finished) continue;
    for (let j = i + 1; j < arcs.length; j++) {
      if (!arcs[j].finished) continue;

      // 2つの円弧のパスを重ねて描く
      [arcs[i], arcs[j]].forEach(a => {
        ctx.moveTo(a.cx, a.cy);
        ctx.arc(a.cx, a.cy, a.r * 2, a.startAngle, a.endAngle);
      });
    }
  }
  ctx.closePath();
  ctx.fill();

  // 合成モードを元に戻す
  ctx.globalCompositeOperation = "source-over";
}




function fffrebuildOverlapLayer() {
  const g = layerOverlap;
  const ctx = g.drawingContext;
  g.clear();  // 一回クリア

  ctx.fillStyle = "rgb(255,245,200)"; // 黄色
  ctx.globalCompositeOperation = "source-over";

  // 全部の重なり部分のパスをひとつにまとめてから黄色を塗る
  ctx.beginPath();

  for (let i = 0; i < arcs.length; i++) {
    if (!arcs[i].finished) continue;

    for (let j = i + 1; j < arcs.length; j++) {
      if (!arcs[j].finished) continue;

      // 2つの円弧の重なり（交差部分）を表すパスを作るために
      // ここでは単純に2つの弧を連結させたパスを作ります
      // ただし重なり部分だけ正確に抽出するには複雑な計算が必要です

      // ここは「和集合」ではなく「交差」部分のみ塗る意図なので、
      // clipやglobalCompositeOperationで重なり部分のみを抽出します

      ctx.save();

      // クリッピングを使って2つの弧の重なりを抽出
      ctx.beginPath();
      ctx.moveTo(arcs[i].cx, arcs[i].cy);
      ctx.arc(arcs[i].cx, arcs[i].cy, arcs[i].r * 2, arcs[i].startAngle, arcs[i].endAngle);
      ctx.closePath();

      ctx.clip();  // arcs[i]の範囲でクリップ

      // arcs[j]の円弧を重ねて塗る
      ctx.beginPath();
      ctx.moveTo(arcs[j].cx, arcs[j].cy);
      ctx.arc(arcs[j].cx, arcs[j].cy, arcs[j].r * 2, arcs[j].startAngle, arcs[j].endAngle);
      ctx.closePath();

      // arcs[j]のパスとclipの重なり部分だけに黄色を塗る
      ctx.fill();

      ctx.restore();
    }
  }
}



function eeerebuildOverlapLayer() {
  const g = layerOverlap;
  const ctx = g.drawingContext;
  g.clear(); // 1回だけクリア

  ctx.fillStyle = "rgb(255,245,200)";
  ctx.globalCompositeOperation = "source-over";

  for (let i = 0; i < arcs.length; i++) {
    if (!arcs[i].finished) continue;

    for (let j = i + 1; j < arcs.length; j++) {
      if (!arcs[j].finished) continue;

      ctx.save();

      // クリップ範囲を設定
      ctx.beginPath();
      [arcs[i], arcs[j]].forEach(a => {
        const startX = a.cx + a.r * 2 * Math.cos(a.startAngle);
        const startY = a.cy + a.r * 2 * Math.sin(a.startAngle);
        ctx.moveTo(startX, startY);
        ctx.arc(a.cx, a.cy, a.r * 2, a.startAngle, a.endAngle);
        ctx.closePath();
      });
      ctx.clip();

      // 重なり部分に黄色を塗る
      ctx.fillRect(0, 0, g.width, g.height);

      ctx.restore();
    }
  }
}




function dddrebuildOverlapLayer() {
  const g = layerOverlap;
  const ctx = g.drawingContext;
  g.clear();

  for (let i = 0; i < arcs.length; i++) {
    if (!arcs[i].finished) continue;

    for (let j = i + 1; j < arcs.length; j++) {
      if (!arcs[j].finished) continue;

      ctx.save();

      // クリア後に黄色で塗るのは1回だけにする
      ctx.globalCompositeOperation = "source-over";
      ctx.fillStyle = "rgb(255,245,200)";
      // まず塗りつぶすのではなく、透明な状態にしておく
      ctx.clearRect(0, 0, g.width, g.height);

      // 重なり部分だけを抜き出すために描画モードを切り替え
      ctx.globalCompositeOperation = "source-over";
      ctx.beginPath();
      [arcs[i], arcs[j]].forEach(a => {
        ctx.moveTo(a.cx + a.r * 2 * Math.cos(a.startAngle), a.cy + a.r * 2 * Math.sin(a.startAngle));
        ctx.arc(a.cx, a.cy, a.r * 2, a.startAngle, a.endAngle);
        ctx.closePath();
      });
      ctx.clip();

      // 黄色を重なり部分だけに塗る
      ctx.fillRect(0, 0, g.width, g.height);

      ctx.restore();
    }
  }
}



/** 薄黄色の塗 重なりだけ*/
function aaarebuildOverlapLayer() {
  const g = layerOverlap;
  const ctx = g.drawingContext;
  g.clear();

  for (let i = 0; i < arcs.length; i++) {
    if (!arcs[i].finished) continue;

    for (let j = i + 1; j < arcs.length; j++) {
      if (!arcs[j].finished) continue;

      ctx.save();

      // 黄色を全面に
      ctx.fillStyle = "rgb(255,245,200)";
      ctx.fillRect(0, 0, g.width, g.height);

      ctx.globalCompositeOperation = "destination-in";

      [arcs[i], arcs[j]].forEach(a => {
        ctx.beginPath();
        ctx.moveTo(a.cx, a.cy);
        ctx.arc(a.cx, a.cy, a.r * 2, a.startAngle, a.endAngle);
        ctx.closePath();
        ctx.fill();
      });

      ctx.restore();
    }
  }
}

function resetCircles() {
  circles = [];
}

function rebuildFillLayer() {
  const g = fillLayer;
  const ctx = g.drawingContext;

  g.clear();

  // 1. 薄紫：全円弧をパスとして結合し、一括塗り
  ctx.save();
  ctx.fillStyle = "rgb(220,200,240)";
  ctx.beginPath();
  for (let a of arcs) {
    if (!a.finished) continue;
    ctx.moveTo(a.cx, a.cy);
    ctx.arc(a.cx, a.cy, a.r * 2, a.startAngle, a.endAngle);
    ctx.closePath();
  }
  ctx.fill();
  ctx.restore();

  // 2. 薄黄色：各ペアの重なり部分を重ね塗り
  ctx.fillStyle = "rgb(255,245,200)";
  for (let i = 0; i < arcs.length; i++) {
    if (!arcs[i].finished) continue;
    for (let j = i + 1; j < arcs.length; j++) {
      if (!arcs[j].finished) continue;

      ctx.save();

      // 2つの円弧の重なり部分だけを抽出して塗る
      ctx.beginPath();
      ctx.moveTo(arcs[i].cx, arcs[i].cy);
      ctx.arc(arcs[i].cx, arcs[i].cy, arcs[i].r * 2, arcs[i].startAngle, arcs[i].endAngle);
      ctx.closePath();
      ctx.clip();

      ctx.beginPath();
      ctx.moveTo(arcs[j].cx, arcs[j].cy);
      ctx.arc(arcs[j].cx, arcs[j].cy, arcs[j].r * 2, arcs[j].startAngle, arcs[j].endAngle);
      ctx.closePath();
      ctx.clip();

      ctx.fillRect(0, 0, g.width, g.height);

      ctx.restore();
    }
  }
}



function drawArcFills() {
  const ctx = drawingContext;

  // ---------- ① 薄紫（union） ----------
  ctx.save();
  ctx.fillStyle = "rgb(220,200,240)";

  for (let a of arcs) {
    if (!a.finished) continue;

    ctx.save();
    clipArc(ctx, a);
    ctx.fillRect(0, 0, width, height);
    ctx.restore();
  }

  ctx.restore();

  // ---------- ② 薄黄色（overlap） ----------
  ctx.save();
  ctx.fillStyle = "rgb(255,245,200)";

  for (let i = 0; i < arcs.length; i++) {
    if (!arcs[i].finished) continue;

    for (let j = i + 1; j < arcs.length; j++) {
      if (!arcs[j].finished) continue;

      ctx.save();
      clipArc(ctx, arcs[i]);
      clipArc(ctx, arcs[j]);
      ctx.fillRect(0, 0, width, height);
      ctx.restore();
    }
  }

  ctx.restore();
}

function drawArcFill(a) {
  noStroke();

  // 外側：薄紫
  fill(220, 200, 240);
  arc(
    a.cx, a.cy,
    a.r * 2, a.r * 2,
    a.startAngle,
    a.endAngle
  );
}



function drawArcs() {

  // ① 塗り（finishedのみ）
  for (let a of arcs) {
    if (!a.finished) continue;
    drawArcFill(a);
  }

  // ② 重なり（既存ロジックをそのまま使える）
  drawAllOverlaps();

  // ③ 線（最前面）
  for (let a of arcs) {
    drawAnimatedArcLine(a);
  }
}

function drawAnimatedArcLine(a) {
  const elapsed = millis() - a.startTime;
  const progress = constrain(elapsed / DRAW_DURATION, 0, 1);

  const angle = lerp(a.startAngle, a.endAngle, progress);

  noFill();
  stroke(0);
  strokeWeight(2);

  arc(
    a.cx, a.cy,
    a.r * 2, a.r * 2,
    a.startAngle,
    angle
  );

  if (progress >= 1) a.finished = true;
}


function fillArcAsCircle(a) {
  noStroke();
  fill(220, 200, 240); // 薄紫

  const ctx = drawingContext;
  ctx.save();

  // 円弧でクリップ（閉領域を作る）
  ctx.beginPath();
  ctx.moveTo(a.cx, a.cy);
  ctx.arc(a.cx, a.cy, a.r * 2, a.startAngle, a.endAngle);
  ctx.closePath();
  ctx.clip();

  // 円全体を塗る（結果として円弧領域だけ残る）
  ellipse(a.cx, a.cy, a.r * 4, a.r * 4);

  ctx.restore();
}


function drawArcOverlap(a1, a2) {
  const ctx = drawingContext;
  ctx.save();

  // a1 の領域
  ctx.beginPath();
  ctx.moveTo(a1.cx, a1.cy);
  ctx.arc(a1.cx, a1.cy, a1.r * 2, a1.startAngle, a1.endAngle);
  ctx.closePath();
  ctx.clip();

  // a2 の領域
  ctx.beginPath();
  ctx.moveTo(a2.cx, a2.cy);
  ctx.arc(a2.cx, a2.cy, a2.r * 2, a2.startAngle, a2.endAngle);
  ctx.closePath();
  ctx.clip();

  noStroke();
  fill(255, 245, 200); // 薄黄色
  rect(0, 0, width, height);

  ctx.restore();
}



function drawCircles() {

  // ① 非重なり
  for (let i = 0; i < circles.length; i++) {
    drawCircleFill(circles[i], i);
  }

  // ② 重なり（今まで通り）
  drawAllOverlaps();

  // ③ 線（最前面）
  for (let i = 0; i < circles.length; i++) {
    drawAnimatedCircleLine(circles[i], i);
  }
}

function drawAnimatedCircleLine(c, index) {
  const elapsed = millis() - c.startTime;
  const progress = constrain(elapsed / DRAW_DURATION, 0, 1);

  noFill();
  stroke(0);
  strokeWeight(2);

  let totalAngle;
  if (c.arcType === "quarter") {
    totalAngle = HALF_PI;
  } else {
    totalAngle = PI;
  }

  const angleEnd = progress * totalAngle;

  // ===== 上半分 =====
  arc(
    c.cx, c.cy,
    c.r * 2, c.r * 2,
    PI, PI + angleEnd
  );

  // ===== 下半分 =====
  arc(
    c.cx, c.cy,
    c.r * 2, c.r * 2,
    0, angleEnd
  );

  if (progress >= 1) c.finished = true;
}


function drawAnimatedCircle(c) {
  const elapsed = millis() - c.startTime;
  const progress = constrain(elapsed / DRAW_DURATION, 0, 1);
  const angleEnd = progress * TWO_PI;

  push();
  translate(c.cx, c.cy);

  // ===== ① 途中経過の円弧（線） =====
  noFill();
  strokeWeight(2);
  stroke(0);
  arc(0, 0, c.r * 2, c.r * 2, HALF_PI, HALF_PI + angleEnd);

  if (progress >= 1 && !c.finished) {
    c.finished = true;
  }

  // ===== ② 塗りつぶし =====
  /*if (c.finished) {
    fillCircleColors(c.r);

    // ===== ③ 最後に「線だけ」描き直す（重要） =====
    noFill();
    stroke(0);
    strokeWeight(2);
    ellipse(0, 0, c.r * 2, c.r * 2);
  }
  */

  pop();
}


function drawGrid(spacing = 20) {
  stroke(180, 220, 240); // 薄水色
  strokeWeight(1);

  // 縦線
  for (let x = 0; x <= width; x += spacing) {
    line(x, 0, x, height);
  }

  // 横線
  for (let y = 0; y <= height; y += spacing) {
    line(0, y, width, y);
  }
}



function drawCircleFill(c, index) {
  if (!c.finished) return;

  noStroke();

  // ===== 上半分（オレンジ）=====
  fill(255, 180, 100);
  arc(
    c.cx, c.cy,
    c.r * 2, c.r * 2,
    PI, TWO_PI
  );

  // ===== 下半分（ピンク）=====
  fill(255, 170, 190);
  arc(
    c.cx, c.cy,
    c.r * 2, c.r * 2,
    0, PI
  );
}


function drawAllOverlaps() {
  noStroke();
  fill(255, 245, 200); // 薄黄色

  const ctx = drawingContext;

  for (let i = 0; i < circles.length; i++) {
    if (!circles[i].finished) continue;

    for (let j = i + 1; j < circles.length; j++) {
      if (!circles[j].finished) continue;

      ctx.save();

      // 円 i
      ctx.beginPath();
      ctx.arc(circles[i].cx, circles[i].cy, circles[i].r, 0, TWO_PI);
      ctx.clip();

      // 円 j
      ctx.beginPath();
      ctx.arc(circles[j].cx, circles[j].cy, circles[j].r, 0, TWO_PI);
      ctx.clip();

      // 共通部分だけ塗る
      rect(0, 0, width, height);

      ctx.restore();
    }
  }
}


function drawOverlapFill(c1, c2) {
  const ctx = drawingContext;
  ctx.save();

  // 円1でクリップ
  ctx.beginPath();
  ctx.arc(c1.cx, c1.cy, c1.r, 0, TWO_PI);
  ctx.clip();

  // 円2でさらにクリップ
  ctx.beginPath();
  ctx.arc(c2.cx, c2.cy, c2.r, 0, TWO_PI);
  ctx.clip();

  // 共通部分だけ塗られる
  noStroke();
  fill(255, 245, 200); // 薄黄色
  rect(0, 0, width, height);

  ctx.restore();
}
function drawCircleLine(c) {
  noFill();
  stroke(0);
  strokeWeight(2);
  ellipse(c.cx, c.cy, c.r*2, c.r*2);
}
 




function fillCircleColors(r) {
  noStroke();

  // 上：オレンジ
  fill(255, 180, 100);
  arc(0, 0, r * 2, r * 2, PI, TWO_PI);

  // 下：ピンク
  fill(255, 170, 190);
  arc(0, 0, r * 2, r * 2, 0, PI);

  // 中央：薄い黄色（肌色）
  fill(255, 245, 200);
  ellipse(0, 0, r, r);
}


function chkboxevent() { /**{{{*/
	isGridChecked = chkbox.checked();
}
/**}}}*/



/** マウスがドラッグされたら.
 * 図形外の時は、何もしない.
 * 図形内の時は、ドラッグすれば対象図形のみが移動し、レイヤーを最前列にする.
 * 図形内外で、各頂点から、許容量以内の場合は回転モードにする.
 * mousePressed()メソッドで、どの図形を選択しているかの情報は得ているので、
 * 回転か移動かの判断はここのメソッドだけで判断してもよい.
 */
function mouseDragged() { /** {{{*/
  if ( dragging ) {
    offsetX += (mouseX - lastMouseX);
    offsetY += (mouseY - lastMouseY);
    lastMouseX = mouseX;
    lastMouseY = mouseY;
  }
}
/** }}}*/

/** マウスのドラッグが終わったら*/
function mouseReleased() { /** {{{*/
  dragging = false;
}
/**}}}*/

//---------------------------------------
// ★ マウスホイールで、"マウス位置を中心に" ズーム
//---------------------------------------
function mouseWheel(event) { /** {{{*/
  let zoom = 1.0;

  if (event.delta > 0) zoom = 0.9;   // ズームアウト
  else zoom = 1.1;                   // ズームイン

  // マウス座標をキャンバスの座標系に変換
  const wx = (mouseX - offsetX) / wholeScale;
  const wy = (mouseY - offsetY) / wholeScale;

  // ズーム適用
  wholeScale *= zoom;

  // ズーム位置の中心がマウスになるようにオフセット調整
  offsetX = mouseX - wx * wholeScale;
  offsetY = mouseY - wy * wholeScale;

  return false; // ブラウザのスクロールを防ぐ
}
/**}}}*/


/** mousePressedイベント. もしかしたらtouchとかも考えないといけないかもしれないから、一応分割した.
 * @param pinputX pmouseXか、ptouchXのどっちか.		@type {Number}
 * @param pinputY pmouseYか、ptouchYのどっちか.		@type {Number}
 * @param inputX mouseXか、touches[0].xのどっちか.	@type {Number}
 * @param inputY mouseYか、touches[0].yのどっちか.	@type {Number}
 */
function pressProcess( pinputX, pinputY, inputX, inputY  ) { /** {{{*/
  dragging = true;
  lastMouseX = mouseX;
  lastMouseY = mouseY;
}
/**}}}*/


/** マウスが押下されたイベント.touchStartedにも対応するために、そのまんまpressProcessに流す. */
function mousePressed() { /** {{{*/
	pressProcess( pmouseX, pmouseY, mouseX, mouseY );
}
/** }}}*/

/** タッチクリックされたイベント. 
 * mousePressedにも対応するために、そのまんまpressProcessに流しているが、
 * タッチモードでは、createButtonに対応していない.
 * そのため、タッチされた時の座標からボタンイベント判別している.*/
function touchStarted() { /** {{{*/
    isDragging = true;

     // finger 0 の位置を使う
      lastTouchX = touches[0].x;
      lastTouchY = touches[0].y;
}
/**}}}*/



function windowResized() { /** {{{*/
  resizeCanvas(BASE_WIDTH, BASE_HEIGHT);
  
  const scaleX = windowWidth / BASE_WIDTH;
  const scaleY = windowHeight / BASE_HEIGHT;
  const scaleFactor = min(scaleX, scaleY);

  //draw();
}
/**}}}*/


/**1フレームごとに実行.processing,p5jsでは、ここがループしている.
 */
function draw(){ /** {{{*/
  //現在のパン・ズーム状態を適用
  translate( offsetX, offsetY);
  scale(wholeScale);


	/* マウスでもタッチでもどちらでも対応できるように、PCではマウス、タブレット、スマホではタッチ対応にさせる.*/
	let pinputX;	//前のX座標
	let pinputY;	//前のY座標
	let inputX;		//現在のX座標
	let inputY;		//現在のY座標

  //画面の実サイズを取得
  const scaleX = windowWidth / BASE_WIDTH;
  const scaleY = windowHeight / BASE_HEIGHT;
  const scaleFactor = min (scaleX, scaleY);   //縦横の縮尺のうち、小さい方を使う(縦横比を保つ)

  //キャンバス全体を拡大縮小
  push();
  scale(scaleFactor); 

  drawBackground();
  drawGrid(100);

 /* rebuildUnionLayer();
  rebuildOverlapLayer();

  drawFills();
  */
  drawLines();
  image(layerUnion, 0, 0);
  image(layerOverlap, 0, 0);

  //塗
  //drawArcFills();

  //image(fillLayer, 0, 0); //ぬり
  /*image(layerUnion, 0, 0); //薄紫
  image(layerOverlap, 0, 0); //うす黄色


  for ( let a of arcs ) {
    drawAnimatedArc(a);
  }
*/
  pop();

}
/** }}}*/


/**背景を描画する*/
function drawBackground() { /** {{{*/
    stroke(0);
  strokeWeight(1);
		background( 255, 255, 204 );
	for ( var iCounter = 0; iCounter < iHeight; iCounter+=20 ) {
		for ( var jCounter = 0; jCounter < iWidth; jCounter += 20 ) {
			point( jCounter, iCounter );
		}
	}
}
/**}}}*/


function addArc() {
  const n = arcs.length;

  let cx, cy, startA, endA;

  if (n === 0) {
    // ①
    cx = 0; cy = /*4*/0;
    startA = 0;
    endA = HALF_PI;
  } else if (n === 1) {
    // ②
    cx = 0; cy = 2;
    startA = 1.5 * PI;
    endA = TWO_PI;
  } else {
    // ③以降
    const k = n - 2;
    const col = Math.floor(k / 2) + 1;

    if (k % 2 === 0) {
      // 上半円
      cx = 2 * col;
      cy = /*0*/2;
      startA = PI;
      endA = TWO_PI;
    } else {
      // 下半円
      cx = 2 * col ;
      cy = 0;
      startA = 0;
      endA = PI;
      
    }
  }

  arcs.push({
    cx: cx * UNIT,
    cy: cy * UNIT,
    r: R,
    startAngle: startA,
    endAngle: endA,
    startTime: millis(),
    finished: false
  });
}


function drawAnimatedArc(a) {
  const elapsed = millis() - a.startTime;
  const progress = constrain(elapsed / DRAW_DURATION, 0, 1);

  const angle = lerp(a.startAngle, a.endAngle, progress);

  noFill();
  stroke(0);
  strokeWeight(2);

  arc(
    a.cx, a.cy,
    a.r * 4, a.r * 4,
    a.startAngle,
    angle
  );

  if (progress >= 1 && !a.finished) {
    a.finished = true;
    // ここでだけ塗りレイヤーを更新
    rebuildUnionLayer();
    rebuildOverlapLayer();
  }
}


/** numの奇数と偶数でa.cyの値を下げる・上げる*/
function aaadrawAnimatedArc(a) {
  const elapsed = millis() - a.startTime;
  const progress = constrain(elapsed / DRAW_DURATION, 0, 1);

  const angle = lerp(a.startAngle, a.endAngle, progress);

  noFill();
  stroke(0);
  strokeWeight(2);

  
  arc(
    a.cx, a.cy,
    a.r * 4, a.r * 4,
    a.startAngle,
    angle
  );

//  if (progress >= 1) a.finished = true;
  
  if (progress >= 1 && !a.finished) {
    a.finished = true;
    //rebuildFillLayer();
//rebuildUnionLayer();
  //rebuildOverlapLayer();
  }
}

