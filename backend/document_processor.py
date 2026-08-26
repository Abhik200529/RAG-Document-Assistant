from pathlib import Path


def extract_text(file_path):

    file_path = Path(file_path)

    extension = file_path.suffix.lower()

    # TXT
    if extension == ".txt":

        with open(
            file_path,
            "r",
            encoding="utf-8"
        ) as file:

            return file.read()

    # PDF
    elif extension == ".pdf":

        from pypdf import PdfReader

        reader = PdfReader(
            str(file_path)
        )

        text = ""

        for page in reader.pages:

            page_text = page.extract_text()

            if page_text:
                text += page_text + "\n"

        return text

    else:

        raise ValueError(
            "Unsupported file type"
        )