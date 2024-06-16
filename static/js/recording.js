navigator.mediaDevices.getUserMedia({ video: true, audio: true })
    .then(stream => {
        console.log('Access to video stream granted');
        const video = document.getElementById('video');
        const recordBtn = document.getElementById('recordBtn');
        const saveBtn = document.getElementById('saveBtn');
        const videoData = document.getElementById('videoData');
        const videoAnalysis = document.getElementById('videoAnalysis');
        const transcriptionBox = document.getElementById('transcription');
        const wordsTiming = document.getElementById('wordsTiming');

        let mediaRecorder;
        window.recordedBlobs = [];  // Make sure recordedBlobs is globally accessible
        let buffer = [];
        const bufferSize = 50;  // 5 seconds
        let isFirst5SecondsSent = false;

        video.srcObject = stream;

        // Initialize MediaRecorder with the stream
        mediaRecorder = new MediaRecorder(stream);
        mediaRecorder.ondataavailable = event => {
            if (event.data && event.data.size > 0) {
                window.recordedBlobs.push(event.data);

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
            const superBuffer = new Blob(window.recordedBlobs, { type: 'video/webm' });
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
                resetTranscript();
                video.controls = false;
                video.src = '';
                video.srcObject = stream;
                recordBtn.textContent = 'Stop';
                saveBtn.disabled = true;

                // Clear previous recorded blobs and reset flags
                window.recordedBlobs = [];
                buffer = [];
                isFirst5SecondsSent = false;

                mediaRecorder.start(100);  // Start capturing data with 100ms chunks
            } else {
                window.recordedBlobs = [];
                buffer = [];  // Reset buffer
                isFirst5SecondsSent = false;
                mediaRecorder.start(100);  // Start capturing data with 100ms chunks
                recordBtn.textContent = 'Stop';
            }
        };
    })
    .catch(error => {
        console.error('getUserMedia error:', error);
        alert('Error accessing webcam. Please check your browser permissions.');
    });

// Function to reset the transcript
function resetTranscript() {
    const transcriptionBox = document.getElementById('transcription');
    transcriptionBox.value = '';

    const wordsTiming = document.getElementById('wordsTiming');
    wordsTiming.value = '';

    const updateBtn = document.getElementById('updateBtn');
    const reTranscribeBtn = document.getElementById('reTranscribeBtn');
    updateBtn.disabled = true;
    reTranscribeBtn.disabled = true;

    const wordOverlay = document.getElementById('wordOverlay');
    wordOverlay.textContent = '';
    wordOverlay.style.display = 'none';
}