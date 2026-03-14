import { manipulateAsync, SaveFormat } from "expo-image-manipulator";

/**
 * Processes a local image into a compact data URI for use as a profile avatar.
 *
 * Pipeline: Resize to 200px wide → Compress to JPEG 60% → Return as data URI
 * No cropping — the circular avatar mask in the UI handles the visual crop.
 *
 * A 200px JPEG at 60% quality is typically 10-25 KB as base64 —
 * well within Firestore's 1 MB document limit and fast to load.
 */
export const uploadImage = async (uri, _path, onProgress) => {
    try {
        onProgress?.(0.1);

        // Resize and compress — no cropping needed
        const processed = await manipulateAsync(
            uri,
            [{ resize: { width: 200 } }],
            { compress: 0.6, format: SaveFormat.JPEG, base64: true }
        );

        onProgress?.(0.7);

        if (!processed.base64) {
            throw new Error("Image processing failed — no data returned.");
        }

        // Construct a data URI (React Native <Image> renders these natively)
        const dataUri = `data:image/jpeg;base64,${processed.base64}`;

        onProgress?.(1.0);

        return dataUri;

    } catch (e) {
        console.error("[CloudStorage] Image processing failure:", e);
        throw new Error(e.message || "Failed to process image");
    }
};
