// Constants
const bitrateRation = 2.5;
const scaleRatio = 2.5;


export default function optimizeVideo(originalVideoInfo: any, targetSize: number): { bitrate: number, width: number, height: number } {
    // Extract relevant information
    const originalSize = originalVideoInfo.format.size / 1024;
    const originalWidth = originalVideoInfo.streams[0].width;
    const originalHeight = originalVideoInfo.streams[0].height;

    // Estimate size reduction
    const sizeReduction = targetSize / originalSize;

    // Calculate bitrate based on estimated size reduction
    const targetBitrate = originalVideoInfo.format.bit_rate * (sizeReduction / bitrateRation);

    // Calculate scaled width based on target bitrate and aspect ratio
    let scaledWidth = Math.floor(originalWidth * (sizeReduction / scaleRatio));
    if (scaledWidth % 2 !== 0) {
        scaledWidth -= 1;
    }

    // Calculate scaled height based on scaled width and original aspect ratio
    let scaledHeight = Math.floor(originalHeight * (sizeReduction / scaleRatio));
    if (scaledHeight % 2 !== 0) {
        scaledHeight -= 1;
    }

    return {
        bitrate: Math.floor(targetBitrate),
        width: scaledWidth,
        height: scaledHeight,
    };
}