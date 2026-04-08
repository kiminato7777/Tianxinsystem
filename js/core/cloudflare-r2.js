/**
 * Storage Utility (Direct Cloudflare R2 S3 API - Global Signed Version)
 * This version is optimized for Real-Time UI updates and Cloudflare S3 compatibility.
 */

window.CLOUDFLARE_R2_CONFIG = window.CLOUDFLARE_R2_CONFIG || {};
const R2_DEFAULTS = {
    endpoint: "https://de112fdcf86cca83a566898b7ee4f55d.r2.cloudflarestorage.com",
    accessKeyId: "ee6c159e8d801a58e961802eb88bf6d6",
    secretAccessKey: "38930c514deb4b76764c1cfa7efd1a35d90746823340f8cd6f61df0ed7020e0d",
    bucketName: "tianxinschool",
    publicBaseUrl: "https://pub-9f07e56bcd7b4303ae324ce2bd2c6941.r2.dev",
    region: "auto"
};

for (const key in R2_DEFAULTS) {
    if (window.CLOUDFLARE_R2_CONFIG[key] === undefined) {
        window.CLOUDFLARE_R2_CONFIG[key] = R2_DEFAULTS[key];
    }
}

// Global UI Styles (Mini status etc)
(function injectR2Styles() {
    const style = document.createElement('style');
    style.innerHTML = `
        .r2-mini-status {
            position: absolute; top: 50%; left: 50%; transform: translate(-50%, -50%);
            background: rgba(255, 255, 255, 0.95); padding: 8px 16px; border-radius: 30px;
            box-shadow: 0 4px 15px rgba(0,0,0,0.2); display: flex; align-items: center;
            gap: 10px; font-size: 0.8rem; font-weight: 800; color: #8a0e5b;
            z-index: 1000; white-space: nowrap; border: 2px solid #8a0e5b;
            animation: fadeIn 0.3s ease-out;
        }
        .r2-mini-spinner {
            width: 14px; height: 14px; border: 2px solid #f3f3f3;
            border-top: 2px solid #8a0e5b; border-radius: 50%;
            animation: spin 0.8s linear infinite;
        }
        @keyframes spin { 0% { transform: rotate(0deg); } 100% { transform: rotate(360deg); } }
        @keyframes fadeIn { from { opacity: 0; } to { opacity: 1; } }
    `;
    document.head.appendChild(style);
})();

async function signV4(method, url, body, contentType) {
    const config = window.CLOUDFLARE_R2_CONFIG;
    const date = new Date();
    const amzDate = date.toISOString().replace(/[:-]|\.\d{3}/g, "");
    const dateStamp = amzDate.slice(0, 8);
    
    const urlObj = new URL(url);
    const host = urlObj.host;
    const path = urlObj.pathname;
    const region = config.region;
    const service = "s3";
    
    // We use UNSIGNED-PAYLOAD for browser compatibility with Blob objects
    const contentHash = "UNSIGNED-PAYLOAD";
    
    const canonicalHeaders = `host:${host}\nx-amz-content-sha256:${contentHash}\nx-amz-date:${amzDate}\n`;
    const signedHeaders = "host;x-amz-content-sha256;x-amz-date";
    
    const canonicalRequest = `${method}\n${path}\n\n${canonicalHeaders}\n${signedHeaders}\n${contentHash}`;
    const hashedCanonicalRequest = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(canonicalRequest));
    const hashedCanonicalRequestHex = Array.from(new Uint8Array(hashedCanonicalRequest)).map(b => b.toString(16).padStart(2, "0")).join("");
    
    const credentialScope = `${dateStamp}/${region}/${service}/aws4_request`;
    const stringToSign = `AWS4-HMAC-SHA256\n${amzDate}\n${credentialScope}\n${hashedCanonicalRequestHex}`;
    
    async function hmac(key, msg) {
        const cryptoKey = await crypto.subtle.importKey("raw", key, { name: "HMAC", hash: "SHA-256" }, false, ["sign"]);
        return new Uint8Array(await crypto.subtle.sign("HMAC", cryptoKey, typeof msg === "string" ? new TextEncoder().encode(msg) : msg));
    }

    const kDate = await hmac(new TextEncoder().encode("AWS4" + config.secretAccessKey), dateStamp);
    const kRegion = await hmac(kDate, region);
    const kService = await hmac(kRegion, service);
    const kSigning = await hmac(kService, "aws4_request");
    
    const signatureBuffer = await hmac(kSigning, stringToSign);
    const signature = Array.from(signatureBuffer).map(b => b.toString(16).padStart(2, "0")).join("");
    
    return {
        "Authorization": `AWS4-HMAC-SHA256 Credential=${config.accessKeyId}/${credentialScope}, SignedHeaders=${signedHeaders}, Signature=${signature}`,
        "X-Amz-Date": amzDate,
        "X-Amz-Content-Sha256": contentHash,
        "Content-Type": contentType
    };
}

window.uploadImageToR2 = async function(file, identifier = "", folderPrefix = "tianxin") {
    if (!file) return null;
    const config = window.CLOUDFLARE_R2_CONFIG;
    
    try {
        console.log(`🚀 Starting Global R2 Upload Process to [${folderPrefix}]...`);
        const optimizedBlob = await compressImageLocally(file);
        
        const timestamp = Date.now();
        const rand = Math.random().toString(36).substring(7);
        
        // Determine prefix and filename
        const isTeacher = folderPrefix.toLowerCase().includes('teacher');
        const cleanName = identifier.replace(/[^a-zA-Z0-9]/g, '_');
        const shortCode = Math.random().toString(36).substring(7);
        
        const filename = isTeacher ? 
            `teacher_${cleanName}_${shortCode}.jpg` : 
            (cleanName ? `student_${cleanName}_${shortCode}.jpg` : `student_${Date.now()}.jpg`);
            
        const key = `${folderPrefix}/${filename}`;
        
        // Use Path-Style API endpoint
        const uploadUrl = `${config.endpoint}/${config.bucketName}/${key}`;
        
        const headers = await signV4("PUT", uploadUrl, optimizedBlob, "image/jpeg");
        
        const response = await fetch(uploadUrl, {
            method: "PUT",
            headers: headers,
            body: optimizedBlob
        });

        if (!response.ok) {
            const errorBody = await response.text();
            console.error("Cloudflare S3 Error:", errorBody);
            
            // If we get a 403, it's usually Signature or CORS
            if (response.status === 403) {
                if (errorBody.includes("SignatureDoesNotMatch")) {
                    throw new Error("Cloudflare R2 Secret Key mismatch or Clock skew.");
                } else {
                    throw new Error("Cloudflare R2 Access Denied. Please check CORS and Bucket Permissions.");
                }
            }
            throw new Error(`Cloudflare Error ${response.status}: ${errorBody.substring(0, 100)}`);
        }

        const finalUrl = `${config.publicBaseUrl}/${key}`;
        console.log("✅ R2 Upload Success! Resource Link:", finalUrl);
        return finalUrl;

    } catch (error) {
        console.error("❌ R2 Native Upload Failed:", error);
        // Fallback to local preview so the user doesn't see a broken icon immediately
        return await convertToBase64(file);
    }
};

window.deleteImageFromR2 = async function(imageUrl) {
    if (!imageUrl || !imageUrl.includes('r2.dev')) return false;
    const config = window.CLOUDFLARE_R2_CONFIG;

    try {
        console.log("🗑️ Attempting to delete image from R2:", imageUrl);
        
        // Extract key and folder from URL
        const urlObj = new URL(imageUrl);
        const filename = urlObj.pathname.split('/').pop();
        
        // Detect folder from filename or path if possible
        let folder = "tianxin";
        if (urlObj.pathname.includes('/Teacher/')) folder = "Teacher";
        else if (filename.startsWith('teacher_')) folder = "Teacher";
        
        const key = `${folder}/${filename}`;
        
        const deleteUrl = `${config.endpoint}/${config.bucketName}/${key}`;
        const headers = await signV4("DELETE", deleteUrl, "", "");

        const response = await fetch(deleteUrl, {
            method: "DELETE",
            headers: headers
        });

        if (response.ok) {
            console.log("✅ Successfully deleted from R2.");
            return true;
        } else {
            console.warn("⚠️ Failed to delete from R2:", await response.text());
            return false;
        }
    } catch (error) {
        console.error("❌ Error deleting from R2:", error);
        return false;
    }
};

async function compressImageLocally(file) {
    return new Promise((resolve) => {
        const reader = new FileReader();
        reader.onload = (e) => {
            const img = new Image();
            img.onload = () => {
                const canvas = document.createElement('canvas');
                const MAX = 800;
                let w = img.width, h = img.height;
                if (w > h && w > MAX) { h *= MAX/w; w = MAX; }
                else if (h > MAX) { w *= MAX/h; h = MAX; }
                canvas.width = w; canvas.height = h;
                const ctx = canvas.getContext('2d');
                ctx.drawImage(img, 0, 0, w, h);
                canvas.toBlob(blob => resolve(blob), "image/jpeg", 0.75);
            };
            img.src = e.target.result;
        };
        reader.readAsDataURL(file);
    });
}

function convertToBase64(file) {
    return new Promise(r => {
        const reader = new FileReader();
        reader.onload = e => r(e.target.result);
        reader.readAsDataURL(file);
    });
}

window.uploadImage = window.uploadImageToR2;
window.CLOUDFLARE_R2_BUCKET_URL = window.CLOUDFLARE_R2_CONFIG.publicBaseUrl;
