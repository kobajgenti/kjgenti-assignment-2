import numpy as np
import matplotlib.pyplot as plt
from sklearn.preprocessing import StandardScaler
from sklearn.datasets import make_blobs
import seaborn as sns
import random

def euclidean_distance(point, data):
    """
    Calculate the Euclidean distance between a single point and an array of data points.

    Parameters:
    - point: np.ndarray, shape (m,)
    - data: np.ndarray, shape (n, m)

    Returns:
    - distances: np.ndarray, shape (n,)
    """
    return np.linalg.norm(data - point, axis=1)

class KMeans:
    def __init__(self, n_clusters=8, max_iter=300, initialization='kmeans++', random_state=None):
        """
        Initialize the KMeans clustering algorithm.

        Parameters:
        - n_clusters: int, number of clusters
        - max_iter: int, maximum number of iterations
        - initialization: str, method for initializing centroids ('random', 'farthest', 'kmeans++', 'manual')
        - random_state: int or None, seed for reproducibility
        """
        self.n_clusters = n_clusters
        self.max_iter = max_iter
        self.initialization = initialization
        self.random_state = random_state
        self.centroids = None
        self.clusters = None
        self.iterations = 0
        self.history = []

        if self.random_state is not None:
            np.random.seed(self.random_state)
            random.seed(self.random_state)

    def initialize_centroids(self, X, manual_centroids=None):
        """
        Initialize centroids based on the specified initialization method.

        Parameters:
        - X: np.ndarray, shape (n_samples, n_features)
        """
        if self.initialization == 'random':
            self.centroids = self.random_init(X)
        elif self.initialization == 'farthest':
            self.centroids = self.farthest_first_init(X)
        elif self.initialization == 'kmeans++':
            self.centroids = self.kmeans_plus_plus_init(X)
        elif self.initialization == 'manual':
            if manual_centroids is None or len(manual_centroids) != self.n_clusters:
                raise ValueError("Manual centroids must be provided and match n_clusters.")
            self.centroids = np.array(manual_centroids)
        else:
            raise ValueError(f"Unknown initialization method: {self.initialization}")

        # Store initial state
        self.history.append({
            'centroids': self.centroids.copy(),
            'clusters': {i: [] for i in range(self.n_clusters)},
            'iteration': self.iterations
        })

    def random_init(self, X):
        """Randomly select k unique data points as initial centroids."""
        indices = np.random.choice(X.shape[0], self.n_clusters, replace=False)
        return X[indices]

    def farthest_first_init(self, X):
        """Initialize centroids using the Farthest First Traversal method."""
        centroids = [X[np.random.randint(0, X.shape[0])]]
        for _ in range(1, self.n_clusters):
            distances = np.min([euclidean_distance(centroid, X) for centroid in centroids], axis=0)
            next_centroid = X[np.argmax(distances)]
            centroids.append(next_centroid)
        return np.array(centroids)

    def kmeans_plus_plus_init(self, X):
        """Initialize centroids using the KMeans++ method."""
        centroids = [X[np.random.randint(0, X.shape[0])]]
        for _ in range(1, self.n_clusters):
            distances = np.min([euclidean_distance(centroid, X) for centroid in centroids], axis=0)
            probabilities = distances**2
            probabilities /= probabilities.sum()
            cumulative_prob = np.cumsum(probabilities)
            r = np.random.rand()
            next_centroid = X[np.searchsorted(cumulative_prob, r)]
            centroids.append(next_centroid)
        return np.array(centroids)

    def assign_clusters(self, X):
        """
        Assign each data point to the nearest centroid.

        Parameters:
        - X: np.ndarray, shape (n_samples, n_features)

        Returns:
        - clusters: dict, key as centroid index and value as list of assigned data points
        """
        distances = np.array([euclidean_distance(centroid, X) for centroid in self.centroids])
        closest_centroids = np.argmin(distances, axis=0)
        clusters = {i: [] for i in range(self.n_clusters)}
        for idx, centroid_idx in enumerate(closest_centroids):
            clusters[centroid_idx].append(X[idx])
        return clusters

    def update_centroids(self, clusters, X):
        """
        Update centroids as the mean of assigned data points.

        Parameters:
        - clusters: dict, current cluster assignments
        - X: np.ndarray, shape (n_samples, n_features)

        Returns:
        - new_centroids: np.ndarray, updated centroids
        """
        new_centroids = []
        for i in range(self.n_clusters):
            if clusters[i]:
                new_centroid = np.mean(clusters[i], axis=0)
                new_centroids.append(new_centroid)
            else:
                # Reinitialize centroid if cluster is empty
                new_centroid = X[np.random.randint(0, X.shape[0])]
                new_centroids.append(new_centroid)
        return np.array(new_centroids)
    
    def fit_step(self, X):
        """
        Perform one iteration of KMeans clustering.

        Parameters:
        - X: np.ndarray, shape (n_samples, n_features)

        Returns:
        - state: dict, containing centroids, clusters, convergence status, and iteration number
        """
        if self.centroids is None:
            self.initialize_centroids(X)
            return self.history[-1]

        self.iterations += 1
        clusters = self.assign_clusters(X)
        new_centroids = self.update_centroids(clusters, X)

        # Check for convergence
        converged = np.allclose(self.centroids, new_centroids, atol=1e-4)
        self.centroids = new_centroids
        self.clusters = clusters

        # Store current state
        self.history.append({
            'centroids': self.centroids.copy(),
            'clusters': self.clusters.copy(),
            'iteration': self.iterations,
            'converged': converged
        })

        return self.history[-1]
    
    def fit(self, X):
        """
        Compute KMeans clustering with step-by-step execution until convergence.

        Parameters:
        - X: np.ndarray, shape (n_samples, n_features)
        """
        while self.iterations < self.max_iter:
            state = self.fit_step(X)
            if state.get('converged', False):
                print(f"Converged at iteration {self.iterations}")
                break
        else:
            print(f"Reached maximum iterations ({self.max_iter}) without convergence.")

    def predict(self, X):
        """
        Assign clusters to new data points based on fitted centroids.

        Parameters:
        - X: np.ndarray, shape (n_samples, n_features)

        Returns:
        - labels: np.ndarray, shape (n_samples,)
        """
        distances = np.array([euclidean_distance(centroid, X) for centroid in self.centroids])
        labels = np.argmin(distances, axis=0)
        return labels

    def evaluate(self, X):
        """
        Assign clusters to data points.

        Parameters:
        - X: np.ndarray, shape (n_samples, n_features)

        Returns:
        - centroids: list of centroids corresponding to each data point
        - labels: list of cluster indices for each data point
        """
        labels = self.predict(X)
        centroids = self.centroids[labels]
        return centroids, labels.tolist()

# if __name__ == "__main__":
#     # Create a dataset of 2D distributions
#     centers = 5
#     X_train, true_labels = make_blobs(n_samples=100, centers=centers, random_state=42)
#     X_train = StandardScaler().fit_transform(X_train)

#     # Fit KMeans to the dataset
#     kmeans = KMeans(n_clusters=centers, initialization='kmeans++', random_state=42)
#     kmeans.fit(X_train)

#     # Evaluate cluster assignments
#     cluster_centers, cluster_labels = kmeans.evaluate(X_train)

#     # Visualization
#     plt.figure(figsize=(10, 7))
#     sns.scatterplot(
#         x=X_train[:, 0],
#         y=X_train[:, 1],
#         hue=true_labels,
#         style=cluster_labels,
#         palette="deep",
#         legend='full'
#     )

#     plt.scatter(
#         kmeans.centroids[:, 0],
#         kmeans.centroids[:, 1],
#         marker='X',
#         s=50,
#         c='black',
#         label='Centroids'
#     )

#     plt.title('KMeans Clustering Results')
#     plt.legend()
#     plt.show()