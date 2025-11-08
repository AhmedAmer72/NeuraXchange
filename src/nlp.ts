import { NlpManager } from 'node-nlp';
import * as fs from 'fs';

// Extend NlpManager type to include the missing methods
interface ExtendedNlpManager extends NlpManager {
    addNamedEntityText(
        entity: string,
        option: string,
        languages: string[],
        examples: string[]
    ): void;
}

export async function trainAndSaveNlpModel(allCoins: any[]) {
    const manager = new NlpManager({ languages: ['en'], forceNER: true }) as ExtendedNlpManager;

    console.log(`🧠 Starting NLP training with ${allCoins.length} coins...`);

    // Dynamically add entities from the live coin list
    for (const coin of allCoins) {
        if (!coin.symbol) {
            console.warn('⚠️ Skipping coin without symbol:', coin);
            continue;
        }

        // Build synonyms array safely
        const synonyms: string[] = [];
        if (coin.name) synonyms.push(coin.name.toLowerCase());
        if (coin.symbol) synonyms.push(coin.symbol.toLowerCase());

        // Add currency entity if we have at least one synonym
        if (synonyms.length > 0) {
            manager.addNamedEntityText('currency', coin.symbol.toLowerCase(), ['en'], synonyms);
        }

        // Add network entities
        if (Array.isArray(coin.networks)) {
            for (const network of coin.networks) {
                if (network?.network && (network?.name || network?.network)) {
                    const networkSynonyms: string[] = [];
                    if (network.name) networkSynonyms.push(network.name.toLowerCase());
                    if (network.network) networkSynonyms.push(network.network.toLowerCase());
                    
                    manager.addNamedEntityText('network', network.network.toLowerCase(), ['en'], networkSynonyms);
                }
            }
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
