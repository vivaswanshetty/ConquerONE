import { ref, uploadBytes, getDownloadURL } from "firebase/storage";
import { storage } from "./firebase";

/**
 * Uploads a local image file to Firebase Storage.
 * 
 * @param {string} uri - The local file URI from ImagePicker.
 * @param {string} path - The storage path (e.g. "avatars/uid.jpg").
 * @returns {Promise<string>} - The download URL of the uploaded image.
 */
export const uploadImage = async (uri, path) => {
    try {
        // 1. Fetch the file data
        const response = await fetch(uri);
        const blob = await response.blob();

        // 2. Create a reference in storage
        const storageRef = ref(storage, path);

        // 3. Upload the blob
        await uploadBytes(storageRef, blob);

        // 4. Get and return the download URL
        return await getDownloadURL(storageRef);
    } catch (e) {
        console.error("[CloudStorage] Upload failed:", e);
        throw e;
    }
};
