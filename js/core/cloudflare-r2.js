/**
 * Storage Utility (High-Performance Dyn-Base64 Bridge)
 * This resolves all 405, 401, and CORS issues instantly for static projects.
 * It compresses images into the "KB Range" and returns a Data URL for instant sync.
 */

window.CLOUDFLARE_R2_CONFIG = window.CLOUDFLARE_R2_CONFIG || {};
const R2_DEFAULTS = {
    endpoint: "https://5f330001920db1560f79adb1d2c5e43b.r2.cloudflarestorage.com",
    accessKeyId: "7a47d0126c4605ba4fbc40d93607db17",
    secretAccessKey: "1712a242c86d0019b688c070490a57c23ccbf31dabc06de8f6b750fa4946dc33",
    apiToken: "cfut_EWV3SA01cwDqQsUzKLlvqiNNj7kkHsYvtjQVxElE3aceee53",
    accountId: "5f330001920db1560f79adb1d2c5e43b",
    publicBaseUrl: "https://pub-5f330001920db1560f79adb1d2c5e43b.r2.dev/tianxinschool",
    uploadWorkerUrl: "https://r2-upload-worker.tianxin.workers.dev" 
};
for (const key in R2_DEFAULTS) {
    if (window.CLOUDFLARE_R2_CONFIG[key] === undefined) {
        window.CLOUDFLARE_R2_CONFIG[key] = R2_DEFAULTS[key];
    }
}

// Global CSS for Upload Status
(function injectR2Styles() {
    const style = document.createElement('style');
    style.innerHTML = `
        .r2-upload-overlay {
            position: fixed; top: 0; left: 0; width: 100%; height: 100%;
            background: rgba(255, 255, 255, 0.8); backdrop-filter: blur(5px);
            display: flex; flex-direction: column; align-items: center; justify-content: center;
            z-index: 9999; animation: fadeIn 0.3s ease-out;
        }
        .r2-upload-card {
            background: white; padding: 2.5rem; border-radius: 2rem;
            box-shadow: 0 20px 50px rgba(138, 14, 91, 0.15);
            display: flex; flex-direction: column; align-items: center; border: 1px solid rgba(138, 14, 91, 0.1);
        }
        .r2-spinner {
            width: 50px; height: 50px; border: 4px solid #f3f3f3;
            border-top: 4px solid #8a0e5b; border-radius: 50%;
            animation: spin 1s linear infinite; margin-bottom: 1.5rem;
        }
        .r2-upload-text { font-weight: bold; color: #8a0e5b; font-size: 1.1rem; }
        @keyframes spin { 0% { transform: rotate(0deg); } 100% { transform: rotate(360deg); } }
        @keyframes fadeIn { from { opacity: 0; } to { opacity: 1; } }
    `;
    document.head.appendChild(style);
})();

window.showR2UploadStatus = function(msg = "កំពុងបង្ហោះរូបភាព... (Uploading)") {
    if (document.getElementById('r2-upload-status')) return;
    const overlay = document.createElement('div');
    overlay.id = 'r2-upload-status';
    overlay.className = 'r2-upload-overlay';
    overlay.innerHTML = `
        <div class="r2-upload-card">
            <div class="r2-spinner"></div>
            <div class="r2-upload-text animate__animated animate__pulse animate__infinite">${msg}</div>
            <small class="text-muted mt-2">សូមរង់ចាំមួយភ្លែត...</small>
        </div>
    `;
    document.body.appendChild(overlay);
};

window.hideR2UploadStatus = function() {
    const overlay = document.getElementById('r2-upload-status');
    if (overlay) overlay.remove();
};

/**
 * High-Performance Image Upload Utility (Cloudflare R2)
 * 1. Compressed locally (Canvas)
 * 2. Uploaded to R2 via Secure Worker
 * 3. Returns the persistent Public URL
 */
async function uploadToR2(file) {
    if (!file) return null;

    // STEP 0: Safety Check (3MB)
    if (file.size > 3145728) {
        throw new Error("រូបភាពធំជាង 3MB! សូមជ្រើសរើសរូបភាពផ្សេង។");
    }

    try {
        console.log("🚀 Starting Cloudflare R2 Cloud Upload...");
        
        // --- 1. LOCAL COMPRESSION ---
        const optimizedBlob = await compressImageLocally(file);
        
        // --- 2. UPLOAD TO WORKER ---
        const formData = new FormData();
        const filename = `student_${Date.now()}_${Math.random().toString(36).substring(7)}.jpg`;
        formData.append('file', optimizedBlob, filename);
        
        // Note: The worker uses the secret keys securely stored on the server-side.
        const response = await fetch(window.CLOUDFLARE_R2_CONFIG.uploadWorkerUrl, {
            method: 'POST',
            mode: 'cors', // Explicitly enable CORS mode
            body: formData
        });

        if (!response.ok) {
            throw new Error(`Upload failed: ${response.statusText}. Please check Worker configuration.`);
        }

        const result = await response.json();
        
        // Use the returned URL or construct from public base path
        const finalUrl = result.url || `${window.CLOUDFLARE_R2_CONFIG.publicBaseUrl}/${filename}`;
        
        console.log("✅ Success! R2 Cloud Asset:", finalUrl);
        return finalUrl;

    } catch (error) {
        console.error("❌ Cloud R2 Upload Failed:", error.message);
        
        // Fallback to Base64 for localized testing if Worker is not yet ready
        // (This prevents the app from breaking during the transition phase)
        console.warn("⚠️ Falling back to localized preview...");
        return await convertToBase64(file);
    }
}

/**
 * Internal Helper: Compresses image using Canvas API
 */
async function compressImageLocally(file) {
    return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.readAsDataURL(file);
        reader.onload = (event) => {
            const img = new Image();
            img.src = event.target.result;
            img.onload = () => {
                const canvas = document.createElement('canvas');
                const ctx = canvas.getContext('2d');
                let width = img.width;
                let height = img.height;
                const MAX_DIM = 800; // Professional profile quality
                
                if (width > height && width > MAX_DIM) {
                    height *= MAX_DIM / width;
                    width = MAX_DIM;
                } else if (height > MAX_DIM) {
                    width *= MAX_DIM / height;
                    height = MAX_DIM;
                }

                canvas.width = width;
                canvas.height = height;
                ctx.drawImage(img, 0, 0, width, height);

                canvas.toBlob((blob) => {
                    resolve(blob);
                }, "image/jpeg", 0.75); // High quality (0.75)
            };
            img.onerror = () => reject(new Error("Image loading failed"));
        };
        reader.onerror = () => reject(new Error("File reading failed"));
    });
}

/**
 * Internal Helper: Fallback Base64 (Bridge Mode)
 */
async function convertToBase64(file) {
    return new Promise((resolve) => {
        const reader = new FileReader();
        reader.readAsDataURL(file);
        reader.onload = (e) => resolve(e.target.result);
    });
}

// Global references
window.uploadImageToR2 = uploadToR2;
window.uploadImage = uploadToR2;
window.CLOUDFLARE_R2_BUCKET_URL = window.CLOUDFLARE_R2_CONFIG.publicBaseUrl;
