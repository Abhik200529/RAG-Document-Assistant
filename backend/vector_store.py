import json
from pathlib import Path

import faiss
import numpy as np


PROJECT_ROOT = Path(__file__).resolve().parent.parent

VECTOR_DB_DIR = PROJECT_ROOT / "vector_db"

INDEX_FILE = VECTOR_DB_DIR / "document.index"
CHUNKS_FILE = VECTOR_DB_DIR / "chunks.json"
METADATA_FILE = VECTOR_DB_DIR / "metadata.json"


VECTOR_DB_DIR.mkdir(
    parents=True,
    exist_ok=True
)


def normalize_vectors(vectors):
    """
    Normalize vectors for cosine similarity.
    """

    vectors = np.asarray(
        vectors,
        dtype="float32"
    )

    norms = np.linalg.norm(
        vectors,
        axis=1,
        keepdims=True
    )

    norms[norms == 0] = 1.0

    return (vectors / norms).astype("float32")


def create_vector_index(embeddings, chunks):
    """
    Create and save a FAISS vector index.
    """

    embeddings = np.asarray(
        embeddings,
        dtype="float32"
    )

    if embeddings.ndim != 2:
        raise ValueError(
            "Embeddings must be a 2D array."
        )

    if len(embeddings) == 0:
        raise ValueError(
            "No embeddings were provided."
        )

    if len(embeddings) != len(chunks):
        raise ValueError(
            "Number of embeddings must match number of chunks."
        )

    embeddings = normalize_vectors(
        embeddings
    )

    dimension = embeddings.shape[1]

    # Inner product + normalized vectors
    # = cosine similarity
    index = faiss.IndexFlatIP(
        dimension
    )

    index.add(
        embeddings
    )

    faiss.write_index(
        index,
        str(INDEX_FILE)
    )

    with open(
        CHUNKS_FILE,
        "w",
        encoding="utf-8"
    ) as file:

        json.dump(
            chunks,
            file,
            ensure_ascii=False,
            indent=2
        )

    return index


def load_vector_index():
    """
    Load the saved FAISS index.
    """

    if not INDEX_FILE.exists():
        return None

    return faiss.read_index(
        str(INDEX_FILE)
    )


def load_chunks():
    """
    Load document chunks.
    """

    if not CHUNKS_FILE.exists():
        return []

    with open(
        CHUNKS_FILE,
        "r",
        encoding="utf-8"
    ) as file:

        return json.load(file)


def search_vectors(
    query_embedding,
    top_k=4
):
    """
    Search FAISS for the most relevant document chunks.
    """

    index = load_vector_index()

    if index is None:
        return []

    chunks = load_chunks()

    if not chunks:
        return []

    query_embedding = np.asarray(
        query_embedding,
        dtype="float32"
    )

    if query_embedding.ndim == 1:
        query_embedding = query_embedding.reshape(
            1,
            -1
        )

    if query_embedding.shape[1] != index.d:
        raise ValueError(
            f"Embedding dimension mismatch. "
            f"FAISS index uses {index.d} dimensions, "
            f"but query uses {query_embedding.shape[1]}. "
            f"Delete the old vector_db files and upload the document again."
        )

    query_embedding = normalize_vectors(
        query_embedding
    )

    top_k = min(
        top_k,
        index.ntotal
    )

    if top_k <= 0:
        return []

    scores, indices = index.search(
        query_embedding,
        top_k
    )

    results = []

    for score, chunk_index in zip(
        scores[0],
        indices[0]
    ):

        chunk_index = int(
            chunk_index
        )

        if (
            chunk_index >= 0
            and chunk_index < len(chunks)
        ):

            results.append(
                {
                    "index": chunk_index,
                    "score": float(score),
                    "chunk": chunks[chunk_index]
                }
            )

    return results


def save_metadata(metadata):
    """
    Save information about the currently uploaded document.
    """

    with open(
        METADATA_FILE,
        "w",
        encoding="utf-8"
    ) as file:

        json.dump(
            metadata,
            file,
            ensure_ascii=False,
            indent=2
        )


def load_metadata():
    """
    Load document metadata.
    """

    if not METADATA_FILE.exists():
        return {}

    try:

        with open(
            METADATA_FILE,
            "r",
            encoding="utf-8"
        ) as file:

            return json.load(file)

    except Exception:
        return {}


def vector_index_exists():
    """
    Check whether a usable vector database exists.
    """

    return (
        INDEX_FILE.exists()
        and CHUNKS_FILE.exists()
    )