from pathlib import Path
from pypdf import PdfReader


def extract_text(file_path):
    """
    Extract text from a PDF or TXT document.
    """

    file_path = Path(file_path)
    extension = file_path.suffix.lower()

    if extension == ".txt":
        return file_path.read_text(
            encoding="utf-8",
            errors="ignore"
        ).strip()

    elif extension == ".pdf":
        reader = PdfReader(str(file_path))

        text_parts = []

        for page in reader.pages:
            page_text = page.extract_text()

            if page_text:
                text_parts.append(page_text)

        return "\n\n".join(text_parts).strip()

    else:
        raise ValueError(
            "Unsupported file type. Only PDF and TXT files are allowed."
        )