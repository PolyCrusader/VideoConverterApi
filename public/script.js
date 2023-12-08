let clicked = false;

function processRequest() {
    if (!clicked) {
        clicked = true;
        //hide gif and download link
        document.getElementById('downloadLink').style.display = 'none';
        document.getElementById('download').style.display = 'none';
        updateProgressBar(0);

        const fileUrl = document.getElementById('fileUrl').value;
        const maxSize = document.getElementById('maxSize').value;

        // Validate inputs
        if (!fileUrl || !maxSize) {
            alert('Please enter both URL and max size');
            return;
        }

        const requestData = {
            fileUrl: fileUrl,
            maxSize: maxSize
        };

        // Show loading spinner
        document.getElementById('loading').style.display = 'flex';

        // Make API request
        // TODO: Change the URL to the API endpoint
        fetch('http://localhost:8000/', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(requestData)
        })
            .then(response => response.json())
            .then(data => {
                // Hide loading spinner
                document.getElementById('loading').style.display = 'none';

                if (data.error) {
                    alert('Error: ' + data.error);
                } else {
                    // Display progress and hide download button
                    document.getElementById('progressBar').hidden = false;
                    // Start polling for progress
                    pollProgress(data.url.replace('outputs', 'progress'));
                }
            })
            .catch(error => {
                // Hide loading spinner
                document.getElementById('loading').style.display = 'none';
                alert('Error: ' + error.message);
            });
    } else {
        alert('Please wait for the current process to finish');
    }
}

function pollProgress(url) {
    const downloadLink = document.getElementById('downloadLink');
    const progressBar = document.getElementById('progressBar');

    const intervalId = setInterval(() => {
        fetch(url)
            .then(response => response.json())
            .then(data => {
                if (data.result === 'error') {
                    // Display progress and error message
                    // progressBar.value = data.avencement;
                    updateProgressBar(data.avencement);
                } else {
                    updateProgressBar(100);
                    downloadLink.href = url.replace('progress', 'outputs');
                    downloadLink.style.display = 'block';
                    // Show download button
                    document.getElementById('download').style.display = 'block';

                    // Stop polling
                    clearInterval(intervalId);

                    clicked = false;
                }
            })
            .catch(error => {
                // Display progress and error message
                progressElement.innerText = 'Error fetching progress';
            });
    }, 1000);
}

function updateProgressBar(value) {
    document.getElementById('progressValue').style.width = `${value}%`;
}
