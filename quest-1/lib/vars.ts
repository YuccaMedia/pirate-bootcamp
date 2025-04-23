/**
 *
 */
import dotenv from "dotenv";
import { Connection, clusterApiUrl, Keypair } from "@solana/web3.js";
import { loadKeypairFromFile, loadOrGenerateKeypair } from "./helpers";
import { PublicKey } from "@metaplex-foundation/js";

// load the env variables from file
dotenv.config();

/**
 * Load the `payer` keypair from the local file system, or load/generate a new
 * one and storing it within the local directory
 */
// export const payer = process.env?.LOCAL_PAYER_JSON_ABSPATH
//   ? loadKeypairFromFile(process.env?.LOCAL_PAYER_JSON_ABSPATH)
//   : loadOrGenerateKeypair("payer");

// --- DEBUG: Hardcoded payer keypair ---
// IMPORTANT: This is insecure and only for local debugging. Remove before any public use.
const payerSecretKeyBytes = [62,87,48,39,38,91,96,224,241,114,19,109,185,90,4,53,60,226,142,2,111,116,234,254,128,143,234,241,51,134,159,26,141,192,135,157,11,16,32,120,215,52,211,174,202,190,64,191,133,207,135,228,203,213,27,208,78,62,240,192,86,92,225,83];
export const payer = Keypair.fromSecretKey(new Uint8Array(payerSecretKeyBytes));
// --- END DEBUG ---

// generate a new Keypair for testing, named `wallet`
export const testWallet = loadOrGenerateKeypair("testWallet");

// load the env variables and store the cluster RPC url
export const CLUSTER_URL = process.env.RPC_URL ?? clusterApiUrl("devnet");

// create a new rpc connection
export const connection = new Connection(CLUSTER_URL, "confirmed");

// define an address to also transfer lamports too
export const STATIC_PUBLICKEY = new PublicKey("nickb1dAk4hKpHVPZenpzqVtw2F8RHnCq27QcfiReXD");
