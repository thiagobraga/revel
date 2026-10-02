'use client';
import { Component } from 'react';
import type { ChildrenProps } from '../types/ui';
export class ErrorBoundary extends Component<ChildrenProps, {
    failed: boolean;
}> {
    state = { failed: false };
    static getDerivedStateFromError() {
        return { failed: true };
    }
    render() {
        return this.state.failed ? <main className="shell"><h1>Não foi possível abrir esta página.</h1><button className="button" onClick={() => location.reload()}>Recarregar</button></main> : this.props.children;
    }
}
