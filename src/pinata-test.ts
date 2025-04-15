import { PinataService } from './services/pinata.service';
import { getIPFSGatewayURL } from './utils/ipfs.utils';

async function testPinataSetup() {
    try {
        const pinataService = new PinataService();
        
        // Test connection
        const isConnected = await pinataService.testConnection();
        console.log('Pinata Connection:', isConnected ? '✅ Connected' : '❌ Failed');

        if (isConnected) {
            // Test pinning JSON
            const testJSON = {
                name: "Test JSON",
                description: "This is a test JSON object",
                timestamp: new Date().toISOString()
            };

            const jsonResult = await pinataService.pinJSONToIPFS(
                testJSON,
                { name: "test-json" }
            );
            
            console.log('Pinned JSON:', {
                hash: jsonResult.IpfsHash,
                url: getIPFSGatewayURL(jsonResult.IpfsHash)
            });

            // Get pin list
            const pinList = await pinataService.getPinList();
            console.log('Current Pins:', pinList);
        }
    } catch (error) {
        console.error('Test failed:', error);
    }
}

// Run the test
testPinataSetup()
    .then(() => console.log('Test completed'))
    .catch(console.error); 