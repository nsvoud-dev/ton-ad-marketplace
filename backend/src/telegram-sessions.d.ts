declare module 'telegram/sessions' {
  export class StringSession {
    constructor(session?: string);
    save(): string;
  }
}
