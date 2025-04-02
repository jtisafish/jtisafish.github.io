let waitingSound, buttonSound, startSound, gainNode;

async function preloadSound() {
  try {
    waitingSound = new Tone.Player("sound/sea.wav");
    buttonSound = new Tone.Player("sound/button.wav");
    startSound = new Tone.Player("sound/start.wav");
    gainNode = new Tone.Gain(0).toDestination(); // Start with volume at 0
    waitingSound.connect(gainNode);
    buttonSound.toDestination();
    startSound.toDestination();
  } catch (error) {
    console.error("Error loading sound:", error);
  }
}

async function waitForResponse(asyncFunction) {
  try {
    // disable buttons
    setButtonState(buttonStates.LOADING);

    gainNode.gain.linearRampToValueAtTime(1, Tone.now() + 2); // Fade in over 2 seconds
    waitingSound.start(); // Start playing the waiting sound
    await asyncFunction(); // Wait for the asynchronous operation to complete
    // enable buttons

    gainNode.gain.linearRampToValueAtTime(0, Tone.now() + 2); // Fade out over 2 seconds
    setTimeout(() => {
      waitingSound.stop(); // Stop the sound after fade out
    }, 2000); // Wait for fade out to complete
  } catch (error) {
    console.error("Error waiting for response:", error);
    gainNode.gain.linearRampToValueAtTime(0, Tone.now() + 2); // Fade out if error
    setTimeout(() => {
      waitingSound.stop(); // Stop the sound after fade out
    }, 2000); // Wait for fade out to complete
    setButtonState(buttonStates.ENABLED); // setting button logic on error
  }
}
// set up our TONE stuff
function audioflow() {
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