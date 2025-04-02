// this sketch is intended to process the RECORDING OF FILES, and UPLOADING TO SUPABASE

let mic, recorder, crusher, gainMaster, fft;
let recordButton,
  stopButton,
  playLastRecordingButton,
  passBottleButton,
  saveBottleButton,
  startButton;
let player;
let bottlePassTime = 0; // this variable tracks the how many times the last bottle that could be played from the website has been re-recorded over
let lastRecordingName; // fetches the name of the last bottle, for playback
let noBottles = false; // this is for to debug in case the user presses play last bottle, and there are no bottles

// Centralized button system, could probably be better
const buttonStates = {
  DISABLED: "disabled",
  ENABLED: "enabled",
  RECORDING: "recording",
  LOADING: "loading",
  TEMP: "tempMessage",
};
let currentButtonState = buttonStates.DISABLED; // initial state

let userConsole = " "; // a string that can be updates, to show some info about the project under "notes for traveller"
let tempMessage = false; // temporary message. this is a placeholder

async function setup() {
  // js async functions. source: https://www.w3schools.com/Js/js_async.asp.
  // async because I'm gonna access bottlePassTime in supabase (metadata)
  // async seems like a useful type of function for system / game development? Because it's using code to build a mechanism
  createCanvas(windowWidth, windowHeight);
  textFont(myFont);
  textSize(24);
  preloadSound(); // preload sound from tone
  console.log("Supabase Instance: ", supabase);
  recordButton = createButton("New");
  recordButton.style("width", "142.5px"); // I learnt this from p5element.style
  recordButton.style("height", "81.5px");
  recordButton.position(width / 12 + 330, 405);
  recordButton.style("font-family", "Gill Sans"); // browser friendly font family
  recordButton.mousePressed(() => {
    // arrow functions, describe functions that aren't explicitly named: https://stackoverflow.blog/2019/09/12/practical-ways-to-write-better-javascript/.
    buttonSound.start();
    recordSound();
  });

  stopButton = createButton("Stop & Send");
  stopButton.style("width", "142.5px");
  stopButton.style("height", "81.5px");
  stopButton.position(width / 12 + 330 + 155, 405);
  stopButton.style("font-family", "Gill Sans");
  stopButton.mousePressed(() => {
    buttonSound.start();
    stopSound();
  });

  playLastRecordingButton = createButton("Listen to Last");
  playLastRecordingButton.style("width", "142.5px");
  playLastRecordingButton.style("height", "81.5px");
  playLastRecordingButton.position(width / 12 + 330, 405 + 10 + 81.5);
  playLastRecordingButton.style("font-family", "Gill Sans");
  playLastRecordingButton.mousePressed(() => {
    buttonSound.start();
    playLastRecording();
  });

  passBottleButton = createButton("Record Over");
  passBottleButton.style("width", "142.5px");
  passBottleButton.style("height", "81.5px");
  passBottleButton.position(width / 12 + 330 + 155, 405 + 10 + 81.5);
  passBottleButton.style("font-family", "Gill Sans");
  passBottleButton.mousePressed(() => {
    buttonSound.start();
    playAndRecord();
  });

  saveBottleButton = createButton("Save Last Bottle to Local");
  saveBottleButton.style("width", "300px");
  saveBottleButton.style("height", "81.5px");
  saveBottleButton.position(width / 12 + 330 + 320, 405 + 10 + 81.5);
  saveBottleButton.style("font-family", "Gill Sans");
  saveBottleButton.mousePressed(() => {
    buttonSound.start();
    saveToLocal();
  });

  setButtonState(buttonStates.DISABLED); // disabled until microphone is initialized, so the user can participate in message in a bottle

  // I'm fetching bottlePassTime after opening the mic, it's not ideal but i don't have time to write a default message in between the states.
  startButton = createButton("Start");
  startButton.style("font-family", "Gill Sans");
  startButton.position(20, 20);
  startButton.mousePressed(() => {
    Tone.start();
    mic
      .open()
      .then(async () => {
        // async + arrow function!
        console.log("mic open!"); // maybe async try catch is better?? I got this code from my previous project
        userConsole = "Initialized!"; // update the string
        startSound.start();
        setButtonState(buttonStates.ENABLED); // Set the state to ENABLED after mic is open.
        startButton.attribute("disabled", ""); // the start button will remain disabled for the rest of the interaction.
        await fetchBottlePassTime();
      })
      .catch((e) => {
        console.error("mic not open ;-;", e); // friendly debug
      });
  });

  audioflow();
}

async function fetchBottlePassTime() {
  // in hindsight not ideal because it only refreshes once, when opening the page. I thought it was fine but I overlooked how popular the bottle app came out to be.
  try {
    const { data, error } = await supabase // written with the help of Perplexity AI! transcript available
      // also, I referenced the supabase documentation, 'using filters' : https://supabase.com/docs/reference/javascript/using-filters
      // Destructuring Assignment Syntax, unpacks object properties into variables. source: https://www.w3schools.com/JS/js_const.asp
      .from("bottle_pass") // my metadata table in supabase
      .select("bottlePassTime") // select is reading data. the name of the column that stores the integer of how many times the bottle is recorded over
      .eq("id", 1) // check the row where id = 1. there's only 1 row in the table tho, and the ID is 1.
      .single(); // only see 1 row

    if (error) {
      console.error("Error fetching bottlePassTime:", error); // in the case where there are no rows in the table // my current best solution is to manually 1 row in the table when reinitializing the system.
      bottlePassTime = 0; // Set a default value in case of an error.
      bottlePassTime = data.bottlePassTime; // else, update the bottlePassTime on the user's end
    }
  } catch (error) {
    // runtime error
    console.error("Error fetching/initializing bottlePassTime:", error);
    bottlePassTime = 0;
  }
}

// Function to update bottlePassTime in Supabase
async function updateBottlePassTime() {
  try {
    const { error } = await supabase // same ref, https://supabase.com/docs/reference/javascript/using-filters
      .from("bottle_pass")
      .update({ bottlePassTime: bottlePassTime }) // updating data
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
  await updateBottlePassTime();
  recorder.start();
  console.log("Recording started ^^");
  setButtonState(buttonStates.RECORDING);
}

async function stopSound() {
  try {
    setButtonState(buttonStates.LOADING);
    // Stop recording manually when the user presses stop
    const recording = await recorder.stop(); // basically you can extend the current recording or make it shorter
    // generating a timeStamp (machine readible) so that every time a new recording is done there's a unique name
    // so we can easily record and store multiple audiofiles into supabase storage - bottles
    // my genius idea
    let timeRn = Date.now(); // Date.now is js function. source: https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Date/now
    let fileName = `${timeRn}.webm`; // 'template literals', this syntax combines stuff into string. source: https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Template_literals
    console.log(fileName);
    const audioFile = new File([recording], fileName, { type: "audio/webm" }); // create an audioFile with the generated name, of type webm. Webm because tone.recorder only supports that.
    // recorder source: https://tonejs.github.io/docs/14.7.77/Recorder
    // make file using js file API: https://developer.mozilla.org/en-US/docs/Web/API/File_API
    await saveRecording(audioFile); // Upload the recording, beautiful async function.
    lastRecordingName = fileName; // Update the last recording name
    console.log("Recording stopped and sent :)");

    if (player) {
      player.stop(); // banger code, great decision. It cuts the audio playing if the user decides to press stopButton earlier.
    }
    setButtonState(buttonStates.ENABLED);
  } catch (error) {
    console.error("Error stopping recorder or uploading file ;-; :", error);
    setButtonState(buttonStates.ENABLED);
  }
}

async function playLastRecording() {
  try {
    await waitForResponse(async () => {
      setButtonState(buttonStates.LOADING);
      // Query the database to get the filename of the last recording
      // so cool!!!
      const { data, error } = await supabase // getting data from metadata table
        .from("bottle_names")
        .select("filename")
        .order("timestamp", { ascending: false }) // if ascending: true then it's the oldest
        .limit(1); // the newest file according to timestamp

      if (error) {
        console.error("Error fetching last recording metadata ;-; :", error);
        setButtonState(buttonStates.ENABLED);
        return;
      }

      if (!data || data.length === 0) {
        console.log("No recordings found.");
        noBottles = true;
        setButtonState(buttonStates.ENABLED);
        return; // return because it exits the function!! so optimized!!
      }

      noBottles = false;
      lastRecordingName = data[0].filename; // get the filename of the last recording from the metadata to load it from storage!
      // FOR FUTURE JT: basically I saved the audiofiles with a name (js Date.now), and I made a parallel metadata table to store the index and timestamp (that timestamp is supabase default).
      // both databases share the same file name, that's how they are paired together!

      // Download the last recording as Blob from storage: because supabase doesn't store URL
      const { data: audioBlob, error: downloadError } = await supabase.storage // blob: binary data with type. source: https://fa.javascript.info/blob
        .from("bottles")
        .download(lastRecordingName);

      if (downloadError) {
        console.error("Error downloading file:", downloadError);
        setButtonState(buttonStates.ENABLED); // setting button logic on download error
        // it's never failed so far so idk if the button logic works here
        return;
      }

      // Create a URL for the audio // tone.player only supports url: https://tonejs.github.io/docs/r13/Player
      const audioUrl = URL.createObjectURL(audioBlob);

      // initialize Tone.js if not already started
      if (!Tone.Context.state === "running") {
        await Tone.start();
      }

      // load and play the audio w tone.js
      player = new Tone.Player(audioUrl).toDestination();
      await Tone.loaded();
      player.start();
      setButtonState(buttonStates.DISABLED);

      player.onstop = () => {
        setButtonState(buttonStates.ENABLED);
      };
    });
  } catch (error) {
    console.error("Error playing last recording:", error); // this has never happened ... :)
    setButtonState(buttonStates.ENABLED);
  }
}

async function playAndRecord() {
  // redundancy with playLastRecording, but somehow works faster this way...
  try {
    await waitForResponse(async () => {
      setButtonState(buttonStates.LOADING);
      // Query the database to get the filename of the last recording
      const { data, error } = await supabase
        .from("bottle_names")
        .select("filename")
        .order("timestamp", { ascending: false })
        .limit(1);

      if (error) {
        console.error("Error fetching last recording metadata:", error);
        setButtonState(buttonStates.ENABLED);
        return;
      }

      if (!data || data.length === 0) {
        console.log("No recordings found.");
        noBottles = true;
        setButtonState(buttonStates.ENABLED);
        return;
      }

      noBottles = false;
      lastRecordingName = data[0].filename;

      // Download the last recording, same old
      const { data: audioBlob, error: downloadError } = await supabase.storage
        .from("bottles")
        .download(lastRecordingName);

      if (downloadError) {
        console.error("Error downloading file:", downloadError);
        setButtonState(buttonStates.ENABLED);
        return;
      }

      // convert url from blob
      const audioUrl = URL.createObjectURL(audioBlob);

      // wait for tone
      if (!Tone.Context.state === "running") {
        await Tone.start();
      }

      // play
      player = new Tone.Player(audioUrl).toDestination();
      await Tone.loaded();
      player.start();

      // start the RECORDING
      recorder.start();
      setButtonState(buttonStates.RECORDING);
      stopButton.removeAttribute("disabled");

      // don't stop recording when the audio ends (manual control instead)
      player.onstop = () => {
        console.log("Playback finishes");
      };
    });
  } catch (error) {
    console.error("Error playing and recording:", error);
    setButtonState(buttonStates.ENABLED);
  }
}

async function saveRecording(file) {
  try {
    await waitForResponse(async () => {
      setButtonState(buttonStates.LOADING);

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
    setButtonState(buttonStates.ENABLED);
  } catch (error) {
    console.error("Error saving recording:", error);
    setButtonState(buttonStates.ENABLED);
  }
}

// centralized BUTTON STATE management function
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

function saveToLocal() {
  // placeholder function
  tempMessage = true;
}