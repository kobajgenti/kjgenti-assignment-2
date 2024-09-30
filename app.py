# app.py

from flask import Flask, request, jsonify, render_template
from flask_cors import CORS
import numpy as np
from k_means import KMeans

app = Flask(__name__)
CORS(app)  # Enable CORS for all routes

# Global variables to store state (for simplicity; consider more robust state management)
kmeans_instance = None
X_data = None

@app.route('/')
def index():
    return render_template('index.html')

@app.route('/test')
def test():
    return "Test route is working!", 200

@app.route('/generate', methods=['GET'])
def generate():
    from sklearn.datasets import make_blobs
    from sklearn.preprocessing import StandardScaler

    global kmeans_instance, X_data
    centers = request.args.get('centers', default=5, type=int)
    samples = request.args.get('samples', default=100, type=int)
    random_state = request.args.get('random_state', default=42, type=int)

    X, _ = make_blobs(n_samples=samples, centers=centers, random_state=random_state)
    X = StandardScaler().fit_transform(X)
    X_data = X.tolist()

    # Reset KMeans instance
    kmeans_instance = KMeans(n_clusters=centers, initialization='kmeans++', random_state=random_state)
    return jsonify({'data': X_data, 'k': centers})

@app.route('/initialize', methods=['POST'])
def initialize():
    global kmeans_instance, X_data
    if kmeans_instance is None or X_data is None:
        return jsonify({'error': 'Dataset not generated yet.'}), 400

    data = request.json
    initialization = data.get('initialization', 'kmeans++')
    manual_centroids = data.get('manual_centroids', None)

    try:
        if initialization == 'manual':
            if not manual_centroids or len(manual_centroids) != kmeans_instance.n_clusters:
                return jsonify({'error': 'Manual centroids must be provided and match n_clusters.'}), 400
            manual_centroids = np.array(manual_centroids)
        else:
            manual_centroids = None

        kmeans_instance.initialization = initialization
        if initialization == 'manual':
            kmeans_instance.initialize_centroids(np.array(X_data), manual_centroids=manual_centroids)
        else:
            kmeans_instance.initialize_centroids(np.array(X_data))

        response = {
            'centroids': kmeans_instance.centroids.tolist(),
            'iteration': kmeans_instance.iterations
        }
        return jsonify(response)
    except Exception as e:
        return jsonify({'error': str(e)}), 400

@app.route('/step', methods=['POST'])
def step():
    global kmeans_instance, X_data
    if kmeans_instance is None or X_data is None:
        return jsonify({'error': 'KMeans not initialized.'}), 400

    X = np.array(X_data)
    data = request.json
    manual_centroids = data.get('manual_centroids')
    current_centroids = data.get('current_centroids')

    try:
        if manual_centroids and kmeans_instance.iterations == 0:
            kmeans_instance.centroids = np.array(manual_centroids)
        elif current_centroids:
            kmeans_instance.centroids = np.array(current_centroids)

        state = kmeans_instance.fit_step(X)
    except ValueError as ve:
        return jsonify({'error': str(ve)}), 400

    response = {
        'centroids': state['centroids'].tolist(),
        'clusters': {k: [p.tolist() for p in v] for k, v in state['clusters'].items()},
        'iteration': state['iteration'],
        'converged': state.get('converged', False)
    }
    return jsonify(response)


@app.route('/run', methods=['POST'])
def run():
    global kmeans_instance, X_data
    if kmeans_instance is None or X_data is None:
        return jsonify({'error': 'KMeans not initialized.'}), 400

    X = np.array(X_data)
    data = request.json
    manual_centroids = data.get('manual_centroids')
    current_centroids = data.get('current_centroids')

    try:
        if manual_centroids and kmeans_instance.iterations == 0:
            kmeans_instance.centroids = np.array(manual_centroids)
        elif current_centroids:
            kmeans_instance.centroids = np.array(current_centroids)

        kmeans_instance.fit(X)
        state = kmeans_instance.history[-1]
    except ValueError as ve:
        return jsonify({'error': str(ve)}), 400

    response = {
        'centroids': state['centroids'].tolist(),
        'clusters': {k: [p.tolist() for p in v] for k, v in state['clusters'].items()},
        'iteration': state['iteration'],
        'converged': state.get('converged', False)
    }
    return jsonify(response)

@app.route('/reset', methods=['POST'])
def reset():
    global kmeans_instance, X_data
    kmeans_instance = None
    X_data = None
    return jsonify({'message': 'KMeans instance has been reset.'}), 200

if __name__ == '__main__':
    app.run(port=5000, debug=True)