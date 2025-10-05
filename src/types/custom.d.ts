declare module 'node-nlp' {
  export class NlpManager {
    constructor(settings?: any);
    addDocument(language: string, document: string, intent: string): void;
    train(): Promise<void>;
    process(language: string, text: string): Promise<any>;
    import(data: any): void;
    export(): any;
  }
}