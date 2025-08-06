# Live Voice AI Stream (v2)

This project is a live streaming voice AI application built with React, Vite, and the Google Gemini API. It demonstrates how to use the `gemini-2.5-flash-preview-native-audio-dialog` model for real-time, natural-sounding voice conversations.

This implementation is based on the latest Google AI documentation for the Live API.

## Features

-   Real-time voice-to-voice conversation with Gemini.
-   Uses the Native Audio model for high-quality, low-latency responses.
-   Live transcription of the conversation.
-   Voice Activity Detection (VAD) allows for natural interruptions.
-   Simple and clean user interface.

## Setup and Installation

1.  **Clone the repository:**
    ```bash
    git clone <repository-url>
    cd live-voice-ai-v2
    ```

2.  **Install dependencies:**
    ```bash
    npm install
    ```

3.  **Set up your environment variables for local development:**
    Create a `.env` file in the root of the project and add your Google Gemini API key.
    ```
    VITE_GEMINI_API_KEY="YOUR_GEMINI_API_KEY_HERE"
    ```

4.  **Run the development server:**
    ```bash
    npm run dev
    ```

5.  Open your browser and navigate to `http://localhost:5173` (or the URL provided in your terminal).

## How It Works

The application uses the `@google/genai` SDK to connect to the Gemini Live API. It captures audio from the user's microphone, streams it to the API, and receives both transcribed text and generated audio in response. The audio is played back in the browser, creating a seamless conversational experience.

## Deployment to Cloudflare Pages

This Vite project is a full frontend application and can be easily deployed to static hosting services like Cloudflare Pages.

1.  **Push your code to a GitHub/GitLab repository.**

2.  **Create a new project on Cloudflare Pages:**
    -   Log in to your Cloudflare dashboard.
    -   Go to **Workers & Pages** and select the **Pages** tab.
    -   Click **Create a project** and connect your Git repository.

3.  **Configure the build settings:**
    -   **Framework preset:** Select `Vite`. Cloudflare will automatically set the correct build command and output directory.
    -   **Build command:** `npm run build`
    -   **Build output directory:** `dist`

4.  **Add your Environment Variable:**
    -   Go to the project's **Settings** > **Environment variables**.
    -   Add a new variable for your production environment:
        -   **Variable name:** `VITE_GEMINI_API_KEY`
        -   **Variable value:** Paste your actual Google Gemini API key here.

5.  **Save and Deploy.**
    Cloudflare will build and deploy your site. You'll get a unique URL once it's finished.
