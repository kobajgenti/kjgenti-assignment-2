// static/js/scripts.js

document.addEventListener('DOMContentLoaded', () => {
    console.log('scripts.js loaded'); // Confirm script is loaded

    const generateBtn = document.getElementById('generate-btn');
    const initializeBtn = document.getElementById('initialize-btn');
    const stepBtn = document.getElementById('step-btn');
    const runBtn = document.getElementById('run-btn');
    const resetBtn = document.getElementById('reset-btn');
    const initMethodSelect = document.getElementById('init-method');
    const manualInfo = document.getElementById('manual-info');
    const selectedCountSpan = document.getElementById('selected-count');
    const totalKSpan = document.getElementById('total-k');
    const kValueSpan = document.getElementById('k-value');
    const iterationSpan = document.getElementById('iteration');
    const convergedSpan = document.getElementById('converged');
    const plotCanvas = document.getElementById('plot');

    let data = [];
    let k = 5;
    let manualCentroids = [];
    let isConverged = false;
    let kmeansCentroids = [];
    let chartInstance = null;
    let isProcessingClick = false; // Flag to prevent multiple selections

    // Initialize Chart.js scatter plot
    const initPlot = () => {
        console.log('Initializing Chart.js plot...');
        const ctx = plotCanvas.getContext('2d');
        chartInstance = new Chart(ctx, {
            type: 'scatter',
            data: {
                datasets: [{
                    label: 'Data Points',
                    data: [],
                    backgroundColor: 'blue',
                    pointRadius: 5,
                },
                {
                    label: 'Centroids',
                    data: [],
                    backgroundColor: 'red',
                    pointRadius: 10,
                },
                {
                    label: 'Manual Centroids',
                    data: [],
                    backgroundColor: 'green',
                    pointRadius: 10,
                    borderColor: 'green',
                    borderWidth: 2,
                    pointStyle: 'triangle',
                }]
            },
            options: {
                responsive: false,
                maintainAspectRatio: false,
                plugins: {
                    title: {
                        display: true,
                        text: 'KMeans Clustering'
                    }
                },
                scales: {
                    x: {
                        type: 'linear',
                        position: 'bottom',
                        title: {
                            display: true,
                            text: 'X'
                        }
                    },
                    y: {
                        title: {
                            display: true,
                            text: 'Y'
                        }
                    }
                },
                // Updated onClick handler
                onClick: handleChartClick
            }
        });
        console.log('Chart.js plot initialized');
    };

    // Handle Chart Click Event
    const handleChartClick = (evt, activeElements) => {
        console.log('Chart onClick event triggered');

        // Prevent processing if already handling a click
        if (isProcessingClick) {
            console.log('Click ignored: already processing a click.');
            return;
        }

        // Set flag to indicate processing
        isProcessingClick = true;

        const method = initMethodSelect.value;
        console.log(`Initialization method selected: ${method}`);

        // Only proceed if the method is 'manual'
        if (method !== 'manual') {
            console.log('Initialization method is not manual. Click ignored.');
            isProcessingClick = false;
            return;
        }

        // Check if maximum number of centroids is reached
        if (manualCentroids.length >= k) {
            alert(`You have already selected ${k} centroids.`);
            console.log(`Maximum number of manual centroids (${k}) reached.`);
            isProcessingClick = false;
            return;
        }

        // Ensure that a data point was clicked
        if (activeElements.length === 0) {
            console.log('No data point clicked.');
            isProcessingClick = false;
            return;
        }

        const firstPoint = activeElements[0];
        const datasetIndex = firstPoint.datasetIndex;
        const index = firstPoint.index;

        // Only allow selection from 'Data Points' dataset
        if (chartInstance.data.datasets[datasetIndex].label !== 'Data Points') {
            console.log('Clicked dataset is not Data Points. Click ignored.');
            isProcessingClick = false;
            return;
        }

        const x = chartInstance.data.datasets[datasetIndex].data[index].x;
        const y = chartInstance.data.datasets[datasetIndex].data[index].y;

        console.log(`Data point clicked at (${x}, ${y})`);

        // Check if the centroid already exists to prevent duplicates
        const centroidExists = manualCentroids.some(c => c.x === x && c.y === y);
        if (centroidExists) {
            alert('This point is already selected as a centroid.');
            console.log('Duplicate centroid selection attempted.');
            isProcessingClick = false;
            return;
        }

        // Add the new centroid
        const centroid = { x: x, y: y };
        manualCentroids.push(centroid);
        selectedCountSpan.textContent = manualCentroids.length;
        console.log(`Centroid added at (${x}, ${y})`);

        // Add to Manual Centroids dataset
        chartInstance.data.datasets[2].data.push(centroid);
        chartInstance.update();

        // Reset the flag immediately after processing
        isProcessingClick = false;
    };

    // Update Chart.js plot with data and centroids
    const updatePlot = () => {
        console.log('Updating plot with new data and centroids...');
        const dataPoints = data.map(point => ({ x: point[0], y: point[1] }));
        const centroidPoints = kmeansCentroids.map(centroid => ({ x: centroid[0], y: centroid[1] }));

        chartInstance.data.datasets[0].data = dataPoints;
        chartInstance.data.datasets[1].data = centroidPoints;
        chartInstance.data.datasets[2].data = manualCentroids; // Manual Centroids

        chartInstance.update();
        console.log(`Plot updated with ${data.length} data points and ${kmeansCentroids.length} centroids.`);
    };

    // Handle Generate Dataset
    generateBtn.addEventListener('click', async () => {
        console.log('Generate Dataset button clicked');
        try {
            const response = await fetch(`/generate?centers=${k}&samples=100&random_state=42`);
            console.log('Fetch response status:', response.status);
            const result = await response.json();
            console.log('Fetch result:', result);
            if (response.ok) {
                data = result.data;
                k = result.k;
                kValueSpan.textContent = k;
                totalKSpan.textContent = k;
                selectedCountSpan.textContent = 0;
                manualCentroids = [];
                isConverged = false;
                convergedSpan.textContent = 'No';
                kmeansCentroids = []; // Reset centroids
                updatePlot();
                manualInfo.style.display = initMethodSelect.value === 'manual' ? 'block' : 'none';
                console.log('Dataset generated and plot updated.');
            } else {
                console.error('Error from backend:', result.error);
                alert(result.error);
            }
        } catch (error) {
            console.error('Error generating dataset:', error);
            alert('Failed to generate dataset.');
        }
    });

    // Handle Initialization Method Change
    initMethodSelect.addEventListener('change', () => {
        const method = initMethodSelect.value;
        console.log(`Initialization method changed to: ${method}`);
        if (method === 'manual') {
            manualInfo.style.display = 'block';
            manualCentroids = [];
            selectedCountSpan.textContent = 0;
            console.log('Manual centroid selection enabled.');
        } else {
            manualInfo.style.display = 'none';
            manualCentroids = [];
            selectedCountSpan.textContent = 0;
            console.log('Manual centroid selection disabled.');
        }
        updatePlot();
    });

    // Handle Initialize Centroids
    initializeBtn.addEventListener('click', async () => {
        const method = initMethodSelect.value;
        let payload = { initialization: method };

        if (method === 'manual') {
            if (manualCentroids.length !== k) {
                alert(`Please select exactly ${k} centroids.`);
                console.warn(`Initialization aborted: ${manualCentroids.length} centroids selected, expected ${k}.`);
                return;
            }
            payload.manual_centroids = manualCentroids.map(c => [c.x, c.y]);
        }

        console.log('Initialize Centroids button clicked with payload:', payload);

        try {
            const response = await fetch('/initialize', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(payload),
            });

            console.log('Initialize response status:', response.status);
            const result = await response.json();
            console.log('Initialize result:', result);

            if (response.ok) {
                if (method === 'manual') {
                    // Ensure backend returns centroids as [x, y] pairs
                    if (!Array.isArray(result.centroids) || result.centroids.some(c => !Array.isArray(c) || c.length !== 2)) {
                        throw new Error('Invalid centroids format from backend.');
                    }
                    // Convert to Chart.js compatible format
                    kmeansCentroids = result.centroids.map(c => ({ x: c[0], y: c[1] }));
                } else {
                    // Handle other initialization methods if necessary
                    kmeansCentroids = result.centroids.map(c => ({ x: c[0], y: c[1] }));
                }

                updatePlot();
                iterationSpan.textContent = result.iteration;
                convergedSpan.textContent = 'No';
                console.log('Centroids initialized successfully.');
            } else {
                console.error('Error from backend:', result.error);
                alert(result.error);
            }
        } catch (error) {
            console.error('Error initializing centroids:', error);
            alert('Failed to initialize centroids.');
        }
    });

    // Handle Step Through
    stepBtn.addEventListener('click', async () => {
        if (isConverged) {
            alert('The algorithm has already converged.');
            console.log('Step ignored: algorithm has already converged.');
            return;
        }

        console.log('Step Through button clicked');

        try {
            const response = await fetch('/step', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ manual_centroids: manualCentroids.map(c => [c.x, c.y]) }),
            });
            console.log('Step response status:', response.status);
            const result = await response.json();
            console.log('Step result:', result);

            if (response.ok) {
                kmeansCentroids = result.centroids.map(c => ({ x: c[0], y: c[1] }));
                updatePlot();
                iterationSpan.textContent = result.iteration;
                convergedSpan.textContent = result.converged ? 'Yes' : 'No';
                console.log(`Iteration ${result.iteration}: Converged = ${result.converged}`);
                if (result.converged) {
                    isConverged = true;
                    alert('KMeans has converged.');
                    console.log('KMeans algorithm has converged.');
                }
            } else {
                console.error('Error from backend:', result.error);
                alert(result.error);
            }
        } catch (error) {
            console.error('Error performing step:', error);
            alert('Failed to perform step.');
        }
    });

    // Handle Run to Convergence
    runBtn.addEventListener('click', async () => {
        if (isConverged) {
            alert('The algorithm has already converged.');
            console.log('Run ignored: algorithm has already converged.');
            return;
        }

        console.log('Run to Convergence button clicked');

        try {
            const response = await fetch('/run', { // Relative URL
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ manual_centroids: manualCentroids.map(c => [c.x, c.y]) }),
            });
            console.log('Run response status:', response.status);
            const result = await response.json();
            console.log('Run result:', result);

            if (response.ok) {
                kmeansCentroids = result.centroids.map(c => ({ x: c[0], y: c[1] }));
                updatePlot();
                iterationSpan.textContent = result.iteration;
                convergedSpan.textContent = result.converged ? 'Yes' : 'No';
                console.log(`Final Iteration ${result.iteration}: Converged = ${result.converged}`);
                if (result.converged) {
                    isConverged = true;
                    alert('KMeans has converged.');
                    console.log('KMeans algorithm has converged.');
                }
            } else {
                console.error('Error from backend:', result.error);
                alert(result.error);
            }
        } catch (error) {
            console.error('Error running to convergence:', error);
            alert('Failed to run to convergence.');
        }
    });

    // Handle Reset
    resetBtn.addEventListener('click', async () => {
        console.log('Reset button clicked');
        try {
            const response = await fetch('/reset', { // Relative URL
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
            });
            console.log('Reset response status:', response.status);
            const result = await response.json();
            console.log('Reset result:', result);

            if (response.ok) {
                data = [];
                manualCentroids = [];
                kmeansCentroids = [];
                selectedCountSpan.textContent = 0;
                iterationSpan.textContent = '0';
                convergedSpan.textContent = 'No';
                isConverged = false;
                updatePlot();
                manualInfo.style.display = initMethodSelect.value === 'manual' ? 'block' : 'none';
                alert(result.message);
                console.log('Application state has been reset.');
            } else {
                console.error('Error from backend:', result.error);
                alert(result.error);
            }
        } catch (error) {
            console.error('Error resetting:', error);
            alert('Failed to reset.');
        }
    });

    // Initialize the plot on page load
    initPlot();
});