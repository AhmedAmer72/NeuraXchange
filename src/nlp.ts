import { NlpManager } from 'node-nlp';
import * as fs from 'fs';

export async function trainAndSaveNlpModel(allCoins: any[]) {
    const manager = new NlpManager({ languages: ['en'], forceNER: true });

    console.log(`🧠 Starting NLP training with ${allCoins.length} coins...`);

    // Dynamically add entities from the live coin list
    for (const coin of allCoins) {
        // Add currency entity
        // @ts-ignore
        manager.addNamedEntityText('currency', coin.symbol, ['en'], [coin.name.toLowerCase(), coin.symbol.toLowerCase()]);

        // Add network entities
        for (const network of coin.networks) {
            // @ts-ignore
            manager.addNamedEntityText('network', network.network, ['en'], [network.name.toLowerCase(), network.network.toLowerCase()]);
        }
    }
    
    // Add training documents
    manager.addDocument('en', 'swap @number @currency for @currency', 'swap.crypto');
    manager.addDocument('en', 'I want to trade @number @currency on @network for @currency', 'swap.crypto');
    manager.addDocument('en', 'convert my @currency to @currency', 'swap.crypto');
    manager.addDocument('en', 'shift @number @currency to @currency on @network', 'swap.crypto');
    manager.addDocument('en', 'trade @number @currency for @currency', 'swap.crypto');

    console.log('🤖 Training final NLP model...');
    await manager.train();
    console.log('✅ Model trained.');

    const modelData = manager.export();
    fs.writeFileSync('model.nlp', modelData);

    console.log('💾 NLP model saved to model.nlp');
}
