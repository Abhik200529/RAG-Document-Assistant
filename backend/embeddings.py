import numpy as np
import ollama


EMBEDDING_MODEL = "nomic-embed-text"


def create_embeddings(texts):
    """
    Generate embeddings using Ollama.

    Accepts:
        - a single string
        - a list of strings

    Returns:
        NumPy float32 array
    """

    if isinstance(texts, str):
        texts = [texts]

    if not texts:
        return np.empty((0, 0), dtype="float32")

    try:
        response = ollama.embed(
            model=EMBEDDING_MODEL,
            input=texts
        )

        embeddings = np.asarray(
            response["embeddings"],
            dtype="float32"
        )

        # Normalize embeddings so FAISS inner product
        # works as cosine similarity.
        norms = np.linalg.norm(
            embeddings,
            axis=1,
            keepdims=True
        )

        norms[norms == 0] = 1.0

        embeddings = embeddings / norms

        return embeddings.astype("float32")

    except Exception as e:
        print(f"Embedding generation error: {e}")
        raise