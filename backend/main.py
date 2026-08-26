from pathlib import Path

from fastapi import FastAPI, UploadFile, File
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel

from backend.document_processor import extract_text
from backend.chunker import split_text
from backend.embeddings import create_embeddings
from backend.vector_store import (
    create_vector_index,
    search_vectors,
)
from backend.llm import generate_answer


# ============================================================
# FASTAPI APPLICATION
# ============================================================

app = FastAPI(
    title="RAG Document Assistant",
    description="AI-powered document question answering using RAG",
    version="1.0.0",
)


# ============================================================
# CORS
# ============================================================

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=False,
    allow_methods=["*"],
    allow_headers=["*"],
)


# ============================================================
# PROJECT PATHS
# ============================================================

BASE_DIR = Path(__file__).resolve().parent.parent

DOCUMENTS_DIR = BASE_DIR / "documents"
VECTOR_DB_DIR = BASE_DIR / "vector_db"

DOCUMENTS_DIR.mkdir(exist_ok=True)
VECTOR_DB_DIR.mkdir(exist_ok=True)


# ============================================================
# APPLICATION STATE
# ============================================================

document_chunks = []
current_document = None


# Minimum cosine similarity we consider relevant.
# Embeddings are normalized and FAISS uses inner product.
MIN_SIMILARITY_SCORE = 0.25


# ============================================================
# REQUEST MODEL
# ============================================================

class QuestionRequest(BaseModel):
    question: str


# ============================================================
# HOME
# ============================================================

@app.get("/")
def home():
    return {
        "message": "RAG Document Assistant is running!",
        "status": "online",
    }


# ============================================================
# HEALTH CHECK
# ============================================================

@app.get("/health")
def health():
    return {
        "backend": "connected",
        "faiss": "available",
        "llm": "ollama",
        "document_uploaded": current_document is not None,
        "document": current_document,
    }


# ============================================================
# UPLOAD DOCUMENT
# ============================================================

@app.post("/upload")
async def upload_document(file: UploadFile = File(...)):
    global document_chunks
    global current_document

    try:
        # ----------------------------------------------------
        # Validate filename
        # ----------------------------------------------------

        if not file.filename:
            return {
                "success": False,
                "error": "No filename was provided.",
            }

        # ----------------------------------------------------
        # Validate extension
        # ----------------------------------------------------

        file_extension = Path(file.filename).suffix.lower()

        allowed_extensions = [
            ".pdf",
            ".txt",
        ]

        if file_extension not in allowed_extensions:
            return {
                "success": False,
                "error": "Only PDF and TXT files are allowed.",
            }

        # ----------------------------------------------------
        # Read file
        # ----------------------------------------------------

        contents = await file.read()

        if not contents:
            return {
                "success": False,
                "error": "The uploaded file is empty.",
            }

        # ----------------------------------------------------
        # Save file
        # ----------------------------------------------------

        file_path = DOCUMENTS_DIR / file.filename

        with open(file_path, "wb") as saved_file:
            saved_file.write(contents)

        # ----------------------------------------------------
        # Extract text
        # ----------------------------------------------------

        extracted_text = extract_text(
            str(file_path)
        )

        if (
            not extracted_text
            or not extracted_text.strip()
        ):
            return {
                "success": False,
                "error": (
                    "No readable text could be extracted "
                    "from the document."
                ),
            }

        # ----------------------------------------------------
        # Split into chunks
        # ----------------------------------------------------

        chunks = split_text(
            extracted_text
        )

        if not chunks:
            return {
                "success": False,
                "error": "No text chunks were created.",
            }

        # ----------------------------------------------------
        # Generate embeddings
        # ----------------------------------------------------

        embeddings = create_embeddings(
            chunks
        )

        # ----------------------------------------------------
        # Store embeddings + chunks in FAISS
        # ----------------------------------------------------

        create_vector_index(
            embeddings,
            chunks,
        )

        # ----------------------------------------------------
        # Save state
        # ----------------------------------------------------

        document_chunks = chunks
        current_document = file.filename

        # ----------------------------------------------------
        # Success response
        # ----------------------------------------------------

        return {
            "success": True,
            "message": "File uploaded and processed successfully!",
            "filename": file.filename,
            "characters_extracted": len(extracted_text),
            "number_of_chunks": len(chunks),
            "embedding_shape": list(embeddings.shape),
            "vector_database": "FAISS",
            "status": "Document ready for questions",
            "first_chunk": chunks[0],
        }

    except Exception as error:
        print(
            "UPLOAD ERROR:",
            error,
        )

        return {
            "success": False,
            "error": str(error),
        }


# ============================================================
# ASK QUESTION
# ============================================================

@app.post("/ask")
async def ask_question(
    request: QuestionRequest
):
    global document_chunks
    global current_document

    try:
        # ----------------------------------------------------
        # Get question
        # ----------------------------------------------------

        question = request.question.strip()

        if not question:
            return {
                "success": False,
                "error": "Please enter a question.",
            }

        # ----------------------------------------------------
        # Make sure a document was uploaded
        # ----------------------------------------------------

        if current_document is None:
            return {
                "success": False,
                "error": "Please upload a document first.",
            }

        if not document_chunks:
            return {
                "success": False,
                "error": "No document chunks are available.",
            }

        # ----------------------------------------------------
        # Generate question embedding
        # ----------------------------------------------------

        query_embedding = create_embeddings(
            [question]
        )

        # ----------------------------------------------------
        # FAISS search
        # ----------------------------------------------------

        search_output = search_vectors(
            query_embedding,
            top_k=3,
        )

        if not search_output:
            return {
                "success": True,
                "question": question,
                "answer": (
                    "The information was not found "
                    "in the uploaded document."
                ),
                "results": [],
                "document": current_document,
            }

        scores, indices = search_output

        # ----------------------------------------------------
        # Build retrieval results
        # ----------------------------------------------------

        results = []
        context_chunks = []

        for score, index in zip(
            scores[0],
            indices[0],
        ):
            chunk_index = int(index)
            similarity_score = float(score)

            # Ignore invalid FAISS indexes
            if chunk_index < 0:
                continue

            if chunk_index >= len(document_chunks):
                continue

            # Ignore very weak matches
            if similarity_score < MIN_SIMILARITY_SCORE:
                continue

            chunk = document_chunks[
                chunk_index
            ]

            results.append(
                {
                    "index": chunk_index,
                    "score": similarity_score,
                    "chunk": chunk,
                }
            )

            context_chunks.append(
                chunk
            )

        # ----------------------------------------------------
        # Nothing relevant found
        # ----------------------------------------------------

        if not context_chunks:
            return {
                "success": True,
                "question": question,
                "answer": (
                    "The information was not found "
                    "in the uploaded document."
                ),
                "results": [],
                "document": current_document,
            }

        # ----------------------------------------------------
        # Build context for Llama
        # ----------------------------------------------------

        context = "\n\n".join(
            context_chunks
        )

        print(
            "\nQUESTION:",
            question,
        )

        print(
            "\nRETRIEVED CONTEXT:\n",
            context,
        )

        # ----------------------------------------------------
        # Generate final RAG answer using Ollama
        # ----------------------------------------------------

        answer = generate_answer(
            question,
            context,
        )

        # ----------------------------------------------------
        # Return answer
        # ----------------------------------------------------

        return {
            "success": True,
            "question": question,
            "answer": answer,
            "results": results,
            "document": current_document,
        }

    except Exception as error:
        print(
            "ASK ERROR:",
            error,
        )

        return {
            "success": False,
            "error": str(error),
        }