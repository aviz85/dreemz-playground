document.addEventListener('DOMContentLoaded', () => {
    const video = document.getElementById('video');
    const wordOverlay = document.getElementById('wordOverlay');
    const wordsTiming = document.getElementById('wordsTiming');

    // Add the event listener for logging the current time
    video.addEventListener('timeupdate', () => {
        const currentTime = video.currentTime;
        displayWordAtCurrentTime(currentTime);
    });

    // Function to display words at the correct time
    function displayWordAtCurrentTime(currentTime) {
        try {
            const words = JSON.parse(wordsTiming.value);
            if (!words || words.length === 0) {
                wordOverlay.style.display = 'none';
                return;
            }
            
            const currentWord = words.find(word => currentTime >= word.start && currentTime <= word.end);
            
            if (currentWord) {
                wordOverlay.textContent = currentWord.word;
                wordOverlay.style.display = 'block';
            } else {
                wordOverlay.style.display = 'none';
            }
        } catch (error) {
            wordOverlay.style.display = 'none';
        }
    }
});
