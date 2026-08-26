// ============================================================
// RAG DOCUMENT ASSISTANT
// COMPLETE FRONTEND JAVASCRIPT
// ============================================================

const API_URL = "http://127.0.0.1:8000";


// ============================================================
// ELEMENTS
// ============================================================

const fileInput =
    document.getElementById("fileInput");

const uploadButton =
    document.getElementById("uploadButton");

const uploadStatus =
    document.getElementById("uploadStatus");

const documentStatus =
    document.getElementById("documentStatus");

const questionInput =
    document.getElementById("questionInput");

const sendButton =
    document.getElementById("sendButton");

const chatContainer =
    document.getElementById("chatContainer");

const connectionStatus =
    document.getElementById("connectionStatus");


// ============================================================
// APPLICATION STATE
// ============================================================

let uploadedDocument = null;


// ============================================================
// INITIAL SETUP
// ============================================================

document.addEventListener(
    "DOMContentLoaded",
    function () {

        console.log(
            "RAG frontend started."
        );

        // IMPORTANT:
        // Chat box always remains writable.

        if (questionInput) {

            questionInput.disabled = false;

            questionInput.readOnly = false;

        }

        checkBackend();

    }
);


// ============================================================
// CHECK BACKEND
// ============================================================

async function checkBackend() {

    try {

        const response = await fetch(
            `${API_URL}/health`
        );


        if (!response.ok) {

            throw new Error(
                "Backend unavailable."
            );

        }


        const data =
            await response.json();


        console.log(
            "Health:",
            data
        );


        if (connectionStatus) {

            connectionStatus.innerHTML = `
                <span class="status-dot"></span>
                Backend Connected
            `;

        }


        // If backend already has an uploaded document
        if (
            data.document_uploaded &&
            data.document
        ) {

            uploadedDocument =
                data.document;


            showPermanentDocumentStatus(
                data.document
            );

        }

    }

    catch (error) {

        console.error(
            "Backend connection error:",
            error
        );


        if (connectionStatus) {

            connectionStatus.innerHTML = `
                <span style="color:#ef4444;">
                    ●
                </span>
                Backend Offline
            `;

        }

    }

}


// ============================================================
// FILE SELECTION
// ============================================================

if (fileInput) {

    fileInput.addEventListener(
        "change",
        function () {

            if (
                !this.files ||
                this.files.length === 0
            ) {

                return;

            }


            const file =
                this.files[0];


            const extension =
                file.name
                    .substring(
                        file.name.lastIndexOf(".")
                    )
                    .toLowerCase();


            if (
                extension !== ".pdf" &&
                extension !== ".txt"
            ) {

                uploadStatus.innerHTML = `
                    <div class="upload-error">
                        ✕ Only PDF and TXT files are allowed.
                    </div>
                `;


                fileInput.value =
                    "";


                return;

            }


            uploadStatus.innerHTML = `
                Selected:
                <strong>
                    ${escapeHtml(file.name)}
                </strong>
            `;


            console.log(
                "Selected file:",
                file.name
            );

        }
    );

}


// ============================================================
// UPLOAD BUTTON
// ============================================================

if (uploadButton) {

    uploadButton.addEventListener(
        "click",
        function (event) {

            event.preventDefault();

            uploadDocument();

        }
    );

}


// ============================================================
// UPLOAD DOCUMENT
// ============================================================

async function uploadDocument() {

    if (
        !fileInput ||
        !fileInput.files ||
        fileInput.files.length === 0
    ) {

        showUploadError(
            "Please choose a PDF or TXT document first."
        );

        return;

    }


    const file =
        fileInput.files[0];


    // --------------------------------------------------------
    // Uploading UI
    // --------------------------------------------------------

    uploadButton.disabled =
        true;


    uploadButton.textContent =
        "Processing...";


    uploadStatus.innerHTML = `
        ⏳ Processing
        <strong>
            ${escapeHtml(file.name)}
        </strong>
    `;


    try {

        const formData =
            new FormData();


        formData.append(
            "file",
            file
        );


        console.log(
            "Uploading:",
            file.name
        );


        const response =
            await fetch(
                `${API_URL}/upload`,
                {
                    method: "POST",
                    body: formData
                }
            );


        const data =
            await response.json();


        console.log(
            "Upload response:",
            data
        );


        if (!response.ok) {

            throw new Error(
                data.detail ||
                data.error ||
                "Upload failed."
            );

        }


        if (!data.success) {

            throw new Error(
                data.error ||
                "Upload failed."
            );

        }


        // ====================================================
        // SUCCESS
        // ====================================================

        uploadedDocument =
            data.filename;


        // This status DOES NOT disappear.

        uploadStatus.innerHTML = `
            <div class="upload-success">

                ✓ Upload successful

                <br>

                <strong>
                    ${escapeHtml(data.filename)}
                </strong>

                <br>

                ${data.number_of_chunks}
                chunk(s) created

            </div>
        `;


        // Permanent second status

        showPermanentDocumentStatus(
            data.filename
        );


        uploadButton.textContent =
            "Document Uploaded ✓";


        uploadButton.disabled =
            false;


        // Keep textbox usable

        questionInput.disabled =
            false;

        questionInput.readOnly =
            false;

        questionInput.placeholder =
            "Ask a question about your document...";


        // Hide welcome
        hideWelcome();


        // Add assistant confirmation

        addAssistantMessage(
            `Document "${data.filename}" has been uploaded and processed successfully. You can now ask questions about it.`
        );


        questionInput.focus();


    }

    catch (error) {

        console.error(
            "UPLOAD ERROR:",
            error
        );


        uploadedDocument =
            null;


        showUploadError(
            error.message
        );


        uploadButton.disabled =
            false;


        uploadButton.textContent =
            "Upload Document";

    }

}


// ============================================================
// PERMANENT DOCUMENT STATUS
// ============================================================

function showPermanentDocumentStatus(
    filename
) {

    if (!documentStatus) {

        return;

    }


    documentStatus.innerHTML = `

        <div class="upload-success">

            ✓ Document ready

            <br>

            <strong>
                ${escapeHtml(filename)}
            </strong>

        </div>

    `;

}


// ============================================================
// UPLOAD ERROR
// ============================================================

function showUploadError(
    message
) {

    if (!uploadStatus) {

        return;

    }


    uploadStatus.innerHTML = `

        <div class="upload-error">

            ✕ ${escapeHtml(message)}

        </div>

    `;

}


// ============================================================
// SEND BUTTON
// ============================================================

if (sendButton) {

    sendButton.addEventListener(
        "click",
        function (event) {

            event.preventDefault();

            sendQuestion();

        }
    );

}


// ============================================================
// ENTER KEY
// ============================================================

if (questionInput) {

    // Always writable

    questionInput.disabled =
        false;


    questionInput.addEventListener(
        "keydown",
        function (event) {

            if (
                event.key === "Enter" &&
                !event.shiftKey
            ) {

                event.preventDefault();

                sendQuestion();

            }

        }
    );

}


// ============================================================
// SEND QUESTION
// ============================================================

async function sendQuestion() {

    if (!questionInput) {

        return;

    }


    const question =
        questionInput.value.trim();


    // --------------------------------------------------------
    // Empty
    // --------------------------------------------------------

    if (!question) {

        questionInput.focus();

        return;

    }


    // --------------------------------------------------------
    // No document
    // --------------------------------------------------------

    if (!uploadedDocument) {

        addAssistantMessage(
            "Please upload a document before asking a question."
        );


        questionInput.focus();

        return;

    }


    // --------------------------------------------------------
    // Hide welcome
    // --------------------------------------------------------

    hideWelcome();


    // --------------------------------------------------------
    // Add user message
    // --------------------------------------------------------

    addUserMessage(
        question
    );


    // Clear input

    questionInput.value =
        "";


    // IMPORTANT:
    // textbox remains enabled

    questionInput.disabled =
        false;


    // Temporarily disable only button

    sendButton.disabled =
        true;


    // --------------------------------------------------------
    // Loading message
    // --------------------------------------------------------

    const loadingMessage =
        addAssistantMessage(
            "Thinking..."
        );


    try {

        console.log(
            "Sending question:",
            question
        );


        const response =
            await fetch(
                `${API_URL}/ask`,
                {

                    method: "POST",

                    headers: {

                        "Content-Type":
                            "application/json"

                    },

                    body:
                        JSON.stringify(
                            {
                                question:
                                    question
                            }
                        )

                }
            );


        const data =
            await response.json();


        console.log(
            "Ask response:",
            data
        );


        if (!response.ok) {

            throw new Error(
                data.detail ||
                data.error ||
                "Question request failed."
            );

        }


        if (!data.success) {

            throw new Error(
                data.error ||
                "Could not answer the question."
            );

        }


        // Remove loading

        if (loadingMessage) {

            loadingMessage.remove();

        }


        // ----------------------------------------------------
        // Display Llama answer
        // ----------------------------------------------------

        if (data.answer) {

            addAssistantMessage(
                data.answer
            );

        }


        // ----------------------------------------------------
        // Display retrieved sources
        // ----------------------------------------------------

        if (
            data.results &&
            data.results.length > 0
        ) {

            addSearchResults(
                data.results
            );

        }

    }

    catch (error) {

        console.error(
            "QUESTION ERROR:",
            error
        );


        if (loadingMessage) {

            loadingMessage.remove();

        }


        addAssistantMessage(
            `Error: ${error.message}`
        );

    }

    finally {

        // ----------------------------------------------------
        // Keep textbox functional
        // ----------------------------------------------------

        questionInput.disabled =
            false;


        questionInput.readOnly =
            false;


        sendButton.disabled =
            false;


        questionInput.focus();

    }

}


// ============================================================
// USER MESSAGE
// ============================================================

function addUserMessage(
    message
) {

    if (!chatContainer) {

        return;

    }


    const wrapper =
        document.createElement(
            "div"
        );


    wrapper.className =
        "message user-message";


    const bubble =
        document.createElement(
            "div"
        );


    bubble.className =
        "message-bubble";


    bubble.textContent =
        message;


    wrapper.appendChild(
        bubble
    );


    chatContainer.appendChild(
        wrapper
    );


    scrollChatToBottom();

}


// ============================================================
// ASSISTANT MESSAGE
// ============================================================

function addAssistantMessage(
    message
) {

    if (!chatContainer) {

        return null;

    }


    const wrapper =
        document.createElement(
            "div"
        );


    wrapper.className =
        "message assistant-message";


    const bubble =
        document.createElement(
            "div"
        );


    bubble.className =
        "message-bubble";


    bubble.textContent =
        message;


    wrapper.appendChild(
        bubble
    );


    chatContainer.appendChild(
        wrapper
    );


    scrollChatToBottom();


    return wrapper;

}


// ============================================================
// SEARCH RESULTS
// ============================================================

function addSearchResults(
    results
) {

    if (!chatContainer) {

        return;

    }


    const wrapper =
        document.createElement(
            "div"
        );


    wrapper.className =
        "search-results";


    const heading =
        document.createElement(
            "div"
        );


    heading.className =
        "search-results-heading";


    heading.textContent =
        "Relevant document sections";


    wrapper.appendChild(
        heading
    );


    results.forEach(
        function (
            result,
            index
        ) {

            const resultBox =
                document.createElement(
                    "div"
                );


            resultBox.className =
                "search-result";


            // ------------------------------------------------
            // Header
            // ------------------------------------------------

            const header =
                document.createElement(
                    "div"
                );


            header.className =
                "search-result-header";


            let similarityText =
                "";


            if (
                result.score !== undefined
            ) {

                similarityText =
                    ` • Similarity: ${Number(
                        result.score
                    ).toFixed(4)}`;

            }


            header.textContent =
                `Source ${index + 1}${similarityText}`;


            // ------------------------------------------------
            // Chunk text
            // ------------------------------------------------

            const chunk =
                document.createElement(
                    "div"
                );


            chunk.className =
                "search-result-chunk";


            chunk.textContent =
                result.chunk ||
                "No content available.";


            resultBox.appendChild(
                header
            );


            resultBox.appendChild(
                chunk
            );


            wrapper.appendChild(
                resultBox
            );

        }
    );


    chatContainer.appendChild(
        wrapper
    );


    scrollChatToBottom();

}


// ============================================================
// QUICK QUESTIONS
// ============================================================

document
    .querySelectorAll(
        ".quick-question"
    )
    .forEach(
        function (button) {

            button.addEventListener(
                "click",
                function () {

                    const question =
                        this.textContent.trim();


                    questionInput.disabled =
                        false;


                    questionInput.value =
                        question;


                    questionInput.focus();


                    // If document exists,
                    // immediately submit the question.

                    if (uploadedDocument) {

                        sendQuestion();

                    }

                }
            );

        }
    );


// ============================================================
// HIDE WELCOME
// ============================================================

function hideWelcome() {

    const welcome =
        document.querySelector(
            ".welcome"
        );


    if (welcome) {

        welcome.style.display =
            "none";

    }

}


// ============================================================
// SCROLL CHAT
// ============================================================

function scrollChatToBottom() {

    if (!chatContainer) {

        return;

    }


    setTimeout(
        function () {

            chatContainer.scrollTop =
                chatContainer.scrollHeight;

        },
        50
    );

}


// ============================================================
// HTML ESCAPE
// ============================================================

function escapeHtml(
    value
) {

    const div =
        document.createElement(
            "div"
        );


    div.textContent =
        String(value);


    return div.innerHTML;

}


// ============================================================
// DEBUG
// ============================================================

console.log(
    "===================================="
);

console.log(
    "RAG frontend loaded"
);

console.log(
    "API:",
    API_URL
);

console.log(
    "fileInput:",
    fileInput
);

console.log(
    "uploadButton:",
    uploadButton
);

console.log(
    "uploadStatus:",
    uploadStatus
);

console.log(
    "documentStatus:",
    documentStatus
);

console.log(
    "questionInput:",
    questionInput
);

console.log(
    "sendButton:",
    sendButton
);

console.log(
    "chatContainer:",
    chatContainer
);

console.log(
    "===================================="
);