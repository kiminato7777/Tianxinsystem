/**
 * Storage Utility (Firebase Storage version)
 * Replaces Cloudflare R2 for image uploads to ensure correct functionality and stable URLs.
 */

window.uploadImage = async function (file, identifier = "", folderPrefix = "tianxin") {
    if (!file) return null;

    try {
        // Fallback initialization if storage is not yet initialized
        if (!window.storage && typeof firebase !== 'undefined' && firebase.storage) {
            window.storage = firebase.storage();
        }

        if (!window.storage) {
            console.warn("⚠️ Firebase Storage is not initialized. Using base64 fallback preview.");
            return await convertToBase64(file);
        }

        console.log(`🚀 Starting Image Upload to Firebase Storage [folder: ${folderPrefix}]...`);
        
        // Compress image locally before upload for fast loading and optimal UI experience
        const optimizedBlob = await compressImageLocally(file);

        // Build a clean, unique filename
        const cleanName = identifier ? identifier.replace(/[^a-zA-Z0-9]/g, '_') : 'image';
        const shortCode = Math.random().toString(36).substring(7);
        const isTeacher = folderPrefix.toLowerCase().includes('teacher');
        
        const filename = isTeacher ? 
            `teacher_${cleanName}_${shortCode}.jpg` : 
            `student_${cleanName}_${Date.now()}_${shortCode}.jpg`;

        const fullPath = `${folderPrefix}/${filename}`;

        // Upload to Firebase Storage
        const storageRef = window.storage.ref().child(fullPath);
        const snapshot = await storageRef.put(optimizedBlob, { contentType: 'image/jpeg' });
        const downloadUrl = await snapshot.ref.getDownloadURL();

        console.log("✅ Image Upload Success! Resource URL:", downloadUrl);
        return downloadUrl;

    } catch (error) {
        console.error("❌ Storage Upload Failed:", error);
        // Fallback to local base64 preview so the interface remains functional
        return await convertToBase64(file);
    }
};

// Map legacy function names to ensure complete backwards compatibility
window.uploadImageToR2 = window.uploadImage;

window.deleteImageFromR2 = async function (imageUrl) {
    if (!imageUrl) return false;
    
    // Only attempt deletion if it belongs to Firebase Storage
    if (!imageUrl.includes('firebasestorage.googleapis.com')) {
        console.log("ℹ️ URL is not a Firebase Storage resource, skipping deletion:", imageUrl);
        return false;
    }

    try {
        if (!window.storage && typeof firebase !== 'undefined' && firebase.storage) {
            window.storage = firebase.storage();
        }
        if (!window.storage) return false;

        console.log("🗑️ Attempting to delete image from Storage:", imageUrl);
        const imageRef = window.storage.refFromURL(imageUrl);
        await imageRef.delete();
        console.log("✅ Successfully deleted image from Storage.");
        return true;
    } catch (error) {
        console.error("❌ Error deleting image from Storage:", error);
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
                
                if (w > h && w > MAX) { 
                    h *= MAX / w; 
                    w = MAX; 
                } else if (h > MAX) { 
                    w *= MAX / h; 
                    h = MAX; 
                }
                
                canvas.width = w; 
                canvas.height = h;
                
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
