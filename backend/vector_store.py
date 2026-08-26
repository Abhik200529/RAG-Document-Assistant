import faiss
import numpy as np
import json

from pathlib import Path


BASE_DIR = Path(__file__).resolve().parent.parent

VECTOR_DB_DIR = BASE_DIR / "vector_db"

VECTOR_DB_DIR.mkdir(
    exist_ok=True
)

INDEX_FILE = VECTOR_DB_DIR / "document.index"

CHUNKS_FILE = VECTOR_DB_DIR / "chunks.json"


def create_vector_index(embeddings, chunks):
    """
    Store normalized embeddings and corresponding chunks in FAISS.
    """

    embeddings = np.asarray(
        embeddings,
        dtype="float32"
    )

    if embeddings.ndim != 2:
        raise ValueError(
            "Embeddings must be a 2D array."
        )

    if len(embeddings) != len(chunks):
        raise ValueError(
            "Embedding count and chunk count must match."
        )

    dimension = embeddings.shape[1]

    # Inner product on normalized vectors = cosine similarity
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

    if not INDEX_FILE.exists():
        return None

    return faiss.read_index(
        str(INDEX_FILE)
    )


def load_chunks():

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
    top_k=3
):

    index = load_vector_index()

    if index is None:
        return []

    if index.ntotal == 0:
        return []

    query_embedding = np.asarray(
        query_embedding,
        dtype="float32"
    )

    top_k = min(
        top_k,
        index.ntotal
    )

    scores, indices = index.search(
        query_embedding,
        top_k
    )

    return scores, indices