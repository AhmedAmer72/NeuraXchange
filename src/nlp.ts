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

interface SideShiftCoin {
    name?: string;
    coin?: string; // API uses 'coin' instead of 'symbol'
    networks?: string[] | Array<{
        name?: string;
        network?: string;
    }>;
    mainnet?: string;
    tokenDetails?: {
        [network: string]: {
            contractAddress: string;
            decimals: number;
        };
    };
}

export async function trainAndSaveNlpModel(allCoins: any[]) {
    // Validate input
    if (!Array.isArray(allCoins)) {
        console.error('❌ allCoins is not an array:', typeof allCoins);
        throw new Error('Invalid coin data: expected array');
    }

    // Log first coin for debugging
    console.log('🔍 First coin structure:', JSON.stringify(allCoins[0], null, 2));
    
    const manager = new NlpManager({ languages: ['en'], forceNER: true }) as ExtendedNlpManager;

    console.log(`🧠 Starting NLP training with ${allCoins.length} coins...`);

    // Dynamically add entities from the live coin list
    for (let i = 0; i < allCoins.length; i++) {
        const coin = allCoins[i] as SideShiftCoin;
        
        try {
            // Type guard and validation
            if (!coin || typeof coin !== 'object') {
                console.warn(`⚠️ Invalid coin at index ${i}:`, coin);
                continue;
            }

            // Safely access properties
            const coinSymbol = coin.coin?.toString();
            const name = coin.name?.toString();

            if (!coinSymbol) {
                console.warn(`⚠️ Skipping coin without 'coin' property at index ${i}:`, coin);
                continue;
            }

            // Build synonyms array safely
            const synonyms: string[] = [];
            try {
                if (name) synonyms.push(name.toLowerCase());
                synonyms.push(coinSymbol.toLowerCase()); // Always include coin symbol
            } catch (err) {
                console.error(`❌ Error processing coin synonyms at index ${i}:`, err);
                continue;
            }

            // Add currency entity
            try {
                manager.addNamedEntityText(
                    'currency',
                    coinSymbol.toLowerCase(),
                    ['en'],
                    synonyms
                );
            } catch (err) {
                console.error(`❌ Error adding currency entity at index ${i}:`, err);
                continue;
            }

            // Add network entities
            if (coin.networks && Array.isArray(coin.networks)) {
                for (const network of coin.networks) {
                    try {
                        // Handle both string[] and object[] network formats
                        if (typeof network === 'string') {
                            manager.addNamedEntityText(
                                'network',
                                network.toLowerCase(),
                                ['en'],
                                [network.toLowerCase()]
                            );
                        } else if (typeof network === 'object' && network) {
                            const networkId = network.network?.toString();
                            const networkName = network.name?.toString();
                            
                            if (!networkId) continue;

                            const networkSynonyms: string[] = [];
                            if (networkName) networkSynonyms.push(networkName.toLowerCase());
                            networkSynonyms.push(networkId.toLowerCase());

                            manager.addNamedEntityText(
                                'network',
                                networkId.toLowerCase(),
                                ['en'],
                                networkSynonyms
                            );
                        }
                    } catch (err) {
                        console.error(`❌ Error processing network for coin ${coinSymbol}:`, err);
                        continue;
                    }
                }
            }

            // Add mainnet as a network if present
            if (coin.mainnet) {
                try {
                    manager.addNamedEntityText(
                        'network',
                        coin.mainnet.toLowerCase(),
                        ['en'],
                        [coin.mainnet.toLowerCase()]
                    );
                } catch (err) {
                    console.error(`❌ Error adding mainnet network for coin ${coinSymbol}:`, err);
                }
            }
        } catch (err) {
            console.error(`❌ Error processing coin at index ${i}:`, err);
            continue;
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
