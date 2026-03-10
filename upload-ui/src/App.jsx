import { useState } from "react";

export function UploadApp() {
  const [file, setFile] = useState(null);
  const [responseMessage, setResponseMessage] = useState("");
  const [isUploading, setIsUploading] = useState(false);

  async function onSubmit(event) {
    event.preventDefault();
    if (!file) {
      setResponseMessage("Please choose an image.");
      return;
    }

    setIsUploading(true);
    setResponseMessage("Uploading...");
    const formData = new FormData();
    formData.append("image", file);

    try {
      const response = await fetch("/upload", {
        method: "POST",
        body: formData
      });
      const text = await response.text();
      setResponseMessage(text);
    } catch (error) {
      setResponseMessage(`Upload failed: ${error.message}`);
    } finally {
      setIsUploading(false);
    }
  }

  return (
    <main className="upload-card">
      <h2>Whoosh - Send Images To Your Desktop</h2>
      <form onSubmit={onSubmit} className="upload-form">
        <input
          type="file"
          accept="image/*"
          required
          onChange={(event) => setFile(event.target.files?.[0] || null)}
        />
        <button className="upload-button" type="submit" disabled={isUploading}>
          {isUploading ? "Uploading..." : "Upload"}
        </button>
      </form>
      <div className="response">{responseMessage}</div>
    </main>
  );
}
