import faiss
import numpy as np
from sentence_transformers import SentenceTransformer

_model = SentenceTransformer("all-MiniLM-L6-v2")


def embed_texts(texts: list[str]) -> np.ndarray:
    return _model.encode(texts, convert_to_numpy=True)


def cluster_logs(log_lines: list[str], top_k: int = 10) -> list[str]:
    if not log_lines:
        return []

    embeddings = embed_texts(log_lines).astype("float32")
    dim = embeddings.shape[1]

    index = faiss.IndexFlatL2(dim)
    index.add(embeddings)

    # Use centroid to find top_k representative logs
    centroid = embeddings.mean(axis=0, keepdims=True).astype("float32")
    _, indices = index.search(centroid, min(top_k, len(log_lines)))

    return [log_lines[i] for i in indices[0]]
