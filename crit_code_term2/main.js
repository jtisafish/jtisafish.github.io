// this sketch is intended to process the RECORDING OF FILES, and UPLOADING TO SUPABASE

// I might set the mic as a global variable to make a spectrogram later in another file for clarity.

let mic, recorder, crusher, gainMaster, fft;
let lastRecordingName;
let noBottles = false;
let recordButton,
  stopButton,
  playLastRecordingButton,
  passBottleButton,
  saveBottleButton,
  startButton; // the button logic is all over the place but somehow works
let player;
let bottlePassTime = 0; // this variable tracks the how many times the last bottle that could be played from the website has been re-recorded over

// Define possible button states
const buttonStates = {
  DISABLED: "disabled",
  ENABLED: "enabled",
  RECORDING: "recording",
  LOADING: "loading",
  TEMP:"tempMessage"
};
let currentButtonState = buttonStates.DISABLED; // initial state

let userConsole = " ";
let tempMessage = false;

async function setup() {
  // async because I'm gonna access bottlePassTime in supabase (metadata)
  createCanvas(windowWidth, windowHeight);
  textFont(myFont);
  textSize(24);
  preloadSound(); // preload sound from tone
  console.log("Supabase Instance: ", supabase);
  recordButton = createButton("New");
  // recordButton.style('background-color', 'orange');
  recordButton.style('width', '142.5px');
  recordButton.style('height', '81.5px');
  recordButton.position(width/12 +330, 405);
  recordButton.style('font-family', 'Gill Sans'); 
  // recordButton.position(10, 190);
  recordButton.mousePressed(() => {
    buttonSound.start();
    recordSound();
  });

  stopButton = createButton("Stop & Send");
  stopButton.style('width', '142.5px');
  stopButton.style('height', '81.5px');
  stopButton.position(width/12 +330+155, 405);
  stopButton.style('font-family', 'Gill Sans'); 
  stopButton.mousePressed(() => {
    buttonSound.start();
    stopSound();
  });

  playLastRecordingButton = createButton("Listen to Last");
  playLastRecordingButton.style('width', '142.5px');
  playLastRecordingButton.style('height', '81.5px');
  playLastRecordingButton.position(width/12 +330, 405+10+81.5);
  playLastRecordingButton.style('font-family', 'Gill Sans'); 
  playLastRecordingButton.mousePressed(() => {
    buttonSound.start();
    playLastRecording();
  });

  passBottleButton = createButton("Record Over");
  passBottleButton.style('width', '142.5px');
  passBottleButton.style('height', '81.5px');
  passBottleButton.position(width/12 +330+155, 405+10+81.5);
  passBottleButton.style('font-family', 'Gill Sans'); 
  passBottleButton.mousePressed(() => {
    buttonSound.start();
    playAndRecord();
  });

  saveBottleButton = createButton("Save Last Bottle to Local");
  saveBottleButton.style('width', '300px');
  saveBottleButton.style('height', '81.5px');
  saveBottleButton.position(width/12 +330+320, 405+10+81.5);
  saveBottleButton.style('font-family', 'Gill Sans'); 
  saveBottleButton.mousePressed(() => {
    buttonSound.start();
    saveToLocal();
  });

  // set initial button states
  setButtonState(buttonStates.DISABLED);

  // I'm fetching bottlePassTime after opening the mic, it's not ideal but i can't be bothered to write a default message in between the states. Don't have time
  startButton = createButton("Start");
  startButton.style('font-family', 'Gill Sans'); 
  startButton.position(20, 20);
  startButton.mousePressed(() => {
    Tone.start();
    mic
      .open()
      .then(async () => {
        console.log("mic open!");
        userConsole = "Initialized!";
        startSound.start();
        setButtonState(buttonStates.ENABLED); // Set the state to ENABLED after mic is open
        startButton.attribute("disabled", "");

        await fetchBottlePassTime();
      })
      .catch((e) => {
        console.error("mic not open ;-;", e);
      });
  });

  audioflow();

}

async function fetchBottlePassTime() {
  try {
    const { data, error } = await supabase
      .from("bottle_pass")
      .select("bottlePassTime")
      .eq("id", 1)
      .single();

    if (error) {
      console.error("Error fetching bottlePassTime:", error);
      bottlePassTime = 0; // Set a default value in case of an error
    } else {
      bottlePassTime = data.bottlePassTime;
    }
  } catch (error) {
    console.error("Error fetching/initializing bottlePassTime:", error);
    bottlePassTime = 0;
  }
}

// Function to update bottlePassTime in Supabase
async function updateBottlePassTime() {
  try {
    const { error } = await supabase
      .from("bottle_pass")
      .update({ bottlePassTime: bottlePassTime })
      .eq("id", 1);

    if (error) {
      console.error("Error updating bottlePassTime:", error);
    } else {
      console.log(
        "bottlePassTime updated successfully in Supabase:",
        bottlePassTime,
      );
    }
  } catch (error) {
    console.error("Error updating bottlePassTime in Supabase:", error);
  }
}


async function recordSound() {
  bottlePassTime = 0;
  await updateBottlePassTime(); // update Supabase w new value
  recorder.start();
  console.log("Recording started ^^");
  setButtonState(buttonStates.RECORDING); // Set button states for recording
}

async function stopSound() {
  try {
    setButtonState(buttonStates.LOADING); // Set button states for loading
    // Stop recording manually when the user presses stop
    const recording = await recorder.stop(); // basically you can extend the current recording or make it shorter
    // generating a timeStamp (machine readible) so that every time a new recording is done there's a unique name
    // so we can easily record and store multiple audiofiles into supabase storage - bottles
    let timeRn = Date.now(); // Date.now is js function
    let fileName = `${timeRn}.webm`; // this syntax combines stuff into string
    console.log(fileName);
    const audioFile = new File([recording], fileName, { type: "audio/webm" }); // create an audioFile with the generated name, of type webm. Webm because tone.recorder only supports that
    await saveRecording(audioFile); // Upload the recording, beautiful async function.
    lastRecordingName = fileName; // Update the last recording name
    console.log("Recording stopped and sent :)");

    // Optionally stop playback if it's still playing
    if (player) {
      player.stop(); // banger code, great decision. It cuts the audio playing if the user decides to press stopButton earlier.
    }
    setButtonState(buttonStates.ENABLED); // Set button states back to enabled
  } catch (error) {
    console.error("Error stopping recorder or uploading file ;-; :", error); // ;-; is so fucking cute
    setButtonState(buttonStates.ENABLED); // Set button states back to enabled
  }
}

async function playLastRecording() {
  try {
    await waitForResponse(async () => {
      setButtonState(buttonStates.LOADING); // Set button states for loading
      // Query the database to get the filename of the last recording
      // so cool!!!
      const { data, error } = await supabase // getting data from metadata table
        .from("bottle_names")
        .select("filename")
        .order("timestamp", { ascending: false }) // if ascending: true then it's the oldest
        .limit(1); // the newest file according to timestamp

      if (error) {
        console.error("Error fetching last recording metadata ;-; :", error);
        setButtonState(buttonStates.ENABLED); // setting button logic on error
        return;
      }

      if (!data || data.length === 0) {
        console.log("No recordings found.");
        noBottles = true;
        setButtonState(buttonStates.ENABLED); //
        return; // return because it exits the function!! so optimized!!
      }

      noBottles = false;
      lastRecordingName = data[0].filename; // get the filename of the last recording from the metadata to load it from storage!
      // FOR FUTURE JT: basically I saved the audiofiles with a name (js Date.now), and I made a parallel metadata table to store the index and timestamp (that timestamp is supabase default).
      // both databases share the same file name, that's how they are paired together!

      // Download the last recording from storage
      const { data: audioBlob, error: downloadError } = await supabase.storage // beautiful async function
        .from("bottles")
        .download(lastRecordingName);

      if (downloadError) {
        console.error("Error downloading file:", downloadError);
        setButtonState(buttonStates.ENABLED); // setting button logic on download error
        // it's never failed so far so idk if the button logic works here
        return;
      }

      // Create a URL for the audio // url is faster to load?
      const audioUrl = URL.createObjectURL(audioBlob);

      // Initialize Tone.js if not already started
      if (!Tone.Context.state === "running") {
        await Tone.start();
      }

      // Load and play the audio using Tone.js
      player = new Tone.Player(audioUrl).toDestination();
      await Tone.loaded();
      player.start();
      setButtonState(buttonStates.DISABLED); // Disable buttons while playing

      // Re-enable buttons after playback is finished
      player.onstop = () => {
        setButtonState(buttonStates.ENABLED);
      };
    });
  } catch (error) {
    console.error("Error playing last recording:", error);
    setButtonState(buttonStates.ENABLED); // setting button logic on error
  }
}

async function playAndRecord() {
  // redundancy with playLastRecording, but somehow works faster this way
  try {
    await waitForResponse(async () => {
      setButtonState(buttonStates.LOADING); // Set button states for loading
      // Query the database to get the filename of the last recording
      const { data, error } = await supabase
        .from("bottle_names")
        .select("filename")
        .order("timestamp", { ascending: false })
        .limit(1);

      if (error) {
        console.error("Error fetching last recording metadata:", error);
        setButtonState(buttonStates.ENABLED); // setting button logic on error
        return;
      }

      if (!data || data.length === 0) {
        console.log("No recordings found.");
        noBottles = true;
        setButtonState(buttonStates.ENABLED); // setting button logic on no bottles
        return;
      }

      noBottles = false;
      lastRecordingName = data[0].filename;

      // Download the last recording
      const { data: audioBlob, error: downloadError } = await supabase.storage
        .from("bottles")
        .download(lastRecordingName);

      if (downloadError) {
        console.error("Error downloading file:", downloadError);
        setButtonState(buttonStates.ENABLED); // setting button logic on download error
        return;
      }

      // Create a URL for the audio
      const audioUrl = URL.createObjectURL(audioBlob);

      // Initialize Tone.js if not already started
      if (!Tone.Context.state === "running") {
        await Tone.start();
      }

      // Load and play the audio using Tone.js
      player = new Tone.Player(audioUrl).toDestination();
      await Tone.loaded();
      player.start();

      // Start the recording process
      recorder.start();
      setButtonState(buttonStates.RECORDING); // Set button states for playing and recording
      stopButton.removeAttribute("disabled"); // Enable stop button

      // Don't stop recording when the audio ends (manual control instead)
      player.onstop = () => {
        console.log("Playback finishes");
      };
    });
  } catch (error) {
    console.error("Error playing and recording:", error);
    setButtonState(buttonStates.ENABLED); // setting button logic on error
  }
}

async function saveRecording(file) {
  try {
    await waitForResponse(async () => {
      setButtonState(buttonStates.LOADING); // Set button states for loading

      // Upload the (audio) file to Supabase STORAGE
      const { data } = await supabase.storage
        .from("bottles")
        .upload(file.name, file, {
          contentType: "audio/webm",
        });

      console.log("File uploaded successfully :D", data);

      // Insert metadata into the database, to SORT THE LAST RECORDING
      const { data: dbInsert, error } = await supabase
        .from("bottle_names")
        .insert([{ filename: file.name }]);

      if (error) {
        console.error("Error inserting metadata:", error);
      } else {
        console.log("Metadata inserted successfully :D");
      }
      bottlePassTime++;
      noBottles = false;
      await updateBottlePassTime();
    });
    setButtonState(buttonStates.ENABLED); // setting button logic on success
  } catch (error) {
    console.error("Error saving recording:", error);
    setButtonState(buttonStates.ENABLED); // setting button logic on error
  }
}

// Centralized button state management function
function setButtonState(state) {
  currentButtonState = state;

  switch (state) {
    case buttonStates.DISABLED:
      recordButton.attribute("disabled", "");
      stopButton.attribute("disabled", "");
      playLastRecordingButton.attribute("disabled", "");
      passBottleButton.attribute("disabled", "");
      saveBottleButton.attribute("disabled", "");
      break;

    case buttonStates.ENABLED:
      recordButton.removeAttribute("disabled");
      stopButton.attribute("disabled", "");
      playLastRecordingButton.removeAttribute("disabled");
      passBottleButton.removeAttribute("disabled");
      saveBottleButton.removeAttribute("disabled");
      break;

    case buttonStates.RECORDING:
      recordButton.attribute("disabled", "");
      stopButton.removeAttribute("disabled");
      playLastRecordingButton.attribute("disabled", "");
      passBottleButton.attribute("disabled", "");
      saveBottleButton.attribute("disabled", "");
      break;

    case buttonStates.LOADING:
      recordButton.attribute("disabled", "");
      stopButton.attribute("disabled", "");
      playLastRecordingButton.attribute("disabled", "");
      passBottleButton.attribute("disabled", "");
      saveBottleButton.attribute("disabled", "");
      break;

    default:
      console.warn("Unknown button state:", state);
  }
}

function saveToLocal(){
  // placeholder function
  tempMessage = true;
}

