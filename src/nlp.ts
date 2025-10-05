import { NlpManager } from 'node-nlp';
import * as fs from 'fs';

export async function trainAndSaveNlpModel() {
    const manager = new NlpManager({ languages: ['en'], forceNER: true });

    // 1. Define a single "currency" entity with all its options
    // @ts-ignore
    manager.addNamedEntityText('currency', 'BTC', ['en'], ['btc', 'bitcoin']);
    // @ts-ignore
    manager.addNamedEntityText('currency', 'ETH', ['en'], ['eth', 'ethereum']);
    // @ts-ignore
    manager.addNamedEntityText('currency', 'SOL', ['en'], ['sol', 'solana']);
    // @ts-ignore
    manager.addNamedEntityText('currency', 'USDT', ['en'], ['usdt', 'tether']);
    // @ts-ignore
    manager.addNamedEntityText('currency', 'USDC', ['en'], ['usdc']);

    // 2. Define the "network" entity with its options
    // @ts-ignore
    manager.addNamedEntityText('network', 'arbitrum', ['en'], ['arbitrum', 'arb']);
    // @ts-ignore
    manager.addNamedEntityText('network', 'optimism', ['en'], ['optimism', 'op']);
    // @ts-ignore
    manager.addNamedEntityText('network', 'polygon', ['en'], ['polygon', 'matic']);

    // 3. Add training documents using the new "@currency" entity
    manager.addDocument('en', 'swap @number @currency for @currency', 'swap.crypto');
    manager.addDocument('en', 'I want to trade @number @currency on @network for @currency', 'swap.crypto');
    manager.addDocument('en', 'convert my @currency to @currency', 'swap.crypto');
    manager.addDocument('en', 'shift @number @currency to @currency on @network', 'swap.crypto');
    manager.addDocument('en', 'trade @number @currency for @currency', 'swap.crypto');


    console.log('Training final NLP model...');
    await manager.train();
    console.log('Model trained.');

    const modelData = manager.export();
    fs.writeFileSync('model.nlp', modelData);

    console.log('NLP model saved to model.nlp');
}

trainAndSaveNlpModel();