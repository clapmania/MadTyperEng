let wordData = [];
let currentWordIndex = 0;
let currentSessionWords = [];
let sessionStartTime = 0;
let isWordVisible = false;
let totalWordsTyped = 0;
let totalSessions = 0;
let audioCache = {};
// Add new typedWords
let typedWords = new Set();

const wordDisplay = document.getElementById("word-to-type");
const userInput = document.getElementById("user-input");
const definitionDisplay = document.getElementById("definition");
const pronunciationAudio = document.getElementById("pronunciation");
const startButton = document.getElementById("start-session");
const nextButton = document.getElementById("next-word");
const totalWordsDisplay = document.getElementById("total-words");
const totalSessionsDisplay = document.getElementById("total-sessions");
const downloadButton = document.getElementById("download-button");
const importButton = document.getElementById("import-button");
const dataImportInput = document.getElementById("data-import");
const welcomeContainer = document.getElementById("welcome-container");
const typingContainer = document.getElementById("typing-container");
const importContainer = document.getElementById("import-container");
const importSuccessContainer = document.getElementById(
  "import-success-container"
);
const startSessionImportedButton = document.getElementById(
  "start-session-imported"
);
const topBar = document.getElementById("top-bar");
const endSessionContainer = document.getElementById("end-session-container");
const newLearnerButton = document.getElementById("new-learner-button");
const oldLearnerButton = document.getElementById("old-learner-button");

// Add the log statement HERE
console.log("startButton", startButton);

async function loadCSVData(filePath) {
  try {
    const response = await fetch(filePath);
    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }
    const csvText = await response.text();
    return csvText;
  } catch (error) {
    console.error(`Failed to load csv file from path ${filePath}, ${error}`);
    return null;
  }
}

async function initializeData() {
  console.log("Initializing data");
  try {
    const csvText = await loadCSVData("./words_cn.csv");
    if (csvText) {
      wordData = parseCSV(csvText);
      console.log("wordData loaded", wordData);
      userInput.addEventListener("input", handleInput);
      console.log("input listener attached");
      startButton.addEventListener("click", startSession);
      console.log("start button listener attached");
      nextButton.addEventListener("click", nextWord);
      console.log("next button listener attached");
      document.addEventListener("keydown", handleKeyDown);
      console.log("document keydown listener attached");
      downloadButton.addEventListener("click", downloadData);
      importButton.addEventListener("click", () => dataImportInput.click());
      dataImportInput.addEventListener("change", importData);
      startSessionImportedButton.addEventListener("click", startSession);
      newLearnerButton.addEventListener("click", startNewSession);
      oldLearnerButton.addEventListener("click", handleOldLearner);
      showWelcomeScreen();
    }
  } catch (error) {
    console.error("Error during initialization", error);
  }
}

function showWelcomeScreen() {
  welcomeContainer.style.display = "flex";
  typingContainer.style.display = "none";
  startButton.style.display = "none";
  topBar.style.display = "none";
  importContainer.style.display = "none";
  importSuccessContainer.style.display = "none";
  endSessionContainer.style.display = "none";
}

function updateDisplay() {
  totalWordsDisplay.textContent = `Total Words: ${totalWordsTyped}`;
  totalSessionsDisplay.textContent = `Total Sessions: ${totalSessions}`;
}

function parseCSV(csvText) {
  const lines = csvText.trim().split("\n");
  const headers = lines
    .shift()
    .split(",")
    .map((header) => header.trim());

  return lines
    .map((line) => {
      const values = line.split(",");
      const numFields = headers.length; // Expect 8 fields
      const obj = {};

      if (values.length < numFields) {
        console.warn("Insufficient data fields in line", line);
        return null;
      }

      // Extract fields starting from the end
      obj.frq = values.pop()?.trim() || null;
      obj.tag = values.pop()?.trim() || null;
      obj.oxford = values.pop()?.trim() || null;
      obj.collins = values.pop()?.trim() || null;
      obj.pos = values.pop()?.trim() || null;

      // The remaining is the Chinese definition
      obj.chinese = values.slice(2).join(",")?.trim() || null;

      //extract english
      obj.english = values[0]?.trim() || null;

      //extract phonetic
      obj.phonetic = values[1]?.trim() || null;

      return obj;
    })
    .filter(Boolean); //filter out null values
}

function downloadData() {
  const data = JSON.stringify(
    {
      totalWordsTyped,
      totalSessions,
      wordData,
      typedWords: Array.from(typedWords),
    },
    null,
    2
  );
  const blob = new Blob([data], { type: "application/json" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = "typing_tutor_data.json";
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}

function handleOldLearner() {
  welcomeContainer.style.display = "none";
  importContainer.style.display = "flex";
}
function startNewSession() {
  welcomeContainer.style.display = "none";
  topBar.style.display = "flex";
  typingContainer.style.display = "flex";
  startButton.style.display = "block";
  //Reset the set
  typedWords = new Set();
  totalWordsTyped = 0;
  updateDisplay();
}

function importData(event) {
  const file = event.target.files[0];
  if (!file) {
    return;
  }
  const reader = new FileReader();
  reader.onload = (event) => {
    try {
      const data = JSON.parse(event.target.result);
      totalWordsTyped = data.totalWordsTyped;
      totalSessions = data.totalSessions;
      wordData = data.wordData;
      // Load typedWords from data
      typedWords = new Set(data.typedWords || []);
      updateDisplay();
      console.log("Data imported", data);
      alert("Imported personalized data");
      importContainer.style.display = "none";
      importSuccessContainer.style.display = "flex";
    } catch (e) {
      console.error("Error parsing JSON", e);
      alert("Error parsing the data file!");
    }
  };
  reader.onerror = (error) => {
    console.error("Error loading file", error);
    alert("Error loading the file!");
  };
  reader.readAsText(file);
}

function handleStartSession() {
  startSession();
}

function selectRandomWords(words, count) {
  const shuffled = [...words].sort(() => 0.5 - Math.random());
  return shuffled.slice(0, count);
}

async function fetchPronunciation(word) {
  console.log(`Fetching pronunciation for: ${word}`);
  const apiUrl = `https://api.dictionaryapi.dev/api/v2/entries/en/${word}`;
  try {
    const response = await fetch(apiUrl);
    console.log(`API Response status: ${response.status}`);
    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }
    const data = await response.json();
    console.log(`API data received:`, data);
    if (data && data[0] && data[0].phonetics) {
      const phoneticWithAudio = data[0].phonetics.find(
        (phonetic) => phonetic.audio
      );
      if (phoneticWithAudio && phoneticWithAudio.audio) {
        console.log(`Audio URL found: ${phoneticWithAudio.audio}`);
        return phoneticWithAudio.audio;
      }
      console.log(`No audio URL found for ${word}`);
      return null;
    } else {
      console.log(`No phonetic data found for ${word}`);
      return null;
    }
  } catch (error) {
    console.error(`Failed to fetch data for ${word}`, error);
    return null;
  }
}

async function displayWord() {
  if (
    currentSessionWords &&
    currentSessionWords.length > 0 &&
    currentWordIndex < currentSessionWords.length
  ) {
    const currentWord = currentSessionWords[currentWordIndex];
    wordDisplay.textContent = isWordVisible ? currentWord.english : "";

    // Handle Chinese definitions display
    let chineseDefinitions = currentWord.chinese
      ? currentWord.chinese.split(/[\/\\]/).filter(Boolean)
      : [];
    let definitionText = "";
    if (chineseDefinitions.length <= 3) {
      definitionText = chineseDefinitions.join("<br>");
    } else if (chineseDefinitions.length > 3) {
      definitionText = chineseDefinitions.slice(0, 3).join("<br>");
    }
    definitionDisplay.innerHTML = definitionText;

    if (audioCache[currentWord.english]) {
      pronunciationAudio.src = audioCache[currentWord.english];
      if (isWordVisible) {
        try {
          await new Promise((resolve, reject) => {
            pronunciationAudio.onended = resolve;
            pronunciationAudio.onerror = reject;
            pronunciationAudio.play();
          });
        } catch (error) {
          console.error("Audio playback failed:", error);
        }
      }
    } else {
      pronunciationAudio.src = "";
      console.log(`No audio URL in cache for ${currentWord.english}`);
    }

    if (isWordVisible) {
      userInput.focus();
    }
  } else {
    wordDisplay.textContent = "";
    definitionDisplay.textContent = "";
    pronunciationAudio.src = "";
  }
}

function calculateNormalizedSpeed(startTime, endTime, word) {
  const timeTaken = (endTime - startTime) / 1000;
  return timeTaken / word.length;
}

function formatWordList(words) {
  return words.map((item) => item.english).join(", ");
}

function displaySessionSummary(averageTime, sortedWords) {
  const top5 = sortedWords.slice(-5).reverse();
  const bottom5 = sortedWords.slice(0, 5);
  const summary = `
         The average time: ${averageTime.toFixed(2)} second
         <br>
         The most familiar 5 words: ${formatWordList(top5)}
         <br>
         The least familiar 5 words: ${formatWordList(bottom5)}
     `;
  definitionDisplay.innerHTML = summary;
}

function handleInput() {
  if (currentSessionWords && currentSessionWords.length === 0) return;
  const typedText = userInput.value;
  const currentWord = currentSessionWords[currentWordIndex].english;
  wordDisplay.textContent = currentWord;
  //Comment out the delete function
  /*
  if (typedText === "delete") {
    const confirmDelete = confirm(
      "Are you sure you want to delete all user data?"
    );
    if (confirmDelete) {
      localStorage.clear();
      alert("All user data is deleted");
      updateDisplay();
    } else {
      userInput.value = "";
      return;
    }
  }
   */
  if (currentWord.startsWith(typedText)) {
    wordDisplay.textContent = ""; // hide the word if correct
    if (typedText === currentWord) {
      const endTime = new Date().getTime();
      const normalizedSpeed = calculateNormalizedSpeed(
        sessionStartTime,
        endTime,
        currentWord
      );
      currentSessionWords[currentWordIndex].averageSpeed = normalizedSpeed;
      userInput.value = "";
      nextButton.style.display = "block";
      // Only add to typed word if it is a new word
      if (!typedWords.has(currentWord)) {
        typedWords.add(currentWord);
        totalWordsTyped = typedWords.size;
      }
      updateDisplay();
      isWordVisible = true;
      setTimeout(() => {
        userInput.disabled = true;
        displayWord();
      }, 0);
    }
  } else {
    wordDisplay.textContent = currentWord; // show the word if not correct
    userInput.disabled = false;
  }
}

function handleKeyDown(event) {
  if (event.key === "Enter" && userInput.disabled) {
    nextButton.click();
  }
}

async function nextWord() {
  userInput.disabled = false;
  nextButton.style.display = "none";
  currentWordIndex++;

  if (currentWordIndex < currentSessionWords.length) {
    const nextWord = currentSessionWords[currentWordIndex].english;

    try {
      if (!audioCache[nextWord]) {
        const audioUrl = await fetchPronunciation(nextWord);
        if (audioUrl) {
          audioCache[nextWord] = audioUrl;
        }
      }
    } catch (error) {
      console.error(`Failed to fetch audio for ${nextWord}`, error);
    }

    sessionStartTime = new Date().getTime();
    isWordVisible = true;
    displayWord();
  } else {
    // End of Session
    totalSessions++;
    updateDisplay();
    console.log("End of session");
    updateAverageSpeed();
    sortWordByAverageSpeed();
    const averageTime =
      currentSessionWords.reduce(
        (total, word) => total + (word.averageSpeed ? word.averageSpeed : 0),
        0
      ) / currentSessionWords.length;
    displaySessionSummary(averageTime, currentSessionWords);
    currentWordIndex = 0;
    currentSessionWords = [];
    startButton.style.display = "block";
    endSessionContainer.style.display = "flex";
    audioCache = {};
  }
}

function startSession() {
  welcomeContainer.style.display = "none";
  importContainer.style.display = "none";
  importSuccessContainer.style.display = "none";
  topBar.style.display = "flex";
  typingContainer.style.display = "flex";
  startButton.style.display = "none";
  endSessionContainer.style.display = "none";
  console.log("Start session triggered");
  startButton.style.display = "none";
  nextButton.style.display = "none";
  currentSessionWords = selectRandomWords(wordData, 20);
  currentWordIndex = 0;

  // Fetch initial audio for the first word
  if (currentSessionWords.length > 0) {
    const firstWord = currentSessionWords[0].english;
    fetchPronunciation(firstWord)
      .then((audioUrl) => {
        if (audioUrl) {
          audioCache[firstWord] = audioUrl;
        }

        sessionStartTime = new Date().getTime();
        isWordVisible = true;
        displayWord();
        userInput.focus();
      })
      .catch((error) => {
        console.error(`Failed to fetch initial audio for ${firstWord}`, error);
        sessionStartTime = new Date().getTime();
        isWordVisible = true;
        displayWord();
        userInput.focus();
      });
  }
}

function updateAverageSpeed() {
  currentSessionWords.forEach((word) => {
    const wordInWordData = wordData.find(
      (item) => item.english === word.english
    );
    if (wordInWordData) {
      wordInWordData.averageSpeed = word.averageSpeed;
      console.log(
        `Updated ${word.english}, average speed: ${word.averageSpeed}`
      );
    }
  });
}

function sortWordByAverageSpeed() {
  wordData.sort((a, b) => {
    const speedA = a.averageSpeed || 0;
    const speedB = b.averageSpeed || 0;

    return speedA - speedB;
  });
  console.log("Words are sorted by speed");
  console.log(wordData);
}

initializeData();
