import { PinataService } from '../services/pinata.service';

async function testPinataConnection() {
    const pinataService = new PinataService();
    
    console.log('Testing Pinata connection...');
    const isConnected = await pinataService.testConnection();
    
    if (isConnected) {
        console.log('Successfully connected to Pinata!');
        
        // Test JSON upload
        const testJSON = {
            name: "Test NFT",
            description: "This is a test NFT metadata",
            image: "https://example.com/image.png"
        };
        
        console.log('Testing JSON upload...');
        const jsonResult = await pinataService.pinJSONToIPFS(testJSON, { name: 'test-nft-metadata' });
        console.log('JSON upload result:', jsonResult);
    } else {
        console.log('Failed to connect to Pinata. Please check your API keys.');
    }
}

testPinataConnection().catch(console.error); 