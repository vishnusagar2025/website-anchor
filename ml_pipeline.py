"""
ml_pipeline.py — DevGuard AI
ML Pipeline: clean → embed → cluster production logs
"""

import re
import numpy as np
from sentence_transformers import SentenceTransformer
import faiss
from sklearn.cluster import KMeans

# ---------------------------------------------------------------------------
# Module-level model cache — loaded once, reused across all calls
# ---------------------------------------------------------------------------
_model: SentenceTransformer | None = None

EMBED_MODEL_NAME = "all-MiniLM-L6-v2"
EMBED_DIM = 384

# Regex pattern that matches lines consisting ONLY of timestamp tokens
_TIMESTAMP_ONLY_RE = re.compile(
    r"^[\d\s\-T:Z./,+]+$"  # digits, separators, timezone offsets only
)


def _get_model() -> SentenceTransformer:
    """Return the cached SentenceTransformer model, loading it on first call."""
    global _model
    if _model is None:
        _model = SentenceTransformer(EMBED_MODEL_NAME)
    return _model


# ---------------------------------------------------------------------------
# Step 1 — Clean
# ---------------------------------------------------------------------------

def clean_logs(raw_text: str) -> list[str]:
    """
    Clean raw log text into a list of meaningful log strings.

    Steps:
      1. Split by newlines.
      2. Strip leading/trailing whitespace from each line.
      3. Remove empty lines.
      4. Remove lines that are purely timestamps (no actual message content).
    """
    lines = raw_text.split("\n")
    cleaned: list[str] = []

    for line in lines:
        stripped = line.strip()
        if not stripped:
            continue  # skip empty lines
        if _TIMESTAMP_ONLY_RE.match(stripped):
            continue  # skip pure-timestamp lines
        cleaned.append(stripped)

    return cleaned


# ---------------------------------------------------------------------------
# Step 2 — Embed
# ---------------------------------------------------------------------------

def embed_logs(log_lines: list[str]) -> np.ndarray:
    """
    Convert a list of log strings to a numpy array of sentence embeddings.

    Uses the cached ``all-MiniLM-L6-v2`` model.
    Returns an ndarray of shape (n_lines, 384).
    """
    if not log_lines:
        return np.empty((0, EMBED_DIM), dtype=np.float32)

    model = _get_model()
    embeddings = model.encode(
        log_lines,
        batch_size=64,
        show_progress_bar=False,
        convert_to_numpy=True,
    )
    # Ensure float32 for FAISS compatibility
    return embeddings.astype(np.float32)


# ---------------------------------------------------------------------------
# Step 3 — Cluster
# ---------------------------------------------------------------------------

def cluster_logs(
    embeddings: np.ndarray,
    log_lines: list[str],
) -> list[str]:
    """
    Cluster log embeddings and return one representative line per cluster.

    - Uses FAISS ``IndexFlatL2`` for nearest-neighbour lookup.
    - Uses sklearn ``KMeans`` with k = min(10, len(log_lines) // 5 + 2).
    - If fewer than 10 lines, returns all lines as-is.

    Returns a list of representative log strings (one per cluster).
    """
    n = len(log_lines)
    if n < 10:
        return list(log_lines)

    k = min(10, n // 5 + 2)

    # KMeans clustering
    kmeans = KMeans(n_clusters=k, random_state=42, n_init="auto")
    kmeans.fit(embeddings)
    centroids = kmeans.cluster_centers_.astype(np.float32)  # shape (k, 384)

    # Build FAISS index over the original embeddings
    index = faiss.IndexFlatL2(EMBED_DIM)
    index.add(embeddings)  # type: ignore[arg-type]

    # For each centroid, find the closest actual log line
    # faiss.search returns (distances, indices) both shape (k, 1)
    _, nearest_indices = index.search(centroids, 1)  # type: ignore[arg-type]

    seen: set[int] = set()
    representatives: list[str] = []
    for idx_array in nearest_indices:
        idx = int(idx_array[0])
        if idx not in seen:
            seen.add(idx)
            representatives.append(log_lines[idx])

    return representatives


# ---------------------------------------------------------------------------
# Step 4 — Public entry-point
# ---------------------------------------------------------------------------

def get_log_representatives(raw_text: str) -> list[str]:
    """
    End-to-end pipeline: raw log text → representative log lines.

    Calls clean_logs → embed_logs → cluster_logs in sequence.
    Returns representative lines ready for the Claude API.
    """
    cleaned = clean_logs(raw_text)
    if not cleaned:
        return []

    embeddings = embed_logs(cleaned)
    representatives = cluster_logs(embeddings, cleaned)
    return representatives
