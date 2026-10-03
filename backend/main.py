from pathlib import Path

from fastapi import (
    FastAPI,
    UploadFile,
    File,
    HTTPException
)

from fastapi.middleware.cors import (
    CORSMiddleware
)

from pydantic import BaseModel


from backend.document_processor import (
    extract_text
)

from backend.chunker import (
    chunk_text
)

from backend.embeddings import (
    create_embeddings
)

from backend.vector_store import (
    create_vector_index,
    search_vectors,
    save_metadata,
    load_metadata,
    vector_index_exists
)

from backend.llm import (
    generate_answer
)


# -------------------------------------------------
# Project paths
# -------------------------------------------------

PROJECT_ROOT = Path(
    __file__
).resolve().parent.parent

DOCUMENTS_DIR = (
    PROJECT_ROOT / "documents"
)

DOCUMENTS_DIR.mkdir(
    parents=True,
    exist_ok=True
)


# -------------------------------------------------
# FastAPI application
# -------------------------------------------------

app = FastAPI(
    title="AI-Powered RAG Document Assistant",
    description=(
        "Upload PDF/TXT documents and ask "
        "questions using RAG."
    ),
    version="1.0.0"
)


# -------------------------------------------------
# CORS
# -------------------------------------------------

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=False,
    allow_methods=["*"],
    allow_headers=["*"]
)


# -------------------------------------------------
# Request model
# -------------------------------------------------

class QuestionRequest(BaseModel):
    question: str


# -------------------------------------------------
# Root endpoint
# -------------------------------------------------

@app.get("/")
def root():

    return {
        "message": (
            "AI-Powered RAG Document "
            "Assistant API is running."
        )
    }


# -------------------------------------------------
# Health endpoint
# -------------------------------------------------

@app.get("/health")
def health():

    metadata = load_metadata()

    uploaded = (
        vector_index_exists()
        and bool(metadata)
    )

    return {
        "status": "ok",
        "backend": "online",
        "document_uploaded": uploaded,
        "document": (
            metadata.get("filename")
            if uploaded
            else None
        ),
        "number_of_chunks": (
            metadata.get(
                "number_of_chunks",
                0
            )
            if uploaded
            else 0
        )
    }


# -------------------------------------------------
# Upload endpoint
# -------------------------------------------------

@app.post("/upload")
async def upload_document(
    file: UploadFile = File(...)
):

    try:

        if not file.filename:

            raise HTTPException(
                status_code=400,
                detail="No filename was provided."
            )

        # Prevent directory traversal
        safe_filename = Path(
            file.filename
        ).name

        extension = Path(
            safe_filename
        ).suffix.lower()

        if extension not in [
            ".pdf",
            ".txt"
        ]:

            raise HTTPException(
                status_code=400,
                detail=(
                    "Unsupported file type. "
                    "Only PDF and TXT files are allowed."
                )
            )

        file_path = (
            DOCUMENTS_DIR
            / safe_filename
        )

        # Read uploaded file
        contents = await file.read()

        if not contents:

            raise HTTPException(
                status_code=400,
                detail="The uploaded file is empty."
            )

        # Save document
        with open(
            file_path,
            "wb"
        ) as output_file:

            output_file.write(
                contents
            )

        # Extract text
        text = extract_text(
            file_path
        )

        if not text.strip():

            raise HTTPException(
                status_code=400,
                detail=(
                    "No readable text was found "
                    "in the document."
                )
            )

        # Create chunks
        chunks = chunk_text(
            text
        )

        if not chunks:

            raise HTTPException(
                status_code=400,
                detail=(
                    "Could not create document chunks."
                )
            )

        # Create Ollama embeddings
        embeddings = create_embeddings(
            chunks
        )

        # Store embeddings in FAISS
        create_vector_index(
            embeddings,
            chunks
        )

        # Save document information
        metadata = {
            "filename": safe_filename,
            "file_type": extension.replace(
                ".",
                ""
            ).upper(),
            "number_of_chunks": len(
                chunks
            ),
            "characters": len(
                text
            )
        }

        save_metadata(
            metadata
        )

        return {
            "success": True,
            "message": (
                "Document uploaded and "
                "processed successfully."
            ),
            "filename": safe_filename,
            "file_type": metadata[
                "file_type"
            ],
            "number_of_chunks": len(
                chunks
            ),
            "characters": len(
                text
            )
        }

    except HTTPException:
        raise

    except Exception as e:

        print(
            f"Upload error: {e}"
        )

        raise HTTPException(
            status_code=500,
            detail=str(e)
        )


# -------------------------------------------------
# Ask endpoint
# -------------------------------------------------

@app.post("/ask")
def ask_question(
    request: QuestionRequest
):

    try:

        question = (
            request.question.strip()
        )

        if not question:

            raise HTTPException(
                status_code=400,
                detail=(
                    "Question cannot be empty."
                )
            )

        if not vector_index_exists():

            raise HTTPException(
                status_code=400,
                detail=(
                    "Please upload a document first."
                )
            )

        # Convert question into embedding
        query_embedding = create_embeddings(
            [question]
        )

        # Search FAISS
        results = search_vectors(
            query_embedding,
            top_k=4
        )

        if not results:

            return {
                "success": True,
                "answer": (
                    "The information was not found "
                    "in the uploaded document."
                ),
                "results": []
            }

        # Build context from retrieved chunks
        context_parts = []

        for number, result in enumerate(
            results,
            start=1
        ):

            context_parts.append(
                f"[Document Chunk {number}]\n"
                f"{result['chunk']}"
            )

        context = "\n\n".join(
            context_parts
        )

        # Generate grounded answer
        answer = generate_answer(
            question,
            context
        )

        return {
            "success": True,
            "question": question,
            "answer": answer,
            "results": results
        }

    except HTTPException:
        raise

    except Exception as e:

        print(
            f"Question answering error: {e}"
        )

        raise HTTPException(
            status_code=500,
            detail=str(e)
        )