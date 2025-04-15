/**
 * Generates a gateway URL for an IPFS hash
 * @param ipfsHash - The IPFS hash to generate a URL for
 * @param gateway - Optional gateway URL (defaults to Pinata gateway)
 * @returns The complete gateway URL
 */
export const getIPFSGatewayURL = (
    ipfsHash: string,
    gateway: string = 'https://gateway.pinata.cloud'
): string => {
    return `${gateway}/ipfs/${ipfsHash}`;
};

/**
 * Extracts IPFS hash from a gateway URL
 * @param url - The gateway URL containing an IPFS hash
 * @returns The extracted IPFS hash or null if not found
 */
export const extractIPFSHash = (url: string): string | null => {
    const ipfsMatch = url.match(/\/ipfs\/([a-zA-Z0-9]+)/);
    return ipfsMatch ? ipfsMatch[1] : null;
};

/**
 * Validates an IPFS hash format
 * @param hash - The IPFS hash to validate
 * @returns boolean indicating if the hash is valid
 */
export const isValidIPFSHash = (hash: string): boolean => {
    // Basic validation for IPFS hash format
    const ipfsHashRegex = /^[a-zA-Z0-9]{46}$/;
    return ipfsHashRegex.test(hash);
}; 