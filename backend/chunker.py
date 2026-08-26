def split_text(text, chunk_size=1000, overlap=150):
    """
    Split text into chunks while trying to preserve paragraphs.
    """

    text = text.strip()

    if not text:
        return []

    paragraphs = [
        paragraph.strip()
        for paragraph in text.split("\n\n")
        if paragraph.strip()
    ]

    chunks = []
    current_chunk = ""

    for paragraph in paragraphs:

        # Paragraph fits inside current chunk
        if len(current_chunk) + len(paragraph) + 2 <= chunk_size:

            if current_chunk:
                current_chunk += "\n\n"

            current_chunk += paragraph

        else:

            # Save existing chunk
            if current_chunk:
                chunks.append(current_chunk.strip())

            # Very large paragraph
            if len(paragraph) > chunk_size:

                start = 0

                while start < len(paragraph):

                    end = start + chunk_size

                    chunk = paragraph[start:end]

                    if chunk.strip():
                        chunks.append(chunk.strip())

                    start += chunk_size - overlap

                current_chunk = ""

            else:

                current_chunk = paragraph

    # Save final chunk
    if current_chunk:
        chunks.append(current_chunk.strip())

    return chunks