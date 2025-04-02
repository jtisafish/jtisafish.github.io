let waitingSound, buttonSound, startSound, gainNode;

async function preloadSound() {
  try {
    waitingSound = new Tone.Player("sound/sea.wav");
    buttonSound = new Tone.Player("sound/button.wav");
    startSound = new Tone.Player("sound/start.wav");
    gainNode = new Tone.Gain(0).toDestination(); // start with volume at 0 source: https://tonejs.github.io/docs/r13/Gain
    waitingSound.connect(gainNode);
    buttonSound.toDestination();
    startSound.toDestination();
  } catch (error) {
    console.error("Error loading sound:", error);
  }
}

async function waitForResponse(asyncFunction) {
  try {
    setButtonState(buttonStates.LOADING);
    gainNode.gain.linearRampToValueAtTime(1, Tone.now() + 2); // fade in over 2 seconds
    waitingSound.start(); // start playing waiting sound
    await asyncFunction();
    // setButtonState(buttonStates.ENABLED);
    gainNode.gain.linearRampToValueAtTime(0, Tone.now() + 2); // fade out over 2 seconds
    setTimeout(() => {
      waitingSound.stop();
    }, 2000); // wait for fade out to complete
  } catch (error) {
    console.error("Error waiting for response:", error);
    gainNode.gain.linearRampToValueAtTime(0, Tone.now() + 2); // Fade out if error
    setTimeout(() => {
      waitingSound.stop(); // stop the sound after fade out
    }, 2000); // wait for fade out to complete
    setButtonState(buttonStates.ENABLED); // setting button logic on error
  }
}
// set up our TONE stuff
function audioflow() {
  // all documentation can be found here: https://tonejs.github.io/docs/15.0.4/index.html
  recorder = new Tone.Recorder();
  crusher = new Tone.BitCrusher(11);
  gainMaster = new Tone.Gain(-10);
  mic = new Tone.UserMedia();
  fft = new Tone.FFT(32);
  mic.connect(fft);
  fft.connect(crusher);
  crusher.connect(gainMaster);
  gainMaster.connect(recorder);
}