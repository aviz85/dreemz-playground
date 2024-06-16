const video = document.getElementById('video');
const recordBtn = document.getElementById('recordBtn');
const saveBtn = document.getElementById('saveBtn');
const videoData = document.getElementById('videoData');
const videoAnalysis = document.getElementById('videoAnalysis');
const transcriptionBox = document.getElementById('transcription');
const wordsTiming = document.getElementById('wordsTiming');

let mediaRecorder;
let recordedBlobs;
let stream;
let buffer = [];
const bufferSize = 25;
let isFirst5SecondsSent = false;

// Request access to the user's camera and microphone
navigator.mediaDevices.getUserMedia({ video: true, audio: true })
    .then(s => {
        console.log('Access to video stream granted');
        stream = s;
        video.srcObject = stream;

        // Initialize MediaRecorder with the stream
        mediaRecorder = new MediaRecorder(stream);
        recordedBlobs = [];

        mediaRecorder.ondataavailable = event => {
            if (event.data && event.data.size > 0) {
                recordedBlobs.push(event.data);
                console.log('Data available:', event.data);

                if (!isFirst5SecondsSent) {
                    buffer.push(event.data);

                    if (buffer.length >= bufferSize) {
                        const videoBlob = new Blob(buffer, { type: 'video/webm' });
                        console.log('First 5 seconds of video:', videoBlob);
                        analyzeVideo(videoBlob);
                        isFirst5SecondsSent = true;
                    }
                }
            }
        };

        mediaRecorder.onstop = () => {
            const superBuffer = new Blob(recordedBlobs, { type: 'video/webm' });
            const url = window.URL.createObjectURL(superBuffer);
            
            // Convert Blob to Base64 and set it as the value of videoData input
            const reader = new FileReader();
            reader.readAsDataURL(superBuffer);
            reader.onloadend = () => {
                videoData.value = reader.result;
                saveBtn.disabled = false;

                // Replace webcam feed with recorded video
                video.srcObject = null;
                video.src = url;
                video.controls = true;
                video.play();
                recordBtn.textContent = 'Retake';

                // Send video blob to server for transcription and analysis
                console.log('Video data (Base64):', videoData.value);
                sendVideoForTranscription(superBuffer);
            };
        };

        recordBtn.onclick = () => {
            if (mediaRecorder.state === 'recording') {
                mediaRecorder.stop();
                recordBtn.textContent = 'Retake';
            } else if (recordBtn.textContent === 'Retake') {
                // Replace recorded video with webcam feed
                videoAnalysis.innerHTML = '';
                video.controls = false;
                video.src = '';
                video.srcObject = stream;
                recordBtn.textContent = 'Stop';
                saveBtn.disabled = true;

                // Clear previous recorded blobs and reset flags
                recordedBlobs = [];
                buffer = [];
                isFirst5SecondsSent = false;

                mediaRecorder.start(100); // Start capturing data with 100ms chunks
            } else {
                recordedBlobs = [];
                buffer = []; // Reset buffer
                isFirst5SecondsSent = false;
                mediaRecorder.start(100); // Start capturing data with 100ms chunks
                recordBtn.textContent = 'Stop';
            }
        };
    })
    .catch(error => {
        console.error('getUserMedia error:', error);
        alert('Error accessing webcam. Please check your browser permissions.');
    });

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
        transcriptionBox.value = data.transcription.map(word => word.word).join(' ');
        wordsTiming.value = JSON.stringify(data.transcription);
        saveBtn.disabled = false;
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
        // Parse the JSON string into an object
        const analysisData = JSON.parse(data.analysis);
        console.log('Parsed analysis data:', analysisData);

        // Clear the current content of videoAnalysis
        videoAnalysis.innerHTML = '';

        // Iterate over the analysis data and create display elements
        for (const [key, value] of Object.entries(analysisData)) {
            const element = document.createElement('div');
            element.innerHTML = `<b>${key}:</b> ${value}<br/>`;
            videoAnalysis.appendChild(element);
        }
    } catch (error) {
        console.error('Error parsing analysis data:', error);
        videoAnalysis.innerHTML = 'Error displaying analysis data.';
    }
}

saveBtn.onclick = () => {
    if (recordedBlobs.length === 0) {
        alert('No video recorded. Please record a video first.');
        return;
    }

    const videoBlob = new Blob(recordedBlobs, { type: 'video/webm' });
    console.log('Saving video blob:', videoBlob);

    const formData = new FormData(document.getElementById('transcriptionForm'));
    formData.append('video', videoBlob);

    fetch('/save', {
        method: 'POST',
        body: formData,
    })
    .then(response => response.json())
    .then(data => {
        console.log('Save response received:', data);
        alert(`File saved successfully in folder: ${data.folder}`);
    })
    .catch(error => {
        console.error('Error during save:', error);
        alert(`Error during save: ${error}`);
    });
};