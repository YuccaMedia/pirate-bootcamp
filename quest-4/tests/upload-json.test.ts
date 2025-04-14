import { Connection, Keypair, LAMPORTS_PER_SOL } from "@solana/web3.js";
import * as fs from "fs";
import * as path from "path";
import { ASSETS } from "./util/const";
import axios from "axios";
import FormData from "form-data";

/**
 * Script to upload images and JSON files to Arweave using Metaplex's JS
 * SDK so our assets have images!
 * 
 * This should only need to be run once, and then you should
 * update the URI fields in the `ASSETS` array in `tests/util/const.ts`
 */
describe("[Running Setup Script]: Upload Assets", () => {
    // Initialize connection to devnet
    const connection = new Connection("https://api.devnet.solana.com", {
        commitment: 'confirmed',
        confirmTransactionInitialTimeout: 180000,
        wsEndpoint: "wss://api.devnet.solana.com/"
    });
    
    const keypair = Keypair.fromSecretKey(
        Buffer.from(JSON.parse(fs.readFileSync("/home/mindf/.config/solana/id.json", "utf-8")))
    );

    async function uploadToIPFS(file: Buffer, filename: string): Promise<string> {
        const formData = new FormData();
        formData.append('file', file, filename);
        
        const response = await axios.post('https://api.pinata.cloud/pinning/pinFileToIPFS', formData, {
            headers: {
                'Content-Type': `multipart/form-data; boundary=${formData.getBoundary()}`,
                'pinata_api_key': process.env.PINATA_API_KEY || '',
                'pinata_secret_api_key': process.env.PINATA_SECRET_API_KEY || ''
            }
        });
        
        return `https://gateway.pinata.cloud/ipfs/${response.data.IpfsHash}`;
    }

    async function uploadMetadata(
        imageName: string,
        imageType: string,
        name: string,
        symbol: string,
        description: string,
        attributes: any[]
    ) {
        try {
            console.log(`Uploading Image & JSON for: ${name}:`);
            
            // Check balance and airdrop if needed
            const balance = await connection.getBalance(keypair.publicKey);
            console.log(`Current balance: ${balance / LAMPORTS_PER_SOL} SOL`);
            
            if (balance < 2 * LAMPORTS_PER_SOL) {
                console.log("Balance low, requesting airdrop...");
                const signature = await connection.requestAirdrop(keypair.publicKey, 2 * LAMPORTS_PER_SOL);
                await connection.confirmTransaction(signature, 'confirmed');
                console.log("Airdrop confirmed");
            }

            // Read image file
            const imageBuffer = fs.readFileSync(
                path.resolve(__dirname, `../../assets/${imageName}.${imageType}`)
            );
            
            try {
                // Upload image to IPFS
                console.log("Uploading image to IPFS...");
                const imageUri = await uploadToIPFS(imageBuffer, `${imageName}.${imageType}`);
                console.log("Image uploaded successfully:", imageUri);

                // Create and upload metadata
                const metadata = {
                    name: name,
                    symbol: symbol,
                    description: description,
                    image: imageUri,
                    attributes: attributes
                };

                // Upload metadata to IPFS
                console.log("Uploading metadata to IPFS...");
                const metadataUri = await uploadToIPFS(
                    Buffer.from(JSON.stringify(metadata)),
                    "metadata.json"
                );
                console.log("Metadata uploaded successfully");
                console.log("URI:", metadataUri);

                return metadataUri;
            } catch (uploadError) {
                console.error("Upload error details:", uploadError);
                throw uploadError;
            }
        } catch (error) {
            if (error instanceof Error) {
                console.error("Error uploading metadata:", error.message);
            } else {
                console.error("Unknown error occurred during upload");
            }
            throw error;
        }
    }

    it("Uploading Image & JSON for: Treasure Map", async () => {
        await uploadMetadata(
            "treasure-map-1",
            "png",
            "Treasure Map",
            "MAP",
            "A mysterious map leading to untold treasures in the pirate world.",
            []
        );
    });

    // Add more test cases for other assets here
});
