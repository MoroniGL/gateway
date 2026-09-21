import sharp from "sharp";

type StickerOptions = {
    pack?: string;
    author?: string;
    type?: string;
    categories?: string[];
    background?: string;
    quality?: number;
};

const MAX_STICKER_INPUT_BYTES = 20 * 1024 * 1024;

export default class Sticker {
    constructor(private readonly input: Buffer, private readonly options: StickerOptions = {}) {
        if (!Buffer.isBuffer(input) || input.length === 0 || input.length > MAX_STICKER_INPUT_BYTES) {
            throw new Error("Invalid sticker input");
        }
    }

    async toBuffer(): Promise<Buffer> {
        const quality = Number.isInteger(this.options.quality)
            ? Math.min(100, Math.max(1, this.options.quality!))
            : 50;
        return sharp(this.input, { limitInputPixels: 40_000_000, sequentialRead: true })
            .resize(512, 512, { fit: "inside", withoutEnlargement: true })
            .webp({ quality })
            .toBuffer();
    }
}
