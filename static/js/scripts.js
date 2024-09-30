// static/js/scripts.js

document.addEventListener('DOMContentLoaded', () => {
    console.log('scripts.js loaded');

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
    let clusterAssignments = [];

    const clusterColors = [
        'rgba(255, 99, 132, 0.5)',
        'rgba(54, 162, 235, 0.5)',
        'rgba(255, 206, 86, 0.5)',
        'rgba(75, 192, 192, 0.5)',
        'rgba(153, 102, 255, 0.5)'
    ];

    // Initialize Chart.js scatter plot
    const initPlot = () => {
        const ctx = plotCanvas.getContext('2d');
        chartInstance = new Chart(ctx, {
            type: 'scatter',
            data: {
                datasets: [
                    {
                        label: 'Centroids',
                        data: [],
                        backgroundColor: clusterColors,
                        pointRadius: 10,
                        pointStyle: 'triangle',
                        borderColor: 'rgba(0, 0, 0, 1)',
                        borderWidth: 2,
                    },
                    ...clusterColors.map((color, index) => ({
                        label: `Cluster ${index}`,
                        data: [],
                        backgroundColor: color,
                        pointRadius: 5,
                    }))
                ]
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
                onClick: (evt, activeElements) => {
                    const method = initMethodSelect.value;
                    if (method !== 'manual') return;

                    if (activeElements.length === 0) return;

                    const firstPoint = activeElements[0];
                    const datasetLabel = chartInstance.data.datasets[firstPoint.datasetIndex].label;
                    if (!datasetLabel.startsWith('Cluster')) return;

                    const x = chartInstance.data.datasets[firstPoint.datasetIndex].data[firstPoint.index].x;
                    const y = chartInstance.data.datasets[firstPoint.datasetIndex].data[firstPoint.index].y;

                    if (manualCentroids.length >= k) {
                        alert(`You have already selected ${k} centroids.`);
                        return;
                    }

                    const centroid = { 
                        x: x, 
                        y: y,
                        backgroundColor: clusterColors[manualCentroids.length],
                        borderColor: clusterColors[manualCentroids.length]
                    };
                    manualCentroids.push(centroid);
                    selectedCountSpan.textContent = manualCentroids.length;

                    // Update the chart data directly from manualCentroids
                    chartInstance.data.datasets[0].data = [...manualCentroids];
                    chartInstance.update();

                    console.log(`Centroid added at (${x}, ${y}). Total centroids: ${manualCentroids.length}`);
                }
            }
        });
        console.log('Chart.js plot initialized');
    };

    // Update Chart.js plot with data and centroids
    const updatePlot = () => {
        // Clear existing data
        chartInstance.data.datasets.forEach((dataset, index) => {
            if (index !== 0) { // Keep centroids, clear other datasets
                dataset.data = [];
            }
        });
    
        // Update data points based on cluster assignments
        if (Array.isArray(clusterAssignments) && clusterAssignments.length === data.length) {
            data.forEach((point, index) => {
                const clusterIndex = clusterAssignments[index];
                if (clusterIndex !== undefined && chartInstance.data.datasets[clusterIndex + 1]) {
                    chartInstance.data.datasets[clusterIndex + 1].data.push({x: point[0], y: point[1]});
                }
            });
        } else {
            // If clusterAssignments is not valid, put all points in the first cluster
            data.forEach(point => {
                chartInstance.data.datasets[1].data.push({x: point[0], y: point[1]});
            });
        }
    
        // Update centroids with cluster colors
        chartInstance.data.datasets[0].data = kmeansCentroids.map((centroid, index) => ({
            x: centroid[0],
            y: centroid[1],
            backgroundColor: clusterColors[index % clusterColors.length],
            borderColor: clusterColors[index % clusterColors.length]
        }));
    
        chartInstance.update();
        console.log(`Plot updated with ${data.length} points and ${kmeansCentroids.length} centroids`);
    };

    // Handle Generate Dataset
    generateBtn.addEventListener('click', async () => {
        console.log('Generate Dataset button clicked');
        try {
            const response = await fetch(`/generate?centers=${k}&samples=100&random_state=42`);
            console.log('Fetch response:', response);
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
                kmeansCentroids = [];
                clusterAssignments = new Array(data.length).fill(0);
                updatePlot();
                manualInfo.style.display = initMethodSelect.value === 'manual' ? 'block' : 'none';
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
        if (method === 'manual') {
            manualInfo.style.display = 'block';
            manualCentroids = [];
            selectedCountSpan.textContent = 0;
        } else {
            manualInfo.style.display = 'none';
            manualCentroids = [];
            selectedCountSpan.textContent = 0;
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
            console.log('Initialize response:', response);
            const result = await response.json();
            console.log('Initialize result:', result);

            if (response.ok) {
                kmeansCentroids = result.centroids;
                // Initialize cluster assignments based on the number of data points
                clusterAssignments = new Array(data.length).fill(0);
                // If the backend provides initial assignments, use them
                if (result.assignments) {
                    clusterAssignments = result.assignments;
                }
                updatePlot();
                iterationSpan.textContent = '0'; // Reset iteration count
                convergedSpan.textContent = 'No';
                isConverged = false;
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
            return;
        }
    
        console.log('Step Through button clicked');
    
        try {
            const payload = {
                manual_centroids: initMethodSelect.value === 'manual' ? manualCentroids.map(c => [c.x, c.y]) : null,
                current_centroids: kmeansCentroids
            };
    
            const response = await fetch('/step', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(payload)
            });
            console.log('Step response:', response);
            const result = await response.json();
            console.log('Step result:', result);
    
            if (response.ok) {
                kmeansCentroids = result.centroids;
                if (Array.isArray(result.assignments)) {
                    clusterAssignments = result.assignments;
                } else if (result.clusters) {
                    // If assignments are not provided directly, derive them from clusters
                    clusterAssignments = new Array(data.length).fill(0);
                    Object.entries(result.clusters).forEach(([clusterId, points]) => {
                        points.forEach(point => {
                            const index = data.findIndex(d => d[0] === point[0] && d[1] === point[1]);
                            if (index !== -1) {
                                clusterAssignments[index] = parseInt(clusterId);
                            }
                        });
                    });
                } else {
                    console.warn('No valid cluster assignments received from backend');
                    clusterAssignments = new Array(data.length).fill(0);
                }
                updatePlot();
                iterationSpan.textContent = result.iteration;
                convergedSpan.textContent = result.converged ? 'Yes' : 'No';
                isConverged = result.converged;
                if (isConverged) {
                    alert('KMeans has converged.');
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
            return;
        }

        console.log('Run to Convergence button clicked');

        try {
            const payload = {
                manual_centroids: initMethodSelect.value === 'manual' ? manualCentroids.map(c => [c.x, c.y]) : null,
                current_centroids: kmeansCentroids
            };

            const response = await fetch('/run', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(payload)
            });
            console.log('Run response:', response);
            const result = await response.json();
            console.log('Run result:', result);

            if (response.ok) {
                kmeansCentroids = result.centroids;
                clusterAssignments = result.assignments;
                updatePlot();
                iterationSpan.textContent = result.iteration;
                convergedSpan.textContent = result.converged ? 'Yes' : 'No';
                if (result.converged) {
                    isConverged = true;
                    alert('KMeans has converged.');
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
            const response = await fetch('/reset', {
                method: 'POST',
            });
            console.log('Reset response:', response);
            const result = await response.json();
            console.log('Reset result:', result);

            if (response.ok) {
                data = [];
                manualCentroids = [];
                kmeansCentroids = [];
                clusterAssignments = [];
                selectedCountSpan.textContent = 0;
                iterationSpan.textContent = '0';
                convergedSpan.textContent = 'No';
                isConverged = false;
                updatePlot();
                manualInfo.style.display = initMethodSelect.value === 'manual' ? 'block' : 'none';
                alert(result.message);
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