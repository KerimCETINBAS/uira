/** Native CBOR, compression and Base64 transport for serializable data. */
export class Encoding {
    public static Encode(value: unknown): string {
        if (C_EncodingUtil === undefined) error("Encoding: native codec is unavailable");
        const compressed = C_EncodingUtil.CompressString(C_EncodingUtil.SerializeCBOR(value));
        if (compressed === undefined) error("Encoding: compression failed");
        const encoded = C_EncodingUtil.EncodeBase64(compressed);
        if (encoded === undefined) error("Encoding: encoding failed");
        return encoded;
    }

    /** Returns unvalidated data; the size bound is also checked after decompression. */
    public static Decode(value: string, maxBytes = 262144): unknown {
        if (!Number.isFinite(maxBytes) || maxBytes < 1) error("Encoding: invalid size limit");
        if (typeof value !== "string" || issecretvalue(value) || value.length > maxBytes) error("Encoding: invalid encoded data");
        if (C_EncodingUtil === undefined) error("Encoding: native codec is unavailable");
        const decoded = C_EncodingUtil.DecodeBase64(value);
        if (decoded === undefined) error("Encoding: invalid encoding");
        const decompressed = C_EncodingUtil.DecompressString(decoded);
        if (decompressed === undefined || decompressed.length > maxBytes) error("Encoding: invalid or oversized compressed data");
        return C_EncodingUtil.DeserializeCBOR(decompressed);
    }
}
