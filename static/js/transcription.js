function cleanJSONText(text) {
  return text
    .replace(/&quot;/g, '"')  // Replace &quot; with "
    .replace(/\\n/g, '')      // Remove escaped newline characters
    .replace(/\\t/g, '')      // Remove escaped tab characters
    .replace(/\\r/g, '');     // Remove escaped carriage return characters
}
function sendVideoForTranscription(videoBlob) {
    const formData = new FormData();
    formData.append('video', videoBlob);

    console.log('Sending video for transcription...', videoBlob);

    fetch('/transcript', {
        method: 'POST',
        body: formData,
    })
    .then(response => response.json())
    .then(data => {
        console.log('Transcription data received:', data);
        const transcriptionBox = document.getElementById('transcription');
        const wordsTiming = document.getElementById('wordsTiming');
        transcriptionBox.value = data.transcription.map(word => word.word).join(' ');
        wordsTiming.value = JSON.stringify(data.transcription);
        const updateBtn = document.getElementById('updateBtn');
        updateBtn.disabled = false;
        const reTranscribeBtn = document.getElementById('reTranscribeBtn');
        reTranscribeBtn.disabled = false;
    })
    .catch(error => {
        console.error('Error during transcription fetch:', error);
    });
}

function analyzeVideo(videoBlob) {
    const formData = new FormData();
    formData.append('video', videoBlob);

    console.log('Sending video for analysis...', videoBlob);

    fetch('/analyze', {
        method: 'POST',
        body: formData,
    })
    .then(response => response.json())
    .then(data => {
        console.log('Analysis data received:', data);
        displayAnalysis(data);
    })
    .catch(error => {
        console.error('Error during analysis fetch:', error);
    });
}

function displayAnalysis(data) {
    try {
        // Sanitize the analysis string by removing non-JSON friendly characters
        let analysisString = data.analysis.replace(/[\u{1F600}-\u{1F64F}]/gu, ""); // Remove emojis
        const analysisData = JSON.parse(analysisString);

        console.log('Parsed analysis data:', analysisData);

        // Clear the current content of videoAnalysis
        const videoAnalysis = document.getElementById('videoAnalysis');
        videoAnalysis.innerHTML = '';

        // Iterate over the analysis data and create display elements
        for (const [key, value] of Object.entries(analysisData)) {
            const element = document.createElement('div');
            element.innerHTML = `<b>${key}:</b> ${value}<br/>`;
            videoAnalysis.appendChild(element);
        }
    } catch (error) {
        console.error('Error parsing analysis data:', error);
        const videoAnalysis = document.getElementById('videoAnalysis');
        videoAnalysis.innerHTML = 'Error displaying analysis data.';
    }
}

document.getElementById('saveBtn').onclick = (event) => {
    event.preventDefault(); // Prevent the form from submitting immediately

    const recordedBlobs = window.recordedBlobs || [];
    if (recordedBlobs.length === 0) {
        alert('No video recorded. Please record a video first.');
        return;
    }

    const videoBlob = new Blob(recordedBlobs, { type: 'video/webm' });
    console.log('Saving video blob:', videoBlob);

    // Convert Blob to File
    const videoFile = new File([videoBlob], 'recorded_video.webm', { type: 'video/webm' });

    // Create a DataTransfer object to append the file to the input
    const videoFileInput = new DataTransfer();
    videoFileInput.items.add(videoFile);

    // Set the file input value
    const videoInput = document.getElementById('videoBlobData');
    videoInput.files = videoFileInput.files;

    // Set the transcription data
    const transcriptionBox = document.getElementById('transcription').value;
    const transcriptionInput = document.getElementById('wordsTiming');
    transcriptionInput.value = transcriptionBox;

    // Submit the form
    const form = document.getElementById('transcriptionForm');
    form.submit();
};

// Functionality for update button
document.getElementById('updateBtn').onclick = () => {
    const transcriptionBox = document.getElementById('transcription');
    const wordsTiming = document.getElementById('wordsTiming');
    const formData = new FormData();
    formData.append('transcription', transcriptionBox.value);
    formData.append('wordsTiming', wordsTiming.value);

    fetch('/update-transcript', {
        method: 'POST',
        body: formData,
    })
    .then(response => response.json())
    .then(data => {
        console.log('Update response received:', data);

        // Update the hidden field with the new words timing JSON
        wordsTiming.value = JSON.stringify(JSON.parse(cleanJSONText(data.newWordsTiming)).words);

        // Parse the new words timing JSON for display
        const newWords = JSON.parse(wordsTiming.value);
        displayWords(newWords);

        alert('Transcription updated successfully.');
    })
    .catch(error => {
        console.error('Error during update:', error);
        alert(`Error during update: ${error}`);
    });
};

// Functionality for retranscribe button
document.getElementById('reTranscribeBtn').onclick = () => {
    const videoData = document.getElementById('videoData').files[0];
    const formData = new FormData();v
    formData.append('video', videoData);

    fetch('/transcript', {
        method: 'POST',
        body: formData,
    })
    .then(response => response.json())
    .then(data => {
        console.log('Transcription data received:', data);
        const transcriptionBox = document.getElementById('transcription');
        const wordsTiming = document.getElementById('wordsTiming');
        transcriptionBox.value = data.transcription.map(word => word.word).join(' ');
        wordsTiming.value = JSON.stringify(data.transcription);
        const updateBtn = document.getElementById('updateBtn');
        updateBtn.disabled = false;
        const reTranscribeBtn = document.getElementById('reTranscribeBtn');
        reTranscribeBtn.disabled = false;
    })
    .catch(error => {
        console.error('Error during transcription fetch:', error);
    });
};

// Function to display words at the correct time
function displayWords(words) {
    const video = document.getElementById('video');
    const wordOverlay = document.getElementById('wordOverlay');

    video.addEventListener('timeupdate', () => {
        const currentTime = video.currentTime;
        console.log('Current time of the video:', currentTime);

        const currentWord = words.find(word => currentTime >= word.start && currentTime <= word.end);
        
        if (currentWord) {
            wordOverlay.textContent = currentWord.word;
            wordOverlay.style.display = 'block';
        } else {
            wordOverlay.style.display = 'none';
        }
    });
}

// Initialize the display words function with the initial words timing
document.addEventListener('DOMContentLoaded', () => {
    const wordsTiming = document.getElementById('wordsTiming').value;
    if (wordsTiming) {
        const initialWords = JSON.parse(wordsTiming);
        displayWords(initialWords);
    }
});

// Function to reset the transcript
function resetTranscript() {
    // Reset the transcription textarea
    const transcriptionBox = document.getElementById('transcription');
    transcriptionBox.value = '';

    // Reset the hidden words timing field
    const wordsTiming = document.getElementById('wordsTiming');
    wordsTiming.value = '';

    // Disable the update and retranscribe buttons
    const updateBtn = document.getElementById('updateBtn');
    const reTranscribeBtn = document.getElementById('reTranscribeBtn');
    updateBtn.disabled = true;
    reTranscribeBtn.disabled = true;

    // Clear the word overlay
    const wordOverlay = document.getElementById('wordOverlay');
    wordOverlay.textContent = '';
    wordOverlay.style.display = 'none';
}
