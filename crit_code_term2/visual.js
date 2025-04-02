let myFont;
let history=[];
let binSize = Tone.getContext().sampleRate / 2 / 64;

function preload(){
  myFont = loadFont('fonts/subway.ttf');
  sea = loadImage("img/sea.jpg");
  
}

function draw() {
    rectMode(CENTER);
    textAlign(CENTER);
    background(245);
    image(sea, 0, 120, width, width/7);
    textSize(24);
    fill(0);
    text('MESSAGE IN A BOTTLE', width/12+150, 100);
    spectrum();
    fill(255);
    rect(width/12 +480, 375, 300, 35);
    rect(width/12 +800, 375, 300, 35);
    fill(255,100);
    rect(width/12 +800, 445, 300, 81.5);
    fill(0);
    // text(`x: ${mouseX} y: ${mouseY}`, 200, 50);
    textSize(20);
    fill(0);
    text('LAUNCHPAD',width/12 +480,385);
    fill('orange');
    text('notes to traveller',width/12 +800,385);

    fill(20);
    textSize(14);
    if (noBottles === true) {
      text("No bottles yet.", width/12 +800,440);
    } else {
      text("Bottle passed times: " + bottlePassTime, width/12 +800,440);
    } 
    // recycling the button state to make a rudimentary userConsole
    switch (currentButtonState) {
      case buttonStates.RECORDING:
        userConsole = "Recording bottle";
        fill(255,0,0);
        circle(445,90,10);
        break;
      case buttonStates.LOADING:
        fill(20);
        userConsole = "Connecting to the ocean...";
        break;
      case buttonStates.ENABLED:
        userConsole = " ";
        break;
      case buttonStates.DISABLED:
        userConsole = " ";
        break;
    }
    text(userConsole, width/12 +800,460);

    if (tempMessage === true){
        text('Its not safe yet >o<',920,620);
    }

    fill(255);
    textSize(10);
    textAlign(RIGHT);
    text ('photo by hazel on unsplash',width-10,330);
  }

  function spectrum(){
    if (!fft) return; // make sure there's value
    let spectrum = fft.getValue();
    history.push(spectrum);
  
    // keep only value on frame
    if (history.length > width) {
      history.shift();
    }
  
    for (let x = 0; x < history.length; x += 2) {
      for (let y = 0; y < spectrum.length; y += 2) {
        let intensity = map(history[x][y], -100, 0, 0, 255);
        let sz = map(intensity, 0, 255, 5, 20);
        let rain = map(y, 0, 32, 170, 300);
        noStroke();
        fill(255,20);
        ellipse(x, rain, sz / 1.2, sz * 3);
      }
    }
  }