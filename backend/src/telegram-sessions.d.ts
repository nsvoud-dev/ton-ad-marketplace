declare module 'telegram/sessions/index.js' {
  export class StringSession {
    constructor(session?: string);
    save(): string;
  }
}
