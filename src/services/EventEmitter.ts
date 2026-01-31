type Listener = (data: any) => void;

export class EventEmitter {
    private listeners: Map<string, Listener[]> = new Map();

    public on(event: string, listener: Listener) {
        if (!this.listeners.has(event)) {
            this.listeners.set(event, []);
        }
        this.listeners.get(event)?.push(listener);
        return () => this.off(event, listener);
    }

    public off(event: string, listener: Listener) {
        const list = this.listeners.get(event);
        if (list) {
            this.listeners.set(event, list.filter(l => l !== listener));
        }
    }

    public emit(event: string, data?: any) {
        this.listeners.get(event)?.forEach(l => l(data));
    }
}
